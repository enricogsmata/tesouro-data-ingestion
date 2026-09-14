/* 
    Arquivo responsável pela lógica de descoberta/scraping de APIs e Endpoints no portal do Tesouro Nacional Transparente. Automaticamente coleta os data sources (URL base + endpoints) e armazena em uma estrutura de dados.
*/
import axios, { type AxiosResponse } from "axios";
import * as cheerio from 'cheerio';
import puppeteer, { Browser } from "puppeteer";
import YAML from 'yaml';
import { YAMLError } from "yaml";
import type { DataSource } from "./models.js";

const BASE_URL: URL = new URL('https://www.tesourotransparente.gov.br/');
const BASE_CKAN_PATH: string = '/ckan/dataset'

export async function BuildDataSources(): Promise<DataSource[] | null> {
    // =====
    // PASSO 1. Descoberta dos datasets disponíveis na página principal dos datasets no ckan
    // Adicionado o search para filtrar por datasets com API disponível
    const ckanMainPageBaseUrl = new URL(BASE_CKAN_PATH, BASE_URL);
    ckanMainPageBaseUrl.search = "?res_format=API";

    let discoveredDatasetHrefs: string[] | null = await discoverAvaliableDataSets(ckanMainPageBaseUrl);

    if (!discoveredDatasetHrefs) {
        console.log("[ERRO: PASSO 1] A lista de datasets descobertos não foi gerada corretamente.");
        return null;
    }
    console.log(`\n[DATA] Datasets encontrados: ${discoveredDatasetHrefs.length}`);
    console.table(discoveredDatasetHrefs);
    // =====
    const browser = await puppeteer.launch({ headless: true });
    let builtDataSources: DataSource[] = [];
    for (const discoveredDatasetHref of discoveredDatasetHrefs) {
        // TEMP
        console.clear();

        // PASSO 2. Montagem dos URLs da página de cada dataset encontrado no PASSO 1
        let datasetPageUrl: string | null = await BuildDatasetPageUrl(discoveredDatasetHref, ckanMainPageBaseUrl)

        if (!datasetPageUrl) {
            console.log("[ERRO: PASSO 2] A URL da página do dataset não foi gerada corretamente.");
            continue;
        }

        console.log(`\n[1 | DATA] URL da página do dataset:`)
        console.table(datasetPageUrl);
        // =====

        // =====
        // PASSO 3. Montagem da chave identificadora do dataset
        const datasetId = await BuildDatasetId(discoveredDatasetHref);

        if (!datasetId) {
            console.log(`[ERRO: PASSO 3] O id do dataset não foi gerada corretamente.\nHREF ${discoveredDatasetHref}`);
            continue;
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
            continue;
        }

        console.log(`\n[3 | DATA] Dataset Api Documentation Page URL:`);
        console.table(datasetApiDocPageUrl);
        // =====

        // =====
        // PASSO 5. Extração da url efetiva e acesso ao datalake que contém a url base da API e o(s) endpoint(s)
        const datasetApiPortalUrl = await BuildDatasetApiPortalUrl(datasetApiDocPageUrl);

        if (!datasetApiPortalUrl) {
            console.log(`[ERRO: PASSO 5] A url para o portal da API do dataset não foi gerada corretamente.\nHREF: ${discoveredDatasetHref}`);
            continue;
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

        const datasetBaseUrl = datasetApiData['host'] || datasetApiData['servers'][0]['url'];

        if (!datasetBaseUrl) {
            console.log(`[ERRO: PASSO 6] Não foi possível obter a URL base do dataset.\n${discoveredDatasetHref}`);
            continue;
        }

        console.log(`\n[5 | DATA] URL base: ${datasetBaseUrl}`);

        if (!datasetApiData['paths']) {
            console.log(`[ERRO: PASSO 6] Não foram encontrados paths (endpoints) para a url do dataset.\nURL: ${discoveredDatasetHref}`);
            continue;
        }

        // =====

        // =====
        // PASSO 7: Construção do objeto do DataSource em memória
        const datasourceTitle = datasetApiData['info']['title'] || '';
        const newDatasource: DataSource = {
            tempId: datasetId,
            title: datasourceTitle,
            baseUrl: sanitizeBaseUrl(datasetBaseUrl)
        }

        builtDataSources.push(newDatasource);

        console.log(`\n---\n`);
    }
    await browser.close();
    // =====

    return builtDataSources;
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

// Higienizador que conserta quebras de linha dentro de strings no YAML do governo
function sanitizeMalformedYaml(yamlString: string): string {
    const regex = /([a-zA-Z0-9_]+:\s*")((?:[^"\\]|\\.)*)(")/g;

    return yamlString.replace(regex, (match, inicio, conteudo, fim) => {
        const conteudoLimpo = conteudo.replace(/\r?\n/g, ' ');
        return inicio + conteudoLimpo + fim;
    });
}

async function GetDatasetApiData(discoveredDatasetApiPortalUrl: string, browser: Browser) {
    const newPage = await browser.newPage();

    try {
        await newPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        let apiSpecEncontrada: any = null;

        // Helper interno para validar e tentar parsear o texto capturado em JSON ou YAML
        const tentarParsearSpec = (text: string, sourceUrl: string): boolean => {
            if (!text || apiSpecEncontrada) return false;

            // Validação do CONTEÚDO: procura as palavras-chave vitais do esquema OpenAPI/Swagger
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
                    console.log(`[SUCESSO] Especificação capturada na URL: ${sourceUrl}`);
                    console.log(`[INFO] Convertido de JSON com sucesso`);
                    return true;
                }
            } catch {
                // 2ª Tentativa: YAML Perfeito
                try {
                    const parsed = YAML.parse(text);
                    if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                        apiSpecEncontrada = parsed;
                        console.log(`[SUCESSO] Especificação capturada na URL: ${sourceUrl}`);
                        console.log(`[INFO] Convertido de YAML com sucesso`);
                        return true;
                    }
                } catch {
                    // 3ª Tentativa: YAML Quebrado/Sujo
                    try {
                        const textLimpo = sanitizeMalformedYaml(text);
                        const parsed = YAML.parse(textLimpo);
                        if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
                            apiSpecEncontrada = parsed;
                            console.log(`[SUCESSO] Especificação capturada na URL: ${sourceUrl}`);
                            console.log(`[INFO] Convertido de YAML (Higienizado) com sucesso!`);
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
        // ESTRATÉGIA 1: Interceptador de Rede (Passivo Ampliado)
        // -------------------------------------------------------------
        newPage.on('response', async (response) => {
            // Se já encontrou a especificação, ignora qualquer outra resposta da rede
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
            console.log(`[FALLBACK] Tentando extrair especificação ativamente a partir da URL...`);

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
                    console.log(`[FALLBACK] Executando fetch ativo em: ${candidateUrl}`);

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
            console.log(`[FALLBACK NODE] Tentando busca direta via HTTP fora do navegador...`);

            const baseUrlPart = (discoveredDatasetApiPortalUrl || '').split('#')[0] || '';
            const candidateUrl = baseUrlPart.replace(/\/+$/, '').replace(/^http:\/\//i, 'https://') + '.yaml';

            try {
                const response = await fetch(candidateUrl);
                if (response.ok) {
                    const text = await response.text();
                    tentarParsearSpec(text, candidateUrl);
                }
            } catch (nodeFetchError) {
                console.log(`[FALLBACK NODE] Falha na busca direta via Node:`, nodeFetchError);
            }
        }

        return apiSpecEncontrada;

    } catch (error) {
        console.log(`[ERRO: GetDatasetApiData] Falha ao processar URL: ${discoveredDatasetApiPortalUrl}\nDetalhes: ${error}`);
        return null;
    } finally {
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

function sanitizeBaseUrl(rawUrl: string): string {
    let url = rawUrl.trim();

    // 1. Garante o protocolo https:// se não houver http:// ou https://
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }

    // 2. Remove barras no final para padronizar a concatenação depois
    return url.replace(/\/+$/, '');

    // Exemplos de resultado:
    // "apidatalake.tesouro.gov.br/ords/..." -> "https://apidatalake.tesouro.gov.br/ords/..."
    // "https://apiapex.tesouro.gov.br/aria/" -> "https://apiapex.tesouro.gov.br/aria"
}
