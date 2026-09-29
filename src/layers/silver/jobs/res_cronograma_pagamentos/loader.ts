import { createLogger } from "../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../helpers.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function loadRawRCPs(): Promise<any[]> {
    context = 'loadRawRCPs';
    const endpointId = await getEndpointIdByPath('res-cronograma-pagamentos');

    if (!endpointId) {
        logger.error({ context: context }, `[ERRO] ID do endpoint indefinido ou nulo.`);
        return [];
    }

    const rawData: any[] = await getRawItems(endpointId);

    if (rawData.length === 0) {
        logger.error({ context: context, data: `RAW DATA: ${rawData}` }, `[ERRO] Dados brutos inválidos.`);
        return [];
    }

    return rawData ?? [];
}