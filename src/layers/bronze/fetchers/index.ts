import axios from "axios";
import { bronzeDB } from "../../../database/dbConnection.js";
import { apiLinks, endpointParameters, rawEndpointResponse } from "../../../database/bronze_schema.js";
import { tablesMap } from "../../../database/utils.js";
import type { DataSource, Endpoint, EndpointParameter, IApiResponse, NewApiLink } from "../../../database/types.js";
import { eq } from "drizzle-orm";
import { parameterResolver } from "./param_mapper.js";
import { createLogger } from "../../../services/logs.js";

const logger = createLogger(import.meta.url);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Horas

// MODO TEMPORÁRIO DE AMOSTRAGEM PARA MODELAGEM DE DADOS
const IS_SAMPLING_MODE = false;

/**
 * 
 * @param DataSources - Conjunto de fontes de dados extraídos na página do CKAN
 * @param endpoints - Conjunto de endpoint extraídos das fontes de dados do CKAN
 */
export async function EndpointFetcherOrchestrator(DataSources: DataSource[], endpoints: Endpoint[]) {
    const context = `EndpointFetcherOrchestrator`;

    for (const endpoint of endpoints) {
        // 1. Limpa a tabela genérica para garantir unicidade
        await bronzeDB.delete(rawEndpointResponse).where(eq(rawEndpointResponse.endpointId, endpoint.id));

        // 2. NOVA LÓGICA: Limpa a tabela alvo (targetTable) exclusiva do endpoint se ela existir
        if (endpoint.targetTable) {
            try {
                const targetSchema = (tablesMap as any)[endpoint.targetTable];
                if (targetSchema) {
                    await bronzeDB.delete(targetSchema); // Remove registros antigos da tabela bruta específica
                }
            } catch (error) {
                logger.warn({ context, data: `${error}` }, `[WARN] Não foi possível limpar a tabela alvo ${endpoint.targetTable}`);
            }
        }

        const baseUrl: string = DataSources.find(ds => ds.id === endpoint.dataSourceId)?.baseUrl || '';
        const pathStr: string = endpoint.path || '';

        if (!baseUrl || !pathStr) {
            logger.error({ context: context, data: `[BASE URL: ${baseUrl} | PATH: ${pathStr}]` }, `[ERRO] Base Url ou Path não encontrados!`);
            continue;
        }

        try {
            const fullUrl: string = new URL(pathStr, baseUrl).toString();
            await EndpointFetcher(fullUrl, endpoint);
        } catch (error: any) {
            logger.fatal({ context: context, data: `${error}` }, `[ERRO] Falha ao construir a URL para consulta do endpoint.`);
            continue;
        }
    }
}

/**
 * 
 * @param fullUrl - Url completa para requisição no endpoint: base url + endpoint
 * @param endpoint - Objeto do endpoint que será feita a requisição
 * @returns - Em caso de erro paralisa a execução do método
 */
async function EndpointFetcher(fullUrl: string, endpoint: Endpoint) {
    const context = `EndpointFetcher`;

    const isCached = await isEndpointCached(endpoint.id);
    if (isCached) return;

    try {
        await new Promise((resolver) => setTimeout(resolver, 1000));

        const params: EndpointParameter[] = await bronzeDB.select().from(endpointParameters).where(eq(endpointParameters.endpointId, endpoint.id));
        const requiredParams = params.filter(param => param.is_required);

        let combinations: any[][] = [[]];
        let paramKeys: string[] = [];

        if (requiredParams.length > 0) {
            /* ... (Lógica de resolução de parâmetros mantida idêntica) ... */
            const resolvedParams: Record<string, any[]> = {};
            for (const reqParam of requiredParams) {
                if (reqParam.name) {
                    const resolverFn = parameterResolver[reqParam.name];
                    if (typeof resolverFn === 'function') {
                        const result = await resolverFn(endpoint);
                        resolvedParams[reqParam.name] = Array.isArray(result) ? result : [result];
                    }
                }
            }

            paramKeys = Object.keys(resolvedParams);
            if (paramKeys.length !== requiredParams.length) {
                logger.error({ context: context, data: `URL: ${fullUrl} | ${JSON.stringify(requiredParams)}` }, `[ERRO] O endpoint possui parâmetros obrigatórios sem resolver.`);
                return;
            }

            const cartesian = <T>(args: T[][]): T[][] =>
                args.reduce<T[][]>((acc, curr) => acc.flatMap(d => curr.map(e => [...(Array.isArray(d) ? d : [d]), e])), [[]]);

            const paramValuesMatrix: any[][] = paramKeys.map(key => resolvedParams[key] ?? []);
            if (paramValuesMatrix.length === 0 || !paramValuesMatrix[0]) return;

            combinations = paramValuesMatrix.length === 1 ? paramValuesMatrix[0].map(v => [v]) : cartesian(paramValuesMatrix);
        }

        for (const combination of combinations) {
            let currentQueryParams: Record<string, any> = { offset: 0 };
            if (IS_SAMPLING_MODE) currentQueryParams.limit = 1;

            const combArray = Array.isArray(combination) ? combination : [combination];
            paramKeys.forEach((key, index) => { currentQueryParams[key] = combArray[index]; });

            let hasNext: boolean = true;
            let nextHref: string | null = null;

            while (hasNext) {
                let config: any = { timeout: 60000, params: currentQueryParams };

                if (nextHref) {
                    const parsedNextParams = Object.fromEntries(new URL(nextHref).searchParams);
                    config.params = { ...currentQueryParams, ...parsedNextParams };
                }

                await new Promise((resolve) => setTimeout(resolve, 1200));
                
                let response: any;
                const MAX_ATTEMPTS = 5;
                const RETRY_DELAY_MS = 2000;

                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                    try {
                        response = await axios.get(fullUrl, config);
                        break;
                    } catch (error: any) {
                        logger.warn({ context: context, data: `FULL URL: ${fullUrl} | Erro: ${error}` }, `[WARN] Falha na requisição do endpoint: ${attempt} tentativa(s) realizada(s).`);
                        if (attempt === MAX_ATTEMPTS) throw error; 
                        else await new Promise((resolver) => setTimeout(resolver, RETRY_DELAY_MS * attempt));
                    }
                }

                if (!response || response.status !== 200) {
                    logger.error({ context: context, data: `Endpoint ID: ${endpoint.id}` }, `[ERRO] Resposta inválida ou status ${response?.status}`);
                    return;
                }

                const responseItems = response.data?.registros ?? response.data?.items ?? [];
                if (responseItems.length === 0) {
                    hasNext = false;
                    break;
                }

                const responseOffset = response.data.offset || null;
                if (!responseOffset && nextHref) {
                    const url = new URL(nextHref);
                    const p = Object.fromEntries(url.searchParams);
                    response.data.offset = Number(p.page) * Number(p.pageSize) || 0;
                }

                response.request.url = response.request.url ?? fullUrl;

                // >>> ALTERAÇÃO CIRÚRGICA: Passando o objeto 'endpoint' completo ao invés de apenas o ID <<<
                await PersistRawEndpointResponse(response, endpoint);

                nextHref = ckeckIfHasNext(response);
                if (!nextHref) hasNext = false;
                if (IS_SAMPLING_MODE) hasNext = false;
            }
            if (IS_SAMPLING_MODE) break;
        }
    } catch (error: any) {
        logger.error({ context: context, data: `Full Url: ${fullUrl} | ${error}` }, `[ERRO] Falha ao executar requisição do endpoint.`);
        return null;
    }
}

/**
 * Persiste o conteúdo bruto do endpoint
 * @param response - Objeto da resposta da requisição no endpoint
 * @param endpoint - Objeto do endpoint (contendo id e targetTable)
 */
async function PersistRawEndpointResponse(response: any, endpoint: Endpoint) {
    const context = 'PersistRawEndpointResponse';

    const responseData = response.data || {};
    const responseItems = responseData.items ?? responseData.registros ?? [];

    if (responseItems.length === 0) {
        logger.warn({ context: context, data: `Endpoint ID: ${endpoint.id} | ${response.request.url ?? ''}` }, `[INFO] Endpoint vazio/sem itens!`);
        return;
    }

    try {
        const apiResponse: IApiResponse = {
            items: responseItems,
            limit: responseData["limit"] ?? responseData["offset"] ?? 0,
            offset: responseData["offset"] ?? 0,
            count: responseData["count"] ?? responseData["pageSize"] ?? 0,
            hasMore: responseData["hasMore"] ?? 0
        };

        // 1. INSERÇÃO NA TABELA GENÉRICA MANTIDA
        const [insertedRawEndpoint] = await bronzeDB.insert(rawEndpointResponse).values({
            endpointId: endpoint.id,
            raw_items: JSON.stringify(apiResponse.items, null, 2),
            count: apiResponse.count,
            hasMore: apiResponse.hasMore ? 1 : 0,
            limit: apiResponse.limit,
            offset: apiResponse.offset,
            generatedAt: new Date(),
        }).$returningId();

        if (!insertedRawEndpoint) return;

        if (responseData["links"] && Array.isArray(responseData["links"])) {
            const newapiLinks: NewApiLink[] = responseData["links"].map((link: any) => ({
                endpointId: insertedRawEndpoint.id,
                href: link["href"],
                rel: link["rel"],
                generatedAt: new Date(),
            }));
            if (newapiLinks.length > 0) await bronzeDB.insert(apiLinks).values(newapiLinks);
        }

        // 2. NOVA LÓGICA: INSERÇÃO DIRETA NA TABELA ESPECÍFICA (TARGET TABLE)
        if (endpoint.targetTable) {
            // Recupera o schema da tabela com base no dicionário importado
            const targetSchema = (tablesMap as any)[endpoint.targetTable];
            
            if (targetSchema) {
                // O Drizzle faz o bulk insert automaticamente com array de objetos
                // Se o JSON tiver colunas a mais que o schema, o Drizzle as ignora com segurança
                await bronzeDB.insert(targetSchema).values(apiResponse.items);
            } else {
                logger.warn({ context, data: `Tabela: ${endpoint.targetTable}` }, `[WARN] Schema não encontrado no tablesMap.`);
            }
        }

    } catch (error) {
        logger.error({ context: context, data: `${error}` }, `[ERRO] Falha ao persistir dados no banco.`);
    }
}

/**
 * Verifica se existe outra página com dados para serem retornados na requisição da api
 * @param response - Objeto da resposta da requisição realizada para o endpoint específico
 * @returns - A url da próxima página ou nulo quando inexistente
 */
function ckeckIfHasNext(response: any): string | null {
    let nextUrl: string;
    const responseData = response.data ?? {};

    if (responseData.next) {
        nextUrl = String(responseData.next);
        return nextUrl;
    }
    else if (responseData.hasMore === true || String(responseData.hasMore) === "true") {
        const responseLinks = responseData.links ?? [];

        for (const link of responseLinks) {
            if (link.rel && String(link.rel) === "next") {
                return link.href ? String(link.href) : null;
            }
        }
    }
    return null;
}

/**
 * 
 * @param endpointId - ID do endpoint cuja requisição foi realizada
 * @returns - True: endpoint inserido há menos de 24 horas | False: caso contrário
 */
async function isEndpointCached(endpointId: number): Promise<boolean> {
    const [existingRaw] = await bronzeDB
        .select({ generatedAt: rawEndpointResponse.generatedAt })
        .from(rawEndpointResponse)
        .where(eq(rawEndpointResponse.endpointId, endpointId));

    if (!existingRaw || !existingRaw.generatedAt) return false;

    const lastAddedTimestamp = Number(existingRaw.generatedAt);
    return (Date.now() - lastAddedTimestamp) < CACHE_TTL_MS;
}