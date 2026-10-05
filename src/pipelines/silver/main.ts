import { createLogger } from "../../services/logs.js";
import { cronogramaLiberacoesOrchestrator } from "./jobs/opc-cronograma-liberacoes.transformer.js";
import { cronogramaPagamentosOrchestrator } from "./jobs/opc-cronograma-pagamentos.transformer.js";
import { taxaCambioOrchestrator } from "./jobs/opc-taxa-cambio.transformer.js";
import { tramitacaoDeferidoOrchestrator } from "./jobs/opnc-pvl-tramitacao-deferido.transformer.js";
import { pvlTransformerOrchestrator } from "./jobs/pvl.transformer.js";
import { cdpOrchestrator } from "./jobs/res-cdp.transformer.js";
import { resCronogramaPagamentosOrchestrator } from "./jobs/res-cronograma-pagamentos.transformer.js";

const logger = createLogger(import.meta.url);

export async function silverOrchestrator() {
    const log = logger.forMethod('silverOrchestrator');

    // ==================================================
    // 0. TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS EXTRAÍDOS
    // ==================================================
    log.info(`[INICIANDO TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS]`);
    await pvlTransformerOrchestrator();
    await cronogramaPagamentosOrchestrator();
    await cronogramaLiberacoesOrchestrator();
    await taxaCambioOrchestrator();
    await resCronogramaPagamentosOrchestrator();
    await cdpOrchestrator();
    await tramitacaoDeferidoOrchestrator();
}