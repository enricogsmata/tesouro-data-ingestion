import { createLogger } from "../../../../../services/logs.js";
import { loadRawTramitacao } from "./loader.js";
import { persistNewResumoGeral } from "./repository.js";
import { transformRawTramitacao } from "./transformer.js";

const logger = createLogger(import.meta.url);

export async function tramitacaoJobOrchestrator() {
    const log = logger.forMethod(`tramitacaoJobOrchestrator`);
    const rawData = await loadRawTramitacao();

    if (rawData.length === 0) {
        log.error(`[ERRO] Dados brutos do endpoint inválidos.`);
        return;
    }

    const newResumosGerais = await transformRawTramitacao(rawData);

    if (newResumosGerais.length === 0) {
        log.error(`[ERRO] Dados tratados do endpoint inválidos.`);
        return;
    }

    await persistNewResumoGeral(newResumosGerais);
}