import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtRreo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { instituicaoTransformerOrchestrator } from "./instituicao.transformer.js";
import { populacaoAnualEnteTransformerOrchestrator } from "./populacao_anual_ente.transformer.js";
import { anexoTransformerOrchestrator } from "./anexo.transformer.js";
import { rotuloTransformerOrchestrator } from "./rotulo.transformer.js";
import { colunaTransformerOrchestrator } from "./coluna.transformer.js";
import { contaTransformerOrchestrator } from "./conta.transformer.js";
import { RREO_ou_RGF } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewRreo = typeof RREO_ou_RGF.$inferInsert;
const logger = createLogger(import.meta.url);

export async function rreoTransformerOrchestrator() {
    const log = logger.forMethod('rreoTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawRreo[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewRreo[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawRreo[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs4SiconfiTtRreo)
            .orderBy(rawDs4SiconfiTtRreo.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawRreo[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawRreo[]): Promise<NewRreo[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewRreo[] = [];
        for (const raw of rawItems) {
            raw.rotulo = raw.rotulo ?? "Principal";

            await instituicaoTransformerOrchestrator(raw);
            await populacaoAnualEnteTransformerOrchestrator(raw);
            
            const idAnexo = await anexoTransformerOrchestrator(raw);
            
            if (idAnexo != null) {
                await rotuloTransformerOrchestrator(raw, idAnexo);
                await colunaTransformerOrchestrator(raw);
                await contaTransformerOrchestrator(raw);
            }

            if (
                raw.exercicio != null &&
                raw.instituicao != null &&
                raw.cod_ibge != null &&
                raw.coluna != null &&
                raw.cod_conta != null
            ) {
                const newRreo: NewRreo = {
                    exercicio: raw.exercicio,
                    periodo: raw.periodo ?? null,
                    periodicidade: raw.periodicidade ?? null,
                    instituicao: raw.instituicao,
                    cod_ibge: raw.cod_ibge,
                    coluna: raw.coluna,
                    cod_conta: raw.cod_conta,
                    valor: raw.valor ?? null,
                };
                
                transformed.push(newRreo);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewRreo[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(RREO_ou_RGF)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    periodo: sql`VALUES(periodo)`,
                    periodicidade: sql`VALUES(periodicidade)`,
                    valor: sql`VALUES(valor)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}