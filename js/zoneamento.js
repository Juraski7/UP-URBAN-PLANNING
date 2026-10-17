/* UP! Urban Planning — zoneamento do bairro (bases PDDUA_* em js/dados; aba Imóvel e referências da aba Empreendimento),
   compatibilidade locacional e quadro de OBSERVAÇÕES */
'use strict';

const refs = ns => ns.length ? ' ' + ns.map(n => `(${n})`).join(' ') : '';     // marcas de nota: " (1) (4)"
const ieTxt = v => v == null ? 'LIVRE' : fmt(v, 1);                            // IE null = livre
// TO por pavimento vem como coeficiente ("Térreo e 1º Pavimento - 0,7"): exibe em porcentagem ("70%")
const toEmPorcentagem = texto => texto.replace(/- (0,\d+)/g, (m, v) => '- ' + fmt(parseFloat(v.replace(',', '.')) * 100, 0) + '%');
const numerosDeNota = texto => [...new Set((String(texto).match(/\((\d+)\)/g) || []).map(m => +m.slice(1, -1)))];
const crescente = (a, b) => a - b;

/* Um grupo do quadro OBSERVAÇÕES: título da tabela + linhas (some quando não há linhas) */
function renderNotas(id, titulo, linhas) {
    html(id, linhas.length ? `<p class="font-bold text-slate-700">${titulo}:</p>` + linhas.map(l => `<p>${l}</p>`).join('') : '');
}

/* =========================================================
   ZONEAMENTO DO BAIRRO
   Preenche os quadros a partir das bases; devolve o que foi encontrado (null = sem dado)
   ========================================================= */
function renderZoneamento(areaLote) {
    const bairro = $('inp-bairro').value;
    const amb = ambientalDoBairro(bairro);                  // zoneamento ambiental
    const zu = zonaDoBairro(bairro);                        // zona urbana e macrozona
    const zona = zu && zu.zona;
    const b = zona && indicesDaZona(zona);                  // índices urbanísticos
    const usos = zona && usosDaZona(zona);                  // categorias de uso
    const lote = zona && lotesDaZona(zona);                 // lotes mínimos
    const rec = zona && recuosDaZona(zona);                 // recuos mínimos
    const se = (base, id, f) => txt(id, base ? f() : '-');

    /* zoneamento ambiental */
    se(amb, 'txt-za', () => amb.za);
    se(amb, 'txt-taxa-perm-min', () => fmt(amb.permMin) + '%');
    se(amb, 'txt-tra-min', () => fmt(amb.traMin));
    se(amb, 'txt-fator-alfa', () => fmt(amb.alfa));
    se(amb, 'txt-fator-beta', () => fmt(amb.beta));

    /* enquadramento */
    se(zu, 'txt-zona-urbana', () => zu.zona);
    se(zu, 'txt-macrozona', () => zu.macrozona);

    /* índices e instrumentos urbanísticos; coeficiente + área equivalente no lote, ex.: 2,00 (20.000,00 m²) */
    const coef = v => fmt(v) + (areaLote > 0 ? ` (${fmt(areaLote * v)} m²)` : '');
    se(b, 'txt-to-limite-pct', () => (b.toTexto ? toEmPorcentagem(b.toTexto) : `${fmt(b.to * 100)}%`) + refs(b.toNotas));
    se(b, 'txt-camin', () => coef(b.camin));
    se(b, 'txt-cabas', () => coef(b.caBas));
    se(b, 'txt-camax', () => coef(b.caMax));
    se(b, 'txt-oodc-coef', () => b.oodc == null ? '-' : coef(b.oodc) + refs(b.oodcNotas));
    se(b, 'txt-ie-limites', () => `${ieTxt(b.ie)} / ${ieTxt(b.ieOodc)}` + refs(b.ieNotas));
    // referências da zona repetidas nos quadros da aba Empreendimento
    se(b, 'txt-ie-sem', () => ieTxt(b.ie));
    se(b, 'txt-ie-com', () => ieTxt(b.ieOodc));
    se(b, 'txt-ca-camin', () => `${fmt(b.camin)} (${fmt(areaLote * b.camin)} m²)`);
    se(b, 'txt-ca-cabas', () => `${fmt(b.caBas)} (${fmt(areaLote * b.caBas)} m²)`);
    se(b, 'txt-ca-camax', () => `${fmt(b.caMax)} (${fmt(areaLote * b.caMax)} m²)`);

    /* lotes mínimos */
    const medida = (v, un) => v == null ? '-' : `${fmt(v)} ${un}`;
    se(lote, 'txt-lote-area', () => medida(lote.area, 'm²'));
    se(lote, 'txt-lote-testada-esquina', () => medida(lote.testadaEsquina, 'm'));
    se(lote, 'txt-lote-testada-meio', () => medida(lote.testadaMeio, 'm'));

    /* recuos mínimos: aba Imóvel e coluna REGRA da aba Empreendimento */
    [['frente', 'frente'], ['lateral', 'lateral'], ['oodc', 'lateralOodc']].forEach(([id, k]) => {
        se(rec, 'txt-recuo-' + id, () => rec[k]);
        se(rec, 'txt-rec-' + id + '-regra', () => rec[k]);
    });

    /* observações: só as notas citadas pela zona */
    const citadasUso = new Set(usos ? Object.values(usos).join(' ').match(/\(\*+\)/g) : []);
    renderNotas('obs-categorias', 'CATEGORIAS DE USO',
        CATEGORIA_USO_NOTAS.filter(n => citadasUso.has((n.match(/^\(\*+\)/) || [''])[0])).map(n => n + '.'));
    renderNotas('obs-indices', 'ÍNDICES E INSTRUMENTOS URBANÍSTICOS',
        (b ? [...new Set([...b.toNotas, ...b.oodcNotas, ...b.ieNotas])] : [])
            .filter(n => INDICES_NOTAS[n]).sort(crescente).map(n => `(${n}) ${INDICES_NOTAS[n]}.`));
    renderNotas('obs-recuos', 'RECUOS MÍNIMOS',
        (rec ? numerosDeNota(Object.values(rec).join(' ')) : [])
            .filter(n => RECUOS_NOTAS[n]).sort(crescente).map(n => `(${n}) ${RECUOS_NOTAS[n]}.`));

    return { amb, b, usos };
}

/* =========================================================
   COMPATIBILIDADE LOCACIONAL (categoria do empreendimento x zona x via)
   ========================================================= */
const CAMPOS_USO = ['residencial', 'varejista', 'atacadista', 'servicos', 'industrial', 'loteamento', 'especial'];

/* Categorias de uso da zona, marcando as que a via não comporta (riscadas), as que dependem
   de nota (pontilhadas) e a categoria do projeto (destacada). Notas dependentes vão para `notas`. */
function renderUsos(usos, via, ctx, catSel, notas) {
    CAMPOS_USO.forEach(c => html('txt-uso-' + c, !usos ? '-' : usos[c].split(', ').map(tok => {
        const cod = (tok.match(/^[A-Z]+\d+/) || [''])[0];
        const sv = Number.isFinite(via) && cod ? situacaoVia(cod, via, ctx) : null;
        const cls = [cod && cod === catSel ? 'uso-sel' : '', sv && sv.s !== 'ok' ? 'uso-' + sv.s : ''].filter(Boolean).join(' ');
        if (sv && sv.s === 'cond') notas.add(sv.nota);
        const dica = sv && sv.s !== 'ok' ? ` title="Exige via ≥ ${fmt(sv.base)} m${sv.s === 'cond' ? ` (VERIFICAR NOTA (${sv.nota}))` : ''}"` : '';
        return cls ? `<span class="${cls}"${dica}>${tok}</span>` : tok;
    }).join(', ')));
}

/* Avalia a categoria escolhida; devolve os estados { zona, via } para o resumo/pendências */
function renderCompatibilidade({ usos, largVia, faixaVia, faixaUH, acTotal, uhs, semUhs }) {
    const temVia = largVia > 0;
    const ctx = { ac: acTotal > 0 ? acTotal : NaN, uhs: semUhs ? NaN : uhs };
    const cat = codigoCategoria($('inp-categoria-uso').value);
    const notas = new Set();
    if (faixaVia && faixaVia.nota) notas.add(faixaVia.nota);
    if (faixaUH && faixaUH.nota) notas.add(faixaUH.nota);
    renderUsos(usos, temVia ? largVia : NaN, ctx, cat, notas);

    txt('txt-cl-categoria', cat ? rotuloCategoria(cat) : '-');
    const perm = cat ? permissaoNaZona(usos, cat) : null;
    const sZona = !perm ? setStatus('st-cl-zona', 'na')
        : !perm.permitida ? setStatus('st-cl-zona', 'fail', 'NÃO PERMITIDA')
        : perm.nota ? setStatus('st-cl-zona', 'warn', 'VER NOTA ' + perm.nota)
        : setStatus('st-cl-zona', 'ok', 'PERMITIDA');

    const sv = cat ? situacaoVia(cat, largVia, ctx) : null;
    if (sv && sv.nota) notas.add(sv.nota);
    txt('txt-cl-via', !sv ? '-'
        : sv.exig === 0 ? (sv.reduziu ? `DISPENSADA (NOTA (${sv.nota}))` : 'SEM EXIGÊNCIA')
        : sv.s === 'cond' ? `${fmt(sv.base)} m (VERIFICAR NOTA (${sv.nota}))`
        : `${fmt(sv.exig)} m` + (sv.reduziu ? ` (REDUZIDA PELA NOTA (${sv.nota}))` : ''));
    const sVia = !sv || !temVia ? setStatus('st-cl-via', 'na')
        : sv.s === 'ok' ? setStatus('st-cl-via', 'ok', 'ATENDE')
        : sv.s === 'cond' ? setStatus('st-cl-via', 'warn', `VER NOTA (${sv.nota})`)
        : setStatus('st-cl-via', 'fail', 'NÃO ATENDE');
    txt('txt-cl-infra', sv ? (sv.infra.join(', ') || 'NENHUMA') : '-');

    renderNotas('obs-comp-locacional', 'COMPATIBILIDADE LOCACIONAL',
        [...notas].sort().map(n => `(${n}) ${COMP_LOCACIONAL_NOTAS[n]}`));
    // o quadro de observações some quando nenhum grupo tem nota
    $('box-observacoes').classList.toggle('hidden',
        ['obs-categorias', 'obs-indices', 'obs-recuos', 'obs-comp-locacional'].every(id => !$(id).children.length));

    return { zona: sZona, via: sVia };
}
