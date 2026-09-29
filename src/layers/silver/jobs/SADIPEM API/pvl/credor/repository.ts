import type { Credor, NewCredor } from "../../../../../../database/types.js";
import { db } from "../../../../../../database/dbConnection.js";
import { credor } from "../../../../../../database/schema.js";
import { eq } from "drizzle-orm";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

/**
 * Persiste um novo credor no banco de dados
 * @param newCredor - Objeto para insert no banco de dados
 * @returns - O id numérico da entidade Credor persistida OU nulo em caso de erro
 */
export async function persistNewCredor(newCredor:NewCredor): Promise<number | null> {
    context = 'persistNewCredor';

    if (!newCredor) {
        logger.error({ context: context}, `[ERRO] O objeto "new credor" é nulo ou indefinido.`);
        return null;
    }

    const [insertedCredor] = await db.insert(credor).values(newCredor).$returningId();
    return insertedCredor?.idCredor ?? null;
}

/**
 * Retorna um credor existente ou indefinido com base na consulta no banco de dados
 * @param name - Nome do credor
 * @returns - Credor encontrado ou indefinido caso não exista
 */
export async function getExistingCredor(name:string): Promise<Credor | undefined> {
    const [existingCredor] = await db.select().from(credor).where(eq(credor.credor, name)) ?? null;
    return existingCredor;
}