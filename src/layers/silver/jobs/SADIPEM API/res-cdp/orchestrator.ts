import type { NewCDP } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { loadRawCDPs } from "./loader.js";
import { persistNewCDPs } from "./repository.js";
import { transformRawCDPs } from "./transformer.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function cdpJobOrchestrator() {
    context = 'cdpJobOrchestrator';
    const rawData: any[] = await loadRawCDPs();

    if (rawData.length === 0) {
        logger.error({ context: context }, `[ERRO] Dados brutos inválidos.`);
        return;
    }

    const newCDPs: NewCDP[] = await transformRawCDPs(rawData);

    if (newCDPs.length === 0) {
        logger.error({ context: context }, `[ERRO] Dados tratados inválidos.`);
        return;
    }

    await persistNewCDPs(newCDPs);
}