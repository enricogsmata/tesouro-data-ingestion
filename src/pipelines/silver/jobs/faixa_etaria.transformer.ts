import { db } from "../../../database/dbConnection.js";
import { Faixa_Etaria, rawDs2CustosTtPessoalAtivo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

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
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawCustoAtivo): NewFaixaEtaria | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.in_faixa_etaria) return null;

        return {
            in_faixa_etaria: Number(item.in_faixa_etaria),
            ds_faixa_etaria: item.ds_faixa_etaria,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewFaixaEtaria) {
    const log = logger.forMethod('save');
    try {
        await db
            .insert(Faixa_Etaria)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}