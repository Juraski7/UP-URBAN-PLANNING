/* UP! Urban Planning — aba COMPARTIMENTOS: compartimentos do projeto x Código de Obras
   • Cada compartimento: nome (padrão "COMPARTIMENTO", editável), permanência (Art. 107 a 109),
     classificação (lista da permanência), dimensões (largura, comprimento, área, pé-direito) e aberturas (largura x altura).
   • Verificações (tabelas da planilha lidas em js/tabelas.js; parâmetros em js/regras.js):
     CO_GEOMETRIA (Art. 113): a menor dimensão (largura ou comprimento) não pode ser inferior ao diâmetro mínimo
       do círculo no plano do piso, pela faixa de área do compartimento;
     CO_BANHEIROS (Art. 115): banheiros, lavabos e instalações sanitárias no lugar do Art. 113: área mínima da instalação
       única ou de cada uma, quando há mais de uma entre os compartimentos;
     CO_PE_DIREITO (Art. 114): pé-direito mínimo pela permanência;
     CO_ABERTURAS (Art. 124): soma das aberturas ≥ fração da área do compartimento, nunca menor que o mínimo.
   • Desenho: retângulo largura x comprimento, em escala, com o círculo mínimo no centro (verde cabe / vermelho não cabe).
     Aberturas (J) e portas (P) são posicionadas clicando na parede; o usuário digita a distância a uma das paredes vizinhas e a outra
     é calculada (parede - largura da abertura - distância digitada). Sem distância digitada, a abertura fica centralizada.
   • No projeto (.jsk) a lista fica no campo oculto inp-comodos (JSON). */
'use strict';

/* =========================================================
   VERIFICAÇÕES
   Cada uma devolve { s, label, exig: [linhas da coluna EXIGIDO], obs: { s, texto } }
   ========================================================= */
const ehBanheiro = c => /BANHEIRO|LAVABO|SANITARI/.test(chave(c.classe));
const pendente = 'TABELA PENDENTE';
const areaDe2 = (a, b) => { const x = parseBR(a), y = parseBR(b); return x > 0 && y > 0 ? x * y : 0; };
const nomePerm = perm => CO_COMPARTIMENTOS[perm].titulo.toLowerCase();
const especial = (artigo, texto) => ({ s: 'na', label: 'VER CÓDIGO', exig: ['FIXADO NO CÓDIGO'], obs: { s: 'warn', texto: `OBS.: ${texto} (${artigo}).` } });

/* Art. 114: pé-direito do projeto x mínimo da permanência */
function avaliarPeDireito(c) {
    const R = REGRAS.CO_PE_DIREITO;
    if (!R) return { s: 'na', label: pendente, exig: ['-'] };
    if (!c.perm) return { s: 'na', exig: ['-'] };
    const min = R.minimo[c.perm];
    if (min == null) return especial('Art. 114, § 2º', 'Compartimentos especiais têm o pé-direito fixado no Código de Obras para a destinação');
    const pe = parseBR(c.pe), exig = [`Mín. ${fmt(min)} m`];
    if (!(pe > 0)) return { s: 'na', exig };
    const s = pe + 1e-9 >= min ? 'ok' : 'fail';
    return { s, exig, obs: s === 'fail' ? { s, texto: `OBS.: O pé-direito (${fmt(pe)} m) é inferior ao mínimo de ${fmt(min)} m para ${nomePerm(c.perm)} (${R.fonte}).` } : null };
}

/* Art. 115: área da instalação sanitária (única na edificação ou cada uma, quando há mais de uma entre os compartimentos) */
function avaliarBanheiro(c, area) {
    const R = REGRAS.CO_BANHEIROS;
    if (!R) return { s: 'na', area, label: pendente, exig: ['CO_BANHEIROS'] };
    const qtd = comodos.filter(ehBanheiro).length, varios = qtd > 1;
    const min = varios ? R.areaCada : R.areaUnico;
    const exig = [varios ? `${qtd} instalações sanitárias: cada uma` : 'Instalação sanitária única', `Mín. ${fmt(min)} m²`];
    if (!area) return { s: 'na', area, exig };
    const s = area + 1e-9 >= min ? 'ok' : 'fail';
    const conter = varios ? 'bacia sanitária e lavatório (e dispositivo para banho em pelo menos uma)' : 'bacia sanitária, lavatório e dispositivo para banho';
    return { s, area, exig, obs: { s, texto: s === 'fail'
        ? `OBS.: A área (${fmt(area)} m²) é inferior ao mínimo de ${fmt(min)} m² ${varios ? 'de cada instalação sanitária, quando há mais de uma' : 'da instalação sanitária única'} (${R.fonte}, item ${varios ? 2 : 1}).`
        : `OBS.: A área (${fmt(area)} m²) atende o mínimo de ${fmt(min)} m² (${R.fonte}, item ${varios ? 2 : 1}). Deve conter ${conter}.` } };
}

/* Art. 113: menor dimensão x diâmetro mínimo (banheiros: Art. 115). Devolve também { area, regra } */
function avaliarGeometria(c) {
    const area = areaDe2(c.larg, c.comp);
    if (ehBanheiro(c)) return avaliarBanheiro(c, area);
    if (!area) return { s: 'na', area, exig: ['-'] };
    const regra = regraGeometria(area), menor = Math.min(parseBR(c.larg), parseBR(c.comp));
    if (!regra) return { s: 'na', area, label: pendente, exig: ['-'] };
    const s = menor + 1e-9 >= regra.diametro ? 'ok' : 'fail', fonte = REGRAS.CO_GEOMETRIA.fonte;
    return { s, area, regra, exig: [regra.texto, `Ø mín. ${fmt(regra.diametro)} m`], obs: { s, texto: s === 'fail'
        ? `OBS.: A menor dimensão (${fmt(menor)} m) é inferior ao diâmetro mínimo do círculo no plano do piso (Ø ${fmt(regra.diametro)} m) para ${fmt(area)} m² (${regra.texto}; ${fonte}).`
        : `OBS.: O compartimento comporta o círculo de Ø ${fmt(regra.diametro)} m exigido para ${fmt(area)} m² (${fonte}).` } };
}

/* Área ventilada de uma abertura, digitada em m² ("0,60", "0,6 m²", "0,60m2") ou em % da área da abertura ("50%").
   Devolve m² (null = vazio, NaN = não entendido) */
function areaVentilada(txt, areaAbertura) {
    const t = String(txt ?? '').trim();
    if (!t) return null;
    const pct = t.includes('%'), n = t.replace(/m\s*[²2]/gi, '').replace(/[^\d.,]/g, '');
    const v = n ? numeroBR(n) : NaN;
    if (!Number.isFinite(v) || v < 0) return NaN;
    return pct ? areaAbertura * v / 100 : v;
}

/* Art. 124: soma das aberturas x fração da área do compartimento (nunca menor que o mínimo da permanência)
   e área ventilada (informada por abertura) x parte da área exigida que deve ventilar */
function avaliarAberturas(c) {
    const R = REGRAS.CO_ABERTURAS;
    const areas = c.aberturas.map(ab => areaDe2(ab.larg, ab.alt));
    const vents = c.aberturas.map((ab, a) => areaVentilada(ab.vent, areas[a]));
    const total = areas.reduce((t, x) => t + x, 0);
    const ventTotal = vents.reduce((t, v, a) => t + (Number.isFinite(v) ? Math.min(v, areas[a] || v) : 0), 0);   // não passa da área da abertura
    const base = { total, ventTotal, vents };
    if (!R) return { ...base, s: 'na', label: pendente, exig: ['-'] };
    if (!c.perm) return { ...base, s: 'na', exig: ['-'] };
    if (!(c.perm in R.fracao)) {                                    // permanência sem fração na tabela (especiais: "VALIDAR E CONSULTA")
        const txt = R.semRegra[c.perm] || 'VER CÓDIGO';
        return { ...base, s: 'na', label: txt, exig: [txt], obs: { s: 'warn', texto: `OBS.: Aberturas de ${nomePerm(c.perm)}: ${txt.toLowerCase()} (sem regra numérica na tabela; ${R.fonte}).` } };
    }
    const fr = R.fracao[c.perm], frTxt = R.fracaoTexto[c.perm], minAbs = R.minimo[c.perm], vt = R.ventilacao[c.perm], areaC = areaDe2(c.larg, c.comp);
    if (!areaC) return { ...base, s: 'na', exig: [`${frTxt} da área do compartimento`, `Mín. ${fmt(minAbs)} m²`] };
    const exigida = Math.max(areaC * fr, minAbs), ventExig = vt ? exigida * vt : 0;
    // exigido = fração da área do COMPARTIMENTO (Art. 124, item 1); o projeto é a soma das aberturas
    const exig = [`${frTxt} da área do compartimento`, `(${fmt(areaC)} m²) = ${fmt(areaC * fr)} m²`, `Mín. ${fmt(exigida)} m²`]
        .concat(vt ? [`ventilada ≥ ${fmt(ventExig)} m²`] : []);
    if (!total) return { ...base, s: 'na', exig };

    const fonte = R.fonte, msgs = [];
    const ilegiveis = vents.map((v, a) => Number.isNaN(v) ? a + 1 : 0).filter(Boolean);
    const maiores = vents.map((v, a) => Number.isFinite(v) && v > areas[a] + 1e-9 ? a + 1 : 0).filter(Boolean);
    if (ilegiveis.length) msgs.push(`Área ventilada não entendida na abertura ${ilegiveis.join(', ')}: use m² (ex.: 0,60 m²) ou % (ex.: 50%).`);
    if (maiores.length) msgs.push(`Área ventilada maior que a área da abertura ${maiores.join(', ')}: considerada a área da abertura.`);
    const areaOk = total + 1e-9 >= exigida;
    const informada = vents.some(v => Number.isFinite(v));
    const ventOk = !vt || (informada && ventTotal + 1e-9 >= ventExig);
    let s, label;
    if (!areaOk) s = 'fail';
    else if (vt && !informada) { s = 'na'; label = 'INFORMAR VENTILADA'; }
    else s = ventOk ? 'ok' : 'fail';
    const txtArea = areaOk ? `As aberturas (${fmt(total)} m²) atendem o mínimo de ${fmt(exigida)} m²`
        : `A área das aberturas (${fmt(total)} m²) é inferior ao mínimo de ${fmt(exigida)} m² (${frTxt} da área do compartimento, nunca menos que ${fmt(minAbs)} m²)`;
    const txtVent = !vt ? '' : !informada ? `; informe a área ventilada de cada abertura (em m² ou %): exigido ${fmt(ventExig)} m²`
        : ventOk ? `; a área ventilada (${fmt(ventTotal)} m²) atende o mínimo de ${fmt(ventExig)} m²`
        : `; a área ventilada (${fmt(ventTotal)} m²) é inferior ao mínimo de ${fmt(ventExig)} m² (${fmt(vt * 100, 0)}% da área exigida)`;
    return { ...base, s, label, exig, obs: { s: s === 'na' ? 'warn' : s, texto: `OBS.: ${txtArea}${txtVent} (${fonte}).${msgs.length ? ' ' + msgs.join(' ') : ''}` } };
}

/* =========================================================
   ESTADO
   ========================================================= */
// parede: 'sup' | 'inf' | 'esq' | 'dir' ('' = não posicionada); dist: distância digitada; ref: 'a' (da 1ª parede vizinha) | 'b' (da 2ª)
const ABERTURA_VAZIA = () => ({ larg: '', alt: '', vent: '', parede: '', dist: '', ref: '' });
const PORTA_VAZIA = () => ({ larg: '', parede: '', dist: '', ref: '' });             // porta: só a largura (e a posição no desenho)
const comodoVazio = () => ({ nome: 'COMPARTIMENTO', perm: '', classe: '', larg: '', comp: '', pe: '', aberturas: [ABERTURA_VAZIA()], portas: [PORTA_VAZIA()], desenho: false });
let comodos = [comodoVazio()];
const nCo = i => String(i + 1).padStart(2, '0');
const idCo = (i, c) => `co${i + 1}-${c}`;                     // destino das pendências
const CAMPO_M = 'type="text" inputmode="decimal" data-mask="metro"';

function guardarComodos() { $('inp-comodos').value = JSON.stringify(comodos.map(({ desenho, selDes, ...c }) => c)); }

const opcoes = (lista, valor) => `<option value=""${valor ? '' : ' selected'}>SELECIONE</option>` +
    lista.map(([v, t]) => `<option value="${escHtml(v)}"${v === valor ? ' selected' : ''}>${escHtml(t)}</option>`).join('');
const opcoesPerm = v => opcoes(Object.entries(CO_COMPARTIMENTOS).map(([k, d]) => [k, d.titulo]), v);
const opcoesClasse = c => c.perm ? opcoes(CO_COMPARTIMENTOS[c.perm].itens.map(t => [t, t]), c.classe) : '<option value="">ESCOLHA A PERMANÊNCIA</option>';

/* =========================================================
   TABELA (um quadro por compartimento; colunas PROJETO | EXIGIDO | SITUAÇÃO)
   ========================================================= */
function renderComodos() {
    const sel = (i, campo, html) => `<select class="input-yellow co-select" data-co="${i}" data-campo="${campo}">${html}</select>`;
    const med = (i, campo, rot, a = null) => `<input ${CAMPO_M} class="input-yellow" data-co="${i}" data-campo="${campo}"${a != null ? ` data-ab="${a}"` : ''}
        value="${escHtml(a != null ? comodos[i].aberturas[a][campo] : comodos[i][campo])}" aria-label="${rot}"${a == null ? ` id="${idCo(i, campo)}"` : ''}>`;
    html('co-lista', comodos.map((c, i) => {
        const nAb = c.aberturas.length;
        // como nas vagas: um título por abertura / porta e os itens recuados embaixo
        const titulo = (txt, rm) => `<td class="p-2 pl-4 font-bold text-[#1B2E24] bg-slate-50"><div class="flex items-center justify-between gap-1">${txt}${rm}</div></td>
            <td class="bg-slate-50"></td>`;
        const ROWS_AB = 5;                                            // título + altura, largura, área, área ventilada
        const aberturas = c.aberturas.map((ab, a) => `
            <tr>${titulo(`ABERTURA ${a + 1}`, nAb > 1 ? `<button type="button" class="qa-remover no-print" data-remover-ab="${i}:${a}" title="Remover a abertura ${a + 1}"><i class="fa-solid fa-trash-can"></i></button>` : '')}
                ${a === 0 ? `<td class="p-2 text-center align-middle" rowspan="${nAb * ROWS_AB + 2}" data-co-exig="${i}:aberturas"></td>
                    <td class="p-2 text-center align-middle" rowspan="${nAb * ROWS_AB + 2}"><span class="status-badge-fixed" data-co-st="${i}:aberturas"></span></td>` : ''}</tr>
            <tr><td class="p-2 pl-8">ALTURA</td><td class="p-1">${med(i, 'alt', `Altura da abertura ${a + 1}`, a)}</td></tr>
            <tr><td class="p-2 pl-8">LARGURA</td><td class="p-1">${med(i, 'larg', `Largura da abertura ${a + 1}`, a)}</td></tr>
            <tr><td class="p-2 pl-8">ÁREA</td><td class="p-2 text-center font-bold" data-co-calc="${i}:ab${a}">0,00 m²</td></tr>
            <tr><td class="p-2 pl-8">ÁREA VENTILADA <span class="text-[10px] text-slate-500">(m² ou % da abertura)</span></td>
                <td class="p-1"><div class="co-vent"><input type="text" class="input-yellow" data-co="${i}" data-ab="${a}" data-campo="vent" value="${escHtml(ab.vent)}"
                    placeholder="ex.: 0,60 m² ou 50%" aria-label="Área ventilada da abertura ${a + 1} (m² ou %)">
                    <span class="co-vent-calc" data-co-calc="${i}:vent${a}"></span></div></td></tr>`).join('');
        const nPt = c.portas.length;
        const portas = c.portas.map((pt, n) => `
            <tr>${titulo(`PORTA ${n + 1}`, nPt > 1 ? `<button type="button" class="qa-remover no-print" data-remover-pt="${i}:${n}" title="Remover a porta ${n + 1}"><i class="fa-solid fa-trash-can"></i></button>` : '')}
                ${n === 0 ? `<td class="p-2 text-center text-slate-400 align-middle" rowspan="${nPt * 2}">-</td><td class="p-2 text-center text-slate-400 align-middle" rowspan="${nPt * 2}">-</td>` : ''}</tr>
            <tr><td class="p-2 pl-8">LARGURA</td>
                <td class="p-1"><input ${CAMPO_M} class="input-yellow" data-co="${i}" data-pt="${n}" data-campo="larg" value="${escHtml(pt.larg)}" aria-label="Largura da porta ${n + 1}"></td></tr>`).join('');
        return `
        <div class="co-comodo scroll-mt-24 overflow-x-auto" data-co-bloco="${i}">
        <table class="table-fixed-std">
            <colgroup><col class="w-[42%]"><col class="w-[20%]"><col class="w-[20%]"><col class="w-[18%]"></colgroup>
            <thead><tr class="bg-[#1B2E24] text-white font-bold uppercase">
                <th class="p-2 text-left"><div class="flex items-center gap-2">
                    <span class="flex-none">${nCo(i)}</span>
                    <input type="text" class="input-yellow qa-nome co-nome" data-co="${i}" data-campo="nome" value="${escHtml(c.nome)}" aria-label="Nome do compartimento ${nCo(i)}">
                    <button type="button" class="btn-engrenagem no-print" data-desenho-co="${i}" aria-pressed="${c.desenho}" title="Representação simples do compartimento"><i class="fa-solid fa-pen-ruler"></i></button>
                    ${comodos.length > 1 ? `<button type="button" class="qa-remover co-remover no-print" data-remover-co="${i}" title="Remover o compartimento ${nCo(i)}"><i class="fa-solid fa-trash-can"></i></button>` : ''}</div></th>
                <th class="p-2 text-center">PROJETO</th>
                <th class="p-2 text-center">EXIGIDO</th>
                <th class="p-2 text-center">SITUAÇÃO</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-200">
                <tr><td class="p-2 font-bold"><span class="inline-flex items-center gap-1.5">PERMANÊNCIA
                        <button type="button" class="info-btn no-print" data-info="info-permanencia" aria-label="Informação: classificação dos compartimentos (Código de Obras, Art. 107 a 109)" title="Informação">i</button></span></td>
                    <td colspan="3" class="p-1">${sel(i, 'perm', opcoesPerm(c.perm))}</td></tr>
                <tr><td class="p-2 font-bold">CLASSIFICAÇÃO</td><td colspan="3" class="p-1">${sel(i, 'classe', opcoesClasse(c))}</td></tr>

                <tr class="bg-slate-100 font-bold"><td colspan="4" class="p-1.5 text-[#1B2E24]"><span class="inline-flex items-center gap-1.5">DIMENSÕES DO COMPARTIMENTO
                    <button type="button" class="info-btn no-print" data-info="info-geometria" aria-label="Informação: diâmetro mínimo do círculo no plano do piso (Código de Obras, Art. 113)" title="Informação">i</button></span></td></tr>
                <tr><td class="p-2 pl-6">LARGURA</td>
                    <td class="p-1">${med(i, 'larg', 'Largura do compartimento')}</td>
                    <td class="p-2 text-center align-middle" rowspan="3" data-co-exig="${i}:geometria"></td>
                    <td class="p-2 text-center align-middle" rowspan="3"><span class="status-badge-fixed" data-co-st="${i}:geometria"></span></td></tr>
                <tr><td class="p-2 pl-6">COMPRIMENTO</td><td class="p-1">${med(i, 'comp', 'Comprimento do compartimento')}</td></tr>
                <tr><td class="p-2 pl-6">ÁREA</td><td class="p-2 text-center font-bold text-emerald-800" data-co-calc="${i}:area">0,00 m²</td></tr>
                <tr><td class="p-2 pl-6">PÉ-DIREITO</td><td class="p-1">${med(i, 'pe', 'Pé-direito do compartimento')}</td>
                    <td class="p-2 text-center" data-co-exig="${i}:pe"></td>
                    <td class="p-2 text-center"><span class="status-badge-fixed" data-co-st="${i}:pe"></span></td></tr>

                <tr class="bg-slate-100 font-bold"><td colspan="4" class="p-1.5 text-[#1B2E24]"><span class="inline-flex items-center gap-1.5">DIMENSÃO DAS ABERTURAS
                    <button type="button" class="info-btn no-print" data-info="info-aberturas" aria-label="Informação: aberturas para iluminação e ventilação (Código de Obras, Art. 124)" title="Informação">i</button></span></td></tr>
                ${aberturas}
                <tr class="font-bold"><td class="p-2">ÁREA TOTAL DAS ABERTURAS</td><td class="p-2 text-center text-emerald-800" data-co-calc="${i}:ab-total">0,00 m²</td></tr>
                <tr class="font-bold"><td class="p-2">ÁREA VENTILADA TOTAL</td><td class="p-2 text-center text-emerald-800" data-co-calc="${i}:vent-total">0,00 m²</td></tr>
                <tr class="no-print"><td colspan="4" class="p-1.5 pl-6"><button type="button" class="qa-acrescentar" data-acrescentar-ab="${i}"><i class="fa-solid fa-plus mr-1"></i>ADICIONAR ABERTURA</button></td></tr>

                <tr class="bg-slate-100 font-bold"><td colspan="4" class="p-1.5 text-[#1B2E24]">PORTAS</td></tr>
                ${portas}
                <tr class="no-print"><td colspan="4" class="p-1.5 pl-6"><button type="button" class="qa-acrescentar" data-acrescentar-pt="${i}"><i class="fa-solid fa-plus mr-1"></i>ADICIONAR PORTA</button></td></tr>
            </tbody>
        </table>
        <div class="hidden" data-co-obs="${i}"></div>
        <div class="co-desenho${c.desenho ? '' : ' hidden'}" data-co-desenho="${i}">${c.desenho ? painelDesenho(c, i) : ''}</div>
        </div>`;
    }).join(''));
    [...cache.keys()].filter(k => /^co\d+-/.test(k)).forEach(k => cache.delete(k));     // ids recriados: sem referência antiga no cache de $()
    guardarComodos();
    calcularComodos();
}

/* Situação de uma verificação (mesmos selos do resto do sistema) */
function selo(el, estado, rotulo) {
    const [t, c] = BADGE[estado];
    el.textContent = `${ICON[estado]} ${rotulo || t}`.trim();
    el.className = `status-badge-fixed ${c}`;
}

/* Recalcula áreas, exigências, situações e desenhos sem redesenhar a tabela (o campo em edição não perde o foco) */
// coluna EXIGIDO: linhas de texto; a do mínimo ("Mín." / "Ø mín.") em negrito
const exigHtml = linhas => linhas.map(l => `<div class="${/^(Ø )?mín\./i.test(l) ? 'font-bold' : 'text-[11px]'}">${escHtml(l)}</div>`).join('');

function calcularComodos() {
    const q = s => document.querySelector(s);
    comodos.forEach((c, i) => {
        const g = avaliarGeometria(c), pd = avaliarPeDireito(c), ab = avaliarAberturas(c);
        q(`[data-co-calc="${i}:area"]`).textContent = fmt(g.area) + ' m²';
        c.aberturas.forEach((x, a) => { q(`[data-co-calc="${i}:ab${a}"]`).textContent = fmt(areaDe2(x.larg, x.alt)) + ' m²'; });
        q(`[data-co-calc="${i}:ab-total"]`).textContent = fmt(ab.total) + ' m²';
        q(`[data-co-calc="${i}:vent-total"]`).textContent = fmt(ab.ventTotal) + ' m²';
        ab.vents.forEach((v, a) => {                                  // em %: mostra o equivalente em m²; texto não entendido: avisa
            const el = q(`[data-co-calc="${i}:vent${a}"]`);
            el.textContent = Number.isNaN(v) ? 'valor não entendido' : v != null && c.aberturas[a].vent.includes('%') ? `(${fmt(v)} m²)` : '';
            el.classList.toggle('co-vent-erro', Number.isNaN(v));
        });
        [['geometria', g], ['pe', pd], ['aberturas', ab]].forEach(([k, r]) => {
            const cel = q(`[data-co-exig="${i}:${k}"]`), v = exigHtml(r.exig);
            if (cel.innerHTML !== v) cel.innerHTML = v;                       // troca só quando muda
            selo(q(`[data-co-st="${i}:${k}"]`), r.s, r.label);
        });
        // observações abaixo do quadro: dimensões (Art. 113 / 115), pé-direito (Art. 114) e aberturas (Art. 124)
        const obs = q(`[data-co-obs="${i}"]`);
        const msgs = [g.obs, pd.obs, ab.obs].filter(Boolean);
        obs.innerHTML = msgs.map(m => `<div class="obs-msg obs-${m.s === 'fail' ? 'fail' : m.s === 'ok' ? 'ok' : 'warn'}">${escHtml(m.texto)}</div>`).join('');
        obs.className = msgs.length ? 'space-y-1' : 'hidden';
        if (c.desenho) atualizarDesenho(c, i, g);
    });
}

/* Pendências (menu do cabeçalho): só os compartimentos reprovados */
const pendenciasComodos = () => comodos.flatMap((c, i) => {
    const item = (r, inp, o) => r.s === 'fail' && { id: 'tab-comodos', inp: idCo(i, inp), s: 'fail', nome: `Compartimento ${nCo(i)} - ${c.nome || 'sem nome'} (${o})` };
    return [item(avaliarGeometria(c), 'larg', ehBanheiro(c) ? 'área mínima' : 'círculo mínimo'), item(avaliarPeDireito(c), 'pe', 'pé-direito'),
            item(avaliarAberturas(c), 'larg', 'aberturas')].filter(Boolean);
});

/* =========================================================
   DESENHO: retângulo em escala, círculo mínimo no centro e aberturas nas paredes
   ========================================================= */
const PAREDES = { sup: 'SUPERIOR', inf: 'INFERIOR', esq: 'ESQUERDA', dir: 'DIREITA' };
const horizontal = parede => parede === 'sup' || parede === 'inf';
// paredes vizinhas, de onde se medem as distâncias: [a, b]
const vizinhas = parede => horizontal(parede) ? ['esquerda', 'direita'] : ['superior', 'inferior'];

/* Elementos posicionados nas paredes do desenho: aberturas (janelas, J) e portas (P) */
const TIPOS_DES = {
    ab: { lista: 'aberturas', letra: 'J', nome: 'abertura', titulo: 'ABERTURA', cor: '#2563EB' },
    pt: { lista: 'portas', letra: 'P', nome: 'porta', titulo: 'PORTA', cor: '#B45309' }
};
const itensDesenho = c => Object.entries(TIPOS_DES).flatMap(([tipo, T]) => c[T.lista].map((it, n) => ({ tipo, n, it, T, chave: `${tipo}:${n}` })));
const itemDaChave = (c, chave) => { const [tipo, n] = String(chave).split(':'); return (TIPOS_DES[tipo] && c[TIPOS_DES[tipo].lista][+n]) || null; };

/* Posição na parede: { compr (parede), larg (elemento), a, b (distâncias às paredes vizinhas), centralizada, erro } */
function posicaoNaParede(c, it, nome = 'abertura') {
    if (!it.parede) return null;
    const compr = parseBR(horizontal(it.parede) ? c.larg : c.comp), larg = parseBR(it.larg);
    if (!(compr > 0)) return { erro: 'informe largura e comprimento do compartimento' };
    if (!(larg > 0)) return { compr, erro: `informe a largura da ${nome}` };
    const digitada = String(it.dist ?? '').trim() !== '';
    const d = digitada ? parseBR(it.dist) : (compr - larg) / 2;                     // sem distância digitada: centralizada
    const [a, b] = !digitada || it.ref !== 'b' ? [d, compr - larg - d] : [compr - larg - d, d];
    const erro = larg > compr + 1e-9 ? `a ${nome} (${fmt(larg)} m) é maior que a parede (${fmt(compr)} m)`
        : a < -1e-9 || b < -1e-9 ? `não cabe: ${fmt(a)} m + ${fmt(larg)} m + ${fmt(b)} m passa da parede (${fmt(compr)} m)` : '';
    return { compr, larg, a, b, centralizada: !digitada, erro };
}

/* Painel (montado ao abrir o desenho e ao posicionar/tirar um elemento): escolha, desenho e distâncias */
function painelDesenho(c, i) {
    const itens = itensDesenho(c);
    if (!itens.some(x => x.chave === c.selDes)) c.selDes = itens[0].chave;
    const botoes = itens.map(({ chave: k, n, it, T }) => `<button type="button" class="cu-chip co-chip-${k.split(':')[0]}${k === c.selDes ? ' ativo' : ''}" data-sel-des="${i}:${k}"
        title="Escolha e clique na parede do desenho">${T.titulo} ${n + 1}${it.parede ? ' ✓' : ''}</button>`).join('');
    const campo = (k, lado, rot, T, n) => `<label class="co-jan-dist">${rot} <input type="text" inputmode="decimal" data-mask="metro" class="input-yellow"
        data-co="${i}" data-des="${k}" data-campo="dist${lado}" aria-label="Distância da ${T.nome} ${n + 1} à parede ${rot}"></label>`;
    const linhas = itens.map(({ chave: k, n, it, T }) => !it.parede ? '' : `
        <div class="co-jan">
            <span class="co-jan-nome" style="color:${T.cor}">${T.letra}${n + 1} • PAREDE ${PAREDES[it.parede]}</span>
            <span class="co-jan-txt">distância da parede</span>
            ${campo(k, 'A', vizinhas(it.parede)[0], T, n)}${campo(k, 'B', vizinhas(it.parede)[1], T, n)}
            <button type="button" class="qa-remover no-print" data-tirar-des="${i}:${k}" title="Tirar a ${T.nome} ${n + 1} da parede"><i class="fa-solid fa-xmark"></i></button>
            <span class="co-jan-msg" data-co-des-msg="${i}:${k}"></span>
        </div>`).join('');
    return `<div class="co-des-topo no-print">Posicionar: ${botoes}<span>e clique na parede do desenho</span></div>
        <div data-co-svg="${i}"></div>
        <div class="co-jans">${linhas}</div>`;
}

/* Recalcula o desenho e as distâncias calculadas (a digitada não é tocada; o campo em edição não perde o foco) */
function atualizarDesenho(c, i, g) {
    const svg = document.querySelector(`[data-co-svg="${i}"]`);
    if (!svg) return;
    const novo = desenhoComodo(c, g);
    if (svg.innerHTML !== novo) svg.innerHTML = novo;
    itensDesenho(c).forEach(({ chave: k, it, T }) => {
        if (!it.parede) return;
        const p = posicaoNaParede(c, it, T.nome), digitada = String(it.dist ?? '').trim() !== '';
        ['A', 'B'].forEach(lado => {
            const el = document.querySelector(`[data-co="${i}"][data-des="${k}"][data-campo="dist${lado}"]`);
            const manual = digitada && (it.ref || 'a') === lado.toLowerCase();
            if (!manual && el !== document.activeElement) el.value = p && !p.erro?.startsWith('informe') ? MASKS.metro(lado === 'A' ? p.a : p.b) : '';
            el.classList.toggle('input-auto', !manual);
            el.title = manual ? 'Medida digitada (apague para centralizar)' : 'Calculada (digite para alterar)';
        });
        const msg = document.querySelector(`[data-co-des-msg="${i}:${k}"]`);
        msg.textContent = p && p.erro ? p.erro : p && p.centralizada ? 'centralizada' : '';
        msg.classList.toggle('co-jan-erro', !!(p && p.erro && !p.erro.startsWith('informe')));
    });
}

function desenhoComodo(c, g) {
    const L = parseBR(c.larg), C = parseBR(c.comp);
    if (!(L > 0 && C > 0)) return '<p class="co-desenho-vazio">Informe largura e comprimento para ver o desenho.</p>';
    const W = 460, H = 300, pad = 42;
    const k = Math.min((W - 2 * pad) / L, (H - 2 * pad) / C);
    const w = L * k, h = C * k, x = (W - w) / 2, y = (H - h) / 2, cx = W / 2, cy = H / 2;
    const d = g.regra ? g.regra.diametro : 0, cabe = g.s !== 'fail';
    const cor = cabe ? '#16A34A' : '#DC2626';
    // parede: início, direção ao longo da parede e normal para dentro do compartimento
    const P = { sup: [x, y, 1, 0, 0, 1], inf: [x, y + h, 1, 0, 0, -1], esq: [x, y, 0, 1, 1, 0], dir: [x + w, y, 0, 1, -1, 0] };
    const f = v => v.toFixed(1);
    const elementos = itensDesenho(c).map(({ tipo, n, it, T }) => {
        const p = posicaoNaParede(c, it, T.nome);
        if (!p || !(p.larg > 0) || !(p.compr > 0)) return '';
        const [sx, sy, ux, uy, nx, ny] = P[it.parede], ponto = (t, o = 0) => [sx + ux * t * k + nx * o, sy + uy * t * k + ny * o];
        const ini = Math.max(0, Math.min(p.a, p.compr)), fim = Math.max(0, Math.min(p.a + p.larg, p.compr));
        const corE = p.erro ? '#DC2626' : T.cor;
        const linha = (o, extra) => { const [a1, b1] = ponto(ini, o), [a2, b2] = ponto(fim, o); return `<line x1="${f(a1)}" y1="${f(b1)}" x2="${f(a2)}" y2="${f(b2)}" ${extra}/>`; };
        const texto = (t, o, txt, cls) => {                           // texto ao longo da parede (girado nas paredes verticais)
            const [tx, ty] = ponto(t, o);
            return `<text x="${f(tx)}" y="${f(ty)}" text-anchor="middle" dominant-baseline="middle" class="${cls}"${horizontal(it.parede) ? '' : ` transform="rotate(-90 ${f(tx)} ${f(ty)})"`} fill="${corE}">${txt}</text>`;
        };
        // distâncias às paredes vizinhas: cotas por dentro do compartimento
        const cota = (t0, t1, v) => {
            if (!(v > 0.005)) return '';
            const [a1, b1] = ponto(t0, 13), [a2, b2] = ponto(t1, 13);
            return `<line x1="${f(a1)}" y1="${f(b1)}" x2="${f(a2)}" y2="${f(b2)}" stroke="${corE}" stroke-width="1" stroke-dasharray="3 2"/>` + texto((t0 + t1) / 2, 22, fmt(v), 'co-cota-jan');
        };
        let simbolo;
        if (tipo === 'ab')                                            // janela: vão com duas linhas finas
            simbolo = linha(0, `stroke="#fff" stroke-width="7"`) + linha(-2.5, `stroke="${corE}" stroke-width="1.6"`) + linha(2.5, `stroke="${corE}" stroke-width="1.6"`);
        else {                                                        // porta: vão, folha (dobradiça no início) e arco de abertura
            const r = (fim - ini) * k, [hx, hy] = ponto(ini), [ex, ey] = ponto(fim), [fx, fy] = ponto(ini, r);
            const giro = nx * uy - ny * ux > 0 ? 1 : 0;              // arco do lado de dentro do compartimento
            simbolo = linha(0, `stroke="#fff" stroke-width="7"`)
                + `<line x1="${f(hx)}" y1="${f(hy)}" x2="${f(fx)}" y2="${f(fy)}" stroke="${corE}" stroke-width="2"/>`
                + `<path d="M ${f(fx)} ${f(fy)} A ${f(r)} ${f(r)} 0 0 ${giro} ${f(ex)} ${f(ey)}" fill="none" stroke="${corE}" stroke-width="1" stroke-dasharray="4 3"/>`;
        }
        return `<g class="co-${tipo === 'ab' ? 'janela' : 'porta'}">${simbolo}
            ${texto((ini + fim) / 2, tipo === 'pt' ? Math.min((fim - ini) * k * 0.45, 20)          // porta: rótulo dentro do arco
                : it.parede === 'sup' || it.parede === 'esq' ? 12 : -11, `${T.letra}${n + 1}`, 'co-cota-jan co-jan-rot')}
            ${cota(0, ini, Math.max(0, p.a))}${cota(fim, p.compr, Math.max(0, p.b))}
        </g>`;
    }).join('');
    // paredes clicáveis (faixa invisível e larga sobre cada parede)
    const paredes = Object.entries(P).map(([nome, [sx, sy, ux, uy]]) => {
        const comp = (horizontal(nome) ? w : h);
        return `<line class="co-parede" data-parede="${nome}" x1="${f(sx)}" y1="${f(sy)}" x2="${f(sx + ux * comp)}" y2="${f(sy + uy * comp)}"><title>Parede ${PAREDES[nome].toLowerCase()}: clique para posicionar a abertura ou porta escolhida</title></line>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Desenho do compartimento ${escHtml(c.nome)}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F8FAFC" stroke="#1B2E24" stroke-width="2.5"/>
        ${d ? `<circle cx="${cx}" cy="${cy}" r="${d * k / 2}" fill="${cor}" fill-opacity=".12" stroke="${cor}" stroke-width="2" stroke-dasharray="6 4"/>
        <line x1="${cx - d * k / 2}" y1="${cy}" x2="${cx + d * k / 2}" y2="${cy}" stroke="${cor}" stroke-width="1.5"/>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="co-cota" fill="${cor}">Ø ${fmt(d)} m</text>` : ''}
        ${elementos}
        <line x1="${x}" y1="${y - 14}" x2="${x + w}" y2="${y - 14}" stroke="#475569"/>
        <text x="${cx}" y="${y - 20}" text-anchor="middle" class="co-cota">${fmt(L)} m</text>
        <line x1="${x - 14}" y1="${y}" x2="${x - 14}" y2="${y + h}" stroke="#475569"/>
        <text x="${x - 20}" y="${cy}" text-anchor="middle" class="co-cota" transform="rotate(-90 ${x - 20} ${cy})">${fmt(C)} m</text>
        <text x="${cx}" y="${y + h + 30}" text-anchor="middle" class="co-cota-area">${escHtml(c.nome || '')} • ${fmt(L * C)} m²${d ? (cabe ? ' • círculo cabe' : ' • círculo NÃO cabe') : ''}</text>
        ${paredes}
    </svg>`;
}

/* =========================================================
   PROJETO (.jsk) E EVENTOS
   ========================================================= */
function carregarComodos(campos = {}) {
    const lidos = lerJson(campos['inp-comodos']);
    comodos = (Array.isArray(lidos) && lidos.length ? lidos : [comodoVazio()]).map(({ tipologia, ...c }) => ({ ...comodoVazio(), ...c,
        aberturas: Array.isArray(c.aberturas) && c.aberturas.length ? c.aberturas.map(a => ({ ...ABERTURA_VAZIA(), ...a })) : [ABERTURA_VAZIA()],
        portas: Array.isArray(c.portas) && c.portas.length ? c.portas.map(a => ({ ...PORTA_VAZIA(), ...a })) : [PORTA_VAZIA()], desenho: false }));
    renderComodos();
}

function initComodos() {
    const lista = $('co-lista');
    const guardar = e => {
        const el = e.target;
        if (!el.dataset || el.dataset.co == null || !el.dataset.campo) return;
        const c = comodos[+el.dataset.co];
        if (el.dataset.des) {                                         // distância no desenho: a digitada vale, a outra é calculada
            Object.assign(itemDaChave(c, el.dataset.des), { dist: el.value, ref: el.dataset.campo === 'distA' ? 'a' : 'b' });
            guardarComodos();
            schedule();
            return;
        }
        if (el.dataset.ab != null) c.aberturas[+el.dataset.ab][el.dataset.campo] = el.value;
        else if (el.dataset.pt != null) c.portas[+el.dataset.pt][el.dataset.campo] = el.value;
        else c[el.dataset.campo] = el.value;
        if (el.dataset.campo === 'perm' && e.type === 'change') {     // outra permanência: a classificação volta a ser escolhida
            c.classe = '';
            const s = lista.querySelector(`select[data-co="${el.dataset.co}"][data-campo="classe"]`);
            s.innerHTML = opcoesClasse(c);
        }
        guardarComodos();
        schedule();
    };
    ['input', 'change'].forEach(ev => lista.addEventListener(ev, guardar));
    lista.addEventListener('click', e => {
        const t = e.target;
        const rmCo = t.closest('[data-remover-co]'), rmAb = t.closest('[data-remover-ab]');
        const addAb = t.closest('[data-acrescentar-ab]'), des = t.closest('[data-desenho-co]');
        const parede = t.closest('[data-parede]'), chip = t.closest('[data-sel-des]'), tirar = t.closest('[data-tirar-des]');
        const rmPt = t.closest('[data-remover-pt]'), addPt = t.closest('[data-acrescentar-pt]');
        if (parede || chip || tirar) {                                        // desenho: aberturas e portas nas paredes
            const i = +(parede || chip || tirar).closest('[data-co-desenho]').dataset.coDesenho, c = comodos[i];
            const chaveDe = el => el.split(':').slice(1).join(':');            // "0:ab:1" -> "ab:1"
            if (chip) c.selDes = chaveDe(chip.dataset.selDes);
            if (parede) {
                const it = itemDaChave(c, c.selDes) || c.aberturas[0];
                Object.assign(it, { parede: parede.dataset.parede, dist: '', ref: '' });             // começa centralizada
                const proxima = itensDesenho(c).find(x => !x.it.parede);
                if (proxima) c.selDes = proxima.chave;                         // o próximo sem parede já fica escolhido
            }
            if (tirar) Object.assign(itemDaChave(c, chaveDe(tirar.dataset.tirarDes)), { parede: '', dist: '', ref: '' });
            lista.querySelector(`[data-co-desenho="${i}"]`).innerHTML = painelDesenho(c, i);
            guardarComodos();
            calcularComodos();
            if (!chip) schedule();
            return;
        }
        if (rmCo) {
            const i = +rmCo.dataset.removerCo;
            if (!confirm(`Remover o compartimento ${nCo(i)} (${comodos[i].nome || 'sem nome'})?`)) return;
            comodos.splice(i, 1);
        } else if (rmAb) {
            const [i, a] = rmAb.dataset.removerAb.split(':').map(Number);
            if (!confirm(`Remover a abertura ${a + 1} do compartimento ${nCo(i)}?`)) return;
            comodos[i].aberturas.splice(a, 1);
        } else if (addAb) comodos[+addAb.dataset.acrescentarAb].aberturas.push(ABERTURA_VAZIA());
        else if (rmPt) {
            const [i, n] = rmPt.dataset.removerPt.split(':').map(Number);
            if (!confirm(`Remover a porta ${n + 1} do compartimento ${nCo(i)}?`)) return;
            comodos[i].portas.splice(n, 1);
        } else if (addPt) comodos[+addPt.dataset.acrescentarPt].portas.push(PORTA_VAZIA());
        else if (des) {
            const c = comodos[+des.dataset.desenhoCo];
            c.desenho = !c.desenho;
            des.setAttribute('aria-pressed', String(c.desenho));
            const box = lista.querySelector(`[data-co-desenho="${des.dataset.desenhoCo}"]`);
            box.classList.toggle('hidden', !c.desenho);
            if (c.desenho) { box.innerHTML = painelDesenho(c, +des.dataset.desenhoCo); calcularComodos(); }
            return;
        } else return;
        renderComodos();
        schedule();
    });
    $('co-acrescentar').addEventListener('click', () => {
        comodos.push(comodoVazio());
        renderComodos();
        lista.querySelector(`[data-co-bloco="${comodos.length - 1}"] .co-nome`).focus();
        schedule();
    });
    carregarComodos();
}
