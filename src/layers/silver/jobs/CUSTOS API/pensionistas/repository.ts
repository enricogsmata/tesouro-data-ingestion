import { sql } from "drizzle-orm";
import { db } from "../../../../../database/dbConnection.js";
import { custoAtivo } from "../../../../../database/schema.js";
import type { NewCustoAtivo } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewCustoAtivo(newCustoAtivo: NewCustoAtivo[]) {
    const log = logger.forMethod('persistNewCustoAtivo');

    try {
        await db.insert(custoAtivo).values(newCustoAtivo).onDuplicateKeyUpdate({ set: { codCustoAtivo: sql`cod_custo_ativo` } });
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `[FATAL] Falha na persistência: Custo Ativo`);
    }
}