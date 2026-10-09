/**
 * @file endpoint_mapper.ts
 * @description Mapeador em memória responsável por processar os metadados OpenAPI/Swagger
 * extraídos na etapa de Discovery e converter especificações de paths e métodos em estruturas
 * relacionais tipadas para a camada Bronze (Endpoints e EndpointParameters).
 */

import type { DataSource, HttpMethod, MappedEndpointWithParams, NewEndpoint, NewEndpointParameter } from "../../../database/types.js";

/**
 * Gera de forma determinística e sanitizada o nome da tabela física de destino (targetTable)
 * para armazenamento dos registros brutos do endpoint na camada Bronze.
 *
 * Regras aplicadas:
 * 1. Concatena de forma segura o `baseUrl` e o `path` do endpoint.
 * 2. Remove parâmetros dinâmicos de rota (ex: `/{id}`, `/:id`).
 * 3. Sanitiza caracteres especiais e extrai até 3 segmentos finais significativos do caminho.
 * 4. Aplica o prefixo padrão `raw_ds<ID>_` e limita a 55 caracteres para garantir compatibilidade
 *    com o limite de 64 caracteres de identificadores de tabela do MySQL.
 *
 * @param dataSourceId - Identificador único da fonte de dados (DataSource)
 * @param baseUrl - URL base da API
 * @param path - Caminho relativo do endpoint
 * @returns Nome normalizado da tabela de destino
 */
function generateTargetTableName(dataSourceId: number | string, baseUrl: string, path: string): string {
    // 1. Junta o baseUrl e o path de forma segura
    const safeBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const safePath = path.startsWith('/') ? path.slice(1) : path;
    
    let fullPath = '';
    try {
        // Usamos o construtor nativo de URL para extrair apenas o "pathname" de forma perfeita
        const fullUrl = new URL(`${safeBaseUrl}/${safePath}`);
        fullPath = fullUrl.pathname; 
    } catch (error) {
        // Fallback caso o baseUrl não venha com http://
        fullPath = `${safeBaseUrl}/${safePath}`.replace(/^https?:\/\/[^\/]+/, '');
    }

    // 2. Remove parâmetros de rota (ex: /{id}, /:id, /{userId})
    let cleanPath = fullPath.replace(/\/?{[^}]+}/g, '').replace(/\/?:\w+/g, '');

    // 3. Quebra o path em segmentos, sanitiza e remove vazios
    let segments = cleanPath
        .split(/[\/\-]/)
        .filter(p => p.trim().length > 0)
        .map(s => s.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())
        .filter(s => s.length > 0);

    // 4. Pegamos os 3 últimos segmentos do caminho completo para dar contexto sem estourar o limite
    if (segments.length > 3) {
        segments = segments.slice(-3);
    }

    let name = segments.join('_');

    // Fallback caso a rota não tenha segmentos nominais após limpar
    if (!name || name === '') {
        name = "root_endpoint";
    }

    // 5. Retorna com o prefixo 'raw_' e limita a 55 caracteres (seguro para o limite de 64 do MySQL)
    const finalName = `raw_ds${dataSourceId}_${name}`;
    return finalName.substring(0, 55);
}

/**
 * Itera sobre todas as fontes de dados (DataSources) fornecidas, analisa a especificação
 * OpenAPI/Swagger salva no campo `rawMetadata` e extrai todos os endpoints HTTP suportados,
 * gerando a associação com seus parâmetros de requisição.
 *
 * @param dataSources - Coleção de fontes de dados cadastradas com metadados OpenAPI
 * @returns Lista de pares contendo o endpoint mapeado e seus parâmetros associados
 */
export function MapDiscoveredEndpointsInMemory(dataSources: DataSource[]): MappedEndpointWithParams[] {
    const mappedEndpoints: MappedEndpointWithParams[] = [];
    const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

    for (const dataSource of dataSources) {
        const metadataObj = typeof dataSource.rawMetadata === "string"
            ? JSON.parse(dataSource.rawMetadata)
            : dataSource.rawMetadata;

        if (!metadataObj?.paths) continue;

        // Extrai o baseUrl do dataSource (garantindo fallback para string vazia se indefinido)
        const baseUrl = dataSource.baseUrl || '';

        for (const [path, pathItem] of Object.entries(metadataObj.paths as Record<string, any>)) {
            for (const [methodKey, value] of Object.entries(pathItem as Record<string, any>)) {
                
                const methodObj = value as Record<string, any>;
                const method = methodKey.toLowerCase() as HttpMethod;

                if (!HTTP_METHODS.includes(method)) continue;

                // Sanitização do 'path' para torná-lo integrável à url base da api
                const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
                
                // > Geração automática do nome da tabela combinando ID, BaseUrl e Path <
                const targetTableName = generateTargetTableName(dataSource.id, baseUrl, sanitizedPath);

                const newEndpoint: NewEndpoint = {
                    dataSourceId: dataSource.id,
                    method: method,
                    path: sanitizedPath,
                    description: methodObj?.description || "",
                    summary: methodObj?.summary || "",
                    tags: methodObj?.tags || [],
                    targetTable: targetTableName // <--- Nome da tabela estruturado e corrigido
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