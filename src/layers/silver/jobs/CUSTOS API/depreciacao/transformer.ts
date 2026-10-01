import type { NewDepreciacao } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { transformRawCC } from "./conta_contabil/transformer.js";
import { transformRawOrganizacoes } from "../organizacao/transform.js";
import type { RawOrganizacao } from "../organizacao/types.js";

export type RawDepreciacao = {
    co_natureza_juridica: number,
    ds_natureza_juridica: string,
    co_organizacao_n0: string,
    ds_organizacao_n0: string,
    co_organizacao_n1: string,
    ds_organizacao_n1: string,
    co_organizacao_n2: string,
    ds_organizacao_n2: string,
    co_organizacao_n3: string,
    ds_organizacao_n3: string,
    an_lanc: number,
    me_lanc: number,
    id_conta_contabil: number,
    no_conta_contabil: string,
    va_custo_depreciacao: number,
}

const logger = createLogger(import.meta.url);

export async function transformRawDepreciacao(rawData: any[]): Promise<NewDepreciacao[]> {
    const log = logger.forMethod('transformRawDepreciacao');

    try {
        const parsedData: RawDepreciacao[] = rawData as RawDepreciacao[];

        let newDepreciacoes: NewDepreciacao[] = [];
        for (const raw of parsedData) {
            const status: boolean = await transformRawCC(raw);
            if (status) {
                const newDepreciacao: NewDepreciacao = {
                    anLanc: String(raw.an_lanc),
                    meLanc: String(raw.me_lanc),
                    codContaContabil: raw.id_conta_contabil,
                    vaCustoDepreciacao: raw.va_custo_depreciacao
                }

                newDepreciacoes.push(newDepreciacao);

                const rawOrganizacoes: RawOrganizacao = {
                    co_organizacao_n0: raw.co_organizacao_n0,
                    ds_organizacao_n0: raw.ds_organizacao_n0,
                    co_organizacao_n1: raw.co_organizacao_n1,
                    ds_organizacao_n1: raw.ds_organizacao_n1,
                    co_organizacao_n2: raw.co_organizacao_n2,
                    ds_organizacao_n2: raw.ds_organizacao_n2,
                    co_organizacao_n3: raw.co_organizacao_n3,
                    ds_organizacao_n3: raw.ds_organizacao_n3,
                }

                await transformRawOrganizacoes(rawOrganizacoes);
            } else {
                log.error(`[ERRO] Não foi possível transformar & persistir o objeto de Conta Contábil.`);
            }
        }

        return newDepreciacoes;
    } catch (error: any) {
        log.fatal({ data: error }, `[FATAL] Falha ao transformar objetos.`);
        return [];
    }
}