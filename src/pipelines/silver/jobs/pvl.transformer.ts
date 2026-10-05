import { db } from "../../../database/dbConnection.js";
import { PVL, rawDs1SadipemTtPvl } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE, parseStringToDate } from "../utils.js";
import { credorTransformerOrchestrator } from "./credor.transformer.js";

type RawPvl = typeof rawDs1SadipemTtPvl.$inferSelect;
type NewPvl = typeof PVL.$inferInsert;
const logger = createLogger(import.meta.url);

export async function pvlTransformerOrchestrator() {
    const log = logger.forMethod('pvlTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawPvl[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewPvl[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawPvl[]> {
    const log = logger.forMethod('load');

    try {
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
        await db
            .insert(PVL)
            .ignore()
            .values(transformed)
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}