import { silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtRreo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Coluna } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewColuna = typeof Coluna.$inferInsert;

const logger = createLogger(import.meta.url);

export async function colunaTransformerOrchestrator(raw: RawRreo) {
    const log = logger.forMethod('colunaTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo): NewColuna | null {
    const log = logger.forMethod('transform');
    try {
        if (item.coluna == null || item.rotulo == null) return null;
        return {
            coluna: item.coluna,
            rotulo: item.rotulo,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewColuna) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Coluna)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    rotulo: sql`VALUES(rotulo)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}