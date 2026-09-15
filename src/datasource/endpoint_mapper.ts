import type { DataSource, Endpoint, HttpMethod } from "./models.js";

export function MapDiscoveredEndpointsInMemory(dataSources: DataSource[]): Endpoint[] {
    const endpoints: Endpoint[] = [];
    const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

    for (const dataSource of dataSources) {
        const metadataObj = typeof dataSource.metadata === "string"
            ? JSON.parse(dataSource.metadata)
            : dataSource.metadata;

        if (!metadataObj?.paths) continue;

        for (const [path, pathItem] of Object.entries(metadataObj.paths as Record<string, any>)) {

            for (const [methodKey, value] of Object.entries(pathItem as Record<string, any>)) {

                // Tipamos explicitamente o value para podermos acessar as propriedades
                const methodObj = value as Record<string, any>;
                const method = methodKey.toLowerCase() as HttpMethod;

                if (!HTTP_METHODS.includes(method)) continue;

                const newEndpoint: Endpoint = {
                    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
                    dataSourceId: dataSource.tempId.toString(),
                    method: method,
                    path: path,
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