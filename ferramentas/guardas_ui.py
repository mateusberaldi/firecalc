# -*- coding: utf-8 -*-
# FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia.
"""FireCalc 2.8.0 (FC-042): guardas do build da interface (v2/build_v2.py chama `confere`; também roda sozinho para teste).
1. Nenhuma cor escrita fora de v2/ui/ds/tokens.css: hexadecimal, rgb(), hsl() e COR NOMEADA (red, white, tan etc., exceto transparent e currentColor).
2. Todo ícone usado existe no sprite (v2/ui/ds/icones): chamada icone('x'), icone("x") ou icone(`x`) com nome fixo conferida; argumento que não é texto fixo
   (variável, soma de texto, template com ${}) é barrado, porque não dá para conferir; referência #ic-nome em texto também é conferida.
Uso: python3 guardas_ui.py <pasta v2/ui>   (sai com 1 e lista cada problema). Sem dependências além da biblioteca padrão."""
import os, re, sys

NOMEADAS = set('''aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk
crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue
darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray
green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray
lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy
oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown
royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat
white whitesmoke yellow yellowgreen'''.split())
HEX = re.compile(r'(?<![\w#&-])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b(?![-\w])')
FUNC = re.compile(r'\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(')
PROP_COR = re.compile(r'^(?:--.*|.*color.*|background.*|border.*|outline.*|fill|stroke|.*shadow.*|text-decoration.*|column-rule.*)$')
# propriedade de cor em JS: nome = valor, nome: valor, setAttribute('nome', 'valor')
JS_PROP = re.compile(r"""(?:\b(fill|stroke|stop-color|flood-color|color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow)\s*(?:=|:)\s*\\?['"`]?|\b(fill|stroke|color)['"]\s*,\s*['"`])([^;'"`<>]*)""")
ICONE = re.compile(r'\bicone\(')
ICONE_FIXO = re.compile(r"""\bicone\(\s*(['"`])([a-z0-9-]+)\1\s*[,)]""")
ICONE_REF = re.compile(r'#ic-([a-z0-9-]+)')
# F5 (FC-042): formas de chamar o ícone que escondem o nome da guarda: espaço antes do parêntese, colchetes, alias e call/apply/bind
ICONE_ESPACO = re.compile(r'\bicone\s+\(')
ICONE_COLCHETES = re.compile(r'''\[\s*['"`]icone['"`]\s*\]''')
ICONE_ALIAS = re.compile(r'(?<!function )(?<![\w$])(?:=|:)\s*(?:[\w$]+\.)?icone\s*[;,)}]')
ICONE_INDIRETO = re.compile(r'\bicone\s*\.\s*(?:call|apply|bind)\b')

def _sem_var(v):
    """Tira var(...) (com parênteses aninhados), url(...) e textos entre aspas: o que resta é só o que está escrito de fato no valor."""
    v = re.sub(r'"[^"]*"|\'[^\']*\'', ' ', v)
    for _ in range(4): v = re.sub(r'(?:var|url|env|calc)\([^()]*\)', ' ', v)
    return v

def _nomeada(v):
    for m in re.finditer(r'(?<![-\w#.$@])([A-Za-z]+)(?![-\w(])', _sem_var(v)):
        if m.group(1).lower() in NOMEADAS: return m.group(1)
    return None

def cor_em_css(t):
    """Primeira cor escrita num CSS (fora de comentário): devolve o texto da cor ou None."""
    t = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S)
    m = HEX.search(t) or FUNC.search(t)
    if m: return m.group(0)
    for d in re.finditer(r'([-\w]+)\s*:\s*([^;{}]*)', t):
        if PROP_COR.match(d.group(1).lower()):
            n = _nomeada(d.group(2))
            if n: return n
    return None

def cor_em_js(t):
    """Primeira cor escrita num JS: hexadecimal, função de cor ou nome de cor em propriedade de cor, estilo ou atributo SVG."""
    sem = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S); sem = re.sub(r'(?m)^\s*//.*$', ' ', sem)
    m = HEX.search(sem) or FUNC.search(sem)
    if m: return m.group(0)
    for d in JS_PROP.finditer(sem):
        n = _nomeada(d.group(3))
        if n: return n
    return None

def icones_em(t):
    """Problemas de ícone num texto: lista de (nome, motivo)."""
    ruins = []
    for m in ICONE.finditer(t):
        antes = t[max(0, m.start() - 12):m.start()]
        if re.search(r'function\s+$', antes): continue            # definição function icone(nome)
        if re.match(r'\s*\w+\s*\)\s*\{', t[m.end():m.end() + 40]) and re.search(r'=\s*function\s*$|function\s+$', antes): continue
        resto = t[m.start():m.start() + 80]
        f = ICONE_FIXO.match(resto)
        if not f: ruins.append((resto.split(')')[0] + ')', 'argumento que não é um nome fixo entre aspas'))
        else: ruins.append((f.group(2), None))
    for rx, motivo in ((ICONE_ESPACO, 'espaço entre icone e o parêntese: a guarda não confere o nome'), (ICONE_COLCHETES, 'icone chamado por colchetes: a guarda não confere o nome'),
                       (ICONE_ALIAS, 'alias de icone: a guarda não confere o nome (chame U.icone com o nome entre aspas, direto)'), (ICONE_INDIRETO, 'icone chamado por call, apply ou bind: a guarda não confere o nome')):
        for m in rx.finditer(t): ruins.append((m.group(0).strip(), motivo))
    for n in ICONE_REF.findall(t): ruins.append((n, None))
    return ruins

def confere(pasta_ui, arquivos, icones):
    """Devolve a lista de problemas (vazia se tudo certo). arquivos: caminhos relativos a pasta_ui; ds/tokens.css fica de fora de propósito."""
    erros = []
    for f in arquivos:
        t = open(os.path.join(pasta_ui, *f.split('/')), encoding='utf8').read()
        c = cor_em_css(t) if f.endswith('.css') else cor_em_js(t)
        if c: erros.append(f + ': cor escrita (' + c + '); use var(--token) de ds/tokens.css')
        if f.endswith('.js'):
            for n, motivo in icones_em(t):
                if motivo: erros.append(f + ': ícone ' + n + ': ' + motivo)
                elif n not in icones: erros.append(f + ': o ícone "' + n + '" não está em v2/ui/ds/icones')
    return erros

if __name__ == '__main__':
    pasta = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'v2', 'ui')
    ic = sorted(f[:-4] for f in os.listdir(os.path.join(pasta, 'ds', 'icones')) if f.endswith('.svg'))
    arqs = [os.path.relpath(os.path.join(d, f), pasta).replace(os.sep, '/') for d, _, fs in os.walk(pasta) for f in fs
            if (f.endswith('.js') and not os.path.relpath(d, pasta).startswith('ds')) or f == 'ui.css' or (f == 'bundle.css' and os.path.basename(d) == 'ds')]
    er = confere(pasta, sorted(arqs), ic)
    for e in er: print('FALHA ' + e)
    print(len(arqs) + 0, 'arquivos conferidos,', len(er), 'falhas'); sys.exit(1 if er else 0)
