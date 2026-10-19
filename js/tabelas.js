/* UP! Urban Planning — LEITURA DAS TABELAS DA LEI (planilha _apoio/TABELAS.xlsx)
   O gerador (ferramentas/gerar_dados.py) só copia cada aba para js/dados/NOME_DA_ABA.js, sem interpretar.
   Aqui cada tabela tem um LEITOR, que diz quais colunas usa e transforma as linhas no formato que o sistema usa
   (ZONA_DB, INDICES_DB, RECUOS_DB, VAGAS_DB...).

   QUANDO A LEI MUDAR
     • valores ou linhas novas (zona, bairro, categoria) .. só a planilha: salve, rode o gerador e publique js/dados
     • coluna renomeada na planilha ....................... o nome da coluna no quadro COLUNAS, logo abaixo
     • texto num formato novo (ex.: regra de recuo) ....... o leitor daquela tabela, neste arquivo
     • artigo do Código de Obras escrito por extenso na aba (CO_BANHEIROS): o texto é traduzido em regra pelo leitor;
       redação nova não reconhecida aparece no aviso do topo da página
     • número de lei fora das tabelas ...................... js/regras.js
   Se uma tabela não puder ser lida (aba ou coluna não encontrada, valor ilegível), aparece um aviso no topo da
   página e o restante do sistema continua funcionando; as verificações daquela tabela ficam sem dados. */
'use strict';

/* =========================================================
   COLUNAS USADAS DE CADA ABA
   Nome da coluna como está no cabeçalho da planilha (basta o início; acentos e maiúsculas não importam).
   ========================================================= */
const COLUNAS = {
    BAIRROS:                        { bairro: 'BAIRRO' },
    PDDUA_A52_MACROZONA_URBANA:     { bairro: 'BAIRRO', macrozona: 'MACROZONA' },
    PDDUA_A6_ZONAS_URBANAS:         { bairro: 'BAIRRO', zona: 'ZONA_URBANA' },
    PDDUA_A7_ZONAS_AMBIENTAIS:      { bairro: 'BAIRRO', za: 'ZONA_AMBIENTAL' },
    PDDUA_A71_TRA:                  { bairro: 'BAIRRO', traMin: 'TRA_M', alfa: 'Fator_Alfa', beta: 'Fator_Beta' },
    PDDUA_A81_CATEGORIA_USO:        { zona: 'ZONA DE USO', residencial: 'RESIDENCIAL', varejista: 'COMERCIO VAREJISTA',
                                      atacadista: 'COMERCIO ATACADISTA', servicos: 'SERVICOS', industrial: 'INDUSTRIAL',
                                      loteamento: 'LOTEAMENTO', especial: 'ESPECIAL' },
    PDDUA_A82_INDICES_URBANISTICOS: { zona: 'ZONA_URBANA', to: 'TAXA DE OCUPACAO', camin: 'COEFICIENTE DE APROVEITAMENTO MINIMO',
                                      caBas: 'COEFICIENTE DE APROVEITAMENTO BASICO', caMax: 'COEFICIENTE DE APROVEITAMENTO MAXIMO',
                                      oodc: 'OUTORGA ONEROSA', ie: 'INDICE DE ELEVACAO' },
    PDDUA_A82_LOTES_MINIMOS:        { zona: 'ZONA_URBANA', area: 'AREA', testadaEsquina: 'Testada Esquina', testadaMeio: 'Testada Meio' },
    PDDUA_A82_RECUOS_MINIMOS:       { zona: 'ZONA_URBANA', frente: 'FRENTE', lateral: 'LATERAL E FUNDOS',
                                      lateralOodc: 'LATERAL E FUNDOS NOS CASOS' },
    LOUOS_AV_COMP_LOCACIONAL:       { categoria: 'CATEGORIA', via: 'VIARIO', agua: 'AGUA', pavimentacao: 'PAVIMENTACAO',
                                      drenagem: 'DRENAGEM', esgoto: 'ESGOTO', energia: 'ENERGIA' },
    LOUOS_AIV_CAT_USO:              { categoria: 'CATEGORIA', descricao: 'DESCRI', porte: 'PORTE' },
    LOUOS_AVI_VAGAS:                { atividade: 'EMPREENDIMENTO', vagas: 'NUMERO DE VAGAS', parametro: 'PARAMETRO',
                                      carga: 'CARGA E DESCARGA', embarque: 'EMBARQUE' },
    CO_COMPARTIMENTOS:              { prolongada: 'PERMANENCIA PROLONGADA', transitoria: 'PERMANENCIA TRANSITORIA', especiais: 'ESPECIAIS' },
    CO_GEOMETRIA:                   { area: 'AREAS MINIMAS', diametro: 'PARA DIAMETRO' },
    CO_ABERTURAS:                   { permanencia: 0, abertura: 'ABERTURA', minima: 'MINIMA', ventilacao: 'VENTILACAO' }
};
// número no lugar do nome = posição da coluna (0 = 1ª coluna), para coluna sem título

/* =========================================================
   FERRAMENTAS DE LEITURA (não precisa alterar)
   ========================================================= */
const AVISOS_TABELAS = [];
const ascii = s => semAcento(String(s ?? '')).replace(/[^\x00-\x7F]/g, '');        // "ÁREA (m²)" -> "AREA (m)"
const espaco = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const linhasDe = s => String(s ?? '').split(/\r\n|\r|\n/);
const mapValores = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
const ordenar = chaves => [...chaves].sort((a, b) => { const x = ascii(a.toUpperCase()), y = ascii(b.toUpperCase()); return x < y ? -1 : x > y ? 1 : 0; });

/* número da tabela: "1.234,5" / "25%" / "0,4" -> 1234.5 / 25 / 0.4 (texto ilegível = erro com o valor) */
function numTab(s) {
    const t = String(s ?? '').trim().replace(/%/g, '').replace(/\./g, '').replace(/,/g, '.');
    const v = Number(t);
    if (t === '' || !Number.isFinite(v)) throw new Error(`valor numérico ilegível: "${s}"`);
    return v;
}

/* Abre a aba: localiza as colunas de COLUNAS e separa linhas de dados e a linha de notas de rodapé ("(1) ...") */
function abrir(aba) {
    const t = (window.TABELAS || {})[aba];
    if (!t) throw new Error(`aba "${aba}" não encontrada (confira a planilha, rode o gerador e o <script> js/dados/${aba}.js no VALIDADOR)`);
    const cab = t.colunas.map(c => espaco(ascii(c)).toUpperCase());
    const col = {}, usadas = [];
    for (const [nome, prefixo] of Object.entries(COLUNAS[aba] || {})) {
        if (typeof prefixo === 'number') { col[nome] = prefixo; usadas.push(prefixo); continue; }      // coluna pela posição
        const alvo = espaco(ascii(prefixo)).toUpperCase();
        const i = cab.findIndex((c, k) => c.startsWith(alvo) && !usadas.includes(k));
        if (i < 0) throw new Error(`coluna "${prefixo}" não encontrada. Colunas da aba: ${t.colunas.filter(Boolean).map(espaco).join(' | ')}`);
        col[nome] = i;
        usadas.push(i);
    }
    const ehNota = r => String(r[0] ?? '').trimStart().startsWith('(');
    return {
        colunas: t.colunas, col,
        cel: (r, nome) => String(r[col[nome]] ?? ''),
        todas: t.linhas,                                                            // todas as linhas abaixo do cabeçalho
        linhas: t.linhas.filter(r => String(r[0] ?? '').trim() && !ehNota(r)),     // linhas de dados
        notas: (t.linhas.find(ehNota) || [''])[0]                                  // texto da linha de notas
    };
}
/* "(1) texto\n(2) texto" -> { 1: 'texto', 2: 'texto' } */
function notasDaLinha(texto) {
    const out = {};
    linhasDe(texto).forEach(l => { const m = l.match(/^\s*\((\d+)\)\s*(.+)/); if (m) out[+m[1]] = m[2].trim(); });
    return out;
}
const semPontoFinal = t => t.replace(/\.+$/, '');

/* Executa um leitor; se a tabela tiver problema, registra o aviso e devolve o valor vazio (o sistema continua) */
function ler(aba, vazio, leitor) {
    try { return leitor(); } catch (e) {
        AVISOS_TABELAS.push(`${aba}: ${e.message}`);
        console.error(`Tabela ${aba}:`, e);
        return vazio;
    }
}
/* Aviso no topo da página quando alguma tabela não pôde ser lida (main.js) */
function mostrarAvisosTabelas() {
    if (!AVISOS_TABELAS.length) return;
    const box = document.createElement('div');
    box.id = 'avisos-tabelas';
    box.className = 'no-print bg-red-50 border border-red-300 text-red-800 rounded-xl p-3 text-xs space-y-1';
    box.innerHTML = '<p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Problema na leitura das tabelas da lei (_apoio/TABELAS.xlsx). '
        + 'As verificações que dependem delas ficam sem dados até a planilha ser corrigida e o gerador rodar de novo:</p>'
        + AVISOS_TABELAS.map(a => `<p>• ${escHtml(a)}</p>`).join('');
    document.querySelector('main').prepend(box);
}

/* =========================================================
   LEITORES
   ========================================================= */
/* ---------- Bairros e zoneamento por bairro (PDDUA, Anexos 5.2, 6, 7 e 7.1) */
const BAIRROS = ler('BAIRROS', [], () => {
    const T = abrir('BAIRROS');
    return ordenar(new Set(T.todas.map(r => T.cel(r, 'bairro').trim().toUpperCase()).filter(Boolean)));
});
/* { BAIRRO: { campo: valor } } com os campos do leitor */
function porBairro(aba, campos) {
    const T = abrir(aba), dados = {};
    T.linhas.forEach(r => { dados[T.cel(r, 'bairro').trim().toUpperCase()] = r; });
    return Object.fromEntries(ordenar(Object.keys(dados)).map(b =>
        [b, Object.fromEntries(Object.entries(campos).map(([c, conv]) => [c, conv(T.cel(dados[b], c))]))]));
}
const texto = v => v.trim();
const MACROZONA_DB = ler('PDDUA_A52_MACROZONA_URBANA', {}, () => porBairro('PDDUA_A52_MACROZONA_URBANA', { macrozona: texto }));
const ZONA_DB = ler('PDDUA_A6_ZONAS_URBANAS', {}, () => porBairro('PDDUA_A6_ZONAS_URBANAS', { zona: texto }));
const ZONAS_AMBIENTAIS_DB = ler('PDDUA_A7_ZONAS_AMBIENTAIS', {}, () => porBairro('PDDUA_A7_ZONAS_AMBIENTAIS', { za: texto }));
const TRA_DB = ler('PDDUA_A71_TRA', {}, () => porBairro('PDDUA_A71_TRA', { traMin: numTab, alfa: numTab, beta: numTab }));

/* ---------- Categorias de uso permitidas por zona (PDDUA, Anexo 8.1) */
const { CATEGORIA_USO_DB, CATEGORIA_USO_NOTAS } = ler('PDDUA_A81_CATEGORIA_USO', { CATEGORIA_USO_DB: {}, CATEGORIA_USO_NOTAS: [] }, () => {
    const T = abrir('PDDUA_A81_CATEGORIA_USO');
    const usos = ['residencial', 'varejista', 'atacadista', 'servicos', 'industrial', 'loteamento', 'especial'];
    const limpa = v => v.split(',').map(p => p.trim()).filter(Boolean).join(', ') || '-';      // "A1,A2," -> "A1, A2"
    return {
        CATEGORIA_USO_DB: Object.fromEntries(T.linhas.map(r => [T.cel(r, 'zona').trim(), Object.fromEntries(usos.map(u => [u, limpa(T.cel(r, u))]))])),
        CATEGORIA_USO_NOTAS: linhasDe(T.notas).map(l => l.trim()).filter(Boolean)              // "(*) Na Zona de Expansão..." (OBSERVAÇÕES)
    };
});

/* ---------- Índices urbanísticos (PDDUA, Anexo 8.2)
   to = TO (do térreo, quando a zona diferencia; toTexto = texto original) • camin/caBas/caMax • oodc (null = "-")
   ie (null = Livre) • ieOodc = IE com outorga, tirado da nota citada ("... passa a ser X") • *Notas = notas citadas */
const { INDICES_DB, INDICES_NOTAS } = ler('PDDUA_A82_INDICES_URBANISTICOS', { INDICES_DB: {}, INDICES_NOTAS: {} }, () => {
    const T = abrir('PDDUA_A82_INDICES_URBANISTICOS');
    const notas = mapValores(notasDaLinha(T.notas), semPontoFinal);
    const separa = v => {                                                            // '4 (5)' -> ['4', [5]]
        v = espaco(v);
        return [v.replace(/\(\d+\)/g, '').trim(), [...v.matchAll(/\((\d+)\)/g)].map(m => +m[1])];
    };
    const ieComOodc = (ie, ns) => {
        for (const k of ns) {
            const m = (notas[k] || '').match(/passa a ser\s+(Livre|[\d,]+)/);
            if (m) return m[1] === 'Livre' ? null : numTab(m[1]);
        }
        return ie;
    };
    const db = {};
    T.linhas.forEach(r => {
        const zona = T.cel(r, 'zona').trim();
        const [toV, toN] = separa(T.cel(r, 'to'));
        let to, toTexto = null;
        if (/^[\d,]+$/.test(toV)) to = numTab(toV);
        else {                                                                       // "Térreo e 1º Pavimento - 0,7 Demais Pavimentos - 0,5"
            const m = toV.match(/T[ée]rreo[^-]*-\s*([\d,]+)/);
            if (!m) throw new Error(`zona ${zona}: taxa de ocupação ilegível: "${toV}"`);
            to = numTab(m[1]);                                                       // a verificação usa a TO do térreo (AO)
            toTexto = toV.replace(/\s+(?=Demais)/g, '\n');
        }
        const [odV, odN] = separa(T.cel(r, 'oodc')), [ieV, ieN] = separa(T.cel(r, 'ie'));
        const ie = ieV.toLowerCase() === 'livre' ? null : numTab(ieV);
        db[zona] = { to, ...(toTexto ? { toTexto } : {}), toNotas: toN,
            camin: numTab(separa(T.cel(r, 'camin'))[0]), caBas: numTab(separa(T.cel(r, 'caBas'))[0]), caMax: numTab(separa(T.cel(r, 'caMax'))[0]),
            oodc: odV === '' || odV === '-' ? null : numTab(odV), oodcNotas: odN,
            ie, ieOodc: ieComOodc(ie, ieN), ieNotas: ieN };
    });
    return { INDICES_DB: db, INDICES_NOTAS: notas };
});

/* ---------- Lotes mínimos (PDDUA, Anexo 8.2): área (m²), testadas (m); null = "-" */
const LOTES_DB = ler('PDDUA_A82_LOTES_MINIMOS', {}, () => {
    const T = abrir('PDDUA_A82_LOTES_MINIMOS');
    const n = v => ['', '-'].includes(v.trim()) ? null : numTab(v);
    return Object.fromEntries(T.linhas.map(r => [T.cel(r, 'zona').trim(),
        { area: n(T.cel(r, 'area')), testadaEsquina: n(T.cel(r, 'testadaEsquina')), testadaMeio: n(T.cel(r, 'testadaMeio')) }]));
});

/* ---------- Recuos mínimos (PDDUA, Anexo 8.2): uma condição por linha ("IE maior que 2 - h/4 (mínimo 3,00 m)");
   as regras do texto são interpretadas em js/recuos.js */
const { RECUOS_DB, RECUOS_NOTAS } = ler('PDDUA_A82_RECUOS_MINIMOS', { RECUOS_DB: {}, RECUOS_NOTAS: {} }, () => {
    const T = abrir('PDDUA_A82_RECUOS_MINIMOS');
    const limpa = v => {
        v = v.trim();
        if (v === '' || v === '-') return '-';
        v = v.replace(/[ \t]+(?=(IE |Demais pavimentos))/g, '\n');                  // itens que vieram na mesma linha
        v = v.replace(/(\d+,\d{2})(?!\s*m\b)/g, '$1 m');                            // 5,00 -> 5,00 m
        return linhasDe(v).map(l => l.trim()).filter(Boolean).join('\n');
    };
    return {
        RECUOS_DB: Object.fromEntries(T.linhas.map(r => [T.cel(r, 'zona').trim(),
            { frente: limpa(T.cel(r, 'frente')), lateral: limpa(T.cel(r, 'lateral')), lateralOodc: limpa(T.cel(r, 'lateralOodc')) }])),
        RECUOS_NOTAS: mapValores(notasDaLinha(T.notas), semPontoFinal)
    };
});

/* ---------- Compatibilidade locacional (LOUOS, Anexo V): via mínima (null = sem exigência), infraestrutura "E" (exigida)
   e nº da nota que pode reduzir a via (reduções em js/regras.js, REGRAS.VIA_MINIMA) */
const { COMP_LOCACIONAL_DB, COMP_LOCACIONAL_NOTAS } = ler('LOUOS_AV_COMP_LOCACIONAL', { COMP_LOCACIONAL_DB: {}, COMP_LOCACIONAL_NOTAS: {} }, () => {
    const T = abrir('LOUOS_AV_COMP_LOCACIONAL');
    const INFRA = [['agua', 'ÁGUA'], ['pavimentacao', 'PAVIMENTAÇÃO'], ['drenagem', 'DRENAGEM'], ['esgoto', 'ESGOTO'], ['energia', 'ENERGIA']];
    const db = {};
    T.linhas.forEach(r => {
        const m = T.cel(r, 'categoria').match(/^\s*([A-Z])\s*(\d+)\s*(?:\((\d+)\))?\s*$/);       // "R2 (5)" -> R2, nota 5
        if (!m) throw new Error(`categoria inválida "${T.cel(r, 'categoria')}"`);
        const via = T.cel(r, 'via').trim();
        if (via !== '-' && !/^\d+$/.test(via)) throw new Error(`categoria ${m[1] + m[2]}: via ilegível "${via}"`);
        db[m[1] + m[2]] = { via: via === '-' ? null : parseInt(via, 10),
            infra: INFRA.filter(([c]) => T.cel(r, c).trim() === 'E').map(([, nome]) => nome), ...(m[3] ? { nota: +m[3] } : {}) };
    });
    return { COMP_LOCACIONAL_DB: db, COMP_LOCACIONAL_NOTAS: notasDaLinha(T.notas) };
});

/* ---------- Categorias de uso: descrição e porte (LOUOS, Anexo IV)
   un = "m2" | "uh" | null (qualquer porte) • min/max = faixa (null = sem limite) • minExcl = "Acima de ..." (limite não entra) */
const { CAT_USO_DESC, CAT_USO_NOTAS } = ler('LOUOS_AIV_CAT_USO', { CAT_USO_DESC: [], CAT_USO_NOTAS: {} }, () => {
    const T = abrir('LOUOS_AIV_CAT_USO');
    const faixa = porte => {                                         // "Acima de 1.000 m² até 5.000m²" -> ['m2', 1000, 5000, true]
        const p = ascii(porte.toLowerCase());
        if (p.includes('qualquer')) return [null, null, null, false];
        const un = p.includes('unidade') ? 'uh' : 'm2';
        const nums = (p.match(/\d[\d.]*(?:,\d+)?/g) || []).map(numTab);
        if (!nums.length) throw new Error(`porte não reconhecido: "${porte}"`);
        if (p.startsWith('ate')) return [un, null, nums[0], false];
        if (p.startsWith('acima de')) return [un, nums[0], nums[1] ?? null, true];
        if (p.startsWith('de ')) return [un, nums[0], nums[1] ?? null, false];
        if (nums.length === 1) return [un, nums[0], nums[0], false];                  // "1 unidade"
        throw new Error(`porte não reconhecido: "${porte}"`);
    };
    const ordem = 'RVASILE';
    const itens = T.linhas.map(r => {
        const m = T.cel(r, 'categoria').match(/^\s*([A-Z])\s*(\d+)/);
        if (!m) throw new Error(`categoria inválida "${T.cel(r, 'categoria')}"`);
        const porte = espaco(T.cel(r, 'porte')), [un, min, max, minExcl] = faixa(porte);
        const g = ordem.indexOf(m[1]);
        return { chave: [g < 0 ? 9 : g, +m[2]],
                 item: { cat: m[1] + m[2], porte, un, min, max, ...(minExcl ? { minExcl: true } : {}), desc: espaco(T.cel(r, 'descricao')) } };
    });
    itens.sort((a, b) => a.chave[0] - b.chave[0] || a.chave[1] - b.chave[1]);
    return { CAT_USO_DESC: itens.map(x => x.item),
             CAT_USO_NOTAS: mapValores(notasDaLinha(T.notas), t => t.replace(/m²\s*m\(/g, 'm² (')) };     // corrige "2.500m² m(dois"
});

/* ---------- Vagas por atividade (LOUOS, Anexo VI)
   regras = parâmetros { base, por, texto } (com 2 regras vale o MAIOR resultado); base: ac, terreno, unidades, quartos,
   assentos, salas • excecao = regra da nota citada (ex.: acima de 5.000 m², 1 vaga para cada 80 m²) */
const { VAGAS_DB, VAGAS_NOTAS } = ler('LOUOS_AVI_VAGAS', { VAGAS_DB: [], VAGAS_NOTAS: {} }, () => {
    const T = abrir('LOUOS_AVI_VAGAS');
    const notas = mapValores(notasDaLinha(T.notas), semPontoFinal);
    const excecao = n => {                                           // "mais de 5.000m² será exigida 1 vaga para cada 80m²"
        const m = (notas[n] || '').match(/mais de ([\d.]+)\s*m².*?cada (\d+)\s*m²/);
        return m ? { acimaDe: numTab(m[1]), por: numTab(m[2]) } : null;
    };
    const BASES = [['area de terreno', 'terreno'], ['area construida', 'ac'], ['unidade', 'unidades'], ['quarto', 'quartos'], ['assento', 'assentos'], ['sala', 'salas']];
    const regra = txt => {
        const t = ascii(txt.toLowerCase());
        const base = (BASES.find(([chaveTxt]) => t.includes(chaveTxt)) || [])[1];
        if (!base) throw new Error(`parâmetro não reconhecido: "${txt}"`);
        const m = t.match(/para cada\s+(\d[\d.]*)/), nota = txt.trim().match(/\((\d+)\)\s*$/);
        const r = { base, por: m ? numTab(m[1]) : 1, texto: espaco(txt.replace(/^1 \(uma\) vaga\s+/, '')) };
        if (nota) {
            r.nota = +nota[1];
            r.texto = r.texto.replace(/\s*\(\d+\)\s*$/, '');
            const ex = excecao(r.nota);
            if (ex) r.excecao = ex;
        }
        return r;
    };
    const itens = [];
    T.todas.forEach(r => {
        if (!r.slice(0, 5).some(c => String(c).trim()) || T.cel(r, 'atividade').trimStart().startsWith('(')) return;
        if (!T.cel(r, 'atividade').trim()) {                             // linha mesclada: 2º parâmetro da atividade anterior
            if (!itens.length) throw new Error('linha de parâmetro sem atividade acima');
            itens[itens.length - 1].regras.push(regra(T.cel(r, 'parametro')));
            return;
        }
        const m = T.cel(r, 'vagas').trim().match(/^(\d+)/);
        itens.push({ atividade: espaco(T.cel(r, 'atividade')).replace(/\s*\(atender ao maior.*?\)/g, ''), vagas: m ? +m[1] : 1,
                     carga: T.cel(r, 'carga').toLowerCase().includes('exig'), embarque: T.cel(r, 'embarque').toLowerCase().includes('exig'),
                     regras: [regra(T.cel(r, 'parametro'))] });
    });
    return { VAGAS_DB: itens, VAGAS_NOTAS: notas };
});

/* ---------- Código de Obras */
/* "Art. 107 - ...\nCódigo de Obras" -> ['Art. 107 - ...', 'Código de Obras'] (última linha que não é item nem artigo = fonte) */
function artigoEFonte(txt) {
    const ls = linhasDe(String(txt).trim()).map(l => l.trimEnd());
    if (ls.length > 1 && !/^\s*(\d+\s*-|art\.)/i.test(ls[ls.length - 1])) return [ls.slice(0, -1).join('\n').trim(), ls[ls.length - 1].trim()];
    return [ls.join('\n').trim(), ''];
}
/* Classificação dos compartimentos (Art. 107 a 109): uma coluna por permanência; a linha "Art. ..." é o artigo */
const CO_COMPARTIMENTOS = ler('CO_COMPARTIMENTOS', {}, () => {
    const T = abrir('CO_COMPARTIMENTOS');
    const chaves = Object.keys(T.col).sort((a, b) => T.col[a] - T.col[b]);         // na ordem das colunas da planilha
    const out = Object.fromEntries(chaves.map(k => [k, { titulo: T.colunas[T.col[k]].trim(), itens: [], artigo: '', fonte: '' }]));
    T.todas.forEach(r => chaves.forEach(k => {
        const v = T.cel(r, k).trim();
        if (!v) return;
        if (/^art\./i.test(v)) [out[k].artigo, out[k].fonte] = artigoEFonte(v);
        else out[k].itens.push(espaco(v));
    }));
    return out;
});
/* Diâmetro mínimo do círculo por faixa de área (Art. 113): texto da planilha; a regra é montada em js/regras.js */
const CO_GEOMETRIA = ler('CO_GEOMETRIA', { colunas: ['', ''], faixas: [], artigo: '', fonte: '' }, () => {
    const T = abrir('CO_GEOMETRIA');
    const out = { colunas: [T.colunas[T.col.area].trim(), T.colunas[T.col.diametro].trim()], faixas: [], artigo: '', fonte: '' };
    T.todas.forEach(r => {
        const a = T.cel(r, 'area').trim(), d = T.cel(r, 'diametro').trim();
        if (/^art\./i.test(a)) [out.artigo, out.fonte] = artigoEFonte(a);
        else if (a && d) out.faixas.push([espaco(a), espaco(d)]);
    });
    if (!out.faixas.length) throw new Error('nenhuma faixa de área encontrada');
    out.fonte = out.fonte || 'Código de Obras';
    return out;
});

/* ---------- Abas de ARTIGO (Código de Obras): o texto da lei, uma linha por item, sem cabeçalho.
   O leitor traduz o texto em regra; se a redação mudar e não for reconhecida, aparece o aviso no topo da página. */
function linhasDaAba(aba) {                                          // todas as linhas, inclusive a 1ª (não há cabeçalho)
    const t = (window.TABELAS || {})[aba];
    if (!t) throw new Error(`aba "${aba}" não encontrada (confira a planilha, rode o gerador e o <script> js/dados/${aba}.js no VALIDADOR)`);
    return [t.colunas, ...t.linhas];
}
const textoDaAba = aba => linhasDaAba(aba).map(r => r.filter(c => String(c).trim()).join(' ').trim()).filter(Boolean);
const fonteDoArtigo = artigo => { const m = String(artigo).match(/^\s*Art\.\s*(\d+)/i); return 'Código de Obras' + (m ? `, Art. ${m[1]}` : ''); };
const itemDoArtigo = (linhas, n) => linhas.find(l => new RegExp(`^${n}\\s*[-–]`).test(l.trim())) || '';
const PERMANENCIAS = [['PROLONGADA', 'prolongada'], ['TRANSITORIA', 'transitoria'], ['ESPECIA', 'especiais']];
const permanenciaDe = txt => (PERMANENCIAS.find(([p]) => chave(txt).includes(p)) || [])[1];

/* Pé-direito mínimo (Art. 114): linhas "PERMANÊNCIA PROLONGADA | >= 2,5"; a linha "Art. ..." é o artigo
   -> { minimo: { prolongada: 2.5, transitoria: 2.3 }, artigo, fonte }  (permanência fora da tabela: fixada no Código) */
const CO_PE_DIREITO = ler('CO_PE_DIREITO', null, () => {
    const out = { minimo: {}, artigo: '', fonte: '' };
    linhasDaAba('CO_PE_DIREITO').forEach(r => {
        const a = String(r[0] ?? '').trim(), b = String(r[1] ?? '').trim();
        if (/^art\./i.test(a)) { out.artigo = a; return; }
        if (!a) return;
        const perm = permanenciaDe(a), m = b.match(/\d+(?:[.,]\d+)?/);
        if (!perm) throw new Error(`linha "${a}": permanência não reconhecida (use PERMANÊNCIA PROLONGADA, TRANSITÓRIA ou ESPECIAIS)`);
        if (!m) throw new Error(`linha "${a}": valor do pé-direito ilegível "${b}" (ex.: >= 2,50)`);
        out.minimo[perm] = numTab(m[0]);
    });
    if (!Object.keys(out.minimo).length) throw new Error('nenhum pé-direito mínimo encontrado');
    out.fonte = fonteDoArtigo(out.artigo || 'Art. 114');
    return out;
});

/* Aberturas para iluminação e ventilação (Art. 124): uma linha por permanência
   | (permanência) | ABERTURA (fração da área do compartimento: "1/7") | MÍNIMA (m²) | VENTILAÇÃO (parte da área exigida: 0,5) |
   Linha sem fração (ex.: ESPECIAL | VALIDAR E CONSULTA): sem regra numérica; o texto vai para a situação.
   -> { fracao, fracaoTexto, minimo, ventilacao, semRegra } por permanência (prolongada, transitoria, especiais) */
const fracaoDe = txt => {                                            // "1/7" -> 1/7 • "0,14" -> 0.14 • "14%" -> 0.14
    const t = String(txt).trim(), f = t.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (f) return numTab(f[1]) / numTab(f[2]);
    return /%$/.test(t) ? numTab(t) / 100 : numTab(t);
};
const CO_ABERTURAS = ler('CO_ABERTURAS', null, () => {
    const T = abrir('CO_ABERTURAS');
    const out = { fracao: {}, fracaoTexto: {}, minimo: {}, ventilacao: {}, semRegra: {} };
    T.linhas.forEach(r => {
        const nome = T.cel(r, 'permanencia').trim(), perm = permanenciaDe(nome), ab = T.cel(r, 'abertura').trim();
        if (!perm) throw new Error(`linha "${nome}": permanência não reconhecida (use PERMANÊNCIA PROLONGADA, TRANSITÓRIA ou ESPECIAL)`);
        if (!/\d/.test(ab)) { out.semRegra[perm] = ab || 'VER CÓDIGO'; return; }               // ex.: "VALIDAR E CONSULTA"
        out.fracao[perm] = fracaoDe(ab);
        out.fracaoTexto[perm] = ab.replace(/\s+/g, '');
        out.minimo[perm] = T.cel(r, 'minima').trim() ? numTab(T.cel(r, 'minima')) : 0;
        out.ventilacao[perm] = T.cel(r, 'ventilacao').trim() ? fracaoDe(T.cel(r, 'ventilacao')) : null;
    });
    if (!Object.keys(out.fracao).length) throw new Error('nenhuma permanência com fração de abertura (ex.: 1/7)');
    return out;
});

/* Banheiros, lavabos e instalações sanitárias (Art. 115), traduzido do texto:
   item 1: instalação sanitária única -> área mínima (2,00m2); item 2: mais de uma -> área mínima de cada (1,20m2).
   Itens 3 a 5 (celas agrupadas, anteparo/antecâmara, percurso até 100 m) ficam como informação. */
const CO_BANHEIROS = ler('CO_BANHEIROS', null, () => {
    const linhas = textoDaAba('CO_BANHEIROS');
    const area = n => { const m = chave(itemDoArtigo(linhas, n)).match(/(\d+(?:,\d+)?)\s*M2/); return m ? numTab(m[1]) : null; };
    const out = { areaUnico: area(1), areaCada: area(2), artigo: linhas.join('\n'), fonte: fonteDoArtigo(linhas[0]) };
    if (out.areaUnico == null || out.areaCada == null) throw new Error('itens 1 e 2 não reconhecidos: esperado "área mínima de 2,00m2" (item 1) e "1,20m2" (item 2)');
    return out;
});

/* =========================================================
   CONSULTAS (por bairro ou zona, ignorando acentos e maiúsculas)
   ========================================================= */
const bairroCanonico    = s => BAIRROS.find(n => chave(n) === chave(s)) || null;
const zonaUrbana        = buscaPor(ZONA_DB);              // PDDUA_A6_ZONAS_URBANAS
const macrozonaDoBairro = buscaPor(MACROZONA_DB);         // PDDUA_A52_MACROZONA_URBANA
const zonaAmbiental     = buscaPor(ZONAS_AMBIENTAIS_DB);  // PDDUA_A7_ZONAS_AMBIENTAIS
const traDoBairro       = buscaPor(TRA_DB);               // PDDUA_A71_TRA
const usosDaZona        = buscaPor(CATEGORIA_USO_DB);     // PDDUA_A81_CATEGORIA_USO
const indicesDaZona     = buscaPor(INDICES_DB);           // PDDUA_A82_INDICES_URBANISTICOS
const lotesDaZona       = buscaPor(LOTES_DB);             // PDDUA_A82_LOTES_MINIMOS
const recuosDaZona      = buscaPor(RECUOS_DB);            // PDDUA_A82_RECUOS_MINIMOS
// zona urbana (Anexo 6) e macrozona (Anexo 5.2) do bairro: { zona, macrozona }
const zonaDoBairro = nome => {
    const z = zonaUrbana(nome);
    return z ? { ...z, macrozona: (macrozonaDoBairro(nome) || {}).macrozona || '-' } : null;
};
// zoneamento ambiental do bairro: Anexo 7 (za) + Anexo 7.1 (traMin, alfa, beta) + taxa de permeabilidade mínima da ZA (js/regras.js)
const ambientalDoBairro = nome => {
    const za = zonaAmbiental(nome), tra = traDoBairro(nome);
    if (!za && !tra) return null;
    const amb = { ...za, ...tra };
    amb.permMin = REGRAS.PERMEABILIDADE.minimoPorZA[amb.za] ?? null;
    return amb;
};
