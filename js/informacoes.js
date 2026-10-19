/* UP! Urban Planning — TEXTOS DAS JANELAS DE INFORMAÇÃO (botão "i") e textos de lei usados nas regras
   Para alterar um texto, edite só este arquivo. Cada janela é uma lista de blocos, na ordem em que aparecem:
     { p: 'texto' }               parágrafo (aceita <b>negrito</b>)
     { fonte: 'texto' }           fonte em itálico, com linha acima (ex.: "LOUOS e suas alterações, Art. 50")
     { img: 'img/X.png', alt }    figura
     { artigo: `texto` }          artigo de lei: cada linha vira um parágrafo e a 1ª linha (caput) fica em negrito
     { tabela: { larguras, colunas, linhas, regra } }   tabela: larguras das colunas (%), títulos e linhas de texto;
                                  com regra: 'CO_...', a última coluna (REGRA APLICADA) é preenchida por js/regras.js
     { linha: true }              separador entre artigos
   A chave é o id da janela no VALIDADOR (data-info="..." no botão "i").
   Estes textos só são exibidos: os números verificados pelo sistema ficam em js/regras.js. */
'use strict';

/* =========================================================
   JANELAS DE INFORMAÇÃO
   ========================================================= */
const INFORMACOES = {
    /* ---------------- aba EMPREENDIMENTO */
    'info-lazer': [
        { p: '<b>i)</b> a partir de 10 unidades residenciais, o empreendimento deve ter uma área de uso comum destinada a lazer, equivalente a 3 (três) metros quadrados por unidade residencial.' },
        { p: '<b>j)</b> a área de lazer definida no item anterior poderá ser reduzida em 50% (cinqüenta por cento), quando caracterizada nas unidades privativas.' },
        { fonte: 'LOUOS e suas alterações, Art. 50, II, alíneas i e j' }
    ],
    'info-perm': [
        { p: '<b>Taxa de permeabilidade</b> é a relação percentual entre a área do terreno livre para infiltração das águas pluviais e a área total do lote ou gleba;' },
        { fonte: 'PDDUA e suas alterações, Anexo 1 - Definições' },
        { p: '<b>d)</b> será admitida como alternativa para o atendimento deste inciso, a execução de caixa de captação de águas pluviais com volume mínimo de 30 l (trinta litros) de água por metro quadrado de terreno que não atenda a taxa de permeabilidade prevista nesta Lei Complementar;' },
        { fonte: 'LOUOS e suas alterações, Art. 37, VI, alínea d' }
    ],
    'info-to': [
        { p: '<b>Taxa de ocupação (TO)</b> é a relação entre a Área Ocupada (AO) e a Área do Terreno (AT), sendo: <b>TO = AO/AT</b>;' },
        { img: 'img/TAXA_OCUPACAO.png', alt: 'TAXA DE OCUPAÇÃO (TO)' },
        { fonte: 'PDDUA e suas alterações, Anexo 1 - Definições' }
    ],
    'info-ca': [
        { p: '<b>Coeficiente de aproveitamento (CA)</b> é a relação entre a área construída (AC) e área do terreno (AT): <b>CA = AC/AT</b>.' },
        { img: 'img/COEFICIENTE_APROVEITAMENTO.png', alt: 'COEFICIENTE DE APROVEITAMENTO (CA)' },
        { fonte: 'PDDUA e suas alterações, Anexo 1 - Definições' }
    ],
    'info-ie': [
        { p: '<b>Índice de elevação (IE)</b> - é a relação entre a área construída (AC) e a área ocupada (AO) de uma edificação: <b>IE = AC/AO</b>;' },
        { img: 'img/INDICE_ELEVACAO.png', alt: 'ÍNDICE DE ELEVAÇÃO (IE)' },
        { fonte: 'PDDUA e suas alterações, Anexo 1 - Definições' }
    ],
    'info-recuos': [
        { p: '<b>Altura (h)</b> é a medida em metros, cotada do piso do pavimento térreo até a laje do piso do último pavimento, acrescida de 3 m (três metros);' },
        { p: '<b>Recuo</b> é a distância mínima entre a projeção horizontal da edificação e a divisa do lote;' },
        { fonte: 'PDDUA e suas alterações, Art. 38, § 1º e Anexo 1 - Definições' }
    ],

    /* ---------------- aba COMPARTIMENTOS */
    'info-permanencia': [
        { artigo: `Art. 107 - Compartimentos de permanência prolongada são aqueles que poderão ser utilizados para uma, pelo menos, das funções ou atividades seguintes:
1 - dormir ou repousar;
2 - estar ou lazer;
3 - trabalhar, ensinar ou estudar;
4 - preparo e consumição de alimentos;
5 - tratamento ou recuperação;
6 - reunir ou recrear.` },
        { linha: true },
        { artigo: `Art. 108 - Compartimentos de permanência transitória são aqueles que poderão ser utilizados, para uma, pelo menos, das funções ou atividades seguintes:
1 - circulação e acesso de pessoas;
2 - higiene pessoal;
3 - depósito para guarda de materiais, utensílios ou peças sem a possibilidade de qualquer atividade no local;
4 - troca e guarda de roupas
5 - lavagem de roupas e serviços de limpeza.` },
        { linha: true },
        { artigo: `Art. 109 - Compartimentos especiais são aqueles que, embora podendo comportar as funções ou atividades relacionadas aos artigos 107 e 108, apresentam características e condições adequadas à sua destinação especial.` },
        { fonte: 'Código de Obras, Art. 107 a 109' }
    ],
    'info-geometria': [
        /* Art. 113: diâmetro mínimo do círculo no plano do piso (regra verificada: REGRAS.CO_GEOMETRIA, da planilha) */
        { artigo: `Art. 113 – Os compartimentos em geral, mencionados nos artigos 107, 108 e 109 deverão ter, no plano do piso, formato capaz de conter um circulo, com diâmetro mínimo proporcional à área mínima exigida para o compartimento, conforme as tabelas seguintes :` },
        { tabela: {
            larguras: [28, 28, 44],
            colunas: ['ÁREAS MÍNIMAS EXIGIDAS PARA COMPARTIMENTO', 'PARA DIÂMETRO MÍNIMO DE CÍRCULO NO PLANO DE PISO', 'REGRA APLICADA'],
            regra: 'CO_GEOMETRIA',
            linhas: [
                ['Até 2,00 m²',              'Ø 0,90 m'],
                ['De 2,01 m² até 4,00 m²',   'Ø 1,50 m'],
                ['De 4,01 m² até 8,00 m²',   'Ø 2,00 m'],
                ['De 8,01 m² até 16,00 m²',  'Ø 2,50 m'],
                ['De 16,01 m² até 32,00 m²', 'Ø 3,50 m'],
                ['Acima de 32,00 m²',        'Ø 4,50 m']
            ] } },
        { p: 'Verificação: a menor dimensão do compartimento (largura ou comprimento) deve ser igual ou maior que o diâmetro da faixa da sua área.' },
        { fonte: 'Código de Obras, Art. 113' },
        { linha: true },
        /* Art. 114: pé-direito mínimo (regra verificada: REGRAS.CO_PE_DIREITO) */
        { artigo: `Art. 114 – O pé-direito mínimo dos compartimentos será:
1 – de 2,50m (dois metros e cinqüenta centímetros) para os compartimentos de permanência prolongada;
2 – de 2,30m (dois metros e trinta centímetros) para os compartimentos de permanência transitória.
1º - Ressalvam-se exigências maiores fixadas para a destinação ou atividade neste Código .
2º - Os compartimentos especiais terão os respectivos pés-direitos fixados neste Código.` },
        { tabela: {
            larguras: [56, 44],
            colunas: ['PERMANÊNCIA', 'REGRA APLICADA'],
            regra: 'CO_PE_DIREITO',
            linhas: [['PERMANÊNCIA PROLONGADA'], ['PERMANÊNCIA TRANSITÓRIA'], ['ESPECIAIS']] } },
        { fonte: 'Código de Obras, Art. 114' },
        { linha: true },
        /* Art. 115: banheiros, lavabos e instalações sanitárias (verificados pela área, no lugar do Art. 113) */
        { artigo: `Art. 115 - Para banheiros, lavabos e instalações sanitárias das edificações, serão observadas as exigências seguintes:
1 – qualquer edificação que dispuser de compartimento para instalação sanitária, este terá área mínima de 2,00m2 (dois metros quadrados) e conterá, pelo menos, uma bacia sanitária, um lavatório e um dispositivo para banho;
2 – se a edificação dispuser de mais de um compartimento para instalações sanitárias, cada um terá a área mínima de 1,20m2 (um metro e vinte decímetros quadrados) e conterá, pelo menos, uma bacia sanitária e um lavatório, sendo que um deles deverá ser dotado de, no mínimo, um dispositivo para banho;
3 – nos compartimentos que contiverem instalações sanitárias agrupadas, as subdivisões, que formem as celas ou boxes, terão altura mínima de 1,80m (um metro e oitenta centímetros) e manterão uma distancia mínima de 0,40m (quarenta centímetros) do teto. As celas ou boxes terão área mínima de 0,65m2 (sessenta e cinco decímetros quadrados) e qualquer dimensão não será inferior a 0,70m (setenta centímetros). As passagens ou corredores internos não terão dimensão inferior a 0,80m (oitenta centímetros) ;
4 – os banheiros, lavabos e instalações sanitárias que tiverem comunicação direta com compartimentos ou espaços de uso comum ou coletivo, serão providos de anteparo que impeça devassamento de seu interior ou de antecâmara, cuja menor dimensão será igual ou maior do que 0,80m (oitenta centímetros);
5 – o percurso máximo de qualquer ponto da edificação até uma instalação sanitária não será superior a 100,00m (cem metros) e sempre protegido com cobertura.` },
        { tabela: {
            larguras: [56, 44],
            colunas: ['INSTALAÇÕES SANITÁRIAS', 'REGRA APLICADA'],
            regra: 'CO_BANHEIROS',
            linhas: [['ÚNICA NA EDIFICAÇÃO (item 1)'], ['MAIS DE UMA (item 2)']] } },
        { p: 'Verificação: a quantidade de instalações sanitárias é a dos compartimentos classificados como banheiro, lavabo ou instalação sanitária. Os itens 3 a 5 não são verificados automaticamente.' },
        { fonte: 'Código de Obras, Art. 115' }
    ],
    'info-aberturas': [
        /* Art. 124: aberturas para iluminação e ventilação (regra verificada: REGRAS.CO_ABERTURAS, da planilha) */
        { artigo: `Art. 124 – As aberturas para iluminação e ventilação dos compartimentos de permanência prolongada e dos de transitória deverão apresentar as seguintes condições mínimas:
1 – área correspondente a 1 / 7 (um sétimo) da área do compartimento se este for de permanência prolongada, e a 1 / 10 (um décimo) da área do compartimento, se for de permanência transitória ;
2 – em qualquer caso, não terão áreas inferiores a 0,70m2 (setenta decímetros quadrados) e 0,20m2 (vinte decímetros quadrados), para compartimentos de permanência, respectivamente, prolongada e transitória ;
3 – metade, no mínimo, da área exigida para abertura deverá permitir a ventilação.` },
        { tabela: {
            larguras: [40, 60],
            colunas: ['PERMANÊNCIA', 'REGRA APLICADA'],
            regra: 'CO_ABERTURAS',
            linhas: [['PERMANÊNCIA PROLONGADA'], ['PERMANÊNCIA TRANSITÓRIA']] } },
        { p: 'Verificação: a soma das áreas das aberturas (largura x altura) deve ser igual ou maior que a área exigida, e a soma das áreas ventiladas (informadas em m² ou em % de cada abertura) deve ser igual ou maior que a parte da área exigida que deve permitir ventilação (item 3).' },
        { fonte: 'Código de Obras, Art. 124' }
    ]
};

/* =========================================================
   MONTAGEM DAS JANELAS (não precisa alterar)
   ========================================================= */
// texto de artigo com quebras de linha -> parágrafos; a 1ª linha (caput) em negrito
const artigoEmParagrafos = texto => String(texto).split('\n').map(l => l.trim()).filter(Boolean)
    .map((l, k) => `<p>${k ? escHtml(l) : `<b>${escHtml(l)}</b>`}</p>`).join('');

function tabelaInformacao({ larguras = [], colunas, linhas, regra }) {
    const aplicada = regra ? REGRA_APLICADA[regra]() : [];              // coluna REGRA APLICADA (js/regras.js)
    return `<table class="co-info-tab">` +
        (larguras.length ? `<colgroup>${larguras.map(l => `<col style="width:${l}%">`).join('')}</colgroup>` : '') +
        `<tr>${colunas.map(c => `<th>${escHtml(c)}</th>`).join('')}</tr>` +
        linhas.map((l, i) => `<tr>${(regra ? [...l, aplicada[i] ?? '-'] : l).map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('') + '</table>';
}

function montarInformacao(blocos) {
    return blocos.map(b => b.p ? `<p>${b.p}</p>`
        : b.fonte ? `<p class="info-fonte">${escHtml(b.fonte)}</p>`
        : b.img ? `<img src="${b.img}" alt="${escHtml(b.alt || '')}" loading="lazy" class="info-img">`
        : b.artigo ? artigoEmParagrafos(b.artigo)
        : b.tabela ? tabelaInformacao(b.tabela)
        : b.linha ? '<hr class="my-2">'
        : '').join('');
}
function initInformacoes() {
    for (const [id, blocos] of Object.entries(INFORMACOES)) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = montarInformacao(blocos);
    }
}
