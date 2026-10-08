import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Conta_Contabil } from "../../../database/silver_schema.js";
import { createLogger } from "../../../services/logs.js";

type RawContaContabil = typeof Conta_Contabil.$inferInsert;

const logger = createLogger(import.meta.url);

export async function contaContabilTransformerOrchestrator(raw: any): Promise<number | null> {
    const log = logger.forMethod('contaContabilTransformerOrchestrator');

    try {
        const transformed: RawContaContabil | null = transform(raw);

        if (!transformed) {
            return null;
        }

        await save(transformed);
        return transformed.cod_conta_contabil;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(raw: any): RawContaContabil | null {
    const log = logger.forMethod('transform');
    try {
        if (raw.id_conta_contabil) {
            return {
                cod_conta_contabil: Number(raw.id_conta_contabil),
                desc_conta_contabil: raw.no_conta_contabil ?? null,
                classe_conta: null,
            };
        } else if (raw.conta_contabil) {
            return {
                cod_conta_contabil: Number(raw.conta_contabil),
                desc_conta_contabil: null,
                classe_conta: raw.classe_conta ? Number(raw.classe_conta) : null,
            };
        }
        return null;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: RawContaContabil) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Conta_Contabil)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}