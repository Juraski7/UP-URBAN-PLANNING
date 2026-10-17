/* ====================================================================================================
   PDDUA_A82_LOTES_MINIMOS
   ANEXO 8.2 - ÍNDICES E INSTRUMENTOS URBANÍSTICOS - LOTES MÍNIMOS - RECUOS MÍNIMOS - LEI COMPLEMENTAR n. 341/2018
   ====================================================================================================
   Conteúdo: lotes mínimos por zona
             area = ÁREA (m²) • testadaEsquina = Testada Esquina (m) • testadaMeio = Testada Meio de Quadra (m) • null = "-"
   Origem:   LOTES_MINIMOS.csv
             GERADO por ferramentas/gerar_dados.py: não editar à mão (corrija o CSV e gere de novo).
   ==================================================================================================== */
'use strict';

const LOTES_DB = {
    "Z1":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "Z2":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "Z3":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "Z4":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "Z5":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "ZC":                      { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "ZEIE":                    { area: 500, testadaEsquina: 20, testadaMeio: 20 },
    "Distrito de Anhanduí":    { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "Zona de Expansão Urbana": { area: 250, testadaEsquina: 15, testadaMeio: 10 },
    "EA1":                     { area: null, testadaEsquina: null, testadaMeio: null },
    "EA2":                     { area: null, testadaEsquina: null, testadaMeio: null },
    "EA3":                     { area: null, testadaEsquina: null, testadaMeio: null }
};
