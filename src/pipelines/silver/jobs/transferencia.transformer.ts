import { db } from "../../../database/dbConnection.js";
import { Transferencia, rawDs2CustosTtTransferencias } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { organizacaoTransformerOrchestrator } from "./organizacao.transformer.js";
import { naturezaJuridicaTransformerOrchestrator } from "./natureza-juridica.transformer.js";
import { esferaOrcamentariaTransformerOrchestrator } from "./esfera_orcamentaria.transformer.js";
import { resultadoPrimarioTransformerOrchestrator } from "./resultado_primario.transformer.js";

type RawTransferencia = typeof rawDs2CustosTtTransferencias.$inferSelect;
type NewTransferencia = typeof Transferencia.$inferInsert;
const logger = createLogger(import.meta.url);

export async function transferenciaTransformerOrchestrator() {
    const log = logger.forMethod('transferenciaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawTransferencia[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewTransferencia[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawTransferencia[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await db.select().from(rawDs2CustosTtTransferencias).offset(nextOffset).limit(BATCH_SIZE) as RawTransferencia[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawTransferencia[]): Promise<NewTransferencia[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewTransferencia[] = [];
        for (const raw of rawItems) {
            await naturezaJuridicaTransformerOrchestrator(raw as any);
            await esferaOrcamentariaTransformerOrchestrator(raw);
            await resultadoPrimarioTransformerOrchestrator(raw);
            
            const organizacoes = await organizacaoTransformerOrchestrator(raw);

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
                    co_modalidade_aplicacao: null, // Ausente no raw data, Nullable no schema Silver atualizado
                    co_esfera_orcamentaria: Number(raw.co_esfera_orcamentaria),
                    co_resultado_eof: Number(raw.co_resultado_eof),
                    va_custo_transferencias: raw.va_custo_transferencias ?? null,
                }
                
                transformed.push(newTransferencia);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewTransferencia[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Transferencia)
            .ignore()
            .values(transformed)
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}