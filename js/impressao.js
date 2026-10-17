/* UP! Urban Planning — impressão A4 */
'use strict';

/* ---------- Impressão A4 ---------- */
const tituloOriginal = document.title;
const val = id => ($(id).value || '').trim().toUpperCase() || '-';

function preencherImpressao() {
    const agora = new Date();
    $('ph-emissao').textContent = agora.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    $('ph-projeto').textContent = val('inp-projeto');
    $('ph-inscricao').textContent = ($('inp-inscricao').value || '').trim() || '-';
    $('ph-endereco').textContent = val('inp-endereco');
    $('map-caption').textContent = `Situação do imóvel - ${val('inp-endereco')} • ${val('inp-quadra-lote')} • Base: ${baseMapa}` + (currentLayer ? ' • Camada importada em amarelo' : '');
}
const tituloPdf = () => `Viabilidade - ${val('inp-projeto')} - ${($('inp-inscricao').value || '').trim()}`;      // nome sugerido do PDF
function ajustarMapaImpressao() {
    if (!map) return;
    map.invalidateSize({ animate: false });
    if (currentLayer) { const bd = currentLayer.getBounds(); if (bd.isValid()) map.fitBounds(bd, { animate: false, padding: PADDING_MAPA }); }
}
window.addEventListener('beforeprint', () => { calcularTudo(); preencherImpressao(); ajustarMapaImpressao(); document.title = tituloPdf(); });
window.addEventListener('afterprint', () => {
    document.title = tituloOriginal;
    if (!previaImpressao) document.body.classList.remove('print-prep');      // em prévia, continua no layout do papel
    setTimeout(ajustarMapaImpressao, 50);
});

/* Aguarda todos os tiles do mapa terminarem de carregar (máx. 6 s) */
function aguardarTiles(timeout = 6000) {
    return new Promise(resolve => {
        const t0 = Date.now();
        const checa = () => {
            const tiles = document.querySelectorAll('#map-container .leaflet-tile');
            const pendentes = [...tiles].filter(t => !t.classList.contains('leaflet-tile-loaded')).length;
            if ((tiles.length && !pendentes) || Date.now() - t0 > timeout) setTimeout(resolve, 300);
            else setTimeout(checa, 150);
        };
        checa();
    });
}

/* Exportar: ajusta o mapa ao tamanho do papel, espera o fundo carregar e só então imprime */
let preparando = false;
async function imprimir() {
    if (preparando) return;
    preparando = true;
    const btn = $('btn-print');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span class="hidden sm:inline">Preparando mapa...</span>';
    try {
        if (map && $('map-container').offsetParent !== null) {      // só se a aba Imóvel estiver ativa
            document.body.classList.add('print-prep');
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            ajustarMapaImpressao();
            await aguardarTiles();
        }
        preencherImpressao();
        window.print();
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
        preparando = false;
    }
}
$('btn-print').addEventListener('click', imprimir);

/* Botão "Layout de impressão" do visualizador: mapa no tamanho do papel (185,5 x 146 mm), centralizado,
   com a legenda do PDF; serve para enquadrar o mapa exatamente como vai sair impresso */
let previaImpressao = false;
function alternarPreviaImpressao() {
    previaImpressao = !previaImpressao;
    document.body.classList.toggle('print-prep', previaImpressao);
    preencherImpressao();
    if (map) map.invalidateSize({ animate: false });
    const b = $('btn-previa-mapa');
    b.setAttribute('aria-pressed', String(previaImpressao));
    b.classList.toggle('previa-ativa', previaImpressao);
    b.querySelector('i').className = 'fa-solid ' + (previaImpressao ? 'fa-display' : 'fa-print');
    b.querySelector('span').textContent = previaImpressao ? 'Voltar ao layout da tela' : 'Layout de impressão';
}
$('btn-previa-mapa').addEventListener('click', alternarPreviaImpressao);
window.matchMedia('print').addEventListener('change', e => { if (e.matches) ajustarMapaImpressao(); });
