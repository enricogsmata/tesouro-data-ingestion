import { db } from "../../../database/dbConnection.js";
import { Custo_Inativo, rawDs2CustosTtPessoalInativo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";

type RawInativo = typeof rawDs2CustosTtPessoalInativo.$inferSelect;
type NewInativo = typeof Custo_Inativo.$inferInsert;
const logger = createLogger(import.meta.url);

export async function custoInativoTransformerOrchestrator() {
    const log = logger.forMethod('custoInativoTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawInativo[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewInativo[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawInativo[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await db.select().from(rawDs2CustosTtPessoalInativo).offset(nextOffset).limit(BATCH_SIZE) as RawInativo[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawInativo[]): Promise<NewInativo[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewInativo[] = [];
        for (const raw of rawItems) {
            await naturezaJuridicaTransformerOrchestrator(raw as any);
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

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
                    an_lanc: raw.an_lanc.toString(),
                    me_lanc: raw.me_lanc.toString(),
                    va_custo_pessoal_inativo: raw.va_custo_pessoal_inativo ?? null,
                }

                transformed.push(newInativo);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewInativo[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Custo_Inativo)
            .ignore()
            .values(transformed)
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}