import { db } from "../../../../../../database/dbConnection.js"
import { contaContabil } from "../../../../../../database/schema.js"
import type { NewContaContabil } from "../../../../../../database/types.js"
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewContaContabil(newContaContabil: NewContaContabil): Promise<any | null> {
    const log = logger.forMethod('persistNewContaContabil');
    try {
        const [insertedCC] = await db.insert(contaContabil).values(newContaContabil);
        return insertedCC.insertId ?? null;
    } catch (error: any) {
        log.fatal(`[FATAL] Falha na persistência de nova conta contábil.`);
        return null;
    }
}