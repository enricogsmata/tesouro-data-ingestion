import { db } from "../../../../../database/dbConnection.js";
import { resumoGeral } from "../../../../../database/schema.js";
import type { NewResumoGeral } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewResumoGeral(newResumosGerais: NewResumoGeral[]) {
    const log = logger.forMethod('persistNewResumoGeral');
    try {
        await db.insert(resumoGeral).values(newResumosGerais);
    } catch (error: any) {
        log.fatal(`[FATAL] Falha na persistência: Resumo Geral`);
    }
}