import type { NewCustoAtivo, NewEscolaridade, NewFaixaEtaria, NewSexo } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { persistNewEscolaridade } from "./escolaridade/repository.js";
import { persistNewFaixaEtaria } from "./faixa_etaria/repository.js";
import { persistNewSexo } from "./sexo/repository.js";

type RawCustoAtivo = {
    co_natureza_juridica: number,
    ds_natureza_juridica: string,
    co_organizacao_n0: number,
    ds_organizacao_n0: string,
    co_organizacao_n1: number,
    ds_organizacao_n1: string,
    co_organizacao_n2: number,
    ds_organizacao_n2: string,
    co_organizacao_n3: number,
    ds_organizacao_n3: string,
    co_organizacao_n4: number,
    ds_organizacao_n4: string,
    co_organizacao_n5: number,
    ds_organizacao_n5: string,
    co_organizacao_n6: number,
    ds_organizacao_n6: string,
    an_lanc: number,
    me_lanc: number,
    in_area_atuacao: number,
    ds_area_atuacao: string,
    in_escolaridade: number,
    ds_escolaridade: string,
    in_faixa_etaria: number,
    ds_faixa_etaria: string,
    in_sexo: string,
    in_forca_trabalho: number,
    va_custo_de_pessoal: number
}

const logger = createLogger(import.meta.url);

export async function transformRawPensionistas(rawData: any[]): Promise<NewCustoAtivo[]> {
    const log = logger.forMethod('transformRawPensionistas');

    try {
        const parsedData: RawCustoAtivo[] = rawData as RawCustoAtivo[];

        let newCustosAtivos: NewCustoAtivo[] = [];
        for (const raw of parsedData) {
            const newEscolaridade: NewEscolaridade = {
                inEscolaridade: raw.in_escolaridade,
                dsEscolaridade: raw.ds_escolaridade
            }

            await persistNewEscolaridade(newEscolaridade);

            const newSexo: NewSexo = {
                inSexo: raw.in_sexo,
            }

            await persistNewSexo(newSexo);

            const newFaixaEtaria: NewFaixaEtaria = {
                inFaixaEtaria: raw.in_faixa_etaria,
                dsFaixaEtaria: raw.ds_faixa_etaria
            }

            await persistNewFaixaEtaria(newFaixaEtaria);

            const newCustoAtivo: NewCustoAtivo = {
                anLanc: String(raw.an_lanc),
                meLanc: String(raw.me_lanc),
                vaCustoDePessoal: raw.va_custo_de_pessoal,
                inForcaTrabalho: raw.in_forca_trabalho,
                inEscolaridade: raw.in_escolaridade,
                inFaixaEtaria: raw.in_faixa_etaria,
                inSexo: raw.in_sexo,
            }

            newCustosAtivos.push(newCustoAtivo);
        }
        return newCustosAtivos;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `[FATAL] Falha na transformação dos dados brutos.`);
        return [];
    }
}