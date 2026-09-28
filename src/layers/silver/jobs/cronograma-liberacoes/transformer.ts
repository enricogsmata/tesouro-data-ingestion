import type { NewCronogramaLiberacoes } from "../../../../database/types.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

type RawCronogramaLiberacoes = {
    id_pleito: number,
    num_pvl: string,
    num_processo?: string,
    indicador_liberacoes: string,
    ano: number,
    liberacoes_operacoes_sfn: number,
    liberacoes_aro: number,
    liberacoes_demais: number,
    liberacoes_total: number,
}

export function buildCLEntities(rawData: any[]): NewCronogramaLiberacoes[] {
    context = 'buildCLEntities';
    if (rawData.length === 0) {
        logger.error({ context: context }, `[ERRO] Dados brutos do endpoint vazios.`);
        return [];
    }

    try {
        const parsedData = rawData as RawCronogramaLiberacoes[];

        let newCronogramasLiberacoes: NewCronogramaLiberacoes[] = [];
        for (const raw of parsedData) {
            const newCL: NewCronogramaLiberacoes = {
                idPleito: raw.id_pleito,
                ano: String(raw.ano),
                indicadorLiberacoes: raw.indicador_liberacoes,
                liberacoesOperacoesSfn: raw.liberacoes_operacoes_sfn,
                liberacoesAro: raw.liberacoes_aro,
                liberacoesDemais: raw.liberacoes_demais,
                liberacoesTotal: raw.liberacoes_total,
            }

            newCronogramasLiberacoes.push(newCL);
        }

        return newCronogramasLiberacoes;
    } catch (error) {
        logger.error({context: context, data: JSON.stringify(error, null, 4)}, `[ERRO] Ocorreu uma falha na construção de entidades de cronograma de liberações.`);
        return [];
    }
}