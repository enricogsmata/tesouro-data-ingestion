import { db } from "../../../../../database/dbConnection.js";
import { resumoCronogramaPagamentos } from "../../../../../database/schema.js";
import type { NewResumoCronogramaPagamentos } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function persistNewRCPs(newRCPs: NewResumoCronogramaPagamentos[]) {
    context = 'persistNewRCPs';
    try {
        if (newRCPs.length > 0)
            await db.insert(resumoCronogramaPagamentos).values(newRCPs);
    } catch (error: any) {
        logger.fatal({ context: context }, `[FATAL] Falha na persistência de novos objetos no banco de dados.`);
    }
}