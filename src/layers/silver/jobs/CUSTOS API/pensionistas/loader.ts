import { createLogger } from "../../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../../helpers.js";

const logger = createLogger(import.meta.url);

export async function loadRawPensionistas(): Promise<any[]> {
    const log = logger.forMethod('loadRawPensionistas');
    const endpointId = await getEndpointIdByPath('pensionistas');

    if (!endpointId) {
        log.error(`[ERRO] ID do endpoint inválido!`);
        return [];
    }

    const rawData: any[] = await getRawItems(endpointId);
    return rawData ?? [];
}