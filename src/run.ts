import path from 'path';
import { BuildDataSources } from "./discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./discovery/endpoint_mapper.js";
import { db } from './database/dbConnection.js';
import type { IDataSource } from './database/models/datasource/models.js';
import type { IRawEndpoint } from './database/models/endpoint/models.js';
import { EndpointFetcherOrchestrator } from './fetchers/index.js';
import { createAppLogger } from "./logs/logic.js";
import { fileURLToPath } from 'url';

// - LOOGER -
const module = path.basename(fileURLToPath(import.meta.url));
const context = 'run.ts';

const logger = createAppLogger(db);
// - - -

// - LOG -
logger.info({module: module, context: context}, "[STATUS] Iniciando script...");
// - - -



// - DataSources Seed -

// - LOG -
logger.info(`> Descobrindo conjuntos de dados...`);
// - - -

// > Realiza o seed dos conjuntos de dados em memória
const DataSources: IDataSource[] | null = await BuildDataSources();

// - ERRO -
if (!DataSources) {
    logger.fatal({module: module, context: context, data: JSON.stringify(DataSources, null, 2)}, "[ERRO] Falha no seed dos data sources!");
    throw new Error("[ERRO | RUN] Falha no seed dos data sources!");
}
// - - -

// - LOG -
logger.debug({module: module, context: context}, `[DEBUG] DataSources construídos: ${DataSources.length}!`);
logger.debug({module: module, context: context, data: JSON.stringify(DataSources, null, 2)}, `[DEBUG] Datasources:`);
// - - -



// - EndPoints Seed -

// - LOG -
logger.info({module: module, context: context , msg:`> Descobrindo endpoints...`});
// - - -

// > Mapeamento de cada endpoint através dos metadados dos conjuntos de dados encontrados
const endpoints: IRawEndpoint[] = MapDiscoveredEndpointsInMemory(DataSources);

// - ERRO -
if (!endpoints) {
    logger.error({module: module, context: context, data: JSON.stringify(endpoints, null, 2)}, "[ERRO] Falha no mapeamento dos endpoints!", );
}
// - - -

// - LOG -
logger.debug({module: module, context: context}, `[DEBUG] Endpoints mapeados: ${endpoints.length}!`);
logger.debug({module: module, context: context, data: JSON.stringify(endpoints, null, 2)}, `[DEBUG] Endpoints: `);
// - - -



// - Requisições nos Endpoints -

// > Requisição em cada endpoint e coleta dos responses
await EndpointFetcherOrchestrator(DataSources, endpoints);

// - LOG -
logger.info({module: module, context: context}, "[STATUS] Script concluído!");
logger.flush();
// - - -