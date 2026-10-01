import { rawDs1OpcCronogramaLiberacoes, rawDs1OpcCronogramaPagamentos, rawDs1OpcTaxaCambio, rawDs1PvlTramitacaoDeferido, rawDs1ResCronogramaPagamentos, rawDs1SadipemTtPvl, rawDs1TtResCdp, rawDs2CustosTtDemais, rawDs2CustosTtDepreciacao, rawDs2CustosTtPensionistas, rawDs2CustosTtPessoalAtivo, rawDs2CustosTtPessoalInativo, rawDs2CustosTtTransferencias, rawDs3CustomResultadoFiscal, rawDs3TemporaisCustomSeries, rawDs4SiconfiTtDca, rawDs4SiconfiTtEntes, rawDs4SiconfiTtExtratoEntregas, rawDs4SiconfiTtMscControle, rawDs4SiconfiTtMscOrcamentaria, rawDs4SiconfiTtMscPatrimonial, rawDs4SiconfiTtRgf, rawDs4SiconfiTtRreo, rawDs4TtAnexosRelatorios } from "./schema.js";

// Dicionário de mapeamento para o Bulk Insert dinâmico do Drizzle
export const tablesMap: Record<string, any> = {
    // Endpoints DS1 (Tesouro/PVL/Cronogramas)
    'raw_ds1_sadipem_tt_pvl': rawDs1SadipemTtPvl,
    'raw_ds1_opc_cronograma_pagamentos': rawDs1OpcCronogramaPagamentos,
    'raw_ds1_opc_cronograma_liberacoes': rawDs1OpcCronogramaLiberacoes,
    'raw_ds1_opc_taxa_cambio': rawDs1OpcTaxaCambio,
    'raw_ds1_res_cronograma_pagamentos': rawDs1ResCronogramaPagamentos,
    'raw_ds1_tt_res_cdp': rawDs1TtResCdp,
    'raw_ds1_pvl_tramitacao_deferido': rawDs1PvlTramitacaoDeferido,

    // Endpoints DS2 (Custos)
    'raw_ds2_custos_tt_depreciacao': rawDs2CustosTtDepreciacao,
    'raw_ds2_custos_tt_pensionistas': rawDs2CustosTtPensionistas,
    'raw_ds2_custos_tt_pessoal_ativo': rawDs2CustosTtPessoalAtivo,
    'raw_ds2_custos_tt_pessoal_inativo': rawDs2CustosTtPessoalInativo,
    'raw_ds2_custos_tt_transferencias': rawDs2CustosTtTransferencias,
    'raw_ds2_custos_tt_demais': rawDs2CustosTtDemais,

    // Endpoints DS3 (Séries Temporais/Resultado Fiscal)
    'raw_ds3_custom_resultado_fiscal': rawDs3CustomResultadoFiscal,
    'raw_ds3_temporais_custom_series': rawDs3TemporaisCustomSeries,

    // Endpoints DS4 (Siconfi)
    'raw_ds4_siconfi_tt_rreo': rawDs4SiconfiTtRreo,
    'raw_ds4_siconfi_tt_rgf': rawDs4SiconfiTtRgf,
    'raw_ds4_siconfi_tt_dca': rawDs4SiconfiTtDca,
    'raw_ds4_siconfi_tt_msc_patrimonial': rawDs4SiconfiTtMscPatrimonial,
    'raw_ds4_siconfi_tt_msc_orcamentaria': rawDs4SiconfiTtMscOrcamentaria,
    'raw_ds4_siconfi_tt_msc_controle': rawDs4SiconfiTtMscControle,
    'raw_ds4_siconfi_tt_entes': rawDs4SiconfiTtEntes,
    'raw_ds4_siconfi_tt_extrato_entregas': rawDs4SiconfiTtExtratoEntregas,
    'raw_ds4_tt_anexos_relatorios': rawDs4TtAnexosRelatorios
};