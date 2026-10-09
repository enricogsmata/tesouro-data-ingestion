import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs3CustomResultadoFiscal } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { tema, subtema, serie } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawResultadoFiscal = typeof rawDs3CustomResultadoFiscal.$inferSelect;
type NewTema = typeof tema.$inferInsert;
type NewSubtema = typeof subtema.$inferInsert;
type NewSerie = typeof serie.$inferInsert;

interface TransformedData {
    temas: NewTema[];
    subtemas: NewSubtema[];
    series: NewSerie[];
}

const logger = createLogger(import.meta.url);

export async function resultadoFiscalTransformerOrchestrator() {
    const log = logger.forMethod('resultadoFiscalTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawResultadoFiscal[] = await load(index);
            if (raw.length === 0) return;

            const transformed: TransformedData | null = await transform(raw);

            if (transformed && (transformed.temas.length > 0 || transformed.series.length > 0)) {
                await save(transformed);
            } else {
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawResultadoFiscal[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB
            .select()
            .from(rawDs3CustomResultadoFiscal)
            .orderBy(rawDs3CustomResultadoFiscal.id)
            .offset(nextOffset)
            .limit(BATCH_SIZE) as RawResultadoFiscal[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawResultadoFiscal[]): Promise<TransformedData | null> {
    const log = logger.forMethod('transform');

    try {
        const temasMap = new Map<string, NewTema>();
        const subtemasMap = new Map<string, NewSubtema>();
        const seriesList: NewSerie[] = [];

        for (const raw of rawItems) {
            if (raw.codigoTema && raw.codigoSubtema && raw.codigoSerie && raw.data) {
                
                // 1. Mapeia o Tema
                if (!temasMap.has(raw.codigoTema)) {
                    temasMap.set(raw.codigoTema, {
                        codigoTema: raw.codigoTema,
                        nomeTema: raw.nomeTema ?? null,
                    });
                }

                // 2. Mapeia o Subtema
                if (!subtemasMap.has(raw.codigoSubtema)) {
                    subtemasMap.set(raw.codigoSubtema, {
                        codigoSubtema: raw.codigoSubtema,
                        nomesubtema: raw.nomeSubtema ?? null,
                        codigoTema: raw.codigoTema, 
                    });
                }

                // 3. Mapeia a Série
                seriesList.push({
                    codigoSerie: raw.codigoSerie,
                    data: new Date(raw.data),
                    codigoSubtema: raw.codigoSubtema, 
                    nomeSerie: raw.nomeSerie ?? null,
                    valor: raw.valor ?? null,
                });
            }
        }

        return {
            temas: Array.from(temasMap.values()),
            subtemas: Array.from(subtemasMap.values()),
            series: seriesList,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: TransformedData) {
    const log = logger.forMethod('save');

    try {
        if (transformed.temas.length > 0) {
            await silverDB
                .insert(tema)
                .values(transformed.temas)
                .onDuplicateKeyUpdate({
                    set: {
                        nomeTema: sql`VALUES(nomeTema)`,
                    },
                });
        }

        if (transformed.subtemas.length > 0) {
            await silverDB
                .insert(subtema)
                .values(transformed.subtemas)
                .onDuplicateKeyUpdate({
                    set: {
                        nomesubtema: sql`VALUES(nomesubtema)`,
                        codigoTema: sql`VALUES(codigoTema)`,
                    },
                });
        }

        if (transformed.series.length > 0) {
            await silverDB
                .insert(serie)
                .values(transformed.series)
                .onDuplicateKeyUpdate({
                    set: {
                        codigoSubtema: sql`VALUES(codigoSubtema)`,
                        nomeSerie: sql`VALUES(nomeSerie)`,
                        valor: sql`VALUES(valor)`,
                    },
                });
        }
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}