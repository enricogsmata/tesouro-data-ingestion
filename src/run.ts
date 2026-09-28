import { BuildDataSources } from "./layers/bronze/discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./layers/bronze/discovery/endpoint_mapper.js";
import { db } from './database/dbConnection.js';
import { EndpointFetcherOrchestrator } from './layers/bronze/fetchers/index.js';
import { dataSources, endpointParameters, endpoints } from './database/schema.js';
import type { DataSource, MappedEndpointWithParams, NewDataSource, NewEndpoint, NewEndpointParameter } from './database/types.js';
import { eq } from 'drizzle-orm';
import { createLogger, sanitizelogsTable } from './services/logs.js';

type PersistEndpointResponse = {
    endpointId: number,
    alreadyExists: boolean,
}

const logger = createLogger(import.meta.url);

/**
 * Entry point do algoritmo do scrapper
 */
async function run() {
    const context = 'run';
    logger.info({ module: module, context: context }, "[STATUS] Iniciando script...");

    // ========================================
    // 0. SANITIZAÇÃO DE LOGS NO BANCO DE DADOS
    // ========================================
    await sanitizelogsTable();

    // ===================================
    // 1. DESCOBERTA DE CONJUNTOS DE DADOS
    // ===================================

    logger.info(`> Descobrindo conjuntos de dados...`);

    // -------------------------------------------------------------
    // Fluxo de scraping do CKAN e descoberta dos conjuntos de dados
    // -------------------------------------------------------------
    const dataSourcesList: NewDataSource[] | null = await BuildDataSources();

    if (!dataSourcesList) {
        logger.fatal({ module: module, context: context }, "[ERRO] Falha no seed dos data sources!");
        throw new Error("[ERRO | RUN] Falha no seed dos data sources!");
    }

    // Persistência dos conjuntos de dados extraídos do CKAN 
    await persistDiscoveredDatasources(dataSourcesList);

    // ==========================
    // 2. MAPEAMENTO DE ENDPOINTS
    // ==========================

    logger.info({ module: module, context: context, msg: `> Descobrindo endpointsList...` });

    // ---------------------------------
    // Fluxo de mapeamento dos endpoints
    // ---------------------------------
    const DataSources = await db.select().from(dataSources) as DataSource[];
    const MappedendpointsWithParamsList: MappedEndpointWithParams[] = MapDiscoveredEndpointsInMemory(DataSources);

    if (!MappedendpointsWithParamsList) {
        logger.error({ module: module, context: context }, "[ERRO] Falha no mapeamento dos endpointsList!");
    }

    // Persistência dos endpoints e seus parâmetros mapeados
    await persistMappedendpoints(MappedendpointsWithParamsList);

    // ==================================================
    // 3. EXTRAÇÃO DOS DADOS "RAW" DOS ENDPOINTS MAPEADOS
    // ==================================================

    logger.info({module: module, context: context}, `> Extraindo dados brutos...`);

    const Endpoints = await db.select().from(endpoints);

    await EndpointFetcherOrchestrator(DataSources, Endpoints);

    logger.info({ module: module, context: context }, "[STATUS] Script concluído!");
    logger.flush();
}

/**
 * Persistência das fontes de dados extraídos do CKAN
 * @param Datasources - Conjunto de fontes de dados extraídos do CKAN
 */
async function persistDiscoveredDatasources(Datasources: NewDataSource[]) {
    const context = 'persistDiscoveredDatasources';

    try {
        for (const dataSource of Datasources) {
            const [existingDatasource] = await db.select().from(dataSources).where(eq(dataSources.baseUrl, dataSource.baseUrl));

            // Conjuntos de dados já persistidos são ignorados para evitar dados duplicados no banco
            if (existingDatasource) continue;

            await db.insert(dataSources).values(dataSource);
        }
    } catch (error) {
        logger.fatal({ module: module, context: context, data: `[INSERT INTO dataSources] | dataSources Count: ${Datasources.length}` }, `[FATAL] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
    }
}

/**
 * Orquestrador da persistência dos endpoints e parâmetros extraídos do CKAN
 * @param MappedendpointsWithParams - Os endpoints + parâmetros mapeados
 */
async function persistMappedendpoints(MappedendpointsWithParams: MappedEndpointWithParams[]) {
    const context = 'persistMappedendpoints';

    try {
        for (const MappedEndpointWithParam of MappedendpointsWithParams) {
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
        logger.error({ module: module, context: context, data: `[INSERT INTO endpoints]` }, `[ERRO] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
    }
}

/**
 * Persistência de um objeto de endpoint mapeado
 * @param mappedEndpoint - Endpoint mapeado
 * @returns O id do endpoint recém inserido OU o id do endpoint já inserido no banco de dados
 */
async function persistNewEndpoint(mappedEndpoint: NewEndpoint): Promise<PersistEndpointResponse | null> {
    const context = 'persistNewEndpoint';
    const [existingEndpoint] = await db.select().from(endpoints).where(eq(endpoints.path, mappedEndpoint.path));

    // endpoints já existentes no banco de dados não são inseridos para evitar dados duplicados
    if (existingEndpoint) {
        return {
            endpointId: existingEndpoint.id,
            alreadyExists: true,
        }
    }

    const [persistedEndpointId] = await db.insert(endpoints).values(mappedEndpoint).$returningId();

    if (!persistedEndpointId) {
        logger.error({ module: module, context: context}, `[ERRO] Falha ao inserir os parâmetros do endpoint mapeado.`);
        return null;
    }

    return {
        endpointId: persistedEndpointId.id,
        alreadyExists: false,
    };
}

/**
 * Persistência dos parâmetros do endpoint mapeado
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
                const existingEndpointParams = await db.select().from(endpointParameters).where(eq(endpointParameters.name, endpointParam.name));

                // Somente inserimos parâmetros não persistidos
                if (existingEndpointParams.length > 0)
                    newEndpointParams.filter(newEndpointParam => newEndpointParam != endpointParam);
            }
        }

        for (const newEndpointParam of newEndpointParams) {
            const [alreadyExists] = await db.select().from(endpointParameters).where(eq(endpointParameters.name, newEndpointParam.name));

            if (!alreadyExists) {
                await db.insert(endpointParameters).values(newEndpointParam);
            }
        }
    }
}

run();