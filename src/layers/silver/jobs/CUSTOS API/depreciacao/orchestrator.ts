import { createLogger } from "../../../../../services/logs.js";
import { loadRawDepreciacao } from "./loader.js";
import { persistNewDepreciacao } from "./repository.js";
import { transformRawDepreciacao } from "./transformer.js";

const logger = createLogger(import.meta.url);

export async function depreciacaoJobOrchestrator() {
    const log = logger.forMethod('depreciacaoJobOrchestrator');
    const rawData = await loadRawDepreciacao();

    if (rawData.length === 0) {
        log.error(`[ERRO] Dados brutos do endpoint inválidos`);
        return;
    }

    const newDepreciacoes = await transformRawDepreciacao(rawData);

    if (newDepreciacoes.length === 0) {
        log.error(`[ERRO] Dados tratados do endpoint inválidos.`);
        return
    }

    await persistNewDepreciacao(newDepreciacoes);
}