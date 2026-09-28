import { relations } from 'drizzle-orm';
import { char, date, float, int, mysqlTable, serial, timestamp, text, varchar, bigint, longtext } from 'drizzle-orm/mysql-core';

// ==========
// 1. SCHEMAS
// ==========
export const logs = mysqlTable('logs', {
    id: serial('id').primaryKey().notNull(),
    type: text('type').notNull(),
    message: text('message').notNull(),
    data: longtext('data'),
    sourceModule: text('sourceModule'),
    sourceContext: text('sourceContext'),
    generatedAt: timestamp('generatedAt').notNull(),
});

export const dataSources = mysqlTable('data_sources', {
    id: serial('id').primaryKey().notNull(),
    baseUrl: text('base_url').notNull(),
    title: text('title'),
    rawMetadata: text('raw_metadata'),
});

export const endpoints = mysqlTable('endpoint', {
    id: serial('id').primaryKey().notNull(),
    dataSourceId: bigint('data_source_id', { mode: 'number', unsigned: true })
        .references(() => dataSources.id)
        .notNull(),
    path: text('path').notNull(),
    method: text('method'),
    summary: text('summary'),
    description: text('description'),
    tags: text('tags'),
});

export const endpointParameters = mysqlTable('endpoint_parameters', {
    endpointId: bigint('endpoint_id', { mode: 'number', unsigned: true })
        .references(() => endpoints.id)
        .notNull(),
    name: text('name').notNull(),
    in: text('in'),
    description: text('description'),
    is_required: int('is_required').notNull(),
    type: text('type'),
});

export const rawEndpointResponse = mysqlTable('raw_endpoint_response', {
    id: serial('id').primaryKey().notNull(),
    endpointId: bigint('endpoint_id', { mode: 'number', unsigned: true })
        .references(() => endpoints.id)
        .notNull(),
    raw_items: longtext('raw_items'),
    hasMore: int('hasMore'),
    limit: int('limit'),
    offset: int('offset'),
    count: int('count'),
    generatedAt: timestamp('generatedAt').notNull(),
});

export const apiLinks = mysqlTable('api_links', {
    id: serial('id').primaryKey().notNull(),
    endpointId: bigint('endpoint_id', { mode: 'number', unsigned: true })
        .references(() => rawEndpointResponse.id, { onDelete: 'cascade' })
        .notNull(),
    href: text('href'),
    rel: text('rel'),
    generatedAt: timestamp('generatedAt').notNull(),
});

// -----------------
// > RELACIONAMENTOS
// -----------------

export const rawEndpointRelations = relations(
    rawEndpointResponse,
    ({ one, many }) => ({
        endpointId: one(endpoints, {
            fields: [rawEndpointResponse.endpointId],
            references: [endpoints.id]
        }),
        links: many(apiLinks),
    })
);

export const apiLinksRelations = relations(
    apiLinks,
    ({ one }) => ({
        endpoint: one(rawEndpointResponse, {
            fields: [apiLinks.endpointId],
            references: [rawEndpointResponse.id],
        })
    })
);

export const dataSourcesRelations = relations(
    dataSources,
    ({ many }) => ({
        endpoints: many(endpoints),
    })
);

export const endpointParameterRelations = relations(
    endpointParameters,
    ({ one }) => ({
        endpoint: one(endpoints, {
            fields: [endpointParameters.endpointId],
            references: [endpoints.id],
        })
    })
);

export const endpointsRelations = relations(
    endpoints,
    ({ one, many }) => ({
        dataSource: one(dataSources, {
            fields: [endpoints.dataSourceId],
            references: [dataSources.id],
        }),
        parameters: many(endpointParameters),
    })
);

// =================
// 2. SILVER SCHEMA
// =================

// ----------
// > SCHEMAS
// ----------

export const entes = mysqlTable('entes', {
    codIbge: int('cod_ibge').primaryKey().notNull().unique(),
    ente: text('ente').notNull(),
    capital: int('capital'),
    regiao: text('regiao'),
    uf: char('uf', { length: 2 }),
    esfera: char('esfera', { length: 1 }),
    coCnpj: text('co_cnpj'),
    createdAt: timestamp('created_at'),
})

export const credor = mysqlTable('credor', {
    idCredor: serial('id_credor').primaryKey().notNull().unique(),
    credor: text('credor'),
    tipo: text('tipo'),
    createdAt: timestamp('created_at'),
})

export const pvl = mysqlTable('pvl', {
    idPleito: serial('id_pleito').primaryKey().notNull().unique(),
    codIbge: int('cod_ibge').notNull(),
    idcredor: int('id_credor').notNull(),
    numpvl: text('num_pvl'),
    status: text('status'),
    numProcesso: text('num_processo'),
    dataProtocolo: date('data_protocolo'),
    tipoOperacao: text('tipo_operacao'),
    finalidade: text('finalidade'),
    moeda: text('moeda'),
    valor: float('valor'),
    pvlAssocDivida: int('pvl_assoc_divida'),
    pvlContratadocredor: int('pvl_contratado_credor'),
    dataStatus: date('data_status'),
    createdAt: timestamp('created_at'),
})

export const operacoesNaoContratadas = mysqlTable('operacoes_nao_contratadas', {
    idPleito: int('id_pleito').primaryKey().notNull(),
    idPleitoNaoContratado: int('id_pleito_nao_contratado')
})

export const cambio = mysqlTable('cambio', {
    idPleito: int('id_pleito').primaryKey(),
    moeda: varchar('moeda', { length: 100 }),
    taxaCambio: float('taxa_cambio'),
    dataTaxaCambio: date('data_taxa_cambio'),
})

export const cdp = mysqlTable('cdp', {
    idPleito: int('id_pleito').primaryKey(),
    dataBase: date('data_base'),
    status: text('status'),
    dataStatus: date('data_status'),
    situacaoEnte: text('situacao_ente'),
})

export const resumoGeral = mysqlTable('resumo_geral', {
    idPleito: int('id_pleito').primaryKey(),
    ano: text('ano'),
    snPvlTramitacaoDeferido: char('sn_pvl_tramitacao_deferido', { length: 1 }),
    contrapartida: float('contrapartida'),
    liberacao: float('liberacao'),
    amortizacao: float('amortizacao'),
    encargos: float('encargos'),
    total: float('total'),
})

export const cronogramaLiberacoes = mysqlTable('cronograma_liberacoes', {
    idPleito: int('id_pleito').primaryKey(),
    ano: text('ano'),
    indicadorLiberacoes: char('indicador_liberacoes', { length: 0 }),
    liberacoesOperacoesSfn: float('liberacoes_operacoes_sfn'),
    liberacoesAro: float('liberacoes_aro'),
    liberacoesDemais: float('liberacoes_demais'),
    liberacoesTotal: float('liberacoes_total'),
})

export const cronogramaPagamentos = mysqlTable('cronograma_pagamentos', {
    idPleito: int('id_pleito').primaryKey(),
    ano: text('ano'),
    indicadorLiberacoes: char('indicador_liberacoes', { length: 0 }),
    dividaConsolidadaAmortizacao: float('divida_consolidada_amortizacao'),
    dividaConsolidadaEncargos: float('divida_consolidada_encargos'),
    operacoesContratadasAmortizacao: float('operacoes_contratadas_amortizacao'),
    operacoesContratadasEncargos: float('operacoes_contratadas_encargos'),
    totalAmortizacao: float('total_amortizacao'),
    totalEncargos: float('total_encargos'),
    indicadorDivMoedaEstrang: char('indicador_div_moeda_estrang', { length: 0 })
})

export const resumoCronogramaPagamentos = mysqlTable('resumo_cronograma_pagamentos', {
    idPleito: int('id_pleito').primaryKey(),
    ano: text('ano'),
    operacaoPleiteada: float('operacao_pleiteada'),
    demaisOperacoes: float('demais_operacoes'),
})

// ------------------
// > RELACIONAMENTOS
// ------------------
export const entesRelations = relations(
    entes,
    ({ many }) => ({
        pvls: many(pvl),
    })
)

export const credorRelations = relations(
    credor,
    ({ many }) => ({
        pvls: many(pvl),
    })
)

export const pvlRelations = relations(
    pvl,
    ({ one, many }) => ({
        ente: (one(entes, {
            fields: [pvl.codIbge],
            references: [entes.codIbge],
        })),
        credor: (one(credor, {
            fields: [pvl.idcredor],
            references: [credor.idCredor],
        })),
        opearacaoContratada: (many(operacoesNaoContratadas)),
        operacaoNaoContratada: (many(operacoesNaoContratadas)),
        cambios: (many(cambio)),
        cdps: (many(cdp)),
        resumoGeral: (many(resumoGeral)),
        cronogramaLiberacoes: (many(cronogramaLiberacoes)),
        resumoCronogramaPagamentos: (many(resumoCronogramaPagamentos)),
    })
)

export const operacoesNaoContratadasRelations = relations(
    operacoesNaoContratadas,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [operacoesNaoContratadas.idPleito],
            references: [pvl.idPleito],
        })),
        pleitoNaoContratado: (one(pvl, {
            fields: [operacoesNaoContratadas.idPleitoNaoContratado],
            references: [pvl.idPleito],
        }))
    })
)

export const cambioRelations = relations(
    cambio,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [cambio.idPleito],
            references: [pvl.idPleito],
        }))
    })
)

export const cdpRelations = relations(
    cdp,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [cdp.idPleito],
            references: [pvl.idPleito],
        }))
    })
)

export const resumoGeralRelations = relations(
    resumoGeral,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [resumoGeral.idPleito],
            references: [pvl.idPleito],
        }))
    })
)

export const cronogramaLiberacoesRelations = relations(
    cronogramaLiberacoes,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [cronogramaLiberacoes.idPleito],
            references: [pvl.idPleito],
        }))
    })
)

export const resumoCronogramaPagamentosRelations = relations(
    resumoCronogramaPagamentos,
    ({ one }) => ({
        pleito: (one(pvl, {
            fields: [resumoCronogramaPagamentos.idPleito],
            references: [pvl.idPleito],
        }))
    })
)