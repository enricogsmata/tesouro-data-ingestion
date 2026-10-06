import { db } from "../../../database/dbConnection.js";
import { Instituição, rawDs4SiconfiTtRreo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewInstituicao = typeof Instituição.$inferInsert;

const logger = createLogger(import.meta.url);

export async function instituicaoTransformerOrchestrator(raw: RawRreo) {
    const log = logger.forMethod('instituicaoTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo): NewInstituicao | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.instituicao || !item.cod_ibge) return null;
        return {
            instituicao: item.instituicao,
            co_poder: null,
            cod_ibge: item.cod_ibge,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewInstituicao) {
    const log = logger.forMethod('save');
    try {
        await db.insert(Instituição).ignore().values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}