import { createLogger } from "../../services/logs.js";
import { enteTransformerOrchestrator } from "./jobs/ente.transformer.js";
import { cronogramaLiberacoesOrchestrator } from "./jobs/opc-cronograma-liberacoes.transformer.js";
import { cronogramaPagamentosOrchestrator } from "./jobs/opc-cronograma-pagamentos.transformer.js";
import { taxaCambioOrchestrator } from "./jobs/opc-taxa-cambio.transformer.js";
import { pvlTransformerOrchestrator } from "./jobs/pvl.transformer.js";

const logger = createLogger(import.meta.url);

export async function silverOrchestrator() {
    const log = logger.forMethod('silverOrchestrator');

    // ==================================================
    // 0. TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS EXTRAÍDOS
    // ==================================================
    log.info(`[INICIANDO TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS]`);
    //await enteTransformerOrchestrator();
    //await pvlTransformerOrchestrator();
    //await cronogramaPagamentosOrchestrator();
    //await cronogramaLiberacoesOrchestrator();
    await taxaCambioOrchestrator();
    log.info(`[TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS FINALIZADA]`);
    return;
}