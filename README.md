# 🏛️ Tesouro Transparente — Data Ingestion Pipeline

Pipeline de engenharia de dados de alta performance desenvolvido em **TypeScript** e **Node.js** para descoberta automatizada, extração, catalogação, higienização e modelagem relacional dos dados abertos do portal [Tesouro Transparente](https://www.tesourotransparente.gov.br/ckan/dataset).

O projeto é estruturado segundo os princípios da **Arquitetura Medalhão (Medallion Architecture)**, dividido nas camadas **Bronze** (dados brutos e descoberta de APIs) e **Silver** (tratamento, enriquecimento e modelagem relacional no MySQL via Drizzle ORM).

---

## 📑 Sumário

- [1. Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
- [2. Camada Bronze — Raw Ingestion & API Discovery](#2-camada-bronze--raw-ingestion--api-discovery)
  - [2.1. Discovery de Fontes (Web Scraping CKAN)](#21-discovery-de-fontes-web-scraping-ckan)
  - [2.2. Captura & Documentação de APIs (OpenAPI / Swagger)](#22-captura--documentação-de-apis-openapi--swagger)
  - [2.3. Mapeamento de Endpoints & Parâmetros](#23-mapeamento-de-endpoints--parâmetros)
  - [2.4. Fetch Paginado & Persistência Bruta](#24-fetch-paginado--persistência-bruta)
- [3. Camada Silver — Tratamento & Modelagem Relacional](#3-camada-silver--tratamento--modelagem-relacional)
  - [3.1. Processamento em Lotes (Batching)](#31-processamento-em-lotes-batching)
  - [3.2. Módulos & Domínios de Transformação](#32-módulos--domínios-de-transformação)
  - [3.3. Idempotência e Integridade Referencial](#33-idempotência-e-integridade-referencial)
- [4. Estrutura do Repositório](#4-estrutura-do-repositório)
- [5. Modelagem do Banco de Dados](#5-modelagem-do-banco-de-dados)
- [6. Configuração e Instalação](#6-configuração-e-instalação)
- [7. Guia de Execução](#7-guia-de-execução)
  - [7.1. Execução Completa](#71-execução-completa)
  - [7.2. CLI Interativo](#72-cli-interativo)
  - [7.3. CLI com Flags e Automação](#73-cli-com-flags-e-automação)
- [8. Logs e Observabilidade](#8-logs-e-observabilidade)
- [9. Boas Práticas e Resiliência](#9-boas-práticas-e-resiliência)

---

## 1. Visão Geral da Arquitetura

O ecossistema de dados públicos do Tesouro Nacional disponibiliza conjuntos de dados complexos através de múltiplos serviços (APIs REST, Oracle APEX e Swagger/OpenAPI). Este pipeline automatiza desde a varredura inicial da página do CKAN até a carga analítica final.

```mermaid
flowchart TD
    subgraph Discovery ["1. Discovery & Web Scraping"]
        A["Portal CKAN<br/>/ckan/dataset?res_format=API"] -->|Cheerio| B["Páginas de Datasets"]
        B -->|Cheerio + Redirects| C["Páginas de Recursos & Docs"]
        C -->|Puppeteer + Fallbacks| D["Metadados Swagger/OpenAPI<br/>(JSON / YAML)"]
    end

    subgraph Bronze ["2. Camada Bronze (Raw Ingestion)"]
        D -->|Catalogação| E[("Tabelas de Controle:<br/>data_sources / endpoint / endpoint_parameters")]
        E -->|Param Mapper + Cartesian Gen| F["Endpoint Fetcher Orchestrator"]
        F -->|Axios + Retries + Cache 24h| G["Requisições HTTP aos Endpoints"]
        G -->|Chunked Bulk Insert| H[("Banco Bronze:<br/>raw_endpoint_response & raw_ds*")]
    end

    subgraph Silver ["3. Camada Silver (Curated Data)"]
        H -->|Load em Lotes (BATCH_SIZE=1000)| I["Silver Transformers Orchestrator"]
        I -->|Sanitização, Parse de Datas, Tipagem| J["Transformação & Resolução de FKs"]
        J -->|Upsert onDuplicateKeyUpdate| K[("Banco Silver Relacional:<br/>Dimensões & Fatos")]
    end
```

---

## 2. Camada Bronze — Raw Ingestion & API Discovery

A Camada Bronze tem como objetivo mapear autonomamente quais APIs existem no catálogo de dados abertos, catalogar seus endpoints e especificações técnicas e descarregar os dados brutos (raw) no banco de dados relacional.

### 2.1. Discovery de Fontes (Web Scraping CKAN)
- **Localização:** `src/pipelines/bronze/discovery/discovery.ts`
- **Ponto de entrada:** `https://www.tesourotransparente.gov.br/ckan/dataset` com parâmetro `?res_format=API`.
- **Fluxo em 5 tarefas modulares:**
  1. `discoverAvaliableDataSets`: Efetua requisição HTTP com **Axios** e parseia a lista de cards (`.dataset-item`) via **Cheerio**, coletando as URLs de todos os datasets com APIs disponíveis.
  2. `BuildDatasetPageUrl`: Constrói dinamicamente as URLs canônicas das páginas individuais dos datasets.
  3. `BuildDatasetApiPageUrl`: Navega na página do dataset e encontra o recurso de documentação com a tag `a[data-format="api"]`.
  4. `BuildDatasetApiPortalUrl`: Extrai a URL final do portal da documentação (ex: *ApiDataLake* ou *Oracle APEX*). Possui 3 camadas de fallback: links padrão do CKAN (`.resource-url-analytics`), varredura heurística ignorando headers/footers e resolução de redirecionamentos HTTP (HEAD com fallback para GET).
  5. `GetDatasetApiMetadata`: Extrai a especificação OpenAPI/Swagger completa.

### 2.2. Captura & Documentação de APIs (OpenAPI / Swagger)
Como muitos portais governamentais renderizam a documentação via Single Page Application (Swagger UI / ReDoc), a extração direta por HTML falharia. O pipeline adota uma estratégia multicamadas com **Puppeteer**:
1. **Network Response Interception:** Monitora o tráfego do navegador headless e intercepta respostas de rede com `content-type` JSON/YAML ou com sufixos `.json`, `.yaml`, `.yml`, `swagger`, `openapi` ou `api-docs`.
2. **Parser Híbrido com Higienização:**
   - 1ª tentativa: `JSON.parse`.
   - 2ª tentativa: `YAML.parse`.
   - 3ª tentativa: `sanitizeMalformedYaml` + `YAML.parse` (corrige strings multilinha não escapadas comuns nos metadados do governo brasileiro).
3. **Fallback Ativo no Navegador:** Caso a interceptação passiva não capture, executa `fetch` interno com redirecionamentos ativados (`redirect: 'follow'`) para candidatos de extensão (`.yaml`, `.json`, `.yml`).
4. **Fallback HTTP Externo via Node.js:** Se houver bloqueio por CORS ou Mixed Content no navegador, o Node.js realiza a requisição direta.

### 2.3. Mapeamento de Endpoints & Parâmetros
- **Localização:** `src/pipelines/bronze/discovery/endpoint_mapper.ts`
- Processa o objeto Swagger em memória e extrai os métodos HTTP válidos (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
- **Nomenclatura determinística da tabela alvo (`generateTargetTableName`):**
  - Cria um nome exclusivo para cada endpoint com o padrão `raw_ds<ID>_<segmentos>`, limitando a 55 caracteres para garantir conformidade com o limite de 64 caracteres de identificadores do MySQL.
- **Catalogação de parâmetros:** Extrai metadados de cada parâmetro aceito pela rota (`name`, `in`, `type`, `is_required`, `description`).

### 2.4. Fetch Paginado & Persistência Bruta
- **Localização:** `src/pipelines/bronze/fetchers/index.ts` e `param_mapper.ts`
- **Resolvedor de Parâmetros Obrigatórios (`param_mapper.ts`):** Muitos endpoints exigem parâmetros obrigatórios para responder (ex: ano de exercício, tipo de matriz contábil, código IBGE do ente). O `parameterResolver` fornece valores válidos dinamicamente:
  - `an_exercicio` / `an_referencia`: Intervalos automáticos desde 2015/2002 até o ano corrente.
  - `id_ente`: Busca códigos IBGE de municípios/estados a partir do endpoint de entes já persistido ou via fallback direto.
  - `classe_conta`, `co_poder`, `co_tipo_demonstrativo`, `co_tipo_matriz`, `tema`, `nr_periodo`.
- **Produto Cartesiano com Generator:** Para endpoints com múltiplos parâmetros obrigatórios, utiliza uma função geradora recursiva (`cartesianGenerator`) que gera as combinações sob demanda, eliminando riscos de estouro de memória (Out-Of-Memory) na RAM.
- **Estratégia de Paginação:**
  - Suporta links de paginação HATEOAS (`response.data.next` ou `rel="next"` em `response.data.links`).
  - Suporta offset numérico progressivo (`offset` + `limit`).
- **Resiliência e Cache:**
  - **Cache de 24 horas:** Endpoints com dados coletados há menos de 24h são ignorados automaticamente (`isEndpointCached`).
  - **Retry exponencial:** Até 5 tentativas por requisição com delay progressivo em caso de falhas de rede.
  - **Inserção em Chunks:** Salva os registros brutos tanto na tabela genérica `raw_endpoint_response` (com JSON minificado) quanto diretamente na tabela alvo dedicada do endpoint (`raw_ds*`) em lotes de 1.000 registros.

---

## 3. Camada Silver — Tratamento & Modelagem Relacional

A Camada Silver é responsável pelo processamento analítico, limpeza de dados, normalização em modelo relacional e enriquecimento semântico.

```mermaid
flowchart LR
    subgraph BronzeDB ["Camada Bronze"]
        RawPVL["raw_ds1_sadipem_tt_pvl"]
        RawEntes["raw_ds4_siconfi_tt_entes"]
        RawCron["raw_ds1_opc_cronograma_pagamentos"]
        RawCustos["raw_ds2_custos_tt_*"]
        RawMSC["raw_ds4_siconfi_tt_msc_*"]
    end

    subgraph SilverDB ["Camada Silver (Normalizada)"]
        Ente["ente (Dimensão IBGE)"]
        Credor["credor (Dimensão)"]
        PVL["pvl (Fato / Pleitos)"]
        Cron["cronograma_pagamentos"]
        Custos["custos (Fatos Setoriais)"]
        MSC["matriz_saldo_contabil"]
    end

    RawEntes --> Ente
    RawPVL --> Credor
    RawPVL --> PVL
    Ente -.->|FK cod_ibge| PVL
    Credor -.->|FK id_credor| PVL
    RawCron --> Cron
    PVL -.->|FK id_pleito| Cron
    RawCustos --> Custos
    RawMSC --> MSC
```

### 3.1. Processamento em Lotes (Batching)
- **Localização:** `src/pipelines/silver/utils.ts` e `src/pipelines/silver/jobs/`
- Todos os transformers utilizam paginação controlada via `offset` e limite constante (`BATCH_SIZE = 1000`).
- Processamento em streaming de lotes: carrega 1.000 linhas da Bronze, transforma em memória e persiste na Silver antes de avançar para o próximo lote, garantindo baixo consumo de memória mesmo para tabelas com milhões de registros.

### 3.2. Módulos & Domínios de Transformação
A ordem de execução orquestrada em `src/pipelines/silver/main.ts` preserva estritamente a integridade referencial:

1. **Entidades Fundamentais & Dimensões:**
   - `ente`: Mapeia cidades e estados do Brasil com dados oficiais do IBGE, região, capital, UF, CNPJ e esfera de governo.
   - `populacao_anual_ente`: Histórico demográfico anual dos entes federativos.
   - `credor`: Dimensão unificada de instituições financeiras e credores de operações de crédito.
2. **Operações de Crédito (SADIPEM / PVL):**
   - `pvl`: Pedidos de Verificação de Limites para contratação de dívidas e garantias da União.
   - `cronograma_pagamentos` & `cronograma_liberacoes`: Projeções de amortização, encargos e fluxos financeiros.
   - `taxa_cambio`: Cotações e taxas cambiais vinculadas a operações de crédito externo.
   - `cdp`: Certificado de Regularidade Previdenciária e status do ente.
   - `tramitacao_deferido`: Pleitos deferidos em tramitação.
3. **Custos do Governo Federal (SIC):**
   - `depreciacao`, `custo_ativo`, `custo_inativo`, `custo_pensionista`, `transferencia`, `demais_custos`: Análise de custos de pessoal, transferências voluntárias/obrigatórias e consumo de bens.
4. **Estatísticas Fiscais & Séries Temporais:**
   - `resultado_fiscal`: Metas fiscais, superávit/déficit primário e séries históricas do Tesouro Nacional.
5. **Demonstrativos Fiscais & Contábeis (SICONFI):**
   - `rreo`: Relatório Resumido da Execução Orçamentária.
   - `rgf`: Relatório de Gestão Fiscal.
   - `dca`: Declaração de Contas Anuais.
   - `msc_patrimonial`, `msc_orcamentaria`, `msc_controle`: Matrizes de Saldos Contábeis do plano de contas nacional (PCASP).
   - `extrato_entregas` & `anexos_relatorios`: Metadados das homologações de relatórios fiscais por municípios e estados.

### 3.3. Idempotência e Integridade Referencial
- **Conversão segura de tipos:** Strings contendo datas em formatos variados (`dd/MM/yyyy`, ISO) são normalizadas com `date-fns` via `parseStringToDate`. Números e moedas são tipados como `double` ou `int`.
- **Upserts Idempotentes:** Todas as cargas na Silver utilizam a cláusula `.onDuplicateKeyUpdate({ set: ... })` do Drizzle ORM sobre chaves primárias e índices únicos. Isso viabiliza reexecuções parciais ou totais sem risco de dados duplicados ou quebra de restrições.

---

## 4. Estrutura do Repositório

```plaintext
tesouro-data-ingestion/
├── drizzle.bronze.config.ts    # Configuração do Drizzle Kit para o banco Bronze
├── drizzle.silver.config.ts    # Configuração do Drizzle Kit para o banco Silver
├── package.json                # Dependências, tipos e scripts npm
├── tsconfig.json               # Configuração do compilador TypeScript
├── .env                        # Strings de conexão dos bancos e variáveis
│
└── src/
    ├── run.ts                  # Entry point padrão para execução sequencial completa
    ├── run.cli.ts              # Entry point do CLI interativo e por flags
    │
    ├── database/               # Definições de banco de dados e schemas
    │   ├── dbConnection.ts     # Pools de conexão MySQL e clientes Drizzle (bronzeDB e silverDB)
    │   ├── bronze_schema.ts    # Schemas de tabelas da camada Bronze (controle + raw_ds*)
    │   ├── silver_schema.ts    # Schemas relacionais da camada Silver (entidades + fatos)
    │   ├── types.ts            # Tipagens TypeScript inferidas dos schemas
    │   └── utils.ts            # Dicionário de mapeamento de tabelas físicas (tablesMap)
    │
    ├── services/
    │   └── logs.ts             # Logger Pino (console pretty + persistência no banco Bronze)
    │
    └── pipelines/
        ├── bronze/             # Orquestração e jobs da Camada Bronze
        │   ├── main.ts         # Orquestrador bronzeOrchestrator
        │   ├── discovery/
        │   │   ├── discovery.ts         # Web Scraper do CKAN, Cheerio e Puppeteer
        │   │   └── endpoint_mapper.ts   # Mapeador de OpenAPI/Swagger para tabelas e rotas
        │   └── fetchers/
        │       ├── index.ts             # Extrator HTTP paginado, retries e persistência raw
        │       └── param_mapper.ts      # Resolvedor de parâmetros dinâmicos de query
        │
        └── silver/             # Orquestração e jobs da Camada Silver
            ├── main.ts         # Orquestrador silverOrchestrator
            ├── utils.ts        # Utilitários de lote (BATCH_SIZE) e conversão de datas
            └── jobs/           # 23+ transformers individuais (ETL Bronze -> Silver)
                ├── ente.transformer.ts
                ├── pvl.transformer.ts
                ├── credor.transformer.ts
                ├── rreo.transformer.ts
                ├── rgf.transformer.ts
                ├── dca.transformer.ts
                ├── msc_patrimonial.transformer.ts
                └── ... (demais transformers)
```

---

## 5. Modelagem do Banco de Dados

### Tabelas de Controle da Camada Bronze
- **`logs`**: Registros estruturados da execução (`type`, `message`, `data`, `sourceModule`, `sourceContext`, `generatedAt`).
- **`data_sources`**: Catálogo de APIs descobertas no CKAN (`baseUrl`, `title`, `rawMetadata` contendo a especificação OpenAPI).
- **`endpoint`**: Endpoints mapeados com caminho relativo (`path`), método HTTP (`method`), descrição e nome da tabela física (`target_table`).
- **`endpoint_parameters`**: Parâmetros aceitos pelo endpoint, com indicação de obrigatoriedade (`is_required`) e localização (`in`: query ou path).
- **`raw_endpoint_response`**: Respostas brutas completas em JSON, com dados de paginação (`hasMore`, `limit`, `offset`, `count`).
- **`raw_ds<ID>_<nome>`**: Tabelas dedicadas com as colunas originais de cada serviço.

### Principais Tabelas da Camada Silver
- **`ente`**: Cadastro de municípios, estados e Distrito Federal (`cod_ibge`, `ente`, `capital`, `regiao`, `uf`, `esfera`, `co_cnpj`).
- **`credor`**: Catálogo de instituições credoras (`id_credor`, `credor`, `tipo`).
- **`pvl`**: Pleitos de crédito (`id_pleito`, `cod_ibge`, `num_pvl`, `status`, `valor`, `data_protocolo`, `id_credor`).
- **`cronograma_pagamentos`** / **`cronograma_liberacoes`**: Cronogramas de desembolso e pagamento por ano e pleito.
- **`cambio`**: Histórico cambial vinculado aos pleitos.
- **`msc_*`**: Matrizes de Saldos Contábeis segregadas por escopo (patrimonial, orçamentária e controle).
- **`rreo`**, **`rgf`**, **`dca`**: Demonstrativos fiscais e orçamentários por exercício, período e ente.

---

## 6. Configuração e Instalação

### Pré-requisitos
- **Node.js** v20.x ou superior
- **MySQL Server** 8.0+
- **npm** v10+

### 1. Clonar o repositório e instalar dependências
```bash
git clone <URL_DO_REPOSITORIO>
cd tesouro-data-ingestion
npm install
```

### 2. Configurar variáveis de ambiente
Crie ou edite o arquivo `.env` na raiz do projeto com as URLs de conexão para os bancos da camada Bronze e Silver:

```env
# Banco de dados da Camada Bronze (armazenará dados brutos e metadados)
BRONZE_URL="mysql://usuario:senha@localhost:3306/raw_tesouro_db"

# Banco de dados da Camada Silver (armazenará as tabelas tratadas e relacionais)
SILVER_URL="mysql://usuario:senha@localhost:3306/tesouro_db"

# Nível mínimo de logs (trace, debug, info, warn, error, fatal)
LOG_LEVELS="info"
```

> **Nota:** Certifique-se de que os schemas/databases (`raw_tesouro_db` e `tesouro_db`) já existam no seu servidor MySQL antes de aplicar as migrações.

### 3. Sincronizar os Schemas com o Banco de Dados (Drizzle Kit)
Execute o comando `push` para criar ou sincronizar automaticamente a estrutura de tabelas em ambos os bancos:

```bash
# Criação das tabelas da Camada Bronze
npm run bronzedb:push

# Criação das tabelas da Camada Silver
npm run silverdb:push
```

---

## 7. Guia de Execução

### 7.1. Execução Completa
Executa o fluxo completo do pipeline de ponta a ponta: sanitização de logs antigos, discovery do CKAN, fetch dos dados brutos e carga da camada Silver.

```bash
npm start
```
*(Executa o comando `node --max-old-space-size=8192 --import tsx src/run.ts` alocando até 8GB de memória para processamento intensivo).*

---

### 7.2. CLI Interativo
O pipeline possui um assistente interativo no terminal via `readline` para facilitar execuções sob demanda, testes e manutenções parciais:

```bash
npm run cli
```

O assistente apresentará um menu guiado:
1. **Escolha da Camada:**
   - Camada Bronze Completa (Discovery + Fetch)
   - Camada Bronze Apenas Fetch (pula o Discovery do CKAN)
   - Camada Silver Completa (apenas transformação e carga relacional)
2. **Definição de Endpoint Inicial e Offset:** Permite retomar a extração a partir de um ID de endpoint ou offset específico.
3. **Execução Isolada de Endpoint:** Opção para rodar exclusivamente um único endpoint.

---

### 7.3. CLI com Flags e Automação
Você também pode acionar o CLI passando parâmetros diretamente, ideal para agendadores de tarefas (cron jobs, Airflow ou pipelines CI/CD):

#### Sintaxe Geral
```bash
npx tsx src/run.cli.ts [camada] [flags]
```

#### Opções de Camada
| Argumento | Descrição |
| :--- | :--- |
| `bronze`, `--layer=bronze` | Inicia o fluxo completo da Bronze (Discovery -> Fetch -> Silver). |
| `bronze-fetch`, `--skip-discovery` | Pula as etapas de scraping e discovery no CKAN e executa diretamente o Fetch dos dados. |
| `silver`, `--layer=silver` | Executa exclusivamente a transformação e carga da Camada Silver. |
| `-h`, `--help` | Exibe o manual de ajuda no terminal. |

#### Flags Adicionais
| Flag | Descrição | Exemplo |
| :--- | :--- | :--- |
| `-e <id>`, `--endpoint=<id>` | Define o ID do endpoint inicial para o Fetch. | `-e 4` |
| `-e <id> <offset>` | Define o ID do endpoint inicial e seu offset inicial de paginação. | `-e 17 100000` |
| `--max-offset=<num>` | Limite máximo de offset para interromper a paginação do endpoint. | `--max-offset=200000` |
| `-s`, `--single-endpoint` | Executa o fetch **apenas** no endpoint especificado. | `-e 4 -s` |
| `--skip-discovery` | Ignora a descoberta e mapeamento no CKAN. | `--skip-discovery` |

#### Exemplos Práticos

- **Pular Discovery e extrair todos os endpoints a partir do ID 4:**
  ```bash
  npx tsx src/run.cli.ts bronze-fetch -e 4
  ```

- **Extrair apenas o endpoint ID 17, iniciando no offset 100.000 até o limite de 200.000:**
  ```bash
  npx tsx src/run.cli.ts bronze-fetch -e 17 100000 --max-offset=200000 -s
  ```

- **Executar somente a camada Silver (transformação relacional):**
  ```bash
  npx tsx src/run.cli.ts silver
  ```

---

## 8. Logs e Observabilidade

O projeto adota o **Pino** para logging estruturado de alta performance com arquitetura multi-stream:

1. **Console Stream (`pino-pretty`):** Saída colorida, legível e formatada em tempo real no terminal.
2. **Database Stream (`logs` table):** Mensagens de advertência, erro e falha crítica (`level >= 40`: `WARN`, `ERROR`, `FATAL`) são inseridas automaticamente de forma assíncrona na tabela `logs` do banco Bronze.
3. **Contexto por Módulo e Método:** Cada log inclui rastreabilidade exata do arquivo e do método de origem através do helper `createLogger(import.meta.url).forMethod("nomeDoMetodo")`.
4. **Sanitização Periódica:** A rotina `sanitizelogsTable` elimina registros com mais de 30 dias na inicialização para evitar crescimento descontrolado do volume de dados de auditoria.

---

## 9. Boas Práticas e Resiliência

- **Gerenciamento de Memória RAM:** Uso de geradores iteráveis (`cartesianGenerator`), paginação em chunks de 1.000 registros e minificação de strings JSON (`JSON.stringify` sem indentação) garantem execução estável mesmo com grande volume de dados.
- **Idempotência Garantida:** Limpeza seletiva pré-fetch de tabelas de endpoints na Bronze e cláusulas `onDuplicateKeyUpdate` na Silver permitem execuções seguras a qualquer momento.
- **Polidez com o Servidor Público:** Inclusão de intervalos controlados (`sleep` / `setTimeout`) entre requisições HTTP e suporte a cache de 24 horas evitam sobrecarga nas APIs governamentais.
- **Resolução de Redirecionamentos:** Tratamento automático de códigos HTTP 301/302 e rotas HTTPS para mitigar instabilidades em portais legados do governo.

---

## 📄 Licença

Este projeto está sob a licença [ISC](LICENSE). Os dados coletados são de domínio público, disponibilizados pelo [Tesouro Transparente / Governo Federal do Brasil](https://www.tesourotransparente.gov.br/).
