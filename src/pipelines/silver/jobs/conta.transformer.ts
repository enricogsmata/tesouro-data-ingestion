import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtRreo } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { Conta } from "../../../database/silver_schema.js";

type RawRreo = typeof rawDs4SiconfiTtRreo.$inferSelect;
type NewConta = typeof Conta.$inferInsert;

const logger = createLogger(import.meta.url);

export async function contaTransformerOrchestrator(raw: RawRreo) {
    const log = logger.forMethod('contaTransformerOrchestrator');
    try {
        const transformed = transform(raw);
        if (!transformed) return;
        await save(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
    }
}

function transform(item: RawRreo): NewConta | null {
    const log = logger.forMethod('transform');
    try {
        if (!item.cod_conta || !item.rotulo) return null;
        return {
            cod_conta: item.cod_conta,
            conta: item.conta ?? null,
            rotulo: item.rotulo,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: NewConta) {
    const log = logger.forMethod('save');
    try {
        await silverDB.insert(Conta).ignore().values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}