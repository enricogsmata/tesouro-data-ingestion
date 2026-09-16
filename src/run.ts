/*
    > Arquivo responsável por executar o fluxo da aplicação COM LOGS EM ARQUIVOS (.log)
*/
import * as fs from 'fs';
import path from 'path';
import { DISCOVERY_LOGS_DIR as logsDir } from './logs/types.js';
import { BuildDataSources } from "./discovery/discovery.js";
import { MapDiscoveredEndpointsInMemory } from "./discovery/endpoint_mapper.js";
import { buildDefaultLogsDir, createWriter } from "./logs/logic.js";
import type { DataSource, Endpoint } from "./discovery/models.js";
import { EndpointFetcherOrchestrator } from './fetchers/index.js';

// - LOG -
console.clear();
console.log("[STATUS] Iniciando script...");
// - - -

// - LOOGER -
// > Constrói a estrutura necessária para armazenar os logs
buildDefaultLogsDir();

const runLogsFile = path.join(logsDir, `run_logs_${Date.now()}.log`);
const runErrorsFile = path.join(logsDir, `run_errors_${Date.now()}.log`);

const dataLogger = createWriter(runLogsFile);
const errorsLogger = createWriter(runErrorsFile);
// - - -



// - DataSources Seed -

// - LOG -
console.log(`> Descobrindo conjuntos de dados...`);
// - - -

// > Realiza o seed dos conjuntos de dados em memória
const dataSources: DataSource[] | null = await BuildDataSources();

// - ERRO -
if (!dataSources) {
    errorsLogger.write("[ERRO | RUN] Falha no seed dos data sources!\n")
    throw new Error("[ERRO | RUN] Falha no seed dos data sources!");
}
// - - -

// - LOG -
dataLogger.write(`[INFO] DataSources construídos: ${dataSources.length}!\n`);
dataLogger.write(JSON.stringify(dataSources, null, 2) + '\n');
// - - -



// - EndPoints Seed -

// - LOG -
console.log(`> Descobrindo endpoints...`);
// - - -

// > Mapeamento de cada endpoint através dos metadados dos conjuntos de dados encontrados
const endpoints: Endpoint[] = MapDiscoveredEndpointsInMemory(dataSources);

// - ERRO -
if (!endpoints) {
    errorsLogger.write("[ERRO | RUN] Falha no mapeamento dos endpoints!\n");
    throw new Error("[ERRO | RUN] Falha no mapeamento dos endpoints!");
}
// - - -

// - LOG -
dataLogger.write(`\n[INFO] Endpoints mapeados: ${endpoints.length}!\n`);
dataLogger.write(JSON.stringify(endpoints, null, 2) + '\n');
// - - -



// - Requisições nos Endpoints -

// > Requisição em cada endpoint e coleta dos responses
await EndpointFetcherOrchestrator(dataSources, endpoints);

// - LOG -
console.log("[STATUS] Script concluído!");
// - - -