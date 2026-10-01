import { createLogger } from "../../../../../services/logs.js";
import { getEndpointIdByPath, getRawItems } from "../../../helpers.js";

const logger = createLogger(import.meta.url);

export async function loadRawPessoalAtivo(): Promise<any[]> {
    const log = logger.forMethod('loadRawPessoalAtivo');
    const endpointId = await getEndpointIdByPath('pessoal_ativo');

    if (!endpointId) {
        log.error(`[ERRO] ID do endpoint inválido!`);
        return [];
    }

    const rawData = await getRawItems(endpointId);
    return rawData ?? [];
}