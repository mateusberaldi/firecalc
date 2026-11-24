# -*- coding: utf-8 -*-
# FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia.
"""FireCalc: monta v2/firecalc2.html, arquivo único, a partir de dados.js, motor.js, exporta.js, exporta_docx.js, vendor/ e da interface em v2/ui.
Embute as fontes, a logo e o favicon da pasta marca. O mesmo arquivo é copiado para firecalc.html e para kit/firecalc.html,
e os casos de exemplo vão para kit/exemplos. O autoteste "Testar meu computador" usa os casos e as referências da pasta testes.
Uso: bash montar.sh, que gera dados.js e chama este script (na raiz)."""
import os, re, json, base64, urllib.parse, sys
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.join(AQUI, '..'); MARCA = os.path.join(RAIZ, 'marca')
sys.path.insert(0, os.path.join(RAIZ, 'ferramentas')); import licencas_terceiros, guardas_ui
LICENCAS = licencas_terceiros.bloco(RAIZ, licencas_terceiros.V2)
def ler(*p): return open(os.path.join(*p), encoding='utf8').read()
b64 = lambda f: base64.b64encode(open(os.path.join(MARCA, f), 'rb').read()).decode()
logo = lambda f: re.sub(r'<title>.*?</title>', '', ler(MARCA, f).strip()).replace(' role="img" aria-label="FireCalc"', ' aria-hidden="true"')
fav = re.sub(r'<svg[^>]*>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">', re.sub(r'<title>.*?</title>', '', ler(MARCA, 'firecalc_icone.svg').strip()), count=1)
# Design system: camadas do CSS em ordem (tokens, peças e o que é só do FireCalc). A pasta v2/ui/ds traz tudo o que o build lê dele, de modo que o HTML se monta sozinho.
# Ícones Lucide (ISC) viram um sprite de <symbol>, e a interface os usa por <use href="#ic-nome">.
DS = os.path.join(AQUI, 'ui', 'ds')
css = (ler(DS, 'tokens.css') + '\n' + ler(DS, 'bundle.css') + '\n' + ler(AQUI, 'ui', 'ui.css')).replace('{{INTER}}', b64('fontes/Inter-FireCalc.woff2')).replace('{{MONO}}', b64('fontes/JetBrainsMono-FireCalc.woff2'))
ICONES = sorted(f[:-4] for f in os.listdir(os.path.join(DS, 'icones')) if f.endswith('.svg'))
def simbolo(n):
    s = ler(DS, 'icones', n + '.svg'); m = re.match(r'\s*<svg[^>]*viewBox="([^"]+)"[^>]*>(.*)</svg>\s*$', s, re.S); assert m, n + '.svg: formato inesperado'
    return '<symbol id="ic-' + n + '" viewBox="' + m.group(1) + '">' + re.sub(r'\s*\n\s*', '', m.group(2)).strip() + '</symbol>'
SPRITE = '<svg class="sprite-icones" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + ''.join(simbolo(n) for n in ICONES) + '</svg>'
UI = ['formato.js', 'svg.js', 'validacao.js', 'cadastros.js', 'estado.js', 'componentes.js', 'grafico.js', 'telas/etapas1a3.js', 'telas/rede.js', 'telas/etapas5a7.js', 'telas/abastecimento.js', 'telas/etapas8e9.js', 'telas/modulos.js', 'telas/cadastros_usuario.js', 'app.js']
ui = ''.join('<script>' + ler(AQUI, 'ui', *f.split('/')) + '</script>\n' for f in UI)
for f in UI:
    t = ler(AQUI, 'ui', *f.split('/')); assert '—' not in t and '–' not in t, f + ': travessão no texto'
# Nenhuma cor escrita fora de ds/tokens.css (hexadecimal, rgb, hsl e cor nomeada) e todo ícone usado existe no sprite (nome fixo entre aspas simples, duplas ou crase): módulo guardas_ui.
_erros = guardas_ui.confere(os.path.join(AQUI, 'ui'), UI + ['ui.css', 'ds/bundle.css'], ICONES); assert not _erros, '; '.join(_erros)
# "Testar meu computador": as conferências são as mesmas da 1.0.0. As duas funções saem do ui/ui.js da 1.0.0, sem cópia à mão,
# e os casos e gabaritos vêm das pastas casos e testes.
ORDEM = ['igreja', 'escritorios', 'edificio_alto', 'escola', 'igreja_pr']; TESTE = ['planilha_pato_branco', 'planilha_escola', 'academia_pr']
casos = [dict(id=c, teste=c in TESTE, proj=json.loads(ler(RAIZ, 'casos', c + '.json'))) for c in ORDEM + TESTE]
ref = dict(gabaritoPR=json.loads(ler(RAIZ, 'testes', 'gabarito_pr.json')), planilhas=json.loads(ler(RAIZ, 'testes', 'resultado_planilhas.json')), classificacao=json.loads(ler(RAIZ, 'testes', 'casos_classificacao.json')), gabaritoAcademia=json.loads(ler(RAIZ, 'testes', 'gabarito_academia.json')))
u1 = ler(RAIZ, 'ui', 'ui.js'); i0 = u1.index('  function autoteste() {'); i1 = u1.index('  // ------------------------------------------------------------------ tela 1, sistema')
corpo = u1[i0:i1]; assert 'function autotesteXlsx(a)' in corpo and corpo.count('function ') >= 2
autoteste = ("var FIRECASOS=" + json.dumps(casos, ensure_ascii=False) + ";var FIREREF=" + json.dumps(ref, ensure_ascii=False) + ";\n"
             "var FireAutoteste = (function () { 'use strict'; var D = FIREDADOS, M = FireMotor, CASOS = FIRECASOS, REF = FIREREF, VERSAO = 'FireCalc 2.0'; function clone(o) { return JSON.parse(JSON.stringify(o)); }\n"
             + corpo + "  return { autoteste: autoteste, autotesteXlsx: autotesteXlsx };\n})();")
html = '''<!doctype html>
<!-- FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. -->
<html lang="pt-BR" data-theme="claro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FireCalc 2.8.0</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,''' + urllib.parse.quote(fav.replace('"', "'"), safe="/=:'") + '''">
<style>''' + css + '''</style>
</head>
<body>
''' + SPRITE + '''
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<div class="fc-app" id="app">
  <nav class="fc-lat" aria-label="Módulos e etapas" id="lat"></nav>
  <header class="fc-topo" id="topo"></header>
  <main class="fc-conteudo" id="conteudo" tabindex="-1"></main>
  <aside class="fc-resumo" id="resumo" aria-label="Resumo do projeto"></aside>
  <div class="fc-rodape" id="pe" role="region" aria-label="Situação da etapa, voltar e avançar"></div>
</div>
<dialog id="gav-lat" class="fc-gaveta fc-gaveta--esq" aria-label="Menu do programa"></dialog>
<dialog id="gav-resumo" class="fc-gaveta" aria-labelledby="gav-resumo-t"></dialog>
<div id="aviso-proto" class="fc-notif" role="status" hidden></div>
<div id="fala" class="so-leitor" role="status" aria-live="polite" aria-atomic="true"></div>
<input type="file" id="arq" accept=".json,application/json" hidden>
<dialog id="dlg" class="fc-janela" aria-label="Confirmação"></dialog>
<dialog id="bq" class="fc-janela fc-bq" aria-label="Busca rápida">
  <div class="fc-bq__campo"><svg class="ic-lu fc-ic fc-ic--g" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ic-search"/></svg><input id="bq-campo" type="text" placeholder="Buscar etapa, campo ou termo" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="bq-lista" aria-label="Busca rápida: etapa, campo, verificação ou termo do glossário" autocomplete="off"></div>
  <ul class="fc-bq__lista" id="bq-lista" role="listbox" aria-label="Resultados da busca" tabindex="-1"></ul>
  <div class="fc-bq__pe"><span><kbd class="fc-kbd">↑</kbd><kbd class="fc-kbd">↓</kbd> escolher</span><span><kbd class="fc-kbd">Enter</kbd> abrir</span><span><kbd class="fc-kbd">Esc</kbd> fechar</span></div>
</dialog>
<template id="logo-claro">''' + logo('firecalc_horizontal.svg') + '''</template>
<template id="logo-escuro">''' + logo('firecalc_horizontal_tema_escuro.svg') + '''</template>
<template id="logo-icone-claro">''' + logo('firecalc_icone.svg') + '''</template>
<template id="logo-icone-escuro">''' + logo('firecalc_icone_tema_escuro.svg') + '''</template>
''' + LICENCAS + '''<script>''' + ler(RAIZ, 'dados.js') + '''</script>
<script>''' + ler(RAIZ, 'motor.js') + '''</script>
<script id="vendor-exceljs">''' + ler(RAIZ, 'vendor', 'exceljs-4.4.0.min.js') + '''</script>
<script>''' + ler(RAIZ, 'exporta.js') + '''</script>
<script id="vendor-docx">''' + ler(RAIZ, 'vendor', 'docx-9.8.1.min.js') + '''</script>
<script>''' + ler(RAIZ, 'exporta_docx.js') + '''</script>
<script>var FIRELOGO="''' + b64('firecalc_horizontal_relatorio.png') + '''";</script>
<script id="autoteste">''' + autoteste + '''</script>
''' + ui + '''</body></html>
'''
assert '{{' not in css
assert 'data-tema' not in html and html.count('<symbol id="ic-') == len(ICONES)
assert '</script' not in ler(RAIZ, 'vendor', 'docx-9.8.1.min.js') and '—' not in ler(RAIZ, 'exporta_docx.js') and '–' not in ler(RAIZ, 'exporta_docx.js')
open(os.path.join(AQUI, 'firecalc2.html'), 'w', encoding='utf8', newline='\n').write(html)
n = len(html.encode('utf8')); assert n < 3 * 1024 * 1024, 'acima de 3 MB'
print('v2/firecalc2.html: %d bytes (%.2f MB)' % (n, n / 1048576))
import shutil
for dest in (os.path.join(RAIZ, 'firecalc.html'), os.path.join(RAIZ, 'kit', 'firecalc.html')): open(dest, 'w', encoding='utf8', newline='\n').write(html)
EX = os.path.join(RAIZ, 'kit', 'exemplos'); os.makedirs(EX, exist_ok=True)
for c in ORDEM + ['tres_hidrantes', 'escritorios_redutora', 'academia_pr', 'gravidade_pr', 'gravidade_insuficiente_pr']: shutil.copyfile(os.path.join(RAIZ, 'casos', c + '.json'), os.path.join(EX, c + '.json'))
print('copiado para firecalc.html e kit/firecalc.html; %d exemplos em kit/exemplos' % (len(ORDEM) + 5))
