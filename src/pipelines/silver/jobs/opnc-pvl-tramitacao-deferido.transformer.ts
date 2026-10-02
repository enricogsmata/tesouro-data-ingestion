import { db } from "../../../database/dbConnection.js";
import { Operacoes_Nao_Contratadas, rawDs1PvlTramitacaoDeferido } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";

type RawDeferido = typeof rawDs1PvlTramitacaoDeferido.$inferSelect;
type NewDeferido = typeof Operacoes_Nao_Contratadas.$inferInsert;

const logger = createLogger(import.meta.url);

export async function tramitacaoDeferidoOrchestrator() {
    const log = logger.forMethod('tramitacaoDeferidoOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawDeferido[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewDeferido[] = await transform(raw);
            if (transformed.length > 0) await save(transformed);
            else log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Dados tratados inválidos!`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawDeferido[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawDeferido[] = await db
            .select()
            .from(rawDs1PvlTramitacaoDeferido)
            .offset(index * 1000)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no carregamento de dados brutos`);
        return [];
    }
}

async function transform(raw: RawDeferido[]): Promise<NewDeferido[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewDeferido[] = [];
        for (const item of raw) {
            const newDeferido: NewDeferido = {
                id_pleito: item.id_pleito,
                id_pleito_nao_contratado: item.pleito_nao_contratado,
            }

            transformed.push(newDeferido);
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewDeferido[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Operacoes_Nao_Contratadas)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}