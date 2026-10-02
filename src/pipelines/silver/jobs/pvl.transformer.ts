import { sql } from "drizzle-orm";
import { db } from "../../../database/dbConnection.js";
import { pvl, rawDs1SadipemTtPvl } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { parseStringToDate } from "../utils.js";
import { credorTransformerOrchestrator } from "./credor.transformer.js";

type RawPvl = typeof rawDs1SadipemTtPvl.$inferSelect;
type NewPvl = typeof pvl.$inferInsert;
const logger = createLogger(import.meta.url);

export async function pvlTransformerOrchestrator() {
    const log = logger.forMethod('pvlTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawPvl[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewPvl[] | null = await transform(raw);

            if (transformed)
                await save(transformed);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawPvl[]> {
    const log = logger.forMethod('load');

    try {
        const BATCH_SIZE = 1000;
        const nextOffset = index *= 1000;
        const response = await db.select().from(rawDs1SadipemTtPvl).offset(nextOffset).limit(BATCH_SIZE) as RawPvl[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawPvls: RawPvl[]): Promise<NewPvl[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewPvl[] = [];
        for (const raw of rawPvls) {
            const idCredor: number | null = await credorTransformerOrchestrator(raw);
            const dataProtocolo = raw.data_protocolo ? parseStringToDate(raw.data_protocolo) : null;
            const dataStatus = raw.data_status ? parseStringToDate(raw.data_status, 'dd/MM/yyyy') : null;

            if (idCredor && raw.cod_ibge) {
                const newPvl: NewPvl = {
                    codIbge: raw.cod_ibge,
                    idcredor: idCredor,
                    dataProtocolo: dataProtocolo,
                    dataStatus: dataStatus,
                    finalidade: raw.finalidade,
                    idPleito: raw.id_pleito,
                    moeda: raw.moeda,
                    numProcesso: raw.num_processo,
                    numpvl: raw.num_pvl,
                    pvlAssocDivida: raw.pvl_assoc_divida,
                    valor: raw.valor,
                    tipoOperacao: raw.tipo_credor,
                    pvlContratadocredor: raw.pvl_contratado_credor,
                    status: raw.status,
                    createdAt: new Date(),
                }

                if (newPvl)
                    transformed.push(newPvl);
            }
        }

        return null;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewPvl[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(pvl)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: { codIbge: sql`cod_ibge` },
            })
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}