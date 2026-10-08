import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { rawDs4SiconfiTtDca } from "../../../database/bronze_schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { instituicaoTransformerOrchestrator } from "./instituicao.transformer.js";
import { populacaoAnualEnteTransformerOrchestrator } from "./populacao_anual_ente.transformer.js";
import { anexoTransformerOrchestrator } from "./anexo.transformer.js";
import { rotuloTransformerOrchestrator } from "./rotulo.transformer.js";
import { colunaTransformerOrchestrator } from "./coluna.transformer.js";
import { contaTransformerOrchestrator } from "./conta.transformer.js";
import { DCA } from "../../../database/silver_schema.js";

type RawDca = typeof rawDs4SiconfiTtDca.$inferSelect;
type NewDca = typeof DCA.$inferInsert;
const logger = createLogger(import.meta.url);

export async function dcaTransformerOrchestrator() {
    const log = logger.forMethod('dcaTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawDca[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewDca[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawDca[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await bronzeDB.select().from(rawDs4SiconfiTtDca).offset(nextOffset).limit(BATCH_SIZE) as RawDca[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawDca[]): Promise<NewDca[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewDca[] = [];
        for (const raw of rawItems) {
            raw.rotulo = raw.rotulo ?? "Principal";

            await instituicaoTransformerOrchestrator(raw as any);
            await populacaoAnualEnteTransformerOrchestrator(raw as any);
            
            const idAnexo = await anexoTransformerOrchestrator({
                ...raw,
                demonstrativo: null,
                esfera: null
            } as any);
            
            if (idAnexo) {
                await rotuloTransformerOrchestrator(raw as any, idAnexo);
                await colunaTransformerOrchestrator(raw as any);
                await contaTransformerOrchestrator(raw as any);
            }

            if (
                raw.exercicio !== null &&
                raw.instituicao !== null &&
                raw.cod_ibge !== null &&
                raw.coluna !== null &&
                raw.cod_conta !== null
            ) {
                const newDca: NewDca = {
                    exercicio: raw.exercicio,
                    instituicao: raw.instituicao,
                    cod_ibge: raw.cod_ibge,
                    coluna: raw.coluna,
                    cod_conta: raw.cod_conta,
                    valor: raw.valor ?? null,
                };
                
                transformed.push(newDca);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewDca[]) {
    const log = logger.forMethod('save');

    try {
        await silverDB
            .insert(DCA)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}