import path from "path";
import type { IDataSource } from "../database/models/datasource/models.js";
import { type IRawEndpoint, type IApiResponse, type ApiLink } from "../database/models/endpoint/models.js";
import axios from "axios";
import { createAppLogger } from "../logs/logic.js";
import { db } from "../database/dbConnection.js";
import { fileURLToPath } from "url";

// - LOGGER -
const module = path.basename(fileURLToPath(import.meta.url));

const logger = createAppLogger(db);
// - - -

export async function EndpointFetcherOrchestrator(DataSources: IDataSource[], endpoints: IRawEndpoint[]) {
    // - LOG -
    const context = `EndpointFetcherOrchestrator`;
    logger.debug({module: module, context: context, data: `${endpoints.length}`}, `[DATA] Endpoints à serem processados.`);
    // - - -
    for (const endpoint of endpoints) {
        // - LOG -
        logger.debug({module: module, context: context}, `[${endpoints.indexOf(endpoint) + 1} | LOOP] Endpoint sendo processado: ${endpoint.path}...`);
        // - - -

        const baseUrl: string = DataSources.find(ds => ds.tempId === endpoint.IDataSourceTempId)?.baseUrl || '';
        const path: string = endpoint.path || '';

        // - ERRO -
        if (!baseUrl || !path) {
            logger.error({module: module, context: context, data: `[BASE URL: ${baseUrl} | PATH: ${path}] | [DataSource: ${DataSources.find(ds => ds.tempId === endpoint.IDataSourceTempId)}`}, `[ERRO] Base Url ou Path não encontrados!`);
            continue;
        }
        // - - -

        try {
            const fullUrl: string = new URL(path, baseUrl).toString();

            // - LOG -
            logger.debug({module: module, context: context, data: `[FULL URL] ${fullUrl} | [BASE URL] ${baseUrl} | [PATH] ${path}`}, `[URL] Url construída.`);
            // - - -

            const apiResponse = await EndpointFetcher(fullUrl);

            // - ERRO -
            if (!apiResponse) {
                // ERRO...
                continue;
            }
            // - - -
        } catch (error: any) {
            logger.error({module: module, context: context, data: `${error}`}, `[ERRO] Falha ao construir a URL para consulta do endpoint.`);
            continue;
        }
    }
}

async function EndpointFetcher(fullUrl: string): Promise<IApiResponse<String> | null> {
    const context = `EndpointFetcher`;

    try {
        const response = await axios.get(fullUrl, { params: { limit: 1, offset: 0 }, timeout: 30000 });

        // - ERRO -
        if (response.status != 200) {
            logger.error({module: module, context: context, data: `FULL URL: ${fullUrl}`}, `[ERRO] Status da requisição ${response.status}`);
            return null;
        }
        // - - -

        // - LOG -
        if (response.data['items']?.length == 0) {
            logger.warn({module: module, context: context, data: `${fullUrl}`}, `[WARN] Endpoint vazio/sem itens!`);
        }

        logger.debug({module: module, context: context, data: `${JSON.stringify(response.data, null, 2)}`}, `[DEBUG] Response gerada`);
        // - - -

        const data = response.data;

        const apiLinks: ApiLink[] = [];
        for (const link of data["links"]) {
            const apiLink: ApiLink = {
                href: link.href || '',
                rel: link.rel || ''
            }

            if (apiLink) {
                apiLinks.push(apiLink);
            } else {
                logger.warn({module: module, context: context}, `[WARN] Api Link não foi montado corretamente.`);
            }
        }

        const apiResponse: IApiResponse<string> = {
            items: data["items"],
            limit: data["limit"],
            offset: data["offset"],
            count: data["count"],
            hasMore: data["hasMore"],
            links: apiLinks
        }

        return apiResponse;
    } catch (error: any) {
        return null;
    }
}