import { db } from "../../../database/dbConnection.js";
import { Coluna, rawDs4SiconfiTtRreo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewColuna = typeof Coluna.$inferInsert;

const logger = createLogger(import.meta.url);

export async function colunaTransformerOrchestrator(raw: RawRreo) {
    const log = logger.forMethod('colunaTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo): NewColuna | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.coluna || !item.rotulo) return null;
        return {
            coluna: item.coluna,
            rotulo: item.rotulo,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewColuna) {
    const log = logger.forMethod('save');
    try {
        await db.insert(Coluna).ignore().values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}