import { sql } from "drizzle-orm";
import { db } from "../../../../../database/dbConnection.js";
import { pvl } from "../../../../../database/schema.js";
import type { NewPvl } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function persistNewPvls(newPvls: NewPvl[]) {
    context = 'persistNewPvls';
    try {
        if (newPvls.length > 0) {
            await db
                .insert(pvl)
                .values(newPvls)
                .onDuplicateKeyUpdate({
                    set: {
                        idPleito: sql`id_pleito`,
                    },
                })
        }
    } catch (error) {
        logger.error({ context: context, data: `ERRO: ${error}` }, `[ERRO] Falha ao persistir novos objetos no banco de dados.`);
    }
}