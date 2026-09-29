import type { NewCronogramaPagamentos } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";
import { loadCPRawResponse } from "./loader.js";
import { persistNewCPs } from "./repository.js";
import { transformRawCPs } from "./transformer.js";

const logger = createLogger(import.meta.url);
var context: string;

/**
 * Orquestrador da lógica de ETL do Cronograma de Pagamentos
 * @returns 
 */
export async function cronogramaPagamentosJobOrchestrator() {
    context = 'cronogramaPagamentosJobOrchestrator';

    const rawData: any[] | null = await loadCPRawResponse();
    if (!rawData || rawData.length === 0) {
        logger.error({ context: context, data: JSON.stringify(rawData, null, 4) ?? rawData }, `[ERRO] Dados brutos do endpoint nulos ou vazio.`);
        return;
    }

    const newData: NewCronogramaPagamentos[] | null = await transformRawCPs(rawData);
    if (!newData || newData.length === 0) {
        logger.error({ context: context, data: JSON.stringify(newData, null, 4) ?? newData }, `[ERRO] Novos objetos gerados nulos ou vazios.`);
        return;
    }

    await persistNewCPs(newData);
}