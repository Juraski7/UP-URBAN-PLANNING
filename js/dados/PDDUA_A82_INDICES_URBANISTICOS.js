/* ====================================================================================================
   PDDUA_A82_INDICES_URBANISTICOS
   ANEXO 8.2 - ÍNDICES E INSTRUMENTOS URBANÍSTICOS - LOTES MÍNIMOS - RECUOS MÍNIMOS - LEI COMPLEMENTAR n. 341/2018
   ====================================================================================================
   Conteúdo: índices e instrumentos urbanísticos por zona
             to = TAXA DE OCUPAÇÃO (térreo, quando a zona diferencia; toTexto = texto original)
             camin/caBas/caMax = Camin/Cabas/Camax • oodc = OUTORGA ONEROSA / TDC (coeficiente adquirível; null = "-")
             ie = ÍNDICE DE ELEVAÇÃO (null = Livre) • ieOodc = IE com outorga, tirado da nota citada ("passa a ser ...")
             *Notas = nº das notas citadas em cada coluna
   Origem:   INDICES_URBANISTICOS.csv
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const INDICES_DB = {
    "Z1":                      { to: 0.7, toTexto: "Térreo e 1º Pavimento - 0,7\nDemais Pavimentos - 0,5", toNotas: [7], camin: 0.1, caBas: 4, caMax: 5, oodc: 1, oodcNotas: [6], ie: null, ieOodc: null, ieNotas: [] },
    "Z2":                      { to: 0.5, toNotas: [1], camin: 0.1, caBas: 3, caMax: 5, oodc: 2, oodcNotas: [8], ie: 6, ieOodc: null, ieNotas: [3] },
    "Z3":                      { to: 0.5, toNotas: [1], camin: 0.1, caBas: 2, caMax: 4, oodc: 2, oodcNotas: [], ie: 4, ieOodc: 8, ieNotas: [4] },
    "Z4":                      { to: 0.5, toNotas: [], camin: 0.1, caBas: 2, caMax: 3, oodc: 1, oodcNotas: [], ie: 4, ieOodc: 6, ieNotas: [5] },
    "Z5":                      { to: 0.5, toNotas: [], camin: 0.1, caBas: 1, caMax: 1.5, oodc: 0.5, oodcNotas: [], ie: 2, ieOodc: 3, ieNotas: [9] },
    "ZC":                      { to: 0.5, toNotas: [1], camin: 0.1, caBas: 3, caMax: 5, oodc: 2, oodcNotas: [8], ie: 6, ieOodc: null, ieNotas: [3] },
    "ZEIE":                    { to: 0.7, toNotas: [], camin: 0.1, caBas: 1, caMax: 1.5, oodc: 0.5, oodcNotas: [], ie: null, ieOodc: null, ieNotas: [] },
    "Distrito de Anhanduí":    { to: 0.5, toNotas: [], camin: 0.1, caBas: 2, caMax: 2, oodc: null, oodcNotas: [], ie: 4, ieOodc: 4, ieNotas: [] },
    "Zona de Expansão Urbana": { to: 0.5, toNotas: [], camin: 0.1, caBas: 1, caMax: 2, oodc: 1, oodcNotas: [], ie: null, ieOodc: null, ieNotas: [] },
    "EA1":                     { to: 0.5, toNotas: [], camin: 0.1, caBas: 2.8, caMax: 3.3, oodc: 0.5, oodcNotas: [], ie: 5.6, ieOodc: 6.6, ieNotas: [10] },
    "EA2":                     { to: 0.5, toNotas: [], camin: 0.1, caBas: 2.8, caMax: 3.3, oodc: 0.5, oodcNotas: [], ie: 5.6, ieOodc: 6.6, ieNotas: [10] },
    "EA3":                     { to: 0.5, toNotas: [], camin: 0.1, caBas: 2.8, caMax: 3.3, oodc: 0.5, oodcNotas: [], ie: 5.6, ieOodc: 6.6, ieNotas: [10] }
};

// Notas da tabela; as citadas pela zona vão para OBSERVAÇÕES (ÍNDICES E INSTRUMENTOS URBANÍSTICOS)
const INDICES_NOTAS = {
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
