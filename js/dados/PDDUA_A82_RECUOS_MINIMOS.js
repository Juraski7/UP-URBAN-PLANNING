/* ====================================================================================================
   PDDUA_A82_RECUOS_MINIMOS
   ANEXO 8.2 - ÍNDICES E INSTRUMENTOS URBANÍSTICOS - LOTES MÍNIMOS - RECUOS MÍNIMOS - LEI COMPLEMENTAR n. 341/2018
   ====================================================================================================
   Conteúdo: recuos mínimos por zona (cada linha da regra separada por quebra de linha)
             frente = FRENTE • lateral = LATERAL E FUNDOS • lateralOodc = LATERAL E FUNDOS NOS CASOS DE OODC / TDC
   Origem:   RECUOS_MINIMOS.csv
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const RECUOS_DB = {
    "Z1":                      {
        frente: "Térreo e 1º pavimento - Livre\nDemais pavimentos - 5,00 m",
        lateral: "Térreo e 1º pavimento - Livre\nIE entre 2 e menor que 6 - h/6 (mínimo 3,00 m)\nIE maior ou igual a 6 e menor que 12 - h/8 (mínimo 3,00 m)\nIE maior ou igual a 12 - h/10 (mínimo 5,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e menor que 6 - h/6 (mínimo 3,00 m)\nIE maior ou igual a 6 e menor que 12 - h/8 (mínimo 3,00 m)\nIE maior ou igual a 12 - h/10 (mínimo 5,00 m)"
    },
    "Z2":                      {
        frente: "IE maior que 2 - 5,00 m (2)",
        lateral: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e menor que 6 - h/6 (mínimo 3,00 m)\nIE maior ou igual a 6 e menor que 12 - h/8 (mínimo 3,00 m)\nIE maior ou igual a 12 - h/10 (mínimo 5,00 m)"
    },
    "Z3":                      {
        frente: "IE maior que 2 - 5,00 m (2)",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e menor que 6 - h/6 (mínimo 3,00 m)\nIE maior ou igual que 6 - h/8 (mínimo 5,00 m)"
    },
    "Z4":                      {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)"
    },
    "Z5":                      {
        frente: "Livre",
        lateral: "Livre",
        lateralOodc: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)"
    },
    "ZC":                      {
        frente: "IE maior que 2 - 5,00 m (2)",
        lateral: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)\nIE maior ou igual a 6 e menor que 12 - h/8 (mínimo 3,00 m)\nIE maior ou igual a 12 - h/10 (mínimo 5,00 m)"
    },
    "ZEIE":                    {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)\nIE maior que 6 - h/8 (mínimo 5,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6 - h/6 (mínimo 3,00 m)\nIE maior que 6 - h/8 (mínimo 5,00 m)"
    },
    "Distrito de Anhanduí":    {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "-"
    },
    "Zona de Expansão Urbana": {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)"
    },
    "EA1":                     {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6,6 - h/6 (mínimo 3,00 m)"
    },
    "EA2":                     {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6,6 - h/6 (mínimo 3,00 m)"
    },
    "EA3":                     {
        frente: "IE maior que 2 - 5,00 m",
        lateral: "IE até 2 - Livre\nIE maior que 2 - h/4 (mínimo 3,00 m)",
        lateralOodc: "Térreo e 1º pavimento - Livre\nIE entre 2 e 6,6 - h/6 (mínimo 3,00 m)"
    }
};

// Notas da tabela; as citadas nas regras da zona (ex.: "(2)") vão para OBSERVAÇÕES
const RECUOS_NOTAS = {
    1: "No caso de edifícios multirresidenciais com fachada ativa a taxa de ocupação no Térreo e 1º Pavimento - 0,7 - Demais Pavimentos - 0,5",
    2: "No caso de edifícios com fachada ativa os recuos de frente no Térreo e 1º Pavimento - Livre - Demais Pavimentos - 5,00",
    3: "No caso de Outorga Onerosa/Transferência do Direito de Construir o Índice de Elevação passa a ser Livre",
    4: "No caso de Outorga Onerosa/Transferência do Direito de Construir o Índice de Elevação passa a ser 8",
    5: "No caso de Outorga Onerosa/Transferência do Direito de Construir o Índice de Elevação passa a ser 6",
    6: "No caso de edifícios multirresidenciais a outorga onerosa terá descontode 20%, quando a fachada ativa possuir área construída de no minimo 20% da TO",
    7: "No caso de edifícios multirresidenciais com fachada ativa a taxa de ocupação no Térreo poderá ser de até 0,8 mediante contrapartida financeira",
    8: "No caso de edifícios multirresidenciais com fachada ativa com área construída de no mínimo 20% da TO, a outorga onerosa terá desconto de 20% após a compra do primeiro coeficiente de aproveitamento",
    9: "No caso de Outorga Onerosa/Transferência do Direito de Construir o Índice de Elevação passa a ser 3",
    10: "No caso de Outorga Onerosa/Transferência do Direito de Construir o Índice de Elevação passa a ser 6,6"
};
