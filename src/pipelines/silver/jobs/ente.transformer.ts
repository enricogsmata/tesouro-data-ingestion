import { db } from "../../../database/dbConnection.js";
import { Ente, rawDs4SiconfiTtEntes } from "../../../database/schema.js";
import { createLogger } from "../../../services/logs.js";
import { BATCH_SIZE } from "../utils.js";
import { populacaoAnualEnteTransformerOrchestrator } from "./populacao_anual_ente.transformer.js";

type RawEnte = typeof rawDs4SiconfiTtEntes.$inferSelect;
type NewEnte = typeof Ente.$inferInsert;
const logger = createLogger(import.meta.url);

export async function enteTransformerOrchestrator() {
    const log = logger.forMethod('enteTransformerOrchestrator');

    try {
        for (let index = 0; ; index++) {
            const raw: RawEnte[] = await load(index);
            if (raw.length === 0) return;

            const transformed: NewEnte[] | null = await transform(raw);

            if (transformed && transformed.length > 0)
                await save(transformed); 
            else
                log.error({data: JSON.stringify(transformed, null, 4) ?? transformed}, `Lista de dados tratados nula ou vazia.`);
        }
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na conversão de dados.`);
    }
}

async function load(index: number): Promise<RawEnte[]> {
    const log = logger.forMethod('load');

    try {
        const nextOffset = index * BATCH_SIZE;
        const response = await db.select().from(rawDs4SiconfiTtEntes).offset(nextOffset).limit(BATCH_SIZE) as RawEnte[];
        return response;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao carregar dados brutos.`);
        return [];
    }
}

async function transform(rawItems: RawEnte[]): Promise<NewEnte[] | null> {
    const log = logger.forMethod('transform');

    try {
        let transformed: NewEnte[] = [];
        for (const raw of rawItems) {
            
            await populacaoAnualEnteTransformerOrchestrator({
                cod_ibge: raw.cod_ibge,
                exercicio: raw.an_exercicio,
                populacao: raw.populacao
            } as any);

            if (
                raw.cod_ibge !== null &&
                raw.ente !== null
            ) {
                const newEnte: NewEnte = {
                    cod_ibge: raw.cod_ibge,
                    ente: raw.ente,
                    capital: raw.capital ?? null,
                    regiao: raw.regiao ?? null,
                    uf: raw.uf ?? null,
                    esfera: raw.esfera ?? null,
                    co_cnpj: raw.co_cnpj ?? null,
                };
                
                transformed.push(newEnte);
            }
        }

        return transformed;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha ao transformar objeto.`);
        return null;
    }
}

async function save(transformed: NewEnte[]) {
    const log = logger.forMethod('save');

    try {
        await db
            .insert(Ente)
            .ignore()
            .values(transformed);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
    }
}