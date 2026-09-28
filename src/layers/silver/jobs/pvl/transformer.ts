import type { NewPvl } from "../../../../database/types.js";
import { buildOrGetCredorEntity } from "./credor/transformer.js";
import { parseStringToData } from "../../helpers.js";
import { createLogger } from "../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

export type RawPvl = {
    id_pleito: number,
    tipo_interessado: string,
    interessado: string,
    cod_ibge: number,
    uf: string,
    num_pvl: string,
    status: string,
    num_processo?: string,
    data_protocolo?: string,
    tipo_operacao: string,
    finalidade: string,
    tipo_credor: string,
    credor: string,
    moeda: string,
    valor: number,
    pvl_assoc_divida: number,
    pvl_contratado_credor: number,
    data_status: string,
}

/**
 * Instancia entidades de pvl a partir de dados brutos extraídos
 * @returns - Conjunto de Pvl's instanciados OU nulo em caso de erro
 */
export async function buildPvlEntities(rawPvls: RawPvl[] | undefined): Promise<NewPvl[] | null> {
    context = 'buildPvlEntities';
    
    if (!rawPvls) {
        logger.error({ context: context }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return null;
    }

    try {
        let newPvls: NewPvl[] = [];
        for (const rawPvl of rawPvls) {
            const parsedDataProtocolo = parseStringToData(rawPvl.data_protocolo);
            const parsedDataStatus = parseStringToData(rawPvl.data_status);
            const idCredor: number | null = await buildOrGetCredorEntity(rawPvl);

            if (parsedDataProtocolo && parsedDataStatus && idCredor) {
                const newPvl: NewPvl = {
                    idPleito: rawPvl.id_pleito,
                    codIbge: rawPvl.cod_ibge,
                    idcredor: idCredor,
                    numpvl: rawPvl.num_pvl,
                    status: rawPvl.status,
                    numProcesso: rawPvl.num_processo,
                    dataProtocolo: parsedDataProtocolo,
                    tipoOperacao: rawPvl.tipo_operacao,
                    finalidade: rawPvl.finalidade,
                    moeda: rawPvl.moeda,
                    valor: rawPvl.valor,
                    pvlAssocDivida: rawPvl.pvl_assoc_divida,
                    pvlContratadocredor: rawPvl.pvl_contratado_credor,
                    dataStatus: parsedDataStatus,
                    createdAt: new Date(),
                }

                newPvls.push(newPvl);
            } else {
                logger.error({ context: context, data: `${JSON.stringify(rawPvl, null, 4)}` }, `[ERRO] Não foi possível construir a entidade de PVL: data malformada OU credor não persistido.`);
            }
        }

        return newPvls;
    } catch (error) {
        logger.fatal({ context: context }, `[ERRO] Ocorreu um erro durante a construção de novas entidades de PVL.`);
        return null;
    }
}

