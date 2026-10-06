import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../database/dbConnection.js";
import { Anexo, rawDs4SiconfiTtRreo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewAnexo = typeof Anexo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function anexoTransformerOrchestrator(raw: any): Promise<number | null> {
    const log = logger.forMethod('anexoTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return null;

        await save(transformed);

        const conditions = [eq(Anexo.anexo, transformed.anexo!)];

        if (transformed.demonstrativo !== null && transformed.demonstrativo !== undefined) {
            conditions.push(eq(Anexo.demonstrativo, transformed.demonstrativo!));
        } else {
            conditions.push(isNull(Anexo.demonstrativo));
        }

        if (transformed.esfera !== null && transformed.esfera !== undefined) {
            conditions.push(eq(Anexo.esfera, transformed.esfera!));
        } else {
            conditions.push(isNull(Anexo.esfera));
        }

        const result = await db.select({ id: Anexo.id_anexo })
            .from(Anexo)
            .where(and(...conditions as any))
            .limit(1);

        return result[0]?.id ?? null;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(item: any): NewAnexo | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.anexo) return null;
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
        await db.insert(Anexo).ignore().values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}