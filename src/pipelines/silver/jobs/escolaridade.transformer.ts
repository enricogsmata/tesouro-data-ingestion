import { db } from "../../../database/dbConnection.js";
import { Escolaridade, rawDs2CustosTtPessoalAtivo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

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
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawCustoAtivo): NewEscolaridade | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.in_escolaridade) return null;

        return {
            in_escolaridade: Number(item.in_escolaridade),
            ds_escolaridade: item.ds_escolaridade,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewEscolaridade) {
    const log = logger.forMethod('save');
    try {
        await db
            .insert(Escolaridade)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}