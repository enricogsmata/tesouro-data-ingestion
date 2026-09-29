import { pvlJobOrchestrator } from "./jobs/pvl/orchestrator.js";
import { cronogramaLiberacoesJobOrchestrator } from "./jobs/cronograma-liberacoes/orchestrator.js";
import { cronogramaPagamentosJobOrchestrator } from "./jobs/cronograma_pagamentos/orchestrator.js";

/**
 * Orquestrador dos jobs de transformação de cada endpoint bruto em dados tratados,
 */
export async function transformEntitiesOrchestrator() {
    await pvlJobOrchestrator();
    await cronogramaPagamentosJobOrchestrator();
    await cronogramaLiberacoesJobOrchestrator();
}