import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtMscControle } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { contaContabilTransformerOrchestrator } from "./conta-contabil.transformer.js";
import { MSC_Controle } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawMscControle = typeof rawDs4SiconfiTtMscControle.$inferSelect;
type NewMscControle = typeof MSC_Controle.$inferInsert;
const logger = createLogger(import.meta.url);

export async function mscControleTransformerOrchestrator() {
    const log = logger.forMethod('mscControleTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawMscControle[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewMscControle[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawMscControle[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs4SiconfiTtMscControle)
            .orderBy(rawDs4SiconfiTtMscControle.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawMscControle[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawMscControle[]): Promise<NewMscControle[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewMscControle[] = [];
        for (const raw of rawItems) {
            const idContaContabil = await contaContabilTransformerOrchestrator(raw);

            if (
                raw.cod_ibge != null &&
                raw.exercicio != null &&
                raw.natureza_despesa != null &&
                idContaContabil != null
            ) {
                const newMscControle: NewMscControle = {
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
                    valor: raw.valor ?? null,
                    natureza_conta: raw.natureza_conta ?? null,
                    tipo_valor: raw.tipo_valor ?? null,
                };
                
                transformed.push(newMscControle);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewMscControle[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(MSC_Controle)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    tipo_matriz: sql`VALUES(tipo_matriz)`,
                    poder_orgao: sql`VALUES(poder_orgao)`,
                    fonte_recursos: sql`VALUES(fonte_recursos)`,
                    funcao: sql`VALUES(funcao)`,
                    subfuncao: sql`VALUES(subfuncao)`,
                    mes_referencia: sql`VALUES(mes_referencia)`,
                    educacao_saude: sql`VALUES(educacao_saude)`,
                    data_referencia: sql`VALUES(data_referencia)`,
                    entrada_msc: sql`VALUES(entrada_msc)`,
                    natureza_despesa: sql`VALUES(natureza_despesa)`,
                    ano_inscricao: sql`VALUES(ano_inscricao)`,
                    valor: sql`VALUES(valor)`,
                    natureza_conta: sql`VALUES(natureza_conta)`,
                    tipo_valor: sql`VALUES(tipo_valor)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}