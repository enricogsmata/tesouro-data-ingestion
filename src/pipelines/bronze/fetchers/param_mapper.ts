import { eq } from "drizzle-orm";
import { db } from "../../../database/dbConnection.js";
import { endpoints, rawEndpointResponse } from "../../../database/schema.js"
import type { Endpoint } from "../../../database/types.js";

const INITIAL_YEAR = 2015;

type ResolverFunction = (endpoint: Endpoint) => Promise<any>;
type ParameterResolverMap = {
    [key: string]: ResolverFunction | undefined;
};

/**
 * Dicionário de parâmetros obrigatórios / funções de busca e retorno dos itens exigidos no parâmetro
 */
export const parameterResolver: ParameterResolverMap = {
    "an_exercicio": async () => {
        return generateYearsInterval(INITIAL_YEAR);
    },

    "an_referencia": async () => {
        return generateYearsInterval(2002);
    },

    "classe_conta": async (endpoint: Endpoint) => {
        const endpointPath = endpoint.path || '';

        if (endpointPath.includes("msc_patrimonial")) return [1, 2, 3, 4];
        if (endpointPath.includes("msc_orcamentaria")) return [5, 6];
        if (endpointPath.includes("msc_controle")) return [7, 8];

        return [];
    },

    "co_poder": async () => {
        return ["E", "L", "J", "M", "D"];
    },

    "co_tipo_demonstrativo": async () => {
        return ["RREO", "RREO Simplificado"];
    },

    "co_tipo_matriz": async () => {
        return ["MSCC", "MSCE"];
    },

    "id_ente": async () => {
        const [entesEndpoint] = await db
            .select({ id: endpoints.id })
            .from(endpoints)
            .where(eq(endpoints.path, "entes"));

        if (!entesEndpoint) return [];

        const rawResponses = await db
            .select({ rawItems: rawEndpointResponse.raw_items })
            .from(rawEndpointResponse)
            .where(eq(rawEndpointResponse.endpointId, entesEndpoint.id));

        if (!rawResponses || rawResponses.length === 0) return [];

        const entesCodIbgeList = new Set<number>();

        // 3. Itera sobre cada resposta salva no banco
        for (const row of rawResponses) {
            if (!row.rawItems) continue;

            const parsedItems = typeof row.rawItems === 'string'
                ? JSON.parse(row.rawItems)
                : row.rawItems;

            // Garantimos que é uma lista antes de iterar
            if (Array.isArray(parsedItems)) {
                for (const item of parsedItems) {
                    if (item?.cod_ibge) {
                        entesCodIbgeList.add(item.cod_ibge);
                    }
                }
            }
        }

        return Array.from(entesCodIbgeList);
    },

    "id_tv": async () => {
        return ["beginning_balance", "period_change", "ending_balance"];
    },

    "in_periodicidade": async () => {
        return ["Q", "S"];
    },

    "me_referencia": async () => {
        let months: number[] = [];
        for (let month = 1; month <= 12; month++)
            months.push(month);

        return months;
    },

    "nr_periodo": async (endpoint: Endpoint) => {
        const endpointPath = endpoint.path || '';

        if (endpointPath.includes('rreo')) return [1, 2, 3, 4, 5, 6];
        if (endpointPath.includes('rgf')) return [1, 2, 3];

        return [];
    },

    "tema": async () => {
        return ["10", "13", "20"];
    }
}

/**
 * Auxiliar construtor de listas numéricas
 * @param initialYear - Ano inicial de consulta no parâmetro
 * @returns - Conjunto sequencial numérico de anos desde o ano inicial até o ano atual
 */
function generateYearsInterval(initialYear: number): number[] {
    const CURRENT_YEAR = new Date().getFullYear();

    const fullPeriod: number[] = [];
    for (let year = initialYear; year <= CURRENT_YEAR; year++)
        fullPeriod.push(year);

    return fullPeriod;
}