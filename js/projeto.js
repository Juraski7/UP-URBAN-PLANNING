/* UP! Urban Planning — projeto .jsk (salvar / abrir) */
'use strict';

/* =========================================================
   PROJETO .JSK (salvar / abrir)
   Arquivo de texto (JSON) com todos os campos + a camada do mapa (KML/KMZ/SHP)
   ========================================================= */
const JSK_APP = 'UP! Urban Planning', JSK_FORMATO = 1, JSK_VERSAO = '3.8';
const JSK_APPS_ANTIGOS = ['UrbViab JSK'];                     // projetos salvos antes da troca de nome continuam abrindo
const JSK_TIPOS = [{ description: 'Projeto UP! Urban Planning', accept: { 'application/octet-stream': ['.jsk'] } }];
let jskHandle = null, jskNome = '', snapshotSalvo = '', alterado = false;

function coletarCampos() {
    const campos = {};
    // campos de consulta (data-nao-salvar, ex.: busca da aba CATEGORIA DE USO) não vão para o projeto
    document.querySelectorAll('main input[id]:not([data-nao-salvar]), main select[id]').forEach(el => {
        if (el.type !== 'file') campos[el.id] = el.value;
    });
    return campos;
}
const snapshotAtual = () => JSON.stringify(coletarCampos()) + '|' + mapaNome + '#' + mapaVer;

function atualizarStatusJsk() {
    const el = $('jsk-status');
    if (!el) return;
    el.textContent = (jskNome || 'Projeto sem nome') + (alterado ? ' • alterações não salvas' : (jskNome ? ' • salvo' : ''));
    el.title = el.textContent;
}
function verificarAlteracao() {
    if (!ready) return;
    const novo = snapshotAtual() !== snapshotSalvo;
    if (novo !== alterado) { alterado = novo; atualizarStatusJsk(); }
}
window.addEventListener('beforeunload', e => { if (alterado) { e.preventDefault(); e.returnValue = ''; } });

function aviso(msg) {
    const t = document.createElement('div');
    t.className = 'no-print fixed bottom-4 right-4 bg-[#1B2E24] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg border border-emerald-500/40 z-[2000]';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
}

const abaAtiva = () => (document.querySelector('.tab-content:not(.hidden)') || {}).id || 'tab-basico';

function nomeSugerido() {
    const limpa = s => semAcento(s).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
    const nome = [limpa($('inp-projeto').value), limpa($('inp-inscricao').value)].filter(Boolean).join('_');
    return (nome || 'projeto') + '.jsk';
}

function montarProjeto() {
    return {
        app: JSK_APP, formato: JSK_FORMATO, versao: JSK_VERSAO,
        salvoEm: new Date().toISOString(),
        aba: abaAtiva(),
        campos: coletarCampos(),
        mapa: currentLayer ? { nome: mapaNome, geojson: currentLayer.toGeoJSON(false) } : null,     // false = sem arredondar (padrão: 6 casas ≈ 10 cm)
        lados: ladosParaSalvar()                            // frente x lateral/fundos do terreno (medicao.js)
    };
}

async function salvarProjeto(comoNovo = false) {
    // arredonda números a 9 casas (< 1 mm nas coordenadas): medidas idênticas ao reabrir, arquivo enxuto
    const texto = JSON.stringify(montarProjeto(), (k, v) => typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v);
    const blob = new Blob([texto], { type: 'application/octet-stream' });
    let gravado = false;

    if (window.showSaveFilePicker) {
        try {
            if (comoNovo || !jskHandle) jskHandle = await window.showSaveFilePicker({ suggestedName: jskNome || nomeSugerido(), types: JSK_TIPOS });
            const w = await jskHandle.createWritable();
            await w.write(blob);
            await w.close();
            jskNome = jskHandle.name;
            gravado = true;
        } catch (err) {
            if (err && err.name === 'AbortError') return;      // usuário cancelou
            jskHandle = null;                                  // sem permissão: cai no download comum
        }
    }
    if (!gravado) {
        const a = document.createElement('a');
        jskNome = jskNome || nomeSugerido();
        a.href = URL.createObjectURL(blob);
        a.download = jskNome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    snapshotSalvo = snapshotAtual();
    alterado = false;
    atualizarStatusJsk();
    aviso('Projeto salvo: ' + jskNome);
}

async function carregarProjeto(texto, handle, nomeArq) {
    let p;
    try { p = JSON.parse(texto); } catch (e) { p = null; }
    if (!p || (p.app !== JSK_APP && !JSK_APPS_ANTIGOS.includes(p.app)) || typeof p.campos !== 'object') {
        alert('Este arquivo não é um projeto válido do UP! Urban Planning.');
        return;
    }
    if (p.formato > JSK_FORMATO && !confirm('Este projeto foi salvo numa versão mais nova do sistema. Alguns dados podem não ser carregados. Continuar?')) return;

    // campos renomeados (projetos antigos)
    if ('inp-lazer-descoberta' in p.campos && !('inp-lazer-ocupada' in p.campos)) p.campos['inp-lazer-ocupada'] = p.campos['inp-lazer-descoberta'];

    // campos de texto, números e listas
    for (const [id, v] of Object.entries(p.campos)) {
        const el = document.getElementById(id);
        if (!el || el.type === 'file') continue;
        el.value = el.dataset.mask ? numeroAntigo(v) : v;          // projetos antigos: campos com máscara eram número puro ("18.00")
    }
    carregarQuadro(p.campos);                          // linhas livres do quadro de áreas (quadro_areas.js)
    reaplicarMascaras();
    document.querySelectorAll('.custom-select-container').forEach(box => {
        const sel = box.querySelector('select');
        const opt = sel.options[sel.selectedIndex];
        box.querySelector('.custom-select-label').textContent = opt ? rotuloOpcao(opt.value, opt.textContent) : '';
    });
    validarCombos();      // projetos antigos guardavam códigos ("CENTENARIO", "R3"): viram os nomes oficiais da lista

    openTab(p.aba || 'tab-basico');
    calcularTudo();

    // mapa
    if (map) {
        await new Promise(r => setTimeout(r, 150));
        map.invalidateSize();
        limparMedicoes();                                  // medições eram do projeto anterior (medicao.js)
        limparLados();
        if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }
        const ladosKml = p.lados && p.lados.origem === 'kml' ? p.lados : {};
        if (p.mapa && p.mapa.geojson) {
            try { showLayer(L.geoJSON(p.mapa.geojson, { style: ESTILO_MAPA }), ladosKml); } catch (e) { aviso('Não foi possível reconstruir o mapa do projeto.'); }
        }
    }
    if (map) restaurarLados(p.lados);                    // terreno desenhado (o do KML já voltou em showLayer)
    mapaNome = (p.mapa && p.mapa.nome) || '';
    mapaVer++;
    preencherImpressao();

    jskHandle = handle || null;
    jskNome = (handle && handle.name) || nomeArq || '';
    snapshotSalvo = snapshotAtual();
    alterado = false;
    atualizarStatusJsk();
    aviso('Projeto carregado' + (jskNome ? ': ' + jskNome : ''));
}

async function abrirProjeto() {
    if (alterado && !confirm('Há alterações não salvas. Abrir outro projeto mesmo assim?')) return;
    if (window.showOpenFilePicker) {
        try {
            const [handle] = await window.showOpenFilePicker({ types: JSK_TIPOS, multiple: false });
            const file = await handle.getFile();
            await carregarProjeto(await file.text(), handle, file.name);
            return;
        } catch (err) {
            if (err && err.name === 'AbortError') return;
        }
    }
    $('jsk-file-input').click();
}

$('jsk-file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await carregarProjeto(await file.text(), null, file.name);
});
$('btn-abrir').addEventListener('click', abrirProjeto);
$('btn-salvar').addEventListener('click', e => salvarProjeto(e.shiftKey));
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvarProjeto(e.shiftKey); }
});
