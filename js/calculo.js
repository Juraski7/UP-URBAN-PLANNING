/* UP! Urban Planning — motor de cálculo: verificações do empreendimento (aba Empreendimento)
   Cada verificação resulta em 'ok' | 'fail' | 'warn' | 'na' (faltam dados para avaliar) */
'use strict';

/* Recalcula no máximo 1x por quadro de animação, por mais eventos que cheguem */
let pending = false;
function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; calcularTudo(); verificarAlteracao(); });
}
document.addEventListener('input', e => { if (e.target.matches('input:not([data-mask])')) schedule(); });

function calcularTudo() {
    /* 1. DADOS BÁSICOS E ZONEAMENTO DO BAIRRO */
    const areaLote = parseBR($('inp-area-lote').value);
    const iptuVal = parseBR($('inp-iptu').value);
    const largVia = parseBR($('inp-faixa-dominio').value);
    const { amb, b, usos } = renderZoneamento(areaLote);
    const semZon = !b || areaLote <= 0;                     // índices urbanísticos não podem ser avaliados

    /* 2. QUADRO DE ÁREAS */
    // tipologias: por tipologia BLOCOS x [(PAVIMENTOS - 1) x AC TIPO + AC TÉRREO] (quadro_areas.js)
    const tp = calcularTipologias();
    // LAZER: a linha LAZER e as linhas que computam entram na AC/AO; a não coberta e as que não computam, não. OUTRAS: linhas livres
    const m2 = id => parseBR($(id).value);                 // campos com máscara "1.234,56 m²"
    const acTotal = tp.ac + m2('inp-lazer-construida') + somaLivres('lazer', 'ac') + somaLivres('outras', 'ac');
    const aoTotal = tp.ao + m2('inp-lazer-ocupada') + somaLivres('lazer', 'ao') + somaLivres('outras', 'ao');
    txt('calc-ac-total', fmt(acTotal) + ' m²');
    txt('calc-ao-total', fmt(aoTotal) + ' m²');

    /* 3. UHs x LARGURA DA VIA (comp_locacional.js) */
    const temVia = largVia > 0;
    const faixaVia = temVia ? faixaPelaVia(largVia) : null;
    const limiteUH = faixaVia ? faixaVia.maxUH : NaN;
    const txtLimUH = faixaVia ? textoLimiteUH(faixaVia) : '-';
    txt('txt-limite-unidades-max', txtLimUH);
    txt('tab-uh-max', txtLimUH);
    const uhs = int('inp-uhs');
    const semUhs = vazio('inp-uhs');
    const sUhs = setStatus('st-uhs', est(uhs <= limiteUH, semUhs || !temVia));
    const faixaUH = semUhs ? null : faixaParaUHs(uhs);          // via exigida pela quantidade de UHs (200 -> 15 m; 201 -> 18 m)
    const viaUH = faixaUH ? fmt(faixaUH.viaMin) + ' m' : '';
    setObs('txt-obs-uhs', sUhs === 'na' ? null : sUhs,
        sUhs === 'fail' ? `OBS.: ${uhs} UHs exigem via de no mínimo ${viaUH}; a via informada tem ${fmt(largVia)} m.`
        : faixaUH && faixaUH.viaMin === 0 ? `OBS.: Com ${uhs} UHs fica dispensada a exigência de largura da via (nota 5).`
        : `OBS.: ${uhs} UHs exigem via de no mínimo ${viaUH}; a via informada (${fmt(largVia)} m) atende.`);

    /* soma das tipologias (BLOCOS x PAVIMENTOS x APARTAMENTOS POR PAVIMENTO) deve dar as UHs do projeto */
    const sAptos = !tp.completas || semUhs ? 'na' : tp.uhs === uhs ? 'ok' : 'warn';      // só confere com tudo preenchido
    setObs('txt-obs-aptos', sAptos === 'warn' ? 'fail' : null,              // só alerta quando diverge
        `ATENÇÃO: ${tp.conta} = ${tp.uhs} UHs, diferente das UHs do projeto (${uhs}). Confira as tipologias ou as UHs.`);

    /* COMPATIBILIDADE LOCACIONAL (zoneamento.js) */
    const sCL = renderCompatibilidade({ usos, largVia, faixaVia, faixaUH, acTotal, uhs, semUhs });

    /* 4. LAZER (LOUOS, Art. 50, II, i e j): exigida a partir de 10 UHs; 3 m² por UH, ou 1,5 m² com lazer nas unidades privativas */
    const lazerPrivativa = $('inp-lazer-privativa').value === 'SIM';
    const lazerPorUH = lazerPrivativa ? 1.5 : 3;
    const lazerDispensada = !semUhs && uhs < 10;
    const lazerExig = lazerDispensada ? 0 : uhs * lazerPorUH;
    txt('calc-lazer-exigida', lazerDispensada ? 'NÃO EXIGIDA' : fmt(lazerExig) + ' m²');
    txt('txt-lazer-fator', lazerDispensada ? 'menos de 10 UHs: área de lazer não exigida (alínea i)'
        : `${fmt(lazerPorUH)} m² por UH` + (lazerPrivativa ? ' (redução de 50%, lazer nas unidades privativas)' : ''));
    // grupo LAZER do quadro de áreas: áreas construídas (LAZER e linhas que computam) + não cobertas (quadro_areas.js)
    const lazerTotal = m2('inp-lazer-construida') + somaLivres('lazer', 'ac') + m2('inp-lazer-nao-coberta') + somaLivres('lazer', 'valor');
    txt('calc-lazer-projeto', fmt(lazerTotal) + ' m²');
    const semLazer = todosVazios('inp-lazer-construida', 'inp-lazer-nao-coberta') && !lazerTotal;
    const sLazer = lazerDispensada ? setStatus('st-lazer', 'ok', 'DISPENSADA')
                                   : setStatus('st-lazer', est(lazerTotal >= lazerExig, semUhs || semLazer));

    /* 5. PERMEABILIDADE */
    const permExigM2 = amb ? areaLote * amb.permMin / 100 : 0;
    const permProjM2 = num('inp-perm-proj-m2');
    const permProjPct = safeDiv(permProjM2 * 100, areaLote);
    const semPerm = !amb || areaLote <= 0 || vazio('inp-perm-proj-m2');
    const permComp = !semPerm && permProjM2 < permExigM2;
    const permDeficit = permComp ? (permExigM2 - permProjM2) * 0.03 : 0;
    txt('calc-perm-exigida-m2', fmt(permExigM2) + ' m²');
    txt('calc-perm-exigida-pct', amb ? fmt(amb.permMin) + '%' : '-');
    txt('calc-perm-proj-pct', fmt(permProjPct) + '%');
    txt('calc-perm-deficit-m3', fmt(permDeficit, 4) + ' m³');
    const sPerm = semPerm ? setStatus('st-perm', 'na') : permComp ? setStatus('st-perm', 'warn', 'COMPENSAR') : setStatus('st-perm', 'ok');

    /* 6. TAXA DE OCUPAÇÃO */
    const toMaxM2 = b ? areaLote * b.to : 0;
    const toProjPct = safeDiv(aoTotal * 100, areaLote);
    txt('calc-to-max-m2', fmt(toMaxM2) + ' m²');
    txt('calc-to-proj-m2', fmt(aoTotal) + ' m²');
    txt('calc-to-max-pct', b ? fmt(b.to * 100) + '%' : '-');
    txt('calc-to-proj-pct', fmt(toProjPct) + '%');
    const sTO = setStatus('st-to', est(aoTotal <= toMaxM2, semZon || aoTotal <= 0));
    const diffTO = toMaxM2 - aoTotal;
    setObs('txt-obs-to', sTO === 'na' ? null : diffTO >= 0 ? 'ok' : 'fail', diffTO >= 0
        ? `OBS.: A Taxa de Ocupação está ${fmt(diffTO)} m² abaixo do limite máximo permitido.`
        : `OBS.: A Taxa de Ocupação está ${fmt(-diffTO)} m² ACIMA do limite máximo!`);

    /* 7. COEFICIENTE DE APROVEITAMENTO */
    const caProj = safeDiv(acTotal, areaLote);
    txt('calc-ca-proj', fmt(caProj, 4));
    const sCA = semZon || acTotal <= 0 ? 'na' : caProj > b.caMax ? 'fail' : caProj > b.caBas ? 'warn' : 'ok';
    setStatus('st-ca', sCA, sCA === 'warn' ? 'REQUER OODC' : undefined);
    const caRequerOodc = sCA === 'warn' || sCA === 'fail';

    /* 8. ÍNDICE DE ELEVAÇÃO E RECUOS */
    const ieProj = safeDiv(acTotal, aoTotal);
    const temIE = aoTotal > 0;
    txt('calc-ie-proj', fmt(ieProj, 4));
    // recuo exigido pela regra da zona para o IE do projeto e a altura estimada (recuos.js)
    projetoIE = temIE ? ieProj : null;
    const recZ = recuosDoImovel(), hEst = alturaEstimada();
    [['frente', 'rec-frente-val', 'st-rec-frente'], ['lateral', 'rec-lat-val', 'st-rec-lat'], ['lateralOodc', 'rec-oodc-val', 'st-rec-oodc']].forEach(([k, id, st]) => {
        if (!recZ || !recZ.rec) { txt(id, '-'); setStatus(st, 'na'); return; }
        const r = avaliarRegra(recZ.rec[k], { ie: projetoIE, h: hEst });
        txt(id, r.porPiso ? `Térreo / 1º: ${textoRecuo(r.terreo)}\nDemais: ${textoRecuo(r.demais)}` : textoRecuo(r.demais));
        setStatus(st, r.demais.falta || r.demais.semRegra ? 'na' : 'ok');
    });
    // acima do IE da zona: se couber no IE com outorga -> requer OODC; senão reprova (null = livre)
    const cabe = (v, lim) => lim == null || v <= lim;
    const sIEv = !b || !temIE ? 'na' : cabe(ieProj, b.ie) ? 'ok' : cabe(ieProj, b.ieOodc) ? 'warn' : 'fail';
    const sIE = setStatus('st-ie', sIEv, sIEv === 'warn' ? 'REQUER OODC' : undefined);

    /* 9. OUTORGA ONEROSA */
    let oodcArea = 0, oodcValor = 0;
    ['row-oodc-aplicar', 'row-oodc-area', 'row-oodc-valor'].forEach(id => $(id).classList.toggle('hidden', !caRequerOodc));
    txt('txt-oodc-aplicavel', sCA === 'na' ? '-' : caRequerOodc ? 'SIM (CA SUPERIOR AO BÁSICO)' : 'NÃO (CA DENTRO DO BÁSICO)');
    if (caRequerOodc) {
        oodcArea = acTotal - areaLote * b.caBas;
        if ($('inp-aplicar-oodc').value === 'SIM' && oodcArea > 0) oodcValor = oodcArea * iptuVal * 0.40;
    }
    txt('calc-oodc-area', fmt(oodcArea) + ' m²');
    txt('calc-oodc-valor', fmtMoeda(oodcValor));

    /* 10. VAGAS */
    const exMorTot = uhs;
    const exMorPcd = Math.ceil(exMorTot * 0.03);
    const exMorCom = exMorTot - exMorPcd;
    const ofMorCom = int('inp-vagas-morador-comum-ofer');
    const ofMorPcd = int('inp-vagas-morador-pcd-ofer');
    txt('calc-vagas-morador-exig', String(exMorTot));
    txt('calc-vagas-morador-comum-exig', String(exMorCom));
    txt('calc-vagas-morador-pcd-exig', String(exMorPcd));
    txt('calc-vagas-morador-total-ofer', String(ofMorCom + ofMorPcd));
    setStatus('st-vagas-morador-comum', est(ofMorCom >= exMorCom, semUhs || vazio('inp-vagas-morador-comum-ofer')));
    setStatus('st-vagas-morador-pcd', est(ofMorPcd >= exMorPcd, semUhs || vazio('inp-vagas-morador-pcd-ofer')));
    const sVagasMor = setStatus('st-vagas-morador', est(ofMorCom + ofMorPcd >= exMorTot,
        semUhs || todosVazios('inp-vagas-morador-comum-ofer', 'inp-vagas-morador-pcd-ofer')));

    const exVisTot = Math.ceil(uhs * 0.05);
    const exVisPcd = 1, exVisIdoso = 1;
    const exVisCom = Math.max(1, exVisTot - exVisPcd - exVisIdoso);
    const ofVisCom = int('inp-vagas-vis-comum-ofer');
    const ofVisPcd = int('inp-vagas-vis-pcd-ofer');
    const ofVisIdoso = int('inp-vagas-vis-idoso-ofer');
    txt('calc-vagas-vis-comum-exig', String(exVisCom));
    txt('calc-vagas-vis-pcd-exig', String(exVisPcd));
    txt('calc-vagas-vis-idoso-exig', String(exVisIdoso));
    txt('calc-vagas-vis-total-exig', String(exVisTot));
    txt('calc-vagas-vis-total-ofer', String(ofVisCom + ofVisPcd + ofVisIdoso));
    setStatus('st-vagas-vis-comum', est(ofVisCom >= exVisCom, semUhs || vazio('inp-vagas-vis-comum-ofer')));
    setStatus('st-vagas-vis-pcd', est(ofVisPcd >= exVisPcd, vazio('inp-vagas-vis-pcd-ofer')));
    setStatus('st-vagas-vis-idoso', est(ofVisIdoso >= exVisIdoso, vazio('inp-vagas-vis-idoso-ofer')));
    const sVagasVis = setStatus('st-vagas-visitante', est(ofVisCom + ofVisPcd + ofVisIdoso >= exVisTot,
        semUhs || todosVazios('inp-vagas-vis-comum-ofer', 'inp-vagas-vis-pcd-ofer', 'inp-vagas-vis-idoso-ofer')));

    const exMoto = Math.ceil(uhs * 0.07), exBike = Math.ceil(uhs * 0.03);
    txt('calc-vagas-moto-exig', String(exMoto));
    txt('calc-vagas-bike-exig', String(exBike));
    const sMoto = setStatus('st-vagas-moto', est(int('inp-vagas-moto-ofer') >= exMoto, semUhs || vazio('inp-vagas-moto-ofer')));
    const sBike = setStatus('st-vagas-bike', est(int('inp-vagas-bike-ofer') >= exBike, semUhs || vazio('inp-vagas-bike-ofer')));
    const sCarga = setStatus('st-vagas-carga', est(int('inp-vagas-carga-ofer') >= 1, vazio('inp-vagas-carga-ofer')));

    /* 11. BACIA DE DETENÇÃO */
    const volPluvial = areaLote * 0.025 * (toProjPct / 100) * 20;
    const volTotal = volPluvial + permDeficit;
    txt('calc-bacia-vol-pluvial', fmt(volPluvial, 4) + ' m³');
    txt('calc-bacia-vol-total', fmt(volTotal, 4) + ' m³');
    txt('calc-bacia-profundidade', fmt(safeDiv(volTotal, num('inp-bacia-largura') * num('inp-bacia-comprimento')), 2) + ' m');

    /* 12. FAIXA DE ACÚMULO (exigido definido em data-min) */
    const sAcumulo = pior([
        ['faixas', 'inp-acumulo-faixas'], ['veiculos', 'inp-acumulo-veiculos'],
        ['vagas', 'inp-acumulo-vagas'], ['comprimento', 'inp-acumulo-comprimento']
    ].map(([k, inp]) => {
        const min = parseFloat($(inp).closest('tr').querySelector('[data-min]').dataset.min);
        return setStatus('st-acumulo-' + k, est(num(inp) >= min, vazio(inp)));
    }));

    /* 13. RESÍDUOS */
    txt('calc-res-uhs', String(uhs));
    const moradores = uhs * int('inp-res-dorms') * int('inp-res-hab-dorm');
    const pop = moradores + int('inp-res-func');
    txt('calc-res-total-moradores', String(moradores));
    txt('calc-res-pop-total', pop + ' Pessoas');
    const taxa = num('inp-res-taxa-hab');
    const resOrg = pop * taxa * 0.65 * int('inp-res-dias-org') / 200;
    const resRec = pop * taxa * 0.35 * int('inp-res-dias-rec') / 100;
    txt('calc-res-org-exig', fmt(resOrg) + ' m²');
    txt('calc-res-rec-exig', fmt(resRec) + ' m²');
    const semRes = semUhs || algumVazio('inp-res-dorms', 'inp-res-hab-dorm', 'inp-res-func', 'inp-res-taxa-hab', 'inp-res-dias-org', 'inp-res-dias-rec');
    const sResOrg = setStatus('st-res-org', est(num('inp-res-org-proj') >= resOrg, semRes || vazio('inp-res-org-proj')));
    const sResRec = setStatus('st-res-rec', est(num('inp-res-rec-proj') >= resRec, semRes || vazio('inp-res-rec-proj')));

    /* RESUMO (resumo.js) */
    const clamp = (a, ref) => ref > 0 ? Math.round(Math.min(100, Math.max(0, a / ref * 100)) * 10) / 10 : 100;
    const resProj = num('inp-res-org-proj') + num('inp-res-rec-proj');
    const semZonTxt = 'informe bairro e área do lote';
    renderKpis([
        { l: 'UNIDADES (UH)', v: String(uhs), m: !temVia ? 'informe a largura da via' : sUhs === 'fail' ? `exige via ≥ ${viaUH}` : Number.isFinite(limiteUH) ? `máx. ${limiteUH} na via` : 'sem limite na via', p: clamp(uhs, limiteUH), s: sUhs },
        { l: 'OCUPAÇÃO (TO)', v: fmt(toProjPct) + '%', m: b ? `máx. ${fmt(b.to * 100)}%` : semZonTxt, p: clamp(aoTotal, toMaxM2), s: sTO },
        { l: 'APROVEITAMENTO (CA)', v: fmt(caProj, 2), m: b ? `básico ${fmt(b.caBas, 1)} • máx. ${fmt(b.caMax, 1)}` : semZonTxt, p: b ? clamp(caProj, b.caMax) : 0, s: sCA },
        { l: 'ELEVAÇÃO (IE)', v: fmt(ieProj, 2), m: b ? `máx. ${ieTxt(b.ie)}` + (b.ieOodc !== b.ie ? ` • c/ OODC ${ieTxt(b.ieOodc)}` : '') : semZonTxt, p: b && b.ie != null ? clamp(ieProj, b.ie) : 0, s: sIE },
        { l: 'PERMEABILIDADE', v: fmt(permProjPct) + '%', m: amb ? `mín. ${fmt(amb.permMin)}%` : semZonTxt, p: clamp(permProjM2, permExigM2), s: sPerm },
        { l: 'ÁREA DE LAZER', v: fmt(lazerTotal) + ' m²', m: lazerDispensada ? 'não exigida (< 10 UHs)' : `mín. ${fmt(lazerExig)} m²`, p: clamp(lazerTotal, lazerExig), s: sLazer },
        { l: 'VAGAS MORADORES', v: String(ofMorCom + ofMorPcd), m: `mín. ${exMorTot}`, p: clamp(ofMorCom + ofMorPcd, exMorTot), s: sVagasMor },
        { l: 'ABRIGO DE RESÍDUOS', v: fmt(resProj) + ' m²', m: `mín. ${fmt(resOrg + resRec)} m²`, p: clamp(resProj, resOrg + resRec), s: pior([sResOrg, sResRec]) }
    ]);
    atualizarPendencias([
        { id: 'row-unidades-habitacionais', inp: 'inp-uhs', s: sUhs, nome: sUhs === 'fail' ? `Limite de UHs na Via (exige via ≥ ${viaUH})` : 'Limite de UHs na Via' },
        { id: 'row-quadro-areas', inp: idTp(0, 'aptos'), s: sAptos, nome: 'UHs: Tipologias (Blocos × Pavimentos × Apartamentos)', rot: 'CONFERIR' },
        { id: 'row-comp-locacional', inp: 'inp-categoria-uso', s: sCL.zona, nome: 'Categoria de Uso na Zona', rot: 'VER NOTA' },
        { id: 'row-comp-locacional', inp: 'inp-faixa-dominio', s: sCL.via, nome: 'Compatibilidade Locacional (Via)', rot: 'VER NOTA' },
        { id: 'row-lazer', inp: 'inp-lazer-construida', s: sLazer, nome: 'Área de Lazer' },
        { id: 'row-permeabilidade', inp: 'inp-perm-proj-m2', s: sPerm, nome: sPerm === 'warn' ? 'Taxa de Permeabilidade (Compensar)' : 'Taxa de Permeabilidade' },
        { id: 'row-taxa-ocupacao', inp: idTp(0, 'acTerreo'), s: sTO, nome: 'Taxa de Ocupação (TO)' },
        { id: 'row-coeficiente-aproveitamento', inp: idTp(0, 'acTipo'), s: sCA, nome: sCA === 'warn' ? 'Coeficiente de Aproveitamento (Requer OODC)' : 'Coeficiente de Aproveitamento (CA)' },
        { id: 'row-indice-elevacao', inp: idTp(0, 'torres'), s: sIE, nome: sIE === 'warn' ? 'Índice de Elevação (Requer OODC)' : 'Índice de Elevação (IE)' },
        { id: 'row-vagas', inp: 'inp-vagas-morador-comum-ofer', s: sVagasMor, nome: 'Vagas para Moradores' },
        { id: 'row-vagas', inp: 'inp-vagas-vis-comum-ofer', s: sVagasVis, nome: 'Vagas para Visitantes' },
        { id: 'row-vagas', inp: 'inp-vagas-moto-ofer', s: sMoto, nome: 'Vagas para Motos' },
        { id: 'row-vagas', inp: 'inp-vagas-bike-ofer', s: sBike, nome: 'Vagas para Bicicletas' },
        { id: 'row-vagas', inp: 'inp-vagas-carga-ofer', s: sCarga, nome: 'Vaga de Carga e Descarga' },
        { id: 'row-faixa-acumulo', inp: 'inp-acumulo-faixas', s: sAcumulo, nome: 'Faixa de Acúmulo' },
        { id: 'row-abrigo-residuos', inp: 'inp-res-org-proj', s: sResOrg, nome: 'Abrigo de Resíduos (Orgânicos)' },
        { id: 'row-abrigo-residuos', inp: 'inp-res-rec-proj', s: sResRec, nome: 'Abrigo de Resíduos (Recicláveis)' }
    ]);

    /* aba CATEGORIA DE USO: zona, via e categoria em uso mudam a tabela (categoria.js) */
    if (CAT_USO_PRONTA) renderCategoriasUso();
}
