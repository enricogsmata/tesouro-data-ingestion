import axios from "axios";

// Configurações base da consulta
const BASE_URL = "https://apidatalake.tesouro.gov.br/ords/cdwhprd/sadipem/tt/pvl";
const INITIAL_PARAMS = {
  uf: "MG",     // Parâmetro de teste (ajuste se necessário)
  offset: 0,
  limit: 1000    // Altere o limite conforme sua necessidade de teste
};

/**
 * Extrai o link com rel="next" da resposta ORDS
 */
function getNextHref(responseData: any): string | null {
  if (!responseData) return null;

  // Trata hasMore como boolean ou string
  const hasMore = responseData.hasMore === true || String(responseData.hasMore).toLowerCase() === "true";
  
  if (responseData.next) {
    return String(responseData.next);
  }

  if (hasMore && Array.isArray(responseData.links)) {
    const nextLink = responseData.links.find((l: any) => l.rel === "next");
    return nextLink?.href ? String(nextLink.href) : null;
  }

  return null;
}

/**
 * Função principal de execução e teste do loop de paginação
 */
async function debugPagination() {
  console.log("==================================================");
  console.log("🚀 INICIANDO DIAGNÓSTICO DE PAGINAÇÃO DA API PVL");
  console.log("==================================================");

  let page = 1;
  let totalItemsFetched = 0;
  let hasNext = true;
  let nextHref: string | null = null;

  // Cópia dos parâmetros de busca iniciais
  let currentParams: Record<string, any> = { ...INITIAL_PARAMS };

  while (hasNext) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📄 PROCESSANDO PÁGINA ${page}`);
    console.log(`--------------------------------------------------`);

    try {
      // 1. Monta a URL garantindo sempre o domínio público da API
      const requestUrl = BASE_URL;

      if (nextHref) {
        console.log(`🔗 [LINK ORDS DETECTADO]: ${nextHref}`);
        
        // Extrai parâmetros do link retornado (ex: ?offset=100&limit=100)
        const parsedNextParams = Object.fromEntries(new URL(nextHref).searchParams);
        
        // MESCLA: Mantém os filtros da busca inicial (ex: uf: "SE") e atualiza os de paginação (offset, limit)
        currentParams = {
          ...currentParams,
          ...parsedNextParams
        };

        console.log(`🛠️ [PARAMS MESCLADOS PARA O AXIOS]:`, JSON.stringify(currentParams));
      } else {
        console.log(`🛠️ [PARAMS INICIAIS]:`, JSON.stringify(currentParams));
      }

      console.log(`🌐 [FAZENDO REQUISIÇÃO]: GET ${requestUrl}`);

      // 2. Executa a requisição HTTP
      const response = await axios.get(requestUrl, {
        params: currentParams,
        timeout: 60000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json"
        }
      });

      console.log(`✅ [STATUS]: ${response.status} ${response.statusText}`);

      const responseData = response.data ?? {};
      const items = responseData.items ?? responseData.registros ?? [];

      console.log(`📊 [PÁGINA ${page} METADADOS]:`);
      console.log(`   - Itens recebidos nesta página: ${items.length}`);
      console.log(`   - responseData.offset: ${responseData.offset}`);
      console.log(`   - responseData.limit: ${responseData.limit}`);
      console.log(`   - responseData.count: ${responseData.count}`);
      console.log(`   - responseData.hasMore: ${responseData.hasMore} (tipo: ${typeof responseData.hasMore})`);

      totalItemsFetched += items.length;
      console.log(`📈 [TOTAL DE ITENS ACUMULADOS ATÉ AGORA]: ${totalItemsFetched}`);

      if (items.length === 0) {
        console.log(`⚠️ [PARADA]: Array de itens veio vazio. Encerrando paginação.`);
        hasNext = false;
        break;
      }

      // 3. Extrai o próximo link
      nextHref = getNextHref(responseData);

      if (nextHref) {
        console.log(`➡️ [PRÓXIMO LINK IDENTIFICADO]: ${nextHref}`);
        page++;
      } else {
        console.log(`🛑 [FIM]: Nenhum link "next" encontrado ou hasMore é false.`);
        hasNext = false;
      }

      // Pequeno delay para evitar rate limit na API pública
      await new Promise((resolve) => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error(`❌ [ERRO NA PÁGINA ${page}]:`, error?.message || error);
      if (error?.response) {
        console.error(`   - Status da resposta: ${error.response.status}`);
        console.error(`   - Dados da resposta:`, error.response.data);
      }
      hasNext = false;
    }
  }

  console.log("\n==================================================");
  console.log(`🏁 DIAGNÓSTICO FINALIZADO | Total de páginas: ${page} | Total de registros: ${totalItemsFetched}`);
  console.log("==================================================");
}

// Executa o teste
debugPagination();