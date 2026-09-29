import { createLogger } from "../../../../services/logs.js";
import { loadRawCLs } from "./loader.js";
import { persistNewCLs } from "./repository.js";
import { buildCLEntities } from "./transformer.js";

const logger = createLogger(import.meta.url);
var context: string;

/**
 * Orquestrador principal da lógica de ETL do Cronograma de Liberações
 * @returns 
 */
export async function cronogramaLiberacoesJobOrchestrator() {
    context = 'cronogramaLiberacoesJobOrchestrator';

    const rawData = await loadRawCLs();
    if (!rawData || rawData.length === 0) {
        logger.error({ context: context, data: JSON.stringify(rawData, null, 4) ?? rawData }, `[ERRO] Dados brutos nulos ou vazios.`);
        return;
    }

    const newCLs = await buildCLEntities(rawData);
    if (!newCLs || newCLs.length === 0) {
        logger.error({ context: context, data: JSON.stringify(newCLs, null, 4) ?? newCLs }, `[ERRO] Novas entidades nulas ou vazias.`);
        return;
    }

    await persistNewCLs(newCLs);
}