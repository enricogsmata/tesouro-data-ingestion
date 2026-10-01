import type { NewOrganizacaoN0, NewOrganizacaoN1, NewOrganizacaoN2, NewOrganizacaoN3, NewOrganizacaoN4, NewOrganizacaoN5, NewOrganizacaoN6 } from "../../../../../database/types.js";
import { createLogger } from "../../../../../services/logs.js";
import { persistNewOrgN0, persistNewOrgN1, persistNewOrgN2, persistNewOrgN3, persistNewOrgN4, persistNewOrgN5, persistNewOrgN6 } from "./repository.js";
import type { RawOrganizacao } from "./types.js";

const logger = createLogger(import.meta.url);

export async function transformRawOrganizacoes(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrganizacoes');

    try {
        if (rawOrganizacoes.co_organizacao_n0)
            transformRawOrgN0(rawOrganizacoes);
        if (rawOrganizacoes.co_organizacao_n1)
            transformRawOrgN1(rawOrganizacoes);
        if (rawOrganizacoes.co_organizacao_n2)
            transformRawOrgN2(rawOrganizacoes);
        if (rawOrganizacoes.co_organizacao_n3)
            transformRawOrgN3(rawOrganizacoes)
        if (rawOrganizacoes.co_organizacao_n4)
            transformRawOrgN4(rawOrganizacoes)
        if (rawOrganizacoes.co_organizacao_n5)
            transformRawOrgN5(rawOrganizacoes)
        if (rawOrganizacoes.co_organizacao_n6)
            transformRawOrgN6(rawOrganizacoes)
    } catch (error: any) {
        log.fatal(`[FATAL] Falha ao transformar objeto.`);
    }
}

async function transformRawOrgN0(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg0');
    try {
        const rawOrgN0: NewOrganizacaoN0 = {
            coOrganizacaoN0: Number(rawOrganizacoes.co_organizacao_n0),
            dsOrganizacaoN0: rawOrganizacoes.ds_organizacao_n0,
        }

        await persistNewOrgN0(rawOrgN0);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n0.`);
    }
}

async function transformRawOrgN1(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg1');
    try {
        const rawOrgN1: NewOrganizacaoN1 = {
            coOrganizacaoN1: Number(rawOrganizacoes.co_organizacao_n1),
            dsOrganizacaoN1: rawOrganizacoes.ds_organizacao_n1,
        }

        await persistNewOrgN1(rawOrgN1);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n1.`);
    }
}

async function transformRawOrgN2(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg2');
    try {
        const rawOrgN2: NewOrganizacaoN2 = {
            coOrganizacaoN2: Number(rawOrganizacoes.co_organizacao_n2),
            dsOrganizacaoN2: rawOrganizacoes.ds_organizacao_n2,
        }

        await persistNewOrgN2(rawOrgN2);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n2.`);
    }
}

async function transformRawOrgN3(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg3');
    try {
        const rawOrgN3: NewOrganizacaoN3 = {
            coOrganizacaoN3: Number(rawOrganizacoes.co_organizacao_n3),
            dsOrganizacaoN3: rawOrganizacoes.ds_organizacao_n3,
        }

        await persistNewOrgN3(rawOrgN3);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n3.`);
    }
}

async function transformRawOrgN4(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg4');
    try {
        const rawOrgN4: NewOrganizacaoN4 = {
            coOrganizacaoN4: Number(rawOrganizacoes.co_organizacao_n4),
            dsOrganizacaoN4: rawOrganizacoes.ds_organizacao_n4,
        }

        await persistNewOrgN4(rawOrgN4);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n4.`);
    }
}

async function transformRawOrgN5(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg5');
    try {
        const rawOrgN5: NewOrganizacaoN5 = {
            coOrganizacaoN5: Number(rawOrganizacoes.co_organizacao_n5),
            dsOrganizacaoN5: rawOrganizacoes.ds_organizacao_n5,
        }

        await persistNewOrgN5(rawOrgN5);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n5.`);
    }
}

async function transformRawOrgN6(rawOrganizacoes: RawOrganizacao) {
    const log = logger.forMethod('transformRawOrg6');
    try {
        const rawOrgN6: NewOrganizacaoN6 = {
            coOrganizacaoN6: Number(rawOrganizacoes.co_organizacao_n6),
            dsOrganizacaoN6: rawOrganizacoes.ds_organizacao_n6,
        }

        await persistNewOrgN6(rawOrgN6);
    } catch (error: any) {
        log.error(`[ERRO] Falha ao transformar organização n6.`);
    }
}