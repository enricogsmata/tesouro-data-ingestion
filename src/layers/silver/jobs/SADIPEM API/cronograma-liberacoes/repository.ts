import { db } from "../../../../../database/dbConnection.js";
import { cronogramaLiberacoes } from "../../../../../database/schema.js";
import type { NewCronogramaLiberacoes } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function persistNewCLs(newCLs: NewCronogramaLiberacoes[]) {
    try {
        if (newCLs.length > 0) {
            await db.insert(cronogramaLiberacoes).values(newCLs);
        } else {
            logger.error({ context: context }, `[ERRO] Falha ao inserir dados no banco: lista de cronogramas vazia!`);
        }
    } catch (error) {
        logger.error({ context: context, data: JSON.stringify(error, null, 4) ?? error}, `[ERRO] Falha ao inserir dados no banco.`);
    }
}