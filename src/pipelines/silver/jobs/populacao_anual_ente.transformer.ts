import { db } from "../../../database/dbConnection.js";
import { Populacao_Anual_Ente, rawDs4SiconfiTtRreo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewPopulacao = typeof Populacao_Anual_Ente.$inferInsert;

const logger = createLogger(import.meta.url);

export async function populacaoAnualEnteTransformerOrchestrator(raw: RawRreo) {
    const log = logger.forMethod('populacaoAnualEnteTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo): NewPopulacao | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.cod_ibge || !item.exercicio || item.populacao === null) return null;
        return {
            cod_ibge: item.cod_ibge,
            ano_exercicio: item.exercicio,
            populacao: item.populacao,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewPopulacao) {
    const log = logger.forMethod('save');
    try {
        await db.insert(Populacao_Anual_Ente).ignore().values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}