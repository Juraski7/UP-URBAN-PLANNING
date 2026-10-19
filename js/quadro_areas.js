/* UP! Urban Planning — quadro de áreas (aba Empreendimento)
   • TIPOLOGIAS de bloco / torre (o usuário acrescenta ou remove): nº de blocos, pavimentos (com o térreo),
     apartamentos por pavimento, AC/AO do térreo e AC do tipo. Subtotal por tipologia:
     BLOCOS x [(PAVIMENTOS - 1) x AC TIPO + AC TÉRREO]; AO = BLOCOS x AO TÉRREO.
   • LAZER: linha fixa LAZER (AC/AO) + linhas livres que computam AC/AO ou que não computam
     (padrão: DESCOBERTA, que não computa; o usuário edita e remove como as demais).
   • OUTRAS: linhas livres com AC e AO.
   Tudo entra na ÁREA TOTAL (menos o lazer que não computa). No projeto (.jsk) cada lista fica num campo oculto (JSON).
   Na impressão, linhas livres sem área não aparecem. */
'use strict';

const CAMPO_M2 = 'type="text" inputmode="decimal" data-mask="area"';            // áreas do quadro: "10.000,00 m²"

/* ---------------------------------------------------------------- TIPOLOGIAS */
const TP_CAMPOS = ['torres', 'pav', 'aptos', 'acTerreo', 'aoTerreo', 'acTipo'];
let tipologias = [];
const tipologiaVazia = () => Object.fromEntries(TP_CAMPOS.map(c => [c, '']));
const nTp = i => String(i + 1).padStart(2, '0');
const tpNum = (t, c) => parseBR(t[c]);
const TP_AREAS = ['acTerreo', 'aoTerreo', 'acTipo'];                       // em m² (máscara); os demais são inteiros
// ids da 1ª tipologia: destino das pendências (TO, CA, IE, UHs)
const idTp = (i, c) => `inp-tp${i + 1}-${c}`;

// ao redesenhar, o campo em foco é removido e o navegador dispara o blur (máscara): esse evento é de uma linha que não existe mais
let redesenhando = false;
function redesenhar(id, html) {
    redesenhando = true;
    try { $(id).innerHTML = html; } finally { redesenhando = false; }
}

function renderTipologias() {
    const inp = (i, c, extra = '') => `<input ${TP_AREAS.includes(c) ? CAMPO_M2 : 'type="number" min="0"'} id="${idTp(i, c)}" data-nao-salvar data-tp="${i}" data-campo="${c}" class="input-yellow ${extra}" value="${escHtml(tipologias[i][c])}">`;
    const param = (i, c, rot) => `<label class="tp-param"><span>${rot}</span>${inp(i, c, 'tp-num')}</label>`;
    redesenhar('qa-tipologias', tipologias.map((t, i) => `
        <tr class="bg-slate-100 font-bold tp-titulo"><td class="p-1.5 text-[#1B2E24]"><div class="flex items-center justify-between gap-1">TIPOLOGIA ${nTp(i)}
                ${tipologias.length > 1 ? `<button type="button" class="qa-remover no-print" data-remover-tp="${i}" title="Remover a tipologia ${nTp(i)}"><i class="fa-solid fa-trash-can"></i></button>` : ''}</div></td>
            <td colspan="2" class="p-1"><div class="tp-params">${param(i, 'torres', 'BLOCOS / TORRES')}${param(i, 'pav', 'PAVIMENTOS')}${param(i, 'aptos', 'APTOS / PAVIMENTO')}</div></td></tr>
        <tr><td class="p-2 pl-6">TÉRREO</td><td class="p-1">${inp(i, 'acTerreo')}</td><td class="p-1">${inp(i, 'aoTerreo')}</td></tr>
        <tr><td class="p-2 pl-6">TIPO</td><td class="p-1">${inp(i, 'acTipo')}</td><td class="p-2 text-center text-slate-400">-</td></tr>
        <tr class="font-bold"><td class="p-2">BLOCOS / TORRES (SUBTOTAL)</td>
            <td class="p-2 text-center text-slate-900" data-sub-ac="${i}">0,00 m²</td><td class="p-2 text-center text-slate-900" data-sub-ao="${i}">0,00 m²</td></tr>`).join(''));
    $('inp-tipologias').value = JSON.stringify(tipologias);
}

/* Subtotais (escreve na tabela) e somas de todas as tipologias. completas: todas com blocos, pavimentos e apartamentos */
function calcularTipologias() {
    let ac = 0, ao = 0, uhs = 0;
    const contas = [];
    tipologias.forEach((t, i) => {
        const blocos = parseInt(t.torres, 10) || 1, pav = parseInt(t.pav, 10) || 1;
        const sAc = blocos * (tpNum(t, 'acTerreo') + tpNum(t, 'acTipo') * (pav - 1)), sAo = blocos * tpNum(t, 'aoTerreo');
        const el = document.querySelector(`[data-sub-ac="${i}"]`);
        if (el) { el.textContent = fmt(sAc) + ' m²'; document.querySelector(`[data-sub-ao="${i}"]`).textContent = fmt(sAo) + ' m²'; }
        ac += sAc; ao += sAo;
        const [b, p, a] = ['torres', 'pav', 'aptos'].map(c => parseInt(t[c], 10) || 0);
        uhs += b * p * a;
        contas.push(`${tipologias.length > 1 ? `Tipologia ${nTp(i)}: ` : ''}${b} bloco(s) × ${p} pavimento(s) × ${a} apartamento(s)`);
    });
    const completas = tipologias.every(t => ['torres', 'pav', 'aptos'].every(c => String(t[c]).trim() !== ''));
    return { ac, ao, uhs, completas, conta: contas.join('; ') };
}

/* ---------------------------------------------------------------- LINHAS LIVRES (LAZER e OUTRAS) */
// cada linha: { nome, ac, ao } (computa AC/AO) ou { nome, valor } (não computa)
const NOME_DESCOBERTA = 'DESCOBERTA (NÃO COMPUTADA)';
const LIVRES = {
    outras: { corpo: 'qa-linhas', oculto: 'inp-quadro-linhas', titulo: 'qa-titulo', linhas: [],
              padrao: () => ['GUARITA / PORTARIA', 'VAGAS COBERTAS', 'OUTRAS ÁREAS'].map(nome => linhaVazia(nome)) },
    lazer:  { corpo: 'qa-lazer', oculto: 'inp-lazer-linhas', linhas: [], padrao: () => [linhaVazia(NOME_DESCOBERTA, false)] }
};
// linha de lazer lançada em OUTRAS (projetos antigos): vai para o grupo LAZER, onde entra na área de lazer
const ehLazer = l => ['LAZER', 'AREA DE LAZER', 'AREAS DE LAZER'].includes(chave(l.nome));
// projetos antigos (linhas fixas inp-ac-<k> / inp-ao-<k>); EDIFÍCIO GARAGEM só volta se tinha valor
const QUADRO_ANTIGO = [['guarita', 'GUARITA / PORTARIA'], ['vagas-cob', 'VAGAS COBERTAS'], ['ed-garagem', 'EDIFÍCIO GARAGEM'],
                       ['lazer', 'ÁREAS DE LAZER'], ['outros', 'OUTRAS ÁREAS']];

const numLinha = (l, c) => parseBR(l[c]);
const camposLinha = l => 'valor' in l ? ['valor'] : ['ac', 'ao'];
const linhaVazia = (nome, computa = true) => computa ? { nome, ac: '', ao: '' } : { nome, valor: '' };
const semArea = l => camposLinha(l).every(c => !numLinha(l, c));                    // vazia ou zero

/* Soma de um campo das linhas livres de um grupo (m²) */
const somaLivres = (grupo, campo) => LIVRES[grupo].linhas.reduce((s, l) => s + numLinha(l, campo), 0);

function renderLivres(g) {
    const rot = { ac: 'Área construída', ao: 'Área ocupada', valor: 'Área' };
    const celulas = (l, i) => 'valor' in l
        ? `<td colspan="2" class="p-1"><input ${CAMPO_M2} class="input-yellow qa-largo" data-campo="valor" value="${escHtml(l.valor)}" aria-label="Área da linha ${i + 1}"></td>`
        : ['ac', 'ao'].map(c => `<td class="p-1"><input ${CAMPO_M2} class="input-yellow" data-campo="${c}" value="${escHtml(l[c])}" aria-label="${rot[c]} da linha ${i + 1}"></td>`).join('');
    redesenhar(g.corpo, g.linhas.map((l, i) => `
        <tr data-i="${i}"><td class="p-1 pl-6"><div class="flex items-center gap-1">
                <input type="text" class="input-yellow qa-nome" data-campo="nome" value="${escHtml(l.nome)}" placeholder="DESCRIÇÃO DA ÁREA" aria-label="Descrição da linha ${i + 1}">
                <button type="button" class="qa-remover no-print" title="Remover esta linha"><i class="fa-solid fa-trash-can"></i></button></div></td>
            ${celulas(l, i)}</tr>`).join(''));
    guardarLivres(g);
}
function guardarLivres(g) {
    $(g.oculto).value = JSON.stringify(g.linhas);
    $(g.corpo).querySelectorAll('tr[data-i]').forEach(tr => tr.classList.toggle('qa-vazia', semArea(g.linhas[+tr.dataset.i])));
    if (g.titulo) $(g.titulo).classList.toggle('qa-vazia', g.linhas.every(semArea));
}
function acrescentarLivre(g, computa) {
    g.linhas.push(linhaVazia('', computa));
    renderLivres(g);
    $(g.corpo).querySelector('tr:last-child .qa-nome').focus();
    schedule();
}

/* ---------------------------------------------------------------- PROJETO (.jsk) */
const lerJson = v => { try { return JSON.parse(v); } catch (e) { return null; } };
// valores salvos -> texto; áreas de versões antigas (número puro) ganham a máscara m²
const comoTexto = (o, campos, areas) => Object.fromEntries(campos.map(c =>
    [c, areas.includes(c) ? aplicarMascara(numeroAntigo(o[c]), MASKS.area) : String(o[c] ?? '')]));

/* Projeto aberto: lê as listas salvas; projetos antigos (campos fixos) viram tipologia 01 / linhas livres com os mesmos valores */
function carregarQuadro(campos = {}) {
    const tps = lerJson(campos['inp-tipologias']);
    const antiga = { torres: campos['inp-torres'], pav: campos['inp-pavimentos'], aptos: campos['inp-aptos-pav'],
                     acTerreo: campos['inp-ac-terreo'], aoTerreo: campos['inp-ao-terreo'], acTipo: campos['inp-ac-tipo'] };
    tipologias = (Array.isArray(tps) && tps.length ? tps : [antiga]).map(t => comoTexto(t, TP_CAMPOS, TP_AREAS));
    renderTipologias();
    for (const g of Object.values(LIVRES)) {
        const linhas = lerJson(campos[g.oculto]);
        const padrao = g.padrao().map(l => l.nome);
        g.linhas = (Array.isArray(linhas) ? linhas
            : g === LIVRES.outras && 'inp-ac-guarita' in campos
                ? QUADRO_ANTIGO.map(([k, nome]) => ({ nome, ac: campos['inp-ac-' + k] ?? '', ao: campos['inp-ao-' + k] ?? '' }))
                               .filter(l => padrao.includes(l.nome) || !semArea(l))
                : g.padrao()).map(l => comoTexto(l, ['nome', ...camposLinha(l)], ['ac', 'ao', 'valor']));
    }
    // projetos antigos: a DESCOBERTA era um campo fixo (inp-lazer-nao-coberta) -> 1ª linha livre do lazer
    if ('inp-lazer-nao-coberta' in campos) {
        const desc = comoTexto({ nome: NOME_DESCOBERTA, valor: campos['inp-lazer-nao-coberta'] }, ['nome', 'valor'], ['valor']);
        if (Array.isArray(lerJson(campos['inp-lazer-linhas']))) LIVRES.lazer.linhas.unshift(desc);
        else LIVRES.lazer.linhas[0] = desc;                    // sem linhas salvas: substitui a DESCOBERTA vazia do padrão
    }
    const lazerEmOutras = LIVRES.outras.linhas.filter(ehLazer);
    LIVRES.outras.linhas = LIVRES.outras.linhas.filter(l => !ehLazer(l));
    LIVRES.lazer.linhas.push(...lazerEmOutras.filter(l => !semArea(l)));
    Object.values(LIVRES).forEach(renderLivres);
}

/* ---------------------------------------------------------------- EVENTOS */
function initQuadro() {
    const tp = $('qa-tipologias');
    const guardarTp = e => {
        const el = e.target;
        if (redesenhando || !el.dataset.tp) return;
        tipologias[+el.dataset.tp][el.dataset.campo] = el.value;
        $('inp-tipologias').value = JSON.stringify(tipologias);
        schedule();                                    // campos com máscara não passam pelo recálculo automático
    };
    ['input', 'change'].forEach(ev => tp.addEventListener(ev, guardarTp));        // change: texto final da máscara
    tp.addEventListener('click', e => {
        const b = e.target.closest('[data-remover-tp]');
        if (!b || !confirm(`Remover a TIPOLOGIA ${nTp(+b.dataset.removerTp)} do quadro de áreas?`)) return;
        tipologias.splice(+b.dataset.removerTp, 1);
        renderTipologias();
        schedule();
    });
    $('qa-tp-acrescentar').addEventListener('click', () => {
        tipologias.push(tipologiaVazia());
        renderTipologias();
        $(idTp(tipologias.length - 1, 'torres')).focus();
        schedule();
    });

    for (const g of Object.values(LIVRES)) {
        const corpo = $(g.corpo);
        const guardar = e => {
            const tr = e.target.closest('tr[data-i]');
            if (redesenhando || !tr || !e.target.dataset.campo) return;
            g.linhas[+tr.dataset.i][e.target.dataset.campo] = e.target.value;
            guardarLivres(g);
            schedule();                                // os campos de texto não passam pelo recálculo automático
        };
        ['input', 'change'].forEach(ev => corpo.addEventListener(ev, guardar));      // change: texto final da máscara
        corpo.addEventListener('click', e => {
            const tr = e.target.closest('.qa-remover') && e.target.closest('tr[data-i]');
            if (!tr) return;
            const l = g.linhas[+tr.dataset.i];
            if (!confirm(`Remover a linha "${l.nome || 'sem descrição'}" do quadro de áreas?`)) return;
            g.linhas.splice(+tr.dataset.i, 1);
            renderLivres(g);
            schedule();
        });
    }
    $('qa-acrescentar').addEventListener('click', () => acrescentarLivre(LIVRES.outras, true));
    $('qa-lazer-acrescentar').addEventListener('click', () => acrescentarLivre(LIVRES.lazer, true));
    $('qa-lazer-acrescentar-nc').addEventListener('click', () => acrescentarLivre(LIVRES.lazer, false));
    carregarQuadro();
}
