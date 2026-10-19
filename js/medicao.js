/* UP! Urban Planning — ferramentas de medição no mapa, em 2 grupos:
   MEDIR (só mede, não mexe no formulário)
   • Distância ............. linha com 1 ou mais trechos
   • Área .................. polígono com área e medida dos lados
   • Desenhar por descrição (rumos/azimutes ou coordenadas UTM) e exportar KML: js/desenho.js
   TERRENO (atributos do imóvel: preenchem campos)
   • Largura da via ........ 2 pontos; preenche LARGURA DA VIA (MURO A MURO)
   • Dimensões do terreno .. com KML carregado: área e lados dos polígonos do arquivo (já aparecem ao carregar; o botão oculta/mostra);
                             sem KML: desenha o terreno. A área pode ir para ÁREA DO LOTE (campo continua editável).
                             Os lados do terreno começam como LATERAL/FUNDOS; clique num lado para marcá-lo como FRENTE.
                             ladosDoTerreno() entrega os lados classificados (base para a futura aba de recuos).
   Uma ferramenta por vez: com uma ferramenta de desenho ativa, clicar num lado não o marca como FRENTE (o clique vira ponto).
   Edição: clique na linha para mover os pontos (Leaflet-Geoman); clique na medida para digitar o comprimento.
   Apagar: botão "Apagar feição" (depois clique na feição) ou botão direito — sempre com confirmação.
   Cálculos num plano local tangente ao elipsoide WGS84 (precisão milimétrica na escala de lotes e vias). */
'use strict';

/* =========================================================
   GEODÉSIA
   ========================================================= */
const WGS84 = { a: 6378137, e2: 0.00669437999014 };
const RAD = Math.PI / 180;

/* Projeção local (metros) centrada na média dos pontos, com os raios de curvatura do elipsoide.
   para: lat/lng -> [x, y] em metros • de: [x, y] -> lat/lng */
function projecaoLocal(pontos) {
    const lat0 = pontos.reduce((s, p) => s + p.lat, 0) / pontos.length;
    const lng0 = pontos.reduce((s, p) => s + p.lng, 0) / pontos.length;
    const sen = Math.sin(lat0 * RAD), w = 1 - WGS84.e2 * sen * sen;
    const M = WGS84.a * (1 - WGS84.e2) / Math.pow(w, 1.5);     // raio no meridiano
    const N = WGS84.a / Math.sqrt(w);                          // raio no primeiro vertical
    const kx = RAD * N * Math.cos(lat0 * RAD), ky = RAD * M;
    return { para: p => [(p.lng - lng0) * kx, (p.lat - lat0) * ky], de: ([x, y]) => L.latLng(lat0 + y / ky, lng0 + x / kx) };
}
const projetor = pontos => projecaoLocal(pontos).para;
function distancia(a, b) {
    const pr = projetor([a, b]), [x1, y1] = pr(a), [x2, y2] = pr(b);
    return Math.hypot(x2 - x1, y2 - y1);
}
const comprimento = pts => pts.slice(1).reduce((s, p, i) => s + distancia(pts[i], p), 0);
function areaAnel(anel) {                                       // fórmula de Gauss (shoelace)
    const xy = anel.map(projetor(anel));
    let s = 0;
    for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length];
        s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
}
// getLatLngs() de um polígono: [anel, furos...] ou [[anel, furos...], ...] -> sempre [[anel, furos...], ...]
const poligonosDe = ll => L.LineUtil.isFlat(ll) ? [[ll]] : L.LineUtil.isFlat(ll[0]) ? [ll] : ll;
const areaDe = ll => poligonosDe(ll).reduce((s, [ext, ...furos]) => s + areaAnel(ext) - furos.reduce((t, f) => t + areaAnel(f), 0), 0);

/* =========================================================
   RÓTULOS
   ========================================================= */
const fmtM = v => fmt(v) + ' m';
const fmtM2 = v => fmt(v) + ' m²';
const meio = (p, q) => L.latLng((p.lat + q.lat) / 2, (p.lng + q.lng) / 2);
const rotulo = (latlng, conteudo, cls, interativo = false) => L.marker(latlng, {
    icon: L.divIcon({ className: 'medida ' + cls, html: `<span>${conteudo}</span>`, iconSize: null }),
    interactive: interativo, keyboard: false, pmIgnore: true
});
const MAX_LADOS = 40;                                           // acima disso, não rotula lado a lado (poluiria o mapa)

/* Rótulo de medida que pode ser clicado para digitar o comprimento (ou, no modo apagar, apagar a feição) */
function rotuloEditavel(latlng, conteudo, cls, aoEditar, aoApagar) {
    const m = rotulo(latlng, conteudo, cls + ' medida-editavel', true);
    m.options.bubblingMouseEvents = false;
    m.on('click', () => modoApagar ? aoApagar() : aoEditar());
    m.on('contextmenu', e => { L.DomEvent.preventDefault(e.originalEvent); aoApagar(); });       // botão direito na medida apaga a feição
    m.on('add', () => { const el = m.getElement(); if (el) el.title = 'Clique para digitar o comprimento'; });
    return m;
}

/* aoEditar(i): torna o rótulo do lado i editável (polígonos desenhados) */
function rotularLados(grupo, anel, aoEditar = null, aoApagar = null) {
    if (anel.length > MAX_LADOS) return;
    anel.forEach((p, i) => {
        const q = anel[(i + 1) % anel.length], d = distancia(p, q);
        if (d < 0.01) return;
        grupo.addLayer(aoEditar ? rotuloEditavel(meio(p, q), fmtM(d), 'medida-lado', () => aoEditar(i), aoApagar)
                                : rotulo(meio(p, q), fmtM(d), 'medida-lado'));
    });
}

/* Ajusta o comprimento de um lado (vértice i -> i+1) mantendo a direção: move só o vértice final */
function editarComprimento(layer, iAnel, i) {
    const poli = POLIGONO[layer.medida.tipo], ll = layer.getLatLngs();
    const anel = poli ? poligonosDe(ll)[iAnel][0] : ll;
    const j = poli ? (i + 1) % anel.length : i + 1;
    const a = anel[i], b = anel[j], atual = distancia(a, b);
    const txt = prompt(`Comprimento do lado (m):\n(o ponto final se move na mesma direção)`, fmt(atual));
    if (txt === null) return;
    const novo = numeroBR(txt);
    if (!(novo > 0)) return aviso('Comprimento inválido.');
    const pr = projecaoLocal([a, b]), [x1, y1] = pr.para(a), [x2, y2] = pr.para(b), k = novo / Math.hypot(x2 - x1, y2 - y1);
    anel[j] = pr.de([x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]);
    layer.setLatLngs(ll);
    layer.fire('pm:edit');
    if (layer === ladosLayer) { mapaVer++; verificarAlteracao(); }
}
// rótulo de área com botão para enviar o valor ao campo ÁREA DO LOTE (o botão não sai na impressão)
const rotuloTerreno = (latlng, area, titulo) => rotulo(latlng,
    `${titulo}: ${fmtM2(area)}<button type="button" class="no-print" data-usar-area="${area.toFixed(2)}" title="Preencher o campo ÁREA DO LOTE com este valor">usar como ÁREA DO LOTE</button>`,
    'medida-terreno', true);

/* =========================================================
   CAMPOS DO FORMULÁRIO
   ========================================================= */
function preencherCampo(id, valor, destacar) {
    const el = $(id);
    el.value = valor;
    if (destacar) { el.classList.add('campo-preenchido'); setTimeout(() => el.classList.remove('campo-preenchido'), 1500); }
    schedule();
}
function usarArea(area) {
    const novo = MASKS.area(area), atual = $('inp-area-lote').value;
    if (atual && atual !== novo && !confirm(`Substituir a ÁREA DO LOTE (${atual}) por ${novo}?\nO campo continua editável depois.`)) return;
    preencherCampo('inp-area-lote', novo, true);
    aviso('ÁREA DO LOTE preenchida: ' + novo);
}
document.addEventListener('click', e => {
    const b = e.target.closest('[data-usar-area]');
    if (b) { e.preventDefault(); e.stopPropagation(); usarArea(parseFloat(b.dataset.usarArea)); }
});

/* =========================================================
   MEDIÇÕES DESENHADAS (distância, via, área)
   ========================================================= */
const ESTILO_MEDIDA = {
    dist:    { color: '#2563EB', weight: 3, dashArray: '6 5' },                              // MEDIR (azul)
    area:    { color: '#2563EB', weight: 3, dashArray: '6 5', fillColor: '#3B82F6', fillOpacity: 0.12 },
    via:     { color: '#DC2626', weight: 4 },                                                // TERRENO
    terreno: { color: '#16A34A', weight: 3, fillColor: '#22C55E', fillOpacity: 0.15 }
};
const POLIGONO = { area: true, terreno: true };
let medicoes = null, rotulosKml = null, modoMedida = null;

function atualizarMedida(layer, criado = false) {
    const { tipo, rotulos } = layer.medida;
    rotulos.clearLayers();
    if (POLIGONO[tipo]) {
        const ll = layer.getLatLngs(), area = areaDe(ll);
        if (tipo === 'terreno') {
            ladosLayer = layer;
            montarLados(poligonosDe(ll).map(([ext]) => ext), 'desenho', layer.medida.ladosSalvos || {}, ladosOrigem === 'desenho' ? ladosTerreno : []);
            layer.medida.ladosSalvos = null;
        } else poligonosDe(ll).forEach(([ext], k) => rotularLados(rotulos, ext, i => editarComprimento(layer, k, i), () => pedirApagar(layer)));
        const rot = tipo === 'terreno' ? rotuloTerreno(layer.getCenter(), area, 'ÁREA')
                                       : rotulo(layer.getCenter(), 'ÁREA: ' + fmtM2(area), 'medida-area');
        if (tipo === 'terreno') {                                  // o rótulo de área fica por cima do polígono: também apaga
            rot.on('click', () => { if (modoApagar) pedirApagar(layer); });
            rot.on('contextmenu', e => { L.DomEvent.preventDefault(e.originalEvent); pedirApagar(layer); });
        }
        rotulos.addLayer(rot);
        return;
    }
    const pts = layer.getLatLngs(), total = comprimento(pts), apagar = () => pedirApagar(layer);
    if (pts.length > 2) pts.slice(1).forEach((q, i) => rotulos.addLayer(
        rotuloEditavel(meio(pts[i], q), fmtM(distancia(pts[i], q)), 'medida-lado', () => editarComprimento(layer, 0, i), apagar)));
    const textoTotal = (tipo === 'via' ? 'VIA: ' : pts.length > 2 ? 'TOTAL: ' : '') + fmtM(total);
    rotulos.addLayer(pts.length === 2 ? rotuloEditavel(pts[1], textoTotal, 'medida-' + tipo, () => editarComprimento(layer, 0, 0), apagar)
                                      : rotulo(pts[pts.length - 1], textoTotal, 'medida-' + tipo));
    if (tipo === 'via') preencherCampo('inp-faixa-dominio', MASKS.metro(total), criado);
}

function registrarMedida(layer, tipo, salvo = null) {
    layer.setStyle(ESTILO_MEDIDA[tipo]);
    layer.medida = { tipo, rotulos: L.layerGroup().addTo(map), ladosSalvos: salvo };
    medicoes.addLayer(layer);
    atualizarMedida(layer, true);
    layer.on('pm:markerdrag pm:edit pm:vertexadded pm:vertexremoved', () => atualizarMedida(layer));
    layer.on('click', () => modoApagar ? pedirApagar(layer)
        : layer.pm.enabled() ? layer.pm.disable() : layer.pm.enable({ allowSelfIntersection: false }));
    layer.on('contextmenu', e => { L.DomEvent.preventDefault(e.originalEvent); pedirApagar(layer); });
    if (salvo) return;                                         // restaurado de um projeto: sem aviso
    if (tipo === 'via') aviso('LARGURA DA VIA preenchida: ' + MASKS.metro(comprimento(layer.getLatLngs())));
    else if (tipo === 'terreno') aviso('Terreno criado. Clique nos lados para marcar a(s) FRENTE(S); clique na medida para digitar o comprimento.');
    else aviso('Medição criada. Clique na medida para digitar o comprimento; clique na linha para editar os pontos.');
}
function removerMedida(layer) {
    if (!medicoes.hasLayer(layer)) return;
    if (layer === ladosLayer) { limparLados(); mapaVer++; verificarAlteracao(); }
    layer.pm.disable();
    map.removeLayer(layer.medida.rotulos);
    medicoes.removeLayer(layer);
}

/* Apagar pelo usuário (botão direito ou modo apagar): sempre pede confirmação */
function descreverMedida(layer) {
    const { tipo } = layer.medida;
    if (POLIGONO[tipo]) return `${tipo === 'terreno' ? 'o terreno desenhado' : 'a medição de área'} (${fmtM2(areaDe(layer.getLatLngs()))})`;
    return `${tipo === 'via' ? 'a medição da largura da via' : 'a medição de distância'} (${fmtM(comprimento(layer.getLatLngs()))})`;
}
function pedirApagar(layer) {
    if (confirm(`Apagar ${descreverMedida(layer)}?`)) removerMedida(layer);
}

/* Remove a camada importada (KML/KMZ/SHP) e os lados/rótulos dela */
function removerCamadaKml() {
    if (!currentLayer || !confirm(`Remover a camada importada${mapaNome ? ` (${mapaNome})` : ''} do mapa?`)) return;
    map.removeLayer(currentLayer);
    currentLayer = null;
    limparRotulosKml();
    limparLados();
    mapaNome = ''; mapaVer++;
    verificarAlteracao();
    preencherImpressao();
}

/* MODO APAGAR: clique no botão e depois na feição (medição, terreno desenhado ou camada importada); Esc sai */
let modoApagar = false;
function alternarModoApagar(ligar = !modoApagar) {
    modoApagar = ligar;
    map.getContainer().classList.toggle('modo-apagar', ligar);
    if (ligar) aviso('Modo APAGAR: clique na feição que deseja apagar. Esc (ou o botão de novo) para sair.');
    marcarBotoes();
}
function limparMedicoes() {                                    // não mexe nos lados do KML (atributo do terreno)
    if (!medicoes) return;
    medicoes.eachLayer(removerMedida);
    limparRotulosKml();
}

/* =========================================================
   RÓTULOS DO KML (área + lados dos polígonos da camada importada)
   ========================================================= */
function percorrerPoligonos(layer, fn) {
    if (layer instanceof L.Polygon) fn(layer);
    else if (layer.eachLayer) layer.eachLayer(l => percorrerPoligonos(l, fn));
}
function limparRotulosKml() {
    if (!rotulosKml) return;
    rotulosKml.clearLayers();                                  // os lados (frente x lateral) continuam
    marcarBotoes();
}
function temPoligono(layer) {
    let n = 0;
    if (layer) percorrerPoligonos(layer, () => n++);
    return n > 0;
}
/* ÁREA de cada polígono da camada (com o botão "usar como ÁREA DO LOTE"); devolve quantos polígonos rotulou.
   Roda sozinho ao carregar o KML/KMZ/SHP (como se o usuário ativasse "Dimensões do terreno") */
function mostrarRotulosKml() {
    if (!rotulosKml || !currentLayer) return 0;
    rotulosKml.clearLayers();
    let n = 0;
    percorrerPoligonos(currentLayer, pol => { rotulosKml.addLayer(rotuloTerreno(pol.getCenter(), areaDe(pol.getLatLngs()), 'ÁREA')); n++; });
    return n;
}
/* Botão "Dimensões do terreno" com KML: mostra/oculta a ÁREA */
function alternarRotulosKml() {
    if (rotulosKml.getLayers().length) return limparRotulosKml();
    if (!currentLayer) return aviso('Carregue um KML / KMZ / SHP primeiro.');
    if (!mostrarRotulosKml()) aviso('A camada carregada não tem polígono para medir.');
    else if (ladosOrigem !== 'kml') prepararLadosKml();
}

/* Ao carregar KML/KMZ/SHP: o polígono é dividido em lados (todos LATERAL/FUNDOS) para o usuário marcar a frente.
   salvo: lados do projeto salvo (ladosParaSalvar). Devolve false se a camada não tem polígono. */
const cliqueCamada = () => { if (modoApagar) removerCamadaKml(); };
function prepararLadosKml(salvo = null) {
    if (!ladosGrupo || !currentLayer) return false;
    const aneis = [];
    percorrerPoligonos(currentLayer, pol => poligonosDe(pol.getLatLngs()).forEach(([ext]) => aneis.push(ext)));
    if (!aneis.length) return false;
    ladosLayer = null;
    currentLayer.off('click', cliqueCamada).on('click', cliqueCamada);
    montarLados(aneis, 'kml', salvo || {});
    if (!salvo) aviso('Terreno carregado: clique no(s) lado(s) da FRENTE; os demais ficam LATERAL/FUNDOS.');
    return true;
}

/* =========================================================
   LADOS DO TERRENO: FRENTE x LATERAL/FUNDOS
   Todos começam como LATERAL/FUNDOS; um clique no lado o marca como FRENTE (outro clique desmarca).
   Vários lados podem ser frente (lote de esquina). Fica salvo no projeto (.jsk).
   ========================================================= */
const ESTILO_LADO = {
    lateral: { color: '#475569', weight: 5, opacity: 0.9, dashArray: '3 7' },
    frente:  { color: '#EA580C', weight: 8, opacity: 1, dashArray: null }
};
let ladosGrupo = null, ladosTerreno = [], ladosOrigem = null, ladosLayer = null, ladosTotal = 0;

const mesmoPonto = (p, q) => Math.abs(p.lat - q.lat) < 1e-6 && Math.abs(p.lng - q.lng) < 1e-6;
const mesmoLado = (a, b, [fa, fb]) => (mesmoPonto(a, fa) && mesmoPonto(b, fb)) || (mesmoPonto(a, fb) && mesmoPonto(b, fa));

function limparLados() {
    if (ladosGrupo) ladosGrupo.clearLayers();
    ladosTerreno = []; ladosOrigem = null; ladosLayer = null; ladosTotal = 0;
}

/* aneis: anéis externos; salvo: { frentes, posicoes, total } do projeto (ladosParaSalvar);
   anteriores: lados antes de uma edição. A frente é recuperada pela posição do lado quando a quantidade
   de lados não mudou; senão (ou em projetos antigos, sem posições) pela geometria do lado. */
function montarLados(aneis, origem, salvo = {}, anteriores = []) {
    const total = aneis.reduce((s, a) => s + a.length, 0);
    const posicoes = anteriores.length && ladosTotal === total ? new Set(anteriores.filter(l => l.frente).map(l => l.pos))
                   : salvo.posicoes && salvo.total === total ? new Set(salvo.posicoes) : null;
    const livres = (salvo.frentes || []).map(f => f.map(c => L.latLng(c)));    // cada frente salva marca um lado só (polígonos repetidos)
    ladosGrupo.clearLayers(); ladosTerreno = []; ladosOrigem = origem; ladosTotal = total;
    let k = 0;
    aneis.forEach(anel => anel.forEach((a, i) => {
        const b = anel[(i + 1) % anel.length], comp = distancia(a, b), pos = k++;
        if (comp < 0.01) return;
        let frente;
        if (posicoes) frente = posicoes.has(pos);
        else {
            const iF = livres.findIndex(f => f && mesmoLado(a, b, f));
            frente = iF >= 0;
            if (frente) livres[iF] = null;
        }
        const lado = { a, b, comp, frente, pos, anel: aneis.indexOf(anel) };
        lado.linha = L.polyline([a, b], { ...ESTILO_LADO.lateral, pane: 'ladosTerreno', interactive: false, pmIgnore: true }).addTo(ladosGrupo);
        // área de clique invisível e mais larga (a linha tracejada só recebe clique nos traços)
        lado.alvo = L.polyline([a, b], { pane: 'ladosTerreno', color: '#000', opacity: 0.001, weight: 16, pmIgnore: true, bubblingMouseEvents: false, className: 'lado-alvo' }).addTo(ladosGrupo);
        lado.alvo.on('click', () => { if (modoApagar) apagarTerreno(); else if (!ferramentaAtiva()) alternarFrente(lado); });
        const editavel = origem === 'desenho' && ladosLayer, iAnel = aneis.indexOf(anel);
        lado.rotulo = (editavel ? rotuloEditavel(meio(a, b), '', 'medida-lado', () => editarComprimento(ladosLayer, iAnel, i), apagarTerreno)
                                : rotulo(meio(a, b), '', 'medida-lado')).addTo(ladosGrupo);
        lado.editavel = !!editavel;
        ladosTerreno.push(lado);
        pintarLado(lado);
    }));
}
function pintarLado(l) {
    l.linha.setStyle(l.frente ? ESTILO_LADO.frente : ESTILO_LADO.lateral);
    l.alvo.unbindTooltip().bindTooltip(l.frente ? 'FRENTE (clique para voltar a LATERAL/FUNDOS)' : 'LATERAL/FUNDOS (clique para marcar como FRENTE)', { sticky: true });
    l.rotulo.setIcon(L.divIcon({ className: 'medida ' + (l.frente ? 'medida-frente' : 'medida-lado') + (l.editavel ? ' medida-editavel' : ''),
        html: `<span>${l.frente ? 'FRENTE: ' : ''}${fmtM(l.comp)}</span>`, iconSize: null }));
}
const apagarTerreno = () => ladosOrigem === 'desenho' && ladosLayer ? pedirApagar(ladosLayer) : removerCamadaKml();
function alternarFrente(l) {
    l.frente = !l.frente;
    pintarLado(l);
    mapaVer++;                     // conta como alteração do projeto
    verificarAlteracao();
}

/* Lados classificados, para outras abas (ex.: recuos): tipo 'frente' | 'lateral_fundos'; anel = polígono a que o lado pertence */
function ladosDoTerreno() {
    return ladosTerreno.map((l, i) => ({ indice: i, anel: l.anel, tipo: l.frente ? 'frente' : 'lateral_fundos', comprimento: l.comp,
        de: { lat: l.a.lat, lng: l.a.lng }, para: { lat: l.b.lat, lng: l.b.lng } }));
}

/* Projeto .jsk: guarda a origem (KML ou desenho), o polígono desenhado e os lados de frente */
function ladosParaSalvar() {
    if (!ladosTerreno.length) return null;
    const f = ladosTerreno.filter(l => l.frente);
    const d = { origem: ladosOrigem, total: ladosTotal, posicoes: f.map(l => l.pos), frentes: f.map(l => [[l.a.lat, l.a.lng], [l.b.lat, l.b.lng]]) };
    if (ladosOrigem === 'desenho' && ladosLayer) d.poligono = poligonosDe(ladosLayer.getLatLngs()).map(([ext]) => ext.map(p => [p.lat, p.lng]));
    return d;
}
/* Terreno desenhado salvo no projeto (o do KML volta junto com a camada, em showLayer) */
function restaurarLados(d) {
    if (medicoes && d && d.origem === 'desenho' && d.poligono) registrarMedida(L.polygon(d.poligono), 'terreno', d);
}

/* =========================================================
   BARRA DE FERRAMENTAS
   ========================================================= */
const GRUPOS_FERRAMENTAS = [
    { titulo: 'MEDIR', cls: 'medir-simples', itens: [
        ['dist', 'fa-ruler', 'Medir distância (clique nos pontos; clique no último ponto para terminar)'],
        ['area', 'fa-draw-polygon', 'Medir área (clique nos vértices; clique no 1º ponto para fechar)'],
        ['descricao', 'fa-compass-drafting', 'Desenhar por descrição: rumos/azimutes e distâncias ou coordenadas UTM']] },
    { titulo: 'TERRENO', cls: 'medir-terreno', itens: [
        ['via', 'fa-road', 'Largura da via (muro a muro)'],
        ['terreno', 'fa-vector-square', 'Dimensões do terreno (com KML: mostra/oculta a área)'],
        ['centralizar', 'fa-crosshairs', 'Centralizar o terreno no mapa']] },
    { titulo: '', cls: 'medir-acoes', itens: [
        ['apagar', 'fa-eraser', 'Apagar feição: clique aqui e depois na feição (Esc sai)'],
        ['limpar', 'fa-trash-can', 'Apagar todas as medições'],
        ['exportar', 'fa-file-export', 'Exportar os desenhos em KML']] }
];
// só a ferramenta em uso fica destacada (os rótulos de área do KML ficam sempre visíveis e não contam como ferramenta)
function marcarBotoes() {
    document.querySelectorAll('.medir-bar [data-ferramenta]').forEach(a => {
        const f = a.dataset.ferramenta;
        a.classList.toggle('ativo', f === modoMedida || (f === 'apagar' && modoApagar));
    });
}
/* Ferramenta de desenho em uso (ou escolha de ponto no mapa): os lados e as medidas não recebem clique (classe .desenhando) */
const ferramentaAtiva = () => !!map && (map.pm.globalDrawModeEnabled() || map.getContainer().classList.contains('desenhando'));
const marcarDesenhando = ligar => map.getContainer().classList.toggle('desenhando', ligar);
function usarFerramenta(f) {
    if (f === 'centralizar') return centralizarTerreno();         // ações diretas: não interrompem um desenho em andamento
    if (f === 'exportar') return exportarKml();
    const desenhando = map.pm.globalDrawModeEnabled();
    if (desenhando) map.pm.disableDraw();
    if (f === 'apagar') return alternarModoApagar();
    if (modoApagar) alternarModoApagar(false);
    if (f === 'descricao') return abrirDesenhoDescricao();
    // dimensões do terreno: com KML (polígono) carregado, rotula o arquivo; senão, desenha o terreno
    if (f === 'terreno' && (rotulosKml.getLayers().length || temPoligono(currentLayer))) return alternarRotulosKml();
    if (f === 'limpar') {
        if (medicoes.getLayers().length || rotulosKml.getLayers().length) {
            if (confirm('Apagar todas as medições do mapa?')) limparMedicoes();
        }
        return;
    }
    if (desenhando && modoMedida === f) { modoMedida = null; return marcarBotoes(); }   // clicar de novo cancela
    modoMedida = f;
    map.pm.enableDraw(POLIGONO[f] ? 'Polygon' : 'Line', {
        snappable: true, snapDistance: 15, allowSelfIntersection: false,
        templineStyle: ESTILO_MEDIDA[f], hintlineStyle: { ...ESTILO_MEDIDA[f], dashArray: '4 4' }, pathOptions: ESTILO_MEDIDA[f]
    });
    marcarBotoes();
}

function initMedicao() {
    if (!map || !map.pm) return;                                // Leaflet ou Geoman indisponível (sem internet)
    map.pm.setLang('pt_br');
    medicoes = L.featureGroup().addTo(map);
    rotulosKml = L.layerGroup().addTo(map);
    // camada própria acima dos polígonos (overlayPane = 400) e abaixo dos rótulos: o clique no lado sempre chega nele
    map.createPane('ladosTerreno').style.zIndex = 450;
    ladosGrupo = L.layerGroup().addTo(map);

    const Barra = L.Control.extend({
        options: { position: 'topleft' },
        onAdd() {
            const div = L.DomUtil.create('div', 'leaflet-control medir-bar no-print');
            div.innerHTML = GRUPOS_FERRAMENTAS.map(g => `<div class="leaflet-bar medir-grupo ${g.cls}">` +
                (g.titulo ? `<span class="medir-titulo">${g.titulo}</span>` : '') +
                g.itens.map(([f, ic, t]) => `<a href="#" role="button" data-ferramenta="${f}" title="${t}" aria-label="${t}"><i class="fa-solid ${ic}"></i></a>`).join('') +
                '</div>').join('');
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.on(div, 'click', e => {
                const a = e.target.closest('[data-ferramenta]');
                if (a) { L.DomEvent.preventDefault(e); usarFerramenta(a.dataset.ferramenta); }
            });
            return div;
        }
    });
    new Barra().addTo(map);

    // largura da via: termina sozinho no 2º ponto
    map.on('pm:drawstart', ({ workingLayer }) => {
        workingLayer.on('pm:vertexadded', () => {
            if (modoMedida === 'via' && workingLayer.getLatLngs().length >= 2) map.pm.Draw.Line._finishShape();
        });
    });
    map.on('pm:create', ({ layer }) => registrarMedida(layer, modoMedida || 'dist'));
    map.on('pm:drawend', () => { modoMedida = null; marcarBotoes(); });
    map.on('pm:globaldrawmodetoggled', e => marcarDesenhando(e.enabled));
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (map.pm.globalDrawModeEnabled()) map.pm.disableDraw();
        if (modoApagar) alternarModoApagar(false);
    });
    // na impressão, sem alças de edição
    window.addEventListener('beforeprint', () => medicoes.eachLayer(l => l.pm.disable()));
}
