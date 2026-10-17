/* UP! Urban Planning — utilitários: DOM, números, máscaras, selos de status e consultas às bases */
'use strict';

/* =========================================================
   DOM
   ========================================================= */
const cache = new Map();
const $ = id => { let el = cache.get(id); if (!el) { el = document.getElementById(id); cache.set(id, el); } return el; };
const num = id => parseFloat($(id).value) || 0;
const int = id => parseInt($(id).value, 10) || 0;
const vazio = id => $(id).value.trim() === '';
const algumVazio = (...ids) => ids.some(vazio);
const todosVazios = (...ids) => ids.every(vazio);

let ready = false;                       // após a carga inicial, valores alterados piscam (classe .flash)
const txt = (id, v) => {
    const el = $(id);
    if (!el || el.textContent === v) return;
    el.textContent = v;
    if (ready) { el.classList.add('flash'); el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true }); }
};
// troca o HTML só quando muda (evita redesenho desnecessário)
const html = (id, v) => { const el = $(id); if (el.innerHTML !== v) el.innerHTML = v; };

/* Observação abaixo de um quadro: estado 'ok' (verde), 'fail' (vermelho) ou null (oculta) */
function setObs(id, estado, texto) {
    const el = $(id);
    el.textContent = estado ? texto : '';
    el.className = estado ? 'obs-msg obs-' + estado : 'hidden';
}

/* =========================================================
   NÚMEROS E MÁSCARAS
   ========================================================= */
const nf = {};
const fmt = (v, d = 2) => (nf[d] ??= new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })).format(Number.isFinite(v) ? v : 0);
const fmtMoeda = v => 'R$ ' + fmt(v);
const safeDiv = (a, d) => d > 0 ? a / d : 0;

// Escapa texto para HTML/XML
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Número digitado: "1.234,56" / "1234.56" / "1234,56" / "25,3 m" (vírgula ou ponto decimal)
function numeroBR(t) {
    t = String(t).trim().replace(/\s*m$/i, '');
    if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
    else if (t.includes(',')) t = t.replace(',', '.');
    return parseFloat(t);
}

// Converte texto BR de campo com máscara ("1.234,56 m²") em número (ponto = milhar)
function parseBR(raw) {
    const s = String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
}

/* Máscaras dos campos de texto numéricos (campo vazio continua vazio) */
const MASKS = {
    area:  v => fmt(v) + ' m²',
    iptu:  v => 'R$ ' + fmt(v),
    metro: v => fmt(v) + ' m',
    moeda: fmtMoeda
};
const aplicarMascara = (v, mascara) => String(v).trim() === '' ? '' : mascara(parseBR(v));
// número puro salvo por versões antigas ("366.61": ponto decimal) -> texto BR ("366,61"), antes de aplicar a máscara
const numeroAntigo = v => /^-?\d+(\.\d+)?$/.test(String(v ?? '').trim()) ? fmt(parseFloat(v)) : String(v ?? '');
// por delegação: vale também para campos criados depois (linhas do quadro de áreas). Ao entrar mostra o número; ao sair, a máscara
const campoMascara = e => e.target.matches && e.target.matches('input[data-mask]') ? e.target : null;
document.addEventListener('focusin', e => {
    const el = campoMascara(e);
    if (!el) return;
    el.value = el.value.trim() === '' ? '' : String(parseBR(el.value)).replace('.', ',');
    el.select();
});
document.addEventListener('focusout', e => {
    const el = campoMascara(e);
    if (!el) return;
    el.value = aplicarMascara(el.value, MASKS[el.dataset.mask]);
    el.dispatchEvent(new Event('change', { bubbles: true }));       // quem guarda o valor (quadro de áreas) recebe o texto final
    schedule();
});

/* Inscrição imobiliária: 00.00.000.000-0 */
const fmtInscricao = s => {
    const d = String(s).replace(/\D/g, '').slice(0, 11);
    return d.slice(0, 2) + (d.length > 2 ? '.' + d.slice(2, 4) : '') + (d.length > 4 ? '.' + d.slice(4, 7) : '')
         + (d.length > 7 ? '.' + d.slice(7, 10) : '') + (d.length > 10 ? '-' + d.slice(10, 11) : '');
};
document.querySelectorAll('input[data-fmt="inscricao"]').forEach(el => el.addEventListener('input', () => {
    const antes = el.value.slice(0, el.selectionStart).replace(/\D/g, '').length;   // dígitos antes do cursor
    el.value = fmtInscricao(el.value);
    let pos = 0, cont = 0;
    while (pos < el.value.length && cont < antes) if (/\d/.test(el.value[pos++])) cont++;
    el.setSelectionRange(pos, pos);
}));
function reaplicarMascaras() {
    document.querySelectorAll('input[data-mask]').forEach(el => { el.value = aplicarMascara(el.value, MASKS[el.dataset.mask]); });
    document.querySelectorAll('input[data-fmt="inscricao"]').forEach(el => { el.value = fmtInscricao(el.value); });
}

/* =========================================================
   SELOS DE STATUS: 'ok' | 'fail' | 'warn' | 'na' (sem dados suficientes para avaliar)
   ========================================================= */
const ICON = { ok: '✓', fail: '✕', warn: '⚠', na: '' };
const BADGE = { ok: ['APROVADO', 'st-ok'], fail: ['REPROVADO', 'st-fail'], warn: ['', 'st-warn'], na: ['SEM DADOS', 'st-na'] };
function setStatus(id, state, label) {
    const el = $(id);
    if (!el) return state;
    const [t, c] = BADGE[state];
    const text = `${ICON[state]} ${label || t}`.trim();
    if (el.textContent !== text) el.textContent = text;
    el.className = `status-badge-fixed ${c}`;
    return state;
}
// Estado de uma verificação: 'na' quando faltam dados, senão 'ok' / 'fail'
const est = (ok, faltaDado) => faltaDado ? 'na' : ok ? 'ok' : 'fail';
// Estado de um grupo: o pior entre os itens
const pior = estados => ['fail', 'warn', 'na'].find(s => estados.includes(s)) || 'ok';

/* =========================================================
   CONSULTAS ÀS BASES (js/dados/*.js)
   ========================================================= */
// Chave de comparação: maiúsculas, sem acento, espaços simples ("Santa fé" -> "SANTA FE")
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const chave = s => semAcento(s).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
// Cria a função de consulta de uma base pelo nome (bairro ou zona), ignorando acentos/maiúsculas
const buscaPor = db => {
    const idx = new Map(Object.entries(db).map(([nome, d]) => [chave(nome), d]));
    return nome => idx.get(chave(nome)) || null;
};
const bairroCanonico = s => BAIRROS.find(n => chave(n) === chave(s)) || null;
const zonaDoBairro      = buscaPor(ZONA_DB);              // PDDUA_A6_ZONAS_URBANAS
const zonaAmbiental     = buscaPor(ZONAS_AMBIENTAIS_DB);  // PDDUA_A7_ZONAS_AMBIENTAIS
const traDoBairro       = buscaPor(TRA_DB);               // PDDUA_A71_TRA
const usosDaZona        = buscaPor(CATEGORIA_USO_DB);     // PDDUA_A81_CATEGORIA_USO
const indicesDaZona     = buscaPor(INDICES_DB);           // PDDUA_A82_INDICES_URBANISTICOS
const lotesDaZona       = buscaPor(LOTES_DB);             // PDDUA_A82_LOTES_MINIMOS
const recuosDaZona      = buscaPor(RECUOS_DB);            // PDDUA_A82_RECUOS_MINIMOS
// zoneamento ambiental do bairro: Anexo 7 (za, permMin) + Anexo 7.1 (traMin, alfa, beta)
const ambientalDoBairro = nome => {
    const za = zonaAmbiental(nome), tra = traDoBairro(nome);
    return za || tra ? { ...za, ...tra } : null;
};
