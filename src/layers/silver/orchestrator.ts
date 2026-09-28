import { cronogramaPagamentosOrchestrator } from "./jobs/cronograma_pagamentos/orchestrator.js";
import { pvlOrchestrator } from "./jobs/pvl/orchestrator.js";


export async function transformEntitiesOrchestrator() {
    await pvlOrchestrator();
    await cronogramaPagamentosOrchestrator();
}