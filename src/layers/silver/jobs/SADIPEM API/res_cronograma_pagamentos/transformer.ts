import type { NewResumoCronogramaPagamentos } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js"

type RawRCP = {
    id_pleito: number,
    num_pvl?: number,
    num_processo: string,
    ano: string,
    operacao_pleiteada: number,
    demais_operacoes: number,
    total: number,
}

const logger = createLogger(import.meta.url);
let context: string;

export async function transformRawRCPs(rawData: any[]) {
    context = 'transformRawRCPs';
    try {
        const parsedData: RawRCP[] = rawData as RawRCP[];
        let newRCPs: NewResumoCronogramaPagamentos[] = [];

        for (const raw of parsedData) {
            const newRCP: NewResumoCronogramaPagamentos = {
                idPleito: raw.id_pleito,
                ano: raw.ano,
                demaisOperacoes: raw.demais_operacoes,
                operacaoPleiteada: raw.operacao_pleiteada,
            }

            newRCPs.push(newRCP);
        }

        return newRCPs;
    } catch (error: any) {
        logger.fatal({ context: context }, `[FATAL] Falha ao mapear novos objetos.`);
        return [];
    }
}