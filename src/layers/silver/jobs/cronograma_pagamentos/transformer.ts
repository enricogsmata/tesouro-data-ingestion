import type { NewCronogramaPagamentos } from "../../../../database/types.js";
import { getCronogramaPagamentosRawResponse } from "./loader.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

type RawCronogramaPagamentos = {
    id_pleito: number;
    num_pvl?: string | null;
    num_processo: string;
    indicador_liberacoes: string;
    ano: string;
    divida_consolidada_amortizacao: number;
    divida_consolidada_encargos: number;
    operacoes_contratadas_amortizacao: number;
    operacoes_contratadas_encargos: number;
    total_amortizacao: number;
    total_encargos: number;
    indicador_div_moeda_estrang: string;
};

export async function buildCronogramaPagamentosEntities(rawData: any[] | null): Promise<NewCronogramaPagamentos[] | null> {
    context = 'buildCronogramaPagamentosEntities';

    if (!rawData) {
        logger.error({  context: context }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return null;
    }

    try {
        const parsedRawData = rawData as RawCronogramaPagamentos[];

        let newCronPagamentos: NewCronogramaPagamentos[] = [];
        for (const rawCronPag of parsedRawData) {
            const newCronPagamento: NewCronogramaPagamentos = {
                idPleito: rawCronPag.id_pleito,
                ano: rawCronPag.ano,
                indicadorLiberacoes: rawCronPag.indicador_liberacoes.trim() ?? null,
                dividaConsolidadaAmortizacao: rawCronPag.divida_consolidada_amortizacao,
                dividaConsolidadaEncargos: rawCronPag.divida_consolidada_encargos,
                operacoesContratadasAmortizacao: rawCronPag.operacoes_contratadas_amortizacao,
                operacoesContratadasEncargos: rawCronPag.operacoes_contratadas_encargos,
                totalAmortizacao: rawCronPag.total_amortizacao,
                totalEncargos: rawCronPag.total_encargos,
                indicadorDivMoedaEstrang: rawCronPag.indicador_div_moeda_estrang,
            }

            newCronPagamentos.push(newCronPagamento);
        }

        return newCronPagamentos;
    } catch (error) {
        logger.error({  context: context}, `[ERRO] Falha ao gerar entidades do endpoint cronograma de pagamentos.`)
        return null;
    }
}