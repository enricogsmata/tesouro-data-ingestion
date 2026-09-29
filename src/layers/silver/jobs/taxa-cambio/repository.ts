import { db } from "../../../../database/dbConnection.js";
import { cambio } from "../../../../database/schema.js";
import type { NewCambio } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

async function persistNewCambios(newCambios: NewCambio[]) {
    context = 'persistNewCambios';
    try {
        if (newCambios.length > 0) {
            await db.insert(cambio).values(newCambios);
        }
    } catch (error: any) {
        logger.fatal({ context: context }, `[FATAL] Falha ao persistir novas entidades de "cambio"`);
    }
}