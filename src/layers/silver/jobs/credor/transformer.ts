import path from "path";
import { fileURLToPath } from "url";
import { type RawPvl } from "../pvl/loader.js";
import type { Credor, NewCredor } from "../../../../database/types.js";
import { logger } from "../../../../services/logs.js";
import { getExistingCredor, persistNewCredor } from "./repository.js";

const module = path.basename(fileURLToPath(import.meta.url));
var context: string;

/**
 * 1° Verifica se já existe um credor no banco de dados e, se não, gera um novo credor e persiste
 * @param rawPvl - Conteúdo bruto do pvl no qual o credor está associado
 * @returns - O ID do Credor inserido / existente OU nulo em caso de erro
 */
export async function buildOrGetCredorEntity(rawPvl: RawPvl): Promise<number | null> {
    context = 'buildCredorEntity';

    if (!rawPvl) {
        logger.error({module: module, context: context}, `[ERRO] O objeto "raw pvl" é nulo ou indefinido.`);
        return null;
    }

    const existingCredor = await getExistingCredor(rawPvl.credor);
    if (existingCredor) return existingCredor.idCredor;

    try {
        const newCredor: NewCredor = {
            tipo: rawPvl.tipoCredor ?? '',
            credor: rawPvl.credor ?? '',
            createdAt: new Date(),
        }

        return await persistNewCredor(newCredor);
    } catch (error) {
        logger.fatal({module: module, context: context, data: error}, `[ERRO] Ocorreu uma falha ao gerar uma nova entidade de "credor"`);
        return null;
    }
}