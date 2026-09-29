import { pvlJobOrchestrator } from "./jobs/SADIPEM API/pvl/orchestrator.js";
import { cronogramaLiberacoesJobOrchestrator } from "./jobs/SADIPEM API/cronograma-liberacoes/orchestrator.js";
import { cronogramaPagamentosJobOrchestrator } from "./jobs/SADIPEM API/cronograma_pagamentos/orchestrator.js";
import { cambioJobOrchestrator } from "./jobs/SADIPEM API/taxa-cambio/orchestrator.js";
import { rcpJobOrchestrator } from "./jobs/SADIPEM API/res_cronograma_pagamentos/orchestrator.js";
import { cdpJobOrchestrator } from "./jobs/SADIPEM API/res-cdp/orchestrator.js";

/**
 * Orquestrador dos jobs de transformação de cada endpoint bruto em dados tratados,
 */
export async function jobsOrchestrator() {
    await pvlJobOrchestrator();
    // await cronogramaPagamentosJobOrchestrator();
    // await cronogramaLiberacoesJobOrchestrator();
    // await cambioJobOrchestrator();
    // await rcpJobOrchestrator();
    // await cdpJobOrchestrator();
}

await jobsOrchestrator();