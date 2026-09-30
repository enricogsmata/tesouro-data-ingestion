import { db } from "../../../../../../database/dbConnection.js";
import { operacoesNaoContratadas } from "../../../../../../database/schema.js";
import type { NewOperacoesNaoContratadas } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewOnc(newOnc: NewOperacoesNaoContratadas) {
    const log = logger.forMethod('persistNewOnc');
    try {
        await db.insert(operacoesNaoContratadas).values(newOnc);
    } catch (error: any) {
        log.fatal(`[FATAL] Falha na persistência: Operações Não Contratadas`);
    }
}