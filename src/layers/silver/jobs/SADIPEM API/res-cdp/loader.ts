import { createLogger } from "../../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../../helpers.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function loadRawCDPs(): Promise<any[]> {
    context = 'loadRawRCDPs';
    const endpointId = await getEndpointIdByPath('res-cdp');

    if (!endpointId) {
        logger.error({ context: context }, `[ERRO] ID do endpoint inválido.`);
        return [];
    }

    const rawData: any[] = await getRawItems(endpointId);
    return rawData;
}