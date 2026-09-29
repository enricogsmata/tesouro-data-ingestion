import { createLogger } from "../../../../services/logs.js";
import { getEndpointIdByPath, getRawResponses } from "../../helpers.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function loadCPRawResponse(): Promise<any[]> {
    context = 'loadCPRawResponse';

    const endpointId = await getEndpointIdByPath('cronograma-liberacoes');
    if (!endpointId) {
        logger.error({ context: context }, `[ERRO] ID do endpoint nulo ou indefinido.`);
        return [];
    }

    const rawData: any[] | undefined = await getRawResponses(endpointId);
    return rawData ?? [];
}