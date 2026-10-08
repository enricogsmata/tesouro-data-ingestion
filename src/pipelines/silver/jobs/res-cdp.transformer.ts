import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1TtResCdp } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE, parseStringToDate } from "../utils.js";
import { CDP } from "../../../database/silver_schema.js";

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
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Dados tratados inválidos!`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawCDP[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawCDP[] = await bronzeDB
            .select()
            .from(rawDs1TtResCdp)
            .offset(index * 1000)
            .limit(BATCH_SIZE);

        return raw;
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

            if (item.data_base)
                dataBase = parseStringToDate(item.data_base, 'dd/MM/yyyy') ?? null;

            if (item.data_status)
                dataStatus = parseStringToDate(item.data_status, 'dd/MM/yyyy HH/mm/ss') ?? null;

            const newCDP: NewCDP = {
                data_base: dataBase,
                data_status: dataStatus,
                id_pleito: item.id_pleito,
                situacao_ente: item.situacao_ente,
                status: item.status,
            }

            transformed.push(newCDP);
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
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}