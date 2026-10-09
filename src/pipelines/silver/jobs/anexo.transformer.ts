import { and, eq, isNull, sql } from "drizzle-orm";
import { silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtRreo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Anexo } from "../../../database/silver_schema.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewAnexo = typeof Anexo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function anexoTransformerOrchestrator(raw: RawRreo): Promise<number | null> {
    const log = logger.forMethod('anexoTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return null;

        await save(transformed);

        const conditions = [eq(Anexo.anexo, transformed.anexo!)];

        if (transformed.demonstrativo != null) {
            conditions.push(eq(Anexo.demonstrativo, transformed.demonstrativo));
        } else {
            conditions.push(isNull(Anexo.demonstrativo));
        }

        if (transformed.esfera != null) {
            conditions.push(eq(Anexo.esfera, transformed.esfera));
        } else {
            conditions.push(isNull(Anexo.esfera));
        }

        const result = await silverDB
            .select({ id: Anexo.id_anexo })
            .from(Anexo)
            .where(and(...conditions))
            .limit(1);

        return result[0]?.id ?? null;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(item: RawRreo): NewAnexo | null {
    const log = logger.forMethod('transform');
    try {
        if (item.anexo == null) return null;
        return {
            anexo: item.anexo,
            demonstrativo: item.demonstrativo ?? null,
            esfera: item.esfera ?? null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewAnexo) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Anexo)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    anexo: sql`VALUES(anexo)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}