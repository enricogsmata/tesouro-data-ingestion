import type { NewContaContabil } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";
import type { RawDepreciacao } from "../transformer.js";
import { persistNewContaContabil } from "./repository.js";

const logger = createLogger(import.meta.url);

export async function transformRawCC(rawDepreciacao: RawDepreciacao): Promise<boolean> {
    const log = logger.forMethod('transformRawCC');
    try {
        const newContaContabil: NewContaContabil = {
            codContaContabil: rawDepreciacao.id_conta_contabil,
            descContaContabil: rawDepreciacao.no_conta_contabil,
            classeConta: null,
        }

        await persistNewContaContabil(newContaContabil);
        return true;
    } catch (error: any) {
        log.fatal(`[FATAL] Falha ao transformar objeto.`);
        return false;
    }
}