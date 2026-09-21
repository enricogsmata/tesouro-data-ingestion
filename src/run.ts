import path from 'path';
import { BuildDataSources } from "./discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./discovery/endpoint_mapper.js";
import { db } from './database/dbConnection.js';
import { EndpointFetcherOrchestrator } from './fetchers/index.js';
import { createAppLogger } from "./logs/logic.js";
import { fileURLToPath } from 'url';
import { DataSources, Endpoints } from './database/schema.js';
import type { DataSource, NewDataSource, NewEndpoint } from './database/types.js';

// - LOOGER -
const module = path.basename(fileURLToPath(import.meta.url));
const context = 'run.ts';

const logger = createAppLogger(db);
// - - -

// - LOG -
logger.info({ module: module, context: context }, "[STATUS] Iniciando script...");
// - - -



// - DataSources Seed -

// - LOG -
logger.info(`> Descobrindo conjuntos de dados...`);
// - - -

// > Realiza o seed dos conjuntos de dados em memória
const DataSourcesList: NewDataSource[] | null = await BuildDataSources();

// - ERRO -
if (!DataSourcesList) {
    logger.fatal({ module: module, context: context }, "[ERRO] Falha no seed dos data sources!");
    throw new Error("[ERRO | RUN] Falha no seed dos data sources!");
}
// - - -

// - OPCIONAL -
// > Armazena as fontes de dados no banco relacional
try {
    await db.insert(DataSources).values(DataSourcesList);
} catch (error) {
    logger.fatal({module: module, context: context, data: `[INSERT INTO DataSources] | DataSources Count: ${DataSourcesList.length}`}, `[FATAL] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
}
// - - -

// - LOG -
logger.debug({ module: module, context: context }, `[DEBUG] DataSources construídos: ${DataSourcesList.length}!`);
logger.debug({ module: module, context: context, data: JSON.stringify(DataSourcesList, null, 2) }, `[DEBUG] Datasources:`);
// - - -



// - EndPoints Seed -

// - LOG -
logger.info({ module: module, context: context, msg: `> Descobrindo EndpointsList...` });
// - - -

// > Mapeamento de cada endpoint através dos metadados dos conjuntos de dados encontrados
const dataSources = await db.select().from(DataSources) as DataSource[];
const EndpointsList: NewEndpoint[] = MapDiscoveredEndpointsInMemory(dataSources);

// - ERRO -
if (!EndpointsList) {
    logger.error({ module: module, context: context }, "[ERRO] Falha no mapeamento dos EndpointsList!",);
}
// - - -

try {
    const sanitizedEndpointsList = EndpointsList.map(endpoint => ({
        dataSourceId: endpoint.dataSourceId,
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags?.toString() || '',
    }))

    await db.insert(Endpoints).values(sanitizedEndpointsList);
} catch (error) {
    logger.error({module: module, context: context, data: `[INSERT INTO Endpoints] | Endpoints Count: ${EndpointsList.length}`}, `[ERRO] Falha ao armazenar fontes de dados no banco relacional: ${error}`);
}

// - LOG -
logger.debug({ module: module, context: context }, `[DEBUG] Endpoints mapeados: ${EndpointsList.length}!`);
logger.debug({ module: module, context: context, data: JSON.stringify(EndpointsList, null, 2) }, `[DEBUG] Endpoints: `);
// - - -



// - Requisições nos Endpoints -

// > Requisição em cada endpoint e coleta dos responses
const endpoints = await db.select().from(Endpoints);
await EndpointFetcherOrchestrator(dataSources, endpoints);

// - LOG -
logger.info({ module: module, context: context }, "[STATUS] Script concluído!");
logger.flush();
// - - -