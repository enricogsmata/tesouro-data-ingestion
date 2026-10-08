import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1ResCronogramaPagamentos } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Resumo_Cronograma_Pagamentos } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawResCronogramaPagamentos = typeof rawDs1ResCronogramaPagamentos.$inferSelect;
type NewResCronogramaPagamentos = typeof Resumo_Cronograma_Pagamentos.$inferInsert;

const logger = createLogger(import.meta.url);

export async function resCronogramaPagamentosOrchestrator() {
    const log = logger.forMethod('cronogramaPagamentosOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawResCronogramaPagamentos[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewResCronogramaPagamentos[] = await transform(raw);

            if (transformed.length > 0) {
                await save(transformed);
            } else {
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Falha no orquestrador.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, 'Falha no orquestrador.');
    }
}

async function load(index: number): Promise<RawResCronogramaPagamentos[]> {
    const log = logger.forMethod(`load`);

    try {
        const raw: RawResCronogramaPagamentos[] = await bronzeDB
            .select()
            .from(rawDs1ResCronogramaPagamentos)
            .offset(index * 1000)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(raw: RawResCronogramaPagamentos[]): Promise<NewResCronogramaPagamentos[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewResCronogramaPagamentos[] = [];
        for (const item of raw) {
            const demaisOperacoes = Number(item.demais_operacoes) ?? null;
            const operacaoPleiteada = Number(item.operacao_pleiteada) ?? null;

            if (demaisOperacoes && operacaoPleiteada) {
                const newResCronogramaPagamentos: NewResCronogramaPagamentos = {
                    id_pleito: item.id_pleito,
                    demais_operacoes: demaisOperacoes,
                    ano: item.ano,
                    operacao_pleiteada: operacaoPleiteada,
                }

                transformed.push(newResCronogramaPagamentos);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewResCronogramaPagamentos[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Resumo_Cronograma_Pagamentos)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    ano: sql`values(${Resumo_Cronograma_Pagamentos.ano})`,
                    demais_operacoes: sql`values(${Resumo_Cronograma_Pagamentos.demais_operacoes})`,
                    id_pleito: sql`values(${Resumo_Cronograma_Pagamentos.id_pleito})`,
                    operacao_pleiteada: sql`values(${Resumo_Cronograma_Pagamentos.operacao_pleiteada})`,
                }
            })
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}