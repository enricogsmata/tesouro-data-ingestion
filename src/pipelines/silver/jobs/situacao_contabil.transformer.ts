import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDemais } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Situacao_Contabil_Lancamento } from "../../../database/silver_schema.js";

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
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawDemaisCustos): NewSituacaoContabil | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.co_situacao_icc) return null;

        return {
            co_situacao_icc: item.co_situacao_icc,
            no_situacao_icc: item.no_situacao_icc,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewSituacaoContabil) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Situacao_Contabil_Lancamento)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}