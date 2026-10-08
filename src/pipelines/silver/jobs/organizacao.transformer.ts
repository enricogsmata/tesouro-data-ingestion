import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Organizacao } from "../../../database/silver_schema.js";
import { createLogger } from "../../../services/logs.js";

export type Organizacoes = {
    organizacao_n0: number,
    organizacao_n1: number | null,
    organizacao_n2: number | null,
    organizacao_n3: number | null,
    organizacao_n4: number | null,
    organizacao_n5: number | null,
    organizacao_n6: number | null,
}

type NewOrganizacao = typeof Organizacao.$inferInsert;

const logger = createLogger(import.meta.url);

export async function organizacaoTransformerOrchestrator(raw: any): Promise<Organizacoes | null> {
    const log = logger.forMethod('organizacaoTransformerOrchestrator');

    try {
        const transformed: NewOrganizacao[] = transform(raw);

        if (transformed.length === 0) {
            log.error(`Dados transformados vazios!`);
            return null;
        }

        await save(transformed);

        // Mapeia e retorna os IDs dos níveis processados
        const result: Organizacoes = {
            organizacao_n0: Number(raw.co_organizacao_n0) ?? raw.co_organizacao_n0,
            organizacao_n1: raw.co_organizacao_n1 ? Number(raw.co_organizacao_n1) : null,
            organizacao_n2: raw.co_organizacao_n2 ? Number(raw.co_organizacao_n2) : null,
            organizacao_n3: raw.co_organizacao_n3 ? Number(raw.co_organizacao_n3) : null,
            organizacao_n4: raw.co_organizacao_n4 ? Number(raw.co_organizacao_n4) : null,
            organizacao_n5: raw.co_organizacao_n5 ? Number(raw.co_organizacao_n5) : null,
            organizacao_n6: raw.co_organizacao_n6 ? Number(raw.co_organizacao_n6) : null,
        };

        return result;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador.`);
        return null;
    }
}

function transform(raw: any): NewOrganizacao[] {
    const log = logger.forMethod(`transform`);

    try {
        const newOrganizacoes: NewOrganizacao[] = [];

        // Percorre todos os níveis (0 a 6) para incluir todas as organizações existentes no payload
        for (let nivel = 0; nivel <= 6; nivel++) {
            const coOrganizacao = raw[`co_organizacao_n${nivel}`];
            const dsOrganizacao = raw[`ds_organizacao_n${nivel}`];

            if (coOrganizacao) {
                newOrganizacoes.push({
                    co_organizacao: coOrganizacao,
                    ds_organizacao: dsOrganizacao,
                    in_area_atuacao: raw.in_area_atuacao ?? null,
                    co_natureza_juridica: raw.co_natureza_juridica ?? null,
                    co_organizacao_superior: nivel > 0 ? raw[`co_organizacao_n${nivel - 1}`] : (raw.co_organizacao_superior ?? null),
                    nivel_organizacao: nivel
                });
            }
        }

        return newOrganizacoes;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação dos dados brutos.`);
        return [];
    }
}

async function save(transformed: NewOrganizacao[]) {
    const log = logger.forMethod('save');
    try {
        if (transformed.length === 0) return [];

        await silverDB
            .insert(Organizacao)
            .ignore()
            .values(transformed)

    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na persistência.`);
        throw error;
    }
}