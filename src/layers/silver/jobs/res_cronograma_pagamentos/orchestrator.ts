import type { NewResumoCronogramaPagamentos } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";
import { loadRawRCPs } from "./loader.js";
import { persistNewRCPs } from "./respository.js";
import { transformRawRCPs } from "./transformer.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function rcpJobOrchestrator() {
    context = 'rcpJobOrchestrator';
    const rawData: any[] = await loadRawRCPs();

    if (rawData.length === 0) {
        logger.error({ context: context }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return;
    }

    const newRCPs: NewResumoCronogramaPagamentos[] = await transformRawRCPs(rawData);

    if (newRCPs.length === 0) {
        logger.error({ context: context }, `[ERRO] Dados tratados inválidos.`);
        return;
    }

    await persistNewRCPs(newRCPs);
}