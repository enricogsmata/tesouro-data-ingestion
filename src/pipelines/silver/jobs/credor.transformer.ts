import { sql } from "drizzle-orm";
import { db } from "../../../database/dbConnection.js";
import { Credor } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type NewCredor = typeof Credor.$inferInsert;
const logger = createLogger(import.meta.url);

export async function credorTransformerOrchestrator(raw: any): Promise<number | null> {
    const log = logger.forMethod('credorTransformerOrchestrator');

    try {
        const rawCredor: NewCredor = {
            credor: raw.credor,
            tipo: raw.tipo_credor,
        }

        return save(rawCredor);
    } catch (error: any) {
        log.fatal(`Falha na persistência.`);
        return null;
    }
}

async function save(rawCredor: NewCredor): Promise<number | null> {
    const [inserted] = await db
    .insert(Credor)
    .ignore()
    .values(rawCredor)
    .$returningId();
    return inserted?.id_credor ?? null;
}