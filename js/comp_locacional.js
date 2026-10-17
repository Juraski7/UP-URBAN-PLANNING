/* UP! Urban Planning — compatibilidade locacional (LC 341/2018)
   - limite de UHs pela largura da via (muro a muro)
   - via mínima e infraestrutura exigidas por categoria de uso (COMP_LOCACIONAL_DB, LOUOS_AV_COMP_LOCACIONAL)
   - permissão da categoria na zona (CATEGORIA_USO_DB) */
'use strict';

/* =========================================================
   LIMITE DE UHs PELA VIA (mesma regra da planilha)
   < 12 m: até 6 • 12–15 m: até 25 • 15–18 m: até 200 • 18–22 m: até 250 • ≥ 22 m: mais de 250
   ========================================================= */
const FAIXAS_UH = [
    { viaMin: 0,  maxUH: 6,   nota: 5 },     // até 6 UHs: dispensada a exigência de largura (nota 5)
    { viaMin: 12, maxUH: 25 },
    { viaMin: 15, maxUH: 200, nota: 4 },     // até 200 UHs: via mínima reduzida para 15 m (nota 4)
    { viaMin: 18, maxUH: 250 },
    { viaMin: 22, maxUH: Infinity }
];
// Faixa permitida pela via (ex.: 15 m -> até 200 UHs)
const faixaPelaVia = via => FAIXAS_UH.filter(f => via >= f.viaMin).pop();
// Faixa exigida pela quantidade de UHs (ex.: 200 UHs -> 15 m; 201 UHs -> 18 m)
const faixaParaUHs = uhs => FAIXAS_UH.find(f => uhs <= f.maxUH);
const textoLimiteUH = f => Number.isFinite(f.maxUH) ? `ATÉ ${f.maxUH} UHs` : 'MAIS DE 250 UHs';

/* =========================================================
   VIA MÍNIMA POR CATEGORIA
   ========================================================= */
/* Reduções previstas nas notas da tabela. aplica() -> true / false / null (falta o dado para decidir)
   ctx = { ac: área construída total (NaN se não informada), uhs: nº de UHs (NaN se não informado) } */
const sabido = v => Number.isFinite(v) && v > 0;
const REDUCOES_VIA = {
    1: { via: 18, quando: 'área construída até 2.500 m²', aplica: c => sabido(c.ac) ? c.ac <= 2500 : null },
    2: { via: 15, quando: 'área construída até 500 m²',   aplica: c => sabido(c.ac) ? c.ac <= 500 : null },
    3: { via: 15, quando: 'área construída até 2.500 m²', aplica: c => sabido(c.ac) ? c.ac <= 2500 : null },
    4: { via: 15, quando: 'até 200 UHs',                  aplica: c => sabido(c.uhs) ? c.uhs <= 200 : null },
    5: { via: 0,  quando: 'até 6 UHs',                    aplica: c => sabido(c.uhs) ? c.uhs <= 6 : null }
};

/* Situação de uma categoria numa via:
   s: 'ok' | 'cond' (só atende se a nota se aplicar; falta dado) | 'fail'
   exig: via mínima exigida (0 = sem exigência) • reduzida: via mínima se a nota se aplicar */
function situacaoVia(codigo, via, ctx) {
    const d = COMP_LOCACIONAL_DB[codigo];
    if (!d) return null;
    const r = d.nota ? REDUCOES_VIA[d.nota] : null;
    const base = d.via ?? 0;
    const reduzida = r ? Math.min(base, r.via) : base;
    const aplica = r ? r.aplica(ctx) : false;
    const exig = aplica === true ? reduzida : base;
    const s = via >= exig ? 'ok' : aplica === null && via >= reduzida ? 'cond' : 'fail';
    return { s, exig, base, reduzida, nota: d.nota || null, aplica, reduziu: aplica === true && reduzida < base, infra: d.infra };
}

/* =========================================================
   CATEGORIAS (campo CATEGORIA DE USO)
   ========================================================= */
const GRUPOS_USO = { R: 'RESIDENCIAL', V: 'COMÉRCIO VAREJISTA', A: 'COMÉRCIO ATACADISTA', S: 'SERVIÇOS', I: 'INDUSTRIAL', E: 'ESPECIAL' };
const rotuloCategoria = c => `${c} - ${GRUPOS_USO[c[0]]}`;
const CATEGORIAS = Object.keys(COMP_LOCACIONAL_DB).map(rotuloCategoria);
// "r3", "R 3", "R3 - RESIDENCIAL" -> "R3"
const codigoCategoria = s => {
    const m = chave(s).match(/^([RVASIE])\s*(\d+)\b/);
    return m && COMP_LOCACIONAL_DB[m[1] + m[2]] ? m[1] + m[2] : null;
};
const categoriaCanonica = s => { const c = codigoCategoria(s); return c ? rotuloCategoria(c) : null; };

/* Permissão na zona: { permitida, nota: '(**)' ... } ou null se a zona não é conhecida */
function permissaoNaZona(usos, codigo) {
    if (!usos) return null;
    for (const tok of Object.values(usos).join(',').split(',')) {
        const m = tok.trim().match(/^([A-Z]+\d+)\s*(\(\*+\))?/);
        if (m && m[1] === codigo) return { permitida: true, nota: m[2] || '' };
    }
    return { permitida: false, nota: '' };
}
