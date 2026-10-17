/* UP! Urban Planning — aba VAGAS: referência do número mínimo de vagas de estacionamento por atividade (LOUOS, Anexo VI)
   Mesma lógica da aba CATEGORIA DE USO: busca pela atividade (sem acento) e apresenta a regra; não calcula.
   Base: js/dados/LOUOS_AVI_VAGAS.js (VAGAS_DB, VAGAS_NOTAS). */
'use strict';

let VAGAS_PRONTA = false;

function renderVagas() {
    const termos = chave($('vg-busca').value).split(' ').filter(Boolean);
    const nota = n => n ? ` <span class="cu-nota" title="${escHtml(VAGAS_NOTAS[n] || '')}">(${n})</span>` : '';
    const exigivel = sim => sim ? 'EXIGÍVEL' + nota(1) : '<span class="text-slate-400">-</span>';
    const linhas = VAGAS_DB.filter(it => {
        const alvo = chave(`${it.atividade} ${it.regras.map(r => r.texto).join(' ')}`);
        return termos.every(t => alvo.includes(t));
    }).map(it => {
        const vagas = `${it.vagas} (${it.vagas === 1 ? 'uma' : it.vagas === 10 ? 'dez' : it.vagas}) ${it.vagas === 1 ? 'vaga' : 'vagas'}`;
        const parametros = it.regras.map(r => escHtml(r.texto) + nota(r.nota)).join('<span class="vg-ou">OU</span>');
        return `<tr>
            <td class="p-2 font-bold text-[#1B2E24]">${destacar(it.atividade, termos)}${it.regras.length > 1 ? '<span class="vg-maior">atender ao maior número de vagas entre os parâmetros</span>' : ''}</td>
            <td class="p-2 font-extrabold">${vagas}</td>
            <td class="p-2">${parametros}</td>
            <td class="p-2 font-semibold">${exigivel(it.carga)}</td>
            <td class="p-2 font-semibold">${exigivel(it.embarque)}</td>
        </tr>`;
    });
    html('vg-lista', linhas.length ? linhas.join('')
        : '<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Nenhuma atividade encontrada.</td></tr>');
    txt('vg-resumo', `${linhas.length} de ${VAGAS_DB.length} atividades`);
    html('vg-notas', '<p class="font-bold text-slate-700">NOTAS (LOUOS, ANEXO VI):</p>' +
        Object.entries(VAGAS_NOTAS).map(([n, t]) => `<p>(${n}) ${escHtml(t)}.</p>`).join(''));
}

/* Prancha TIPOS DE VAGA: clique numa figura para ver ampliada (setas / teclado navegam; Esc, X ou clique fora fecham) */
function initAmpliarVagas() {
    const figs = [...document.querySelectorAll('.vg-prancha img')];
    const dlg = document.createElement('dialog');
    dlg.className = 'vg-zoom no-print';
    dlg.innerHTML = `<figure><img alt=""><figcaption></figcaption></figure>
        <button type="button" class="vg-zoom-btn vg-zoom-fechar" title="Fechar (Esc)"><i class="fa-solid fa-xmark"></i></button>
        <button type="button" class="vg-zoom-btn vg-zoom-ant" title="Anterior (←)"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="vg-zoom-btn vg-zoom-prox" title="Próxima (→)"><i class="fa-solid fa-chevron-right"></i></button>`;
    document.body.appendChild(dlg);
    let atual = 0;
    const mostrar = i => {
        atual = (i + figs.length) % figs.length;
        const img = dlg.querySelector('img');
        img.src = figs[atual].src;
        img.alt = figs[atual].alt;
        dlg.querySelector('figcaption').textContent = `${figs[atual].alt}  (${atual + 1} de ${figs.length})`;
    };
    figs.forEach((img, i) => {
        img.title = 'Clique para ampliar';
        img.addEventListener('click', () => { mostrar(i); dlg.showModal(); });
    });
    dlg.querySelector('.vg-zoom-fechar').addEventListener('click', () => dlg.close());
    dlg.querySelector('.vg-zoom-ant').addEventListener('click', () => mostrar(atual - 1));
    dlg.querySelector('.vg-zoom-prox').addEventListener('click', () => mostrar(atual + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });          // clique fora da figura
    dlg.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') mostrar(atual - 1);
        else if (e.key === 'ArrowRight') mostrar(atual + 1);
    });
}

function initVagas() {
    initAmpliarVagas();
    $('vg-busca').addEventListener('input', renderVagas);
    $('vg-limpar').addEventListener('click', () => { $('vg-busca').value = ''; renderVagas(); });
    VAGAS_PRONTA = true;
    renderVagas();
}
