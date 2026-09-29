import { createLogger } from "../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../helpers.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function loadRawCLs(): Promise<any[]> {
    context = 'loadRawCPs';

    const endpointId = await getEndpointIdByPath('cronograma-liberacoes');
    if (!endpointId) {
        logger.error({ context: context }, `[ERRO] ID do endpoint nulo ou indefinido.`);
        return [];
    }

    const rawData: any[] = await getRawItems(endpointId);
    return rawData ?? [];
}