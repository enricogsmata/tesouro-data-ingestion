import { db } from "../../../../../database/dbConnection.js";
import { cronogramaPagamentos } from "../../../../../database/schema.js";
import type { NewCronogramaPagamentos } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function persistNewCPs(newCronPagamentos: NewCronogramaPagamentos[]) {
    context = 'persistCronogramaPagamentosEntity';

    try {
        await db.insert(cronogramaPagamentos).values(newCronPagamentos);
    } catch (error) {
        logger.error({  context: context }, `[ERRO] Falha ao inserir entidade de cronograma de pagamentos no banco de dados.`);
    }
}