import { pvlOrchestrator } from "./jobs/pvl/orchestrator.js";


export async function transformEntitiesOrchestrator() {
    await pvlOrchestrator();
}