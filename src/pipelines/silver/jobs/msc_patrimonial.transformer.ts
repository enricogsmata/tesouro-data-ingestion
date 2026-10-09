import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtMscPatrimonial } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { contaContabilTransformerOrchestrator } from "./conta-contabil.transformer.js";
import { MSC_Patrimonial } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawMscPatrimonial = typeof rawDs4SiconfiTtMscPatrimonial.$inferSelect;
type NewMscPatrimonial = typeof MSC_Patrimonial.$inferInsert;
const logger = createLogger(import.meta.url);

export async function mscPatrimonialTransformerOrchestrator() {
    const log = logger.forMethod('mscPatrimonialTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawMscPatrimonial[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewMscPatrimonial[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawMscPatrimonial[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs4SiconfiTtMscPatrimonial)
            .orderBy(rawDs4SiconfiTtMscPatrimonial.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawMscPatrimonial[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawMscPatrimonial[]): Promise<NewMscPatrimonial[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewMscPatrimonial[] = [];
        for (const raw of rawItems) {
            const idContaContabil = await contaContabilTransformerOrchestrator(raw);

            if (
                raw.cod_ibge != null &&
                raw.exercicio != null &&
                idContaContabil != null
            ) {
                const newMscPatrimonial: NewMscPatrimonial = {
                    tipo_matriz: raw.tipo_matriz ?? null,
                    cod_ibge: raw.cod_ibge,
                    conta_contabil: idContaContabil,
                    poder_orgao: raw.poder_orgao ?? null,
                    financeiro_permanente: raw.financeiro_permanente ?? null,
                    fonte_recursos: raw.fonte_recursos ?? null,
                    exercicio: raw.exercicio,
                    mes_referencia: raw.mes_referencia ?? null,
                    divida_consolidada: raw.divida_consolidada ?? null,
                    data_referencia: raw.data_referencia ? new Date(raw.data_referencia) : null,
                    entrada_msc: raw.entrada_msc ?? null,
                    valor: raw.valor ?? null,
                    natureza_conta: raw.natureza_conta ?? null,
                    tipo_valor: raw.tipo_valor ?? null,
                };
                
                transformed.push(newMscPatrimonial);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewMscPatrimonial[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(MSC_Patrimonial)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    tipo_matriz: sql`VALUES(tipo_matriz)`,
                    poder_orgao: sql`VALUES(poder_orgao)`,
                    financeiro_permanente: sql`VALUES(financeiro_permanente)`,
                    fonte_recursos: sql`VALUES(fonte_recursos)`,
                    mes_referencia: sql`VALUES(mes_referencia)`,
                    divida_consolidada: sql`VALUES(divida_consolidada)`,
                    data_referencia: sql`VALUES(data_referencia)`,
                    entrada_msc: sql`VALUES(entrada_msc)`,
                    valor: sql`VALUES(valor)`,
                    natureza_conta: sql`VALUES(natureza_conta)`,
                    tipo_valor: sql`VALUES(tipo_valor)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}