import path from "path";
import { getEndpointIdByPath, getRawResponses } from "../../helpers.js";
import { fileURLToPath } from "url";
import { logger } from "../../../../services/logs.js";

const module = path.basename(fileURLToPath(import.meta.url));
let context: string;

export type RawPvl = {
    idPleito: number,
    tipoInteressado: string,
    interessado: string,
    codIbge: number,
    uf: string,
    numPvl: string,
    status: string,
    numProcesso?: string,
    dataProtocolo?: string,
    tipoOperacao: string,
    finalidade: string,
    tipoCredor: string,
    credor: string,
    moeda: string,
    valor: number,
    pvlAssocDivida: number,
    pvlContratadoCredor: number,
    dataStatus: string,
}

export async function getPvlRawResponse(): Promise<RawPvl[] | undefined> {
    context = 'getPvlRawResponse';

    try {
        const endpointId: number | null = await getEndpointIdByPath("pvl");

        if (!endpointId) {
            logger.error({ module: module, context: context, data: `Endpoint: pvl` }, `[ERRO] Não foi possível obter o id do endpoint.`);
            return undefined;
        }

        const rawResponse = await getRawResponses(endpointId);

        if (!rawResponse) {
            logger.error({ module: module, context: context, data: `ENDPOINT ID ${endpointId}` }, `[ERRO] Não foi possível obter os dados brutos do endpoint`);
            return undefined;
        }

        return rawResponse as RawPvl[];
    } catch (error) {
        logger.fatal({ module: module, context: context, data: error }, `[FATAL] Erro ao obter o conteúdo bruto do endpoint.`);
        return undefined;
    }
}