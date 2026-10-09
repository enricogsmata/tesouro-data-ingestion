import { createLogger } from "../../../services/logs.js";
import type { RawDepreciacao } from "./depreciacao.transformer.js";
import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Natureza_Juridica } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawNaturezaJuridica = typeof Natureza_Juridica.$inferInsert;

const logger = createLogger(import.meta.url);

export async function naturezaJuridicaTransformerOrchestrator(raw: RawDepreciacao) {
    const log = logger.forMethod('naturezaJuridicaTransformerOrchestrator');
    try {
        const transformed: RawNaturezaJuridica | null = transform(raw);

        if (!transformed) {
            return; // Se não houver código de natureza jurídica, encerra silenciosamente
        }

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de natureza jurídica.`);
    }
}

function transform(item: RawDepreciacao): RawNaturezaJuridica | null {
    const log = logger.forMethod('transform');
    try {
        // Validação de existência do código para evitar o operador '!'
        if (!item.co_natureza_juridica && item.co_natureza_juridica !== 0) {
            return null;
        }

        return {
            co_natureza_juridica: Number(item.co_natureza_juridica),
            ds_natureza_juridica: item.ds_natureza_juridica ? String(item.ds_natureza_juridica).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de natureza jurídica.`);
        return null;
    }
}

async function save(transformed: RawNaturezaJuridica) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Natureza_Juridica)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    ds_natureza_juridica: sql`COALESCE(values(${Natureza_Juridica.ds_natureza_juridica}), ${Natureza_Juridica.ds_natureza_juridica})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de natureza jurídica.`);
        throw error;
    }
}