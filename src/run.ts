import path from 'path';
import { BuildDataSources } from "./discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./discovery/endpoint_mapper.js";
import { db } from './database/dbConnection.js';
import { EndpointFetcherOrchestrator } from './fetchers/index.js';
import { createAppLogger } from "./logs/logic.js";
import { fileURLToPath } from 'url';
import { DataSources, EndpointParameters, Endpoints } from './database/schema.js';
import type { DataSource, MappedEndpointWithParams, NewDataSource, NewEndpoint, NewEndpointParameter } from './database/types.js';
import { eq } from 'drizzle-orm';

const module = path.basename(fileURLToPath(import.meta.url));
const context = 'run.ts';

const logger = createAppLogger(db);

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

// -----------------------------------------------------
// Persistência dos conjuntos de dados extraídos do CKAN 
// -----------------------------------------------------
try {
    for (const dataSource of DataSourcesList) {
        const [existingDatasource] = await db.select().from(DataSources).where(eq(DataSources.baseUrl, dataSource.baseUrl));

        // Conjuntos de dados já persistidos são ignorados para evitar dados duplicados no banco
        if (existingDatasource) continue;

        await db.insert(DataSources).values(dataSource);
    }
} catch (error) {
    logger.fatal({ module: module, context: context, data: `[INSERT INTO DataSources] | DataSources Count: ${DataSourcesList.length}` }, `[FATAL] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
}

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

// -----------------------------------------------------
// Persistência dos endpoints e seus parâmetros mapeados
// -----------------------------------------------------
try {
    for (const MappedEndpointWithParam of MappedEndpointsWithParamsList) {
        const endpoint = MappedEndpointWithParam.mappedEndpoint;
        const params = MappedEndpointWithParam.mappedEndpointParams;

        const [existingEndpoint] = await db.select().from(Endpoints).where(eq(Endpoints.path, endpoint.path));

        // Endpoints já existentes no banco de dados não são inseridos para evitar dados duplicados
        if (existingEndpoint) continue;

        const [insertedEndpointId] = await db.insert(Endpoints).values(endpoint).returning({ id: Endpoints.id });

        if (!insertedEndpointId) {
            logger.error({ module: module, context: context, data: `${JSON.stringify(MappedEndpointWithParam, null, 2)}` }, `[ERRO] Falha ao inserir os parâmetros do endpoint mapeado.`);
            continue;
        }

        const newEndpointParams: NewEndpointParameter[] = params.map((param) => {
            const paramName = param.name ? param.name : '';

            const isMalformedData: number = endpoint.path.includes('resultado-fiscal') && paramName.includes("tema") ? 1 : 0;

            return {
                endpointId: insertedEndpointId?.id,
                is_required: isMalformedData ? isMalformedData : param.is_required,
                description: param.description,
                in: param.in,
                name: param.name,
                type: param.type
            }
        });

        if (newEndpointParams.length > 0)
            await db.insert(EndpointParameters).values(newEndpointParams);
    }
} catch (error) {
    logger.error({ module: module, context: context, data: `[INSERT INTO Endpoints]` }, `[ERRO] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
}

// ==================================================
// 3. EXTRAÇÃO DOS DADOS "RAW" DOS ENDPOINTS MAPEADOS
// ==================================================

const endpoints = await db.select().from(Endpoints);

await EndpointFetcherOrchestrator(dataSources, endpoints);

logger.info({ module: module, context: context }, "[STATUS] Script concluído!");
logger.flush();