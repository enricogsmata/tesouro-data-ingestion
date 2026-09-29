import { eq, like } from "drizzle-orm";
import { db } from "../../database/dbConnection.js";
import { endpoints } from "../../database/schema.js";
import { rawEndpointResponse } from "../../database/schema.js";
import { createLogger } from "../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function getEndpointIdByPath(path: string): Promise<number | null> {
    const [endpoint] = await db
        .select({ endpointId: endpoints.id })
        .from(endpoints)
        .where(like(endpoints.path, `%${path}%`));

    if (!endpoint) {
        logger.error({ context: context, data: `SELECT * FROM Endpoints WHERE LIKE %${path}%;` }, `[ERRO] Não foi possível encontrar um endpoint com o path especificado.`);
    }

    return endpoint ? endpoint.endpointId : null;
}

/**
 * Busca e deserializa os 'raw_items' armazenados para um determinado endpoint.
 * 
 * @param endpointId - ID do endpoint para filtrar as respostas no banco
 * @returns Array com todos os itens parseados do JSON ou undefined em caso de erro
 */
export async function getRawResponses(
    endpointId: number
): Promise<any[] | undefined> {
    const context = 'getRawResponses';

    if (!endpointId) {
        logger.error({  context: context }, `[ERRO] 'endpointId' inválido ou não informado.`);
        return undefined;
    }

    try {
        const rawResponses = await db
            .select({ rawItems: rawEndpointResponse.raw_items })
            .from(rawEndpointResponse)
            .where(eq(rawEndpointResponse.endpointId, endpointId));

        if (!rawResponses || rawResponses.length === 0) {
            logger.warn({  context: context, data: `Endpoint ID: ${endpointId}` }, `[AVISO] Nenhuma resposta bruta encontrada para o endpoint.`);
            return [];
        }

        const allItems = rawResponses.flatMap(row => {
            if (!row.rawItems) return [];
            try {
                return JSON.parse(row.rawItems) as [];
            } catch (parseError) {
                logger.error({  context: context, data: `${parseError}` }, `[ERRO] Falha ao fazer parse do JSON em raw_items.`);
                return [];
            }
        });

        return allItems;
    } catch (error) {
        logger.error({  context: context, data: `Endpoint ID: ${endpointId} | ${error}` }, `[ERRO] Falha ao carregar os dados brutos no banco.`);
        return undefined;
    }
}

export function parseStringToData(sData: string | undefined): Date | undefined {
    context = 'parsePvlData';

    if (!sData) {
        logger.error({  context: context }, `[ERRO] A data enviada é indefinida ou nula.`);
        return undefined;
    }

    try {
        const data = new Date(sData);
        return data;
    } catch (error) {
        let dataValues = sData.split('/');
        try {
            const formatedData = `${dataValues.at(-1)}-${dataValues.at(1)}-${dataValues.at(0)}`;
            return new Date(formatedData);
        } catch (error) {
            logger.error({  context: context, data: JSON.stringify(dataValues, null, 2) }, `[ERRO] Falha ao converter data do protocolo de um pvl.`);
            return undefined;
        }
    }
}