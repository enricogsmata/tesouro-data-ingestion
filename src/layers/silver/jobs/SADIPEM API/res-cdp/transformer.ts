import type { NewCDP } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { parseStringToData } from "../../../helpers.js";

const logger = createLogger(import.meta.url);
let context: string;

type RawCDP = {
    id_pleito: number,
    num_pvl: string,
    num_processo: string,
    data_base: string,
    status: string,
    data_status: string,
    situacao_ente: string,
}

export async function transformRawCDPs(rawData: any[]): Promise<NewCDP[]> {
    context = 'transformRawRCDPs';
    try {
        const parsedData: RawCDP[] = rawData as RawCDP[];
        let newCDPs: NewCDP[] = [];

        for (const raw of parsedData) {
            const parsedDataStatus = parseStringToData(raw.data_status, 'dd/MM/yyyy HH/mm/ss');
            const parsedDataBase = parseStringToData(raw.data_base, 'dd/MM/yyyy');

            if (parsedDataStatus) {
                const newCDP: NewCDP = {
                    idPleito: raw.id_pleito,
                    dataBase: parsedDataBase,
                    dataStatus: parsedDataStatus,
                    situacaoEnte: raw.situacao_ente,
                    status: raw.status,
                }

                newCDPs.push(newCDP);
            }
        }

        return newCDPs;
    } catch (error: any) {
        logger.fatal({ context: context }, `[FATAL] Falha ao transformar objetos.`);
        return [];
    }
}