import { db } from "../../../../../database/dbConnection.js";
import { depreciacao } from "../../../../../database/schema.js";
import type { NewDepreciacao } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewDepreciacao(newDepreciacoes: NewDepreciacao[]) {
    const log = logger.forMethod('persistNewDepreciacao');
    try {
        await db.insert(depreciacao).values(newDepreciacoes);
    } catch (error: any) {
        log.fatal(`[FATAL] Falha na persistência: Depreciação.`);
    }
}