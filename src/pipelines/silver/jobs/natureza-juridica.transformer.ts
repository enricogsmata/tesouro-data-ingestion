import { createLogger } from "../../../services/logs.js";
import type { RawDepreciacao } from "./depreciacao.transformer.js";
import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Natureza_Juridica } from "../../../database/silver_schema.js";

type RawNaturezaJuridica = typeof Natureza_Juridica.$inferInsert;

const logger = createLogger(import.meta.url);

export async function naturezaJuridicaTransformerOrchestrator(raw: RawDepreciacao) {
    const log = logger.forMethod('naturezaJuridicaTransformerOrchestrator');
    try {
        const transformed: RawNaturezaJuridica | null = transform(raw);

        if (!transformed) {
            log.error({ data: JSON.stringify(raw, null, 4) }, `Dados transformados inválidos!`);
            return;
        }

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawDepreciacao): RawNaturezaJuridica | null {
    const log = logger.forMethod('transform');
    try {
        const rawwNaturezaJuridica: RawNaturezaJuridica = {
            co_natureza_juridica: item.co_natureza_juridica!,
            ds_natureza_juridica: item.ds_natureza_juridica,
        }

        return rawwNaturezaJuridica;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: RawNaturezaJuridica) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Natureza_Juridica)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}