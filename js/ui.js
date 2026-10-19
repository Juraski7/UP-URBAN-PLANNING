/* UP! Urban Planning — interface: selects, campos com busca, abas e navegação */
'use strict';

/* =========================================================
   SELECTS CUSTOMIZADOS (gerados por dados; começam vazios)
   ========================================================= */
const SELECTS = {
    'inp-fachada-ativa': [['SIM', 'SIM'], ['NAO', 'NÃO']],
    'inp-aplicar-oodc': [['NAO', 'NÃO'], ['SIM', 'SIM']],
    'inp-lazer-privativa': [['NAO', 'NÃO'], ['SIM', 'SIM']],
    'inp-matricula-cri': [['1', '1º CRI'], ['2', '2º CRI'], ['3', '3º CRI']]
};
// Texto exibido no botão: opção vazia não mostra nada (o CSS exibe "SELECIONE")
const rotuloOpcao = (valor, texto) => valor ? texto : '';

function buildSelects() {
    document.querySelectorAll('[data-select]').forEach(host => {
        const id = host.dataset.select;
        const opts = [['', '-'], ...SELECTS[id]];
        const def = host.dataset.default || '';
        const defLabel = rotuloOpcao(def, (opts.find(o => o[0] === def) || opts[0])[1]);

        host.className = 'custom-select-container relative w-full';
        host.innerHTML = `
            <button type="button" class="input-yellow flex items-center justify-center relative cursor-pointer font-bold select-none py-1 px-3" aria-haspopup="listbox">
                <span class="custom-select-label truncate text-center w-full">${defLabel}</span>
                <i class="fa-solid fa-chevron-down text-[10px] absolute right-2 text-slate-700 pointer-events-none"></i>
            </button>
            <div class="custom-select-dropdown hidden absolute left-0 right-0 top-full mt-1 bg-white border-2 border-amber-500 rounded-md shadow-2xl z-50 overflow-hidden text-xs divide-y divide-slate-100" role="listbox">
                ${opts.map(([v, l]) => `<div role="option" data-value="${v}" class="p-2 text-center font-bold text-slate-800 hover:bg-yellow-100 cursor-pointer transition">${l}</div>`).join('')}
            </div>
            <select id="${id}" class="hidden">${opts.map(([v, l]) => `<option value="${v}"${v === def ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    });
}

document.addEventListener('click', e => {
    const t = e.target;

    // Abre/fecha select customizado
    const btn = t.closest('.custom-select-container > button');
    if (btn) {
        const dd = btn.parentElement.querySelector('.custom-select-dropdown');
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d !== dd && d.classList.add('hidden'));
        dd.classList.toggle('hidden');
        if (!dd.classList.contains('hidden')) posicionarLista(btn, dd);
        return;
    }
    // Escolhe opção
    const opt = t.closest('.custom-select-dropdown [data-value]');
    if (opt) {
        const box = opt.closest('.custom-select-container');
        const sel = box.querySelector('select');
        sel.value = opt.dataset.value;
        box.querySelector('.custom-select-label').textContent = rotuloOpcao(opt.dataset.value, opt.textContent);
        box.querySelector('.custom-select-dropdown').classList.add('hidden');
        schedule();
        return;
    }
    // Clique fora: fecha selects
    document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.add('hidden'));

    // Botão "i" (informação): abre/fecha a janelinha com o texto; clique fora fecha
    const info = t.closest('.info-btn');
    if (info) { alternarInfo(info); return; }
    if (!t.closest('.info-pop')) fecharInfos();

    // Menu de pendências
    const menu = $('dropdown-pendencias');
    if (t.closest('#btn-pendencias')) menu.classList.toggle('hidden');
    else if (!menu.contains(t)) menu.classList.add('hidden');

    // Navegação para pendência
    const pend = t.closest('[data-goto]');
    if (pend) irParaPendencia(pend.dataset.goto, pend.dataset.input);

    // Abas
    const tab = t.closest('[data-tab]');
    if (tab) openTab(tab.dataset.tab);

    // Chips de navegação por seções
    const chip = t.closest('[data-chip]');
    if (chip) scrollCentro($(chip.dataset.chip));
});

function scrollCentro(el) {
    if (!el) return;
    const hdr = $('app-header').offsetHeight;
    const nav = $('nav-chips');
    const navH = nav && nav.offsetParent !== null ? nav.offsetHeight : 0;
    const topVis = hdr + navH;                       // área coberta pelos elementos fixos
    const altVis = window.innerHeight - topVis;
    const r = el.getBoundingClientRect();
    const alvo = r.height >= altVis - 16
        ? topVis + 8                                  // elemento maior que a tela: alinha ao topo
        : topVis + (altVis - r.height) / 2;           // senão: centraliza na área visível
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - alvo), behavior: 'smooth' });
}

function irParaPendencia(rowId, inputId) {
    $('dropdown-pendencias').classList.add('hidden');
    const target = $(inputId) || $(rowId);
    if (!target) return;
    openTab(target.closest('.tab-content').id);
    requestAnimationFrame(() => scrollCentro(target));
    target.classList.add('row-highlight');
    if (target.tagName === 'INPUT') target.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove('row-highlight'), 2500);
}

/* =========================================================
   ABAS
   ========================================================= */
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('hidden', el.id !== tabId));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.classList.toggle('border-[#2E7D32]', active);
        btn.classList.toggle('text-[#2E7D32]', active);
        btn.classList.toggle('font-bold', active);
        btn.classList.toggle('border-transparent', !active);
        btn.classList.toggle('text-slate-500', !active);
        btn.classList.toggle('font-medium', !active);
    });
    if (tabId === 'tab-basico' && map) setTimeout(() => map.invalidateSize(), 50);
    if (tabId === 'tab-categoria' && CAT_USO_PRONTA) renderCategoriasUso();     // a tabela não é remontada com a aba fechada (calculo.js)
}

/* ---------- Navegação por seções ---------- */
const setHdr = () => document.documentElement.style.setProperty('--hdr', $('app-header').offsetHeight + 'px');
setHdr();
window.addEventListener('resize', setHdr);

/* =========================================================
   CAMPOS COM BUSCA (digitação com filtro; ignora acentos e maiúsculas)
   ========================================================= */
const COMBOS = {
    'inp-bairro': {
        itens: () => BAIRROS, canon: bairroCanonico,
        vazio: 'Nenhum bairro encontrado', invalido: 'Bairro não encontrado na lista de bairros de Campo Grande'
    },
    'inp-categoria-uso': {
        itens: () => CATEGORIAS, canon: categoriaCanonica,
        vazio: 'Nenhuma categoria encontrada', invalido: 'Categoria não encontrada na tabela de compatibilidade locacional (R1 a E21)'
    }
};

// Ajusta o texto para o nome oficial da lista; marca em vermelho se não existir
function validarCombo(id) {
    const inp = $(id), cfg = COMBOS[id];
    const canon = inp.value.trim() ? cfg.canon(inp.value) : '';
    if (canon) inp.value = canon;
    inp.classList.toggle('input-invalid', canon === null);
    inp.title = canon === null ? cfg.invalido : '';
}
const validarCombos = () => Object.keys(COMBOS).forEach(validarCombo);

function initCombo(id) {
    const inp = $(id), lista = $(inp.getAttribute('aria-controls')), cfg = COMBOS[id];
    let itens = [], ativo = -1;

    // lista em position: fixed para não ser cortada pela rolagem horizontal da tabela
    const posicionar = () => {
        const r = inp.getBoundingClientRect();
        Object.assign(lista.style, { left: r.left + 'px', top: r.bottom + 4 + 'px', width: r.width + 'px' });
    };
    const aberta = () => !lista.classList.contains('hidden');
    const fechar = () => { lista.classList.add('hidden'); inp.setAttribute('aria-expanded', 'false'); ativo = -1; };
    const marcar = i => {
        ativo = i;
        [...lista.children].forEach((li, k) => li.classList.toggle('ac-ativo', k === i));
        if (lista.children[i]) lista.children[i].scrollIntoView({ block: 'nearest' });
    };
    const abrir = () => {
        const q = chave(inp.value), todos = cfg.itens();
        // contém o texto; os que começam com ele vêm primeiro
        itens = q ? todos.filter(n => chave(n).includes(q)).sort((a, b) => chave(b).startsWith(q) - chave(a).startsWith(q)) : todos;
        lista.innerHTML = itens.length
            ? itens.map((n, i) => `<li role="option" data-i="${i}" class="ac-item">${n}</li>`).join('')
            : `<li class="ac-vazio">${cfg.vazio}</li>`;
        posicionar();
        lista.classList.remove('hidden');
        inp.setAttribute('aria-expanded', 'true');
        marcar(q && itens.length ? 0 : -1);
    };
    const escolher = nome => { inp.value = nome; fechar(); validarCombo(id); schedule(); };

    inp.addEventListener('input', abrir);
    inp.addEventListener('focus', () => { inp.select(); abrir(); });
    inp.addEventListener('click', () => { if (!aberta()) abrir(); });
    inp.addEventListener('blur', () => { fechar(); validarCombo(id); schedule(); });
    inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberta()) abrir(); else marcar(Math.min(ativo + 1, itens.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(Math.max(ativo - 1, 0)); }
        else if (e.key === 'Enter' && aberta() && ativo >= 0) { e.preventDefault(); escolher(itens[ativo]); }
        else if (e.key === 'Tab' && aberta() && ativo >= 0) escolher(itens[ativo]);
        else if (e.key === 'Escape') fechar();
    });
    // mousedown + preventDefault: escolhe sem tirar o foco do campo antes
    lista.addEventListener('mousedown', e => {
        e.preventDefault();
        const li = e.target.closest('[data-i]');
        if (li) escolher(itens[+li.dataset.i]);
    });
    window.addEventListener('scroll', () => { if (aberta()) posicionar(); }, true);
    window.addEventListener('resize', () => { if (aberta()) posicionar(); });
}
const initCombos = () => Object.keys(COMBOS).forEach(initCombo);

/* O scroll do mouse não altera o valor dos campos numéricos: o campo sai de foco e a página rola normalmente */
document.addEventListener('wheel', e => {
    if (e.target.matches('input[type=number]') && e.target === document.activeElement) e.target.blur();
}, { passive: true });

/* Lista do select em posição fixa na tela: não é cortada por tabelas com rolagem (overflow); abre para cima se faltar espaço */
function posicionarLista(btn, dd) {
    const r = btn.getBoundingClientRect();
    Object.assign(dd.style, { position: 'fixed', left: r.left + 'px', width: r.width + 'px', right: 'auto', marginTop: '0' });
    const alto = dd.offsetHeight, embaixo = innerHeight - r.bottom - 8 >= alto;
    dd.style.top = (embaixo ? r.bottom + 4 : Math.max(8, r.top - alto - 4)) + 'px';
}

/* Janelinha de informação (botão "i"): posição fixa junto ao botão (não é cortada pela tabela), sempre dentro da tela.
   Ao rolar a página ela acompanha o botão; fecha só ao clicar fora, no próprio "i" ou com Esc. Texto maior que a tela rola por dentro. */
let infoAberta = null;                                       // { pop, btn }
const fecharInfos = () => {
    document.querySelectorAll('.info-pop:not(.hidden)').forEach(p => p.classList.add('hidden'));
    infoAberta = null;
};
function posicionarInfo() {
    if (!infoAberta) return;
    const { pop, btn } = infoAberta, r = btn.getBoundingClientRect();
    const tela = document.documentElement, vw = tela.clientWidth, vh = tela.clientHeight;   // área visível (sem as barras de rolagem)
    pop.style.maxHeight = (vh - 16) + 'px';                                              // maior que a tela: rola por dentro
    const largura = pop.offsetWidth, alto = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(r.left, vw - largura - 8)) + 'px';
    const abaixo = vh - r.bottom - 8, acima = r.top - 8;
    const top = abaixo >= alto || abaixo >= acima ? r.bottom + 6 : r.top - alto - 6;       // embaixo do botão; sem espaço, em cima
    pop.style.top = Math.max(8, Math.min(top, vh - alto - 8)) + 'px';                       // nunca sai da tela
    const sobra = pop.getBoundingClientRect().bottom - (vh - 8);                         // conferência pela posição real
    if (sobra > 0) pop.style.top = Math.max(8, parseFloat(pop.style.top) - sobra) + 'px';
}
function alternarInfo(btn) {
    const pop = $(btn.dataset.info), abrir = pop.classList.contains('hidden');
    fecharInfos();
    if (!abrir) return;
    pop.classList.remove('hidden');
    pop.scrollTop = 0;
    infoAberta = { pop, btn };
    posicionarInfo();
    const img = pop.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', posicionarInfo, { once: true });      // figura carrega só ao abrir
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharInfos(); });
window.addEventListener('scroll', () => {
    posicionarInfo();                                        // a janela de informação acompanha o botão
    document.querySelectorAll('.custom-select-dropdown:not(.hidden)').forEach(d => d.classList.add('hidden'));    // listas de seleção fecham
}, { passive: true });
window.addEventListener('resize', posicionarInfo);

/* Enter conclui o preenchimento do campo (sai do campo: aplica máscara, valida e recalcula).
   Nos campos com busca, o handler do próprio campo roda antes e escolhe a sugestão marcada. */
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing && e.target.matches('input.input-yellow')) {
        e.preventDefault();
        e.target.blur();
    }
});
