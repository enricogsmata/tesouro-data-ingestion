import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtRreo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Rotulo } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewRotulo = typeof Rotulo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function rotuloTransformerOrchestrator(raw: RawRreo, idAnexo: number) {
    const log = logger.forMethod('rotuloTransformerOrchestrator');
    try {
        const transformed = transform(raw, idAnexo);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo, idAnexo: number): NewRotulo | null {
    const log = logger.forMethod('transform');
    try {
        if (item.rotulo == null || idAnexo == null) return null;
        return {
            rotulo: item.rotulo,
            id_anexo: idAnexo,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewRotulo) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Rotulo)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    id_anexo: sql`VALUES(id_anexo)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}