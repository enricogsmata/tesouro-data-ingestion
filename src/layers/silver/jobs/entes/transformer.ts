/*
import path from "path";
import type { NewEnte } from "../../../../database/types.js";
import { createAppLogger } from "../../../../services/logs.js";
import { getEntesRawResponse, type RawEnte } from "./loader.js";
import { fileURLToPath } from "url";

const module = path.basename(fileURLToPath(import.meta.url));
var context: string;
const logger = createAppLogger();

export async function buildEnteEntities(): Promise<NewEnte[] | null> {
    context = 'buildEnteEntity';

    const rawEntes: RawEnte[] | undefined = await getEntesRawResponse();
    if (!rawEntes) {
        logger.error({ module: module, context: context }, `[ERRO] Dados brutos do endpoint não foram recebidos.`);
        return null;
    }

    try {
        let newEntes: NewEnte[] = [];
        for (const rawEnte of rawEntes) {
            const newEnte: NewEnte = {
            }
        }
    } catch (error) {
        
}
}
*/