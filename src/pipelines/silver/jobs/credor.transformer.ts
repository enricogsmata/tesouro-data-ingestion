import { db } from "../../../database/dbConnection.js";
import { credor } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type NewCredor = typeof credor.$inferInsert;
const logger = createLogger(import.meta.url);

export async function credorTransformerOrchestrator(raw: any): Promise<number | null> {
    const log = logger.forMethod('credorTransformerOrchestrator');

    try {
        const rawCredor: NewCredor = {
            credor: raw.credor,
            tipo: raw.tipo_credor,
            createdAt: new Date(),
        }

        return save(rawCredor);
    } catch (error: any) {
        log.fatal(`Falha na persistência.`);
        return null;
    }
}

async function save(rawCredor: NewCredor): Promise<number | null> {
    const [inserted] = await db.insert(credor).values(rawCredor).$returningId();
    return inserted?.idCredor ?? null;
}