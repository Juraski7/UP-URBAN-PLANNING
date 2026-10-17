/* UP! Urban Planning — aba CATEGORIA DE USO: ajuda a identificar a categoria do empreendimento proposto
   Busca pela atividade (sem acento), filtra por grupo e por porte (área construída / UHs) e mostra,
   para cada categoria, se é permitida na zona do imóvel e a via mínima exigida.
   Base: js/dados/LOUOS_AIV_CAT_USO.js (CAT_USO_DESC, CAT_USO_NOTAS). "Usar" preenche CATEGORIA DE USO na aba Imóvel. */
'use strict';

let cuGrupo = '';
let CAT_USO_PRONTA = false;                // vira true após initCategoriaUso (calcularTudo roda antes)

/* Porte: sem valor informado não filtra; 'Acima de X' não inclui X */
function cabeNoPorte(item, area, uhs) {
    if (!item.un) return true;                                      // qualquer porte
    const v = item.un === 'uh' ? uhs : area;
    if (!(v > 0)) return true;
    if (item.min != null && (item.minExcl ? v <= item.min : v < item.min)) return false;
    return item.max == null || v <= item.max;
}

/* Destaca os termos buscados no texto, ignorando acentos e maiúsculas (posição a posição) */
function destacar(texto, termos) {
    if (!termos.length) return escHtml(texto);
    const chars = [...texto];
    const norm = chars.map(ch => (semAcento(ch).toUpperCase() || ch)[0]).join('');
    const marca = new Array(chars.length).fill(false);
    termos.forEach(t => {
        for (let i = norm.indexOf(t); i >= 0; i = norm.indexOf(t, i + 1)) marca.fill(true, i, i + t.length);
    });
    let out = '', aberto = false;
    chars.forEach((ch, i) => {
        if (marca[i] !== aberto) { out += marca[i] ? '<mark class="cu-marca">' : '</mark>'; aberto = marca[i]; }
        out += escHtml(ch);
    });
    return out + (aberto ? '</mark>' : '');
}

function renderCategoriasUso() {
    const termos = chave($('cu-busca').value).split(' ').filter(Boolean);
    const area = parseFloat($('cu-area').value) || 0;
    const uhs = parseInt($('cu-uhs').value, 10) || 0;
    const soZona = $('cu-so-zona').checked;
    const zu = zonaDoBairro($('inp-bairro').value);
    const usos = zu && usosDaZona(zu.zona);
    const via = parseBR($('inp-faixa-dominio').value);
    const ctx = { ac: area > 0 ? area : NaN, uhs: uhs > 0 ? uhs : NaN };
    const catSel = codigoCategoria($('inp-categoria-uso').value);

    const notasVistas = new Set();
    const linhas = CAT_USO_DESC.filter(it => {
        if (cuGrupo && it.cat[0] !== cuGrupo) return false;
        if (!cabeNoPorte(it, area, uhs)) return false;
        const alvo = chave(`${it.cat} ${GRUPOS_USO[it.cat[0]] || ''} ${it.desc}`);
        if (!termos.every(t => alvo.includes(t))) return false;
        return !soZona || (usos && (permissaoNaZona(usos, it.cat) || {}).permitida);
    }).map(it => {
        const perm = usos ? permissaoNaZona(usos, it.cat) : null;
        const zona = !perm ? '<span class="text-slate-400">-</span>'
            : !perm.permitida ? '<span class="cu-badge st-fail">✕ NÃO</span>'
            : perm.nota ? `<span class="cu-badge st-warn" title="Permitida com restrição: veja a nota ${perm.nota}">⚠ NOTA ${perm.nota}</span>`
            : '<span class="cu-badge st-ok">✓ SIM</span>';
        const sv = COMP_LOCACIONAL_DB[it.cat] ? situacaoVia(it.cat, via, ctx) : null;
        if (sv && sv.nota) notasVistas.add(sv.nota);
        const viaTxt = textoVia(sv, via);
        const sel = it.cat === catSel;
        return `<tr class="${sel ? 'cu-sel' : ''}">
            <td class="p-2 text-center font-extrabold text-[#1B2E24]">${it.cat}<div class="cu-grupo">${GRUPOS_USO[it.cat[0]] || ''}</div></td>
            <td class="p-2 cu-desc">${destacar(it.desc, termos)}</td>
            <td class="p-2 text-center">${escHtml(it.porte)}</td>
            <td class="p-2 text-center">${zona}</td>
            <td class="p-2 text-center font-semibold">${viaTxt}</td>
            <td class="p-1.5 text-center no-print">${sel ? '<span class="cu-usada">✓ em uso</span>'
                : `<button type="button" class="cu-usar" data-usar-cat="${it.cat}" title="Definir ${rotuloCategoria(it.cat)} como CATEGORIA DE USO">Usar</button>`}</td>
        </tr>`;
    });

    html('cu-lista', linhas.length ? linhas.join('')
        : '<tr><td colspan="6" class="p-4 text-center text-slate-500 italic">Nenhuma categoria encontrada com esses filtros.</td></tr>');
    txt('cu-resumo', `${linhas.length} de ${CAT_USO_DESC.length} linhas da tabela`);
    html('cu-notas', notasVistas.size ? '<p class="font-bold text-slate-700">EXCEÇÕES DA VIA MÍNIMA (LOUOS, Anexo V):</p>'
        + [...notasVistas].sort().map(n => `<p>(${n}) ${escHtml(textoNota(n))}</p>`).join('') : '');
    $('cu-notas').classList.toggle('hidden', !notasVistas.size);
    txt('cu-contexto', (zu ? `Zona do imóvel: ${zu.zona}` : 'Informe o BAIRRO (aba Imóvel) para ver a permissão na zona')
        + (via > 0 ? ` • via informada: ${fmt(via)} m` : ''));
}

const textoNota = n => (typeof CAT_USO_NOTAS !== 'undefined' && CAT_USO_NOTAS[n]) || COMP_LOCACIONAL_NOTAS[n] || '';

/* Via mínima da categoria com as exceções (notas 1 a 5) aplicadas ao porte informado:
   exceção aplicada -> valor reduzido (base riscada); porte não informado -> base + valor reduzido condicional */
function textoVia(sv, via) {
    if (!sv) return '<span class="text-slate-400">-</span>';
    const icone = via > 0 && sv.exig > 0 ? ` <span class="cu-via-${sv.s}" title="via informada: ${fmt(via)} m">${ICON[sv.s === 'cond' ? 'warn' : sv.s]}</span>` : '';
    const nota = n => `<span class="cu-nota" title="${escHtml(textoNota(n))}">nota (${n})</span>`;
    const metros = v => v === 0 ? 'DISPENSADA' : fmt(v) + ' m';
    if (sv.base === 0) return 'SEM EXIGÊNCIA';
    if (!sv.nota) return metros(sv.base) + icone;
    const r = REDUCOES_VIA[sv.nota];
    if (sv.reduziu) return `${metros(sv.exig)}${icone}<div class="cu-exc"><s>${fmt(sv.base)} m</s> • ${nota(sv.nota)}</div>`;
    if (sv.aplica === false) return `${metros(sv.base)}${icone}<div class="cu-exc">${nota(sv.nota)} não se aplica</div>`;
    return `${metros(sv.base)}${icone}<div class="cu-exc">${metros(sv.reduzida)} se ${r.quando} • ${nota(sv.nota)}</div>`;
}

function usarCategoria(cat) {
    $('inp-categoria-uso').value = rotuloCategoria(cat);
    validarCombo('inp-categoria-uso');
    schedule();
    aviso('CATEGORIA DE USO definida: ' + rotuloCategoria(cat));
}

function initCategoriaUso() {
    const sec = $('tab-categoria');
    sec.addEventListener('input', e => { if (e.target.id && e.target.id.startsWith('cu-')) renderCategoriasUso(); });
    sec.addEventListener('change', e => { if (e.target.id === 'cu-so-zona') renderCategoriasUso(); });
    sec.addEventListener('click', e => {
        const chip = e.target.closest('[data-cu-grupo]');
        if (chip) {
            cuGrupo = chip.dataset.cuGrupo;
            sec.querySelectorAll('[data-cu-grupo]').forEach(c => c.classList.toggle('ativo', c === chip));
            return renderCategoriasUso();
        }
        const usar = e.target.closest('[data-usar-cat]');
        if (usar) return usarCategoria(usar.dataset.usarCat);
        if (e.target.closest('#cu-dados-projeto')) {
            const ac = parseBR($('calc-ac-total').textContent);
            $('cu-area').value = ac > 0 ? ac.toFixed(2) : '';
            $('cu-uhs').value = $('inp-uhs').value;
            return renderCategoriasUso();
        }
        if (e.target.closest('#cu-limpar')) {
            ['cu-busca', 'cu-area', 'cu-uhs'].forEach(id => { $(id).value = ''; });
            $('cu-so-zona').checked = false;
            sec.querySelector('[data-cu-grupo=""]').click();
        }
    });
    CAT_USO_PRONTA = true;
    renderCategoriasUso();
}
