import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1TtResCdp, rawDs1SadipemTtPvl } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE, parseStringToDate } from "../utils.js";
import { CDP } from "../../../database/silver_schema.js";
import { eq, asc, sql } from "drizzle-orm";

type RawCDP = typeof rawDs1TtResCdp.$inferSelect;
type NewCDP = typeof CDP.$inferInsert;

const logger = createLogger(import.meta.url);

export async function cdpOrchestrator() {
    const log = logger.forMethod('cdpOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawCDP[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewCDP[] = await transform(raw);
            if (transformed.length > 0) {
                await save(transformed);
            } else {
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Lote sem dados tratados válidos.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawCDP[]> {
    const log = logger.forMethod('load');

    try {
        const queryResult = await bronzeDB
            .select()
            .from(rawDs1TtResCdp)
            // 1. Filtra id_pleito que não existe no cadastro central
            .innerJoin(
                rawDs1SadipemTtPvl,
                eq(rawDs1TtResCdp.id_pleito, rawDs1SadipemTtPvl.id_pleito)
            )
            // 2. Ordenação explícita para evitar registros reordenados durante a paginação
            .orderBy(asc(rawDs1TtResCdp.id))
            // 3. Offset dinâmico baseado no BATCH_SIZE real
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return queryResult.map(row => row.raw_ds1_tt_res_cdp);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no carregamento de dados brutos.`);
        return [];
    }
}

async function transform(raw: RawCDP[]): Promise<NewCDP[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewCDP[] = [];
        for (const item of raw) {
            let dataBase: Date | null = null;
            let dataStatus: Date | null = null;

            if (item.data_base) {
                // Reatribuição correta da string tratada com trim()
                let cleanDataBase = item.data_base.trim();
                if (cleanDataBase.length === 4) cleanDataBase = `01/01/${cleanDataBase}`;
                dataBase = parseStringToDate(cleanDataBase, 'dd/MM/yyyy') ?? null;
            }

            if (item.data_status) {
                dataStatus = parseStringToDate(item.data_status, 'dd/MM/yyyy HH/mm/ss') ?? null;
            }

            // Garante que as duas chaves primárias (id_pleito e data_base) são válidas
            if (item.id_pleito && dataBase) {
                const newCDP: NewCDP = {
                    data_base: dataBase,
                    data_status: dataStatus,
                    id_pleito: item.id_pleito,
                    situacao_ente: item.situacao_ente,
                    status: item.status,
                };

                transformed.push(newCDP);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewCDP[]) {
    const log = logger.forMethod(`save`);

    try {
        await silverDB
            .insert(CDP)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    data_base: sql`values(${CDP.data_base})`,
                    data_status: sql`values(${CDP.data_status})`,
                    id_pleito: sql`values(${CDP.id_pleito})`,
                    situacao_ente: sql`values(${CDP.situacao_ente})`,
                    status: sql`values(${CDP.status})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}