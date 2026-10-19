"""UP! Urban Planning — copia a planilha TABELAS.xlsx para js/dados/ (um arquivo .js por aba).

Uso (na pasta do sistema):   python ferramentas/gerar_dados.py [caminho/da/TABELAS.xlsx]
Sem o caminho, usa _apoio/TABELAS.xlsx.

• O gerador NÃO interpreta nada: cada aba vira TABELAS["NOME_DA_ABA"] = { colunas, linhas }, com o texto das
  células como está (números no padrão brasileiro, "0,4"). Quem lê as tabelas é o sistema, em js/tabelas.js.
  Assim, aba nova, coluna nova ou lei nova não exigem mudança neste arquivo.
• O site NÃO usa Python: ele carrega os .js gerados aqui. Rode o gerador só quando a planilha mudar e publique
  a pasta js/dados junto com o resto do site (GitHub Pages ou servidor).
• Tudo ou nada: se alguma aba não puder ser lida, nenhum arquivo é alterado (os atuais continuam valendo).
• Salve a planilha no Excel antes de rodar (o gerador lê a última versão salva).
"""
import datetime, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'js', 'dados')
PLANILHA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, '_apoio', 'TABELAS.xlsx')
HTML = os.path.join(RAIZ, 'VALIDADOR_R08.html')
IGNORAR = set()                 # abas que não devem virar arquivo (ex.: {'RASCUNHO'}); hoje todas são convertidas
MARCA = 'GERADO por ferramentas/gerar_dados.py'
J = lambda v: json.dumps(v, ensure_ascii=False)


def relativo(caminho):
    """caminho relativo à pasta do sistema, para exibir (outra unidade de disco: caminho completo)"""
    try:
        return os.path.relpath(caminho, RAIZ)
    except ValueError:
        return caminho


def celula(v):
    """valor da célula -> texto ('' vazia; número no padrão BR: 0.4 -> '0,4', 250 -> '250')"""
    if v is None:
        return ''
    if isinstance(v, bool):
        return 'SIM' if v else 'NÃO'
    if isinstance(v, (int, float)):
        return ('%.10g' % v).replace('.', ',')
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.strftime('%d/%m/%Y')
    return str(v)


def ler_aba(ws):
    """[[texto, ...], ...] sem linhas vazias e sem colunas vazias à direita"""
    linhas = [[celula(v) for v in r] for r in ws.iter_rows(values_only=True)]
    linhas = [r for r in linhas if any(c.strip() for c in r)]
    largura = max((max((i + 1 for i, c in enumerate(r) if c.strip()), default=0) for r in linhas), default=0)
    return [r[:largura] + [''] * (largura - len(r)) for r in linhas]


def arquivo_js(aba, linhas, origem):
    cab, dados = linhas[0], linhas[1:]
    corpo = ',\n'.join('        ' + J(r) for r in dados)
    return (f'/* {"=" * 100}\n'
            f'   {aba}\n'
            f'   Aba "{aba}" da planilha {origem}: {len(dados)} linha(s) x {len(cab)} coluna(s).\n'
            f'   {MARCA}: não editar à mão (altere a planilha e rode o gerador).\n'
            f'   Quem interpreta esta tabela: js/tabelas.js.\n'
            f'   {"=" * 100} */\n'
            "'use strict';\n\n"
            f'(window.TABELAS = window.TABELAS || {{}})[{J(aba)}] = {{\n'
            f'    colunas: {J(cab)},\n'
            f'    linhas: [\n{corpo}\n    ]\n}};\n')


def main():
    try:
        import openpyxl
    except ImportError:
        sys.exit('Falta o pacote openpyxl. Instale com:  pip install openpyxl')
    if not os.path.isfile(PLANILHA):
        sys.exit(f'Planilha não encontrada: {PLANILHA}')
    print(f'Lendo {relativo(PLANILHA)} ...')
    try:
        wb = openpyxl.load_workbook(PLANILHA, data_only=True, read_only=True)
    except Exception as e:
        sys.exit(f'Não foi possível abrir a planilha (está corrompida ou em outro formato?): {e}')

    # 1. lê tudo antes de gravar (tudo ou nada)
    saidas, erros = {}, []
    for ws in wb.worksheets:
        if ws.title in IGNORAR:
            print(f'  {ws.title:<36} (ignorada: não é tabela de dados)')
            continue
        if not re.fullmatch(r'[A-Za-z0-9_]+', ws.title):
            erros.append(f'{ws.title}: o nome da aba deve ter só letras sem acento, números e "_" (vira nome de arquivo)')
            continue
        try:
            linhas = ler_aba(ws)
        except Exception as e:
            erros.append(f'{ws.title}: {e}')
            continue
        if len(linhas) < 2:
            erros.append(f'{ws.title}: aba vazia (precisa de cabeçalho e ao menos uma linha)')
            continue
        saidas[ws.title] = arquivo_js(ws.title, linhas, os.path.basename(PLANILHA))
        print(f'  {ws.title + ".js":<36} {len(linhas) - 1:>3} linha(s)')
    if erros:
        print('\nNENHUM ARQUIVO FOI ALTERADO. Corrija na planilha e rode de novo:')
        for e in erros:
            print('  **', e)
        sys.exit(1)

    # 2. grava (arquivo com o mesmo nome em outra caixa, ex.: bairros.js -> BAIRROS.js, é trocado: o servidor diferencia)
    os.makedirs(DESTINO, exist_ok=True)
    existentes = {f.lower(): f for f in os.listdir(DESTINO) if f.endswith('.js')}
    for aba, texto in saidas.items():
        nome = aba + '.js'
        antigo = existentes.pop(nome.lower(), None)
        if antigo and antigo != nome:
            os.remove(os.path.join(DESTINO, antigo))
        with open(os.path.join(DESTINO, nome), 'w', encoding='utf-8', newline='\n') as f:
            f.write(texto)

    # 3. avisos: arquivos sem aba e abas sem <script> no site
    sobras = [f for f in existentes.values() if MARCA in open(os.path.join(DESTINO, f), encoding='utf-8').read()]
    if sobras:
        print('\nArquivos gerados antes que não têm mais aba na planilha (podem ser apagados de js/dados):')
        for f in sobras:
            print('  ', f)
    if os.path.isfile(HTML):
        html = open(HTML, encoding='utf-8').read()
        faltam = [a for a in saidas if f'js/dados/{a}.js"' not in html]
        if faltam:
            print(f'\nATENÇÃO: abas sem <script> em {os.path.basename(HTML)} (o site não vai carregá-las):')
            for a in faltam:
                print(f'  <script defer src="js/dados/{a}.js"></script>')
    print(f'\nPronto: {len(saidas)} arquivo(s) em js/dados. Publique a pasta js/dados junto com o site.')


if __name__ == '__main__':
    main()
