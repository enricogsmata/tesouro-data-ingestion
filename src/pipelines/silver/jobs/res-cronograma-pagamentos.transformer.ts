import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1ResCronogramaPagamentos, rawDs1SadipemTtPvl } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Resumo_Cronograma_Pagamentos } from "../../../database/silver_schema.js";
import { eq, asc, sql } from "drizzle-orm";

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
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lote sem dados transformados válidos.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, 'Falha no orquestrador.');
    }
}

async function load(index: number): Promise<RawResCronogramaPagamentos[]> {
    const log = logger.forMethod(`load`);

    try {
        const queryResult = await bronzeDB
            .select()
            .from(rawDs1ResCronogramaPagamentos)
            // 1. Garante integridade referencial com a tabela pai de PVL
            .innerJoin(
                rawDs1SadipemTtPvl,
                eq(rawDs1ResCronogramaPagamentos.id_pleito, rawDs1SadipemTtPvl.id_pleito)
            )
            // 2. Ordenação estável para cursor
            .orderBy(asc(rawDs1ResCronogramaPagamentos.id))
            // 3. Offset dinâmico multiplicando pelo BATCH_SIZE real
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return queryResult.map(row => row.raw_ds1_res_cronograma_pagamentos);
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
            // Conversão segura testando contra NaN e null em vez de truthy
            const demaisOperacoes = item.demais_operacoes !== null ? Number(item.demais_operacoes) : null;
            const operacaoPleiteada = item.operacao_pleiteada !== null ? Number(item.operacao_pleiteada) : null;

            // Chaves primárias da tabela Silver (id_pleito e ano) precisam existir
            if (item.id_pleito && item.ano) {
                const newResCronogramaPagamentos: NewResCronogramaPagamentos = {
                    id_pleito: item.id_pleito,
                    ano: item.ano,
                    demais_operacoes: demaisOperacoes !== null && !isNaN(demaisOperacoes) ? demaisOperacoes : 0,
                    operacao_pleiteada: operacaoPleiteada !== null && !isNaN(operacaoPleiteada) ? operacaoPleiteada : 0,
                };

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
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}