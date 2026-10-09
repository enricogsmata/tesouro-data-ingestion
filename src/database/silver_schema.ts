import { char, date, float, int, mysqlTable, serial, timestamp, text, varchar, bigint, longtext, primaryKey, foreignKey, double, uniqueIndex, type AnyMySqlColumn, datetime } from 'drizzle-orm/mysql-core';

// =================
// 2. SILVER SCHEMA
// =================

// ----------
// > SCHEMAS
// ----------

export const Credor = mysqlTable('credor', {
    id_credor: int('id_credor').primaryKey().autoincrement(),
    credor: varchar('credor', { length: 255 }).unique(),
    tipo: varchar('tipo', { length: 255 }),
});

export const Ente = mysqlTable('ente', {
    cod_ibge: int('cod_ibge').primaryKey(),
    ente: varchar('ente', { length: 255 }),
    capital: int('capital'),
    regiao: varchar('regiao', { length: 255 }),
    uf: char('uf', { length: 2 }),
    esfera: char('esfera', { length: 1 }),
    co_cnpj: varchar('co_cnpj', { length: 255 }),
}, (table) => ({
    enteUfUniqueIdx: uniqueIndex('ente_uf_unique_idx').on(table.ente, table.uf),
}));

export const PVL = mysqlTable('pvl', {
    id_pleito: int('id_pleito').primaryKey(),
    cod_ibge: int('cod_ibge').references(() => Ente.cod_ibge), // Corrigido para INT
    num_pvl: varchar('num_pvl', { length: 255 }).unique(),
    status: varchar('status', { length: 255 }),
    num_processo: varchar('num_processo', { length: 255 }).unique(),
    data_protocolo: date('data_protocolo', { mode: 'date' }),
    tipo_operacao: varchar('tipo_operacao', { length: 255 }),
    finalidade: varchar('finalidade', { length: 255 }),
    id_credor: int('id_credor').references(() => Credor.id_credor),
    moeda: varchar('moeda', { length: 255 }),
    valor: double('valor'),
    pvl_assoc_divida: int('pvl_assoc_divida'),
    pvl_contratado_credor: int('pvl_contratado_credor'),
    data_status: date('data_status', { mode: 'date' }),
});

export const Operacoes_Nao_Contratadas = mysqlTable('operacoes_nao_contratadas', {
    id_pleito: int('id_pleito').notNull(),
    id_pleito_nao_contratado: int('id_pleito_nao_contratado').notNull(),
}, (table) => ({
    fk_id_pleito: foreignKey({
        name: 'opc_nao_cont_id_pleito_fk',
        columns: [table.id_pleito],
        foreignColumns: [PVL.id_pleito],
    }),
    fk_id_pleito_nao_cont: foreignKey({
        name: 'opc_nao_cont_id_nao_cont_fk',
        columns: [table.id_pleito_nao_contratado],
        foreignColumns: [PVL.id_pleito],
    }),
    pk: primaryKey({ columns: [table.id_pleito, table.id_pleito_nao_contratado] }),
}));

export const Cambio = mysqlTable('cambio', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    moeda: varchar('moeda', { length: 255 }),
    taxa_cambio: double('taxa_cambio'),
    data_taxa_cambio: date('data_taxa_cambio'),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.moeda] }),
}));

export const CDP = mysqlTable('cdp', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    data_base: date('data_base'),
    status: varchar('status', { length: 255 }),
    data_status: date('data_status'),
    situacao_ente: varchar('situacao_ente', { length: 255 }),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.data_base] }),
}));

export const Resumo_Geral = mysqlTable('resumo_geral', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    ano: varchar('ano', { length: 255 }),
    sn_pvl_tramitacao_deferido: char('sn_pvl_tramitacao_deferido', { length: 1 }),
    contrapartida: double('contrapartida'),
    liberacao: double('liberacao'),
    amortizacao: double('amortizacao'),
    encargos: double('encargos'),
    total: double('total'),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.ano] }),
}));

export const Resumo_Cronograma_Pagamentos = mysqlTable('resumo_cronograma_pagamentos', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    ano: varchar('ano', { length: 255 }),
    operacao_pleiteada: double('operacao_pleiteada'),
    demais_operacoes: double('demais_operacoes'),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.ano] }),
}));

export const Cronograma_Pagamentos = mysqlTable('cronograma_pagamentos', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    ano: varchar('ano', { length: 255 }),
    indicador_liberacoes: char('indicador_liberacoes', { length: 1 }),
    divida_consolidada_amortizacao: double('divida_consolidada_amortizacao'),
    divida_consolidada_encargos: double('divida_consolidada_encargos'),
    operacoes_contratadas_amortizacao: double('operacoes_contratadas_amortizacao'),
    operacoes_contratadas_encargos: double('operacoes_contratadas_encargos'),
    total_amorizacao: double('total_amorizacao'),
    total_encargos: double('total_encargos'),
    indicador_div_moeda_estrang: char('indicador_div_moeda_estrang', { length: 1 }),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.ano] }),
}));

export const Cronograma_Liberacoes = mysqlTable('cronograma_liberacoes', {
    id_pleito: int('id_pleito').references(() => PVL.id_pleito),
    ano: varchar('ano', { length: 255 }),
    indicador_liberacoes: char('indicador_liberacoes', { length: 1 }),
    liberacoes_operacoes_sfn: double('liberacoes_operacoes_sfn'),
    liberacoes_aro: double('liberacoes_aro'),
    liberacoes_demais: double('liberacoes_demais'),
    liberacoes_total: double('liberacoes_total'),
}, (table) => ({
    pk: primaryKey({ columns: [table.id_pleito, table.ano] }),
}));

export const Conta_Contabil = mysqlTable('conta_contabil', {
    cod_conta_contabil: int('cod_conta_contabil').primaryKey(),
    desc_conta_contabil: varchar('desc_conta_contabil', { length: 255 }),
    classe_conta: int('classe_conta'),
});

export const Natureza_Juridica = mysqlTable('natureza_juridica', {
    co_natureza_juridica: int('co_natureza_juridica').primaryKey(),
    ds_natureza_juridica: varchar('ds_natureza_juridica', { length: 255 }),
});

export const Area_Atuacao = mysqlTable('area_atuacao', {
    in_area_atuacao: int('in_area_atuacao').primaryKey(),
    ds_area_atuacao: varchar('ds_area_atuacao', { length: 255 }),
});

export const Organizacao = mysqlTable('organizacao', {
    co_organizacao: int('co_organizacao').primaryKey(),
    ds_organizacao: varchar('ds_organizacao', { length: 255 }),
    co_natureza_juridica: int('co_natureza_juridica'),
    nivel_organizacao: int('nivel_organizacao'),
    co_organizacao_superior: int('co_organizacao_superior'),
    in_area_atuacao: int('in_area_atuacao').notNull(),
}, (table) => ({
    fk_co_natureza_juridica: foreignKey({
        name: 'org_nat_juridica_fk',
        columns: [table.co_natureza_juridica],
        foreignColumns: [Natureza_Juridica.co_natureza_juridica],
    }),
    fk_co_organizacao_superior: foreignKey({
        name: 'org_superior_fk',
        columns: [table.co_organizacao_superior],
        foreignColumns: [table.co_organizacao],
    }),
    fk_in_area_atuacao: foreignKey({
        name: 'org_area_atuacao_fk',
        columns: [table.in_area_atuacao],
        foreignColumns: [Area_Atuacao.in_area_atuacao],
    }),
}));

export const Custo_Inativo = mysqlTable('custo_inativo', {
    id_custo_inativo: int('id_custo_inativo').autoincrement().primaryKey(),
    co_organizacao_n0: int('co_organizacao_n0').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n1: int('co_organizacao_n1').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n2: int('co_organizacao_n2').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n3: int('co_organizacao_n3').notNull().references(() => Organizacao.co_organizacao),
    an_lanc: char('an_lanc', { length: 4 }),
    me_lanc: char('me_lanc', { length: 2 }),
    va_custo_pessoal_inativo: double('va_custo_pessoal_inativo'),
}, (table) => ({
    custoInativoUniqueIdx: uniqueIndex('custo_inativo_unique_idx').on(
        table.co_organizacao_n0,
        table.co_organizacao_n1,
        table.co_organizacao_n2,
        table.co_organizacao_n3,
        table.an_lanc,
        table.me_lanc
    ),
}));

export const Custo_Pensionista = mysqlTable('custo_pensionista', {
    id_custo_pensionistas: int('id_custo_pensionistas').autoincrement().primaryKey(),
    co_organizacao_n0: int('co_organizacao_n0').notNull(),
    co_organizacao_n1: int('co_organizacao_n1').notNull(),
    co_organizacao_n2: int('co_organizacao_n2').notNull(),
    co_organizacao_n3: int('co_organizacao_n3').notNull(),
    an_lanc: char('an_lanc', { length: 4 }),
    me_lanc: char('me_lanc', { length: 2 }),
    va_custo_pensionistas: double('va_custo_pensionistas'),
}, (table) => ({
    fk_co_organizacao_n0: foreignKey({
        name: 'custo_pen_org_n0_fk',
        columns: [table.co_organizacao_n0],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n1: foreignKey({
        name: 'custo_pen_org_n1_fk',
        columns: [table.co_organizacao_n1],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n2: foreignKey({
        name: 'custo_pen_org_n2_fk',
        columns: [table.co_organizacao_n2],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n3: foreignKey({
        name: 'custo_pen_org_n3_fk',
        columns: [table.co_organizacao_n3],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    custoPensionistaUniqueIdx: uniqueIndex('custo_pensionista_unique_idx').on(
        table.co_organizacao_n0,
        table.co_organizacao_n1,
        table.co_organizacao_n2,
        table.co_organizacao_n3,
        table.an_lanc,
        table.me_lanc
    ),
}));

export const Custo_Depreciacao = mysqlTable('custo_depreciacao', {
    id_depreciacao: int('id_depreciacao').autoincrement().primaryKey(),
    co_organizacao_n0: int('co_organizacao_n0').notNull(),
    co_organizacao_n1: int('co_organizacao_n1').notNull(),
    co_organizacao_n2: int('co_organizacao_n2').notNull(),
    co_organizacao_n3: int('co_organizacao_n3').notNull(),
    cod_conta_contabil: int('cod_conta_contabil').notNull(),
    an_lanc: varchar('an_lanc', { length: 255 }),
    me_lanc: varchar('me_lanc', { length: 255 }),
    va_custo_depreciacao: double('va_custo_depreciacao'),
}, (table) => ({
    fk_co_organizacao_n0: foreignKey({
        name: 'custo_dep_org_n0_fk',
        columns: [table.co_organizacao_n0],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n1: foreignKey({
        name: 'custo_dep_org_n1_fk',
        columns: [table.co_organizacao_n1],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n2: foreignKey({
        name: 'custo_dep_org_n2_fk',
        columns: [table.co_organizacao_n2],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_organizacao_n3: foreignKey({
        name: 'custo_dep_org_n3_fk',
        columns: [table.co_organizacao_n3],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_cod_conta_contabil: foreignKey({
        name: 'custo_dep_conta_fk',
        columns: [table.cod_conta_contabil],
        foreignColumns: [Conta_Contabil.cod_conta_contabil],
    }),
    custoDepreciacaoUniqueIdx: uniqueIndex('custo_depreciacao_unique_idx').on(
        table.co_organizacao_n0,
        table.co_organizacao_n1,
        table.co_organizacao_n2,
        table.co_organizacao_n3,
        table.an_lanc,
        table.me_lanc,
        table.cod_conta_contabil
    ),
}));

export const Modalidade_Aplicacao = mysqlTable('modalidade_aplicacao', {
    co_modalidade_aplicacao: int('co_modalidade_aplicacao').primaryKey(),
    ds_modalidade_aplicacao: varchar('ds_modalidade_aplicacao', { length: 255 }),
});

export const Esfera_Orcamentaria = mysqlTable('esfera_orcamentaria', {
    co_esfera_orcamentaria: int('co_esfera_orcamentaria').primaryKey(),
    ds_esfera_orcamentaria: varchar('ds_esfera_orcamentaria', { length: 255 }),
});

export const Resultado_Primario = mysqlTable('resultado_primario', {
    co_resultado_eof: int('co_resultado_eof').primaryKey(),
    ds_resultado_eof: varchar('ds_resultado_eof', { length: 255 }),
});

export const Transferencia = mysqlTable('transferencia', {
    id_transferencia: int('id_transferencia').autoincrement().primaryKey(),
    co_organizacao_n0: int('co_organizacao_n0').notNull(),
    co_organizacao_n1: int('co_organizacao_n1').notNull(),
    co_organizacao_n2: int('co_organizacao_n2').notNull(),
    co_organizacao_n3: int('co_organizacao_n3').notNull(),
    co_modalidade_aplicacao: int('co_modalidade_aplicacao'),
    co_esfera_orcamentaria: int('co_esfera_orcamentaria').notNull(),
    co_resultado_eof: int('co_resultado_eof').notNull(),
    va_custo_transferencias: double('va_custo_transferencias'),
}, (table) => ({
    fk_transf_org_n0: foreignKey({
        name: 'transf_org_n0_fk',
        columns: [table.co_organizacao_n0],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_transf_org_n1: foreignKey({
        name: 'transf_org_n1_fk',
        columns: [table.co_organizacao_n1],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_transf_org_n2: foreignKey({
        name: 'transf_org_n2_fk',
        columns: [table.co_organizacao_n2],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_transf_org_n3: foreignKey({
        name: 'transf_org_n3_fk',
        columns: [table.co_organizacao_n3],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_transf_modalidade: foreignKey({
        name: 'transf_mod_aplicacao_fk',
        columns: [table.co_modalidade_aplicacao],
        foreignColumns: [Modalidade_Aplicacao.co_modalidade_aplicacao],
    }),
    fk_transf_esfera: foreignKey({
        name: 'transf_esfera_orc_fk',
        columns: [table.co_esfera_orcamentaria],
        foreignColumns: [Esfera_Orcamentaria.co_esfera_orcamentaria],
    }),
    fk_transf_resultado: foreignKey({
        name: 'transf_res_eof_fk',
        columns: [table.co_resultado_eof],
        foreignColumns: [Resultado_Primario.co_resultado_eof],
    }),
    transferenciaUniqueIdx: uniqueIndex('transferencia_unique_idx').on(
        table.co_organizacao_n0,
        table.co_organizacao_n1,
        table.co_organizacao_n2,
        table.co_organizacao_n3,
        table.co_modalidade_aplicacao,
        table.co_esfera_orcamentaria,
        table.co_resultado_eof
    ),
}));

export const Escolaridade = mysqlTable('escolaridade', {
    in_escolaridade: int('in_escolaridade').primaryKey(),
    ds_escolaridade: varchar('ds_escolaridade', { length: 255 }),
});

export const Faixa_Etaria = mysqlTable('faixa_etaria', {
    in_faixa_etaria: int('in_faixa_etaria').primaryKey(),
    ds_faixa_etaria: varchar('ds_faixa_etaria', { length: 255 }),
});

export const Sexo = mysqlTable('sexo', {
    in_sexo: char('in_sexo', { length: 1 }).primaryKey(),
});

export const Custo_Ativo = mysqlTable('custo_ativo', {
    cod_custo_ativo: int('cod_custo_ativo').autoincrement().primaryKey(),
    co_organizacao_n0: int('co_organizacao_n0').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n1: int('co_organizacao_n1').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n2: int('co_organizacao_n2').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n3: int('co_organizacao_n3').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n4: int('co_organizacao_n4').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n5: int('co_organizacao_n5').notNull().references(() => Organizacao.co_organizacao),
    co_organizacao_n6: int('co_organizacao_n6').notNull().references(() => Organizacao.co_organizacao),
    an_lanc: varchar('an_lanc', { length: 255 }),
    me_lanc: varchar('me_lanc', { length: 255 }),
    in_escolaridade: int('in_escolaridade').notNull().references(() => Escolaridade.in_escolaridade),
    in_faixa_etaria: int('in_faixa_etaria').notNull().references(() => Faixa_Etaria.in_faixa_etaria),
    in_sexo: char('in_sexo', { length: 1 }).notNull().references(() => Sexo.in_sexo),
    va_custo_de_pessoal: double('va_custo_de_pessoal'),
    in_forca_trabalho: int('in_forca_trabalho'),
}, (table) => ({
    custoAtivoUniqueIdx: uniqueIndex('custo_ativo_unique_idx').on(
        table.co_organizacao_n0,
        table.co_organizacao_n1,
        table.co_organizacao_n2,
        table.co_organizacao_n3,
        table.co_organizacao_n4,
        table.co_organizacao_n5,
        table.co_organizacao_n6,
        table.an_lanc,
        table.me_lanc,
        table.in_escolaridade,
        table.in_faixa_etaria,
        table.in_sexo
    ),
}));

export const Situacao_Contabil_Lancamento = mysqlTable('situacao_contabil_lancamento', {
    co_situacao_icc: varchar('co_situacao_icc', { length: 255 }).primaryKey(),
    no_situacao_icc: varchar('no_situacao_icc', { length: 255 }),
});

export const Natureza_Despesa_Detalhada = mysqlTable('natureza_despesa_detalhada', {
    co_natureza_despesa_deta: varchar('co_natureza_despesa_deta', { length: 10 }).primaryKey(),
    no_natureza_despesa_deta: varchar('no_natureza_despesa_deta', { length: 255 }),
    id_categoria_economica_nade: varchar('id_categoria_economica_nade', { length: 10 }),
    id_grupo_despesa_nade: varchar('id_grupo_despesa_nade', { length: 10 }),
    id_moap_nade: int('id_moap_nade').notNull(),
    id_elemento_despesa_nade: varchar('id_elemento_despesa_nade', { length: 10 }),
    id_subitem_nade: varchar('id_subitem_nade', { length: 10 }),
}, (table) => ({
    fk_id_moap_nade: foreignKey({
        name: 'nat_desp_moap_fk',
        columns: [table.id_moap_nade],
        foreignColumns: [Modalidade_Aplicacao.co_modalidade_aplicacao],
    }),
}));

export const Demais_Custos = mysqlTable('demais_custos', {
    id_demais_custos: int('id_demais_custos').primaryKey(),
    co_siorg_n05: int('co_siorg_n05').notNull(),
    co_siorg_n06: int('co_siorg_n06').notNull(),
    co_siorg_n07: int('co_siorg_n07').notNull(),
    me_referencia: int('me_referencia'),
    an_referencia: int('an_referencia'),
    me_emissao: int('me_emissao'),
    an_emissao: int('an_emissao'),
    sg_mes_completo: varchar('sg_mes_completo', { length: 255 }),
    co_situacao_icc: varchar('co_situacao_icc', { length: 255 }).notNull(),
    co_natureza_despesa_deta: char('co_natureza_despesa_deta', { length: 8 }).notNull(),
    co_esfera_orcamentaria: int('co_esfera_orcamentaria').notNull(),
    co_resultado_eof: int('co_resultado_eof').notNull(),
    va_custo: double('va_custo'),
}, (table) => ({
    fk_co_siorg_n05: foreignKey({
        name: 'demais_custos_org_n05_fk',
        columns: [table.co_siorg_n05],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_siorg_n06: foreignKey({
        name: 'demais_custos_org_n06_fk',
        columns: [table.co_siorg_n06],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_siorg_n07: foreignKey({
        name: 'demais_custos_org_n07_fk',
        columns: [table.co_siorg_n07],
        foreignColumns: [Organizacao.co_organizacao],
    }),
    fk_co_situacao_icc: foreignKey({
        name: 'demais_custos_sit_icc_fk',
        columns: [table.co_situacao_icc],
        foreignColumns: [Situacao_Contabil_Lancamento.co_situacao_icc],
    }),
    fk_co_natureza_despesa_deta: foreignKey({
        name: 'demais_custos_nat_desp_fk',
        columns: [table.co_natureza_despesa_deta],
        foreignColumns: [Natureza_Despesa_Detalhada.co_natureza_despesa_deta],
    }),
    fk_co_esfera_orcamentaria: foreignKey({
        name: 'demais_custos_esfera_orc_fk',
        columns: [table.co_esfera_orcamentaria],
        foreignColumns: [Esfera_Orcamentaria.co_esfera_orcamentaria],
    }),
    fk_co_resultado_eof: foreignKey({
        name: 'demais_custos_res_eof_fk',
        columns: [table.co_resultado_eof],
        foreignColumns: [Resultado_Primario.co_resultado_eof],
    }),
    demaisCustosUniqueIdx: uniqueIndex('demais_custos_unique_idx').on(
        table.co_siorg_n05,
        table.co_siorg_n06,
        table.co_siorg_n07,
        table.me_referencia,
        table.an_referencia,
        table.me_emissao,
        table.an_emissao,
        table.sg_mes_completo,
        table.co_situacao_icc,
        table.co_natureza_despesa_deta,
        table.co_esfera_orcamentaria,
        table.co_resultado_eof
    ),
}));

export const Instituição = mysqlTable('instituição', {
    id: serial('id').primaryKey(),
    instituicao: varchar('instituicao', { length: 255 }).notNull(),
    co_poder: char('co_poder', { length: 1 }),
    cod_ibge: int('cod_ibge').notNull().references(() => Ente.cod_ibge),
}, (table) => ({
    instUniqueIdx: uniqueIndex('inst_nome_idx').on(table.instituicao), // Adicionado UNIQUE para permitir FK por nome
}));

export const Populacao_Anual_Ente = mysqlTable('populacao_anual_ente', {
    cod_ibge: int('cod_ibge').references(() => Ente.cod_ibge),
    ano_exercicio: int('ano_exercicio'),
    populacao: int('populacao'),
}, (table) => ({
    pk: primaryKey({ columns: [table.cod_ibge, table.ano_exercicio] }),
}));

export const Extrato_Entregas = mysqlTable('extrato_entregas', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio'),
    cod_ibge: int('cod_ibge'),
    instituicao: varchar('instituicao', { length: 255 }).references(() => Instituição.instituicao),
    entregavel: varchar('entregavel', { length: 255 }),
    periodo: int('periodo'),
    periodicidade: char('periodicidade', { length: 1 }),
    status_relatorio: char('status_relatorio', { length: 2 }),
    data_status: datetime('data_status'),
    forma_envio: varchar('forma_envio', { length: 10 }),
    tipo_relatorio: char('tipo_relatorio', { length: 1 }),
}, (table) => ({
    popFk: foreignKey({
        name: 'extrato_entregas_pop_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
}));

export const Anexo = mysqlTable('anexo', {
    id_anexo: int('id_anexo').primaryKey().autoincrement(),
    anexo: varchar('anexo', { length: 255 }),
    demonstrativo: varchar('demonstrativo', { length: 255 }),
    esfera: char('esfera', { length: 1 }),
}, (table) => ({
    anexoUniqueIdx: uniqueIndex('anexo_unique_idx').on(
        table.anexo,
        table.demonstrativo,
        table.esfera
    ),
}));

export const Rotulo = mysqlTable('rotulo', {
    rotulo: varchar('rotulo', { length: 255 }).primaryKey(),
    id_anexo: int('id_anexo').notNull().references(() => Anexo.id_anexo),
});

export const Coluna = mysqlTable('coluna', {
    coluna: varchar('coluna', { length: 255 }).primaryKey(),
    rotulo: varchar('rotulo', { length: 255 }).notNull().references(() => Rotulo.rotulo),
});

export const Conta = mysqlTable('conta', {
    cod_conta: varchar('cod_conta', { length: 255 }).primaryKey(),
    conta: varchar('conta', { length: 255 }),
    rotulo: varchar('rotulo', { length: 255 }).notNull().references(() => Rotulo.rotulo),
});

export const RREO_ou_RGF = mysqlTable('rreo_ou_rgf', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio').notNull(),
    periodo: int('periodo'),
    periodicidade: char('periodicidade', { length: 1 }),
    instituicao: varchar('instituicao', { length: 255 }).notNull().references(() => Instituição.instituicao),
    cod_ibge: int('cod_ibge').notNull(),
    coluna: varchar('coluna', { length: 255 }).notNull().references(() => Coluna.coluna),
    cod_conta: varchar('cod_conta', { length: 255 }).notNull().references(() => Conta.cod_conta),
    valor: double('valor'),
}, (table) => ({
    popFk: foreignKey({
        name: 'rreo_rgf_pop_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
}));

export const DCA = mysqlTable('dca', {
    id: serial('id').primaryKey(),
    exercicio: int('exercicio').notNull(),
    instituicao: varchar('instituicao', { length: 255 }).notNull().references(() => Instituição.instituicao),
    cod_ibge: int('cod_ibge').notNull(),
    coluna: varchar('coluna', { length: 255 }).notNull().references(() => Coluna.coluna),
    cod_conta: varchar('cod_conta', { length: 255 }).notNull().references(() => Conta.cod_conta),
    valor: double('valor'),
}, (table) => ({
    fk_dca_populacao: foreignKey({
        name: 'dca_populacao_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
}));

export const MSC_Patrimonial = mysqlTable('msc_patrimonial', {
    id: serial('id').primaryKey(),
    tipo_matriz: char('tipo_matriz', { length: 4 }),
    cod_ibge: int('cod_ibge').notNull(),
    conta_contabil: int('conta_contabil').notNull(),
    poder_orgao: int('poder_orgao'),
    financeiro_permanente: int('financeiro_permanente'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    exercicio: int('exercicio').notNull(),
    mes_referencia: int('mes_referencia'),
    divida_consolidada: int('divida_consolidada'),
    data_referencia: datetime('data_referencia'),
    entrada_msc: int('entrada_msc'),
    valor: double('valor'),
    natureza_conta: char('natureza_conta', { length: 1 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
}, (table) => ({
    popFk: foreignKey({
        name: 'msc_patrimonial_pop_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
    contaFk: foreignKey({
        name: 'msc_patr_conta_fk',
        columns: [table.conta_contabil],
        foreignColumns: [Conta_Contabil.cod_conta_contabil],
    }),
}));
export const MSC_Orcamentaria = mysqlTable('msc_orcamentaria', {
    id: serial('id').primaryKey(),
    tipo_matriz: char('tipo_matriz', { length: 4 }),
    cod_ibge: int('cod_ibge').notNull(),
    conta_contabil: int('conta_contabil').notNull(),
    poder_orgao: int('poder_orgao'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    funcao: char('funcao', { length: 2 }),
    subfuncao: char('subfuncao', { length: 3 }),
    exercicio: int('exercicio').notNull(),
    mes_referencia: int('mes_referencia'),
    educacao_saude: int('educacao_saude'),
    data_referencia: datetime('data_referencia'),
    entrada_msc: int('entrada_msc'),
    natureza_despesa: char('natureza_despesa', { length: 8 }).notNull(),
    ano_inscricao: int('ano_inscricao'),
    natureza_receita: char('natureza_receita', { length: 8 }),
    valor: double('valor'),
    natureza_conta: char('natureza_conta', { length: 1 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
}, (table) => ({
    fk_msc_orc_pop: foreignKey({
        name: 'msc_orcamentaria_pop_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
    fk_msc_orc_nat_desp: foreignKey({
        name: 'msc_orcamentaria_nat_desp_fk',
        columns: [table.natureza_despesa],
        foreignColumns: [Natureza_Despesa_Detalhada.co_natureza_despesa_deta],
    }),
    fk_msc_orc_conta: foreignKey({
        name: 'msc_orcamentaria_conta_fk',
        columns: [table.conta_contabil],
        foreignColumns: [Conta_Contabil.cod_conta_contabil],
    }),
}));

export const MSC_Controle = mysqlTable('msc_controle', {
    id: serial('id').primaryKey(),
    tipo_matriz: char('tipo_matriz', { length: 4 }),
    cod_ibge: int('cod_ibge').notNull(),
    conta_contabil: int('conta_contabil').notNull(),
    poder_orgao: int('poder_orgao'),
    fonte_recursos: varchar('fonte_recursos', { length: 255 }),
    funcao: char('funcao', { length: 2 }),
    subfuncao: char('subfuncao', { length: 3 }),
    exercicio: int('exercicio').notNull(),
    mes_referencia: int('mes_referencia'),
    educacao_saude: int('educacao_saude'),
    data_referencia: datetime('data_referencia'),
    entrada_msc: int('entrada_msc'),
    natureza_despesa: char('natureza_despesa', { length: 8 }).notNull(),
    ano_inscricao: int('ano_inscricao'),
    valor: double('valor'),
    natureza_conta: char('natureza_conta', { length: 1 }),
    tipo_valor: varchar('tipo_valor', { length: 255 }),
}, (table) => ({
    fk_msc_controle_pop: foreignKey({
        name: 'msc_controle_pop_fk',
        columns: [table.cod_ibge, table.exercicio],
        foreignColumns: [Populacao_Anual_Ente.cod_ibge, Populacao_Anual_Ente.ano_exercicio],
    }),
    fk_msc_controle_nat_desp: foreignKey({
        name: 'msc_controle_nat_desp_fk',
        columns: [table.natureza_despesa],
        foreignColumns: [Natureza_Despesa_Detalhada.co_natureza_despesa_deta],
    }),
    fk_msc_controle_conta: foreignKey({
        name: 'msc_controle_conta_fk',
        columns: [table.conta_contabil],
        foreignColumns: [Conta_Contabil.cod_conta_contabil],
    }),
}));

export const tema = mysqlTable("tema", {
  codigoTema: varchar("codigoTema", { length: 255 }).primaryKey(),
  nomeTema: varchar("nomeTema", { length: 255 }),
});

export const subtema = mysqlTable("subtema", {
  codigoSubtema: varchar("codigoSubtema", { length: 255 }).primaryKey(),
  nomesubtema: varchar("nomesubtema", { length: 255 }),
  codigoTema: varchar("codigoTema", { length: 255 })
    .notNull()
    .references(() => tema.codigoTema),
});

export const serie = mysqlTable("serie", {
  codigoSerie: varchar("codigoSerie", { length: 255 }),
  data: datetime("data"),
  codigoSubtema: varchar("codigoSubtema", { length: 255 })
    .notNull()
    .references(() => subtema.codigoSubtema),
  nomeSerie: varchar("nomeSerie", { length: 255 }),
  valor: double("valor"),
}, (table) => ({
  pk: primaryKey({ columns: [table.codigoSerie, table.data] }),
}));