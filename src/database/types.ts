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