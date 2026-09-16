import path from "path";
import type { DataSource, Endpoint } from "../discovery/models.js";
import { createWriter } from "../logs/logic.js";
import axios from "axios";
import { FETCHERS_LOGS_DIR } from "../logs/types.js";

// - LOGGER -
const logsPath = path.join(FETCHERS_LOGS_DIR, `fetchers_logs_${Date.now()}.log`);
const errorLogsPath = path.join(FETCHERS_LOGS_DIR, `error_logs_${Date.now()}.log`);

const logger = createWriter(logsPath);
const errorLogger = createWriter(errorLogsPath);
// - - -

export async function EndpointFetcherOrchestrator(dataSources: DataSource[], endpoints: Endpoint[]) {
    // - LOG -
    logger.write(`[DATA] Endpoints à serem processados: ${endpoints.length}.\n`);
    // - - -
    for (const endpoint of endpoints) {
        // - LOG -
        logger.write(`\n[${endpoints.indexOf(endpoint) + 1} | LOOP] Endpoint sendo processado: ${endpoint.path}...\n`);
        // - - -

        const baseUrl: string = dataSources.find(ds => ds.tempId === endpoint.dataSourceId)?.baseUrl || '';
        const path: string = endpoint.path || '';

        // - ERRO -
        if (!baseUrl || !path) {
            errorLogger.write(`\n[ERRO] Base Url ou Path não encontrados!\n[BASE URL: ${baseUrl} | PATH: ${path}]\n[DATASOURCE: ${dataSources.find(ds => ds.tempId === endpoint.dataSourceId)}\n`)
            continue;
        }
        // - - -

        try {
            const fullUrl: string = new URL(path, baseUrl).toString();

            // - LOG -
            logger.write(`[URL] Url construída: ${fullUrl}\n[BASE URL] ${baseUrl}\n[PATH] ${path}\n`);
            // - - -

            await EndpointFetcher(fullUrl);
        } catch (error: any) {
            errorLogger.write(`\n[ERRO] Falha ao construir a URL para consulta do endpoint\n=> ${error}\n`)
            continue;
        }
    }

    logger.close();
    errorLogger.close();
}

async function EndpointFetcher(fullUrl: string) {
    try {
        const response = await axios.get(fullUrl, { params: { limit: 1, offset: 0 }, timeout: 30000 });

        // - ERRO -
        if (response.status != 200) {
            errorLogger.write(`\n[ERRO] Status da requisição ${response.status}\nFULL URL: ${fullUrl}\n`);
            return;
        }
        // - - -
        
        // - LOG -
        if (response.data['items']?.length == 0) {
            logger.write(`\n[WARN] Endpoint vazio/sem itens!`);
        }
        
        logger.write(`\n${JSON.stringify(response.data, null, 2)}\n`);
        // - - -
    } catch (error: any) {
        return;
    }
}