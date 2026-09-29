import { getEndpointIdByPath, getRawResponses } from "../../helpers.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export type RawEnte = {
    cod_ibge: number,
    ente: string,
    capital: string,
    regiao: string,
    uf: string,
    esfera: string,
    exercicio: string,
    populacao: string,
    cnpj: string,
}

export async function getEntesRawResponse(): Promise<RawEnte[] | undefined> {
    context = 'getPvlRawResponse';

    try {
        const endpointId: number | null = await getEndpointIdByPath("entes");

        if (!endpointId) {
            logger.error({  context: context, data: `Endpoint: pvl` }, `[ERRO] Não foi possível obter o id do endpoint.`);
            return undefined;
        }

        const rawResponse = await getRawResponses(endpointId);

        if (!rawResponse) {
            logger.error({  context: context, data: `Endpoint: pvl` }, `[ERRO] Não foi possível obter o conteúdo bruto do endpoint.`);
            return undefined;
        }

        return rawResponse as RawEnte[];
    } catch (error) {
        logger.fatal({  context: context, data: error }, `[FATAL] Erro ao obter o conteúdo bruto do endpoint.`);
        return undefined;
    }
}