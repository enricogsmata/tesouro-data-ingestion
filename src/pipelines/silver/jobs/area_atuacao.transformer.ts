import { silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalAtivo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Area_Atuacao } from "../../../database/silver_schema.js";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewAreaAtuacao = typeof Area_Atuacao.$inferInsert;

const logger = createLogger(import.meta.url);

export async function areaAtuacaoTransformerOrchestrator(raw: RawCustoAtivo) {
    const log = logger.forMethod('areaAtuacaoTransformerOrchestrator');
    try {
        const transformed: NewAreaAtuacao | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawCustoAtivo): NewAreaAtuacao | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.in_area_atuacao) return null;

        return {
            in_area_atuacao: Number(item.in_area_atuacao),
            ds_area_atuacao: item.ds_area_atuacao,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewAreaAtuacao) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Area_Atuacao)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}