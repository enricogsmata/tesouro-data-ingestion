import type { DataSource, HttpMethod, NewEndpoint } from "../database/types.js";


export function MapDiscoveredEndpointsInMemory(dataSources: DataSource[]): NewEndpoint[] {
    const endpoints: NewEndpoint[] = [];
    const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

    for (const dataSource of dataSources) {
        const metadataObj = typeof dataSource.rawMetadata === "string"
            ? JSON.parse(dataSource.rawMetadata)
            : dataSource.rawMetadata;

        if (!metadataObj?.paths) continue;

        for (const [path, pathItem] of Object.entries(metadataObj.paths as Record<string, any>)) {

            for (const [methodKey, value] of Object.entries(pathItem as Record<string, any>)) {

                // Tipamos explicitamente o value para podermos acessar as propriedades
                const methodObj = value as Record<string, any>;
                const method = methodKey.toLowerCase() as HttpMethod;

                if (!HTTP_METHODS.includes(method)) continue;

                // > Realizamos a sanitização do 'path' para torná-lo integrável à url base da api, evitando inconsistências
                const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;

                const newEndpoint: NewEndpoint = {
                    dataSourceId: dataSource.id,
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