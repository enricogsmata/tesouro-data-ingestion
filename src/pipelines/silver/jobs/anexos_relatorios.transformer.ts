import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4TtAnexosRelatorios } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Anexo } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawAnexosRelatorios = typeof rawDs4TtAnexosRelatorios.$inferSelect;
type NewAnexo = typeof Anexo.$inferInsert;
const logger = createLogger(import.meta.url);

export async function anexosRelatoriosTransformerOrchestrator() {
    const log = logger.forMethod('anexoTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawAnexosRelatorios[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewAnexo[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawAnexosRelatorios[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs4TtAnexosRelatorios)
            .orderBy(rawDs4TtAnexosRelatorios.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawAnexosRelatorios[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawAnexosRelatorios[]): Promise<NewAnexo[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewAnexo[] = [];
        for (const raw of rawItems) {
            
            // Garantindo que os campos que compõem o índice único não sejam nulos
            if (
                raw.anexo != null &&
                raw.demonstrativo != null &&
                raw.esfera != null
            ) {
                // Não mapeamos o id_anexo pois ele é autoincrement na tabela Anexo (Silver)
                const newAnexo: NewAnexo = {
                    anexo: raw.anexo,
                    demonstrativo: raw.demonstrativo,
                    esfera: raw.esfera,
                };
                
                transformed.push(newAnexo);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewAnexo[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Anexo)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    // Atualiza os valores caso já exista uma linha com a mesma chave composta (anexo, demonstrativo, esfera)
                    anexo: sql`VALUES(anexo)`,
                    demonstrativo: sql`VALUES(demonstrativo)`,
                    esfera: sql`VALUES(esfera)`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}