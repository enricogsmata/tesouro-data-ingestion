
import { eq } from "drizzle-orm";
import { silverDB } from "../../../database/dbConnection.js";
import { Credor } from "../../../database/silver_schema.js";
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
    // Tenta inserir
    const [inserted] = await silverDB
        .insert(Credor)
        .ignore()
        .values(rawCredor)
        .$returningId();

    if (inserted?.id_credor) {
        return inserted.id_credor;
    }

    const [existing] = await silverDB
        .select({ id_credor: Credor.id_credor })
        .from(Credor)
        .where(eq(Credor.credor, rawCredor.credor!));

    return existing?.id_credor ?? null;
}