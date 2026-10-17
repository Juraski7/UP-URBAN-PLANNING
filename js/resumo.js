/* UP! Urban Planning — resumo da análise: cartões (KPIs), parecer, pendências e chips de navegação */
'use strict';

/* Cartões: { l: rótulo, v: valor, m: limite, p: % da barra, s: estado } */
function renderKpis(cards) {
    html('resumo-kpis', cards.map(c => {
        const na = c.s === 'na';
        return `
        <div class="kpi kpi-${c.s}">
            <div class="kpi-top"><span>${c.l}</span><span class="kpi-ic">${ICON[c.s]}</span></div>
            <div class="kpi-val">${na ? '-' : c.v}</div>
            <div class="kpi-lim">${c.m}</div>
            <div class="kpi-bar"><i style="width:${na ? 0 : c.p}%"></i></div>
        </div>`;
    }).join(''));
}

/* Itens: { id: bloco, inp: campo para focar, s: estado, nome, rot?: rótulo do aviso } */
let lastPendKey = '';
function atualizarPendencias(itens) {
    const pend = itens.filter(i => i.s === 'fail' || i.s === 'warn');
    const semDados = itens.filter(i => i.s === 'na');
    txt('badge-pendencias-count', String(pend.length));

    const key = itens.map(p => p.id + p.nome + p.s).join('|');
    if (key === lastPendKey) return;          // evita re-render desnecessário
    lastPendKey = key;

    const fails = pend.filter(p => p.s === 'fail'), warns = pend.filter(p => p.s === 'warn');
    const rotulo = p => p.s === 'warn' ? (p.rot || (p.nome.includes('OODC') ? 'REQUER OODC' : 'COMPENSAR')) : 'REPROVADO';
    const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;

    // menu do cabeçalho (somente não conformidades)
    $('list-pendencias-items').innerHTML = pend.length === 0
        ? (semDados.length
            ? `<div class="p-4 text-center text-slate-600 font-semibold bg-slate-50"><i class="fa-solid fa-circle-info text-lg mb-1 block"></i>Nenhuma não conformidade até agora.<br>${pl(semDados.length, 'item ainda sem dados', 'itens ainda sem dados')}.</div>`
            : `<div class="p-4 text-center text-emerald-700 font-semibold bg-emerald-50"><i class="fa-solid fa-circle-check text-lg mb-1 block"></i>Nenhuma pendência encontrada!</div>`)
        : pend.map(p => `
            <button type="button" data-goto="${p.id}" data-input="${p.inp}" class="w-full grid grid-cols-2 items-center p-2.5 hover:bg-slate-50 transition text-center group">
                <span class="font-bold text-slate-800 group-hover:text-[#8D4222] px-1">${p.nome}</span>
                <div class="flex justify-center items-center"><span class="status-badge-fixed st-${p.s}" style="font-size:10px">${ICON[p.s]} ${rotulo(p)}</span></div>
            </button>`).join('');

    // faixa de parecer
    const st = fails.length ? 'fail' : semDados.length ? 'na' : warns.length ? 'warn' : 'ok';
    $('resumo-banner').className = 'banner banner-' + st;
    $('resumo-banner-ic').textContent = ICON[st] || 'i';
    let titulo;
    if (st === 'fail') {
        titulo = `PROJETO COM ${fails.length === 1 ? 'PENDÊNCIA' : 'PENDÊNCIAS'} (${fails.length} ${fails.length === 1 ? 'ITEM NÃO CONFORME' : 'ITENS NÃO CONFORMES'}`
            + (warns.length ? ` E ${pl(warns.length, 'CONDICIONANTE', 'CONDICIONANTES')}` : '') + ')';
    } else if (st === 'na') {
        titulo = `ANÁLISE INCOMPLETA (${pl(semDados.length, 'ITEM SEM DADOS', 'ITENS SEM DADOS')}`
            + (warns.length ? ` E ${pl(warns.length, 'CONDICIONANTE', 'CONDICIONANTES')}` : '') + ')';
    } else if (st === 'warn') {
        titulo = `APROVADO COM ${warns.length === 1 ? 'CONDICIONANTE' : 'CONDICIONANTES'} (${pl(warns.length, 'CONDICIONANTE', 'CONDICIONANTES')})`;
    } else {
        titulo = 'PROJETO CONFORME (TODOS OS PARÂMETROS ATENDEM À LC 341/2018)';
    }
    $('resumo-banner-title').textContent = titulo;
    $('resumo-banner-sub').textContent = fails.length && semDados.length
        ? `Ainda ${semDados.length === 1 ? 'falta 1 item' : `faltam ${semDados.length} itens`} sem dados para avaliar.` : '';
    $('resumo-pend').innerHTML = pend.concat(semDados).map(p =>
        `<button type="button" data-goto="${p.id}" data-input="${p.inp}" title="Ir até o item" class="pend-chip st-${p.s}">${(ICON[p.s] + ' ' + p.nome).trim()}</button>`).join('');

    // chips de navegação
    document.querySelectorAll('[data-chip]').forEach(c => {
        c.dataset.s = pior(itens.filter(p => p.id === c.dataset.chip).map(p => p.s));
    });
}
