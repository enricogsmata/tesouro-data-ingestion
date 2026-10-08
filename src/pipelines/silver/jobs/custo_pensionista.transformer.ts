import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPensionistas } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { Custo_Pensionista } from "../../../database/silver_schema.js";

type RawPensionista = typeof rawDs2CustosTtPensionistas.$inferSelect;
type NewPensionista = typeof Custo_Pensionista.$inferInsert;
const logger = createLogger(import.meta.url);

export async function custoPensionistaTransformerOrchestrator() {
    const log = logger.forMethod('custoPensionistaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawPensionista[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewPensionista[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawPensionista[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB.select().from(rawDs2CustosTtPensionistas).offset(nextOffset).limit(BATCH_SIZE) as RawPensionista[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawPensionista[]): Promise<NewPensionista[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewPensionista[] = [];
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
                const newPensionista: NewPensionista = {
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1,
                    co_organizacao_n2: organizacoes.organizacao_n2,
                    co_organizacao_n3: organizacoes.organizacao_n3,
                    an_lanc: raw.an_lanc.toString(),
                    me_lanc: raw.me_lanc.toString(),
                    va_custo_pensionistas: raw.va_custo_pensionistas ?? null,
                }

                transformed.push(newPensionista);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewPensionista[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Custo_Pensionista)
            .ignore()
            .values(transformed)
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}