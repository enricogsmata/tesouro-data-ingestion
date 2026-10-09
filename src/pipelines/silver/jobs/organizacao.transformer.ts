import { bronzeDB, silverDB } from "../../../database/dbConnection.js";
import { Area_Atuacao, Organizacao } from "../../../database/silver_schema.js";
import { createLogger } from "../../../services/logs.js";
import { sql } from "drizzle-orm";

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

        return {
            organizacao_n0: Number(raw.co_organizacao_n0) || 0,
            organizacao_n1: raw.co_organizacao_n1 ? Number(raw.co_organizacao_n1) : null,
            organizacao_n2: raw.co_organizacao_n2 ? Number(raw.co_organizacao_n2) : null,
            organizacao_n3: raw.co_organizacao_n3 ? Number(raw.co_organizacao_n3) : null,
            organizacao_n4: raw.co_organizacao_n4 ? Number(raw.co_organizacao_n4) : null,
            organizacao_n5: raw.co_organizacao_n5 ? Number(raw.co_organizacao_n5) : null,
            organizacao_n6: raw.co_organizacao_n6 ? Number(raw.co_organizacao_n6) : null,
        };
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha no orquestrador de organização.`);
        return null;
    }
}

function transform(raw: any): NewOrganizacao[] {
    const log = logger.forMethod('transform');

    try {
        const newOrganizacoes: NewOrganizacao[] = [];

        // Loop expandido ate o nivel 7 para contemplar co_siorg_n07
        for (let nivel = 0; nivel <= 7; nivel++) {
            const coOrganizacao = raw[`co_organizacao_n${nivel}`];
            const dsOrganizacao = raw[`ds_organizacao_n${nivel}`];

            if (coOrganizacao) {
                const parentCo = nivel > 0 ? raw[`co_organizacao_n${nivel - 1}`] : (raw.co_organizacao_superior ?? null);

                newOrganizacoes.push({
                    co_organizacao: Number(coOrganizacao),
                    ds_organizacao: dsOrganizacao ? String(dsOrganizacao).trim() : null,
                    in_area_atuacao: raw.in_area_atuacao ? Number(raw.in_area_atuacao) : 0, 
                    co_natureza_juridica: raw.co_natureza_juridica ? Number(raw.co_natureza_juridica) : null,
                    co_organizacao_superior: parentCo ? Number(parentCo) : null,
                    nivel_organizacao: nivel
                });
            }
        }

        return newOrganizacoes;
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(error, null, 4) }, `Falha na transformação das organizações.`);
        return [];
    }
}

async function save(transformed: NewOrganizacao[]) {
    const log = logger.forMethod('save');
    try {
        if (transformed.length === 0) return;

        // Garante o registro padrão id 0 da Area_Atuacao
        await silverDB
            .insert(Area_Atuacao)
            .values({ in_area_atuacao: 0, ds_area_atuacao: 'Não Informada' })
            .onDuplicateKeyUpdate({ set: { ds_area_atuacao: sql`values(${Area_Atuacao.ds_area_atuacao})` } });

        // Insere sequencialmente do nivel 0 ao 7 respeitando a auto-FK
        for (const org of transformed) {
            await silverDB
                .insert(Organizacao)
                .values(org)
                .onDuplicateKeyUpdate({
                    set: {
                        ds_organizacao: sql`COALESCE(values(${Organizacao.ds_organizacao}), ${Organizacao.ds_organizacao})`,
                        co_natureza_juridica: sql`COALESCE(values(${Organizacao.co_natureza_juridica}), ${Organizacao.co_natureza_juridica})`,
                        co_organizacao_superior: sql`COALESCE(values(${Organizacao.co_organizacao_superior}), ${Organizacao.co_organizacao_superior})`,
                    }
                });
        }
    } catch (error: any) {
        log.fatal({ data: error?.cause?.message ?? error?.message }, `Falha na persistência de organização.`);
        throw error;
    }
}