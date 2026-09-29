import { getEndpointIdByPath, getRawResponses } from "../../helpers.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function loadRawPvls(): Promise<any[] | undefined> {
    context = 'loadRawPvls';

    try {
        const endpointId: number | null = await getEndpointIdByPath("pvl");

        if (!endpointId) {
            logger.error({  context: context, data: `Endpoint: pvl` }, `[ERRO] Não foi possível obter o id do endpoint.`);
            return undefined;
        }

        const rawResponse = await getRawResponses(endpointId);

        if (!rawResponse) {
            logger.error({  context: context, data: `ENDPOINT ID ${endpointId}` }, `[ERRO] Não foi possível obter os dados brutos do endpoint`);
            return undefined;
        }

        return rawResponse as any[];
    } catch (error) {
        logger.fatal({  context: context, data: error }, `[FATAL] Erro ao obter o conteúdo bruto do endpoint.`);
        return undefined;
    }
}