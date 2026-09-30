import type { apiLinks, cambio, cdp, contaContabil, credor, cronogramaLiberacoes, cronogramaPagamentos, custoAtivo, dataSources, depreciacao, endpointParameters, endpoints, entes, escolaridade, faixaEtaria, operacoesNaoContratadas, organizacaoN0, organizacaoN1, organizacaoN2, organizacaoN3, organizacaoN4, organizacaoN5, organizacaoN6, pvl, rawEndpointResponse, resumoCronogramaPagamentos, resumoGeral, sexo } from "./schema.js";

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;

export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;

export type EndpointParameter = typeof endpointParameters.$inferSelect;
export type NewEndpointParameter = typeof endpointParameters.$inferInsert;

export type RawEndpointResponse = typeof rawEndpointResponse.$inferSelect;
export type NewrawEndpointResponse = typeof rawEndpointResponse.$inferInsert;

export type ApiLink = typeof apiLinks.$inferSelect;
export type NewApiLink = typeof apiLinks.$inferInsert;

export type Ente = typeof entes.$inferSelect;
export type NewEnte = typeof entes.$inferInsert;

export type Pvl = typeof pvl.$inferSelect;
export type NewPvl = typeof pvl.$inferInsert;

export type Credor = typeof credor.$inferSelect;
export type NewCredor = typeof credor.$inferInsert;

export type CronogramaPagamentos = typeof cronogramaPagamentos.$inferSelect;
export type NewCronogramaPagamentos = typeof cronogramaPagamentos.$inferInsert;

export type CronogramaLiberacoes = typeof cronogramaLiberacoes.$inferSelect;
export type NewCronogramaLiberacoes = typeof cronogramaLiberacoes.$inferInsert;

export type Cambio = typeof cambio.$inferSelect;
export type NewCambio = typeof cambio.$inferInsert;

export type ResumoCronogramaPagamentos = typeof resumoCronogramaPagamentos.$inferSelect;
export type NewResumoCronogramaPagamentos = typeof resumoCronogramaPagamentos.$inferInsert;

export type CDP = typeof cdp.$inferSelect;
export type NewCDP = typeof cdp.$inferInsert;

export type ContaContabil = typeof contaContabil.$inferSelect;
export type NewContaContabil = typeof contaContabil.$inferInsert;

export type Depreciacao = typeof depreciacao.$inferSelect;
export type NewDepreciacao = typeof depreciacao.$inferInsert;

export type OrganizacaoN0 = typeof organizacaoN0.$inferSelect;
export type NewOrganizacaoN0 = typeof organizacaoN0.$inferInsert;

export type OrganizacaoN1 = typeof organizacaoN1.$inferSelect;
export type NewOrganizacaoN1 = typeof organizacaoN1.$inferInsert;

export type OrganizacaoN2 = typeof organizacaoN2.$inferSelect;
export type NewOrganizacaoN2 = typeof organizacaoN2.$inferInsert;

export type OrganizacaoN3 = typeof organizacaoN3.$inferSelect;
export type NewOrganizacaoN3 = typeof organizacaoN3.$inferInsert;

export type OrganizacaoN4 = typeof organizacaoN4.$inferSelect;
export type NewOrganizacaoN4 = typeof organizacaoN4.$inferInsert;

export type OrganizacaoN5 = typeof organizacaoN5.$inferSelect;
export type NewOrganizacaoN5 = typeof organizacaoN5.$inferInsert;

export type OrganizacaoN6 = typeof organizacaoN6.$inferSelect;
export type NewOrganizacaoN6 = typeof organizacaoN6.$inferInsert;

export type ResumoGeral = typeof resumoGeral.$inferSelect;
export type NewResumoGeral = typeof resumoGeral.$inferInsert;

export type OperacoesNaoContratadas = typeof operacoesNaoContratadas.$inferSelect;
export type NewOperacoesNaoContratadas = typeof operacoesNaoContratadas.$inferInsert;

export type CustoAtivo = typeof custoAtivo.$inferSelect;
export type NewCustoAtivo = typeof custoAtivo.$inferInsert;

export type Escolaridade = typeof escolaridade.$inferSelect;
export type NewEscolaridade = typeof escolaridade.$inferInsert;

export type FaixaEtaria = typeof faixaEtaria.$inferSelect;
export type NewFaixaEtaria = typeof faixaEtaria.$inferInsert;

export type Sexo = typeof sexo.$inferSelect;
export type NewSexo = typeof sexo.$inferInsert;

export type MappedEndpointWithParams = {
    mappedEndpoint: NewEndpoint,
    mappedEndpointParams: Omit<NewEndpointParameter, 'endpointId'>[],
}

export interface IApiResponse {
    items: string[],
    limit: number,
    offset: number,
    count: number,
    hasMore: number,
}

export type LOG_LEVELS = 'TRACE' | 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL' | 'UNDEFINED';
export interface Log {
    level?: number,
    type: LOG_LEVELS,
    msg: string,
    data?: string,
    module?: string,
    context?: string,
    time: string,
}