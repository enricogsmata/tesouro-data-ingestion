import path from "path";
import { fileURLToPath } from "url";
import type { NewPvl } from "../../../../database/types.js";
import { getPvlRawResponse, type RawPvl } from "./loader.js";
import { logger } from "../../../../services/logs.js";
import { buildOrGetCredorEntity } from "../credor/transformer.js";
import { parseStringToData } from "../../helpers.js";

const module = path.basename(fileURLToPath(import.meta.url));
var context: string;

/**
 * Instancia entidades de pvl a partir de dados brutos extraídos
 * @returns - Conjunto de Pvl's instanciados OU nulo em caso de erro
 */
export async function buildPvlEntities(): Promise<NewPvl[] | null> {
    context = 'buildPvlEntities';
    const rawPvls: RawPvl[] | undefined = await getPvlRawResponse();

    if (!rawPvls) {
        logger.error({ module: module, context: context }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return null;
    }

    try {
        let newPvls: NewPvl[] = [];
        for (const rawPvl of rawPvls) {
            const parsedDataProtocolo = parseStringToData(rawPvl.dataProtocolo);
            const parsedDataStatus = parseStringToData(rawPvl.dataStatus);
            const idCredor: number | null = await buildOrGetCredorEntity(rawPvl);

            if (parsedDataProtocolo && parsedDataStatus && idCredor) {
                const newPvl: NewPvl = {
                    idPleito: rawPvl.idPleito,
                    codIbge: rawPvl.codIbge,
                    idcredor: idCredor,
                    numpvl: rawPvl.numPvl,
                    status: rawPvl.status,
                    numProcesso: rawPvl.numProcesso,
                    dataProtocolo: parsedDataProtocolo,
                    tipoOperacao: rawPvl.tipoOperacao,
                    finalidade: rawPvl.finalidade,
                    moeda: rawPvl.moeda,
                    valor: rawPvl.valor,
                    pvlAssocDivida: rawPvl.pvlAssocDivida,
                    pvlContratadocredor: rawPvl.pvlContratadoCredor,
                    dataStatus: parsedDataStatus,
                    createdAt: new Date(),
                }

                newPvls.push(newPvl);
            } else {
                logger.error({ module: module, context: context, data: `${JSON.stringify(rawPvl, null, 4)}` }, `[ERRO] Não foi possível construir a entidade de PVL: data malformada OU credor não persistido.`);
            }
        }

        return newPvls;
    } catch (error) {
        logger.fatal({ module: module, context: context }, `[ERRO] Ocorreu um erro durante a construção de novas entidades de PVL.`);
        return null;
    }
}

