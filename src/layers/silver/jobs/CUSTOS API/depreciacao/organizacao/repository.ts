import { db } from "../../../../../../database/dbConnection.js";
import { organizacaoN0, organizacaoN1, organizacaoN2, organizacaoN3, organizacaoN4, organizacaoN5, organizacaoN6 } from "../../../../../../database/schema.js";
import type { NewOrganizacaoN0, NewOrganizacaoN1, NewOrganizacaoN2, NewOrganizacaoN3, NewOrganizacaoN4, NewOrganizacaoN5, NewOrganizacaoN6 } from "../../../../../../database/types.js";
import { createLogger } from "../../../../../../services/logs.js";

const logger = createLogger(import.meta.url);

export async function persistNewOrgN0(newOrgN0: NewOrganizacaoN0) {
    const log = logger.forMethod('persistNewOrgN0');
    try {
        await db.insert(organizacaoN0).values(newOrgN0);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN0, null, 4) }, `[FATAL] Falha na persistência: Organização N0`);
    }
}

export async function persistNewOrgN1(newOrgN1: NewOrganizacaoN1) {
    const log = logger.forMethod('persistNewOrgN1');
    try {
        await db.insert(organizacaoN1).values(newOrgN1);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN1, null, 4) }, `[FATAL] Falha na persistência: Organização N1`);
    }
}

export async function persistNewOrgN2(newOrgN2: NewOrganizacaoN2) {
    const log = logger.forMethod('persistNewOrgN2');
    try {
        await db.insert(organizacaoN2).values(newOrgN2);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN2, null, 4) }, `[FATAL] Falha na persistência: Organização N2`);
    }
}

export async function persistNewOrgN3(newOrgN3: NewOrganizacaoN3) {
    const log = logger.forMethod('persistNewOrgN3');
    try {
        await db.insert(organizacaoN3).values(newOrgN3);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN3, null, 4) }, `[FATAL] Falha na persistência: Organização N3`);
    }
}

export async function persistNewOrgN4(newOrgN4: NewOrganizacaoN4) {
    const log = logger.forMethod('persistNewOrgN4');
    try {
        await db.insert(organizacaoN4).values(newOrgN4);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN4, null, 4) }, `[FATAL] Falha na persistência: Organização N4`);
    }
}

export async function persistNewOrgN5(newOrgN5: NewOrganizacaoN5) {
    const log = logger.forMethod('persistNewOrgN5');
    try {
        await db.insert(organizacaoN5).values(newOrgN5);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN5, null, 4) }, `[FATAL] Falha na persistência: Organização N5`);
    }
}

export async function persistNewOrgN6(newOrgN6: NewOrganizacaoN6) {
    const log = logger.forMethod('persistNewOrgN6');
    try {
        await db.insert(organizacaoN6).values(newOrgN6);
    } catch (error: any) {
        log.fatal({ data: JSON.stringify(newOrgN6, null, 4) }, `[FATAL] Falha na persistência: Organização N6`);
    }
}