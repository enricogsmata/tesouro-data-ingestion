import { sql } from "drizzle-orm";
import { db } from "../../../../../../database/dbConnection.js";
import { sexo } from "../../../../../../database/schema.js";
import type { NewSexo } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewSexo(newSexo: NewSexo) {
    const log = logger.forMethod('persistNewSexo');

    try {
        await db
            .insert(sexo)
            .values(newSexo)
            .onDuplicateKeyUpdate({
                set: { inSexo: sql`in_sexo` }
            })
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `[FATAL] Falha na persistência: Sexo.`);
    }
}