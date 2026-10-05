import { db } from "../../../database/dbConnection.js";
import { Resultado_Primario, rawDs2CustosTtTransferencias } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

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
        await db
            .insert(Resultado_Primario)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}