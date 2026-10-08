import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtPessoalAtivo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Sexo } from "../../../database/silver_schema.js";

type RawCustoAtivo = typeof rawDs2CustosTtPessoalAtivo.$inferSelect;
type NewSexo = typeof Sexo.$inferInsert;

const logger = createLogger(import.meta.url);

export async function sexoTransformerOrchestrator(raw: RawCustoAtivo) {
    const log = logger.forMethod('sexoTransformerOrchestrator');
    try {
        const transformed: NewSexo | null = transform(raw);

        if (!transformed) return;

        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawCustoAtivo): NewSexo | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.in_sexo) return null;

        return {
            in_sexo: item.in_sexo,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewSexo) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Sexo)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}