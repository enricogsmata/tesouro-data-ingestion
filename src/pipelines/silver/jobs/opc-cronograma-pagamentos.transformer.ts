import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1OpcCronogramaPagamentos } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Cronograma_Pagamentos } from "../../../database/silver_schema.js";

type RawCronogramaPagamentos = typeof rawDs1OpcCronogramaPagamentos.$inferSelect;
type NewCronogramaPagamentos = typeof Cronograma_Pagamentos.$inferInsert;

const logger = createLogger(import.meta.url);

export async function cronogramaPagamentosOrchestrator() {
    const log = logger.forMethod('cronogramaPagamentosOrchestrator');
    try {
        for (let index = 0; ; index++) {
            const raw: RawCronogramaPagamentos[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewCronogramaPagamentos[] = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha identificada no orquestrador.`);
    }
}

async function load(index: number): Promise<RawCronogramaPagamentos[]> {
    const log = logger.forMethod(`load`);

    try {
        const raw: RawCronogramaPagamentos[] = await bronzeDB.select().from(rawDs1OpcCronogramaPagamentos).offset(index * 1000).limit(BATCH_SIZE);
        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(raw: RawCronogramaPagamentos[]): Promise<NewCronogramaPagamentos[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewCronogramaPagamentos[] = [];

        for (const item of raw) {
            const newCronogramaPagamentos: NewCronogramaPagamentos = {
                id_pleito: item.id_pleito,
                ano: item.ano,
                divida_consolidada_amortizacao: item.divida_consolidada_amortizacao,
                divida_consolidada_encargos: item.divida_consolidada_encargos,
                indicador_div_moeda_estrang: item.indicador_div_moeda_estrang,
                indicador_liberacoes: item.indicador_liberacoes,
                operacoes_contratadas_amortizacao: item.operacoes_contratadas_amortizacao,
                operacoes_contratadas_encargos: item.operacoes_contratadas_encargos,
                total_amorizacao: item.total_amorizacao,
                total_encargos: item.total_encargos,
            }

            if (newCronogramaPagamentos)
                transformed.push(newCronogramaPagamentos);
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return [];
    }
}

async function save(transformed: NewCronogramaPagamentos[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Cronograma_Pagamentos)
            .ignore()
            .values(transformed)
            
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}