import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalAtivo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Sexo } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewSexo = typeof Sexo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function sexoTransformerOrchestrator(raw: RawCustoAtivo) {
    const log = logger.forMethod('sexoTransformerOrchestrator');
    try {
        const transformed: NewSexo | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de sexo.`);
    }
}

function transform(item: RawCustoAtivo): NewSexo | null {
    const log = logger.forMethod('transform');
    try {
        if (item.in_sexo === null || item.in_sexo === undefined || item.in_sexo === '') return null;

        const cleanSexo = String(item.in_sexo).trim();

        return {
            in_sexo: cleanSexo.charAt(0), // Garante no máximo 1 caractere exigido pelo char(1)
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de sexo.`);
        return null;
    }
}

async function save(transformed: NewSexo) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Sexo)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    in_sexo: sql`values(${Sexo.in_sexo})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de sexo.`);
    }
}