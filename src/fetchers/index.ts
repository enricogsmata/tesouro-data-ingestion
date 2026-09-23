import path from "path";
import axios from "axios";
import { createAppLogger } from "../logs/logic.js";
import { db } from "../database/dbConnection.js";
import { fileURLToPath } from "url";
import { ApiLinks, EndpointParameters, RawEndpointResponse } from "../database/schema.js";
import type { DataSource, Endpoint, EndpointParameter, IApiResponse, NewApiLink } from "../database/types.js";
import { eq } from "drizzle-orm";
import { parameterResolver } from "./param_mapper.js";

// - LOGGER -
console.clear();
const module = path.basename(fileURLToPath(import.meta.url));
const logger = createAppLogger(db);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Horas
// - - -

export async function EndpointFetcherOrchestrator(DataSources: DataSource[], endpoints: Endpoint[]) {
    const context = `EndpointFetcherOrchestrator`;
    logger.debug({ module: module, context: context, data: `${endpoints.length}` }, `[DATA] Endpoints à serem processados.`);

    for (const endpoint of endpoints) {
        logger.debug({ module: module, context: context }, `[${endpoints.indexOf(endpoint) + 1} | LOOP] Endpoint sendo processado: ${endpoint.path}...`);

        const baseUrl: string = DataSources.find(ds => ds.id === endpoint.dataSourceId)?.baseUrl || '';
        const pathStr: string = endpoint.path || '';

        if (!baseUrl || !pathStr) {
            logger.error({ module: module, context: context, data: `[BASE URL: ${baseUrl} | PATH: ${pathStr}]` }, `[ERRO] Base Url ou Path não encontrados!`);
            continue;
        }

        try {
            const fullUrl: string = new URL(pathStr, baseUrl).toString();
            logger.debug({ module: module, context: context, data: `[FULL URL] ${fullUrl}` }, `[URL] Url construída.`);

            await EndpointFetcher(fullUrl, endpoint);

        } catch (error: any) {
            logger.error({ module: module, context: context, data: `${error}` }, `[ERRO] Falha ao construir a URL para consulta do endpoint.`);
            continue;
        }
    }
}

async function EndpointFetcher(fullUrl: string, endpoint: Endpoint) {
    const context = `EndpointFetcher`;

    const isCached = await isEndpointCached(endpoint.id);
    if (isCached) {
        logger.warn({ module: module, context: context, data: `Endpoint ID: ${endpoint.id}` }, `[CACHE] Registro dentro do prazo de 24h. Requisição HTTP ignorada.`);
        return;
    }

    try {
        await new Promise((resolver) => setTimeout(resolver, 1000));

        const params: EndpointParameter[] = await db.select().from(EndpointParameters).where(eq(EndpointParameters.endpointId, endpoint.id));
        const requiredParams = params.filter(param => param.is_required);

        if (requiredParams.length > 0) {
            const resolvedParams: Record<string, any[]> = {};

            for (const reqParam of requiredParams) {
                if (reqParam.name) {
                    const resolverFn = parameterResolver[reqParam.name];
                    if (typeof resolverFn === 'function') {
                        resolvedParams[reqParam.name] = await resolverFn(endpoint);
                    }
                }
            }

            const paramKeys = Object.keys(resolvedParams);
            if (paramKeys.length !== requiredParams.length) {
                logger.error({ module: module, context: context, data: `URL: ${fullUrl} | ${JSON.stringify(requiredParams)}` }, `[ERRO] O endpoint possui parâmetros obrigatórios sem resolver.`);
                return;
            }

            // Função auxiliar de produto cartesiano fortemente tipada
            const cartesian = <T>(args: T[][]): T[][] =>
                args.reduce<T[][]>(
                    (acc, curr) => acc.flatMap(d => curr.map(e => [...(Array.isArray(d) ? d : [d]), e])),
                    [[]]
                );

            const paramValuesMatrix: any[][] = paramKeys.map(key => resolvedParams[key] ?? []);

            if (paramValuesMatrix.length === 0) return;

            // Tratamento explícito para o TypeScript entender que a posição 0 existe
            const firstSet = paramValuesMatrix[0];
            if (!firstSet) return;

            const combinations = paramValuesMatrix.length === 1
                ? firstSet.map(v => [v])
                : cartesian(paramValuesMatrix);

            for (const combination of combinations) {
                await new Promise((resolver) => setTimeout(resolver, 1000));

                const queryParams: Record<string, any> = { offset: 0 };
                const combArray = Array.isArray(combination) ? combination : [combination];

                paramKeys.forEach((key, index) => {
                    queryParams[key] = combArray[index];
                });

                const response = await axios.get(fullUrl, { params: queryParams, timeout: 60000 });
                await PersistRawEndpointResponse(response, endpoint.id);
            }
        } else {
            const response = await axios.get(fullUrl, { params: { offset: 0 }, timeout: 60000 });
            await PersistRawEndpointResponse(response, endpoint.id);
        }
    } catch (error: any) {
        logger.error({ module: module, context: context, data: `Full Url: ${fullUrl} | ${error}` }, `[ERRO] Falha ao executar requisição do endpoint.`);
        return null;
    }
}

// Auxiliar para checar validade do cache
async function isEndpointCached(endpointId: number): Promise<boolean> {
    const [existingRaw] = await db
        .select({ generatedAt: RawEndpointResponse.generatedAt })
        .from(RawEndpointResponse)
        .where(eq(RawEndpointResponse.endpointId, endpointId));

    if (!existingRaw || !existingRaw.generatedAt) return false;

    const lastAddedTimestamp = Number(existingRaw.generatedAt);
    return (Date.now() - lastAddedTimestamp) < CACHE_TTL_MS;
}

async function PersistRawEndpointResponse(response: any, endpointId: number) {
    const context = 'PersistRawEndpointResponse';

    if (!response || response.status !== 200) {
        logger.error({ module: module, context: context, data: `Endpoint ID: ${endpointId}` }, `[ERRO] Resposta inválida ou status ${response?.status}`);
        return;
    }

    const responseData = response.data || {};
    if (responseData['items']?.length === 0) {
        logger.warn({ module: module, context: context, data: `Endpoint ID: ${endpointId}'` }, `[WARN] Endpoint vazio/sem itens!`);
    }

    try {
        const apiResponse: IApiResponse = {
            items: responseData["items"] || responseData["registros"],
            limit: responseData["limit"],
            offset: responseData["offset"],
            count: responseData["count"],
            hasMore: responseData["hasMore"]
        };

        const nowString = String(Date.now());

        // Checa se a linha já existe para fazer UPDATE (substituir) ou INSERT (primeira vez)
        const [existingRaw] = await db
            .select({ id: RawEndpointResponse.id })
            .from(RawEndpointResponse)
            .where(eq(RawEndpointResponse.endpointId, endpointId));

        let rawEndpointId: number;

        if (existingRaw) {
            // Atualiza a linha existente expirada
            await db.update(RawEndpointResponse)
                .set({
                    raw_items: JSON.stringify(apiResponse.items, null, 2),
                    count: apiResponse.count,
                    hasMore: apiResponse.hasMore ? 1 : 0,
                    limit: apiResponse.limit,
                    offset: apiResponse.offset,
                    generatedAt: nowString,
                })
                .where(eq(RawEndpointResponse.id, existingRaw.id));

            rawEndpointId = existingRaw.id;
        } else {
            // Insere novo registro se for a primeira vez
            const [insertedRawEndpoint] = await db.insert(RawEndpointResponse).values({
                endpointId: endpointId,
                raw_items: JSON.stringify(apiResponse.items, null, 2),
                count: apiResponse.count,
                hasMore: apiResponse.hasMore ? 1 : 0,
                limit: apiResponse.limit,
                offset: apiResponse.offset,
                generatedAt: nowString,
            }).returning({ id: RawEndpointResponse.id });

            if (!insertedRawEndpoint) return;
            rawEndpointId = insertedRawEndpoint.id;
        }

        // Salva os links de navegação se existirem
        if (responseData["links"] && Array.isArray(responseData["links"])) {
            const newApiLinks: NewApiLink[] = responseData["links"].map((link: any) => ({
                endpointId: rawEndpointId,
                href: link["href"],
                rel: link["rel"],
                generatedAt: nowString,
            }));

            if (newApiLinks.length > 0) {
                await db.insert(ApiLinks).values(newApiLinks);
            }
        }
    } catch (error) {
        logger.error({ module: module, context: context, data: `${error}` }, `[ERRO] Falha ao persistir dados no banco.`);
    }
}