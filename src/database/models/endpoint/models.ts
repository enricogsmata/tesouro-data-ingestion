// - - - - - - - - - - -
// > INTERFACES & TYPES
// - - - - - - - - - - -

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

// Metadados do Endpoint
export interface IRawEndpoint {
    tempId?: string;
    IDataSourceTempId?: string;
    path: string;
    method: HttpMethod;
    summary?: string | null;
    description?: string | null;
    tags?: string[];
}

export interface ApiLink {
    rel: string;
    href: string;
}

export interface IApiResponse<T> {
    items: T[];
    hasMore: boolean;
    limit: number;
    offset: number;
    count: number;
    links: ApiLink[];
}

export interface EndpointField { }