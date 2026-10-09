import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtTransferencias } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Esfera_Orcamentaria } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawTransferencia = typeof rawDs2CustosTtTransferencias.$inferSelect;
type NewEsferaOrcamentaria = typeof Esfera_Orcamentaria.$inferInsert;

const logger = createLogger(import.meta.url);

export async function esferaOrcamentariaTransformerOrchestrator(raw: RawTransferencia) {
    const log = logger.forMethod('esferaOrcamentariaTransformerOrchestrator');
    try {
        const transformed: NewEsferaOrcamentaria | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de esfera orçamentária.`);
    }
}

function transform(item: RawTransferencia): NewEsferaOrcamentaria | null {
    const log = logger.forMethod('transform');
    try {
        if (item.co_esfera_orcamentaria === null || item.co_esfera_orcamentaria === undefined) {
            return null;
        }

        const cod = Number(item.co_esfera_orcamentaria);
        if (isNaN(cod)) return null;

        return {
            co_esfera_orcamentaria: cod,
            ds_esfera_orcamentaria: item.ds_esfera_orcamentaria ? String(item.ds_esfera_orcamentaria).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de esfera orçamentária.`);
        return null;
    }
}

async function save(transformed: NewEsferaOrcamentaria) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Esfera_Orcamentaria)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    ds_esfera_orcamentaria: sql`COALESCE(values(${Esfera_Orcamentaria.ds_esfera_orcamentaria}), ${Esfera_Orcamentaria.ds_esfera_orcamentaria})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de esfera orçamentária.`);
    }
}