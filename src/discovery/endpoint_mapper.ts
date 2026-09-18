import type { IDataSource } from "../database/models/datasource/models.js";
import type { IRawEndpoint, HttpMethod } from "../database/models/endpoint/models.js";

export function MapDiscoveredEndpointsInMemory(IDataSources: IDataSource[]): IRawEndpoint[] {
    const endpoints: IRawEndpoint[] = [];
    const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

    for (const IDataSource of IDataSources) {
        const metadataObj = typeof IDataSource.metadata === "string"
            ? JSON.parse(IDataSource.metadata)
            : IDataSource.metadata;

        if (!metadataObj?.paths) continue;

        for (const [path, pathItem] of Object.entries(metadataObj.paths as Record<string, any>)) {

            for (const [methodKey, value] of Object.entries(pathItem as Record<string, any>)) {

                // Tipamos explicitamente o value para podermos acessar as propriedades
                const methodObj = value as Record<string, any>;
                const method = methodKey.toLowerCase() as HttpMethod;

                if (!HTTP_METHODS.includes(method)) continue;

                // > Realizamos a sanitização do 'path' para torná-lo integrável à url base da api, evitando inconsistências
                const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;

                const newEndpoint: IRawEndpoint = {
                    tempId: crypto.randomUUID ? crypto.randomUUID() : `${Math.random()-Date.now()}`,
                    IDataSourceTempId: IDataSource.tempId,
                    method: method,
                    path: sanitizedPath,
                    description: methodObj?.description || "",
                    summary: methodObj?.summary || "",
                    tags: methodObj?.tags || []
                };

                endpoints.push(newEndpoint);
            }
        }
    }

    return endpoints;
}