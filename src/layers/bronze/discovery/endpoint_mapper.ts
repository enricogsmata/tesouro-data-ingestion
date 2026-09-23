import type { DataSource, HttpMethod, MappedEndpointWithParams, NewEndpoint, NewEndpointParameter } from "../database/types.js";


export function MapDiscoveredEndpointsInMemory(dataSources: DataSource[]): MappedEndpointWithParams[] {
    const mappedEndpoints: MappedEndpointWithParams[] = [];
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

                const mappedEndpointParams: Omit<NewEndpointParameter, 'endpointId'>[] = [];

                if (methodObj.parameters) {
                    for (const param of methodObj.parameters) {

                        const newEndpointParams: Omit<NewEndpointParameter, 'endpointId'> = {
                            name: param.name || '',
                            is_required: String(param.required).toLowerCase() === "true" ? 1 : 0,
                            in: param.in || '',
                            description: param.description || '',
                            type: param.type || '',
                        }

                        mappedEndpointParams.push(newEndpointParams);
                    }
                }

                const mappedEndpoint: MappedEndpointWithParams = {
                    mappedEndpoint: newEndpoint,
                    mappedEndpointParams: mappedEndpointParams
                }

                mappedEndpoints.push(mappedEndpoint);
            }
        }
    }

    return mappedEndpoints;
}