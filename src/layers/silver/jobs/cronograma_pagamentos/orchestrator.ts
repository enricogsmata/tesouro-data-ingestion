import type { NewCronogramaPagamentos } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";
import { getCronogramaPagamentosRawResponse } from "./loader.js";
import { persistNewCronogramaPagamentos } from "./repository.js";
import { buildCronogramaPagamentosEntities } from "./transformer.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function cronogramaPagamentosOrchestrator() {
    context = 'cronogramaPagamentosOrchestrator';

    const rawData: any[] | null = await getCronogramaPagamentosRawResponse();
    if (!rawData || rawData.length === 0) {
        logger.error({ context: context, data: JSON.stringify(rawData, null, 4) ?? rawData }, `[ERRO] Dados brutos do endpoint nulos ou vazio.`);
        return;
    }

    const newData: NewCronogramaPagamentos[] | null = await buildCronogramaPagamentosEntities(rawData);
    if (!newData || newData.length === 0) {
        logger.error({ context: context, data: JSON.stringify(newData, null, 4) ?? newData }, `[ERRO] Novos objetos gerados nulos ou vazios.`);
        return;
    }

    await persistNewCronogramaPagamentos(newData);
}