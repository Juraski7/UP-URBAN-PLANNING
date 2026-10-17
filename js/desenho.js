/* UP! Urban Planning — desenho por descrição perimétrica e exportação KML
   • Rumos/azimutes + distâncias a partir de um ponto (UTM digitado ou clicado no mapa)
   • Pares de coordenadas UTM (E N)
   • Resultado: TERRENO (polígono com frente x lateral/fundos) ou LINHA (medição de distância)
   • Exportar KML: medições, terreno, camada importada e lados classificados
   UTM: SIRGAS 2000 (elipsoide GRS80), fórmulas de Krüger (precisão sub-milimétrica no fuso).
   Caminhamento: azimutes/rumos referidos ao norte da quadrícula (UTM); distâncias digitadas = medidas no TERRENO,
   convertidas para o plano UTM pelo fator de escala local (assim o lado desenhado mede no mapa o valor digitado). */
'use strict';

/* =========================================================
   UTM (SIRGAS 2000 / GRS80) — Krüger, séries em n até n³
   ========================================================= */
const UTM = (() => {
    const a = 6378137, f = 1 / 298.257222101, n = f / (2 - f), k0 = 0.9996, E0 = 500000, N0sul = 10000000;
    const A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64);
    const al = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16, 13 * n * n / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240];
    const be = [n / 2 - 2 * n * n / 3 + 37 * n ** 3 / 96, n * n / 48 + n ** 3 / 15, 17 * n ** 3 / 480];
    const de = [2 * n - 2 * n * n / 3 - 2 * n ** 3, 7 * n * n / 3 - 8 * n ** 3 / 5, 56 * n ** 3 / 15];
    const c = 2 * Math.sqrt(n) / (1 + n);
    const lon0 = fuso => (fuso * 6 - 183) * RAD;
    return {
        fusoDe: lng => Math.floor((lng + 180) / 6) + 1,
        /* lat/lng (graus) -> { e, n } no fuso indicado (hemisfério sul) */
        para(lat, lng, fuso) {
            const phi = lat * RAD, lam = lng * RAD - lon0(fuso);
            const t = Math.sinh(Math.atanh(Math.sin(phi)) - c * Math.atanh(c * Math.sin(phi)));
            const xi = Math.atan(t / Math.cos(lam)), eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
            let x = eta, y = xi;
            for (let j = 1; j <= 3; j++) { x += al[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); y += al[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); }
            return { e: E0 + k0 * A * x, n: N0sul + k0 * A * y };
        },
        /* { e, n } (hemisfério sul) -> L.latLng */
        de(e, nn, fuso) {
            const xi = (nn - N0sul) / (k0 * A), eta = (e - E0) / (k0 * A);
            let xi1 = xi, eta1 = eta;
            for (let j = 1; j <= 3; j++) { xi1 -= be[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); eta1 -= be[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); }
            const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
            let phi = chi;
            for (let j = 1; j <= 3; j++) phi += de[j - 1] * Math.sin(2 * j * chi);
            return L.latLng(phi / RAD, (lon0(fuso) + Math.atan(Math.sinh(eta1) / Math.cos(xi1))) / RAD);
        }
    };
})();

/* =========================================================
   LEITURA DO TEXTO
   ========================================================= */
/* Uma linha do memorial -> { az (graus), dist (m) } ou null.
   Aceita: "N 45°30'15\" E 25,30" • "45°30'15\" NE 25,30" • "S45-30-15W 25.3" • "123°45'10\" 25,30" • "123,7528 25,30"
   Quadrantes: NE, SE, SW/SO, NW/NO (L = leste, O = oeste). Sem quadrante = azimute. */
function lerSegmento(linha) {
    let t = semAcento(linha).toUpperCase().replace(/[’′´`]/g, "'").replace(/[”″]|''/g, '"').replace(/[º˚]/g, '°');
    t = t.replace(/\b(AZIMUTE|AZ|RUMO|DISTANCIA|DIST|COM|DE|E\s+DISTANCIA)\b\.?/g, ' ').replace(/[;:\t]/g, ' ').trim();
    const md = t.match(/(\d+(?:[.,]\d+)?)\s*M?\s*$/);                          // distância = último número
    if (!md || t.startsWith('-')) return null;                                 // ângulo negativo não existe
    const dist = numeroBR(md[1]);
    let resto = t.slice(0, md.index).trim();
    let q1 = '', q2 = '';
    const pre = resto.match(/^([NS])(?=[\s\d])\s*/); if (pre) { q1 = pre[1]; resto = resto.slice(pre[0].length); }   // 'N 45..' ou 'N45..'
    const suf = resto.match(/(?:^|(?<=[\d\s"'°.,-]))(NE|NW|NO|SE|SW|SO|E|W|L|O)\s*$/);                                    // '..15" E' ou '..15W'
    if (suf) { resto = resto.slice(0, suf.index); const s = suf[1]; if (s.length === 2) { q1 = s[0]; q2 = s[1]; } else q2 = s; }
    const nums = (resto.match(/\d+(?:[.,]\d+)?/g) || []).map(numeroBR);
    if (!nums.length || !(dist > 0)) return null;
    const ang = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;
    let az = ang;
    if (q1 || q2) {                                                             // rumo -> azimute
        if (!q1 || !q2 || ang > 90) return null;
        const leste = q2 === 'E' || q2 === 'L';
        az = q1 === 'N' ? (leste ? ang : 360 - ang) : (leste ? 180 - ang : 180 + ang);
    } else if (ang >= 360) return null;
    return { az, dist };
}

/* Fator de escala (plano UTM / terreno) perto do ponto: compara 100 m no plano com a distância medida no mapa */
function fatorEscala(u, fuso) {
    const a = UTM.de(u.e, u.n, fuso), b = UTM.de(u.e + 70.71, u.n + 70.71, fuso);
    return 100 / distancia(a, b);
}

/* "E N" por linha -> [{ e, n }] (separador espaço, tab, ; ou vírgula) */
function lerCoordenadas(linha) {
    const t = linha.trim();
    if (!t) return null;
    let p = t.split(/[\s;]+/).filter(Boolean);
    if (p.length === 1 && t.split(',').length === 2) p = t.split(',');           // "736123.45,7734567.89"
    const nums = p.map(numeroBR).filter(Number.isFinite);
    return nums.length >= 2 ? { e: nums[0], n: nums[1] } : null;
}

/* =========================================================
   JANELA "DESENHAR POR DESCRIÇÃO"
   ========================================================= */
let dlgDesenho = null;
function criarDialogo() {
    dlgDesenho = document.createElement('dialog');
    dlgDesenho.id = 'dlg-desenho';
    dlgDesenho.className = 'dlg-desenho no-print';
    dlgDesenho.innerHTML = `
      <form method="dialog" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-extrabold text-[#1B2E24] text-sm"><i class="fa-solid fa-compass-drafting text-[#2E7D32]"></i> DESENHAR POR DESCRIÇÃO</h3>
          <button value="fechar" class="text-slate-500 hover:text-slate-800" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="flex gap-2">
          <button type="button" class="cu-chip ativo" data-dd-modo="rumos">RUMOS / AZIMUTES</button>
          <button type="button" class="cu-chip" data-dd-modo="utm">COORDENADAS UTM</button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label><span class="cu-rotulo">RESULTADO</span>
            <select id="dd-tipo" class="cu-input"><option value="terreno">TERRENO (polígono)</option><option value="dist">LINHA (distância)</option></select></label>
          <label><span class="cu-rotulo">FUSO UTM (SIRGAS 2000, SUL)</span>
            <select id="dd-fuso" class="cu-input">${[19, 20, 21, 22, 23, 24, 25].map(f => `<option value="${f}">${f} S</option>`).join('')}</select></label>
        </div>
        <div data-dd-painel="rumos" class="space-y-3">
          <div class="grid grid-cols-12 gap-2 items-end">
            <label class="col-span-5"><span class="cu-rotulo">PONTO INICIAL - E (m)</span><input id="dd-e0" class="cu-input" inputmode="decimal" placeholder="ex.: 748523,10"></label>
            <label class="col-span-5"><span class="cu-rotulo">PONTO INICIAL - N (m)</span><input id="dd-n0" class="cu-input" inputmode="decimal" placeholder="ex.: 7733451,20"></label>
            <button type="button" id="dd-pegar" class="cu-btn col-span-2" title="Clicar no mapa para definir o ponto inicial"><i class="fa-solid fa-location-crosshairs"></i> mapa</button>
          </div>
          <label class="block"><span class="cu-rotulo">SEGMENTOS (um por linha: rumo ou azimute + distância no terreno)</span>
            <textarea id="dd-segmentos" rows="7" class="cu-input font-mono text-xs" placeholder="N 45°30'15&quot; E 25,30\n45°30'15&quot; SE 40,00\n225°10'00&quot; 25,30\nS 44°29'45&quot; O 40,00"></textarea></label>
        </div>
        <div data-dd-painel="utm" class="space-y-3 hidden">
          <label class="block"><span class="cu-rotulo">COORDENADAS UTM (um vértice por linha: E N)</span>
            <textarea id="dd-coords" rows="9" class="cu-input font-mono text-xs" placeholder="748523,10 7733451,20\n748541,13 7733469,02\n748572,35 7733437,80"></textarea></label>
        </div>
        <div id="dd-resumo" class="text-[11px] bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 min-h-[2.5em]"></div>
        <div class="flex justify-end gap-2">
          <button value="fechar" class="cu-btn" style="flex: none">Cancelar</button>
          <button type="button" id="dd-desenhar" class="cu-btn cu-btn-verde" style="flex: none"><i class="fa-solid fa-pen-ruler"></i> Desenhar no mapa</button>
        </div>
      </form>`;
    document.body.appendChild(dlgDesenho);
    let modo = 'rumos';
    dlgDesenho.addEventListener('click', e => {
        const b = e.target.closest('[data-dd-modo]');
        if (b) {
            modo = b.dataset.ddModo;
            dlgDesenho.querySelectorAll('[data-dd-modo]').forEach(x => x.classList.toggle('ativo', x === b));
            dlgDesenho.querySelectorAll('[data-dd-painel]').forEach(p => p.classList.toggle('hidden', p.dataset.ddPainel !== modo));
            resumirDesenho(modo);
        }
        if (e.target.closest('#dd-pegar')) {
            dlgDesenho.close();
            aviso('Clique no mapa no PONTO INICIAL da descrição.');
            map.getContainer().style.cursor = 'crosshair';
            map.once('click', ev => {
                map.getContainer().style.cursor = '';
                const u = UTM.para(ev.latlng.lat, ev.latlng.lng, +$('dd-fuso').value);
                $('dd-e0').value = fmt(u.e, 3).replace(/\./g, ''); $('dd-n0').value = fmt(u.n, 3).replace(/\./g, '');
                dlgDesenho.showModal(); resumirDesenho(modo);
            });
        }
        if (e.target.closest('#dd-desenhar')) desenharDescricao(modo);
    });
    dlgDesenho.addEventListener('input', () => resumirDesenho(modo));
    dlgDesenho.addEventListener('change', () => resumirDesenho(modo));
}

/* Pontos UTM da descrição + linhas não entendidas */
function pontosDescricao(modo) {
    const linhas = (modo === 'rumos' ? $('dd-segmentos') : $('dd-coords')).value.split(/\r?\n/);
    const erros = [], pts = [];
    if (modo === 'utm') {
        linhas.forEach((l, i) => { if (!l.trim()) return; const c = lerCoordenadas(l); c ? pts.push(c) : erros.push(i + 1); });
        return { pts, erros };
    }
    const e0 = numeroBR($('dd-e0').value), n0 = numeroBR($('dd-n0').value), fuso = +$('dd-fuso').value;
    if (!(e0 > 0 && n0 > 0)) return { pts, erros, semInicio: true };
    pts.push({ e: e0, n: n0 });
    let soma = 0;                                                    // soma das distâncias digitadas (terreno)
    linhas.forEach((l, i) => {
        if (!l.trim()) return;
        const s = lerSegmento(l);
        if (!s) return erros.push(i + 1);
        soma += s.dist;
        const u = pts[pts.length - 1], az = s.az * RAD, d = s.dist * fatorEscala(u, fuso);
        pts.push({ e: u.e + d * Math.sin(az), n: u.n + d * Math.cos(az) });
    });
    return { pts, erros, soma };
}

function resumirDesenho(modo) {
    const { pts, erros, semInicio, soma } = pontosDescricao(modo);
    const tipo = $('dd-tipo').value, partes = [];
    if (semInicio) partes.push('<b class="text-amber-700">Informe o ponto inicial (E e N) ou clique em "mapa".</b>');
    if (pts.length >= 2) {
        let per = 0;
        for (let i = 1; i < pts.length; i++) per += Math.hypot(pts[i].e - pts[i - 1].e, pts[i].n - pts[i - 1].n);
        partes.push(`<b>${pts.length - (modo === 'rumos' ? 1 : 0)}</b> ${modo === 'rumos' ? 'segmento(s)' : 'vértice(s)'} • extensão ${fmtM(modo === 'rumos' ? soma : per)}`);
        if (modo === 'rumos' && tipo === 'terreno') {
            const f = pts[pts.length - 1], erro = Math.hypot(f.e - pts[0].e, f.n - pts[0].n);
            partes.push(`erro de fechamento: <b class="${erro > 0.5 ? 'text-red-700' : 'text-emerald-700'}">${fmt(erro, 3)} m</b>`);
        }
    }
    if (erros.length) partes.push(`<b class="text-red-700">linha(s) não entendida(s): ${erros.join(', ')}</b>`);
    $('dd-resumo').innerHTML = partes.join(' • ') || 'Digite a descrição.';
}

function desenharDescricao(modo) {
    const { pts, erros } = pontosDescricao(modo);
    const tipo = $('dd-tipo').value, fuso = +$('dd-fuso').value;
    if (erros.length && !confirm(`Há linha(s) não entendida(s) (${erros.join(', ')}). Desenhar mesmo assim, ignorando-as?`)) return;
    let ll = pts.map(p => UTM.de(p.e, p.n, fuso));
    if (tipo === 'terreno') {
        if (ll.length > 3 && mesmoPonto(ll[0], ll[ll.length - 1])) ll = ll.slice(0, -1);   // último = primeiro: fecha sozinho
        if (ll.length < 3) return aviso('O terreno precisa de pelo menos 3 vértices.');
        registrarMedida(L.polygon(ll), 'terreno');
    } else {
        if (ll.length < 2) return aviso('A linha precisa de pelo menos 2 pontos.');
        registrarMedida(L.polyline(ll), 'dist');
    }
    dlgDesenho.close();
    map.fitBounds(L.latLngBounds(ll), { padding: PADDING_MAPA });
}

function abrirDesenhoDescricao() {
    if (!dlgDesenho) criarDialogo();
    $('dd-fuso').value = String(UTM.fusoDe(map.getCenter().lng));
    dlgDesenho.showModal();
    resumirDesenho(dlgDesenho.querySelector('[data-dd-modo].ativo').dataset.ddModo);
}

/* =========================================================
   EXPORTAR KML
   ========================================================= */
const kmlCoords = pts => pts.map(p => `${p.lng.toFixed(9)},${p.lat.toFixed(9)},0`).join(' ');
const kmlLinha = (nome, pts, estilo, desc = '') =>
    `<Placemark><name>${escHtml(nome)}</name>${desc ? `<description>${escHtml(desc)}</description>` : ''}<styleUrl>#${estilo}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${kmlCoords(pts)}</coordinates></LineString></Placemark>`;
const kmlPoligono = (nome, aneis, estilo, desc = '') =>
    `<Placemark><name>${escHtml(nome)}</name>${desc ? `<description>${escHtml(desc)}</description>` : ''}<styleUrl>#${estilo}</styleUrl><Polygon>` +
    aneis.map((r, i) => `<${i ? 'innerBoundaryIs' : 'outerBoundaryIs'}><LinearRing><coordinates>${kmlCoords([...r, r[0]])}</coordinates></LinearRing></${i ? 'innerBoundaryIs' : 'outerBoundaryIs'}>`).join('') +
    `</Polygon></Placemark>`;

function exportarKml() {
    const itens = { medicoes: [], lados: [], camada: [] };
    const nomes = { dist: 'Distância', via: 'Largura da via', area: 'Área', terreno: 'Terreno (desenhado)' };
    if (medicoes) medicoes.eachLayer(l => {
        const t = l.medida.tipo;
        if (POLIGONO[t]) poligonosDe(l.getLatLngs()).forEach(p => itens.medicoes.push(kmlPoligono(`${nomes[t]} - ${fmtM2(areaDe([p]))}`, p, t)));
        else itens.medicoes.push(kmlLinha(`${nomes[t]} - ${fmtM(comprimento(l.getLatLngs()))}`, l.getLatLngs(), t));
    });
    if (currentLayer) percorrerPoligonos(currentLayer, pol => poligonosDe(pol.getLatLngs()).forEach(p =>
        itens.camada.push(kmlPoligono(`${mapaNome || 'Camada importada'} - ${fmtM2(areaDe([p]))}`, p, 'camada'))));
    ladosTerreno.forEach((l, i) => itens.lados.push(kmlLinha(`${l.frente ? 'FRENTE' : 'LATERAL/FUNDOS'} - ${fmtM(l.comp)}`, [l.a, l.b],
        l.frente ? 'frente' : 'lateral', `Lado ${i + 1} • ${l.frente ? 'frente' : 'lateral_fundos'} • ${fmt(l.comp, 3)} m`)));
    if (!itens.medicoes.length && !itens.camada.length && !itens.lados.length) return aviso('Não há desenhos no mapa para exportar.');

    // cores KML: aabbggrr
    const estilo = (id, linha, larg, pol = null) => `<Style id="${id}"><LineStyle><color>${linha}</color><width>${larg}</width></LineStyle>` +
        (pol ? `<PolyStyle><color>${pol}</color></PolyStyle>` : '<PolyStyle><fill>0</fill></PolyStyle>') + '</Style>';
    const pasta = (nome, lista) => lista.length ? `<Folder><name>${escHtml(nome)}</name>${lista.join('')}</Folder>` : '';
    const projeto = ($('inp-projeto').value || 'Projeto').trim();
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escHtml(projeto)} - desenhos UP! Urban Planning</name>
${estilo('dist', 'ffeb6325', 3)}${estilo('via', 'ff2626dc', 4)}${estilo('area', 'ffeb6325', 3, '1ff6823b')}${estilo('terreno', 'ff4aa316', 3, '265ec522')}
${estilo('camada', 'ff08b3ea', 3, '3308b3ea')}${estilo('frente', 'ff0c58ea', 6)}${estilo('lateral', 'ff695547', 4)}
${pasta('Medições', itens.medicoes)}${pasta('Camada importada', itens.camada)}${pasta('Lados do terreno (frente x lateral/fundos)', itens.lados)}
</Document></kml>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }));
    a.download = nomeSugerido().replace(/\.jsk$/, '') + '_desenhos.kml';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    aviso('KML exportado: ' + a.download);
}
