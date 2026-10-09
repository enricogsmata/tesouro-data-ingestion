import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtExtratoEntregas } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Extrato_Entregas } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawExtratoEntregas = typeof rawDs4SiconfiTtExtratoEntregas.$inferSelect;
type NewExtratoEntregas = typeof Extrato_Entregas.$inferInsert;
const logger = createLogger(import.meta.url);

export async function extratoEntregasTransformerOrchestrator() {
    const log = logger.forMethod('extratoEntregasTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawExtratoEntregas[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewExtratoEntregas[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawExtratoEntregas[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs4SiconfiTtExtratoEntregas)
            .orderBy(rawDs4SiconfiTtExtratoEntregas.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawExtratoEntregas[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawExtratoEntregas[]): Promise<NewExtratoEntregas[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewExtratoEntregas[] = [];
        for (const raw of rawItems) {
            
            // Garantindo que chaves estrangeiras/identificadores não sejam nulos
            if (
                raw.cod_ibge != null &&
                raw.exercicio != null
            ) {
                const newExtratoEntregas: NewExtratoEntregas = {
                    exercicio: raw.exercicio,
                    cod_ibge: raw.cod_ibge,
                    instituicao: raw.instituicao ?? null,
                    entregavel: raw.entregavel ?? null,
                    periodo: raw.periodo ?? null,
                    periodicidade: raw.periodicidade ?? null,
                    status_relatorio: raw.status_relatorio ?? null,
                    data_status: raw.data_status ? new Date(raw.data_status) : null,
                    forma_envio: raw.forma_envio ?? null,
                    tipo_relatorio: raw.tipo_relatorio ?? null,
                };
                
                transformed.push(newExtratoEntregas);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewExtratoEntregas[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Extrato_Entregas)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    exercicio: sql`VALUES(exercicio)`,
                    cod_ibge: sql`VALUES(cod_ibge)`,
                    instituicao: sql`VALUES(instituicao)`,
                    entregavel: sql`VALUES(entregavel)`,
                    periodo: sql`VALUES(periodo)`,
                    periodicidade: sql`VALUES(periodicidade)`,
                    status_relatorio: sql`VALUES(status_relatorio)`,
                    data_status: sql`VALUES(data_status)`,
                    forma_envio: sql`VALUES(forma_envio)`,
                    tipo_relatorio: sql`VALUES(tipo_relatorio)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}