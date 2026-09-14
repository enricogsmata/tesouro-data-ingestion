export interface DataSource {
    baseUrl: string
    endpoints: string[]
}

interface Endpoint {
    path: string
    method: string
    summary: string
    description: string
    parameters: EndpointParameters
}

interface EndpointParameters {
    name: string
    in: string
    description: string
    required: boolean
}