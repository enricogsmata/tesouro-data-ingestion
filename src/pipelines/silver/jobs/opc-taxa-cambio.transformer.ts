import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs1OpcTaxaCambio } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE, parseStringToDate } from "../utils.js";
import { Cambio } from "../../../database/silver_schema.js";
import { sql } from "drizzle-orm";

type RawTaxaCambio = typeof rawDs1OpcTaxaCambio.$inferSelect;
type NewTaxaCambio = typeof Cambio.$inferInsert;

const logger = createLogger(import.meta.url);

export async function taxaCambioOrchestrator() {
    const log = logger.forMethod('taxaCambioOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawTaxaCambio[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewTaxaCambio[] = await transform(raw);
            if (transformed.length > 0)
                await save(transformed);
            else
                log.error({ data: JSON.stringify(transformed, null, 4) ?? transformed }, `Dados tratados inválidos!`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

async function load(index: number): Promise<RawTaxaCambio[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawTaxaCambio[] = await bronzeDB
            .select()
            .from(rawDs1OpcTaxaCambio)
            .offset(index * 1000)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no carregamento de dados brutos.`);
        return [];
    }
}

async function transform(raw: RawTaxaCambio[]): Promise<NewTaxaCambio[]> {
    const log = logger.forMethod(`transform`);

    try {
        let transformed: NewTaxaCambio[] = [];
        for (const item of raw) {
            const parsedTaxaCambio = Number(item.taxa_cambio) ?? null;

            let dataTaxaCambio: Date | null = null;
            if (item.data_taxa_cambio)
                dataTaxaCambio = parseStringToDate(item.data_taxa_cambio) ?? null;

            if (parsedTaxaCambio) {
                const newTaxaCambio: NewTaxaCambio = {
                    id_pleito: item.id_pleito,
                    data_taxa_cambio: dataTaxaCambio,
                    moeda: item.moeda,
                    taxa_cambio: parsedTaxaCambio,
                }

                if (newTaxaCambio)
                    transformed.push(newTaxaCambio);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewTaxaCambio[]) {
    const log = logger.forMethod(`save`);

    try {
        await silverDB
            .insert(Cambio)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    id_pleito: sql`values(${Cambio.id_pleito})`,
                    data_taxa_cambio: sql`values(${Cambio.data_taxa_cambio})`,
                    moeda: sql`values(${Cambio.moeda})`,
                    taxa_cambio: sql`values(${Cambio.taxa_cambio})`
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}