/* UP! Urban Planning — mapa (Leaflet + Omnivore + shpjs) */
'use strict';

/* =========================================================
   MAPA (Leaflet + Omnivore + shpjs)
   ========================================================= */
let map = null, currentLayer = null;
let baseMapa = 'Google Híbrido';          // camada de fundo ativa (vai na legenda do mapa impresso)

function initMap() {
    if (typeof L === 'undefined') return;
    // zoom em meios níveis (botões, roda do mouse e enquadramento automático): centraliza melhor o polígono
    map = L.map('map-container', { zoomSnap: 0.5, zoomDelta: 0.5, wheelPxPerZoomLevel: 120 }).setView([-20.4697, -54.6201], 12);
    // Google: lyrs=y = híbrido (satélite + nomes de ruas), lyrs=s = só satélite
    const hybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google'
    }).addTo(map);                                                     // padrão ao abrir
    const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Satélite'
    });
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap'
    });
    const bases = { 'Híbrido (Google)': hybrid, 'Satélite (Google)': satellite, 'Ruas (OSM)': streets };
    const legenda = { 'Híbrido (Google)': 'Google Híbrido', 'Satélite (Google)': 'Google Satélite', 'Ruas (OSM)': 'OpenStreetMap' };
    L.control.layers(bases).addTo(map);
    map.on('baselayerchange', e => { baseMapa = legenda[e.name] || e.name; preencherImpressao(); });
    L.control.scale({ imperial: false }).addTo(map);
    setTimeout(() => map.invalidateSize(), 300);
}

function showLayer(layer, salvo = null) {
    if (currentLayer) map.removeLayer(currentLayer);
    limparRotulosKml();                                    // rótulos e lados eram da camada anterior (medicao.js)
    limparLados();
    currentLayer = layer.addTo(map);
    const bounds = currentLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: PADDING_MAPA });
    prepararLadosKml(salvo);                               // lados do polígono: todos LATERAL/FUNDOS até marcar a frente
}

const ESTILO_MAPA = { color: '#EAB308', weight: 3, fillOpacity: 0.2 };
const PADDING_MAPA = [30, 30];                             // folga em px entre o terreno e a borda do mapa

/* Enquadra o terreno: camada KML/SHP; senão o terreno desenhado; senão as medições */
function centralizarTerreno() {
    const alvo = currentLayer || ladosLayer || (medicoes && medicoes.getLayers().length && medicoes);
    const b = alvo && alvo.getBounds();
    if (!b || !b.isValid()) return aviso('Nada para centralizar: carregue um KML / KMZ / SHP ou desenhe o terreno.');
    map.fitBounds(b, { padding: PADDING_MAPA });
}
let mapaNome = '', mapaVer = 0;

/* Alguns programas em português gravam o KML com vírgula decimal ("-54,6288,-20,5274,0"):
   cada ponto vira 4 a 6 pedaços separados por vírgula -> remonta "lng,lat[,alt]" */
function corrigirVirgulaDecimal(kml) {
    return kml.replace(/(<coordinates>)([\s\S]*?)(<\/coordinates>)/gi, (m, ini, txt, fim) => ini + txt.trim().split(/\s+/).map(pt => {
        const p = pt.split(',');
        if (p.length < 4 || p.length > 6) return pt;
        const alt = p.length === 5 ? ',' + p[4] : p.length === 6 ? ',' + p[4] + '.' + p[5] : '';
        return `${p[0]}.${p[1]},${p[2]}.${p[3]}${alt}`;
    }).join(' ') + fim);
}
function camadaKml(texto) {
    const l = omnivore.kml.parse(corrigirVirgulaDecimal(texto));
    l.setStyle(ESTILO_MAPA);
    return l;
}

async function lerArquivoMapa(file) {
    const nome = file.name.toLowerCase();
    if (nome.endsWith('.kml')) return camadaKml(await file.text());
    if (nome.endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const entrada = zip.file(/\.kml$/i)[0];
        if (!entrada) throw new Error('kmz sem kml');
        return camadaKml(await entrada.async('string'));
    }
    if (nome.endsWith('.zip')) return L.geoJSON(await shp(await file.arrayBuffer()), { style: ESTILO_MAPA });
    throw new Error('formato');
}

$('map-file-upload').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !map) return;
    try {
        showLayer(await lerArquivoMapa(file));
        mapaNome = file.name;
        mapaVer++;
        verificarAlteracao();
    } catch (err) {
        alert(err.message === 'formato'
            ? 'Formato não suportado. Envie .kml, .kmz ou Shapefile (.zip).'
            : 'Erro ao ler o arquivo. Verifique se é um KML/KMZ válido ou um Shapefile (.zip com .shp, .dbf e .shx).');
    }
});
