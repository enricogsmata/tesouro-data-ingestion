import { db } from "../../../database/dbConnection.js";
import { Custo_Ativo, rawDs2CustosTtPessoalAtivo } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { areaAtuacaoTransformerOrchestrator } from "./area_atuacao.transformer.js";
import { escolaridadeTransformerOrchestrator } from "./escolaridade.transformer.js";
import { faixaEtariaTransformerOrchestrator } from "./faixa_etaria.transformer.js";
import { sexoTransformerOrchestrator } from "./sexo.transformer.js";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewCustoAtivo = typeof Custo_Ativo.$inferInsert;
const logger = createLogger(import.meta.url);

export async function custoAtivoTransformerOrchestrator() {
    const log = logger.forMethod('custoAtivoTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawCustoAtivo[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewCustoAtivo[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawCustoAtivo[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await db.select().from(rawDs2CustosTtPessoalAtivo).offset(nextOffset).limit(BATCH_SIZE) as RawCustoAtivo[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawCustoAtivo[]): Promise<NewCustoAtivo[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewCustoAtivo[] = [];
        for (const raw of rawItems) {
            await naturezaJuridicaTransformerOrchestrator(raw as any);
            await areaAtuacaoTransformerOrchestrator(raw);
            await escolaridadeTransformerOrchestrator(raw);
            await faixaEtariaTransformerOrchestrator(raw);
            await sexoTransformerOrchestrator(raw);
            
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

            if (
                organizacoes &&
                organizacoes.organizacao_n0 !== null &&
                organizacoes.organizacao_n1 !== null &&
                organizacoes.organizacao_n2 !== null &&
                organizacoes.organizacao_n3 !== null &&
                organizacoes.organizacao_n4 !== null &&
                organizacoes.organizacao_n5 !== null &&
                organizacoes.organizacao_n6 !== null &&
                raw.an_lanc !== null &&
                raw.me_lanc !== null &&
                raw.in_escolaridade !== null &&
                raw.in_faixa_etaria !== null &&
                raw.in_sexo !== null
            ) {
                const newCustoAtivo: NewCustoAtivo = {
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1,
                    co_organizacao_n2: organizacoes.organizacao_n2,
                    co_organizacao_n3: organizacoes.organizacao_n3,
                    co_organizacao_n4: organizacoes.organizacao_n4,
                    co_organizacao_n5: organizacoes.organizacao_n5,
                    co_organizacao_n6: organizacoes.organizacao_n6,
                    an_lanc: raw.an_lanc.toString(),
                    me_lanc: raw.me_lanc.toString(),
                    in_escolaridade: Number(raw.in_escolaridade),
                    in_faixa_etaria: Number(raw.in_faixa_etaria),
                    in_sexo: raw.in_sexo,
                    va_custo_de_pessoal: raw.va_custo_de_pessoal ?? null,
                    in_forca_trabalho: raw.in_forca_trabalho ?? null,
                }
                
                transformed.push(newCustoAtivo);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewCustoAtivo[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Custo_Ativo)
            .ignore()
            .values(transformed)
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}