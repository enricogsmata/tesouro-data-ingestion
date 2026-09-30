import { createLogger } from "../../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../../helpers.js";

const logger = createLogger(import.meta.url);

export async function loadRawTramitacao(): Promise<any[]> {
    const log = logger.forMethod(`loadRawTramitacao`);
    const endpointId = await getEndpointIdByPath('tramitacao-deferido');

    if (!endpointId) {
        log.error(`[ERRO] ID do endpoint inválido!`);
        return [];
    }

    const rawData = await getRawItems(endpointId);
    return rawData ?? [];
}