import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDemais } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Natureza_Despesa_Detalhada } from "../../../database/silver_schema.js";

type RawDemaisCustos = typeof rawDs2CustosTtDemais.$inferSelect;
type NewNaturezaDespesaDetalhada = typeof Natureza_Despesa_Detalhada.$inferInsert;

const logger = createLogger(import.meta.url);

export async function naturezaDespesaDetalhadaTransformerOrchestrator(raw: RawDemaisCustos) {
    const log = logger.forMethod('naturezaDespesaDetalhadaTransformerOrchestrator');
    try {
        const transformed: NewNaturezaDespesaDetalhada | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawDemaisCustos): NewNaturezaDespesaDetalhada | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.co_natureza_despesa_deta || !item.id_moap_nade) return null;

        return {
            co_natureza_despesa_deta: item.co_natureza_despesa_deta,
            no_natureza_despesa_deta: item.no_natureza_despesa_deta,
            id_categoria_economica_nade: item.id_categoria_economica_nade,
            id_grupo_despesa_nade: item.id_grupo_despesa_nade,
            id_moap_nade: Number(item.id_moap_nade),
            id_elemento_despesa_nade: item.id_elemento_despesa_nade,
            id_subitem_nade: item.id_subitem_nade,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewNaturezaDespesaDetalhada) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Natureza_Despesa_Detalhada)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}