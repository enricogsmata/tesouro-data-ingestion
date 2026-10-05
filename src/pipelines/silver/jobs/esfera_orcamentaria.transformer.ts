import { db } from "../../../database/dbConnection.js";
import { Esfera_Orcamentaria, rawDs2CustosTtTransferencias } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";

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
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawTransferencia): NewEsferaOrcamentaria | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.co_esfera_orcamentaria) return null;

        return {
            co_esfera_orcamentaria: Number(item.co_esfera_orcamentaria),
            ds_esfera_orcamentaria: item.ds_esfera_orcamentaria,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewEsferaOrcamentaria) {
    const log = logger.forMethod('save');
    try {
        await db
            .insert(Esfera_Orcamentaria)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}