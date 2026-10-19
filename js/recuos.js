/* UP! Urban Planning — IMPLANTAÇÃO COM RECUOS (botão na tabela RECUOS MÍNIMOS)
   Desenha o terreno (KML / KMZ / SHP ou desenhado no mapa) com a FRENTE e as LATERAIS / FUNDOS marcadas no mapa,
   a faixa de recuo mínimo da zona (PDDUA, Anexo 8.2), a área edificável que sobra e as cotas: comprimento de cada
   lado e distância de cada recuo. As regras vêm do texto da tabela da zona, uma condição por linha:
   "IE maior que 2 - h/4 (mínimo 3,00 m)", "Térreo e 1º pavimento - Livre", "Demais pavimentos - 5,00 m"... */
'use strict';

let projetoIE = null;                       // IE do projeto (calculo.js)

/* =========================================================
   REGRAS DE RECUO: texto -> metros
   ========================================================= */
const numeroRegra = s => parseFloat(String(s).replace(',', '.'));

/* "IE entre 2 e menor que 6" -> { ie: true, min: [2, inclusivo], max: [6, exclusivo] }; "Térreo e 1º pavimento" -> piso */
function lerCondicao(texto) {
    const t = semAcento(texto).toLowerCase();
    const c = { piso: /terreo/.test(t) ? 'terreo' : /demais pav/.test(t) ? 'demais' : null, ie: /\bie\b/.test(t), min: null, max: null };
    let m;
    if ((m = t.match(/entre ([\d,]+) e menor que ([\d,]+)/))) { c.min = [numeroRegra(m[1]), true]; c.max = [numeroRegra(m[2]), false]; }
    else if ((m = t.match(/entre ([\d,]+) e ([\d,]+)/))) { c.min = [numeroRegra(m[1]), true]; c.max = [numeroRegra(m[2]), true]; }
    else {
        if ((m = t.match(/maior ou igual (?:a|que) ([\d,]+)/))) c.min = [numeroRegra(m[1]), true];
        else if ((m = t.match(/maior que ([\d,]+)/))) c.min = [numeroRegra(m[1]), false];
        if ((m = t.match(/menor que ([\d,]+)/))) c.max = [numeroRegra(m[1]), false];
        else if ((m = t.match(/ate ([\d,]+)/))) c.max = [numeroRegra(m[1]), true];
    }
    return c;
}
const atendeIE = (c, ie) => (!c.min || (c.min[1] ? ie >= c.min[0] : ie > c.min[0])) && (!c.max || (c.max[1] ? ie <= c.max[0] : ie < c.max[0]));

/* "Livre" -> 0; "5,00 m" -> 5; "h/6 (mínimo 3,00 m)" -> max(h/6, 3) */
function lerValor(texto) {
    const limpo = texto.replace(/\(\d+\)/g, '').trim();             // sem as referências a notas, ex.: "(2)"
    const t = semAcento(limpo).toLowerCase();
    let m;
    if (/livre/.test(t)) return { texto: 'Livre', calc: () => 0 };
    if ((m = t.match(/h\s*\/\s*(\d+(?:,\d+)?)/))) {
        const div = numeroRegra(m[1]), mn = t.match(/minimo\s*(?:de\s*)?([\d,]+)/), minimo = mn ? numeroRegra(mn[1]) : 0;
        return { texto: limpo, usaH: true, calc: h => (h > 0 ? Math.max(h / div, minimo) : null) };
    }
    if ((m = t.match(/(\d+(?:,\d+)?)\s*m\b/))) { const v = numeroRegra(m[1]); return { texto: limpo, calc: () => v }; }
    return { texto: limpo, calc: () => null };                      // texto que o sistema não sabe interpretar
}

/* Recuo exigido por uma regra para o IE e a altura h do projeto. Devolve { terreo, demais, porPiso }, cada um
   { valor (m; 0 = livre; null = falta dado), linha (texto da regra aplicada), falta (o que falta informar) } */
function avaliarRegra(regra, { ie, h }) {
    const linhas = String(regra || '').split('\n').map(l => l.trim()).filter(l => l && l !== '-').map(l => {       // "-" = sem regra
        const i = l.indexOf(' - ');
        return { texto: l, cond: lerCondicao(i >= 0 ? l.slice(0, i) : ''), valor: lerValor(i >= 0 ? l.slice(i + 3) : l) };
    });
    const resolver = l => {
        const v = l.valor.calc(h);
        return { valor: v, linha: l.texto, falta: v == null ? (l.valor.usaH ? 'altura h da edificação' : 'regra não reconhecida') : null };
    };
    const outras = linhas.filter(l => l.cond.piso !== 'terreo');
    let demais;
    if (!linhas.length) demais = { valor: null, linha: 'sem regra na tabela da zona', falta: null, semRegra: true };
    else if (outras.some(l => l.cond.ie) && !(ie > 0)) demais = { valor: null, linha: 'depende do IE', falta: 'IE do projeto (quadro de áreas)' };
    else {
        const l = outras.find(x => !x.cond.ie || atendeIE(x.cond, ie));
        demais = l ? resolver(l) : { valor: 0, linha: 'Livre (o IE do projeto não está em nenhuma faixa da regra)', falta: null };
    }
    const lt = linhas.find(l => l.cond.piso === 'terreo');
    return { terreo: lt ? resolver(lt) : demais, demais, porPiso: !!lt };
}

const recuosDoImovel = () => { const zu = zonaDoBairro($('inp-bairro').value); return zu ? { zona: zu.zona, rec: recuosDaZona(zu.zona) } : null; };
/* Altura h (PDDUA, Art. 38, § 1º): do piso do térreo até a laje do piso do último pavimento + 3 m.
   Com a altura informada na tabela RECUOS MÍNIMOS: h = altura + 3; sem ela, estimada pelo maior nº de pavimentos x 3 m
   (último piso a (pav - 1) x 3 m do térreo, + 3 m). Devolve { h, altura, estimada, pav } */
function alturaH() {
    const altura = vazio('inp-altura-edif') ? null : parseBR($('inp-altura-edif').value);
    const { acrescimo, peDireitoEstimado } = REGRAS.ALTURA;
    if (altura > 0) return { h: altura + acrescimo, altura, estimada: false };
    const pav = Math.max(0, ...tipologias.map(t => parseInt(t.pav, 10) || 0));
    return pav ? { h: pav * peDireitoEstimado, estimada: true, pav } : { h: null };
}
const textoRecuo = r => r.semRegra ? 'sem regra na zona' : r.falta ? 'informe ' + r.falta : r.valor === 0 ? 'Livre' : fmt(r.valor) + ' m';

/* =========================================================
   GEOMETRIA (metros, plano local)
   ========================================================= */
/* Anéis do terreno: [{ a: [x, y], b: [x, y], frente, comp }] em metros, na ordem dos lados */
function aneisDoTerreno() {
    const lados = ladosDoTerreno();
    if (!lados.length) return [];
    const ll = p => L.latLng(p.lat, p.lng);
    const pr = projecaoLocal(lados.flatMap(l => [ll(l.de), ll(l.para)])).para;
    const grupos = new Map();
    lados.forEach(l => {
        if (!grupos.has(l.anel)) grupos.set(l.anel, []);
        grupos.get(l.anel).push({ a: pr(ll(l.de)), b: pr(ll(l.para)), frente: l.tipo === 'frente', comp: l.comprimento });
    });
    return [...grupos.values()];
}
const areaPoligono = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

/* Recua cada lado para dentro pela sua distância e cruza as linhas vizinhas: polígono da área edificável */
function recuarAnel(lados, distancia) {
    const sentido = areaPoligono(lados.map(l => l.a)) > 0 ? 1 : -1;      // anti-horário: o interior fica à esquerda
    const linhas = lados.map(l => {
        const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], n = Math.hypot(dx, dy) || 1, d = distancia(l);
        const nx = -dy / n * sentido, ny = dx / n * sentido;
        return { p: [l.a[0] + nx * d, l.a[1] + ny * d], dir: [dx / n, dy / n], normal: [nx, ny], d };
    });
    const dMax = Math.max(1, ...linhas.map(l => l.d));
    const vertices = linhas.map((B, i) => {
        const A = linhas[(i - 1 + linhas.length) % linhas.length];
        const cruz = A.dir[0] * B.dir[1] - A.dir[1] * B.dir[0];
        if (Math.abs(cruz) < 1e-9) return B.p;                          // lados alinhados
        const t = ((B.p[0] - A.p[0]) * B.dir[1] - (B.p[1] - A.p[1]) * B.dir[0]) / cruz;
        const v = [A.p[0] + A.dir[0] * t, A.p[1] + A.dir[1] * t];
        return Math.hypot(v[0] - lados[i].a[0], v[1] - lados[i].a[1]) > 10 * dMax ? B.p : v;   // ângulo muito agudo
    });
    const area = areaPoligono(vertices) * sentido;
    return { vertices, linhas, sentido, valido: area > 0.01, area: Math.max(0, area) };
}

/* =========================================================
   DESENHO (SVG)
   ========================================================= */
const COR = { frente: '#EA580C', lateral: '#334155', recuo: '#DC2626', edif: '#16A34A', cota: '#0F172A' };

function desenharImplantacao(aneisM, cfg) {
    // gira para a frente (o maior lado de frente) ficar embaixo, na horizontal
    let rot = 0;
    const frentes = aneisM.flatMap(a => a.filter(l => l.frente));
    if (cfg.frenteEmbaixo && frentes.length) {
        const f = frentes.reduce((m, l) => (l.comp > m.comp ? l : m));
        const anel = aneisM.find(a => a.includes(f));
        const sentido = areaPoligono(anel.map(l => l.a)) > 0 ? 1 : -1;
        rot = -Math.atan2(f.b[1] - f.a[1], f.b[0] - f.a[0]) + (sentido < 0 ? Math.PI : 0);
    }
    const [c, s] = [Math.cos(rot), Math.sin(rot)], R = ([x, y]) => [x * c - y * s, x * s + y * c];
    const aneis = aneisM.map(a => a.map(l => ({ ...l, a: R(l.a), b: R(l.b) })));
    const recuados = aneis.map(a => recuarAnel(a, l => (l.frente ? cfg.dFrente : cfg.dLateral) || 0));

    // enquadramento: x para a direita, y para cima (no SVG, y para baixo)
    const pts = aneis.flatMap(a => a.map(l => l.a));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const W = 1000, MARGEM = 70, LEG = 120;
    const esc = Math.min((W - 2 * MARGEM) / Math.max(x1 - x0, 1), 620 / Math.max(y1 - y0, 1));
    const H = Math.round((y1 - y0) * esc + 2 * MARGEM + LEG);
    const P = ([x, y]) => [MARGEM + (x - x0) * esc + (W - 2 * MARGEM - (x1 - x0) * esc) / 2, MARGEM + (y1 - y) * esc];
    const f1 = v => v.toFixed(1), pt = p => P(p).map(f1).join(','), caminho = vs => 'M' + vs.map(pt).join('L') + 'Z';
    const halo = 'paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round"';
    const textoAo = (x, y, ang, txt, extra = '') => {
        let g = ang * 180 / Math.PI;
        if (g > 90) g -= 180; else if (g < -90) g += 180;              // texto sempre de pé
        return `<text x="${f1(x)}" y="${f1(y)}" transform="rotate(${g.toFixed(1)} ${f1(x)} ${f1(y)})" text-anchor="middle" dominant-baseline="middle" ${halo} ${extra}>${escHtml(txt)}</text>`;
    };
    const muitos = aneis.reduce((n, a) => n + a.length, 0) > 40;
    const out = [];

    // faixa de recuo (terreno menos área edificável, hachurada), área edificável, lados e cotas
    aneis.forEach((anel, k) => {
        const r = recuados[k], lote = anel.map(l => l.a);
        out.push(`<path d="${caminho(lote)}${r.valido ? ' ' + caminho(r.vertices) : ''}" fill="url(#hachura)" fill-rule="evenodd" stroke="none"/>`);
        if (r.valido) out.push(`<path d="${caminho(r.vertices)}" fill="${COR.edif}" fill-opacity=".10" stroke="${COR.edif}" stroke-width="2" stroke-dasharray="9 5"/>`);
        anel.forEach(l => out.push(`<line x1="${f1(P(l.a)[0])}" y1="${f1(P(l.a)[1])}" x2="${f1(P(l.b)[0])}" y2="${f1(P(l.b)[1])}" stroke="${l.frente ? COR.frente : COR.lateral}" stroke-width="${l.frente ? 6 : 3}" stroke-linecap="round"/>`));
        anel.forEach((l, i) => {
            const [ax, ay] = P(l.a), [bx, by] = P(l.b), len = Math.hypot(bx - ax, by - ay);
            if (len < 8) return;
            const ux = (bx - ax) / len, uy = (by - ay) / len;
            const nx = r.linhas[i].normal[0], ny = -r.linhas[i].normal[1];    // normal para dentro, em coordenadas de tela
            const ang = Math.atan2(by - ay, bx - ax);
            // cota do lado: por fora, paralela, com linhas de chamada e traços a 45°
            if (!muitos || len > 45) {
                const o = 26, [px, py] = [-nx * o, -ny * o];
                const [cx1, cy1, cx2, cy2] = [ax + px, ay + py, bx + px, by + py];
                const traco = (x, y) => `<line x1="${f1(x - (ux + nx) * 5)}" y1="${f1(y - (uy + ny) * 5)}" x2="${f1(x + (ux + nx) * 5)}" y2="${f1(y + (uy + ny) * 5)}" stroke="${COR.cota}" stroke-width="1.4"/>`;
                out.push(`<g class="cota-lado"><line x1="${f1(ax - nx * 4)}" y1="${f1(ay - ny * 4)}" x2="${f1(cx1 - nx * 6)}" y2="${f1(cy1 - ny * 6)}" stroke="#94A3B8" stroke-width=".8"/>`
                    + `<line x1="${f1(bx - nx * 4)}" y1="${f1(by - ny * 4)}" x2="${f1(cx2 - nx * 6)}" y2="${f1(cy2 - ny * 6)}" stroke="#94A3B8" stroke-width=".8"/>`
                    + `<line x1="${f1(cx1)}" y1="${f1(cy1)}" x2="${f1(cx2)}" y2="${f1(cy2)}" stroke="${COR.cota}" stroke-width="1"/>${traco(cx1, cy1)}${traco(cx2, cy2)}`
                    + textoAo((cx1 + cx2) / 2 - nx * 11, (cy1 + cy2) / 2 - ny * 11, ang, (l.frente ? 'FRENTE  ' : '') + fmt(l.comp) + ' m',
                        `font-size="13" font-weight="700" fill="${l.frente ? COR.frente : COR.cota}"`) + '</g>');
            }
            // cota do recuo: do meio do lado até a linha recuada, com setas
            const d = r.linhas[i].d;
            if (d > 0 && r.valido && len > (muitos ? 70 : 30)) {
                const [mx, my] = [(ax + bx) / 2, (ay + by) / 2], [ex, ey] = [mx + nx * d * esc, my + ny * d * esc];
                out.push(`<g class="cota-recuo"><line x1="${f1(mx)}" y1="${f1(my)}" x2="${f1(ex)}" y2="${f1(ey)}" stroke="${COR.recuo}" stroke-width="1.6" marker-start="url(#seta)" marker-end="url(#seta)"/>`
                    + textoAo((mx + ex) / 2 + ux * 30, (my + ey) / 2 + uy * 30, ang, fmt(d) + ' m', `font-size="12.5" font-weight="800" fill="${COR.recuo}"`) + '</g>');   // ao lado da seta, paralelo ao lado
            }
        });
        const tela = r.vertices.map(P), larguraTela = Math.max(...tela.map(p => p[0])) - Math.min(...tela.map(p => p[0]));
        const alturaTela = Math.max(...tela.map(p => p[1])) - Math.min(...tela.map(p => p[1]));
        if (r.valido && larguraTela > 120 && alturaTela > 40) {          // rótulo da área edificável no centro (só se couber)
            const cx = r.vertices.reduce((a, p) => a + p[0], 0) / r.vertices.length, cy = r.vertices.reduce((a, p) => a + p[1], 0) / r.vertices.length;
            const [tx, ty] = P([cx, cy]);
            out.push(`<text x="${f1(tx)}" y="${f1(ty - 8)}" text-anchor="middle" font-size="12" font-weight="800" fill="${COR.edif}" ${halo}>ÁREA EDIFICÁVEL</text>`
                + `<text x="${f1(tx)}" y="${f1(ty + 9)}" text-anchor="middle" font-size="12" font-weight="600" fill="${COR.edif}" ${halo}>${fmt(r.area)} m²</text>`);
        }
    });

    // norte (girado junto com o desenho) e escala gráfica
    const [nx0, ny0] = [W - 46, 46], [sN, cN] = [Math.sin(rot), Math.cos(rot)];      // norte = (0, 1) girado; na tela y é para baixo
    out.push(`<g><circle cx="${nx0}" cy="${ny0}" r="22" fill="#fff" stroke="#CBD5E1"/><g transform="translate(${nx0} ${ny0}) rotate(${(-rot * 180 / Math.PI).toFixed(1)})"><path d="M0,-18 L7,8 L0,3 L-7,8 Z" fill="#0F172A"/></g>`
        + `<text x="${f1(nx0 - sN * 32)}" y="${f1(ny0 - cN * 32)}" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="800" fill="#0F172A">N</text></g>`);
    const alvo = (W - 2 * MARGEM) / esc / 5, mag = Math.pow(10, Math.floor(Math.log10(alvo)));
    const passo = [1, 2, 5, 10].map(m => m * mag).find(v => v >= alvo) || alvo, larg = passo * esc;
    const ye = H - LEG + 18;
    out.push(`<g transform="translate(${MARGEM} ${ye})"><rect width="${f1(larg / 2)}" height="6" fill="#0F172A"/><rect x="${f1(larg / 2)}" width="${f1(larg / 2)}" height="6" fill="#fff" stroke="#0F172A"/>`
        + `<text y="20" font-size="11" fill="#334155">0</text><text x="${f1(larg)}" y="20" font-size="11" fill="#334155" text-anchor="middle">${fmt(passo, passo < 1 ? 2 : 0)} m</text></g>`);

    // legenda
    const yl = H - LEG + 50, item = (x, simb, txt) => `<g transform="translate(${x} ${yl})">${simb}<text x="34" y="5" font-size="12" fill="#1E293B" dominant-baseline="middle">${txt}</text></g>`;
    out.push(item(MARGEM, `<line x1="0" y1="5" x2="26" y2="5" stroke="${COR.frente}" stroke-width="6" stroke-linecap="round"/>`, 'FRENTE')
        + item(MARGEM + 130, `<line x1="0" y1="5" x2="26" y2="5" stroke="${COR.lateral}" stroke-width="3"/>`, 'LATERAIS / FUNDOS')
        + item(MARGEM + 310, `<rect y="-3" width="26" height="16" fill="url(#hachura)" stroke="${COR.recuo}" stroke-width=".8"/>`, 'FAIXA DE RECUO')
        + item(MARGEM + 470, `<rect y="-3" width="26" height="16" fill="${COR.edif}" fill-opacity=".12" stroke="${COR.edif}" stroke-dasharray="5 3" stroke-width="1.5"/>`, 'ÁREA EDIFICÁVEL'));
    cfg.legenda.forEach((l, i) => out.push(`<text x="${MARGEM}" y="${yl + 30 + i * 17}" font-size="11.5" fill="#334155">${escHtml(l)}</text>`));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, Arial, sans-serif">
<defs><pattern id="hachura" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#FEF2F2"/><line x1="0" y1="0" x2="0" y2="9" stroke="${COR.recuo}" stroke-width="1.3" stroke-opacity=".55"/></pattern>
<marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 Z" fill="${COR.recuo}"/></marker></defs>
<rect width="100%" height="100%" fill="#fff"/>
${out.join('\n')}
</svg>`;
    return { svg, recuados };
}

/* =========================================================
   JANELA
   ========================================================= */
let dlgRecuos = null, svgRecuos = '';

function criarDialogoRecuos() {
    dlgRecuos = document.createElement('dialog');
    dlgRecuos.className = 'dlg-recuos no-print';
    dlgRecuos.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-3">
        <h3 class="font-extrabold text-[#1B2E24] text-sm sm:text-base"><i class="fa-solid fa-pen-ruler text-[#2E7D32]"></i> IMPLANTAÇÃO E RECUOS MÍNIMOS</h3>
        <button type="button" data-rc="fechar" class="text-slate-500 hover:text-slate-800 text-lg" title="Fechar (Esc)"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="rc-controles">
        <label><span class="cu-rotulo">ZONA</span><input id="rc-zona" class="cu-input" readonly></label>
        <label><span class="cu-rotulo">IE DO PROJETO</span><input id="rc-ie" class="cu-input" inputmode="decimal" placeholder="ex.: 2,5"></label>
        <label><span class="cu-rotulo">ALTURA h (m)</span><input id="rc-h" class="cu-input" inputmode="decimal" placeholder="ex.: 21,00"></label>
        <label id="rc-piso-box"><span class="cu-rotulo">PAVIMENTO</span>
          <select id="rc-piso" class="cu-input"><option value="demais">DEMAIS PAVIMENTOS</option><option value="terreo">TÉRREO E 1º PAVIMENTO</option></select></label>
        <label class="rc-check"><input type="checkbox" id="rc-oodc"> COM OODC / TDC</label>
        <label class="rc-check"><input type="checkbox" id="rc-girar" checked> FRENTE EMBAIXO</label>
      </div>
      <div id="rc-avisos" class="space-y-1 my-2"></div>
      <div id="rc-resumo" class="rc-resumo"></div>
      <div id="rc-desenho" class="rc-desenho"></div>
      <div class="flex flex-wrap items-center justify-between gap-2 mt-3">
        <span class="text-[10.5px] text-slate-500">h = altura do piso do térreo até a laje do piso do último pavimento + ${fmt(REGRAS.ALTURA.acrescimo)} m (tabela RECUOS MÍNIMOS; sem ela, estimada por pavimentos x ${fmt(REGRAS.ALTURA.peDireitoEstimado)} m). Pode ser alterada aqui. Desenho em escala, a partir dos limites do terreno.</span>
        <span class="flex gap-2"><button type="button" data-rc="png" class="cu-btn"><i class="fa-solid fa-image"></i> Baixar PNG</button>
          <button type="button" data-rc="svg" class="cu-btn"><i class="fa-solid fa-file-code"></i> Baixar SVG</button></span>
      </div>`;
    document.body.appendChild(dlgRecuos);
    dlgRecuos.addEventListener('input', renderRecuos);
    dlgRecuos.addEventListener('change', renderRecuos);
    dlgRecuos.addEventListener('click', e => {
        const b = e.target.closest('[data-rc]');
        if (e.target === dlgRecuos || (b && b.dataset.rc === 'fechar')) dlgRecuos.close();
        else if (b && b.dataset.rc === 'svg') baixarArquivo(new Blob([svgRecuos], { type: 'image/svg+xml' }), nomeImplantacao('svg'));
        else if (b && b.dataset.rc === 'png') baixarPng();
    });
}

function abrirRecuos() {
    if (!dlgRecuos) criarDialogoRecuos();
    calcularTudo();
    const z = recuosDoImovel(), { h } = alturaH();
    $('rc-zona').value = z ? z.zona : '-';
    $('rc-ie').value = projetoIE ? fmt(projetoIE) : '';
    $('rc-h').value = h ? fmt(h) : '';
    $('rc-oodc').checked = $('inp-aplicar-oodc').value === 'SIM';
    renderRecuos();
    dlgRecuos.showModal();
}

function renderRecuos() {
    const z = recuosDoImovel(), aneis = aneisDoTerreno();
    const ie = parseBR($('rc-ie').value) || null, h = parseBR($('rc-h').value) || null;
    const oodc = $('rc-oodc').checked, piso = $('rc-piso').value;
    const avisos = [];
    const regraLat = z && z.rec ? (oodc ? z.rec.lateralOodc : z.rec.lateral) : '';
    const rf = avaliarRegra(z && z.rec ? z.rec.frente : '', { ie, h }), rl = avaliarRegra(regraLat, { ie, h });
    $('rc-piso-box').classList.toggle('hidden', !rf.porPiso && !rl.porPiso);
    const doPiso = r => (piso === 'terreo' ? r.terreo : r.demais);
    const F = doPiso(rf), Lt = doPiso(rl);

    if (!aneis.length) avisos.push(['fail', 'Nenhum terreno no mapa: carregue o KML / KMZ / SHP ou desenhe o terreno (aba Imóvel, grupo TERRENO).']);
    else if (!aneis.some(a => a.some(l => l.frente))) avisos.push(['warn', 'Nenhum lado marcado como FRENTE: no mapa, clique no(s) lado(s) da frente. Por enquanto todos são LATERAIS / FUNDOS.']);
    if (!z) avisos.push(['warn', 'Informe o BAIRRO (aba Imóvel) para saber a zona e os recuos mínimos.']);
    [['Frente', F], ['Laterais / fundos', Lt]].forEach(([n, r]) => { if (z && r.falta) avisos.push(['warn', `${n}: informe ${r.falta} para calcular o recuo.`]); });
    $('rc-avisos').innerHTML = avisos.map(([t, m]) => `<p class="obs-msg obs-${t === 'fail' ? 'fail' : 'warn'}">${escHtml(m)}</p>`).join('');

    const linha = (rot, r, regra) => `<div><b>${rot}</b><span class="rc-valor">${escHtml(textoRecuo(r))}</span><span class="rc-regra">${escHtml(r.falta ? (regra || '-').replace(/\n/g, ' • ') : r.linha)}</span></div>`;
    $('rc-resumo').innerHTML = z ? linha('FRENTE', F, z.rec && z.rec.frente) + linha(oodc ? 'LATERAIS / FUNDOS (OODC / TDC)' : 'LATERAIS / FUNDOS', Lt, regraLat) : '';

    if (!aneis.length) { $('rc-desenho').innerHTML = ''; svgRecuos = ''; return; }
    const legenda = [
        `Zona ${z ? z.zona : '-'}  •  IE ${ie ? fmt(ie) : '-'}  •  h = ${h ? fmt(h) + ' m' : '-'}  •  ${piso === 'terreo' && (rf.porPiso || rl.porPiso) ? 'Térreo e 1º pavimento' : 'Demais pavimentos'}${oodc ? '  •  com OODC / TDC' : ''}`,
        `Recuo de frente: ${textoRecuo(F)}  •  Recuos laterais e fundos: ${textoRecuo(Lt)}  (PDDUA, Anexo 8.2 - Recuos mínimos)`
    ];
    const { svg, recuados } = desenharImplantacao(aneis, { dFrente: F.valor || 0, dLateral: Lt.valor || 0, frenteEmbaixo: $('rc-girar').checked, legenda });
    svgRecuos = svg;
    $('rc-desenho').innerHTML = svg;
    if (recuados.some(r => !r.valido) && (F.valor || Lt.valor)) {
        $('rc-avisos').insertAdjacentHTML('beforeend', '<p class="obs-msg obs-fail">Os recuos não cabem no terreno: não sobra área edificável.</p>');
    }
}

/* ---------- arquivos ---------- */
const nomeImplantacao = ext => `Implantacao_recuos - ${($('inp-projeto').value || 'projeto').trim()}.${ext}`;
function baixarArquivo(blob, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function baixarPng() {
    if (!svgRecuos) return;
    const img = new Image();
    img.onload = () => {
        const cv = document.createElement('canvas'), k = 2;                // 2x: boa resolução para relatório
        cv.width = img.width * k; cv.height = img.height * k;
        const ctx = cv.getContext('2d');
        ctx.scale(k, k);
        ctx.drawImage(img, 0, 0);
        try { cv.toBlob(b => baixarArquivo(b, nomeImplantacao('png')), 'image/png'); }
        catch (e) { aviso('Não foi possível gerar o PNG neste navegador; use "Baixar SVG".'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgRecuos);
}

function initRecuos() {
    document.querySelectorAll('.btn-recuos').forEach(b => b.addEventListener('click', abrirRecuos));
}
