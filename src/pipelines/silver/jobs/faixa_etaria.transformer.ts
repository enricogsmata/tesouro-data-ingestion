import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalAtivo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Faixa_Etaria } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewFaixaEtaria = typeof Faixa_Etaria.$inferInsert;

const logger = createLogger(import.meta.url);

export async function faixaEtariaTransformerOrchestrator(raw: RawCustoAtivo) {
    const log = logger.forMethod('faixaEtariaTransformerOrchestrator');
    try {
        const transformed: NewFaixaEtaria | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de faixa etária.`);
    }
}

function transform(item: RawCustoAtivo): NewFaixaEtaria | null {
    const log = logger.forMethod('transform');
    try {
        if (item.in_faixa_etaria === null || item.in_faixa_etaria === undefined || item.in_faixa_etaria === '') return null;

        const cod = Number(item.in_faixa_etaria);
        if (isNaN(cod)) return null;

        return {
            in_faixa_etaria: cod,
            ds_faixa_etaria: item.ds_faixa_etaria ? String(item.ds_faixa_etaria).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de faixa etária.`);
        return null;
    }
}

async function save(transformed: NewFaixaEtaria) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Faixa_Etaria)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    ds_faixa_etaria: sql`COALESCE(values(${Faixa_Etaria.ds_faixa_etaria}), ${Faixa_Etaria.ds_faixa_etaria})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de faixa etária.`);
    }
}