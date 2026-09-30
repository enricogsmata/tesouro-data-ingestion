import type { NewOperacoesNaoContratadas, NewResumoGeral } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { persistNewOnc } from "./operacoes_nao_contratadas/repository.js";

type RawTramitacao = {
    id_pleito: number,
    num_pvl: string,
    processo?: any,
    sn_pvl_tramitacao_deferido: number,
    pleito_nao_contratado: number,
    num_pvl_nao_contratado: string,
    processo_pvl_nao_contratado?: any,
    moeda_pvl_nao_contratado: string,
    valor_pvl_nao_contratado: number,
    status_pvl_nao_contratado: string,
    ano_pvl_nao_contratado: number,
    contrapartida_pvl_nao_contratado: number,
    liberacao_pvl_nao_contratado: number,
    amortizacao_pvl_nao_contratado: number,
    encargos_pvl_nao_contratado: number,
    total_pvl_nao_contratado: number,
}

const logger = createLogger(import.meta.url);

export async function transformRawTramitacao(rawData: any[]): Promise<NewResumoGeral[]> {
    const log = logger.forMethod('transformRawTramitacao');

    try {
        const parsedData: RawTramitacao[] = rawData as RawTramitacao[];
        let newResumosGerais: NewResumoGeral[] = [];

        for (const raw of parsedData) {
            const newResumoGeral: NewResumoGeral = {
                idPleito: raw.id_pleito,
                ano: String(raw.ano_pvl_nao_contratado),
                snPvlTramitacaoDeferido: String(raw.sn_pvl_tramitacao_deferido),
                contrapartida: raw.contrapartida_pvl_nao_contratado,
                liberacao: raw.liberacao_pvl_nao_contratado,
                amortizacao: raw.amortizacao_pvl_nao_contratado,
                encargos: raw.encargos_pvl_nao_contratado,
                total: raw.total_pvl_nao_contratado,
            }

            newResumosGerais.push(newResumoGeral);

            const newOnc: NewOperacoesNaoContratadas = {
                idPleito: raw.id_pleito,
                idPleitoNaoContratado: raw.pleito_nao_contratado,
            }

            await persistNewOnc(newOnc);
        }

        return newResumosGerais;
    } catch (error: any) {
        log.fatal(`[FATAL] Falha na transformação: Tramitação Deferido`);
        return []
    }
}