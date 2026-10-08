import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1OpcCronogramaPagamentos } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Cronograma_Pagamentos, PVL } from "../../../database/silver_schema.js";
import { count, sql } from "drizzle-orm";

type RawCronogramaPagamentos = typeof rawDs1OpcCronogramaPagamentos.$inferSelect;
type NewCronogramaPagamentos = typeof Cronograma_Pagamentos.$inferInsert;

const logger = createLogger(import.meta.url);

export async function cronogramaPagamentosOrchestrator() {
    const log = logger.forMethod('cronogramaPagamentosOrchestrator');

    try {
        const validPleitos = await loadValidPleitos();
        let totalLidas = 0, totalSalvas = 0;

        for (let index = 0; ; index++) {
            const raw = await load(index);
            if (raw.length === 0) break;

            const transformed = transform(raw, validPleitos);
            totalLidas += raw.length;

            if (transformed.length > 0) {
                await save(transformed);
                totalSalvas += transformed.length;
            }
        }

        log.info(
            { data: { totalLidas, totalSalvas, descartadas: totalLidas - totalSalvas } },
            `Cronograma de pagamentos finalizado.`
        );
    } catch (error: any) {
        log.fatal({ data: error?.message }, `Falha identificada no orquestrador.`);
    }
}

async function loadValidPleitos(): Promise<Set<number>> {
    const rows = await silverDB.select({ id: PVL.id_pleito }).from(PVL);
    return new Set(rows.map(r => Number(r.id)));
}

async function load(index: number): Promise<RawCronogramaPagamentos[]> {
    const log = logger.forMethod('load');

    try {
        return await bronzeDB
            .select()
            .from(rawDs1OpcCronogramaPagamentos)
            .orderBy(rawDs1OpcCronogramaPagamentos.id_pleito, rawDs1OpcCronogramaPagamentos.ano)
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);
    } catch (error: any) {
        log.fatal({ data: error?.message }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

function transform(raw: RawCronogramaPagamentos[], validPleitos: Set<number>): NewCronogramaPagamentos[] {
    const log = logger.forMethod('transform');
    const transformed: NewCronogramaPagamentos[] = [];
    const orphans = new Set<number>();

    for (const item of raw) {
        const id = Number(item.id_pleito);

        if (!validPleitos.has(id)) {
            orphans.add(id);
            continue;
        }

        transformed.push({
            id_pleito: id,
            ano: item.ano,
            divida_consolidada_amortizacao: item.divida_consolidada_amortizacao,
            divida_consolidada_encargos: item.divida_consolidada_encargos,
            indicador_div_moeda_estrang: item.indicador_div_moeda_estrang,
            indicador_liberacoes: item.indicador_liberacoes,
            operacoes_contratadas_amortizacao: item.operacoes_contratadas_amortizacao,
            operacoes_contratadas_encargos: item.operacoes_contratadas_encargos,
            total_amorizacao: item.total_amorizacao,
            total_encargos: item.total_encargos,
        });
    }

    if (orphans.size > 0)
        log.warn(
            { data: { pleitosOrfaos: orphans.size, amostra: [...orphans].slice(0, 10) } },
            `Linhas descartadas: id_pleito inexistente em PVL.`
        );

    return transformed;
}

async function save(transformed: NewCronogramaPagamentos[]) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Cronograma_Pagamentos)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    divida_consolidada_amortizacao: sql`values(${Cronograma_Pagamentos.divida_consolidada_amortizacao})`,
                    divida_consolidada_encargos: sql`values(${Cronograma_Pagamentos.divida_consolidada_encargos})`,
                    indicador_div_moeda_estrang: sql`values(${Cronograma_Pagamentos.indicador_div_moeda_estrang})`,
                    indicador_liberacoes: sql`values(${Cronograma_Pagamentos.indicador_liberacoes})`,
                    operacoes_contratadas_amortizacao: sql`values(${Cronograma_Pagamentos.operacoes_contratadas_amortizacao})`,
                    operacoes_contratadas_encargos: sql`values(${Cronograma_Pagamentos.operacoes_contratadas_encargos})`,
                    total_amorizacao: sql`values(${Cronograma_Pagamentos.total_amorizacao})`,
                    total_encargos: sql`values(${Cronograma_Pagamentos.total_encargos})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}