/* 
    Arquivo responsável pela lógica de descoberta/scrapping de APIs e Endpoints no portal do Tesouro Nacional Transparente. Automaticamente coleta os conjuntos de dados e armazena em uma estrutura de dados.
*/
import axios, { type AxiosResponse } from "axios";
import * as cheerio from 'cheerio';
import puppeteer, { Browser } from "puppeteer";
import YAML from 'yaml';
import path from "path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { fileURLToPath } from "url";
import { db } from "../database/dbConnection.js";
import { createAppLogger } from "../logs/logic.js";
import type { NewDataSource } from "../database/types.js";

// - URL/PATH base utilizados na descoberta dos conjuntos de dados -
const BASE_URL: URL = new URL('https://www.tesourotransparente.gov.br/');
const BASE_CKAN_PATH: string = '/ckan/dataset'
// - - -

// - LOGGER -
const module = path.basename(fileURLToPath(import.meta.url));

const logger = createAppLogger(db);
// - - -

/*
    - - - - - - -
    > ORQUESTRADOR
    - - - - - - -
    > Opera através de 5 etapas modulares consultando as páginas do portal do Tesouro e extraíndo URLs/Dados de cada API/Endpoints
    > Retorna uma lista de objetos IDataSource tipados
*/
export async function BuildDataSources(): Promise<NewDataSource[] | null> {
    const context = 'BuildDataSources';

    logger.info({module: module, context: context}, `[INFO] Iniciando descoberta de conjuntos de dados...`);

    // [TASK 1] Descoberta dos datasets disponíveis na página principal dos datasets no CKAN do Tesouro
    // > Adicionado o search para filtrar por datasets com API disponível
    const ckanMainPageBaseUrl = new URL(BASE_CKAN_PATH, BASE_URL);
    ckanMainPageBaseUrl.search = "?res_format=API";

    let discoveredDatasetHrefs: string[] | null = await discoverAvaliableDataSets(ckanMainPageBaseUrl);

    // - ERRO -
    if (!discoveredDatasetHrefs) {
        logger.error({module: module, context: context}, "[ERRO: PASSO 1] A lista de datasets descobertos não foi gerada corretamente.");
        return null;
    }
    // - - -

    // - LOGS -
    logger.debug({module: module, context: context, data: `${discoveredDatasetHrefs.join('\n')}`}, `[1 | SUCESSO] Datasets encontrados: ${discoveredDatasetHrefs.length}`);
    // - - -

    /* 
        - SCRAPPER -
        > Para cada conjunto de dados descoberto na página principal do CKAN, extrai os links até encontrar a API e os Endpoints
        > Cada loop, excluindo conjuntos de dados com base duplicada/erro, constrói um IDataSource
    */
    const browser = await puppeteer.launch({ headless: true });
    let builtDataSources: NewDataSource[] = [];

    for (const discoveredDatasetHref of discoveredDatasetHrefs) {
        // [TASK 2] Extração do URL da página do conjunto de dados descoberto
        // > Essa página contém as informações gerais, arquivos, e link para a API
        let datasetPageUrl: string | null = await BuildDatasetPageUrl(discoveredDatasetHref, ckanMainPageBaseUrl, db)

        // - ERRO -
        if (!datasetPageUrl) {
            logger.error({module: module, context: context}, "[ERRO: PASSO 2] A URL da página do dataset não foi gerada corretamente.");
            continue;
        }
        // - - -

        // - LOG -
        logger.debug({module: module, context: context, data: `${datasetPageUrl}`}, `[2 | SUCESSO] URL da página do dataset obtido.`);
        // - - -

        // [TASK 3] Extração do URL da página que contém o link para a página da documentação da API do conjunto de dados
        // > Essa página contém o link para acesso ao datalake (por exemplo) que armazena a API/Endpoints do conjunto de dados
        const datasetApiDocPageUrl = await BuildDatasetApiPageUrl(datasetPageUrl);

        // - ERRO -
        if (!datasetApiDocPageUrl) {
            logger.error({module: module, context: context, data: `HREF: ${discoveredDatasetHref}`}, `[ERRO: PASSO 3] A url para a página da documentação da API do dataset não foi gerada corretamente.`);
            continue;
        }
        // - - -

        // - LOG -
        logger.debug({module: module, context: context, data: datasetApiDocPageUrl}, `[3 | SUCESSO] Url da página de documentação da api obtida.`);
        // - - -

        // [TASK 4] Extração da url do portal (ex: datalake) com os dados do swagger/openapi (url base, endpoints...)
        // > Nessa página serão extraídos efetivamente url base, endpoints, para montagem do objeto de IDataSource
        const datasetApiPortalUrl = await BuildDatasetApiPortalUrl(datasetApiDocPageUrl);

        // - LOG -
        if (!datasetApiPortalUrl) {
            logger.error({module: module, context: context, data: `HREF: ${discoveredDatasetHref}`}, `[ERRO: PASSO 4] A url para o portal da API do dataset não foi gerada corretamente.`);
            continue;
        }
        // - - -

        // - LOG -
        logger.debug({module: module, context: context, data: datasetApiPortalUrl}, `[4 | SUCESSO] Url do portal da API obtido.`);
        // - - -

        // [TASK 5] Extração dos dados do swagger/openapi e construção do IDataSource (conjunto de dados) tipado em memória
        const datasetApiMetadata = await GetDatasetApiMetadata(datasetApiPortalUrl, browser);

        // - ERRO -
        if (!datasetApiMetadata) {
            logger.error({module: module, context: context}, `[ERRO: PASSO 5] Não foi possível obter os dados da API e Endpoints do dataset`);
            continue;
        }
        // - - -

        // > A partir daqui são montados/sanitizados os atributos referentes ao objeto de IDataSource que será gerado
        const datasetBaseUrl = datasetApiMetadata['host'] || datasetApiMetadata['servers'][0]['url'];

        // - LOG -
        if (!datasetBaseUrl) {
            logger.error({module: module, context: context, data: `${discoveredDatasetHref}`}, `[ERRO: PASSO 5] Não foi possível obter a URL base do dataset.`);
            continue;
        }
        // - - -

        const sanitizedBaseUrl = sanitizeBaseUrl(datasetBaseUrl);

        // > Cancelamos o processo caso a URL base encontrada já esteja inserida no vetor de conjuntos de dados obtidos.
        // ! Isso evita consulta à mesma API/Endpoints de modo desnecessário/duplicado, economizando processamento e tratamento de dados futuro.
        if (builtDataSources.some(ds => ds.baseUrl === sanitizedBaseUrl)) {
            logger.debug({module: module, context: context, data: sanitizedBaseUrl}, `[SKIP] URL Base já processada!`);
            continue;
        }

        // - LOG -
        logger.debug({module: module, context: context, data: `sanitizedBaseUrl`}, `[5 | DATA] Nova url base extraída.`);
        // - - -

        // - ERRO -
        if (!datasetApiMetadata['paths']) {
            logger.error({module: module, context: context, data: `discoveredDatasetHref`}, `[ERRO: PASSO 5] Não foram encontrados paths (endpoints) para a url do dataset.`);
            continue;
        }
        // - - -

        // [TASK 6] Construção do objeto do conjunto de dados (IDataSource) em memória e inserção no vetor
        const IDataSourceTitle = datasetApiMetadata['info']['title'] || '';
        const newIDataSource: NewDataSource = {
            title: IDataSourceTitle,
            baseUrl: sanitizedBaseUrl,
            rawMetadata: JSON.stringify(datasetApiMetadata)
        }

        builtDataSources.push(newIDataSource);
    }
    // > FECHAMENTO DO BROWSER DO PUPPETEER
    await browser.close();
    // - - -

    // > Retorna a lista de conjuntos de dados construídos
    return builtDataSources;
}

/*
    - TASK 2 -
    > Faz scrapping da página principal do CKAN do Tesouro Nacional e retorna cada conjunto de dados encontrado em um vetor
*/
async function discoverAvaliableDataSets(ckanMainPageBaseUrl: URL): Promise<string[] | null> {
    // - LOG -
    const context = 'discoverAvaliableDataSets';
    logger.info({module: module, context: context , msg: "[INFO] Montando URLs e realizando requisição no axios..."});
    // - - -

    // > Coleta o conteúdo HTML da página e constrói a url da página do conjunto de dados dinâmicamente
    const pageData = await LoadAxios(ckanMainPageBaseUrl.toString());

    // - ERRO -
    if (!pageData || pageData.status != 200) {
        logger.error({module: module, context: context, data: `${ckanMainPageBaseUrl.toString()}`}, `[ERRO] Não foi possível realizar o load da página no cheerio.`);
        return null;
    }
    // - - -

    // - LOG -
    logger.info({module: module, context: context}, "[INFO] Iniciando descoberta de datasets...");
    // - - -

    let $ = cheerio.load(pageData.data);
    let discoveredDatasetHrefs: string[] = [];
    for (const [index, element] of $('.dataset-item').get().entries()) {
        const datasetHref = $(element).find('.dataset-heading > a[href*="/ckan/dataset/"]').attr('href');

        if (datasetHref) {
            discoveredDatasetHrefs.push(datasetHref);
        } else {
            // - LOG -
            logger.error({module: module, context: context}, `[ERRO] Falha ao encontrar o HREF do elemento "dataset-item" no índice ${index}!`);
            // - - -
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
async function BuildDatasetApiPageUrl(discoveredDatasetPageUrl: string): Promise<string | null> {
    const context = 'BuildDatasetApiPageUrl';
    const datasetPageData = await LoadAxios(discoveredDatasetPageUrl);

    // - ERRO -
    if (!datasetPageData || datasetPageData.status != 200) {
        logger.error({module: module, context: context, data: `${discoveredDatasetPageUrl}`}, `[ERRO] Não foi possível obter os dados da página do dataset.`);
        return null;
    }
    // - - -

    let $ = cheerio.load(datasetPageData.data);
    const datasetApiPageHref = $('a[data-format="api"]').attr('href');

    // - ERRO -
    if (!datasetApiPageHref) {
        logger.error({module: module, context: context, data: `discoveredDatasetPageUrl`}, `[ERRO] Não foi possível encontrar o link de acesso para a página com o link para a API do dataset.`);
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
async function BuildDatasetApiPortalUrl(discoveredDatasetApiDocPageUrl: string): Promise<string | null> {
    const context = `BuildDatasetApiPageUrl`;
    const apiDocPageData = await LoadAxios(discoveredDatasetApiDocPageUrl);

    // - ERRO -
    if (!apiDocPageData || apiDocPageData.status !== 200) {
        logger.error({module: module, context: context}, `[ERRO] Não foi possível obter o conteúdo da página.`);
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
                timeout: 5000,
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
                        timeout: 5000,
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

    logger.error({module: module, context: context, data: `${discoveredDatasetApiDocPageUrl}`}, `[ERRO] Não foi possível obter o link para o portal da API do dataset.`);
    return null;
}

/*
    - TASK 5 -
    > Consulta a página do portal da api do conjutno de dados e busca os metadados da API no objeto swagger/openapi
*/
async function GetDatasetApiMetadata(discoveredDatasetApiPortalUrl: string, browser: Browser) {
    const context = `GetDatasetApiMetadata`;
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
                    logger.debug({module: module, context: context, data: `${sourceUrl}`}, `[SUCESSO] Especificação capturada na URL.`);
                    logger.trace({module: module, context: context}, `[INFO] Convertido de JSON com sucesso`);
                    return true;
                }
            } catch {
                // 2ª Tentativa: YAML Perfeito
                try {
                    const parsed = YAML.parse(text);
                    if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                        apiSpecEncontrada = parsed;
                        logger.debug({module: module, context: context, data: `${sourceUrl}`}, `[SUCESSO] Especificação capturada na URL`);
                        logger.trace({module: module, context: context}, `[INFO] Convertido de YAML com sucesso`);
                        return true;
                    }
                } catch {
                    // 3ª Tentativa: YAML Quebrado/Sujo
                    try {
                        const textLimpo = sanitizeMalformedYaml(text);
                        const parsed = YAML.parse(textLimpo);
                        if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                            apiSpecEncontrada = parsed;
                            logger.debug({module: module, context: context, data: `${sourceUrl}`}, `[SUCESSO] Especificação capturada na URL.`);
                            logger.trace({module: module, context: context}, `[INFO] Convertido de YAML (Higienizado) com sucesso!`);
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
            // > Se já encontrou a especificação, ignora qualquer outra resposta da rede
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

        // Navega até a URL do portal
        await newPage.goto(discoveredDatasetApiPortalUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // -------------------------------------------------------------
        // ESTRATÉGIA 2: Fallback Ativo (Garante a captura se a rede não pegar)
        // -------------------------------------------------------------
        if (!apiSpecEncontrada) {

            // - LOG -
            logger.debug({module: module, context: context}, `[FALLBACK] Tentando extrair especificação ativamente a partir da URL...`);
            // - - -

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
                    // - LOG -
                    logger.debug({module: module, context: context, data: `${candidateUrl}`}, `[FALLBACK] Executando fetch ativo.`);
                    // - - -

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
            // - LOG -
            logger.debug({module: module, context: context}, `[FALLBACK] Tentando busca direta via HTTP fora do navegador...`);
            // - - -

            const baseUrlPart = (discoveredDatasetApiPortalUrl || '').split('#')[0] || '';
            const candidateUrl = baseUrlPart.replace(/\/+$/, '').replace(/^http:\/\//i, 'https://') + '.yaml';

            try {
                const response = await fetch(candidateUrl);
                if (response.ok) {
                    const text = await response.text();
                    tentarParsearSpec(text, candidateUrl);
                }
            } catch (nodeFetchError) {
                logger.debug({module: module, context: context, data: `${nodeFetchError}`}, `[FALLBACK] Falha na busca direta via Node.`);
            }
        }

        return apiSpecEncontrada;
    } catch (error) {
        logger.error({module: module, context: context, data: `URL: ${discoveredDatasetApiPortalUrl} | Detalhes: ${error}`}, `[ERRO] Falha ao processar URL.`);
        return null;
    } finally {
        await newPage.close();
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
    > Retorna um objeto de AxiosResponse de uma URL consultada
*/
async function LoadAxios(pageUrl: string): Promise<AxiosResponse | null> {
    const context = 'LoadAxios';

    try {
        return await axios.get(pageUrl);
    } catch (error) {
        logger.error({module: module, context: context, data: `${error}`}, `[ERRO] Falha no método LoadAxios!`);
        return null;
    }
}

/*
    - AUXILIAR -
    > Construção da url da página do conjunto de dados obtido
*/
async function BuildDatasetPageUrl(discoveredDatasetHref: string, ckanMainPageBaseUrl: URL, db: BetterSQLite3Database<Record<string, never>>): Promise<string | null> {
    const context = `BuildDatasetPageUrl`;
    const datasetPageUrl = new URL(discoveredDatasetHref, ckanMainPageBaseUrl);

    if (datasetPageUrl) {
        return datasetPageUrl.toString();
    } else {
        logger.error({module: module, context: context, data: `${discoveredDatasetHref}`}, `[ERRO] Não foi possível montar a URL da página do dataset para o dataset.`);
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