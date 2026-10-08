import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1SadipemTtPvl } from "../../../database/bronze_schema.js";
import { PVL } from "../../../database/silver_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE, parseStringToDate } from "../utils.js";
import { credorTransformerOrchestrator } from "./credor.transformer.js";
import { sql } from "drizzle-orm";

type RawPvl = typeof rawDs1SadipemTtPvl.$inferSelect;
type NewPvl = typeof PVL.$inferInsert;
const logger = createLogger(import.meta.url);

export async function pvlTransformerOrchestrator() {
    const log = logger.forMethod('pvlTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawPvl[] = await load(index);
            if (raw.length === 0) return;
            log.info(`Raw Pvls Length: ${raw.length}`);

            const transformed: NewPvl[] | null = await transform(raw);
            log.info(`Dados transformados gerados ${transformed?.length}`);

            if (transformed && transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lista de dados tratados nula ou vazia: Loop ${index}.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawPvl[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index *= 1000;
        const response = await bronzeDB.select().from(rawDs1SadipemTtPvl).offset(nextOffset).limit(BATCH_SIZE) as RawPvl[];
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

            let dataProtocolo: Date | undefined = raw.data_protocolo ? parseStringToDate(raw.data_protocolo) : undefined;
            if (dataProtocolo && isNaN(dataProtocolo.getTime())) dataProtocolo = undefined;

            let dataStatus = raw.data_status ? parseStringToDate(raw.data_status, 'dd/MM/yyyy') : null;
            if (dataStatus && isNaN(dataStatus.getTime())) dataStatus = null;

            if (idCredor && raw.cod_ibge) {
                const newPvl: NewPvl = {
                    cod_ibge: raw.cod_ibge,
                    id_credor: idCredor,
                    data_protocolo: dataProtocolo,
                    data_status: dataStatus,
                    finalidade: raw.finalidade,
                    id_pleito: raw.id_pleito,
                    moeda: raw.moeda,
                    num_processo: raw.num_processo,
                    num_pvl: raw.num_pvl,
                    pvl_assoc_divida: raw.pvl_assoc_divida,
                    valor: raw.valor,
                    tipo_operacao: raw.tipo_credor,
                    pvl_contratado_credor: raw.pvl_contratado_credor,
                    status: raw.status,
                }

                if (newPvl)
                    transformed.push(newPvl);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewPvl[]) {
    const log = logger.forMethod('save');
    try {
        log.info(`Inserindo ${transformed.length} valores`);
        await silverDB
            .insert(PVL)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    cod_ibge: sql`values(${PVL.cod_ibge})`,
                    num_pvl: sql`values(${PVL.num_pvl})`,
                    status: sql`values(${PVL.status})`,
                    num_processo: sql`values(${PVL.num_processo})`,
                    data_protocolo: sql`values(${PVL.data_protocolo})`,
                    tipo_operacao: sql`values(${PVL.tipo_operacao})`,
                    finalidade: sql`values(${PVL.finalidade})`,
                    id_credor: sql`values(${PVL.id_credor})`,
                    moeda: sql`values(${PVL.moeda})`,
                    valor: sql`values(${PVL.valor})`,
                    pvl_assoc_divida: sql`values(${PVL.pvl_assoc_divida})`,
                    pvl_contratado_credor: sql`values(${PVL.pvl_contratado_credor})`,
                    data_status: sql`values(${PVL.data_status})`,
                },
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}