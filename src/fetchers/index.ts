import path from "path";
import axios from "axios";
import { createAppLogger } from "../logs/logic.js";
import { db } from "../database/dbConnection.js";
import { fileURLToPath } from "url";
import { ApiLinks, RawEndpointResponse } from "../database/schema.js";
import type { DataSource, Endpoint, IApiResponse, NewApiLink } from "../database/types.js";

// - LOGGER -
console.clear();
const module = path.basename(fileURLToPath(import.meta.url));

const logger = createAppLogger(db);
// - - -

export async function EndpointFetcherOrchestrator(DataSources: DataSource[], endpoints: Endpoint[]) {
    // - LOG -
    const context = `EndpointFetcherOrchestrator`;
    logger.debug({ module: module, context: context, data: `${endpoints.length}` }, `[DATA] Endpoints à serem processados.`);
    // - - -
    for (const endpoint of endpoints) {
        // - LOG -
        logger.debug({ module: module, context: context }, `[${endpoints.indexOf(endpoint) + 1} | LOOP] Endpoint sendo processado: ${endpoint.path}...`);
        // - - -

        const baseUrl: string = DataSources.find(ds => ds.id === endpoint.dataSourceId)?.baseUrl || '';
        const path: string = endpoint.path || 'Sem Descrição';

        // - ERRO -
        if (!baseUrl || !path) {
            logger.error({ module: module, context: context, data: `[BASE URL: ${baseUrl} | PATH: ${path}] | [DataSource: ${DataSources.find(ds => ds.id === endpoint.dataSourceId)}` }, `[ERRO] Base Url ou Path não encontrados!`);
            continue;
        }
        // - - -

        try {
            const fullUrl: string = new URL(path, baseUrl).toString();

            // - LOG -
            logger.debug({ module: module, context: context, data: `[FULL URL] ${fullUrl} | [BASE URL] ${baseUrl} | [PATH] ${path}` }, `[URL] Url construída.`);
            // - - -

            const response: any | null = await EndpointFetcher(fullUrl);

            // - ERRO -
            if (!response) {
                logger.error({ module: module, context: context, data: fullUrl }, `[ERRO] O objeto de resposta da API não foi retornado corretamente.`)
                continue;
            }
            // - - -

            // - OPCIONAL -
            // > Inserção do response dos endpoints sem tratamento dos itens retornados
            try {
                const apiResponse: IApiResponse = {
                    items: response["items"] || response["registros"],
                    limit: response["limit"],
                    offset: response["offset"],
                    count: response["count"],
                    hasMore: response["hasMore"]
                }

                const [insertedRawEndpoint] = await db.insert(RawEndpointResponse).values({
                    endpointPath: fullUrl,
                    raw_items: JSON.stringify(apiResponse.items, null, 2),
                    count: apiResponse.count,
                    hasMore: apiResponse.hasMore ? 1 : 0,
                    limit: apiResponse.limit,
                    offset: apiResponse.offset,
                    generatedAt: String(Date.now()),
                }).returning({ id: RawEndpointResponse.id })

                if (!insertedRawEndpoint) {
                    logger.error({ module: module, context: context, data: JSON.stringify(apiResponse, null, 2) }, `[ERRO] Não foi possível extrair o id do endpoint inserido.`);
                    continue;
                }

                if (!response["links"]) {
                    logger.warn({module: module, context: context, data: `Endpoint Id: ${endpoint.id}`}, `[WARN] Response não retornou objetos de links da api para o endpoint processado`);
                    continue;
                }

                const newApiLinks: NewApiLink[] = [];
                for (const link of response["links"]) {
                    if (link) {
                        const newApiLink: NewApiLink = {
                            endpointId: insertedRawEndpoint.id,
                            href: link["href"],
                            rel: link["rel"],
                            generatedAt: String(Date.now()),
                        }
    
                        if (newApiLink) {
                            newApiLinks.push(newApiLink);
                        }
                    }
                }

                if (newApiLinks)
                    db.insert(ApiLinks).values(newApiLinks).run();
            } catch (error) {
                logger.error({ module: module, context: context, data: JSON.stringify(response, null, 2) }, `[ERRO] ${error}`);
                continue;
            }
            // - - -
        } catch (error: any) {
            logger.error({ module: module, context: context, data: `${error}` }, `[ERRO] Falha ao construir a URL para consulta do endpoint.`);
            continue;
        }
    }
}

async function EndpointFetcher(fullUrl: string): Promise<any | null> {
    const context = `EndpointFetcher`;

    try {
        const response = await axios.get(fullUrl, { params: { offset: 0 }, timeout: 60000 });

        // - ERRO -
        if (response.status != 200) {
            logger.error({ module: module, context: context, data: `FULL URL: ${fullUrl}` }, `[ERRO] Status da requisição ${response.status}`);
            return null;
        }
        // - - -

        // - LOG -
        if (response.data['items']?.length == 0) {
            logger.warn({ module: module, context: context, data: `${fullUrl}` }, `[WARN] Endpoint vazio/sem itens!`);
        }

        logger.debug({ module: module, context: context, data: `${JSON.stringify(response.data, null, 2)}` }, `[DEBUG] Response gerada`);
        // - - -

        return response.data;
    } catch (error: any) {
        return null;
    }
}