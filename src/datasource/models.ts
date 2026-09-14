// 1. Origem da API
export interface DataSource {
  tempId: string;
  title: string;
  baseUrl: string;
}

// 2. Metadados do Endpoint
export interface Endpoint {
  id: string;
  dataSourceId: string;
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  summary?: string | null;
  description?: string | null;
  tags?: string[];
}

// 3. Resposta do Endpoint
export interface EndpointResponse {
  id: string;
  endpointId: string;
  statusCode: string; // Ex: "200"
  description?: string;
  isMapped: boolean; // Controle se o analista já concluiu o mapeamento
}

export interface EndpointField {
  id: string;
  responseId: string; // FK para EndpointResponse (normalmente a 200 OK)
  
  // Dados extraídos do Swagger/OpenAPI
  jsonPath: string;        // Ex: "registros.codigoSerie" ou "valor"
  originalName: string;    // Ex: "id_pleito"
  originalType: string;    // Ex: "integer", "number", "string"
  description?: string;    // Ex: "Código de identificação do pleito"
  
  // Mapeamento feito pelo Analista de Dados
  // ...
}