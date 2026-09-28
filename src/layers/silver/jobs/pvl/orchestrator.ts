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
    if (!rawPvls) {
        logger.error({context: context}, `[ERRO] Dados brutos inválidos.`);
        return;
    }

    const newPvls: NewPvl[] | null = await buildPvlEntities(rawPvls);
    if (!newPvls) {
        logger.error({context: context}, `[ERRO] Novos pvls não foram construídos corretamente.`);
        return;
    }

    if (newPvls && newPvls.length > 0)
        await persistNewPvls(newPvls);
    else {
        logger.error({context: context}, `[ERRO] Não foi possível persistir os novos pvls gerados`);
        return;
    }
}