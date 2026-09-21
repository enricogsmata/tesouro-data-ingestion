import type { ApiLinks, DataSources, Endpoints } from "./schema.js";

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export type DataSource = typeof DataSources.$inferSelect;
export type NewDataSource = typeof DataSources.$inferInsert;

export type Endpoint = typeof Endpoints.$inferSelect;
export type NewEndpoint = typeof Endpoints.$inferInsert;

export type ApiLink = typeof ApiLinks.$inferSelect;
export type NewApiLink = typeof ApiLinks.$inferInsert;

export interface IApiResponse {
    items: string[],
    limit: number,
    offset: number,
    count: number,
    hasMore: number,
}