/* ====================================================================================================
   LOUOS_AV_COMP_LOCACIONAL
   ANEXO V - COMPATIBILIDADE LOCACIONAL - LEI COMPLEMENTAR n. 205/2012
   ====================================================================================================
   Conteúdo: compatibilidade locacional por categoria de uso
             via = VIÁRIO_METROS (largura mínima da via, null = sem exigência) • infra = itens marcados com "E" (exigido)
             nota = nº da observação que pode reduzir a via mínima (regras em js/comp_locacional.js)
   Origem:   COMP_LOCACIONAL.csv
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const COMP_LOCACIONAL_DB = {
    "R1":  { via: null, infra: [] },
    "R2":  { via: 12, infra: ["ÁGUA", "ESGOTO", "ENERGIA"], nota: 5 },
    "R3":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "V1":  { via: null, infra: ["ÁGUA", "ENERGIA"] },
    "V2":  { via: 15, infra: ["ÁGUA", "ENERGIA"] },
    "V3":  { via: 12, infra: ["ÁGUA"] },
    "V4":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "V5":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "V6":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "V7":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"], nota: 2 },
    "V8":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "V9":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "V10": { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "V11": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "A1":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "A2":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "A3":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "A4":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "A5":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"], nota: 2 },
    "A6":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "A7":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "A8":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "A9":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S1":  { via: null, infra: [] },
    "S2":  { via: 12, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "S3":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "S4":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "S5":  { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S6":  { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S7":  { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S8":  { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S9":  { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S10": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S11": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S12": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S13": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S14": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S15": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S16": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S17": { via: 15, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S18": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S19": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "S20": { via: 18, infra: ["ÁGUA", "ESGOTO", "ENERGIA"], nota: 3 },
    "I1":  { via: null, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "I2":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "I3":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "I4":  { via: 18, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "I5":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "I6":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "I7":  { via: 33, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "I8":  { via: 33, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "I9":  { via: 33, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E1":  { via: 15, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "E2":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"], nota: 4 },
    "E3":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E4":  { via: null, infra: [] },
    "E5":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E6":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E7":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E8":  { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E9":  { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E10": { via: 22, infra: ["ÁGUA", "ESGOTO", "ENERGIA"], nota: 1 },
    "E11": { via: 18, infra: ["ÁGUA", "ESGOTO", "ENERGIA"] },
    "E12": { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E13": { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E14": { via: 18, infra: ["ÁGUA", "ESGOTO", "ENERGIA"], nota: 2 },
    "E15": { via: null, infra: [] },
    "E16": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO"] },
    "E17": { via: 22, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E18": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E19": { via: 18, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E20": { via: 33, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] },
    "E21": { via: 33, infra: ["ÁGUA", "PAVIMENTAÇÃO", "DRENAGEM", "ESGOTO", "ENERGIA"] }
};

// Notas da tabela (reduções da via mínima)
const COMP_LOCACIONAL_NOTAS = {
    1: "Em empreendimentos com área construída menor ou igual a 2.500m² (dois mil e quinhentos metros quadrados) a faixa de domínio obrigatória da via de acesso terá a dimensão mínima reduzida para até 18m (dezoito metros).",
    2: "Em empreendimentos com área construída menor ou igual a 500m² (quinhentos metros quadrados) a faixa de domínio obrigatória da via de acesso terá a dimensão mínima reduzida para até 15 (quinze) metros.",
    3: "Em empreendimentos com área construída menor ou igual a 2.500m² (dois mil e quinhentos metros quadrados), a faixa de domínio obrigatória da via de acesso terá dimensão mínima reduzida para até 15 (quinze) metros.",
    4: "Em empreendimentos com até 200 (duzentas) unidades habitacionais, a faixa de domínio obrigatória da via de acesso terá a dimensão mínima reduzida para até 15 (quinze) metros.",
    5: "Em empreendimentos com até 6 (seis) unidades habitacionais será dispensada a exigência quanto à largura da faixa de domínio da via de acesso."
};
