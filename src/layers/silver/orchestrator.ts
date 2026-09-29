import { pvlOrchestrator } from "./jobs/pvl/orchestrator.js";
import { cronogramaLiberacoesOrchestrator } from "./jobs/cronograma-liberacoes/orchestrator.js";
import { cronogramaPagamentosOrchestrator } from "./jobs/cronograma_pagamentos/orchestrator.js";

/**
 * Orquestrador dos jobs de transformação de cada endpoint bruto em dados tratados,
 */
export async function transformEntitiesOrchestrator() {
    await pvlOrchestrator();
    await cronogramaPagamentosOrchestrator();
    await cronogramaLiberacoesOrchestrator();
}