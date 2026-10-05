import { db } from "../../../database/dbConnection.js";
import { Conta_Contabil } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import type { RawDepreciacao } from "./depreciacao.transformer.js";

type RawContaContabil = typeof Conta_Contabil.$inferInsert;
type ContaContabil = typeof Conta_Contabil.$inferSelect;

const logger = createLogger(import.meta.url);

export async function contaContabilTransformerOrchestrator(raw: RawDepreciacao): Promise<number | null> {
    const log = logger.forMethod('contaContabilTransformerOrchestrator');

    try {
        const transformed: RawContaContabil | null = transform(raw);

        if (!transformed) {
            log.error(`Dado tratado inválido!`);
            return null;
        }

        await save(transformed);
        return transformed.cod_conta_contabil;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(raw: RawDepreciacao): RawContaContabil | null {
    const log = logger.forMethod('transform');
    try {
        if (raw.id_conta_contabil) {
            return {
                cod_conta_contabil: raw.id_conta_contabil,
                desc_conta_contabil: raw.no_conta_contabil,
                classe_conta: null,
            } as RawContaContabil;
        } else {
            return null;
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: RawContaContabil) {
    const log = logger.forMethod('save');
    try {
        await db
            .insert(Conta_Contabil)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}