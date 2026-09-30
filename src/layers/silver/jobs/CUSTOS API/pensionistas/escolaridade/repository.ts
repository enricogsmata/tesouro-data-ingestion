import { sql } from "drizzle-orm";
import { db } from "../../../../../../database/dbConnection.js";
import { escolaridade } from "../../../../../../database/schema.js";
import type { NewEscolaridade } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewEscolaridade(newEscolaridade: NewEscolaridade) {
    const log = logger.forMethod(`persistNewEscolaridade`);
    try {
        await db
            .insert(escolaridade)
            .values(newEscolaridade).onDuplicateKeyUpdate({
                set: { inEscolaridade: sql`in_escolaridade` }
            });
    } catch (erro: any) {
        log.fatal({ data: JSON.stringify(erro, null, 4) }, `[FATAL] Falha na persistência: Escolaridade`);
    }
}