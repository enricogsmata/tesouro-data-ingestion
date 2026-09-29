import type { NewCredor } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { getExistingCredor, persistNewCredor } from "./repository.js";
import type { RawPvl } from "../transformer.js";

const logger = createLogger(import.meta.url);
var context: string;

/**
 * 1° Verifica se já existe um credor no banco de dados e, se não, gera um novo credor e persiste
 * @param rawPvl - Conteúdo bruto do pvl no qual o credor está associado
 * @returns - O ID do Credor inserido / existente OU nulo em caso de erro
 */
export async function buildOrGetCredorEntity(rawPvl: RawPvl): Promise<number | null> {
    context = 'buildCredorEntity';

    if (!rawPvl) {
        logger.error({ context: context}, `[ERRO] O objeto "raw pvl" é nulo ou indefinido.`);
        return null;
    }

    const existingCredor = await getExistingCredor(rawPvl.credor);
    if (existingCredor) return existingCredor.idCredor;

    try {
        const newCredor: NewCredor = {
            tipo: rawPvl.tipo_credor ?? '',
            credor: rawPvl.credor ?? '',
            createdAt: new Date(),
        }

        return await persistNewCredor(newCredor);
    } catch (error) {
        logger.fatal({ context: context, data: error}, `[ERRO] Ocorreu uma falha ao gerar uma nova entidade de "credor"`);
        return null;
    }
}