CREATE TABLE `anexo` (
	`id_anexo` int AUTO_INCREMENT NOT NULL,
	`anexo` varchar(255),
	`demonstrativo` varchar(255),
	`esfera` char(1),
	CONSTRAINT `anexo_id_anexo` PRIMARY KEY(`id_anexo`),
	CONSTRAINT `anexo_unique_idx` UNIQUE(`anexo`,`demonstrativo`,`esfera`)
);
--> statement-breakpoint
CREATE TABLE `area_atuacao` (
	`in_area_atuacao` int NOT NULL,
	`ds_area_atuacao` varchar(255),
	CONSTRAINT `area_atuacao_in_area_atuacao` PRIMARY KEY(`in_area_atuacao`)
);
--> statement-breakpoint
CREATE TABLE `cdp` (
	`id_pleito` int NOT NULL,
	`data_base` date NOT NULL,
	`status` varchar(255),
	`data_status` date,
	`situacao_ente` varchar(255),
	CONSTRAINT `cdp_id_pleito_data_base_pk` PRIMARY KEY(`id_pleito`,`data_base`)
);
--> statement-breakpoint
CREATE TABLE `cambio` (
	`id_pleito` int NOT NULL,
	`moeda` varchar(255) NOT NULL,
	`taxa_cambio` double,
	`data_taxa_cambio` date,
	CONSTRAINT `cambio_id_pleito_moeda_pk` PRIMARY KEY(`id_pleito`,`moeda`)
);
--> statement-breakpoint
CREATE TABLE `coluna` (
	`coluna` varchar(255) NOT NULL,
	`rotulo` varchar(255) NOT NULL,
	CONSTRAINT `coluna_coluna` PRIMARY KEY(`coluna`)
);
--> statement-breakpoint
CREATE TABLE `conta` (
	`cod_conta` varchar(255) NOT NULL,
	`conta` varchar(255),
	`rotulo` varchar(255) NOT NULL,
	CONSTRAINT `conta_cod_conta` PRIMARY KEY(`cod_conta`)
);
--> statement-breakpoint
CREATE TABLE `conta_contabil` (
	`cod_conta_contabil` int NOT NULL,
	`desc_conta_contabil` varchar(255),
	`classe_conta` int,
	CONSTRAINT `conta_contabil_cod_conta_contabil` PRIMARY KEY(`cod_conta_contabil`)
);
--> statement-breakpoint
CREATE TABLE `credor` (
	`id_credor` int AUTO_INCREMENT NOT NULL,
	`credor` varchar(255),
	`tipo` varchar(255),
	CONSTRAINT `credor_id_credor` PRIMARY KEY(`id_credor`),
	CONSTRAINT `credor_credor_unique` UNIQUE(`credor`)
);
--> statement-breakpoint
CREATE TABLE `cronograma_liberacoes` (
	`id_pleito` int NOT NULL,
	`ano` varchar(255) NOT NULL,
	`indicador_liberacoes` char(1),
	`liberacoes_operacoes_sfn` double,
	`liberacoes_aro` double,
	`liberacoes_demais` double,
	`liberacoes_total` double,
	CONSTRAINT `cronograma_liberacoes_id_pleito_ano_pk` PRIMARY KEY(`id_pleito`,`ano`)
);
--> statement-breakpoint
CREATE TABLE `cronograma_pagamentos` (
	`id_pleito` int NOT NULL,
	`ano` varchar(255) NOT NULL,
	`indicador_liberacoes` char(1),
	`divida_consolidada_amortizacao` double,
	`divida_consolidada_encargos` double,
	`operacoes_contratadas_amortizacao` double,
	`operacoes_contratadas_encargos` double,
	`total_amorizacao` double,
	`total_encargos` double,
	`indicador_div_moeda_estrang` char(1),
	CONSTRAINT `cronograma_pagamentos_id_pleito_ano_pk` PRIMARY KEY(`id_pleito`,`ano`)
);
--> statement-breakpoint
CREATE TABLE `custo_ativo` (
	`cod_custo_ativo` int AUTO_INCREMENT NOT NULL,
	`co_organizacao_n0` int NOT NULL,
	`co_organizacao_n1` int NOT NULL,
	`co_organizacao_n2` int NOT NULL,
	`co_organizacao_n3` int NOT NULL,
	`co_organizacao_n4` int NOT NULL,
	`co_organizacao_n5` int NOT NULL,
	`co_organizacao_n6` int NOT NULL,
	`an_lanc` varchar(255),
	`me_lanc` varchar(255),
	`in_escolaridade` int NOT NULL,
	`in_faixa_etaria` int NOT NULL,
	`in_sexo` char(1) NOT NULL,
	`va_custo_de_pessoal` double,
	`in_forca_trabalho` int,
	CONSTRAINT `custo_ativo_cod_custo_ativo` PRIMARY KEY(`cod_custo_ativo`),
	CONSTRAINT `custo_ativo_unique_idx` UNIQUE(`co_organizacao_n0`,`co_organizacao_n1`,`co_organizacao_n2`,`co_organizacao_n3`,`co_organizacao_n4`,`co_organizacao_n5`,`co_organizacao_n6`,`an_lanc`,`me_lanc`,`in_escolaridade`,`in_faixa_etaria`,`in_sexo`)
);
--> statement-breakpoint
CREATE TABLE `custo_depreciacao` (
	`id_depreciacao` int AUTO_INCREMENT NOT NULL,
	`co_organizacao_n0` int NOT NULL,
	`co_organizacao_n1` int NOT NULL,
	`co_organizacao_n2` int NOT NULL,
	`co_organizacao_n3` int NOT NULL,
	`cod_conta_contabil` int NOT NULL,
	`an_lanc` varchar(255),
	`me_lanc` varchar(255),
	`va_custo_depreciacao` double,
	CONSTRAINT `custo_depreciacao_id_depreciacao` PRIMARY KEY(`id_depreciacao`),
	CONSTRAINT `custo_depreciacao_unique_idx` UNIQUE(`co_organizacao_n0`,`co_organizacao_n1`,`co_organizacao_n2`,`co_organizacao_n3`,`an_lanc`,`me_lanc`,`cod_conta_contabil`)
);
--> statement-breakpoint
CREATE TABLE `custo_inativo` (
	`id_custo_inativo` int AUTO_INCREMENT NOT NULL,
	`co_organizacao_n0` int NOT NULL,
	`co_organizacao_n1` int NOT NULL,
	`co_organizacao_n2` int NOT NULL,
	`co_organizacao_n3` int NOT NULL,
	`an_lanc` char(4),
	`me_lanc` char(2),
	`va_custo_pessoal_inativo` double,
	CONSTRAINT `custo_inativo_id_custo_inativo` PRIMARY KEY(`id_custo_inativo`),
	CONSTRAINT `custo_inativo_unique_idx` UNIQUE(`co_organizacao_n0`,`co_organizacao_n1`,`co_organizacao_n2`,`co_organizacao_n3`,`an_lanc`,`me_lanc`)
);
--> statement-breakpoint
CREATE TABLE `custo_pensionista` (
	`id_custo_pensionistas` int AUTO_INCREMENT NOT NULL,
	`co_organizacao_n0` int NOT NULL,
	`co_organizacao_n1` int NOT NULL,
	`co_organizacao_n2` int NOT NULL,
	`co_organizacao_n3` int NOT NULL,
	`an_lanc` char(4),
	`me_lanc` char(2),
	`va_custo_pensionistas` double,
	CONSTRAINT `custo_pensionista_id_custo_pensionistas` PRIMARY KEY(`id_custo_pensionistas`),
	CONSTRAINT `custo_pensionista_unique_idx` UNIQUE(`co_organizacao_n0`,`co_organizacao_n1`,`co_organizacao_n2`,`co_organizacao_n3`,`an_lanc`,`me_lanc`)
);
--> statement-breakpoint
CREATE TABLE `dca` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int NOT NULL,
	`instituicao` varchar(255) NOT NULL,
	`cod_ibge` int NOT NULL,
	`coluna` varchar(255) NOT NULL,
	`cod_conta` varchar(255) NOT NULL,
	`valor` double,
	CONSTRAINT `dca_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demais_custos` (
	`id_demais_custos` int NOT NULL,
	`co_siorg_n05` int NOT NULL,
	`co_siorg_n06` int NOT NULL,
	`co_siorg_n07` int NOT NULL,
	`me_referencia` int,
	`an_referencia` int,
	`me_emissao` int,
	`an_emissao` int,
	`sg_mes_completo` varchar(255),
	`co_situacao_icc` varchar(255) NOT NULL,
	`co_natureza_despesa_deta` char(8) NOT NULL,
	`co_esfera_orcamentaria` int NOT NULL,
	`co_resultado_eof` int NOT NULL,
	`va_custo` double,
	CONSTRAINT `demais_custos_id_demais_custos` PRIMARY KEY(`id_demais_custos`),
	CONSTRAINT `demais_custos_unique_idx` UNIQUE(`co_siorg_n05`,`co_siorg_n06`,`co_siorg_n07`,`me_referencia`,`an_referencia`,`me_emissao`,`an_emissao`,`sg_mes_completo`,`co_situacao_icc`,`co_natureza_despesa_deta`,`co_esfera_orcamentaria`,`co_resultado_eof`)
);
--> statement-breakpoint
CREATE TABLE `ente` (
	`cod_ibge` int NOT NULL,
	`ente` varchar(255),
	`capital` int,
	`regiao` varchar(255),
	`uf` char(2),
	`esfera` char(1),
	`co_cnpj` varchar(255),
	CONSTRAINT `ente_cod_ibge` PRIMARY KEY(`cod_ibge`),
	CONSTRAINT `ente_uf_unique_idx` UNIQUE(`ente`,`uf`)
);
--> statement-breakpoint
CREATE TABLE `escolaridade` (
	`in_escolaridade` int NOT NULL,
	`ds_escolaridade` varchar(255),
	CONSTRAINT `escolaridade_in_escolaridade` PRIMARY KEY(`in_escolaridade`)
);
--> statement-breakpoint
CREATE TABLE `esfera_orcamentaria` (
	`co_esfera_orcamentaria` int NOT NULL,
	`ds_esfera_orcamentaria` varchar(255),
	CONSTRAINT `esfera_orcamentaria_co_esfera_orcamentaria` PRIMARY KEY(`co_esfera_orcamentaria`)
);
--> statement-breakpoint
CREATE TABLE `extrato_entregas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int,
	`cod_ibge` int,
	`instituicao` varchar(255),
	`entregavel` varchar(255),
	`periodo` int,
	`periodicidade` char(1),
	`status_relatorio` char(2),
	`data_status` datetime,
	`forma_envio` char(1),
	`tipo_relatorio` char(1),
	CONSTRAINT `extrato_entregas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faixa_etaria` (
	`in_faixa_etaria` int NOT NULL,
	`ds_faixa_etaria` varchar(255),
	CONSTRAINT `faixa_etaria_in_faixa_etaria` PRIMARY KEY(`in_faixa_etaria`)
);
--> statement-breakpoint
CREATE TABLE `instituição` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`instituicao` varchar(255) NOT NULL,
	`co_poder` char(1),
	`cod_ibge` int NOT NULL,
	CONSTRAINT `instituição_id` PRIMARY KEY(`id`),
	CONSTRAINT `inst_nome_idx` UNIQUE(`instituicao`)
);
--> statement-breakpoint
CREATE TABLE `msc_controle` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` char(4),
	`cod_ibge` int NOT NULL,
	`conta_contabil` int NOT NULL,
	`poder_orgao` int,
	`fonte_recursos` varchar(255),
	`funcao` char(2),
	`subfuncao` char(3),
	`exercicio` int NOT NULL,
	`mes_referencia` int,
	`educacao_saude` int,
	`data_referencia` datetime,
	`entrada_msc` int,
	`natureza_despesa` char(8) NOT NULL,
	`ano_inscricao` int,
	`valor` double,
	`natureza_conta` char(1),
	`tipo_valor` varchar(255),
	CONSTRAINT `msc_controle_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `msc_orcamentaria` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` char(4),
	`cod_ibge` int NOT NULL,
	`conta_contabil` int NOT NULL,
	`poder_orgao` int,
	`fonte_recursos` varchar(255),
	`funcao` char(2),
	`subfuncao` char(3),
	`exercicio` int NOT NULL,
	`mes_referencia` int,
	`educacao_saude` int,
	`data_referencia` datetime,
	`entrada_msc` int,
	`natureza_despesa` char(8) NOT NULL,
	`ano_inscricao` int,
	`natureza_receita` char(8),
	`valor` double,
	`natureza_conta` char(1),
	`tipo_valor` varchar(255),
	CONSTRAINT `msc_orcamentaria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `msc_patrimonial` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` char(4),
	`cod_ibge` int NOT NULL,
	`conta_contabil` int NOT NULL,
	`poder_orgao` int,
	`financeiro_permanente` int,
	`fonte_recursos` varchar(255),
	`exercicio` int NOT NULL,
	`mes_referencia` int,
	`divida_consolidada` int,
	`data_referencia` datetime,
	`entrada_msc` int,
	`valor` double,
	`natureza_conta` char(1),
	`tipo_valor` varchar(255),
	CONSTRAINT `msc_patrimonial_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modalidade_aplicacao` (
	`co_modalidade_aplicacao` int NOT NULL,
	`ds_modalidade_aplicacao` varchar(255),
	CONSTRAINT `modalidade_aplicacao_co_modalidade_aplicacao` PRIMARY KEY(`co_modalidade_aplicacao`)
);
--> statement-breakpoint
CREATE TABLE `natureza_despesa_detalhada` (
	`co_natureza_despesa_deta` varchar(10) NOT NULL,
	`no_natureza_despesa_deta` varchar(255),
	`id_categoria_economica_nade` varchar(10),
	`id_grupo_despesa_nade` varchar(10),
	`id_moap_nade` int NOT NULL,
	`id_elemento_despesa_nade` varchar(10),
	`id_subitem_nade` varchar(10),
	CONSTRAINT `natureza_despesa_detalhada_co_natureza_despesa_deta` PRIMARY KEY(`co_natureza_despesa_deta`)
);
--> statement-breakpoint
CREATE TABLE `natureza_juridica` (
	`co_natureza_juridica` int NOT NULL,
	`ds_natureza_juridica` varchar(255),
	CONSTRAINT `natureza_juridica_co_natureza_juridica` PRIMARY KEY(`co_natureza_juridica`)
);
--> statement-breakpoint
CREATE TABLE `operacoes_nao_contratadas` (
	`id_pleito` int NOT NULL,
	`id_pleito_nao_contratado` int NOT NULL,
	CONSTRAINT `operacoes_nao_contratadas_id_pleito_id_pleito_nao_contratado_pk` PRIMARY KEY(`id_pleito`,`id_pleito_nao_contratado`)
);
--> statement-breakpoint
CREATE TABLE `organizacao` (
	`co_organizacao` int NOT NULL,
	`ds_organizacao` varchar(255),
	`co_natureza_juridica` int,
	`nivel_organizacao` int,
	`co_organizacao_superior` int,
	`in_area_atuacao` int NOT NULL,
	CONSTRAINT `organizacao_co_organizacao` PRIMARY KEY(`co_organizacao`)
);
--> statement-breakpoint
CREATE TABLE `pvl` (
	`id_pleito` int NOT NULL,
	`cod_ibge` int,
	`num_pvl` varchar(255),
	`status` varchar(255),
	`num_processo` varchar(255),
	`data_protocolo` date,
	`tipo_operacao` varchar(255),
	`finalidade` varchar(255),
	`id_credor` int,
	`moeda` varchar(255),
	`valor` double,
	`pvl_assoc_divida` int,
	`pvl_contratado_credor` int,
	`data_status` date,
	CONSTRAINT `pvl_id_pleito` PRIMARY KEY(`id_pleito`),
	CONSTRAINT `pvl_num_pvl_unique` UNIQUE(`num_pvl`),
	CONSTRAINT `pvl_num_processo_unique` UNIQUE(`num_processo`)
);
--> statement-breakpoint
CREATE TABLE `populacao_anual_ente` (
	`cod_ibge` int NOT NULL,
	`ano_exercicio` int NOT NULL,
	`populacao` int,
	CONSTRAINT `populacao_anual_ente_cod_ibge_ano_exercicio_pk` PRIMARY KEY(`cod_ibge`,`ano_exercicio`)
);
--> statement-breakpoint
CREATE TABLE `rreo_ou_rgf` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int NOT NULL,
	`periodo` int,
	`periodicidade` char(1),
	`instituicao` varchar(255) NOT NULL,
	`cod_ibge` int NOT NULL,
	`coluna` varchar(255) NOT NULL,
	`cod_conta` varchar(255) NOT NULL,
	`valor` double,
	CONSTRAINT `rreo_ou_rgf_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resultado_primario` (
	`co_resultado_eof` int NOT NULL,
	`ds_resultado_eof` varchar(255),
	CONSTRAINT `resultado_primario_co_resultado_eof` PRIMARY KEY(`co_resultado_eof`)
);
--> statement-breakpoint
CREATE TABLE `resumo_cronograma_pagamentos` (
	`id_pleito` int NOT NULL,
	`ano` varchar(255) NOT NULL,
	`operacao_pleiteada` double,
	`demais_operacoes` double,
	CONSTRAINT `resumo_cronograma_pagamentos_id_pleito_ano_pk` PRIMARY KEY(`id_pleito`,`ano`)
);
--> statement-breakpoint
CREATE TABLE `resumo_geral` (
	`id_pleito` int NOT NULL,
	`ano` varchar(255) NOT NULL,
	`sn_pvl_tramitacao_deferido` char(1),
	`contrapartida` double,
	`liberacao` double,
	`amortizacao` double,
	`encargos` double,
	`total` double,
	CONSTRAINT `resumo_geral_id_pleito_ano_pk` PRIMARY KEY(`id_pleito`,`ano`)
);
--> statement-breakpoint
CREATE TABLE `rotulo` (
	`rotulo` varchar(255) NOT NULL,
	`id_anexo` int NOT NULL,
	CONSTRAINT `rotulo_rotulo` PRIMARY KEY(`rotulo`)
);
--> statement-breakpoint
CREATE TABLE `sexo` (
	`in_sexo` char(1) NOT NULL,
	CONSTRAINT `sexo_in_sexo` PRIMARY KEY(`in_sexo`)
);
--> statement-breakpoint
CREATE TABLE `situacao_contabil_lancamento` (
	`co_situacao_icc` varchar(255) NOT NULL,
	`no_situacao_icc` varchar(255),
	CONSTRAINT `situacao_contabil_lancamento_co_situacao_icc` PRIMARY KEY(`co_situacao_icc`)
);
--> statement-breakpoint
CREATE TABLE `transferencia` (
	`id_transferencia` int AUTO_INCREMENT NOT NULL,
	`co_organizacao_n0` int NOT NULL,
	`co_organizacao_n1` int NOT NULL,
	`co_organizacao_n2` int NOT NULL,
	`co_organizacao_n3` int NOT NULL,
	`co_modalidade_aplicacao` int,
	`co_esfera_orcamentaria` int NOT NULL,
	`co_resultado_eof` int NOT NULL,
	`va_custo_transferencias` double,
	CONSTRAINT `transferencia_id_transferencia` PRIMARY KEY(`id_transferencia`),
	CONSTRAINT `transferencia_unique_idx` UNIQUE(`co_organizacao_n0`,`co_organizacao_n1`,`co_organizacao_n2`,`co_organizacao_n3`,`co_modalidade_aplicacao`,`co_esfera_orcamentaria`,`co_resultado_eof`)
);
--> statement-breakpoint
CREATE TABLE `serie` (
	`codigoSerie` varchar(255) NOT NULL,
	`data` datetime NOT NULL,
	`codigoSubtema` varchar(255) NOT NULL,
	`nomeSerie` varchar(255),
	`valor` double,
	CONSTRAINT `serie_codigoSerie_data_pk` PRIMARY KEY(`codigoSerie`,`data`)
);
--> statement-breakpoint
CREATE TABLE `subtema` (
	`codigoSubtema` varchar(255) NOT NULL,
	`nomesubtema` varchar(255),
	`codigoTema` varchar(255) NOT NULL,
	CONSTRAINT `subtema_codigoSubtema` PRIMARY KEY(`codigoSubtema`)
);
--> statement-breakpoint
CREATE TABLE `tema` (
	`codigoTema` varchar(255) NOT NULL,
	`nomeTema` varchar(255),
	CONSTRAINT `tema_codigoTema` PRIMARY KEY(`codigoTema`)
);
--> statement-breakpoint
ALTER TABLE `cdp` ADD CONSTRAINT `cdp_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cambio` ADD CONSTRAINT `cambio_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coluna` ADD CONSTRAINT `coluna_rotulo_rotulo_rotulo_fk` FOREIGN KEY (`rotulo`) REFERENCES `rotulo`(`rotulo`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conta` ADD CONSTRAINT `conta_rotulo_rotulo_rotulo_fk` FOREIGN KEY (`rotulo`) REFERENCES `rotulo`(`rotulo`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cronograma_liberacoes` ADD CONSTRAINT `cronograma_liberacoes_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cronograma_pagamentos` ADD CONSTRAINT `cronograma_pagamentos_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n0_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n0`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n1_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n1`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n2_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n2`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n3_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n3`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n4_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n4`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n5_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n5`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_co_organizacao_n6_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n6`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_in_escolaridade_escolaridade_in_escolaridade_fk` FOREIGN KEY (`in_escolaridade`) REFERENCES `escolaridade`(`in_escolaridade`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_in_faixa_etaria_faixa_etaria_in_faixa_etaria_fk` FOREIGN KEY (`in_faixa_etaria`) REFERENCES `faixa_etaria`(`in_faixa_etaria`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_ativo` ADD CONSTRAINT `custo_ativo_in_sexo_sexo_in_sexo_fk` FOREIGN KEY (`in_sexo`) REFERENCES `sexo`(`in_sexo`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_depreciacao` ADD CONSTRAINT `custo_dep_org_n0_fk` FOREIGN KEY (`co_organizacao_n0`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_depreciacao` ADD CONSTRAINT `custo_dep_org_n1_fk` FOREIGN KEY (`co_organizacao_n1`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_depreciacao` ADD CONSTRAINT `custo_dep_org_n2_fk` FOREIGN KEY (`co_organizacao_n2`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_depreciacao` ADD CONSTRAINT `custo_dep_org_n3_fk` FOREIGN KEY (`co_organizacao_n3`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_depreciacao` ADD CONSTRAINT `custo_dep_conta_fk` FOREIGN KEY (`cod_conta_contabil`) REFERENCES `conta_contabil`(`cod_conta_contabil`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_inativo` ADD CONSTRAINT `custo_inativo_co_organizacao_n0_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n0`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_inativo` ADD CONSTRAINT `custo_inativo_co_organizacao_n1_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n1`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_inativo` ADD CONSTRAINT `custo_inativo_co_organizacao_n2_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n2`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_inativo` ADD CONSTRAINT `custo_inativo_co_organizacao_n3_organizacao_co_organizacao_fk` FOREIGN KEY (`co_organizacao_n3`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_pensionista` ADD CONSTRAINT `custo_pen_org_n0_fk` FOREIGN KEY (`co_organizacao_n0`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_pensionista` ADD CONSTRAINT `custo_pen_org_n1_fk` FOREIGN KEY (`co_organizacao_n1`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_pensionista` ADD CONSTRAINT `custo_pen_org_n2_fk` FOREIGN KEY (`co_organizacao_n2`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custo_pensionista` ADD CONSTRAINT `custo_pen_org_n3_fk` FOREIGN KEY (`co_organizacao_n3`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dca` ADD CONSTRAINT `dca_instituicao_instituição_instituicao_fk` FOREIGN KEY (`instituicao`) REFERENCES `instituição`(`instituicao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dca` ADD CONSTRAINT `dca_coluna_coluna_coluna_fk` FOREIGN KEY (`coluna`) REFERENCES `coluna`(`coluna`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dca` ADD CONSTRAINT `dca_cod_conta_conta_cod_conta_fk` FOREIGN KEY (`cod_conta`) REFERENCES `conta`(`cod_conta`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dca` ADD CONSTRAINT `dca_populacao_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_org_n05_fk` FOREIGN KEY (`co_siorg_n05`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_org_n06_fk` FOREIGN KEY (`co_siorg_n06`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_org_n07_fk` FOREIGN KEY (`co_siorg_n07`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_sit_icc_fk` FOREIGN KEY (`co_situacao_icc`) REFERENCES `situacao_contabil_lancamento`(`co_situacao_icc`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_nat_desp_fk` FOREIGN KEY (`co_natureza_despesa_deta`) REFERENCES `natureza_despesa_detalhada`(`co_natureza_despesa_deta`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_esfera_orc_fk` FOREIGN KEY (`co_esfera_orcamentaria`) REFERENCES `esfera_orcamentaria`(`co_esfera_orcamentaria`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `demais_custos` ADD CONSTRAINT `demais_custos_res_eof_fk` FOREIGN KEY (`co_resultado_eof`) REFERENCES `resultado_primario`(`co_resultado_eof`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `extrato_entregas` ADD CONSTRAINT `extrato_entregas_instituicao_instituição_instituicao_fk` FOREIGN KEY (`instituicao`) REFERENCES `instituição`(`instituicao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `extrato_entregas` ADD CONSTRAINT `extrato_entregas_pop_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instituição` ADD CONSTRAINT `instituição_cod_ibge_ente_cod_ibge_fk` FOREIGN KEY (`cod_ibge`) REFERENCES `ente`(`cod_ibge`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_controle` ADD CONSTRAINT `msc_controle_pop_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_controle` ADD CONSTRAINT `msc_controle_nat_desp_fk` FOREIGN KEY (`natureza_despesa`) REFERENCES `natureza_despesa_detalhada`(`co_natureza_despesa_deta`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_controle` ADD CONSTRAINT `msc_controle_conta_fk` FOREIGN KEY (`conta_contabil`) REFERENCES `conta_contabil`(`cod_conta_contabil`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_orcamentaria` ADD CONSTRAINT `msc_orcamentaria_pop_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_orcamentaria` ADD CONSTRAINT `msc_orcamentaria_nat_desp_fk` FOREIGN KEY (`natureza_despesa`) REFERENCES `natureza_despesa_detalhada`(`co_natureza_despesa_deta`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_orcamentaria` ADD CONSTRAINT `msc_orcamentaria_conta_fk` FOREIGN KEY (`conta_contabil`) REFERENCES `conta_contabil`(`cod_conta_contabil`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_patrimonial` ADD CONSTRAINT `msc_patrimonial_pop_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `msc_patrimonial` ADD CONSTRAINT `msc_patr_conta_fk` FOREIGN KEY (`conta_contabil`) REFERENCES `conta_contabil`(`cod_conta_contabil`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `natureza_despesa_detalhada` ADD CONSTRAINT `nat_desp_moap_fk` FOREIGN KEY (`id_moap_nade`) REFERENCES `modalidade_aplicacao`(`co_modalidade_aplicacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operacoes_nao_contratadas` ADD CONSTRAINT `opc_nao_cont_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operacoes_nao_contratadas` ADD CONSTRAINT `opc_nao_cont_id_nao_cont_fk` FOREIGN KEY (`id_pleito_nao_contratado`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizacao` ADD CONSTRAINT `org_nat_juridica_fk` FOREIGN KEY (`co_natureza_juridica`) REFERENCES `natureza_juridica`(`co_natureza_juridica`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizacao` ADD CONSTRAINT `org_superior_fk` FOREIGN KEY (`co_organizacao_superior`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizacao` ADD CONSTRAINT `org_area_atuacao_fk` FOREIGN KEY (`in_area_atuacao`) REFERENCES `area_atuacao`(`in_area_atuacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pvl` ADD CONSTRAINT `pvl_cod_ibge_ente_cod_ibge_fk` FOREIGN KEY (`cod_ibge`) REFERENCES `ente`(`cod_ibge`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pvl` ADD CONSTRAINT `pvl_id_credor_credor_id_credor_fk` FOREIGN KEY (`id_credor`) REFERENCES `credor`(`id_credor`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `populacao_anual_ente` ADD CONSTRAINT `populacao_anual_ente_cod_ibge_ente_cod_ibge_fk` FOREIGN KEY (`cod_ibge`) REFERENCES `ente`(`cod_ibge`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rreo_ou_rgf` ADD CONSTRAINT `rreo_ou_rgf_instituicao_instituição_instituicao_fk` FOREIGN KEY (`instituicao`) REFERENCES `instituição`(`instituicao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rreo_ou_rgf` ADD CONSTRAINT `rreo_ou_rgf_coluna_coluna_coluna_fk` FOREIGN KEY (`coluna`) REFERENCES `coluna`(`coluna`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rreo_ou_rgf` ADD CONSTRAINT `rreo_ou_rgf_cod_conta_conta_cod_conta_fk` FOREIGN KEY (`cod_conta`) REFERENCES `conta`(`cod_conta`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rreo_ou_rgf` ADD CONSTRAINT `rreo_rgf_pop_fk` FOREIGN KEY (`cod_ibge`,`exercicio`) REFERENCES `populacao_anual_ente`(`cod_ibge`,`ano_exercicio`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resumo_cronograma_pagamentos` ADD CONSTRAINT `resumo_cronograma_pagamentos_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resumo_geral` ADD CONSTRAINT `resumo_geral_id_pleito_pvl_id_pleito_fk` FOREIGN KEY (`id_pleito`) REFERENCES `pvl`(`id_pleito`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rotulo` ADD CONSTRAINT `rotulo_id_anexo_anexo_id_anexo_fk` FOREIGN KEY (`id_anexo`) REFERENCES `anexo`(`id_anexo`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_org_n0_fk` FOREIGN KEY (`co_organizacao_n0`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_org_n1_fk` FOREIGN KEY (`co_organizacao_n1`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_org_n2_fk` FOREIGN KEY (`co_organizacao_n2`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_org_n3_fk` FOREIGN KEY (`co_organizacao_n3`) REFERENCES `organizacao`(`co_organizacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_mod_aplicacao_fk` FOREIGN KEY (`co_modalidade_aplicacao`) REFERENCES `modalidade_aplicacao`(`co_modalidade_aplicacao`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_esfera_orc_fk` FOREIGN KEY (`co_esfera_orcamentaria`) REFERENCES `esfera_orcamentaria`(`co_esfera_orcamentaria`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transferencia` ADD CONSTRAINT `transf_res_eof_fk` FOREIGN KEY (`co_resultado_eof`) REFERENCES `resultado_primario`(`co_resultado_eof`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serie` ADD CONSTRAINT `serie_codigoSubtema_subtema_codigoSubtema_fk` FOREIGN KEY (`codigoSubtema`) REFERENCES `subtema`(`codigoSubtema`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subtema` ADD CONSTRAINT `subtema_codigoTema_tema_codigoTema_fk` FOREIGN KEY (`codigoTema`) REFERENCES `tema`(`codigoTema`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `natureza_despesa_detalhada` 
MODIFY COLUMN `co_natureza_despesa_deta` varchar(10) NOT NULL,
MODIFY COLUMN `id_categoria_economica_nade` varchar(10),
MODIFY COLUMN `id_grupo_despesa_nade` varchar(10),
MODIFY COLUMN `id_elemento_despesa_nade` varchar(10),
MODIFY COLUMN `id_subitem_nade` varchar(10);