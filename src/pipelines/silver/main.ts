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

/**
 * Orquestrador da Camada Silver.
 *
 * Responsável por executar sequencialmente os jobs de transformação e carga (ETL/ELT)
 * a partir das tabelas brutas da camada Bronze para o modelo relacional normalizado da Silver.
 *
 * A ordem de execução respeita a integridade referencial:
 * 1. Entidades primárias / Dimensões base (ex: Ente com dados do IBGE, Credor)
 * 2. Operações de crédito e pleitos (PVL)
 * 3. Tabelas filhas e cronogramas (pagamentos, liberações, taxa de câmbio, CDP)
 * 4. Módulos de custos (pessoal ativo, inativo, pensionista, transferências, depreciação)
 * 5. Indicadores fiscais e séries temporais (resultado fiscal)
 * 6. Demonstrativos e Matrizes Contábeis (RREO, RGF, DCA, MSC Patrimonial/Orçamentária/Controle)
 * 7. Metadados e extratos de entregas (Extrato Entregas, Anexos Relatórios)
 */
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