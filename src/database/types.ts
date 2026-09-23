import type { ApiLinks, DataSources, EndpointParameters, Endpoints } from "./schema.js";

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export type DataSource = typeof DataSources.$inferSelect;
export type NewDataSource = typeof DataSources.$inferInsert;

export type Endpoint = typeof Endpoints.$inferSelect;
export type NewEndpoint = typeof Endpoints.$inferInsert;

export type EndpointParameter = typeof EndpointParameters.$inferSelect;
export type NewEndpointParameter = typeof EndpointParameters.$inferInsert;

export type ApiLink = typeof ApiLinks.$inferSelect;
export type NewApiLink = typeof ApiLinks.$inferInsert;

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