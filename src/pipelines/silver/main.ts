import { createLogger } from "../../services/logs.js";
import { anexosRelatoriosTransformerOrchestrator } from "./jobs/anexos_relatorios.transformer.js";
import { custoAtivoTransformerOrchestrator } from "./jobs/custo_ativo.transformer.js";
import { custoInativoTransformerOrchestrator } from "./jobs/custo_inativo.transformer.js";
import { custoPensionistaTransformerOrchestrator } from "./jobs/custo_pensionista.transformer.js";
import { dcaTransformerOrchestrator } from "./jobs/dca.transformer.js";
import { demaisCustosTransformerOrchestrator } from "./jobs/demais_custos.transformer.js";
import { depreciacaoTransformerOrchestrator } from "./jobs/depreciacao.transformer.js";
import { enteTransformerOrchestrator } from "./jobs/ente.transformer.js";
import { extratoEntregasTransformerOrchestrator } from "./jobs/extrato_entregas.transformer.js";
import { mscControleTransformerOrchestrator } from "./jobs/msc_controle.transformer.js";
import { mscOrcamentariaTransformerOrchestrator } from "./jobs/msc_orcamentaria.transformer.js";
import { mscPatrimonialTransformerOrchestrator } from "./jobs/msc_patrimonial.transformer.js";
import { cronogramaLiberacoesOrchestrator } from "./jobs/opc-cronograma-liberacoes.transformer.js";
import { cronogramaPagamentosOrchestrator } from "./jobs/opc-cronograma-pagamentos.transformer.js";
import { taxaCambioOrchestrator } from "./jobs/opc-taxa-cambio.transformer.js";
import { tramitacaoDeferidoOrchestrator } from "./jobs/opnc-pvl-tramitacao-deferido.transformer.js";
import { pvlTransformerOrchestrator } from "./jobs/pvl.transformer.js";
import { cdpOrchestrator } from "./jobs/res-cdp.transformer.js";
import { resCronogramaPagamentosOrchestrator } from "./jobs/res-cronograma-pagamentos.transformer.js";
import { rgfTransformerOrchestrator } from "./jobs/rgf.transformer.js";
import { rreoTransformerOrchestrator } from "./jobs/rreo.transformer.js";
import { resultadoFiscalTransformerOrchestrator } from "./jobs/series.transformer.js";
import { transferenciaTransformerOrchestrator } from "./jobs/transferencia.transformer.js";

const logger = createLogger(import.meta.url);

export async function silverOrchestrator() {
    const log = logger.forMethod('silverOrchestrator');

    // ==================================================
    // 0. TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS EXTRAÍDOS
    // ==================================================
    log.info(`[INICIANDO TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS]`);
    await enteTransformerOrchestrator();
    await pvlTransformerOrchestrator();
    await cronogramaPagamentosOrchestrator();
    await cronogramaLiberacoesOrchestrator();
    await taxaCambioOrchestrator();
    await resCronogramaPagamentosOrchestrator();
    await cdpOrchestrator();
    await tramitacaoDeferidoOrchestrator();
    await depreciacaoTransformerOrchestrator();
    await custoPensionistaTransformerOrchestrator();
    await custoAtivoTransformerOrchestrator();
    await custoInativoTransformerOrchestrator();
    await transferenciaTransformerOrchestrator();
    await demaisCustosTransformerOrchestrator();
    await resultadoFiscalTransformerOrchestrator();
    await rreoTransformerOrchestrator();
    await rgfTransformerOrchestrator();
    await dcaTransformerOrchestrator();
    await mscPatrimonialTransformerOrchestrator();
    await mscOrcamentariaTransformerOrchestrator();
    await mscControleTransformerOrchestrator();
    await extratoEntregasTransformerOrchestrator();
    await anexosRelatoriosTransformerOrchestrator();

    log.info(`[TRANSFORMAÇÃO E PERSISTÊNCIA DE DADOS FINALIZADA]`);
    return;
}