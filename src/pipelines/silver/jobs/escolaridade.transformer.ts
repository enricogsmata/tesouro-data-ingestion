import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalAtivo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Escolaridade } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewEscolaridade = typeof Escolaridade.$inferInsert;

const logger = createLogger(import.meta.url);

export async function escolaridadeTransformerOrchestrator(raw: RawCustoAtivo) {
    const log = logger.forMethod('escolaridadeTransformerOrchestrator');
    try {
        const transformed: NewEscolaridade | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de escolaridade.`);
    }
}

function transform(item: RawCustoAtivo): NewEscolaridade | null {
    const log = logger.forMethod('transform');
    try {
        if (item.in_escolaridade === null || item.in_escolaridade === undefined || item.in_escolaridade === '') return null;

        const cod = Number(item.in_escolaridade);
        if (isNaN(cod)) return null;

        return {
            in_escolaridade: cod,
            ds_escolaridade: item.ds_escolaridade ? String(item.ds_escolaridade).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de escolaridade.`);
        return null;
    }
}

async function save(transformed: NewEscolaridade) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Escolaridade)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    ds_escolaridade: sql`COALESCE(values(${Escolaridade.ds_escolaridade}), ${Escolaridade.ds_escolaridade})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de escolaridade.`);
    }
}