import { relations } from 'drizzle-orm';
import { char, date, float, int, mysqlTable, serial, timestamp, text, varchar, bigint, longtext, primaryKey, foreignKey, double, uniqueIndex, type AnyMySqlColumn, datetime } from 'drizzle-orm/mysql-core';

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
    targetTable: text('target_table').notNull(),
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

export const rawDs1SadipemTtPvl = mysqlTable('raw_ds1_sadipem_tt_pvl', {
    id_pleito: int('id_pleito').primaryKey(),
    tipo_interessado: varchar('tipo_interessado', { length: 255 }),
    interessado: varchar('interessado', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    uf: varchar('uf', { length: 255 }),
    num_pvl: varchar('num_pvl', { length: 255 }),
    status: varchar('status', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    data_protocolo: varchar('data_protocolo', { length: 255 }),
    tipo_operacao: varchar('tipo_operacao', { length: 255 }),
    finalidade: varchar('finalidade', { length: 255 }),
    tipo_credor: varchar('tipo_credor', { length: 255 }),
    credor: varchar('credor', { length: 255 }),
    moeda: varchar('moeda', { length: 255 }),
    valor: double('valor'),
    pvl_assoc_divida: int('pvl_assoc_divida'),
    pvl_contratado_credor: int('pvl_contratado_credor'),
    data_status: varchar('data_status', { length: 255 }),
});

export const rawDs1OpcCronogramaPagamentos = mysqlTable('raw_ds1_opc_cronograma_pagamentos', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    num_pvl: varchar('num_pvl', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    indicador_liberacoes: varchar('indicador_liberacoes', { length: 255 }),
    ano: varchar('ano', { length: 255 }),
    divida_consolidada_amortizacao: double('divida_consolidada_amortizacao'),
    divida_consolidada_encargos: double('divida_consolidada_encargos'),
    operacoes_contratadas_amortizacao: double('operacoes_contratadas_amortizacao'),
    operacoes_contratadas_encargos: double('operacoes_contratadas_encargos'),
    total_amorizacao: double('total_amorizacao'),
    total_encargos: double('total_encargos'),
    indicador_div_moeda_estrang: varchar('indicador_div_moeda_estrang', { length: 255 }),
});

export const rawDs1OpcCronogramaLiberacoes = mysqlTable('raw_ds1_opc_cronograma_liberacoes', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    num_pvl: varchar('num_pvl', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    indicador_liberacoes: varchar('indicador_liberacoes', { length: 255 }),
    ano: varchar('ano', { length: 255 }),
    liberacoes_operacoes_sfn: double('liberacoes_operacoes_sfn'),
    liberacoes_aro: double('liberacoes_aro'),
    liberacoes_demais: double('liberacoes_demais'),
    liberacoes_total: double('liberacoes_total'),
});

export const rawDs1OpcTaxaCambio = mysqlTable('raw_ds1_opc_taxa_cambio', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    moeda: varchar('moeda', { length: 255 }),
    taxa_cambio: varchar('taxa_cambio', { length: 255 }),
    data_taxa_cambio: varchar('data_taxa_cambio', { length: 255 }),
});

export const rawDs1ResCronogramaPagamentos = mysqlTable('raw_ds1_res_cronograma_pagamentos', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    num_pvl: varchar('num_pvl', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    ano: varchar('ano', { length: 255 }),
    operacao_pleiteada: varchar('operacao_pleiteada', { length: 255 }),
    demais_operacoes: varchar('demais_operacoes', { length: 255 }),
});

export const rawDs1TtResCdp = mysqlTable('raw_ds1_tt_res_cdp', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    num_pvl: varchar('num_pvl', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    data_base: varchar('data_base', { length: 255 }),
    status: varchar('status', { length: 255 }),
    data_status: varchar('data_status', { length: 255 }),
    situacao_ente: varchar('situacao_ente', { length: 255 }),
});

export const rawDs1PvlTramitacaoDeferido = mysqlTable('raw_ds1_pvl_tramitacao_deferido', {
    id: serial('id').primaryKey(),
    id_pleito: int('id_pleito'),
    num_pvl: varchar('num_pvl', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }),
    sn_pvl_tramitacao_deferido: varchar('sn_pvl_tramitacao_deferido', { length: 255 }),
    pleito_nao_contratado: int('pleito_nao_contratado'),
    num_pvl_nao_contratado: varchar('num_pvl_nao_contratado', { length: 255 }),
    num_processo_nao_contratado: varchar('num_processo_nao_contratado', { length: 255 }),
    moeda_pvl_nao_contratado: varchar('moeda_pvl_nao_contratado', { length: 255 }),
    valor_pvl_nao_contratado: double('valor_pvl_nao_contratado'),
    status_pvl_nao_contratado: varchar('status_pvl_nao_contratado', { length: 255 }),
    ano_pvl_nao_contratado: varchar('ano_pvl_nao_contratado', { length: 255 }),
    contrapartida_pvl_nao_contratado: double('contrapartida_pvl_nao_contratado'),
    liberacao_pvl_nao_contratado: double('liberacao_pvl_nao_contratado'),
    amortizacao_pvl_nao_contratado: double('amortizacao_pvl_nao_contratado'),
    encargos_pvl_nao_contratado: double('encargos_pvl_nao_contratado'),
    liberacoes_pvl_nao_contratado: double('liberacoes_pvl_nao_contratado'),
});

export const rawDs2CustosTtDepreciacao = mysqlTable('raw_ds2_custos_tt_depreciacao', {
    id: serial('id').primaryKey(),
    co_natureza_juridica: int('co_natureza_juridica'),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
    co_organizacao_n0: varchar('co_organizacao_n0', { length: 255 }),
    ds_organizacao_n0: varchar('ds_organizacao_n0', { length: 255 }),
    co_organizacao_n1: varchar('co_organizacao_n1', { length: 255 }),
    ds_organizacao_n1: varchar('ds_organizacao_n1', { length: 255 }),
    co_organizacao_n2: varchar('co_organizacao_n2', { length: 255 }),
    ds_organizacao_n2: varchar('ds_organizacao_n2', { length: 255 }),
    co_organizacao_n3: varchar('co_organizacao_n3', { length: 255 }),
    ds_organizacao_n3: varchar('ds_organizacao_n3', { length: 255 }),
    an_lanc: int('an_lanc'),
    me_lanc: int('me_lanc'),
    id_conta_contabil: int('id_conta_contabil'),
    no_conta_contabil: varchar('no_conta_contabil', { length: 255 }),
    va_custo_depreciacao: double('va_custo_depreciacao'),
});

export const rawDs2CustosTtPensionistas = mysqlTable('raw_ds2_custos_tt_pensionistas', {
    id: serial('id').primaryKey(),
    co_natureza_juridica: int('co_natureza_juridica'),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
    co_organizacao_n0: varchar('co_organizacao_n0', { length: 255 }),
    ds_organizacao_n0: varchar('ds_organizacao_n0', { length: 255 }),
    co_organizacao_n1: varchar('co_organizacao_n1', { length: 255 }),
    ds_organizacao_n1: varchar('ds_organizacao_n1', { length: 255 }),
    co_organizacao_n2: varchar('co_organizacao_n2', { length: 255 }),
    ds_organizacao_n2: varchar('ds_organizacao_n2', { length: 255 }),
    co_organizacao_n3: varchar('co_organizacao_n3', { length: 255 }),
    ds_organizacao_n3: varchar('ds_organizacao_n3', { length: 255 }),
    an_lanc: int('an_lanc'),
    me_lanc: int('me_lanc'),
    va_custo_pensionistas: double('va_custo_pensionistas'),
});

export const rawDs2CustosTtPessoalAtivo = mysqlTable('raw_ds2_custos_tt_pessoal_ativo', {
    id: serial('id').primaryKey(),
    co_natureza_juridica: int('co_natureza_juridica'),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
    co_organizacao_n0: varchar('co_organizacao_n0', { length: 255 }),
    ds_organizacao_n0: varchar('ds_organizacao_n0', { length: 255 }),
    co_organizacao_n1: varchar('co_organizacao_n1', { length: 255 }),
    ds_organizacao_n1: varchar('ds_organizacao_n1', { length: 255 }),
    co_organizacao_n2: varchar('co_organizacao_n2', { length: 255 }),
    ds_organizacao_n2: varchar('ds_organizacao_n2', { length: 255 }),
    co_organizacao_n3: varchar('co_organizacao_n3', { length: 255 }),
    ds_organizacao_n3: varchar('ds_organizacao_n3', { length: 255 }),
    co_organizacao_n4: varchar('co_organizacao_n4', { length: 255 }),
    ds_organizacao_n4: varchar('ds_organizacao_n4', { length: 255 }),
    co_organizacao_n5: varchar('co_organizacao_n5', { length: 255 }),
    ds_organizacao_n5: varchar('ds_organizacao_n5', { length: 255 }),
    co_organizacao_n6: varchar('co_organizacao_n6', { length: 255 }),
    ds_organizacao_n6: varchar('ds_organizacao_n6', { length: 255 }),
    an_lanc: int('an_lanc'),
    me_lanc: int('me_lanc'),
    in_area_atuacao: int('in_area_atuacao'),
    ds_area_atuacao: varchar('ds_area_atuacao', { length: 255 }),
    in_escolaridade: varchar('in_escolaridade', { length: 255 }),
    ds_escolaridade: varchar('ds_escolaridade', { length: 255 }),
    in_faixa_etaria: varchar('in_faixa_etaria', { length: 255 }),
    ds_faixa_etaria: varchar('ds_faixa_etaria', { length: 255 }),
    in_sexo: varchar('in_sexo', { length: 255 }),
    in_forca_trabalho: int('in_forca_trabalho'),
    va_custo_de_pessoal: double('va_custo_de_pessoal'),
});

export const rawDs2CustosTtPessoalInativo = mysqlTable('raw_ds2_custos_tt_pessoal_inativo', {
    id: serial('id').primaryKey(),
    co_natureza_juridica: int('co_natureza_juridica'),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
    co_organizacao_n0: varchar('co_organizacao_n0', { length: 255 }),
    ds_organizacao_n0: varchar('ds_organizacao_n0', { length: 255 }),
    co_organizacao_n1: varchar('co_organizacao_n1', { length: 255 }),
    ds_organizacao_n1: varchar('ds_organizacao_n1', { length: 255 }),
    co_organizacao_n2: varchar('co_organizacao_n2', { length: 255 }),
    ds_organizacao_n2: varchar('ds_organizacao_n2', { length: 255 }),
    co_organizacao_n3: varchar('co_organizacao_n3', { length: 255 }),
    ds_organizacao_n3: varchar('ds_organizacao_n3', { length: 255 }),
    an_lanc: int('an_lanc'),
    me_lanc: int('me_lanc'),
    va_custo_pessoal_inativo: double('va_custo_pessoal_inativo'),
});

export const rawDs2CustosTtTransferencias = mysqlTable('raw_ds2_custos_tt_transferencias', {
    id: serial('id').primaryKey(),
    co_natureza_juridica: int('co_natureza_juridica'),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
    co_organizacao_n0: varchar('co_organizacao_n0', { length: 255 }),
    ds_organizacao_n0: varchar('ds_organizacao_n0', { length: 255 }),
    co_organizacao_n1: varchar('co_organizacao_n1', { length: 255 }),
    ds_organizacao_n1: varchar('ds_organizacao_n1', { length: 255 }),
    co_organizacao_n2: varchar('co_organizacao_n2', { length: 255 }),
    ds_organizacao_n2: varchar('ds_organizacao_n2', { length: 255 }),
    co_organizacao_n3: varchar('co_organizacao_n3', { length: 255 }),
    ds_organizacao_n3: varchar('ds_organizacao_n3', { length: 255 }),
    an_lanc: int('an_lanc'),
    me_lanc: int('me_lanc'),
    co_esfera_orcamentaria: int('co_esfera_orcamentaria'),
    ds_esfera_orcamentaria: varchar('ds_esfera_orcamentaria', { length: 255 }),
    co_resultado_eof: int('co_resultado_eof'),
    ds_resultado_eof: varchar('ds_resultado_eof', { length: 255 }),
    va_custo_transferencias: double('va_custo_transferencias'),
});

export const rawDs2CustosTtDemais = mysqlTable('raw_ds2_custos_tt_demais', {
    id: serial('id').primaryKey(),
    co_siorg_n04: varchar('co_siorg_n04', { length: 255 }),
    ds_siorg_n04: varchar('ds_siorg_n04', { length: 255 }),
    co_siorg_n05: varchar('co_siorg_n05', { length: 255 }),
    ds_siorg_n05: varchar('ds_siorg_n05', { length: 255 }),
    co_siorg_n06: varchar('co_siorg_n06', { length: 255 }),
    ds_siorg_n06: varchar('ds_siorg_n06', { length: 255 }),
    co_siorg_n07: varchar('co_siorg_n07', { length: 255 }),
    ds_siorg_n07: varchar('ds_siorg_n07', { length: 255 }),
    me_referencia: int('me_referencia'),
    an_referencia: int('an_referencia'),
    sg_mes_completo: varchar('sg_mes_completo', { length: 255 }),
    me_emissao: int('me_emissao'),
    an_emissao: int('an_emissao'),
    co_situacao_icc: varchar('co_situacao_icc', { length: 255 }),
    no_situacao_icc: varchar('no_situacao_icc', { length: 255 }),
    id_natureza_juridica_siorg: int('id_natureza_juridica_siorg'),
    ds_natureza_juridica_siorg: varchar('ds_natureza_juridica_siorg', { length: 255 }),
    id_categoria_economica_nade: varchar('id_categoria_economica_nade', { length: 255 }),
    id_grupo_despesa_nade: varchar('id_grupo_despesa_nade', { length: 255 }),
    id_moap_nade: varchar('id_moap_nade', { length: 255 }),
    id_elemento_despesa_nade: varchar('id_elemento_despesa_nade', { length: 255 }),
    id_subitem_nade: varchar('id_subitem_nade', { length: 255 }),
    co_natureza_despesa_deta: varchar('co_natureza_despesa_deta', { length: 255 }),
    no_natureza_despesa_deta: varchar('no_natureza_despesa_deta', { length: 255 }),
    id_esfera_orcamentaria: int('id_esfera_orcamentaria'),
    no_esfera_orcamentaria: varchar('no_esfera_orcamentaria', { length: 255 }),
    id_in_resultado_eof: varchar('id_in_resultado_eof', { length: 255 }),
    no_in_resultado_eof: varchar('no_in_resultado_eof', { length: 255 }),
    va_custo: double('va_custo'),
});

export const rawDs3CustomResultadoFiscal = mysqlTable('raw_ds3_custom_resultado_fiscal', {
    id: serial('id').primaryKey(),
    nomeTema: varchar('nomeTema', { length: 255 }),
    nomeSubtema: varchar('nomeSubtema', { length: 255 }),
    codigoTema: varchar('codigoTema', { length: 255 }),
    data: varchar('data', { length: 255 }),
    codigoSubtema: varchar('codigoSubtema', { length: 255 }),
    valor: double('valor'),
    codigoSerie: varchar('codigoSerie', { length: 255 }),
    nomeSerie: varchar('nomeSerie', { length: 255 }),
});

export const rawDs3TemporaisCustomSeries = mysqlTable('raw_ds3_temporais_custom_series', {
    codigoSerie: varchar('codigoSerie', { length: 255 }).primaryKey(),
    nomeSerie: varchar('nomeSerie', { length: 255 }),
    codigoTema: varchar('codigoTema', { length: 255 }),
    nomeTema: varchar('nomeTema', { length: 255 }),
    codigoSubtema: varchar('codigoSubtema', { length: 255 }),
    nomeSubtema: varchar('nomeSubtema', { length: 255 }),
});

export const rawDs4TtAnexosRelatorios = mysqlTable('raw_ds4_tt_anexos_relatorios', {
    id: serial('id').primaryKey(),
    esfera: varchar('esfera', { length: 255 }),
    demonstrativo: varchar('demonstrativo', { length: 255 }),
    anexo: varchar('anexo', { length: 255 }),
});

export const rawDs4SiconfiTtRreo = mysqlTable('raw_ds4_siconfi_tt_rreo', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio'),
    demonstrativo: varchar('demonstrativo', { length: 255 }),
    periodo: int('periodo'),
    periodicidade: varchar('periodicidade', { length: 255 }),
    instituicao: varchar('instituicao', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    uf: varchar('uf', { length: 255 }),
    populacao: int('populacao'),
    anexo: varchar('anexo', { length: 255 }),
    esfera: varchar('esfera', { length: 255 }),
    rotulo: varchar('rotulo', { length: 255 }),
    coluna: varchar('coluna', { length: 255 }),
    cod_conta: varchar('cod_conta', { length: 255 }),
    conta: varchar('conta', { length: 255 }),
    valor: double('valor'),
});

export const rawDs4SiconfiTtRgf = mysqlTable('raw_ds4_siconfi_tt_rgf', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio'),
    periodo: int('periodo'),
    periodicidade: varchar('periodicidade', { length: 255 }),
    instituicao: varchar('instituicao', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    uf: varchar('uf', { length: 255 }),
    co_poder: varchar('co_poder', { length: 255 }),
    populacao: int('populacao'),
    anexo: varchar('anexo', { length: 255 }),
    rotulo: varchar('rotulo', { length: 255 }),
    coluna: varchar('coluna', { length: 255 }),
    cod_conta: varchar('cod_conta', { length: 255 }),
    conta: varchar('conta', { length: 255 }),
    valor: double('valor'),
});

export const rawDs4SiconfiTtDca = mysqlTable('raw_ds4_siconfi_tt_dca', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio'),
    instituicao: varchar('instituicao', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    uf: varchar('uf', { length: 255 }),
    anexo: varchar('anexo', { length: 255 }),
    rotulo: varchar('rotulo', { length: 255 }),
    coluna: varchar('coluna', { length: 255 }),
    cod_conta: varchar('cod_conta', { length: 255 }),
    conta: varchar('conta', { length: 255 }),
    valor: double('valor'),
    populacao: int('populacao'),
});

export const rawDs4SiconfiTtMscPatrimonial = mysqlTable('raw_ds4_siconfi_tt_msc_patrimonial', {
    id: serial('id').primaryKey(),
    tipo_matriz: varchar('tipo_matriz', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    classe_conta: int('classe_conta'),
    conta_contabil: varchar('conta_contabil', { length: 255 }),
    poder_orgao: int('poder_orgao'),
    financeiro_permanente: int('financeiro_permanente'),
    ano_fonte_recursos: int('ano_fonte_recursos'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    exercicio: int('exercicio'),
    mes_referencia: int('mes_referencia'),
    divida_consolidada: int('divida_consolidada'),
    data_referencia: varchar('data_referencia', { length: 255 }),
    entrada_msc: int('entrada_msc'),
    valor: double('valor'),
    natureza_conta: varchar('natureza_conta', { length: 255 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
});

export const rawDs4SiconfiTtMscOrcamentaria = mysqlTable('raw_ds4_siconfi_tt_msc_orcamentaria', {
    id: serial('id').primaryKey(),
    tipo_matriz: varchar('tipo_matriz', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    classe_conta: int('classe_conta'),
    conta_contabil: varchar('conta_contabil', { length: 255 }),
    poder_orgao: int('poder_orgao'),
    ano_fonte_recursos: int('ano_fonte_recursos'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    funcao: varchar('funcao', { length: 255 }),
    subfuncao: varchar('subfuncao', { length: 255 }),
    exercicio: int('exercicio'),
    mes_referencia: int('mes_referencia'),
    educacao_saude: int('educacao_saude'),
    data_referencia: varchar('data_referencia', { length: 255 }),
    entrada_msc: int('entrada_msc'),
    natureza_despesa: varchar('natureza_despesa', { length: 255 }),
    ano_inscricao: int('ano_inscricao'),
    natureza_receita: varchar('natureza_receita', { length: 255 }),
    valor: double('valor'),
    natureza_conta: varchar('natureza_conta', { length: 255 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
});

export const rawDs4SiconfiTtMscControle = mysqlTable('raw_ds4_siconfi_tt_msc_controle', {
    id: serial('id').primaryKey(),
    tipo_matriz: varchar('tipo_matriz', { length: 255 }),
    cod_ibge: int('cod_ibge'),
    classe_conta: int('classe_conta'),
    conta_contabil: varchar('conta_contabil', { length: 255 }),
    poder_orgao: int('poder_orgao'),
    ano_fonte_recursos: int('ano_fonte_recursos'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    funcao: varchar('funcao', { length: 255 }),
    subfuncao: varchar('subfuncao', { length: 255 }),
    exercicio: int('exercicio'),
    mes_referencia: int('mes_referencia'),
    educacao_saude: int('educacao_saude'),
    data_referencia: varchar('data_referencia', { length: 255 }),
    entrada_msc: int('entrada_msc'),
    natureza_despesa: varchar('natureza_despesa', { length: 255 }),
    ano_inscricao: int('ano_inscricao'),
    valor: double('valor'),
    natureza_conta: varchar('natureza_conta', { length: 255 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
});

export const rawDs4SiconfiTtEntes = mysqlTable('raw_ds4_siconfi_tt_entes', {
    cod_ibge: int('cod_ibge').primaryKey(),
    ente: varchar('ente', { length: 255 }),
    capital: int('capital'),
    regiao: varchar('regiao', { length: 255 }),
    uf: varchar('uf', { length: 255 }),
    esfera: varchar('esfera', { length: 255 }),
    an_exercicio: int('an_exercicio'),
    populacao: int('populacao'),
    co_cnpj: varchar('co_cnpj', { length: 255 }),
});

export const rawDs4SiconfiTtExtratoEntregas = mysqlTable('raw_ds4_siconfi_tt_extrato_entregas', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio'),
    cod_ibge: int('cod_ibge'),
    populacao: int('populacao'),
    instituicao: varchar('instituicao', { length: 255 }),
    entregavel: varchar('entregavel', { length: 255 }),
    periodo: int('periodo'),
    periodicidade: varchar('periodicidade', { length: 255 }),
    status_relatorio: varchar('status_relatorio', { length: 255 }),
    data_status: varchar('data_status', { length: 255 }),
    forma_envio: varchar('forma_envio', { length: 255 }),
    tipo_relatorio: varchar('tipo_relatorio', { length: 255 }),
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