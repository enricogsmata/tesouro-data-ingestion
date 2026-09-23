import path from 'path';
import { BuildDataSources } from "./discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./discovery/endpoint_mapper.js";
import { db } from './database/dbConnection.js';
import { EndpointFetcherOrchestrator } from './fetchers/index.js';
import { createAppLogger } from "./logs/logic.js";
import { fileURLToPath } from 'url';
import { DataSources, EndpointParameters, Endpoints } from './database/schema.js';
import type { DataSource, Endpoint, MappedEndpointWithParams, NewDataSource, NewEndpoint, NewEndpointParameter } from './database/types.js';
import { eq } from 'drizzle-orm';

type PersistEndpointResponse = {
    endpointId: number,
    alreadyExists: boolean,
}

const module = path.basename(fileURLToPath(import.meta.url));

const logger = createAppLogger(db);

async function run() {
    const context = 'run';
    logger.info({ module: module, context: context }, "[STATUS] Iniciando script...");

    // ===================================
    // 1. DESCOBERTA DE CONJUNTOS DE DADOS
    // ===================================

    logger.info(`> Descobrindo conjuntos de dados...`);

    // -------------------------------------------------------------
    // Fluxo de scraping do CKAN e descoberta dos conjuntos de dados
    // -------------------------------------------------------------
    const DataSourcesList: NewDataSource[] | null = await BuildDataSources();

    if (!DataSourcesList) {
        logger.fatal({ module: module, context: context }, "[ERRO] Falha no seed dos data sources!");
        throw new Error("[ERRO | RUN] Falha no seed dos data sources!");
    }

    // Persistência dos conjuntos de dados extraídos do CKAN 
    await persistDiscoveredDatasources(DataSourcesList);

    // ==========================
    // 2. MAPEAMENTO DE ENDPOINTS
    // ==========================

    logger.info({ module: module, context: context, msg: `> Descobrindo EndpointsList...` });

    // ---------------------------------
    // Fluxo de mapeamento dos endpoints
    // ---------------------------------
    const dataSources = await db.select().from(DataSources) as DataSource[];
    const MappedEndpointsWithParamsList: MappedEndpointWithParams[] = MapDiscoveredEndpointsInMemory(dataSources);

    if (!MappedEndpointsWithParamsList) {
        logger.error({ module: module, context: context }, "[ERRO] Falha no mapeamento dos EndpointsList!");
    }

    // Persistência dos endpoints e seus parâmetros mapeados
    await persistMappedEndpoints(MappedEndpointsWithParamsList);

    // ==================================================
    // 3. EXTRAÇÃO DOS DADOS "RAW" DOS ENDPOINTS MAPEADOS
    // ==================================================

    const endpoints = await db.select().from(Endpoints);

    await EndpointFetcherOrchestrator(dataSources, endpoints);

    logger.info({ module: module, context: context }, "[STATUS] Script concluído!");
    logger.flush();
}

/**
 * 
 * @param Datasources - Os conjuntos de dados extraídos do CKAN
 */
async function persistDiscoveredDatasources(Datasources: NewDataSource[]) {
    const context = 'persistDiscoveredDatasources';

    try {
        for (const dataSource of Datasources) {
            const [existingDatasource] = await db.select().from(DataSources).where(eq(DataSources.baseUrl, dataSource.baseUrl));

            // Conjuntos de dados já persistidos são ignorados para evitar dados duplicados no banco
            if (existingDatasource) continue;

            await db.insert(DataSources).values(dataSource);
        }
    } catch (error) {
        logger.fatal({ module: module, context: context, data: `[INSERT INTO DataSources] | DataSources Count: ${Datasources.length}` }, `[FATAL] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
    }
}

/**
 * 
 * @param MappedEndpointsWithParams - Os endpoints + parâmetros mapeados
 */
async function persistMappedEndpoints(MappedEndpointsWithParams: MappedEndpointWithParams[]) {
    const context = 'persistMappedEndpoints';

    try {
        for (const MappedEndpointWithParam of MappedEndpointsWithParams) {
            const mappedEndpoint = MappedEndpointWithParam.mappedEndpoint;
            const mappedEndpointParams = MappedEndpointWithParam.mappedEndpointParams;

            const persistedEndpoint: PersistEndpointResponse | null = await persistNewEndpoint(mappedEndpoint);

            // Em caso de erro ao inserir o endpoint
            if (!persistedEndpoint) {
                continue;
            }

            await persistEndpointParams(mappedEndpointParams, mappedEndpoint, persistedEndpoint);
        }
    } catch (error) {
        logger.error({ module: module, context: context, data: `[INSERT INTO Endpoints]` }, `[ERRO] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
    }
}

/**
 * 
 * @param mappedEndpoint - Endpoint mapeado
 * @returns O id do endpoint recém inserido OU o id do endpoint já inserido no banco de dados
 */
async function persistNewEndpoint(mappedEndpoint: NewEndpoint): Promise<PersistEndpointResponse | null> {
    const context = 'persistNewEndpoint';
    const [existingEndpoint] = await db.select().from(Endpoints).where(eq(Endpoints.path, mappedEndpoint.path));

    // Endpoints já existentes no banco de dados não são inseridos para evitar dados duplicados
    if (existingEndpoint) {
        return {
            endpointId: existingEndpoint.id,
            alreadyExists: true,
        }
    }

    const [persistedEndpointId] = await db.insert(Endpoints).values(mappedEndpoint).returning({ id: Endpoints.id });

    if (!persistedEndpointId) {
        logger.error({ module: module, context: context, data: `${JSON.stringify(mappedEndpoint, null, 2)}` }, `[ERRO] Falha ao inserir os parâmetros do endpoint mapeado.`);
        return null;
    }

    return {
        endpointId: persistedEndpointId.id,
        alreadyExists: false,
    };
}

/**
 * 
 * @param mappedEndpointParams - Lista de parâmetros do endpoint mapeado
 * @param endpoint - Endpoint mapeado
 * @param persistedEndpointId - Id do endpoint já existente ou do inserido no banco de dados
 */
async function persistEndpointParams(mappedEndpointParams: any[], endpoint: NewEndpoint, persistedEndpoint: PersistEndpointResponse) {
    const newEndpointParams: NewEndpointParameter[] = mappedEndpointParams.map((param) => {
        const paramName = param.name ? param.name : '';

        const isMalformedData: number = endpoint.path.includes('resultado-fiscal') && paramName.includes("tema") ? 1 : 0;

        return {
            endpointId: persistedEndpoint.endpointId,
            is_required: isMalformedData ? isMalformedData : param.is_required,
            description: param.description,
            in: param.in,
            name: param.name,
            type: param.type
        }
    });

    if (newEndpointParams.length > 0) {
        if (persistedEndpoint.alreadyExists) {
            for (const endpointParam of newEndpointParams) {
                const existingEndpointParams = await db.select().from(EndpointParameters).where(eq(EndpointParameters.name, endpointParam.name));

                // Somente inserimos parâmetros não persistidos
                if (existingEndpointParams.length > 0)
                    newEndpointParams.filter(newEndpointParam => newEndpointParam != endpointParam);
            }
        }

        await db.insert(EndpointParameters).values(newEndpointParams);
    }
}

run();