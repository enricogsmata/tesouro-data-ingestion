import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1PvlTramitacaoDeferido, rawDs1SadipemTtPvl } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { Operacoes_Nao_Contratadas } from "../../../database/silver_schema.js";
import { asc, eq, sql } from "drizzle-orm";

type RawDeferido = typeof rawDs1PvlTramitacaoDeferido.$inferSelect;
type NewDeferido = typeof Operacoes_Nao_Contratadas.$inferInsert;

const logger = createLogger(import.meta.url);

export async function tramitacaoDeferidoOrchestrator() {
    const log = logger.forMethod('tramitacaoDeferidoOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawDeferido[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewDeferido[] = await transform(raw);
            if (transformed.length > 0) await save(transformed);
            else log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Dados tratados inválidos!`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawDeferido[]> {
    const log = logger.forMethod('load');

    try {
        const queryResult = await bronzeDB
            .select()
            .from(rawDs1PvlTramitacaoDeferido)
            .innerJoin(
                rawDs1SadipemTtPvl,
                eq(rawDs1PvlTramitacaoDeferido.id_pleito, rawDs1SadipemTtPvl.id_pleito)
            )
            .orderBy(asc(rawDs1PvlTramitacaoDeferido.id))
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return queryResult.map(row => row.raw_ds1_pvl_tramitacao_deferido);

    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no carregamento de dados brutos`);
        return [];
    }
}

async function transform(raw: RawDeferido[]): Promise<NewDeferido[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewDeferido[] = [];
        for (const item of raw) {
            if (item.id_pleito && item.pleito_nao_contratado) {
                const newDeferido: NewDeferido = {
                    id_pleito: item.id_pleito,
                    id_pleito_nao_contratado: item.pleito_nao_contratado,
                }

                transformed.push(newDeferido);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewDeferido[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Operacoes_Nao_Contratadas)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    id_pleito: sql`values(${Operacoes_Nao_Contratadas.id_pleito})`,
                    id_pleito_nao_contratado: sql`values(${Operacoes_Nao_Contratadas.id_pleito_nao_contratado})`,
                }
            })
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}