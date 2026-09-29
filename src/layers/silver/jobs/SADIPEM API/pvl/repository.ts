import { db } from "../../../../../database/dbConnection.js";
import { pvl } from "../../../../../database/schema.js";
import type { NewPvl } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewPvls(newPvls: NewPvl[]) {
    try {
        if (newPvls.length > 0) {
            await db.insert(pvl).values(newPvls);
        }
    } catch (error) {
        logger.error(`[ERRO] Falha ao persistir novos pvl.`);
    }
}