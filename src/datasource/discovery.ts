/* 
    Arquivo responsável pela lógica de descoberta/scraping de APIs e Endpoints no portal do Tesouro Nacional Transparente. Automaticamente coleta os data sources (URL base + endpoints) e armazena em uma estrutura de dados.
*/
import axios, { type AxiosResponse } from "axios";
import * as cheerio from 'cheerio';
import puppeteer, { Browser } from "puppeteer";
import YAML from 'yaml';
import { YAMLError } from "yaml";

const BASE_URL: URL = new URL('https://www.tesourotransparente.gov.br/');
const BASE_CKAN_PATH: string = '/ckan/dataset'

export async function BuildDataSources() {
    // =====
    // PASSO 1. Descoberta dos datasets disponíveis na página principal dos datasets no ckan
    // Adicionado o search para filtrar por datasets com API disponível
    const ckanMainPageBaseUrl = new URL(BASE_CKAN_PATH, BASE_URL);
    ckanMainPageBaseUrl.search = "?res_format=API";

    let discoveredDatasetHrefs: string[] | null = await discoverAvaliableDataSets(ckanMainPageBaseUrl);

    if (!discoveredDatasetHrefs) {
        console.log("[ERRO: PASSO 1] A lista de datasets descobertos não foi gerada corretamente.");
        return;
    }
    console.log(`\n[DATA] Datasets encontrados: ${discoveredDatasetHrefs.length}`);
    console.table(discoveredDatasetHrefs);
    // =====
    const browser = await puppeteer.launch({ headless: true });
    for (const discoveredDatasetHref of discoveredDatasetHrefs) {
        // PASSO 2. Montagem dos URLs da página de cada dataset encontrado no PASSO 1
        let datasetPageUrl: string | null = await BuildDatasetPageUrl(discoveredDatasetHref, ckanMainPageBaseUrl)

        if (!datasetPageUrl) {
            console.log("[ERRO: PASSO 2] A URL da página do dataset não foi gerada corretamente.");
            return;
        }

        console.log(`\n[1 | DATA] URL da página do dataset:`)
        console.table(datasetPageUrl);
        // =====

        // =====
        // PASSO 3. Montagem da chave identificadora do dataset
        const datasetId = await BuildDatasetId(discoveredDatasetHref);

        if (!datasetId) {
            console.log(`[ERRO: PASSO 3] O id do dataset não foi gerada corretamente.\nHREF ${discoveredDatasetHref}`);
            return;
        }

        console.log(`\n[2 | DATA] ID do dataset:`)
        console.table(datasetId);
        // =====

        // =====
        // PASSO 4. Descoberta do url da página que contém o link para a API do dataset
        // * Link da página da documentação da API do dataset
        const datasetApiDocPageUrl = await BuildDatasetApiPageUrl(datasetPageUrl);

        if (!datasetApiDocPageUrl) {
            console.log(`[ERRO: PASSO 4] A url para a página da documentação da API do dataset não foi gerada corretamente.\nHREF: ${discoveredDatasetHref}`);
            return;
        }

        console.log(`\n[3 | DATA] Dataset Api Documentation Page URL:`);
        console.table(datasetApiDocPageUrl);
        // =====

        // =====
        // PASSO 5. Extração da url efetiva e acesso ao datalake que contém a url base da API e o(s) endpoint(s)
        const datasetApiPortalUrl = await BuildDatasetApiPortalUrl(datasetApiDocPageUrl);

        if (!datasetApiPortalUrl) {
            console.log(`[ERRO: PASSO 5] A url para o portal da API do dataset não foi gerada corretamente.\nHREF: ${discoveredDatasetHref}`);
            return;
        }
        console.log(`\n[4 | DATA] Dataset API Portal Page URL:`);
        console.table(datasetApiPortalUrl);
        // =====

        // =====
        // PASSO 6. Extração dos dados da API e Endpoints do dataset
        const datasetApiData = await GetDatasetApiData(datasetApiPortalUrl, browser);

        if (!datasetApiData) {
            console.log(`[ERRO: PASSO 6] Não foi possível obter os dados da API e Endpoints do dataset`);
            continue;
        }

        const baseUrl = datasetApiData['host'] || datasetApiData['servers'][0]['url'];

        if (!baseUrl) {
            console.log(`[ERRO: PASSO 6] Não foi possível obter a URL base do dataset.\n${discoveredDatasetHref}`);
            return;
        }

        console.log(`\n[5 | DATA] URL base: ${baseUrl}`);

        if (!datasetApiData['paths']) {
            console.log(`[ERRO: PASSO 6] Não foram encontrados paths (endpoints) para a url do dataset.\nURL: ${discoveredDatasetHref}`);
            return;
        }

        console.log(`\n---\n`);
    }
    await browser.close();

    // =====

}

async function discoverAvaliableDataSets(ckanMainPageBaseUrl: URL): Promise<string[] | null> {
    console.log("[INFO] Montando URLs e realizando requisição no axios...");
    const pageData = await LoadAxios(ckanMainPageBaseUrl.toString());

    if (!pageData || pageData.status != 200) {
        console.log(`[ERRO] Não foi possível realizar o load no cheerio para a url:\n${ckanMainPageBaseUrl.toString()}`)
        return null;
    }

    console.log("[INFO] Iniciando descoberta de datasets...");
    let $ = cheerio.load(pageData.data);
    let discoveredDatasetHrefs: string[] = [];
    $('.dataset-item').each((index, element) => {
        const datasetHref = $(element).find('.dataset-heading > a[href*="/ckan/dataset/"]').attr('href');

        if (datasetHref) {
            discoveredDatasetHrefs.push(datasetHref);
        } else {
            console.log(`[ERRO] Falha ao encontrar o HREF do elemento "dataset-item" no índice ${index}!`);
        }
    })

    return discoveredDatasetHrefs;
}

function BuildDatasetPageUrl(discoveredDatasetHref: string, ckanMainPageBaseUrl: URL): string | null {
    const datasetPageUrl = new URL(discoveredDatasetHref, ckanMainPageBaseUrl);

    if (datasetPageUrl) {
        return datasetPageUrl.toString();
    } else {
        console.log(`[ERRO] Não foi possível montar a URL da página do dataset para o dataset:\n${discoveredDatasetHref}`);
        return null;
    }
}

function BuildDatasetId(discoveredDatasetHref: string): string | null {
    const datasetId: string | null = discoveredDatasetHref.split('/').at(-1) || null;
    return datasetId;
}

async function BuildDatasetApiPageUrl(discoveredDatasetPageUrl: string): Promise<string | null> {
    const datasetPageData = await LoadAxios(discoveredDatasetPageUrl);

    if (!datasetPageData || datasetPageData.status != 200) {
        console.log("[ERRO: BuildDatasetApiPageUrl] Não foi possível obter os dados da página do dataset.\nURL: ", discoveredDatasetPageUrl);
        return null;
    }

    let $ = cheerio.load(datasetPageData.data);

    const datasetApiPageHref = $('a[data-format="api"]').attr('href');

    if (!datasetApiPageHref) {
        console.log("[ERRO: BuildDatasetApiPageUrl] Não foi possível encontrar o link de acesso para a página com o link para a API do dataset: \nURL: ", discoveredDatasetPageUrl);
        return null;
    }

    const datasetApiPageUrl = new URL(datasetApiPageHref, discoveredDatasetPageUrl);
    return datasetApiPageUrl.toString();
}

async function BuildDatasetApiPortalUrl(discoveredDatasetApiDocPageUrl: string): Promise<string | null> {
    const apiDocPageData = await LoadAxios(discoveredDatasetApiDocPageUrl);

    if (!apiDocPageData || apiDocPageData.status !== 200) {
        console.log(`[ERRO: BuildDatasetApiPortalUrl] Não foi possível obter o conteúdo da página.`);
        return null;
    }

    const $ = cheerio.load(apiDocPageData.data);

    // =========================================================================
    // CAMADA 1: Extração Direta do Padrão CKAN
    // =========================================================================
    // No CKAN, o link do recurso fica no botão principal ou no texto "URL: <a href...>"
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

    // =========================================================================
    // CAMADA 2: Fallback Genérico (Ignorando Menus, Headers e Footers)
    // =========================================================================
    const candidateUrls: string[] = [];

    // Busca apenas no conteúdo principal (#content ou main), ignorando menus e cabeçalhos
    $('#content a[href], main a[href]').not('header a, footer a, #menu a, .breadcrumb a').each((_, element) => {
        const rawHref = $(element).attr('href')?.trim();

        if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('#')) return;

        try {
            const absoluteUrl = new URL(rawHref, discoveredDatasetApiDocPageUrl).toString();
            const hrefLower = rawHref.toLowerCase();
            const linkText = $(element).text().toLowerCase();

            // REMOVIDO 'ckan' das palavras-chave para evitar capturar links de navegação do site
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

    // =========================================================================
    // CAMADA 3: Resolução de Redirecionamentos para Links Mascarados
    // =========================================================================
    for (const candidateUrl of uniqueCandidates) {
        try {
            const response = await axios.head(candidateUrl, {
                maxRedirects: 5,
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            const finalUrl = response.request.res?.responseUrl || response.config.url || candidateUrl;

            // Valida se a URL final resolvida é realmente uma API/Documentação
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

    console.log(`[ERRO: BuildDatasetApiPortalUrl] Não foi possível obter o link para o portal da API do dataset.\nURL: ${discoveredDatasetApiDocPageUrl}`);
    return null;
}

export async function GetDatasetApiData(discoveredDatasetApiPortalUrl: string, browser: Browser) {
    const newPage = await browser.newPage();

    try {
        // 1. Simula um navegador real para evitar bloqueios de segurança
        await newPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        let apiSpecEncontrada: any = null;

        // 2. Analisa o conteúdo de cada pacote recebido na rede
        newPage.on('response', async (response) => {
            // Se já capturamos a especificação, não precisamos continuar processando outras requisições
            if (apiSpecEncontrada) return;

            try {
                const request = response.request();
                const requestType = request.resourceType();
                const url = response.url().toLowerCase();

                // Filtra apenas requisições de dados (XHR/Fetch) ativas e com status de sucesso (200 OK)
                const isDataRequest = requestType === 'xhr' || requestType === 'fetch';
                if (!isDataRequest || response.status() !== 200) return;

                // Pegamos os cabeçalhos da RESPOSTA do servidor
                const responseHeaders = response.headers();
                const contentType = responseHeaders['content-type'] || '';

                // Checamos se a URL OU se o tipo do conteúdo entrega/é JSON/YAML
                const isJsonOrYaml =
                    contentType.includes('application/json') ||
                    contentType.includes('text/yaml') ||
                    contentType.includes('application/x-yaml');

                const hasUrlHint =
                    url.includes('swagger') ||
                    url.includes('openapi') ||
                    url.includes('api-docs') ||
                    url.endsWith('.json') ||
                    url.endsWith('.yaml');

                // Se a resposta for potencial de conter dados de API
                if (isJsonOrYaml || hasUrlHint) {
                    const text = await response.text();

                    // Validação do CONTEÚDO: procura as palavras-chave vitais do esquema OpenAPI/Swagger
                    const temEstruturaSwagger =
                        text.includes('"openapi"') ||
                        text.includes('"swagger"') ||
                        text.includes('openapi:') ||
                        text.includes('swagger:') ||
                        text.includes('"paths"');

                    if (temEstruturaSwagger) {
                        console.log(`[SUCESSO] Especificação capturada na URL: ${response.url()}`);

                        try {
                            // 1ª Tentativa: JSON
                            apiSpecEncontrada = JSON.parse(text);
                            console.log(`[INFO] Convertido de JSON com sucesso`);

                        } catch (jsonError) {

                            try {
                                // 2ª Tentativa: YAML Perfeito
                                apiSpecEncontrada = YAML.parse(text);
                                console.log(`[INFO] Convertido de YAML com sucesso`);

                            } catch (yamlError) {

                                // 3ª Tentativa: YAML Quebrado/Sujo (O Fallback para o caso de Custos)
                                console.log(`[AVISO] YAML malformado detectado! Tentando higienizar o texto...`);

                                try {
                                    const textLimpo = sanitizeMalformedYaml(text);
                                    apiSpecEncontrada = YAML.parse(textLimpo);
                                    console.log(`[INFO] Convertido de YAML (Higienizado) com sucesso!`);

                                } catch (finalError) {
                                    console.error(`[ERRO FATAL] O arquivo está tão quebrado que não pôde ser recuperado.`);
                                    console.error(finalError);
                                }
                            }
                        }
                    }
                }
            } catch {
                // Ignora erros ao ler respostas individuais para não interromper a execução
            }
        });

        // 3. Navega até a URL do portal e aguarda o carregamento das requisições de rede
        await newPage.goto(discoveredDatasetApiPortalUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Pausa amigável de 2 segundos para dar tempo do script da página processar tudo
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return apiSpecEncontrada;

    } catch (error) {
        console.log(`[ERRO: GetDatasetApiData] Falha ao processar URL: ${discoveredDatasetApiPortalUrl}\nDetalhes: ${error}`);
        return null;
    } finally {
        // 4. Sempre fecha a aba do navegador para não vazar memória RAM
        await newPage.close();
    }
}

async function LoadAxios(pageUrl: string): Promise<AxiosResponse | null> {
    try {
        return await axios.get(pageUrl);
    } catch (error) {
        console.log(`[ERRO] Falha no método LoadAxios!\n${error}`)
        return null;
    }
}

// Higienizador para consertar YAMLs malformados do governo
function sanitizeMalformedYaml(yamlString: string) {
    // Procura por padrões como: chave: "qualquer texto"
    // O regex considera strings que podem até ter aspas escapadas (\") dentro
    const regex = /([a-zA-Z0-9_]+:\s*")((?:[^"\\]|\\.)*)(")/g;

    return yamlString.replace(regex, (match, inicio, conteudo, fim) => {
        // Substitui a quebra de linha real (Enter) por um espaço
        const conteudoLimpo = conteudo.replace(/\r?\n/g, ' ');
        return inicio + conteudoLimpo + fim;
    });
}