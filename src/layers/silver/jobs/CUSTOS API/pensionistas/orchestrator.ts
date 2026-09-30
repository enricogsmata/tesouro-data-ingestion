import type { NewCustoAtivo } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { loadRawPensionistas } from "./loader.js";
import { persistNewCustoAtivo } from "./repository.js";
import { transformRawPensionistas } from "./transformer.js";

const logger = createLogger(import.meta.url);

export async function pensionistasJobOrchestrator() {
    const log = logger.forMethod('pensionistasJobOrchestrator');
    const rawData = await loadRawPensionistas();

    if (rawData.length === 0) {
        log.error(`[ERRO] Dados brutos do endpoint inválidos!`);
        return;
    }

    const newCustoAtivo: NewCustoAtivo[] = await transformRawPensionistas(rawData);

    if (newCustoAtivo.length === 0) {
        log.error(`[ERRO] Dados tratados do endpoint inválidos!`);
        return;
    }

    await persistNewCustoAtivo(newCustoAtivo);
}