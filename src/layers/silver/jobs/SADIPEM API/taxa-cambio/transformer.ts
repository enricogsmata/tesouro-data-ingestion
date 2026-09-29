import type { NewCambio } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";
import { parseStringToData } from "../../helpers.js";

type RawCambio = {
    id_pleito: number,
    moeda: string,
    taxa_cambio: number,
    data_taxa_cambio: string,
}

const logger = createLogger(import.meta.url);
let context: string;

export async function transformRawCambios(rawData: any[]): Promise<NewCambio[]> {
    context = 'transformRawCambios';
    try {
        const parsedData: RawCambio[] = rawData as RawCambio[];
        let newCambios: NewCambio[] = [];

        for (const raw of parsedData) {
            const parsedDataTaxa = parseStringToData(raw.data_taxa_cambio);

            if (parsedDataTaxa) {
                const newCambio: NewCambio = {
                    idPleito: raw.id_pleito,
                    moeda: raw.moeda,
                    taxaCambio: raw.taxa_cambio,
                    dataTaxaCambio: parsedDataTaxa,
                }

                newCambios.push(newCambio);
            } else {
                logger.warn({ context: context, data: `ID PLEITO: ${raw.id_pleito}` }, `[WARN] Falha ao converter "data_taxa_cambio" para Data`);
            }
        }

        return newCambios;
    } catch (error: any) {
        logger.fatal({ context: context }, `[FATAL] Falha na transformação de entidades: "taxa-cambio".`);
        return [];
    }
}