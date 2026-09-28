import type { NewPvl } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";
import { getPvlRawResponse } from "./loader.js";
import { persistNewPvls } from "./repository.js";
import { buildPvlEntities, type RawPvl } from "./transformer.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function pvlOrchestrator() {
    context = 'pvlOrchestrator';

    const rawPvls: RawPvl[] | undefined = await getPvlRawResponse();
    if (!rawPvls || rawPvls.length === 0) {
        logger.error({context: context, data: JSON.stringify(rawPvls, null, 4) ?? rawPvls}, `[ERRO] Dados brutos inválidos.`);
        return;
    }

    const newPvls: NewPvl[] | null = await buildPvlEntities(rawPvls);
    if (!newPvls || newPvls.length === 0) {
        logger.error({context: context, data: JSON.stringify(newPvls, null, 4) ?? rawPvls}, `[ERRO] Novos pvls não foram construídos corretamente.`);
        return;
    }

    if (newPvls && newPvls.length > 0)
        await persistNewPvls(newPvls);
    else {
        logger.error({context: context, data: JSON.stringify(newPvls, null, 4) ?? rawPvls}, `[ERRO] Não foi possível persistir os novos pvls gerados`);
        return;
    }
}