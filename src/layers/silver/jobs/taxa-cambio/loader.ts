import { createLogger } from "../../../../services/logs.js";
import { getEndpointIdByPath, getRawResponses } from "../../helpers.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function loadCambioRawResponse(): Promise<any[]> {
    context = 'getCambioRawResponse';
    const endpointId = await getEndpointIdByPath('taxa-cambio');

    if (!endpointId) {
        logger.error({ context: context }, `[ERRO] ID do endpoint indefinido ou nulo!`);
        return [];
    }

    const rawData: any[] | undefined = await getRawResponses(endpointId);

    return rawData ?? [];
}