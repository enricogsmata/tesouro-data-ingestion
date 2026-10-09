import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalInativo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { Custo_Inativo } from "../../../database/silver_schema.js";
import { asc, sql } from "drizzle-orm";

type RawInativo = typeof rawDs2CustosTtPessoalInativo.$inferSelect;
type NewInativo = typeof Custo_Inativo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function custoInativoTransformerOrchestrator() {
    const log = logger.forMethod('custoInativoTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawInativo[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewInativo[] = await transform(raw);

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

async function load(index: number): Promise<RawInativo[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawInativo[] = await bronzeDB
            .select()
            .from(rawDs2CustosTtPessoalInativo)
            // 1. Ordenação obrigatória para estabilização do cursor de paginação
            .orderBy(asc(rawDs2CustosTtPessoalInativo.id))
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawInativo[]): Promise<NewInativo[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewInativo[] = [];
        for (const raw of rawItems) {
            // 1. Salva Natureza Jurídica primeiro
            await naturezaJuridicaTransformerOrchestrator(raw as any);

            // 2. Salva a árvore de Organizações
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

            // 3. Valida se as 4 FKs da organização e o ano/mês existem
            if (
                organizacoes &&
                organizacoes.organizacao_n0 !== null &&
                organizacoes.organizacao_n1 !== null &&
                organizacoes.organizacao_n2 !== null &&
                organizacoes.organizacao_n3 !== null &&
                raw.an_lanc !== null &&
                raw.me_lanc !== null
            ) {
                const newInativo: NewInativo = {
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1,
                    co_organizacao_n2: organizacoes.organizacao_n2,
                    co_organizacao_n3: organizacoes.organizacao_n3,
                    an_lanc: String(raw.an_lanc),
                    me_lanc: String(raw.me_lanc),
                    va_custo_pessoal_inativo: raw.va_custo_pessoal_inativo ?? null,
                };

                transformed.push(newInativo);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return [];
    }
}

async function save(transformed: NewInativo[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Custo_Inativo)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    co_organizacao_n0: sql`values(${Custo_Inativo.co_organizacao_n0})`,
                    co_organizacao_n1: sql`values(${Custo_Inativo.co_organizacao_n1})`,
                    co_organizacao_n2: sql`values(${Custo_Inativo.co_organizacao_n2})`,
                    co_organizacao_n3: sql`values(${Custo_Inativo.co_organizacao_n3})`,
                    an_lanc: sql`values(${Custo_Inativo.an_lanc})`,
                    me_lanc: sql`values(${Custo_Inativo.me_lanc})`,
                    va_custo_pessoal_inativo: sql`values(${Custo_Inativo.va_custo_pessoal_inativo})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}