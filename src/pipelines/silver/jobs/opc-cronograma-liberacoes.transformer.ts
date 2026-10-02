import { db } from "../../../database/dbConnection.js";
import { Cronograma_Liberacoes, rawDs1OpcCronogramaLiberacoes } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";

type RawCronogramaLiberacoes = typeof rawDs1OpcCronogramaLiberacoes.$inferSelect;
type NewCronogramaLiberacoes = typeof Cronograma_Liberacoes.$inferInsert;

const logger = createLogger(import.meta.url);

export async function cronogramaLiberacoesOrchestrator() {
    const log = logger.forMethod('cronogramaLiberacoesOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawCronogramaLiberacoes[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewCronogramaLiberacoes[] = await transform(raw);

            if (transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Dados tratados inválidos!`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawCronogramaLiberacoes[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawCronogramaLiberacoes[] = await db
            .select()
            .from(rawDs1OpcCronogramaLiberacoes)
            .offset(index * 1000)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(raw: RawCronogramaLiberacoes[]): Promise<NewCronogramaLiberacoes[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewCronogramaLiberacoes[] = [];
        for (const item of raw) {
            const newCronogramaLiberacoes: NewCronogramaLiberacoes = {
                id_pleito: item.id_pleito,
                ano: item.ano,
                indicador_liberacoes: item.indicador_liberacoes,
                liberacoes_aro: item.liberacoes_aro,
                liberacoes_demais: item.liberacoes_demais,
                liberacoes_operacoes_sfn: item.liberacoes_operacoes_sfn,
                liberacoes_total: item.liberacoes_total,
            }

            if (newCronogramaLiberacoes)
                transformed.push(newCronogramaLiberacoes);
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados.`);
        return [];
    }
}

async function save(transformed: NewCronogramaLiberacoes[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Cronograma_Liberacoes)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência dos dados tratados.`);
    }
}