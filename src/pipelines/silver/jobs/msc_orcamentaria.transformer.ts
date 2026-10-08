import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtMscOrcamentaria } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { contaContabilTransformerOrchestrator } from "./conta-contabil.transformer.js";
import { MSC_Orcamentaria } from "../../../database/silver_schema.js";

type RawMscOrcamentaria = typeof rawDs4SiconfiTtMscOrcamentaria.$inferSelect;
type NewMscOrcamentaria = typeof MSC_Orcamentaria.$inferInsert;
const logger = createLogger(import.meta.url);

export async function mscOrcamentariaTransformerOrchestrator() {
    const log = logger.forMethod('mscOrcamentariaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawMscOrcamentaria[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewMscOrcamentaria[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawMscOrcamentaria[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB.select().from(rawDs4SiconfiTtMscOrcamentaria).offset(nextOffset).limit(BATCH_SIZE) as RawMscOrcamentaria[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawMscOrcamentaria[]): Promise<NewMscOrcamentaria[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewMscOrcamentaria[] = [];
        for (const raw of rawItems) {
            const idContaContabil = await contaContabilTransformerOrchestrator(raw);

            if (
                raw.cod_ibge !== null &&
                raw.exercicio !== null &&
                raw.natureza_despesa !== null &&
                idContaContabil !== null
            ) {
                const newMscOrcamentaria: NewMscOrcamentaria = {
                    tipo_matriz: raw.tipo_matriz ?? null,
                    cod_ibge: raw.cod_ibge,
                    conta_contabil: idContaContabil,
                    poder_orgao: raw.poder_orgao ?? null,
                    fonte_recursos: raw.fonte_recursos ?? null,
                    funcao: raw.funcao ?? null,
                    subfuncao: raw.subfuncao ?? null,
                    exercicio: raw.exercicio,
                    mes_referencia: raw.mes_referencia ?? null,
                    educacao_saude: raw.educacao_saude ?? null,
                    data_referencia: raw.data_referencia ? new Date(raw.data_referencia) : null,
                    entrada_msc: raw.entrada_msc ?? null,
                    natureza_despesa: raw.natureza_despesa,
                    ano_inscricao: raw.ano_inscricao ?? null,
                    natureza_receita: raw.natureza_receita ?? null,
                    valor: raw.valor ?? null,
                    natureza_conta: raw.natureza_conta ?? null,
                    tipo_valor: raw.tipo_valor ?? null,
                };
                
                transformed.push(newMscOrcamentaria);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewMscOrcamentaria[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(MSC_Orcamentaria)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}