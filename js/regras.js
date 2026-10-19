/* UP! Urban Planning — REGRAS: todos os parâmetros de lei que o sistema verifica, um bloco por tabela / artigo
   Mudou a lei? Altere o número aqui: as contas (calculo.js, comp_locacional.js, recuos.js, comodos.js) e a coluna
   "REGRA APLICADA" das janelas de informação acompanham.
   Onde fica cada coisa:
     js/regras.js ....... números e condições verificados (este arquivo)
     js/informacoes.js .. texto exibido nas janelas "i" (artigos de lei)
     js/dados/*.js ...... tabelas grandes geradas da planilha TABELAS.xlsx (zonas, índices, recuos, categorias, vagas...)
   Bloco com fonte "a confirmar": parâmetro herdado da planilha de viabilidade, sem artigo de lei registrado.
   Bloco igual a null: tabela ausente ou ilegível na planilha (a verificação fica "TABELA PENDENTE"). */
'use strict';

/* =========================================================
   TRADUÇÃO DO TEXTO DAS TABELAS EM REGRA
   ========================================================= */
/* Faixa de área escrita na tabela -> { min, max } em m² (null = sem limite)
   "Até 2,00 m²" • "De 2,01 m² até 4,00 m²" • "Acima de 32,00 m²" */
function lerFaixaArea(texto) {
    const t = semAcento(texto).toLowerCase();
    const nums = (t.match(/\d[\d.]*(?:,\d+)?/g) || []).map(numeroBR);
    if (t.startsWith('ate')) return { min: null, max: nums[0] };
    if (t.startsWith('acima de') || t.startsWith('de ')) return { min: nums[0], max: nums[1] ?? null };
    throw new Error('faixa de área não reconhecida: ' + texto);
}
/* CO_GEOMETRIA (planilha): [["De 4,01 m² até 8,00 m²", "2 m"], ...] -> faixas em ordem de área.
   A faixa vale até o seu máximo: a área cai na 1ª faixa cujo máximo a contém (2,005 m² não fica sem regra) */
const traduzirGeometria = tabela => tabela.map(([area, diam]) => {
    const f = lerFaixaArea(area), diametro = numeroBR(diam);
    return { ...f, diametro, texto: area,
             descricao: (f.max == null ? `área > ${fmt(f.min)} m²` : `área ≤ ${fmt(f.max)} m²`) + ` → círculo de Ø ${fmt(diametro)} m` };
}).sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity));

/* =========================================================
   REGRAS
   ========================================================= */
const REGRAS = {
    /* ---------------- aba IMÓVEL / EMPREENDIMENTO */
    UHS_VIA: {
        fonte: 'LOUOS, Anexo V - Compatibilidade locacional (notas 4 e 5)',
        // largura da via (muro a muro) a partir da qual vale cada limite de UHs; nota = observação da tabela
        faixas: [
            { viaMin: 0,  maxUH: 6,   nota: 5 },     // até 6 UHs: dispensada a exigência de largura (nota 5)
            { viaMin: 12, maxUH: 25 },
            { viaMin: 15, maxUH: 200, nota: 4 },     // até 200 UHs: via mínima reduzida para 15 m (nota 4)
            { viaMin: 18, maxUH: 250 },
            { viaMin: 22, maxUH: Infinity }
        ]
    },
    VIA_MINIMA: {
        fonte: 'LOUOS, Anexo V - Compatibilidade locacional (notas 1 a 5)',
        // reduções da via mínima por nota da tabela. aplica(ctx) -> true / false / null (falta o dado)
        // ctx = { ac: área construída total, uhs: nº de UHs } (NaN quando não informado)
        reducoes: {
            1: { via: 18, quando: 'área construída até 2.500 m²', aplica: c => conhecido(c.ac) ? c.ac <= 2500 : null },
            2: { via: 15, quando: 'área construída até 500 m²',   aplica: c => conhecido(c.ac) ? c.ac <= 500 : null },
            3: { via: 15, quando: 'área construída até 2.500 m²', aplica: c => conhecido(c.ac) ? c.ac <= 2500 : null },
            4: { via: 15, quando: 'até 200 UHs',                  aplica: c => conhecido(c.uhs) ? c.uhs <= 200 : null },
            5: { via: 0,  quando: 'até 6 UHs',                    aplica: c => conhecido(c.uhs) ? c.uhs <= 6 : null }
        }
    },
    LAZER: {
        fonte: 'LOUOS e suas alterações, Art. 50, II, alíneas i e j',
        aPartirDeUHs: 10,              // i) exigida a partir de 10 unidades
        m2PorUH: 3,                    // i) 3 m² por unidade
        reducaoPrivativa: 0.5          // j) redução de 50% com lazer nas unidades privativas
    },
    PERMEABILIDADE: {
        fonte: 'PDDUA, Anexo 7 (taxa mínima por zona ambiental) • LOUOS e suas alterações, Art. 37, VI, alínea d (compensação)',
        minimoPorZA: { 'ZA 1': 20, 'ZA 2': 25, 'ZA 3': 25, 'ZA 4': 30, 'ZA 5': 30 },     // % mínimo do lote (a ZA de cada bairro: aba PDDUA_A7)
        compensacaoM3PorM2: 0.030      // 30 l por m² de terreno que não atende a taxa
    },
    ALTURA: {
        fonte: 'PDDUA e suas alterações, Art. 38, § 1º',
        acrescimo: 3,                  // h = piso do térreo até a laje do piso do último pavimento + 3 m
        peDireitoEstimado: 3           // sem a altura informada: h ≈ pavimentos x 3 m
    },
    OODC: {
        fonte: 'a confirmar (planilha de viabilidade)',
        percentualIptu: 0.40           // valor ≈ área adquirida x valor do m² (IPTU) x 40%
    },
    VAGAS: {
        fonte: 'a confirmar (planilha de viabilidade)',
        moradorPorUH: 1,               // 1 vaga por UH
        pcdMorador: 0.03,              // 3% das vagas de morador (arredonda para cima)
        visitantesPorUH: 0.05,         // 5% das UHs (arredonda para cima)
        pcdVisitante: 1, idosoVisitante: 1, visitanteComumMin: 1,
        motosPorUH: 0.07,              // 7% das UHs
        bicicletasPorUH: 0.03,         // 3% das UHs
        cargaDescargaMin: 1            // no mínimo 1 vaga
    },
    BACIA: {
        fonte: 'a confirmar (planilha de viabilidade)',
        coeficiente: 0.025, multiplicador: 20     // volume = área do lote x 0,025 x TO x 20 (+ compensação da permeabilidade)
    },
    FAIXA_ACUMULO: {
        fonte: 'AGETRAN',
        faixas: 1, veiculos: 4, vagas: 8, comprimento: 19.20     // mínimos exigidos (comprimento na testada, em m)
    },
    RESIDUOS: {
        fonte: 'a confirmar (planilha de viabilidade)',
        // valores iniciais dos parâmetros (engrenagem); campo vazio recebe o padrão
        padroes: { 'inp-res-dorms': 2, 'inp-res-hab-dorm': 2, 'inp-res-taxa-hab': 1, 'inp-res-dias-org': 3, 'inp-res-dias-rec': 7 },
        funcionariosPorUH: 0.10,       // 10% das UHs, arredondado para cima
        organicos:   { fracao: 0.65, divisor: 200 },     // m² = população x kg/dia x 0,65 x dias / 200
        reciclaveis: { fracao: 0.35, divisor: 100 }      // m² = população x kg/dia x 0,35 x dias / 100
    },

    /* ---------------- aba COMPARTIMENTOS (Código de Obras) */
    CO_GEOMETRIA: {
        fonte: 'Código de Obras, Art. 113',
        faixas: typeof CO_GEOMETRIA === 'undefined' ? [] : traduzirGeometria(CO_GEOMETRIA.faixas)    // tabela da planilha
    },
    // as três abaixo vêm das abas da planilha (texto do artigo traduzido em js/tabelas.js); null = aba com problema ("TABELA PENDENTE")
    CO_PE_DIREITO: CO_PE_DIREITO && {
        fonte: CO_PE_DIREITO.fonte,
        // permanência que não está na aba (especiais): pé-direito fixado no Código para a destinação (Art. 114, § 2º)
        minimo: { prolongada: null, transitoria: null, especiais: null, ...CO_PE_DIREITO.minimo }
    },
    CO_ABERTURAS: CO_ABERTURAS && {             // tabela por permanência (aba CO_ABERTURAS)
        fonte: 'Código de Obras, Art. 124',
        fracao: CO_ABERTURAS.fracao,             // área das aberturas ≥ fração da área do compartimento (1/7 prolongada, 1/10 transitória)
        fracaoTexto: CO_ABERTURAS.fracaoTexto,
        minimo: CO_ABERTURAS.minimo,             // e nunca menor que (0,70 m² prolongada, 0,20 m² transitória)
        ventilacao: CO_ABERTURAS.ventilacao,     // parte da área exigida que deve permitir ventilação (0,5 = metade)
        semRegra: CO_ABERTURAS.semRegra          // permanência sem fração na tabela (especiais: "VALIDAR E CONSULTA")
    },
    CO_BANHEIROS: CO_BANHEIROS && {
        fonte: CO_BANHEIROS.fonte,
        areaUnico: CO_BANHEIROS.areaUnico,       // instalação sanitária única na edificação
        areaCada: CO_BANHEIROS.areaCada          // mais de uma: área mínima de cada
    }
};

/* =========================================================
   CONSULTAS
   ========================================================= */
function conhecido(v) { return Number.isFinite(v) && v > 0; }
/* Art. 113: faixa da área do compartimento (a tabela trabalha com 2 casas) */
const regraGeometria = area => {
    const a = Math.round(area * 100) / 100;
    return REGRAS.CO_GEOMETRIA.faixas.find(r => r.max == null || a <= r.max) || null;
};
/* Coluna "REGRA APLICADA" das janelas de informação: uma linha por linha da tabela da lei */
const REGRA_APLICADA = {
    CO_GEOMETRIA: () => REGRAS.CO_GEOMETRIA.faixas.map(r => r.descricao),
    CO_PE_DIREITO: () => Object.keys(CO_COMPARTIMENTOS).map(k => REGRAS.CO_PE_DIREITO ? REGRAS.CO_PE_DIREITO.minimo[k] : undefined)
        .map(m => m === undefined ? 'tabela pendente' : m == null ? 'fixado no Código para a destinação' : `pé-direito ≥ ${fmt(m)} m`),
    CO_ABERTURAS: () => ['prolongada', 'transitoria'].map(k => { const R = REGRAS.CO_ABERTURAS;
        if (!R) return 'tabela pendente';
        if (!(k in R.fracao)) return (R.semRegra[k] || 'sem regra na tabela').toLowerCase();
        return `aberturas ≥ ${R.fracaoTexto[k]} da área do compartimento, nunca menos que ${fmt(R.minimo[k])} m²`
            + (R.ventilacao[k] ? `; ventilação ≥ ${fmt(R.ventilacao[k] * 100, 0)}% da área exigida` : ''); }),
    CO_BANHEIROS: () => { const R = REGRAS.CO_BANHEIROS;
        return R ? [`área ≥ ${fmt(R.areaUnico)} m²`, `cada um com área ≥ ${fmt(R.areaCada)} m²`] : ['tabela pendente', 'tabela pendente']; }
};
