import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPensionistas } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { Custo_Pensionista } from "../../../database/silver_schema.js";
import { asc, sql } from "drizzle-orm";

type RawPensionista = typeof rawDs2CustosTtPensionistas.$inferSelect;
type NewPensionista = typeof Custo_Pensionista.$inferInsert;

const logger = createLogger(import.meta.url);

export async function custoPensionistaTransformerOrchestrator() {
    const log = logger.forMethod('custoPensionistaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawPensionista[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewPensionista[] = await transform(raw);

            if (transformed.length > 0) {
                await save(transformed);
            } else {
                log.error({ data: JSON.stringify(transformed, null, 4) }, `Lote sem dados tratados válidos.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawPensionista[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawPensionista[] = await bronzeDB
            .select()
            .from(rawDs2CustosTtPensionistas)
            // 1. Ordenação obrigatória para estabilidade do offset
            .orderBy(asc(rawDs2CustosTtPensionistas.id))
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawPensionista[]): Promise<NewPensionista[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewPensionista[] = [];
        for (const raw of rawItems) {
            // 1. PRIMEIRO: Persiste Natureza Jurídica
            await naturezaJuridicaTransformerOrchestrator(raw as any);

            // 2. SEGUNDO: Persiste a árvore de Organizações
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

            // 3. TERCEIRO: Valida se as 4 FKs de organização e as datas do lançamento existem
            if (
                organizacoes &&
                organizacoes.organizacao_n0 !== null &&
                organizacoes.organizacao_n1 !== null &&
                organizacoes.organizacao_n2 !== null &&
                organizacoes.organizacao_n3 !== null &&
                raw.an_lanc !== null &&
                raw.me_lanc !== null
            ) {
                const newPensionista: NewPensionista = {
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1,
                    co_organizacao_n2: organizacoes.organizacao_n2,
                    co_organizacao_n3: organizacoes.organizacao_n3,
                    an_lanc: String(raw.an_lanc),
                    me_lanc: String(raw.me_lanc),
                    va_custo_pensionistas: raw.va_custo_pensionistas ?? null,
                };

                transformed.push(newPensionista);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return [];
    }
}

async function save(transformed: NewPensionista[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Custo_Pensionista)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    co_organizacao_n0: sql`values(${Custo_Pensionista.co_organizacao_n0})`,
                    co_organizacao_n1: sql`values(${Custo_Pensionista.co_organizacao_n1})`,
                    co_organizacao_n2: sql`values(${Custo_Pensionista.co_organizacao_n2})`,
                    co_organizacao_n3: sql`values(${Custo_Pensionista.co_organizacao_n3})`,
                    an_lanc: sql`values(${Custo_Pensionista.an_lanc})`,
                    me_lanc: sql`values(${Custo_Pensionista.me_lanc})`,
                    va_custo_pensionistas: sql`values(${Custo_Pensionista.va_custo_pensionistas})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}