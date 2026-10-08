import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDemais } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { situacaoContabilTransformerOrchestrator } from "./situacao_contabil.transformer.js";
import { naturezaDespesaDetalhadaTransformerOrchestrator } from "./natureza_despesa_detalhada.transformer.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { esferaOrcamentariaTransformerOrchestrator } from "./esfera_orcamentaria.transformer.js";
import { resultadoPrimarioTransformerOrchestrator } from "./resultado_primario.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { Demais_Custos } from "../../../database/silver_schema.js";

type RawDemaisCustos = typeof rawDs2CustosTtDemais.$inferSelect;
type NewDemaisCustos = typeof Demais_Custos.$inferInsert;
const logger = createLogger(import.meta.url);

export async function demaisCustosTransformerOrchestrator() {
    const log = logger.forMethod('demaisCustosTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawDemaisCustos[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewDemaisCustos[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawDemaisCustos[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB.select().from(rawDs2CustosTtDemais).offset(nextOffset).limit(BATCH_SIZE) as RawDemaisCustos[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawDemaisCustos[]): Promise<NewDemaisCustos[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewDemaisCustos[] = [];
        for (const raw of rawItems) {
            await situacaoContabilTransformerOrchestrator(raw);
            await naturezaDespesaDetalhadaTransformerOrchestrator(raw);

            // Adaptadores para as funções orquestradoras existentes
            await esferaOrcamentariaTransformerOrchestrator({
                co_esfera_orcamentaria: raw.id_esfera_orcamentaria,
                ds_esfera_orcamentaria: raw.no_esfera_orcamentaria
            } as any);

            await resultadoPrimarioTransformerOrchestrator({
                co_resultado_eof: Number(raw.id_in_resultado_eof),
                ds_resultado_eof: raw.no_in_resultado_eof
            } as any);

            await naturezaJuridicaTransformerOrchestrator({
                co_natureza_juridica: raw.id_natureza_juridica_siorg,
                ds_natureza_juridica: raw.ds_natureza_juridica_siorg
            } as any);

            // Mapeando a hierarquia siorg para o orquestrador de organização
            await organizacaoTransformerOrchestrator({
                co_natureza_juridica: raw.id_natureza_juridica_siorg,
                co_organizacao_n4: raw.co_siorg_n04,
                ds_organizacao_n4: raw.ds_siorg_n04,
                co_organizacao_n5: raw.co_siorg_n05,
                ds_organizacao_n5: raw.ds_siorg_n05,
                co_organizacao_n6: raw.co_siorg_n06,
                ds_organizacao_n6: raw.ds_siorg_n06,
                co_organizacao_n7: raw.co_siorg_n07,
                ds_organizacao_n7: raw.ds_siorg_n07,
            } as any);

            if (
                raw.id !== null &&
                raw.co_siorg_n05 !== null &&
                raw.co_siorg_n06 !== null &&
                raw.co_siorg_n07 !== null &&
                raw.co_situacao_icc !== null &&
                raw.co_natureza_despesa_deta !== null &&
                raw.id_esfera_orcamentaria !== null &&
                raw.id_in_resultado_eof !== null
            ) {
                const newDemaisCustos: NewDemaisCustos = {
                    id_demais_custos: raw.id,
                    co_siorg_n05: Number(raw.co_siorg_n05),
                    co_siorg_n06: Number(raw.co_siorg_n06),
                    co_siorg_n07: Number(raw.co_siorg_n07),
                    me_referencia: raw.me_referencia ?? null,
                    an_referencia: raw.an_referencia ?? null,
                    me_emissao: raw.me_emissao ?? null,
                    an_emissao: raw.an_emissao ?? null,
                    sg_mes_completo: raw.sg_mes_completo ?? null,
                    co_situacao_icc: raw.co_situacao_icc,
                    co_natureza_despesa_deta: raw.co_natureza_despesa_deta,
                    co_esfera_orcamentaria: raw.id_esfera_orcamentaria,
                    co_resultado_eof: Number(raw.id_in_resultado_eof),
                    va_custo: raw.va_custo ?? null,
                };
                
                transformed.push(newDemaisCustos);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewDemaisCustos[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Demais_Custos)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}