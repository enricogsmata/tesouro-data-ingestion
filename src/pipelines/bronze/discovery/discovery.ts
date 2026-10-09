/* 
    Arquivo responsável pela lógica de descoberta/scrapping de APIs e Endpoints no portal do Tesouro Nacional Transparente. Automaticamente coleta os conjuntos de dados e armazena em uma estrutura de dados.
*/
import puppeteer, { type Browser } from "puppeteer";
import YAML from 'yaml';
import { bronzeDB } from "../../../database/dbConnection.js";
import type { NewDataSource } from "../../../database/types.js";
import { createLogger } from "../../../services/logs.js";
import * as cheerio from 'cheerio';
import axios from 'axios';
import type { AxiosResponse } from 'axios';

// - URL/PATH base utilizados na descoberta dos conjuntos de dados -
const BASE_URL: URL = new URL('https://www.tesourotransparente.gov.br/');
const BASE_CKAN_PATH: string = '/ckan/dataset';
// - - -

// - LOGGER -
const logger = createLogger(import.meta.url);
// - - -

/**
 * Interface de opções de configuração para o mecanismo de retentativas (retry)
 * em caso de queda de servidor, instabilidade ou falha temporária de conexão.
 */
export interface DiscoveryRetryConfig {
    /** Número máximo de tentativas (padrão: 5) */
    maxAttempts?: number | undefined;
    /** Tempo inicial de espera em milissegundos antes da primeira retentativa (padrão: 5000ms = 5s) */
    initialDelayMs?: number | undefined;
    /** Tempo máximo de espera em milissegundos por retentativa (padrão: 60000ms = 60s) */
    maxDelayMs?: number | undefined;
    /** Fator multiplicador para o backoff exponencial (padrão: 2) */
    backoffFactor?: number | undefined;
    /** Timeout em ms para requisições HTTP via Axios (padrão: 30000ms = 30s) */
    axiosTimeoutMs?: number | undefined;
    /** Timeout em ms para navegações e operações via Puppeteer (padrão: 60000ms = 60s) */
    puppeteerTimeoutMs?: number | undefined;
}

export interface DiscoveryResolvedRetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
    axiosTimeoutMs: number;
    puppeteerTimeoutMs: number;
}

// - CONFIGURAÇÃO PADRÃO DE RETRY (RESILIÊNCIA CONTRA QUEDA DE SERVIDOR E FALHAS DE REDE) -
// Valores pensados para dar tempo suficiente ao servidor em caso de reinicialização ou queda temporária:
// Tentativa 1: espera 5s
// Tentativa 2: espera 10s
// Tentativa 3: espera 20s
// Tentativa 4: espera 40s
// Tentativa 5: espera 60s (limite máximo)
// Tempo total cumulativo de espera: ~135 segundos (mais de 2 minutos).
const DEFAULT_RETRY_CONFIG: DiscoveryResolvedRetryConfig = {
    maxAttempts: Number(process.env.DISCOVERY_MAX_RETRIES) || 5,
    initialDelayMs: Number(process.env.DISCOVERY_INITIAL_DELAY_MS) || 5000,
    maxDelayMs: Number(process.env.DISCOVERY_MAX_DELAY_MS) || 60000,
    backoffFactor: Number(process.env.DISCOVERY_BACKOFF_FACTOR) || 2,
    axiosTimeoutMs: Number(process.env.DISCOVERY_AXIOS_TIMEOUT_MS) || 30000,
    puppeteerTimeoutMs: Number(process.env.DISCOVERY_PUPPETEER_TIMEOUT_MS) || 60000,
};

/**
 * Determina se um erro ocorrido durante uma requisição HTTP ou navegação no Puppeteer
 * é transitório (queda de servidor, timeout ou falha de conexão de rede), justificando retries.
 */
function isRetryableNetworkOrServerError(error: any): boolean {
    if (!error) return false;

    // 1. Status HTTP de indisponibilidade do servidor (5xx), rate limit (429) ou timeout (408)
    const status = error?.response?.status || error?.status;
    if (typeof status === 'number') {
        if (status >= 500 && status <= 599) return true; // 500, 502, 503, 504, 521, etc.
        if (status === 429 || status === 408) return true;
        // Erros de cliente (400, 401, 403, 404, 405, 422) não são quedas de servidor e não devem sofrer retry inútil
        if (status >= 400 && status < 500) return false;
    }

    // 2. Axios: requisição enviada mas sem resposta recebida (servidor fora do ar ou timeout de conexão)
    if (axios.isAxiosError(error) && !error.response && Boolean(error.request)) {
        return true;
    }

    // 3. Códigos de erro de rede em baixo nível (Node.js / OS / Axios)
    const code = error?.code || error?.cause?.code;
    const retryableCodes = [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNABORTED',
        'ENOTFOUND',
        'EAI_AGAIN',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ERR_NETWORK',
        'ERR_BAD_RESPONSE',
        'ERR_SOCKET_CONNECTION_TIMEOUT',
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_SOCKET',
        'EPIPE',
    ];
    if (code && retryableCodes.includes(code)) {
        return true;
    }

    // 4. Puppeteer / Chromium network & navigation errors
    const message = (error?.message || '').toLowerCase();
    const retryableMessageKeywords = [
        'net::err_connection_refused',
        'net::err_connection_reset',
        'net::err_connection_timed_out',
        'net::err_connection_closed',
        'net::err_name_not_resolved',
        'net::err_name_resolution_failed',
        'net::err_timed_out',
        'net::err_empty_response',
        'net::err_network_changed',
        'net::err_internet_disconnected',
        'net::err_http_response_code_failure',
        'timeouterror',
        'navigation timeout',
        'timeout of',
        'fetch failed',
        'socket hang up',
        'econnrefused',
        'econnreset',
        'etimedout',
    ];

    if (retryableMessageKeywords.some(keyword => message.includes(keyword))) {
        return true;
    }

    // 5. Erro com nome TimeoutError
    if (error?.name === 'TimeoutError') {
        return true;
    }

    return false;
}

/**
 * Extrai uma descrição amigável de erro para exibição nos logs.
 */
function getErrorMessage(error: any): string {
    if (!error) return 'Erro desconhecido';
    if (error.response?.status) {
        return `HTTP ${error.response.status} (${error.response.statusText || 'Erro do Servidor'})`;
    }
    if (error.code) {
        return `${error.code}: ${error.message}`;
    }
    return error.message || String(error);
}

/**
 * Consolida as opções de retry mesclando valores fornecidos com os padrões do sistema.
 */
function resolveRetryConfig(custom?: DiscoveryRetryConfig | undefined): DiscoveryResolvedRetryConfig {
    return {
        maxAttempts: custom?.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
        initialDelayMs: custom?.initialDelayMs ?? DEFAULT_RETRY_CONFIG.initialDelayMs,
        maxDelayMs: custom?.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
        backoffFactor: custom?.backoffFactor ?? DEFAULT_RETRY_CONFIG.backoffFactor,
        axiosTimeoutMs: custom?.axiosTimeoutMs ?? DEFAULT_RETRY_CONFIG.axiosTimeoutMs,
        puppeteerTimeoutMs: custom?.puppeteerTimeoutMs ?? DEFAULT_RETRY_CONFIG.puppeteerTimeoutMs,
    };
}

/**
 * Executor genérico com retry e backoff exponencial progressivo para operações assíncronas.
 * Garante resiliência e tempo suficiente para o servidor se recuperar em caso de queda ou falha de conexão.
 */
async function executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
        context: string;
        actionDescription: string;
        config?: DiscoveryRetryConfig | undefined;
        isRetryable?: ((error: any) => boolean) | undefined;
    }
): Promise<T> {
    const config = resolveRetryConfig(options.config);
    const isRetryable = options.isRetryable ?? isRetryableNetworkOrServerError;

    let attempt = 1;
    let currentDelayMs = config.initialDelayMs;

    while (attempt <= config.maxAttempts) {
        try {
            return await operation();
        } catch (error: any) {
            const errorDetails = getErrorMessage(error);
            const isRetry = isRetryable(error);

            if (attempt >= config.maxAttempts || !isRetry) {
                if (!isRetry) {
                    logger.warn(
                        { context: options.context, data: `Erro: ${errorDetails}` },
                        `[ABORT] Falha não recuperável em: ${options.actionDescription}. Interrompendo retries.`
                    );
                } else {
                    logger.error(
                        { context: options.context, data: `Tentativas esgotadas (${attempt}/${config.maxAttempts}) | Erro: ${errorDetails}` },
                        `[FALHA DEFINITIVA] Queda do servidor ou falha de conexão persistente em: ${options.actionDescription}.`
                    );
                }
                throw error;
            }

            const delaySeconds = Math.round(currentDelayMs / 1000);
            logger.warn(
                {
                    context: options.context,
                    data: `Tentativa ${attempt}/${config.maxAttempts} | Erro: ${errorDetails} | Próxima espera: ${delaySeconds}s`
                },
                `[RETRY | QUEDA DE SERVIDOR / CONEXÃO] Falha em "${options.actionDescription}". Aguardando ${delaySeconds}s para tentar novamente (Tentativa ${attempt} de ${config.maxAttempts})...`
            );

            await new Promise((resolve) => setTimeout(resolve, currentDelayMs));

            currentDelayMs = Math.min(currentDelayMs * config.backoffFactor, config.maxDelayMs);
            attempt++;
        }
    }

    throw new Error(`[ERRO | RETRY] Limite de ${config.maxAttempts} tentativas excedido para "${options.actionDescription}".`);
}

/**
 * Orquestrador da Descoberta de Fontes de Dados (Discovery).
 *
 * Executa as tarefas modulares de web scraping no portal CKAN do Tesouro Transparente com retry resiliente:
 * 1. Descoberta de datasets disponíveis no catálogo com formato API (`?res_format=API`).
 * 2. Navegação até a página individual do dataset para localizar links de recursos.
 * 3. Identificação da página de documentação da API.
 * 4. Resolução da URL do portal Swagger / OpenAPI (ex: apidatalake / apiapex).
 * 5. Extração dos metadados OpenAPI via interceptação de rede no Puppeteer ou fallback ativo.
 *
 * @param options - Configurações opcionais de retry para tolerância a falhas de rede e quedas de servidor
 * @returns Lista de fontes de dados prontas para inserção na tabela `data_sources` ou null em caso de falha crítica
 */
export async function BuildDataSources(options?: DiscoveryRetryConfig): Promise<NewDataSource[] | null> {
    const context = 'BuildDataSources';

    logger.info({ context: context }, `[INFO] Iniciando descoberta de conjuntos de dados...`);

    // [TASK 1] Descoberta dos datasets disponíveis na página principal dos datasets no CKAN do Tesouro
    // > Adicionado o search para filtrar por datasets com API disponível
    const ckanMainPageBaseUrl = new URL(BASE_CKAN_PATH, BASE_URL);
    ckanMainPageBaseUrl.search = "?res_format=API";

    let discoveredDatasetHrefs: string[] | null = await discoverAvaliableDataSets(ckanMainPageBaseUrl, options);

    // - ERRO -
    if (!discoveredDatasetHrefs || discoveredDatasetHrefs.length === 0) {
        logger.error({ context: context }, "[ERRO: PASSO 1] A lista de datasets descobertos não foi gerada corretamente ou retornou vazia após retries.");
        return null;
    }
    // - - -

    // - LOGS -
    logger.debug({ context: context, data: `${discoveredDatasetHrefs.join('\n')}` }, `[1 | SUCESSO] Datasets encontrados: ${discoveredDatasetHrefs.length}`);
    // - - -

    /* 
        - SCRAPPER -
        > Para cada conjunto de dados descoberto na página principal do CKAN, extrai os links até encontrar a API e os Endpoints
        > Cada loop, excluindo conjuntos de dados com base duplicada/erro, constrói um IDataSource
    */
    let browser = await puppeteer.launch({ headless: true });
    let builtDataSources: NewDataSource[] = [];

    try {
        for (const discoveredDatasetHref of discoveredDatasetHrefs) {
            // Garante que o navegador permanece conectado, reiniciando caso tenha ocorrido crash após requisições demoradas
            if (!browser.connected) {
                logger.warn({ context: context }, `[WARN] Browser Puppeteer desconectado. Reiniciando instância...`);
                browser = await puppeteer.launch({ headless: true });
            }

            // [TASK 2] Extração do URL da página do conjunto de dados descoberto
            // > Essa página contém as informações gerais, arquivos, e link para a API
            let datasetPageUrl: string | null = await BuildDatasetPageUrl(discoveredDatasetHref, ckanMainPageBaseUrl, bronzeDB);

            // - ERRO -
            if (!datasetPageUrl) {
                logger.error({ context: context }, "[ERRO: PASSO 2] A URL da página do dataset não foi gerada corretamente.");
                continue;
            }
            // - - -

            // - LOG -
            logger.debug({ context: context, data: `${datasetPageUrl}` }, `[2 | SUCESSO] URL da página do dataset obtido.`);
            // - - -

            // [TASK 3] Extração do URL da página que contém o link para a página da documentação da API do conjunto de dados
            // > Essa página contém o link para acesso ao datalake (por exemplo) que armazena a API/Endpoints do conjunto de dados
            const datasetApiDocPageUrl = await BuildDatasetApiPageUrl(datasetPageUrl, options);

            // - ERRO -
            if (!datasetApiDocPageUrl) {
                logger.error({ context: context, data: `HREF: ${discoveredDatasetHref}` }, `[ERRO: PASSO 3] A url para a página da documentação da API do dataset não foi gerada corretamente.`);
                continue;
            }
            // - - -

            // - LOG -
            logger.debug({ context: context, data: datasetApiDocPageUrl }, `[3 | SUCESSO] Url da página de documentação da api obtida.`);
            // - - -

            // [TASK 4] Extração da url do portal (ex: datalake) com os dados do swagger/openapi (url base, endpoints...)
            // > Nessa página serão extraídos efetivamente url base, endpoints, para montagem do objeto de IDataSource
            const datasetApiPortalUrl = await BuildDatasetApiPortalUrl(datasetApiDocPageUrl, options);

            // - LOG -
            if (!datasetApiPortalUrl) {
                logger.error({ context: context, data: `HREF: ${discoveredDatasetHref}` }, `[ERRO: PASSO 4] A url para o portal da API do dataset não foi gerada corretamente.`);
                continue;
            }
            // - - -

            // - LOG -
            logger.debug({ context: context, data: datasetApiPortalUrl }, `[4 | SUCESSO] Url do portal da API obtido.`);
            // - - -

            // [TASK 5] Extração dos dados do swagger/openapi e construção do IDataSource (conjunto de dados) tipado em memória
            const datasetApiMetadata = await GetDatasetApiMetadata(datasetApiPortalUrl, browser, options);

            // - ERRO -
            if (!datasetApiMetadata) {
                logger.error({ context: context }, `[ERRO: PASSO 5] Não foi possível obter os dados da API e Endpoints do dataset.`);
                continue;
            }
            // - - -

            // > A partir daqui são montados/sanitizados os atributos referentes ao objeto de IDataSource que será gerado
            const datasetBaseUrl = datasetApiMetadata['host'] || datasetApiMetadata['servers']?.[0]?.['url'];

            // - LOG -
            if (!datasetBaseUrl) {
                logger.error({ context: context, data: `${discoveredDatasetHref}` }, `[ERRO: PASSO 5] Não foi possível obter a URL base do dataset.`);
                continue;
            }
            // - - -

            const sanitizebronzeDBaseUrl = sanitizeBaseUrl(datasetBaseUrl);

            // > Cancelamos o processo caso a URL base encontrada já esteja inserida no vetor de conjuntos de dados obtidos.
            // ! Isso evita consulta à mesma API/Endpoints de modo desnecessário/duplicado, economizando processamento e tratamento de dados futuro.
            if (builtDataSources.some(ds => ds.baseUrl === sanitizebronzeDBaseUrl)) {
                logger.debug({ context: context, data: sanitizebronzeDBaseUrl }, `[SKIP] URL Base já processada!`);
                continue;
            }

            // - LOG -
            logger.debug({ context: context, data: sanitizebronzeDBaseUrl }, `[5 | DATA] Nova url base extraída.`);
            // - - -

            // - ERRO -
            if (!datasetApiMetadata['paths']) {
                logger.error({ context: context, data: discoveredDatasetHref }, `[ERRO: PASSO 5] Não foram encontrados paths (endpoints) para a url do dataset.`);
                continue;
            }
            // - - -

            // [TASK 6] Construção do objeto do conjunto de dados (IDataSource) em memória e inserção no vetor
            const IDataSourceTitle = datasetApiMetadata['info']?.['title'] || '';
            const newIDataSource: NewDataSource = {
                title: IDataSourceTitle,
                baseUrl: sanitizebronzeDBaseUrl,
                rawMetadata: JSON.stringify(datasetApiMetadata),
            };

            builtDataSources.push(newIDataSource);
        }
    } finally {
        // > FECHAMENTO SEGURO DO BROWSER DO PUPPETEER
        if (browser.connected) {
            await browser.close();
        }
    }

    // > Retorna a lista de conjuntos de dados construídos
    return builtDataSources;
}

/*
    - TASK 2 -
    > Faz scrapping da página principal do CKAN do Tesouro Nacional e retorna cada conjunto de dados encontrado em um vetor
*/
async function discoverAvaliableDataSets(ckanMainPageBaseUrl: URL, retryConfig?: DiscoveryRetryConfig): Promise<string[] | null> {
    const context = 'discoverAvaliableDataSets';
    logger.info({ context: context, msg: "[INFO] Montando URLs e realizando requisição no axios..." });

    // > Coleta o conteúdo HTML da página com retries resilientes a quedas do servidor
    const pageData = await LoadAxios(ckanMainPageBaseUrl.toString(), retryConfig);

    // - ERRO -
    if (!pageData || pageData.status !== 200) {
        logger.error({ context: context, data: `${ckanMainPageBaseUrl.toString()}` }, `[ERRO] Não foi possível realizar o load da página no cheerio após retries.`);
        return null;
    }
    // - - -

    logger.info({ context: context }, "[INFO] Iniciando descoberta de datasets...");

    const $ = cheerio.load(pageData.data);
    const discoveredDatasetHrefs: string[] = [];
    for (const [index, element] of $('.dataset-item').get().entries()) {
        const datasetHref = $(element).find('.dataset-heading > a[href*="/ckan/dataset/"]').attr('href');

        if (datasetHref) {
            discoveredDatasetHrefs.push(datasetHref);
        } else {
            logger.error({ context: context }, `[ERRO] Falha ao encontrar o HREF do elemento "dataset-item" no índice ${index}!`);
        }
    }

    // > Retorna os conjuntos de dados extraídos da página principal do CKAN
    return discoveredDatasetHrefs;
}

/*
    - TASK 3 -
    > Faz scrapping da página do conjunto de dados
    > Extrai a url da página de documentação da API do conjunto de dados
*/
async function BuildDatasetApiPageUrl(discoveredDatasetPageUrl: string, retryConfig?: DiscoveryRetryConfig): Promise<string | null> {
    const context = 'BuildDatasetApiPageUrl';
    const datasetPageData = await LoadAxios(discoveredDatasetPageUrl, retryConfig);

    // - ERRO -
    if (!datasetPageData || datasetPageData.status !== 200) {
        logger.error({ context: context, data: `${discoveredDatasetPageUrl}` }, `[ERRO] Não foi possível obter os dados da página do dataset após retries.`);
        return null;
    }
    // - - -

    const $ = cheerio.load(datasetPageData.data);
    const datasetApiPageHref = $('a[data-format="api"]').attr('href');

    // - ERRO -
    if (!datasetApiPageHref) {
        logger.error({ context: context, data: discoveredDatasetPageUrl }, `[ERRO] Não foi possível encontrar o link de acesso para a página com o link para a API do dataset.`);
        return null;
    }
    // - - -

    const datasetApiPageUrl = new URL(datasetApiPageHref, discoveredDatasetPageUrl);
    return datasetApiPageUrl.toString();
}

/*
    - TASK 4 -
    > Faz scrapping da página de documentação da API do conjunto de dados
*/
async function BuildDatasetApiPortalUrl(discoveredDatasetApiDocPageUrl: string, retryConfig?: DiscoveryRetryConfig): Promise<string | null> {
    const context = 'BuildDatasetApiPortalUrl';
    const apiDocPageData = await LoadAxios(discoveredDatasetApiDocPageUrl, retryConfig);

    // - ERRO -
    if (!apiDocPageData || apiDocPageData.status !== 200) {
        logger.error({ context: context }, `[ERRO] Não foi possível obter o conteúdo da página após retries.`);
        return null;
    }
    // - - -

    const $ = cheerio.load(apiDocPageData.data);

    // - CAMADA 1: Extração Direta do Padrão CKAN -
    // > No CKAN, o link do recurso fica no botão principal ou no texto "URL: <a href...>"
    const ckanResourceHref =
        $('a.resource-url-analytics').attr('href') ||
        $('.module-resource .actions a').attr('href') ||
        $('p.muted.ellipsis a').attr('href');

    if (ckanResourceHref) {
        try {
            const absoluteCkanUrl = new URL(ckanResourceHref, discoveredDatasetApiDocPageUrl).toString();
            // Retorna direto se for uma URL válida diferente da página atual
            if (absoluteCkanUrl !== discoveredDatasetApiDocPageUrl) {
                return absoluteCkanUrl;
            }
        } catch {
            // Se falhar a conversão de URL, segue para o fallback
        }
    }

    // - CAMADA 2: Fallback Genérico (Ignorando Menus, Headers e Footers) -
    const candidateUrls: string[] = [];

    // > Busca apenas no conteúdo principal (#content ou main), ignorando menus e cabeçalhos
    $('#content a[href], main a[href]').not('header a, footer a, #menu a, .breadcrumb a').each((_, element) => {
        const rawHref = $(element).attr('href')?.trim();

        if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('#')) return;

        try {
            const absoluteUrl = new URL(rawHref, discoveredDatasetApiDocPageUrl).toString();
            const hrefLower = rawHref.toLowerCase();
            const linkText = $(element).text().toLowerCase();

            // > REMOVIDO 'ckan' das palavras-chave para evitar capturar links de navegação do site
            if (
                hrefLower.includes('api') ||
                hrefLower.includes('docs') ||
                hrefLower.includes('swagger') ||
                hrefLower.includes('sadipem') ||
                hrefLower.includes('/apex/') ||
                linkText.includes('api') ||
                linkText.includes('acessar') ||
                linkText.includes('download')
            ) {
                candidateUrls.push(absoluteUrl);
            }
        } catch {
            // Ignora URLs malformadas
        }
    });

    const uniqueCandidates = [...new Set(candidateUrls)];

    // - CAMADA 3: Resolução de Redirecionamentos para Links Mascarados -
    for (const candidateUrl of uniqueCandidates) {
        try {
            const response = await axios.head(candidateUrl, {
                maxRedirects: 5,
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const finalUrl = response.request.res?.responseUrl || response.config.url || candidateUrl;

            // > Valida se a URL final resolvida é realmente uma API/Documentação
            if (
                finalUrl.toLowerCase().includes('api') ||
                finalUrl.toLowerCase().includes('docs') ||
                finalUrl.toLowerCase().includes('swagger') ||
                finalUrl.toLowerCase().includes('sadipem')
            ) {
                return finalUrl;
            }
        } catch (error: any) {
            // Fallback para GET se o servidor bloquear HEAD (HTTP 405)
            if (error.response?.status === 405) {
                try {
                    const getResponse = await axios.get(candidateUrl, {
                        maxRedirects: 5,
                        timeout: 10000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });

                    const finalUrl = getResponse.request.res?.responseUrl || getResponse.config.url || candidateUrl;
                    return finalUrl;
                } catch {
                    // Segue para o próximo candidato
                }
            }
        }
    }

    logger.error({ context: context, data: `${discoveredDatasetApiDocPageUrl}` }, `[ERRO] Não foi possível obter o link para o portal da API do dataset.`);
    return null;
}

/*
    - TASK 5 -
    > Consulta a página do portal da api do conjunto de dados e busca os metadados da API no objeto swagger/openapi.
    > Protegido com retries em caso de falhas de conexão, timeouts ou queda do servidor.
*/
async function GetDatasetApiMetadata(
    discoveredDatasetApiPortalUrl: string,
    browser: Browser,
    retryConfig?: DiscoveryRetryConfig
): Promise<any> {
    const context = 'GetDatasetApiMetadata';
    const config = resolveRetryConfig(retryConfig);

    try {
        return await executeWithRetry(
            async () => {
                const newPage = await browser.newPage();

                try {
                    await newPage.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    );

                    let apiSpecEncontrada: any = null;

                    // > Helper interno para validar e tentar parsear o texto capturado em JSON ou YAML
                    const tentarParsearSpec = (text: string, sourceUrl: string): boolean => {
                        if (!text || apiSpecEncontrada) return false;

                        // > Validação do CONTEÚDO: procura as palavras-chave vitais do esquema OpenAPI/Swagger
                        const temEstruturaSwagger =
                            text.includes('"openapi"') ||
                            text.includes('"swagger"') ||
                            text.includes('openapi:') ||
                            text.includes('swagger:') ||
                            text.includes('"paths"') ||
                            text.includes('paths:');

                        if (!temEstruturaSwagger) return false;

                        // 1ª Tentativa: JSON
                        try {
                            const parsed = JSON.parse(text);
                            // Confirmação extra se é realmente um objeto de especificação do OpenAPI/Swagger
                            if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                                apiSpecEncontrada = parsed;
                                logger.debug({ context: context, data: `${sourceUrl}` }, `[SUCESSO] Especificação capturada na URL.`);
                                logger.trace({ context: context }, `[INFO] Convertido de JSON com sucesso`);
                                return true;
                            }
                        } catch {
                            // 2ª Tentativa: YAML Perfeito
                            try {
                                const parsed = YAML.parse(text);
                                if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                                    apiSpecEncontrada = parsed;
                                    logger.debug({ context: context, data: `${sourceUrl}` }, `[SUCESSO] Especificação capturada na URL`);
                                    logger.trace({ context: context }, `[INFO] Convertido de YAML com sucesso`);
                                    return true;
                                }
                            } catch {
                                // 3ª Tentativa: YAML Quebrado/Sujo
                                try {
                                    const textLimpo = sanitizeMalformedYaml(text);
                                    const parsed = YAML.parse(textLimpo);
                                    if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                                        apiSpecEncontrada = parsed;
                                        logger.debug({ context: context, data: `${sourceUrl}` }, `[SUCESSO] Especificação capturada na URL.`);
                                        logger.trace({ context: context }, `[INFO] Convertido de YAML (Higienizado) com sucesso!`);
                                        return true;
                                    }
                                } catch {
                                    return false;
                                }
                            }
                        }
                        return false;
                    };

                    // -------------------------------------------------------------
                    // ESTRATÉGIA 1: Interceptador de Rede
                    // -------------------------------------------------------------
                    newPage.on('response', async (response) => {
                        if (apiSpecEncontrada) return;

                        try {
                            const url = response.url().toLowerCase();
                            if (response.status() !== 200) return;

                            // FILTRO ANTI-FALSO POSITIVO: Ignora scripts (.js), folhas de estilo (.css) e imagens
                            const isStaticAsset =
                                url.endsWith('.js') ||
                                url.endsWith('.css') ||
                                url.endsWith('.png') ||
                                url.endsWith('.jpg') ||
                                url.endsWith('.woff2') ||
                                url.includes('swagger-ui-bundle') ||
                                url.includes('swagger-ui-standalone');

                            if (isStaticAsset) return;

                            const responseHeaders = response.headers();
                            const contentType = (responseHeaders['content-type'] || '').toLowerCase();

                            // Ignora explicitamente tipos de script JS
                            if (contentType.includes('javascript') || contentType.includes('css')) return;

                            const isJsonOrYaml =
                                contentType.includes('application/json') ||
                                contentType.includes('yaml') ||
                                contentType.includes('text/plain') ||
                                contentType.includes('application/x-yaml');

                            const hasUrlHint =
                                url.includes('swagger') ||
                                url.includes('openapi') ||
                                url.includes('api-docs') ||
                                url.endsWith('.json') ||
                                url.endsWith('.yaml') ||
                                url.endsWith('.yml');

                            if (isJsonOrYaml || hasUrlHint) {
                                const text = await response.text();
                                tentarParsearSpec(text, response.url());
                            }
                        } catch {
                            // Ignora erros ao ler respostas individuais
                        }
                    });

                    // Navega até a URL do portal com verificação de status de queda do servidor
                    const navResponse = await newPage.goto(discoveredDatasetApiPortalUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.puppeteerTimeoutMs,
                    });

                    // Se o servidor retornou erro 5xx (500, 502, 503, 504), dispara exceção para retry
                    if (navResponse && navResponse.status() >= 500 && navResponse.status() <= 599) {
                        throw new Error(`Servidor retornou HTTP ${navResponse.status()} em ${discoveredDatasetApiPortalUrl}`);
                    }

                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    // -------------------------------------------------------------
                    // ESTRATÉGIA 2: Fallback Ativo (Garante a captura se a rede não pegar)
                    // -------------------------------------------------------------
                    if (!apiSpecEncontrada) {
                        logger.debug({ context: context }, `[FALLBACK] Tentando extrair especificação ativamente a partir da URL...`);

                        // 1. Garante HTTPS e remove o trecho da hashtag e barras finais
                        let cleanUrl = discoveredDatasetApiPortalUrl.split('#')[0]?.replace(/\/+$/, '') || '';
                        cleanUrl = cleanUrl.replace(/^http:\/\//i, 'https://');

                        const candidateUrls = [
                            `${cleanUrl}.yaml`,
                            `${cleanUrl}.json`,
                            `${cleanUrl}.yml`,
                        ];

                        for (const candidateUrl of candidateUrls) {
                            if (apiSpecEncontrada) break;

                            try {
                                logger.debug({ context: context, data: `${candidateUrl}` }, `[FALLBACK] Executando fetch ativo.`);

                                const fetchResult = await newPage.evaluate(async (targetUrl) => {
                                    try {
                                        // Força a opção redirect: 'follow' para seguir redirecionamentos 301/302 do governo
                                        const res = await fetch(targetUrl, { redirect: 'follow' });
                                        if (res.ok) return await res.text();
                                    } catch {
                                        return null;
                                    }
                                    return null;
                                }, candidateUrl);

                                if (fetchResult) {
                                    tentarParsearSpec(fetchResult, candidateUrl);
                                }
                            } catch {
                                // Passa para a próxima URL candidata
                            }
                        }
                    }

                    // Se o fetch DENTRO do navegador falhou por políticas de CORS/Mixed Content,
                    // faz o fetch diretamente pelo Node.js (que ignora bloqueios de navegador)
                    if (!apiSpecEncontrada && discoveredDatasetApiPortalUrl) {
                        logger.debug({ context: context }, `[FALLBACK] Tentando busca direta via HTTP fora do navegador...`);

                        const baseUrlPart = (discoveredDatasetApiPortalUrl || '').split('#')[0] || '';
                        const candidateUrl = baseUrlPart.replace(/\/+$/, '').replace(/^http:\/\//i, 'https://') + '.yaml';

                        try {
                            const response = await fetch(candidateUrl);
                            if (response.ok) {
                                const text = await response.text();
                                tentarParsearSpec(text, candidateUrl);
                            }
                        } catch (nodeFetchError) {
                            logger.debug({ context: context, data: `${nodeFetchError}` }, `[FALLBACK] Falha na busca direta via Node.`);
                        }
                    }

                    return apiSpecEncontrada;
                } finally {
                    try {
                        await newPage.close();
                    } catch {
                        // Ignora se a página já estiver fechada
                    }
                }
            },
            {
                context: context,
                actionDescription: `Obter metadados da API via Puppeteer (${discoveredDatasetApiPortalUrl})`,
                config: config,
            }
        );
    } catch (error) {
        logger.error({ context: context, data: `URL: ${discoveredDatasetApiPortalUrl} | Detalhes: ${getErrorMessage(error)}` }, `[ERRO] Falha ao processar URL após tentativas de retry.`);
        return null;
    }
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

/*
    - - - - - - - - - - -
    > FUNÇÕES AUXILIARES
    - - - - - - - - - - -
*/

/*
    - AUXILIAR -
    > Retorna um objeto de AxiosResponse de uma URL consultada,
    > com retry automático em caso de falha de conexão ou queda do servidor.
*/
async function LoadAxios(pageUrl: string, retryConfig?: DiscoveryRetryConfig): Promise<AxiosResponse | null> {
    const context = 'LoadAxios';
    const config = resolveRetryConfig(retryConfig);

    try {
        return await executeWithRetry(
            async () => {
                return await axios.get(pageUrl, {
                    timeout: config.axiosTimeoutMs,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    }
                });
            },
            {
                context: context,
                actionDescription: `Carregar página via HTTP (${pageUrl})`,
                config: config,
            }
        );
    } catch (error) {
        logger.error({ context: context, data: `URL: ${pageUrl} | Detalhes: ${getErrorMessage(error)}` }, `[ERRO] Falha no método LoadAxios após tentativas de retry!`);
        return null;
    }
}

/*
    - AUXILIAR -
    > Construção da url da página do conjunto de dados obtido
*/
async function BuildDatasetPageUrl(discoveredDatasetHref: string, ckanMainPageBaseUrl: URL, bronzeDB: any): Promise<string | null> {
    const context = 'BuildDatasetPageUrl';
    const datasetPageUrl = new URL(discoveredDatasetHref, ckanMainPageBaseUrl);

    if (datasetPageUrl) {
        return datasetPageUrl.toString();
    } else {
        logger.error({ context: context, data: `${discoveredDatasetHref}` }, `[ERRO] Não foi possível montar a URL da página do dataset para o dataset.`);
        return null;
    }
}

/*
    - AUXILIAR -
    > Higienizador que conserta quebras de linha dentro de strings no YAML do governo
*/
function sanitizeMalformedYaml(yamlString: string): string {
    const regex = /([a-zA-Z0-9_]+:\s*")((?:[^"\\]|\\.)*)(")/g;

    return yamlString.replace(regex, (match, inicio, conteudo, fim) => {
        const conteudoLimpo = conteudo.replace(/\r?\n/g, ' ');
        return inicio + conteudoLimpo + fim;
    });
}

/*
    - AUXILIAR -
    > Higienizador que conserta urls mal-formadas (sem http ou https)
*/
function sanitizeBaseUrl(rawUrl: string): string {
    let url = rawUrl.trim();

    // 1. Garante o protocolo https:// se não houver http:// ou https://
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }

    // 2. Remove barras no final para padronizar a concatenação depois
    return url;

    // Exemplos de resultado:
    // "apidatalake.tesouro.gov.br/ords/..." -> "https://apidatalake.tesouro.gov.br/ords/..."
    // "https://apiapex.tesouro.gov.br/aria/" -> "https://apiapex.tesouro.gov.br/aria"
}