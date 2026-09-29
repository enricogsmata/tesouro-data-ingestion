import type { NewCambio } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { loadRawCambios } from "./loader.js";
import { persistNewCambios } from "./repository.js";
import { transformRawCambios } from "./transformer.js";

const logger = createLogger(import.meta.url);
let context: string;

export async function cambioJobOrchestrator() {
    context = 'cambioJobOrchestrator';
    const rawData: any[] = await loadRawCambios();

    if (rawData.length === 0) {
        logger.error({ context: context, data: `RAW DATA: ${rawData}` }, `[ERRO] Dados brutos do endpoint inválidos.`);
        return;
    }

    const newCambios: NewCambio[] = await transformRawCambios(rawData);

    if (newCambios.length === 0) {
        logger.error({ context: context, data: `NEW CAMBIOS: ${newCambios}` }, `[ERRO] Dados tratados inválidos.`);
    }

    await persistNewCambios(newCambios);
}