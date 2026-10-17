/* ====================================================================================================
   PDDUA_A81_CATEGORIA_USO
   ANEXO 8.1 - CATEGORIAS DE USOS POR ZONAS E EIXOS DE ADENSAMENTO - Lei Complementar 341/2018
   ====================================================================================================
   Conteúdo: categorias de uso permitidas por zona + notas de rodapé (*), (**)...
   Origem:   CATEGORIA_USO.csv
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const CATEGORIA_USO_DB = {
    "Z1":                      {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V8, V9, V11",
        atacadista: "A1, A2",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S10, S11, S12, S13, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3",
        loteamento: "L1, L2, L3, L5",
        especial: "E1, E2, E3, E4, E10, E13, E19, E20"
    },
    "Z2":                      {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V8, V9, V11",
        atacadista: "A1, A2",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S10, S11, S12, S13, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3",
        loteamento: "L1, L2, L3, L5",
        especial: "E1, E2, E3, E4, E8, E13, E19, E20"
    },
    "Z3":                      {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7(**), V8, V9, V11",
        atacadista: "A1, A2(**), A3(**), A4(**), A5(**), A6(**), A9(**)",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8(**), S10, S11, S12, S13, S14(**), S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3, I4, I5(**)",
        loteamento: "L1, L2, L3, L5",
        especial: "E1, E2, E3, E4, E8, E10, E11(****), E13, E18(**), E19(**), E20(**)"
    },
    "Z4":                      {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3, I4, I5",
        loteamento: "L1, L2, L3, L5",
        especial: "E1, E2, E3, E4, E7, E8, E10, E11(****), E12(***), E13, E18, E19, E20, E21(***)"
    },
    "Z5":                      {
        residencial: "R1, R2",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3, I4, I5",
        loteamento: "L1, L2, L3, L5",
        especial: "E4, E5, E6, E7, E8, E9, E11(****), E13, E14, E16, E17, E18, E19, E20"
    },
    "ZC":                      {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3, I4, I5",
        loteamento: "L1, L2, L3, L5",
        especial: "E1, E2, E3, E4, E7, E8, E13, E18, E19, E20"
    },
    "ZEIE":                    {
        residencial: "R1",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A7, A8, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S11, S12, S19, S20",
        industrial: "I1, I2, I3, I4, I5, I6, I7, I8, I9",
        loteamento: "L4",
        especial: "E4, E5, E6, E7, E13, E15, E16, E21"
    },
    "EA1":                     {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S10, S11, S13, S15, S17, S20, S21",
        industrial: "I1, I2, I3, I4, I5",
        loteamento: "-",
        especial: "E4, E5, E13, E18, E19"
    },
    "EA2":                     {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S13, S14, S15, S16, S17, S20, S21",
        industrial: "I1, I2, I3, I4, I5, I6, I7",
        loteamento: "-",
        especial: "E4, E5, E6, E7, E8, E11(****), E13, E17, E18, E19, E20"
    },
    "EA3":                     {
        residencial: "R1, R2",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A7, A8, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S13, S14, S15, S16, S17, S20",
        industrial: "I1, I2, I3, I4, I5, I6, I7, I8, I9",
        loteamento: "-",
        especial: "E4, E5, E6, E7, E8, E9, E10, E11, E13, E17, E18, E19, E20, E21"
    },
    "Distrito de Anhanduí":    {
        residencial: "R1, R2, R3",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V10, V11",
        atacadista: "A1, A2, A3, A4, A5, A6, A7, A8, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21",
        industrial: "I1, I2, I3, I4, I5",
        loteamento: "L1, L2, L3, L4, L5",
        especial: "E1, E2, E3, E4, E5, E7, E8, E9, E10, E11, E13, E17, E18"
    },
    "Zona de Expansão Urbana": {
        residencial: "R1",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V10",
        atacadista: "A1, A2, A3, A4, A5, A6, A7, A8, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20",
        industrial: "I1, I2, I3, I4, I5, I6, I7, I8, I9",
        loteamento: "L6(*), L7(*)",
        especial: "E4, E5, E6, E7, E8, E9, E10, E11, E12, E13, E14, E15, E16, E17, E18, E19, E20, E21"
    },
    "ZRural":                  {
        residencial: "R1",
        varejista: "V1, V2, V3, V4, V5, V6, V7, V8, V9, V10",
        atacadista: "A1, A2, A3, A4, A5, A6, A7, A8, A9",
        servicos: "S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20",
        industrial: "I1, I2, I3, I4, I5, I6, I7, I8, I9",
        loteamento: "L6(*), L7(*)",
        especial: "E4, E5, E6, E7, E8, E9, E10, E11, E12, E13, E14, E15, E16, E17, E18, E19, E20, E21"
    }
};

// Notas de rodapé da tabela (vão para OBSERVAÇÕES)
const CATEGORIA_USO_NOTAS = [
    "(*) Na Zona de Expansão Urbana não serão permitidos",
    "(**) Exceto nos bairros Autonomista, São Bento, Bela Vista e Itanhangá",
    "(***) Somente no bairro Taveirópolis",
    "(****) Somente nos Bairros Glória, Mato do Jacinto, Moreninhas, Sobrinho, Pioneiros, Centenário e Seminário"
];
