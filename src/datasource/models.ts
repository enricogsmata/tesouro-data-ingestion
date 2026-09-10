export interface DataSource {
    name: string
    description: string
    baseUrl: URL
    endpoints: string[]
}