import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Conta_Contabil } from "../../../database/silver_schema.js";
import { createLogger } from "../../../services/logs.js";
import { sql } from "drizzle-orm";

type RawContaContabil = typeof Conta_Contabil.$inferInsert;

const logger = createLogger(import.meta.url);

export async function contaContabilTransformerOrchestrator(raw: any): Promise<number | null> {
    const log = logger.forMethod('contaContabilTransformerOrchestrator');

    try {
        const transformed: RawContaContabil | null = transform(raw);

        if (!transformed) {
            return null;
        }

        await save(transformed);
        return transformed.cod_conta_contabil;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(raw: any): RawContaContabil | null {
    const log = logger.forMethod('transform');
    try {
        // Extrai o código da conta testando se o valor existe (independente de ser 0 ou string)
        const rawCod = raw.id_conta_contabil ?? raw.conta_contabil ?? raw.cod_conta_contabil;

        if (rawCod === undefined || rawCod === null || rawCod === '') {
            return null;
        }

        const cod = Number(rawCod);
        if (isNaN(cod)) return null;

        // Recupera a descrição e classe de qualquer propriedade enviada no payload
        const desc = raw.no_conta_contabil ?? raw.desc_conta_contabil ?? null;
        const rawClasse = raw.classe_conta !== undefined && raw.classe_conta !== null ? Number(raw.classe_conta) : null;
        const classe = rawClasse !== null && !isNaN(rawClasse) ? rawClasse : null;

        return {
            cod_conta_contabil: cod,
            desc_conta_contabil: desc ? String(desc).trim() : null,
            classe_conta: classe,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar dados brutos.`);
        return null;
    }
}

async function save(transformed: RawContaContabil) {
    const log = logger.forMethod('save');
    try {
        await silverDB
            .insert(Conta_Contabil)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    // Atualiza a descrição/classe se o novo valor não for NULL
                    desc_conta_contabil: sql`COALESCE(values(${Conta_Contabil.desc_conta_contabil}), ${Conta_Contabil.desc_conta_contabil})`,
                    classe_conta: sql`COALESCE(values(${Conta_Contabil.classe_conta}), ${Conta_Contabil.classe_conta})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}