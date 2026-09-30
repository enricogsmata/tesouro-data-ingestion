import { sql } from "drizzle-orm";
import { db } from "../../../../../../database/dbConnection.js";
import { faixaEtaria } from "../../../../../../database/schema.js";
import type { NewFaixaEtaria } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewFaixaEtaria(newFaixaEtaria: NewFaixaEtaria) {
    const log = logger.forMethod('persistNewFaixaEtaria');

    try {
        await db
            .insert(faixaEtaria)
            .values(newFaixaEtaria)
            .onDuplicateKeyUpdate({
                set: { inFaixaEtaria: sql`in_faixa_etaria` }
            })
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `[FATAL] Falha na persistência: Faixa Etária`);
    }
}