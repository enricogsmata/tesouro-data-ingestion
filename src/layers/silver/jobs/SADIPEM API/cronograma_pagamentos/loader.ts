import { getEndpointIdByPath, getRawItems } from "../../../helpers.js";
import { createLogger } from "../../../../../services/logs.js";

const logger = createLogger(import.meta.url);
var context: string;

export async function loadRawCPs(): Promise<any[] | null> {
    context = 'loadRawCPs';

    const endpointId = await getEndpointIdByPath('cronograma-pagamentos');

    if (!endpointId) {
        logger.error({  context: context }, `[ERRO] Id do endpoint inválido.`);
        return null;
    }

    const rawData = await getRawItems(endpointId);

    if (rawData.length === 0) {
        logger.error({  context: context }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return null;
    }

    try {
        return rawData as any[];
    } catch (error) {
        logger.error({ context: context, data: `${JSON.stringify(rawData, null, 4)}`}, `[ERRO] Falha ao converter os dados brutos para objeto tipado.`);
        return null;
    }
}