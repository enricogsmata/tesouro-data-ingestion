import type { apiLinks, cambio, cdp, credor, cronogramaLiberacoes, cronogramaPagamentos, dataSources, endpointParameters, endpoints, entes, pvl, rawEndpointResponse, resumoCronogramaPagamentos } from "./schema.js";

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