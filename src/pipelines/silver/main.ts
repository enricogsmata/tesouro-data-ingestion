import { createLogger } from "../../services/logs.js";
import { pvlTransformerOrchestrator } from "./jobs/pvl.transformer.js";

const logger = createLogger(import.meta.url);

export async function silverOrchestrator() {
    const log = logger.forMethod('silverOrchestrator');

    // ==================================================
    // 0. TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS EXTRAÍDOS
    // ==================================================
    log.info(`[INICIANDO TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS]`);
    await pvlTransformerOrchestrator();
    log.info(`[TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS FINALIZADA]`);
    return;
}