import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtTransferencias } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Resultado_Primario } from "../../../database/silver_schema.js";

type RawTransferencia = typeof rawDs2CustosTtTransferencias.$inferSelect;
type NewResultadoPrimario = typeof Resultado_Primario.$inferInsert;

const logger = createLogger(import.meta.url);

export async function resultadoPrimarioTransformerOrchestrator(raw: RawTransferencia) {
    const log = logger.forMethod('resultadoPrimarioTransformerOrchestrator');
    try {
        const transformed: NewResultadoPrimario | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawTransferencia): NewResultadoPrimario | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.co_resultado_eof) return null;

        return {
            co_resultado_eof: Number(item.co_resultado_eof),
            ds_resultado_eof: item.ds_resultado_eof,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewResultadoPrimario) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Resultado_Primario)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}