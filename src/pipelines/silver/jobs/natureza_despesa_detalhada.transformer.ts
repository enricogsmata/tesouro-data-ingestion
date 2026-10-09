import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtDemais } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Modalidade_Aplicacao, Natureza_Despesa_Detalhada } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

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
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de natureza da despesa detalhada.`);
    }
}

function transform(item: RawDemaisCustos): NewNaturezaDespesaDetalhada | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.co_natureza_despesa_deta || item.id_moap_nade === null || item.id_moap_nade === undefined) {
            return null;
        }

        const moapCode = Number(item.id_moap_nade);
        if (isNaN(moapCode)) return null;

        return {
            co_natureza_despesa_deta: String(item.co_natureza_despesa_deta).trim(),
            no_natureza_despesa_deta: item.no_natureza_despesa_deta ? String(item.no_natureza_despesa_deta).trim() : null,
            id_categoria_economica_nade: item.id_categoria_economica_nade ? String(item.id_categoria_economica_nade).trim() : null,
            id_grupo_despesa_nade: item.id_grupo_despesa_nade ? String(item.id_grupo_despesa_nade).trim() : null,
            id_moap_nade: moapCode,
            id_elemento_despesa_nade: item.id_elemento_despesa_nade ? String(item.id_elemento_despesa_nade).trim() : null,
            id_subitem_nade: item.id_subitem_nade ? String(item.id_subitem_nade).trim() : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados de natureza da despesa detalhada.`);
        return null;
    }
}

async function save(transformed: NewNaturezaDespesaDetalhada) {
    const log = logger.forMethod('save');
    try {
        // Garantir Modalidade de Aplicação (inclusive para valores negativos como -8)
        if (transformed.id_moap_nade !== null) {
            await silverDB
                .insert(Modalidade_Aplicacao)
                .values({
                    co_modalidade_aplicacao: transformed.id_moap_nade,
                    ds_modalidade_aplicacao: 'Não Informada',
                })
                .onDuplicateKeyUpdate({
                    set: {
                        co_modalidade_aplicacao: sql`values(${Modalidade_Aplicacao.co_modalidade_aplicacao})`,
                    }
                });
        }

        await silverDB
            .insert(Natureza_Despesa_Detalhada)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    no_natureza_despesa_deta: sql`COALESCE(values(${Natureza_Despesa_Detalhada.no_natureza_despesa_deta}), ${Natureza_Despesa_Detalhada.no_natureza_despesa_deta})`,
                    id_categoria_economica_nade: sql`COALESCE(values(${Natureza_Despesa_Detalhada.id_categoria_economica_nade}), ${Natureza_Despesa_Detalhada.id_categoria_economica_nade})`,
                    id_grupo_despesa_nade: sql`COALESCE(values(${Natureza_Despesa_Detalhada.id_grupo_despesa_nade}), ${Natureza_Despesa_Detalhada.id_grupo_despesa_nade})`,
                    id_moap_nade: sql`values(${Natureza_Despesa_Detalhada.id_moap_nade})`,
                    id_elemento_despesa_nade: sql`COALESCE(values(${Natureza_Despesa_Detalhada.id_elemento_despesa_nade}), ${Natureza_Despesa_Detalhada.id_elemento_despesa_nade})`,
                    id_subitem_nade: sql`COALESCE(values(${Natureza_Despesa_Detalhada.id_subitem_nade}), ${Natureza_Despesa_Detalhada.id_subitem_nade})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de natureza de despesa detalhada.`);
        throw error;
    }
}