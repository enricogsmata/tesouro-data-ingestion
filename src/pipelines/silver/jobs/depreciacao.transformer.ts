import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDepreciacao } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { contaContabilTransformerOrchestrator } from "./conta-contabil.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { organizacaoTransformerOrchestrator, type Organizacoes } from "./organizacao.transformer.js";
import { Custo_Depreciacao } from "../../../database/silver_schema.js";
import { asc, sql } from "drizzle-orm";

export type RawDepreciacao = typeof rawDs2CustosTtDepreciacao.$inferSelect;
type NewCustoDepreciacao = typeof Custo_Depreciacao.$inferInsert;

const logger = createLogger(import.meta.url);

export async function depreciacaoTransformerOrchestrator() {
    const log = logger.forMethod('depreciacaoOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawDepreciacao[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewCustoDepreciacao[] = await transform(raw);
            if (transformed.length > 0) await save(transformed);
            else log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lote sem dados tratados válidos.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawDepreciacao[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawDepreciacao[] = await bronzeDB
            .select()
            .from(rawDs2CustosTtDepreciacao)
            .orderBy(asc(rawDs2CustosTtDepreciacao.id))
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no carregamento de dados brutos.`);
        return [];
    }
}

async function transform(raw: RawDepreciacao[]): Promise<NewCustoDepreciacao[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewCustoDepreciacao[] = [];

        for (const item of raw) {
            await naturezaJuridicaTransformerOrchestrator(item);

            const organizacoes: Organizacoes | null = await organizacaoTransformerOrchestrator(item);

            const codContaContabil: number | null = await contaContabilTransformerOrchestrator(item);

            if (organizacoes && codContaContabil) {
                const newCustoDepreciacao: NewCustoDepreciacao = {
                    an_lanc: String(item.an_lanc),
                    me_lanc: String(item.me_lanc),
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1 ?? Number(item.co_organizacao_n1),
                    co_organizacao_n2: organizacoes.organizacao_n2 ?? Number(item.co_organizacao_n2),
                    co_organizacao_n3: organizacoes.organizacao_n3 ?? Number(item.co_organizacao_n3),
                    cod_conta_contabil: codContaContabil,
                    va_custo_depreciacao: item.va_custo_depreciacao,
                };

                transformed.push(newCustoDepreciacao);
            } else {
                log.error({ data: JSON.stringify(item, null, 4) }, `Organizações ou Conta Contábil não puderam ser resolvidas.`);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewCustoDepreciacao[]) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Custo_Depreciacao)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    co_organizacao_n0: sql`values(${Custo_Depreciacao.co_organizacao_n0})`,
                    co_organizacao_n1: sql`values(${Custo_Depreciacao.co_organizacao_n1})`,
                    co_organizacao_n2: sql`values(${Custo_Depreciacao.co_organizacao_n2})`,
                    co_organizacao_n3: sql`values(${Custo_Depreciacao.co_organizacao_n3})`,
                    cod_conta_contabil: sql`values(${Custo_Depreciacao.cod_conta_contabil})`,
                    an_lanc: sql`values(${Custo_Depreciacao.an_lanc})`,
                    me_lanc: sql`values(${Custo_Depreciacao.me_lanc})`,
                    va_custo_depreciacao: sql`values(${Custo_Depreciacao.va_custo_depreciacao})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de depreciação.`);
    }
}