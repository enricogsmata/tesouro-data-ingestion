import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDemais } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Situacao_Contabil_Lancamento } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawDemaisCustos = typeof rawDs2CustosTtDemais.$inferSelect;
type NewSituacaoContabil = typeof Situacao_Contabil_Lancamento.$inferInsert;

const logger = createLogger(import.meta.url);

export async function situacaoContabilTransformerOrchestrator(raw: RawDemaisCustos) {
    const log = logger.forMethod('situacaoContabilTransformerOrchestrator');
    try {
        const transformed: NewSituacaoContabil | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de situação contábil.`);
    }
}

function transform(item: RawDemaisCustos): NewSituacaoContabil | null {
    const log = logger.forMethod('transform');
    try {
        if (item.co_situacao_icc === null || item.co_situacao_icc === undefined || item.co_situacao_icc === '') {
            return null;
        }

        return {
            co_situacao_icc: String(item.co_situacao_icc).trim(),
            no_situacao_icc: item.no_situacao_icc ? String(item.no_situacao_icc).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de situação contábil.`);
        return null;
    }
}

async function save(transformed: NewSituacaoContabil) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Situacao_Contabil_Lancamento)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    no_situacao_icc: sql`COALESCE(values(${Situacao_Contabil_Lancamento.no_situacao_icc}), ${Situacao_Contabil_Lancamento.no_situacao_icc})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de situação contábil.`);
    }
}