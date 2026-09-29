import { db } from "../../../../../database/dbConnection.js";
import { cdp } from "../../../../../database/schema.js";
import type { NewCDP } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function persistNewCDPs(newCDPs: NewCDP[]) {
    context = 'persistNewCDPs';
    try {
        if (newCDPs.length > 0)
            await db.insert(cdp).values(newCDPs);
    } catch (error) {
        logger.fatal({ context: context }, `[FATAL] Falha na persistência de objetos no banco de dados.`);
    }
}