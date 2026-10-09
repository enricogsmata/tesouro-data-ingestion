CREATE TABLE `api_links` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`endpoint_id` bigint unsigned NOT NULL,
	`href` text,
	`rel` text,
	`generatedAt` timestamp NOT NULL,
	CONSTRAINT `api_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`base_url` text NOT NULL,
	`title` text,
	`raw_metadata` text,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `endpoint_parameters` (
	`endpoint_id` bigint unsigned NOT NULL,
	`name` text NOT NULL,
	`in` text,
	`description` text,
	`is_required` int NOT NULL,
	`type` text
);
--> statement-breakpoint
CREATE TABLE `endpoint` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`data_source_id` bigint unsigned NOT NULL,
	`path` text NOT NULL,
	`method` text,
	`summary` text,
	`description` text,
	`tags` text,
	`target_table` text NOT NULL,
	CONSTRAINT `endpoint_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`data` longtext,
	`sourceModule` text,
	`sourceContext` text,
	`generatedAt` timestamp NOT NULL,
	CONSTRAINT `logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_opc_cronograma_liberacoes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`num_pvl` varchar(255),
	`num_processo` varchar(255),
	`indicador_liberacoes` varchar(255),
	`ano` varchar(255),
	`liberacoes_operacoes_sfn` double,
	`liberacoes_aro` double,
	`liberacoes_demais` double,
	`liberacoes_total` double,
	CONSTRAINT `raw_ds1_opc_cronograma_liberacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_opc_cronograma_pagamentos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`num_pvl` varchar(255),
	`num_processo` varchar(255),
	`indicador_liberacoes` varchar(255),
	`ano` varchar(255),
	`divida_consolidada_amortizacao` double,
	`divida_consolidada_encargos` double,
	`operacoes_contratadas_amortizacao` double,
	`operacoes_contratadas_encargos` double,
	`total_amorizacao` double,
	`total_encargos` double,
	`indicador_div_moeda_estrang` varchar(255),
	CONSTRAINT `raw_ds1_opc_cronograma_pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_opc_taxa_cambio` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`moeda` varchar(255),
	`taxa_cambio` varchar(255),
	`data_taxa_cambio` varchar(255),
	CONSTRAINT `raw_ds1_opc_taxa_cambio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_pvl_tramitacao_deferido` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`num_pvl` varchar(255),
	`num_processo` varchar(255),
	`sn_pvl_tramitacao_deferido` varchar(255),
	`pleito_nao_contratado` int,
	`num_pvl_nao_contratado` varchar(255),
	`num_processo_nao_contratado` varchar(255),
	`moeda_pvl_nao_contratado` varchar(255),
	`valor_pvl_nao_contratado` double,
	`status_pvl_nao_contratado` varchar(255),
	`ano_pvl_nao_contratado` varchar(255),
	`contrapartida_pvl_nao_contratado` double,
	`liberacao_pvl_nao_contratado` double,
	`amortizacao_pvl_nao_contratado` double,
	`encargos_pvl_nao_contratado` double,
	`liberacoes_pvl_nao_contratado` double,
	CONSTRAINT `raw_ds1_pvl_tramitacao_deferido_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_res_cronograma_pagamentos` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`num_pvl` varchar(255),
	`num_processo` varchar(255),
	`ano` varchar(255),
	`operacao_pleiteada` varchar(255),
	`demais_operacoes` varchar(255),
	CONSTRAINT `raw_ds1_res_cronograma_pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_sadipem_tt_pvl` (
	`id_pleito` int NOT NULL,
	`tipo_interessado` varchar(255),
	`interessado` varchar(255),
	`cod_ibge` int,
	`uf` varchar(255),
	`num_pvl` varchar(255),
	`status` varchar(255),
	`num_processo` varchar(255),
	`data_protocolo` varchar(255),
	`tipo_operacao` varchar(255),
	`finalidade` varchar(255),
	`tipo_credor` varchar(255),
	`credor` varchar(255),
	`moeda` varchar(255),
	`valor` double,
	`pvl_assoc_divida` int,
	`pvl_contratado_credor` int,
	`data_status` varchar(255),
	CONSTRAINT `raw_ds1_sadipem_tt_pvl_id_pleito` PRIMARY KEY(`id_pleito`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds1_tt_res_cdp` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`id_pleito` int,
	`num_pvl` varchar(255),
	`num_processo` varchar(255),
	`data_base` varchar(255),
	`status` varchar(255),
	`data_status` varchar(255),
	`situacao_ente` varchar(255),
	CONSTRAINT `raw_ds1_tt_res_cdp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_demais` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_siorg_n04` varchar(255),
	`ds_siorg_n04` varchar(255),
	`co_siorg_n05` varchar(255),
	`ds_siorg_n05` varchar(255),
	`co_siorg_n06` varchar(255),
	`ds_siorg_n06` varchar(255),
	`co_siorg_n07` varchar(255),
	`ds_siorg_n07` varchar(255),
	`me_referencia` int,
	`an_referencia` int,
	`sg_mes_completo` varchar(255),
	`me_emissao` int,
	`an_emissao` int,
	`co_situacao_icc` varchar(255),
	`no_situacao_icc` varchar(255),
	`id_natureza_juridica_siorg` int,
	`ds_natureza_juridica_siorg` varchar(255),
	`id_categoria_economica_nade` varchar(255),
	`id_grupo_despesa_nade` varchar(255),
	`id_moap_nade` varchar(255),
	`id_elemento_despesa_nade` varchar(255),
	`id_subitem_nade` varchar(255),
	`co_natureza_despesa_deta` varchar(255),
	`no_natureza_despesa_deta` varchar(255),
	`id_esfera_orcamentaria` int,
	`no_esfera_orcamentaria` varchar(255),
	`id_in_resultado_eof` varchar(255),
	`no_in_resultado_eof` varchar(255),
	`va_custo` double,
	CONSTRAINT `raw_ds2_custos_tt_demais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_depreciacao` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_natureza_juridica` int,
	`ds_natureza_juridica` varchar(255),
	`co_organizacao_n0` varchar(255),
	`ds_organizacao_n0` varchar(255),
	`co_organizacao_n1` varchar(255),
	`ds_organizacao_n1` varchar(255),
	`co_organizacao_n2` varchar(255),
	`ds_organizacao_n2` varchar(255),
	`co_organizacao_n3` varchar(255),
	`ds_organizacao_n3` varchar(255),
	`an_lanc` int,
	`me_lanc` int,
	`id_conta_contabil` int,
	`no_conta_contabil` varchar(255),
	`va_custo_depreciacao` double,
	CONSTRAINT `raw_ds2_custos_tt_depreciacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_pensionistas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_natureza_juridica` int,
	`ds_natureza_juridica` varchar(255),
	`co_organizacao_n0` varchar(255),
	`ds_organizacao_n0` varchar(255),
	`co_organizacao_n1` varchar(255),
	`ds_organizacao_n1` varchar(255),
	`co_organizacao_n2` varchar(255),
	`ds_organizacao_n2` varchar(255),
	`co_organizacao_n3` varchar(255),
	`ds_organizacao_n3` varchar(255),
	`an_lanc` int,
	`me_lanc` int,
	`va_custo_pensionistas` double,
	CONSTRAINT `raw_ds2_custos_tt_pensionistas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_pessoal_ativo` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_natureza_juridica` int,
	`ds_natureza_juridica` varchar(255),
	`co_organizacao_n0` varchar(255),
	`ds_organizacao_n0` varchar(255),
	`co_organizacao_n1` varchar(255),
	`ds_organizacao_n1` varchar(255),
	`co_organizacao_n2` varchar(255),
	`ds_organizacao_n2` varchar(255),
	`co_organizacao_n3` varchar(255),
	`ds_organizacao_n3` varchar(255),
	`co_organizacao_n4` varchar(255),
	`ds_organizacao_n4` varchar(255),
	`co_organizacao_n5` varchar(255),
	`ds_organizacao_n5` varchar(255),
	`co_organizacao_n6` varchar(255),
	`ds_organizacao_n6` varchar(255),
	`an_lanc` int,
	`me_lanc` int,
	`in_area_atuacao` int,
	`ds_area_atuacao` varchar(255),
	`in_escolaridade` varchar(255),
	`ds_escolaridade` varchar(255),
	`in_faixa_etaria` varchar(255),
	`ds_faixa_etaria` varchar(255),
	`in_sexo` varchar(255),
	`in_forca_trabalho` int,
	`va_custo_de_pessoal` double,
	CONSTRAINT `raw_ds2_custos_tt_pessoal_ativo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_pessoal_inativo` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_natureza_juridica` int,
	`ds_natureza_juridica` varchar(255),
	`co_organizacao_n0` varchar(255),
	`ds_organizacao_n0` varchar(255),
	`co_organizacao_n1` varchar(255),
	`ds_organizacao_n1` varchar(255),
	`co_organizacao_n2` varchar(255),
	`ds_organizacao_n2` varchar(255),
	`co_organizacao_n3` varchar(255),
	`ds_organizacao_n3` varchar(255),
	`an_lanc` int,
	`me_lanc` int,
	`va_custo_pessoal_inativo` double,
	CONSTRAINT `raw_ds2_custos_tt_pessoal_inativo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds2_custos_tt_transferencias` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`co_natureza_juridica` int,
	`ds_natureza_juridica` varchar(255),
	`co_organizacao_n0` varchar(255),
	`ds_organizacao_n0` varchar(255),
	`co_organizacao_n1` varchar(255),
	`ds_organizacao_n1` varchar(255),
	`co_organizacao_n2` varchar(255),
	`ds_organizacao_n2` varchar(255),
	`co_organizacao_n3` varchar(255),
	`ds_organizacao_n3` varchar(255),
	`an_lanc` int,
	`me_lanc` int,
	`co_esfera_orcamentaria` int,
	`ds_esfera_orcamentaria` varchar(255),
	`co_resultado_eof` int,
	`ds_resultado_eof` varchar(255),
	`va_custo_transferencias` double,
	CONSTRAINT `raw_ds2_custos_tt_transferencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds3_custom_resultado_fiscal` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nomeTema` varchar(255),
	`nomeSubtema` varchar(255),
	`codigoTema` varchar(255),
	`data` varchar(255),
	`codigoSubtema` varchar(255),
	`valor` double,
	`codigoSerie` varchar(255),
	`nomeSerie` varchar(255),
	CONSTRAINT `raw_ds3_custom_resultado_fiscal_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds3_temporais_custom_series` (
	`codigo` varchar(255) NOT NULL,
	`nome` varchar(255),
	`codigoTema` varchar(255),
	`nomeTema` varchar(255),
	`codigoSubtema` varchar(255),
	`nomeSubtema` varchar(255),
	CONSTRAINT `raw_ds3_temporais_custom_series_codigo` PRIMARY KEY(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_dca` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int,
	`instituicao` varchar(255),
	`cod_ibge` int,
	`uf` varchar(255),
	`anexo` varchar(255),
	`rotulo` varchar(255),
	`coluna` varchar(255),
	`cod_conta` varchar(255),
	`conta` varchar(255),
	`valor` double,
	`populacao` int,
	CONSTRAINT `raw_ds4_siconfi_tt_dca_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_entes` (
	`cod_ibge` int NOT NULL,
	`ente` varchar(255),
	`capital` int,
	`regiao` varchar(255),
	`uf` varchar(255),
	`esfera` varchar(255),
	`an_exercicio` int,
	`populacao` int,
	`co_cnpj` varchar(255),
	CONSTRAINT `raw_ds4_siconfi_tt_entes_cod_ibge` PRIMARY KEY(`cod_ibge`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_extrato_entregas` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int,
	`cod_ibge` int,
	`populacao` int,
	`instituicao` varchar(255),
	`entregavel` varchar(255),
	`periodo` int,
	`periodicidade` varchar(255),
	`status_relatorio` varchar(255),
	`data_status` varchar(255),
	`forma_envio` varchar(255),
	`tipo_relatorio` varchar(255),
	CONSTRAINT `raw_ds4_siconfi_tt_extrato_entregas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_msc_controle` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` varchar(255),
	`cod_ibge` int,
	`classe_conta` int,
	`conta_contabil` varchar(255),
	`poder_orgao` int,
	`ano_fonte_recursos` int,
	`fonte_recursos` varchar(255),
	`funcao` varchar(255),
	`subfuncao` varchar(255),
	`exercicio` int,
	`mes_referencia` int,
	`educacao_saude` int,
	`data_referencia` varchar(255),
	`entrada_msc` int,
	`natureza_despesa` varchar(255),
	`ano_inscricao` int,
	`valor` double,
	`natureza_conta` varchar(255),
	`tipo_valor` varchar(255),
	CONSTRAINT `raw_ds4_siconfi_tt_msc_controle_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_msc_orcamentaria` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` varchar(255),
	`cod_ibge` int,
	`classe_conta` int,
	`conta_contabil` varchar(255),
	`poder_orgao` int,
	`ano_fonte_recursos` int,
	`fonte_recursos` varchar(255),
	`funcao` varchar(255),
	`subfuncao` varchar(255),
	`exercicio` int,
	`mes_referencia` int,
	`educacao_saude` int,
	`data_referencia` varchar(255),
	`entrada_msc` int,
	`natureza_despesa` varchar(255),
	`ano_inscricao` int,
	`natureza_receita` varchar(255),
	`valor` double,
	`natureza_conta` varchar(255),
	`tipo_valor` varchar(255),
	CONSTRAINT `raw_ds4_siconfi_tt_msc_orcamentaria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_msc_patrimonial` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tipo_matriz` varchar(255),
	`cod_ibge` int,
	`classe_conta` int,
	`conta_contabil` varchar(255),
	`poder_orgao` int,
	`financeiro_permanente` int,
	`ano_fonte_recursos` int,
	`fonte_recursos` varchar(255),
	`exercicio` int,
	`mes_referencia` int,
	`divida_consolidada` int,
	`data_referencia` varchar(255),
	`entrada_msc` int,
	`valor` double,
	`natureza_conta` varchar(255),
	`tipo_valor` varchar(255),
	CONSTRAINT `raw_ds4_siconfi_tt_msc_patrimonial_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_rgf` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int,
	`periodo` int,
	`periodicidade` varchar(255),
	`instituicao` varchar(255),
	`cod_ibge` int,
	`uf` varchar(255),
	`co_poder` varchar(255),
	`populacao` int,
	`anexo` varchar(255),
	`rotulo` varchar(255),
	`coluna` varchar(255),
	`cod_conta` varchar(255),
	`conta` varchar(255),
	`valor` double,
	CONSTRAINT `raw_ds4_siconfi_tt_rgf_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_siconfi_tt_rreo` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exercicio` int,
	`demonstrativo` varchar(255),
	`periodo` int,
	`periodicidade` varchar(255),
	`instituicao` varchar(255),
	`cod_ibge` int,
	`uf` varchar(255),
	`populacao` int,
	`anexo` varchar(255),
	`esfera` varchar(255),
	`rotulo` varchar(255),
	`coluna` varchar(255),
	`cod_conta` varchar(255),
	`conta` varchar(255),
	`valor` double,
	CONSTRAINT `raw_ds4_siconfi_tt_rreo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_ds4_tt_anexos_relatorios` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`esfera` varchar(255),
	`demonstrativo` varchar(255),
	`anexo` varchar(255),
	CONSTRAINT `raw_ds4_tt_anexos_relatorios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_endpoint_response` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`endpoint_id` bigint unsigned NOT NULL,
	`raw_items` longtext,
	`hasMore` int,
	`limit` int,
	`offset` int,
	`count` int,
	`generatedAt` timestamp NOT NULL,
	CONSTRAINT `raw_endpoint_response_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_links` ADD CONSTRAINT `api_links_endpoint_id_raw_endpoint_response_id_fk` FOREIGN KEY (`endpoint_id`) REFERENCES `raw_endpoint_response`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `endpoint_parameters` ADD CONSTRAINT `endpoint_parameters_endpoint_id_endpoint_id_fk` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoint`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `endpoint` ADD CONSTRAINT `endpoint_data_source_id_data_sources_id_fk` FOREIGN KEY (`data_source_id`) REFERENCES `data_sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_endpoint_response` ADD CONSTRAINT `raw_endpoint_response_endpoint_id_endpoint_id_fk` FOREIGN KEY (`endpoint_id`) REFERENCES `endpoint`(`id`) ON DELETE no action ON UPDATE no action;