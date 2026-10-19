/* UP! Urban Planning — motor de cálculo: verificações do empreendimento (aba Empreendimento)
   Cada verificação resulta em 'ok' | 'fail' | 'warn' | 'na' (faltam dados para avaliar).
   Os parâmetros de lei (percentuais, mínimos, fatores) ficam em js/regras.js (REGRAS). */
'use strict';

/* Recalcula no máximo 1x por quadro de animação, por mais eventos que cheguem */
let pending = false;
function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; calcularTudo(); verificarAlteracao(); });
}
document.addEventListener('input', e => { if (e.target.matches('input:not([data-mask])')) schedule(); });

/* CAMPOS MANUAL x AUTOMÁTICO (campos com data-auto="grupo"): o valor digitado fica MANUAL; os demais mostram o cálculo
   (AUTOMÁTICO). Apagar o valor volta ao cálculo. A lista dos digitados vai no .jsk (campo oculto do grupo).
   • bacia: largura, comprimento e profundidade; as 2 últimas digitadas ficam MANUAL e a 3ª é calculada pelo volume
   • res:   moradores e funcionários do abrigo de resíduos */
const BACIA = ['inp-bacia-largura', 'inp-bacia-comprimento', 'inp-bacia-profundidade'];
const GRUPOS_AUTO = {
    bacia: { oculto: 'inp-bacia-manuais', max: 2, padrao: BACIA.slice(0, 2) },     // padrão (e projetos antigos): profundidade calculada
    res:   { oculto: 'inp-res-manuais', max: Infinity, padrao: [] }
};
function manuais(grupo) {
    const g = GRUPOS_AUTO[grupo];
    try { const m = JSON.parse($(g.oculto).value); if (Array.isArray(m)) return m; } catch (e) { /* vazio: padrão */ }
    return g.padrao.slice();
}
document.addEventListener('input', e => {
    const el = e.target, grupo = el.dataset && el.dataset.auto;
    if (!grupo) return;
    const m = manuais(grupo).filter(id => id !== el.id);
    if (el.value.trim() !== '') m.push(el.id);
    $(GRUPOS_AUTO[grupo].oculto).value = JSON.stringify(m.slice(-GRUPOS_AUTO[grupo].max));
});
/* Mostra o modo do campo ('manual' | 'auto' | '' = sem cálculo, campo vazio); no automático escreve o valor calculado */
function mostrarModo(id, modo, valor = '') {
    const el = $(id);
    if (modo !== 'manual' && el !== document.activeElement) el.value = modo === 'auto' ? valor : '';
    el.classList.toggle('input-auto', modo === 'auto');
    el.title = { manual: 'Valor digitado (apague para voltar ao cálculo)', auto: 'Calculado (digite um valor para alterar)' }[modo] || '';
    const tag = document.querySelector(`[data-modo-de="${id}"]`);
    tag.textContent = { manual: 'MANUAL', auto: 'AUTOMÁTICO' }[modo] || '';
    tag.className = 'modo-tag ' + modo;
}
/* abrigo de resíduos: o valor digitado (MANUAL) ou o calculado (AUTOMÁTICO) */
function valorResiduo(id, calculado) {
    const manual = manuais('res').includes(id);
    mostrarModo(id, manual ? 'manual' : 'auto', String(calculado));
    return manual ? int(id) : calculado;
}
/* ABRIGO DE RESÍDUOS: campo vazio recebe o padrão (REGRAS.RESIDUOS.padroes) */
function padroesResiduos() {
    Object.entries(REGRAS.RESIDUOS.padroes).forEach(([id, v]) => { if (vazio(id)) $(id).value = String(v); });
}
document.addEventListener('click', e => {
    const b = e.target.closest('#btn-res-params');
    if (!b) return;
    const aberto = $('res-params').classList.toggle('hidden') === false;
    b.setAttribute('aria-expanded', String(aberto));
});

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
    txt('calc-uh-fracao', semUhs || uhs <= 0 || areaLote <= 0 ? '-' : fmt(areaLote / uhs) + ' m²/UH');     // fração: área do terreno ÷ UHs
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

    /* 4. LAZER (REGRAS.LAZER): exigida a partir de N UHs; m² por UH, com redução se houver lazer nas unidades privativas */
    const RL = REGRAS.LAZER;
    const lazerPrivativa = $('inp-lazer-privativa').value === 'SIM';
    const lazerPorUH = RL.m2PorUH * (lazerPrivativa ? 1 - RL.reducaoPrivativa : 1);
    const lazerDispensada = !semUhs && uhs < RL.aPartirDeUHs;
    const lazerExig = lazerDispensada ? 0 : uhs * lazerPorUH;
    txt('calc-lazer-exigida', lazerDispensada ? 'NÃO EXIGIDA' : fmt(lazerExig) + ' m²');
    txt('txt-lazer-fator', lazerDispensada ? `menos de ${RL.aPartirDeUHs} UHs: área de lazer não exigida (alínea i)`
        : `${fmt(lazerPorUH)} m² por UH` + (lazerPrivativa ? ` (redução de ${fmt(RL.reducaoPrivativa * 100, 0)}%, lazer nas unidades privativas)` : ''));
    // grupo LAZER do quadro de áreas: áreas construídas (LAZER e linhas que computam) + não cobertas (quadro_areas.js)
    const lazerTotal = m2('inp-lazer-construida') + somaLivres('lazer', 'ac') + somaLivres('lazer', 'valor');
    txt('calc-lazer-projeto', fmt(lazerTotal) + ' m²');
    const semLazer = vazio('inp-lazer-construida') && !lazerTotal;
    const sLazer = lazerDispensada ? setStatus('st-lazer', 'ok', 'DISPENSADA')
                                   : setStatus('st-lazer', est(lazerTotal >= lazerExig, semUhs || semLazer));

    /* 5. PERMEABILIDADE */
    const permExigM2 = amb ? areaLote * amb.permMin / 100 : 0;
    const permProjM2 = m2('inp-perm-proj-m2');
    const permProjPct = safeDiv(permProjM2 * 100, areaLote);
    const semPerm = !amb || areaLote <= 0 || vazio('inp-perm-proj-m2');
    const permComp = !semPerm && permProjM2 < permExigM2;
    const permDeficit = permComp ? (permExigM2 - permProjM2) * REGRAS.PERMEABILIDADE.compensacaoM3PorM2 : 0;
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
    // altura h = altura informada + 3 m (ou estimada pelos pavimentos)
    const alt = alturaH(), hEst = alt.h;
    txt('calc-altura-h', alt.h == null ? '-' : alt.estimada ? `h ≈ ${fmt(alt.h)} m\n(estimada: ${alt.pav} pav. x ${fmt(REGRAS.ALTURA.peDireitoEstimado)} m)`
        : `h = ${fmt(alt.altura)} + ${fmt(REGRAS.ALTURA.acrescimo)} = ${fmt(alt.h)} m`);
    const recZ = recuosDoImovel();
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
        if ($('inp-aplicar-oodc').value === 'SIM' && oodcArea > 0) oodcValor = oodcArea * iptuVal * REGRAS.OODC.percentualIptu;
    }
    txt('calc-oodc-area', fmt(oodcArea) + ' m²');
    txt('calc-oodc-valor', fmtMoeda(oodcValor));

    /* 10. VAGAS (REGRAS.VAGAS). Cada linha k usa os ids calc-vagas-k-exig, inp-vagas-k-ofer e st-vagas-k */
    const RV = REGRAS.VAGAS;
    const inpVaga = k => `inp-vagas-${k}-ofer`, ofer = (...ks) => ks.reduce((s, k) => s + int(inpVaga(k)), 0);
    const linhaVaga = (k, exig, porUHs = true) => {          // porUHs: o exigido depende das UHs (sem UHs = sem dados)
        txt(`calc-vagas-${k}-exig`, String(exig));
        return setStatus(`st-vagas-${k}`, est(ofer(k) >= exig, (porUHs && semUhs) || vazio(inpVaga(k))));
    };
    const totalVagas = (st, exig, ks, idExig, idOfer) => {
        txt(idExig, String(exig));
        txt(idOfer, String(ofer(...ks)));
        return setStatus(st, est(ofer(...ks) >= exig, semUhs || todosVazios(...ks.map(inpVaga))));
    };
    const exMorTot = arredCima(uhs * RV.moradorPorUH), exMorPcd = arredCima(exMorTot * RV.pcdMorador);
    linhaVaga('morador-comum', exMorTot - exMorPcd);
    linhaVaga('morador-pcd', exMorPcd);
    const sVagasMor = totalVagas('st-vagas-morador', exMorTot, ['morador-comum', 'morador-pcd'], 'calc-vagas-morador-exig', 'calc-vagas-morador-total-ofer');

    const exVisTot = arredCima(uhs * RV.visitantesPorUH);
    linhaVaga('vis-comum', Math.max(RV.visitanteComumMin, exVisTot - RV.pcdVisitante - RV.idosoVisitante));
    linhaVaga('vis-pcd', RV.pcdVisitante, false);
    linhaVaga('vis-idoso', RV.idosoVisitante, false);
    const sVagasVis = totalVagas('st-vagas-visitante', exVisTot, ['vis-comum', 'vis-pcd', 'vis-idoso'], 'calc-vagas-vis-total-exig', 'calc-vagas-vis-total-ofer');

    const sMoto = linhaVaga('moto', arredCima(uhs * RV.motosPorUH));
    const sBike = linhaVaga('bike', arredCima(uhs * RV.bicicletasPorUH));
    txt('calc-vagas-carga-exig', `NO MÍNIMO ${RV.cargaDescargaMin} ${RV.cargaDescargaMin === 1 ? 'VAGA' : 'VAGAS'}`);
    const sCarga = setStatus('st-vagas-carga', est(int('inp-vagas-carga-ofer') >= RV.cargaDescargaMin, vazio('inp-vagas-carga-ofer')));

    /* 11. BACIA DE DETENÇÃO */
    const volPluvial = areaLote * REGRAS.BACIA.coeficiente * (toProjPct / 100) * REGRAS.BACIA.multiplicador;
    const volTotal = volPluvial + permDeficit;
    txt('calc-bacia-vol-pluvial', fmt(volPluvial, 4) + ' m³');
    txt('calc-bacia-vol-total', fmt(volTotal, 4) + ' m³');
    // com duas medidas digitadas, a terceira = volume ÷ (produto das duas); com menos, nada a calcular
    const mb = manuais('bacia').filter(id => BACIA.includes(id)), [da, db] = mb.map(num);
    const auto = mb.length === 2 ? BACIA.find(id => !mb.includes(id)) : null;
    const terceira = da > 0 && db > 0 ? String(Math.round(volTotal / (da * db) * 100) / 100) : '';
    BACIA.forEach(id => mostrarModo(id, mb.includes(id) ? 'manual' : id === auto ? 'auto' : '', terceira));

    /* 12. FAIXA DE ACÚMULO (mínimos em REGRAS.FAIXA_ACUMULO) */
    const sAcumulo = pior(['faixas', 'veiculos', 'vagas', 'comprimento'].map(k => {
        const min = REGRAS.FAIXA_ACUMULO[k], inp = 'inp-acumulo-' + k;
        txt(`calc-acumulo-${k}-exig`, k === 'comprimento' ? fmt(min) + ' m' : String(min));
        return setStatus('st-acumulo-' + k, est(num(inp) >= min, vazio(inp)));
    }));

    /* 13. RESÍDUOS */
    txt('calc-res-uhs', String(uhs));
    const moradores = valorResiduo('inp-res-moradores', uhs * int('inp-res-dorms') * int('inp-res-hab-dorm'));
    const RR = REGRAS.RESIDUOS;
    const funcionarios = valorResiduo('inp-res-func', arredCima(uhs * RR.funcionariosPorUH));      // % das UHs, arredondado para cima
    const pop = moradores + funcionarios;
    txt('calc-res-pop-total', pop + ' Pessoas');
    const taxa = num('inp-res-taxa-hab');
    const resOrg = pop * taxa * RR.organicos.fracao * int('inp-res-dias-org') / RR.organicos.divisor;
    const resRec = pop * taxa * RR.reciclaveis.fracao * int('inp-res-dias-rec') / RR.reciclaveis.divisor;
    txt('calc-res-org-exig', fmt(resOrg) + ' m²');
    txt('calc-res-rec-exig', fmt(resRec) + ' m²');
    const semRes = semUhs || algumVazio('inp-res-dorms', 'inp-res-hab-dorm', 'inp-res-taxa-hab', 'inp-res-dias-org', 'inp-res-dias-rec');
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
        { l: 'ÁREA DE LAZER', v: fmt(lazerTotal) + ' m²', m: lazerDispensada ? `não exigida (< ${RL.aPartirDeUHs} UHs)` : `mín. ${fmt(lazerExig)} m²`, p: clamp(lazerTotal, lazerExig), s: sLazer },
        { l: 'VAGAS MORADORES', v: String(ofer('morador-comum', 'morador-pcd')), m: `mín. ${exMorTot}`, p: clamp(ofer('morador-comum', 'morador-pcd'), exMorTot), s: sVagasMor },
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
        { id: 'row-abrigo-residuos', inp: 'inp-res-rec-proj', s: sResRec, nome: 'Abrigo de Resíduos (Recicláveis)' },
        ...pendenciasComodos()                         // aba CÔMODOS: cômodos reprovados no Art. 113 (comodos.js)
    ]);

    /* aba CÔMODOS: áreas, exigências e situação de cada cômodo; a tipologia acompanha o quadro de áreas (comodos.js) */
    calcularComodos();

    /* aba CATEGORIA DE USO: zona, via e categoria em uso mudam a tabela (categoria.js). Com a aba fechada a tabela
       não é remontada a cada tecla; ela é atualizada ao abrir a aba (openTab) */
    if (CAT_USO_PRONTA && !$('tab-categoria').classList.contains('hidden')) renderCategoriasUso();
}
