import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs2CustosTtTransferencias } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { esferaOrcamentariaTransformerOrchestrator } from "./esfera_orcamentaria.transformer.js";
import { resultadoPrimarioTransformerOrchestrator } from "./resultado_primario.transformer.js";
import { Transferencia } from "../../../database/silver_schema.js";
import { asc, sql } from "drizzle-orm";

type RawTransferencia = typeof rawDs2CustosTtTransferencias.$inferSelect;
type NewTransferencia = typeof Transferencia.$inferInsert;

const logger = createLogger(import.meta.url);

export async function transferenciaTransformerOrchestrator() {
    const log = logger.forMethod('transferenciaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawTransferencia[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewTransferencia[] = await transform(raw);

            if (transformed.length > 0) {
                await save(transformed);
            } else {
                log.error({ data: JSON.stringify(transformed, null, 4) }, `Lote sem dados tratados válidos.`);
            }
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawTransferencia[]> {
    const log = logger.forMethod('load');

    try {
        const raw: RawTransferencia[] = await bronzeDB
            .select()
            .from(rawDs2CustosTtTransferencias)
            // 1. Ordenação explícita para garantir estabilidade da paginação
            .orderBy(asc(rawDs2CustosTtTransferencias.id))
            .offset(index * BATCH_SIZE)
            .limit(BATCH_SIZE);

        return raw;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawTransferencia[]): Promise<NewTransferencia[]> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewTransferencia[] = [];
        for (const raw of rawItems) {
            // 1. Execução sequencial dos orquestradores pai/dependências
            await naturezaJuridicaTransformerOrchestrator(raw as any);
            await esferaOrcamentariaTransformerOrchestrator(raw as any);
            await resultadoPrimarioTransformerOrchestrator(raw as any);
            
            // 2. Persistência/recuperação das Organizações
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

            // 3. Validação das FKs obrigatórias
            if (
                organizacoes &&
                organizacoes.organizacao_n0 !== null &&
                organizacoes.organizacao_n1 !== null &&
                organizacoes.organizacao_n2 !== null &&
                organizacoes.organizacao_n3 !== null &&
                raw.co_esfera_orcamentaria !== null &&
                raw.co_resultado_eof !== null
            ) {
                const newTransferencia: NewTransferencia = {
                    co_organizacao_n0: organizacoes.organizacao_n0,
                    co_organizacao_n1: organizacoes.organizacao_n1,
                    co_organizacao_n2: organizacoes.organizacao_n2,
                    co_organizacao_n3: organizacoes.organizacao_n3,
                    co_modalidade_aplicacao: null, // Ausente nos dados brutos, aceita null no schema Silver
                    co_esfera_orcamentaria: Number(raw.co_esfera_orcamentaria),
                    co_resultado_eof: Number(raw.co_resultado_eof),
                    va_custo_transferencias: raw.va_custo_transferencias ?? null,
                };
                
                transformed.push(newTransferencia);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return [];
    }
}

async function save(transformed: NewTransferencia[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(Transferencia)
            .values(transformed)
            .onDuplicateKeyUpdate({
                set: {
                    co_organizacao_n0: sql`values(${Transferencia.co_organizacao_n0})`,
                    co_organizacao_n1: sql`values(${Transferencia.co_organizacao_n1})`,
                    co_organizacao_n2: sql`values(${Transferencia.co_organizacao_n2})`,
                    co_organizacao_n3: sql`values(${Transferencia.co_organizacao_n3})`,
                    co_modalidade_aplicacao: sql`values(${Transferencia.co_modalidade_aplicacao})`,
                    co_esfera_orcamentaria: sql`values(${Transferencia.co_esfera_orcamentaria})`,
                    co_resultado_eof: sql`values(${Transferencia.co_resultado_eof})`,
                    va_custo_transferencias: sql`values(${Transferencia.va_custo_transferencias})`,
                }
            });
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência.`);
    }
}