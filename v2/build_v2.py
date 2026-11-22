# -*- coding: utf-8 -*-
# FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia.
"""FireCalc: monta v2/firecalc2.html, arquivo único, a partir de dados.js, motor.js, exporta.js, exporta_docx.js, vendor/ e da interface em v2/ui.
Embute as fontes, a logo e o favicon da pasta marca. O mesmo arquivo é copiado para firecalc.html e para kit/firecalc.html,
e os casos de exemplo vão para kit/exemplos. O autoteste "Testar meu computador" usa os casos e as referências da pasta testes.
Uso: bash montar.sh, que gera dados.js e chama este script (na raiz)."""
import os, re, json, base64, urllib.parse, sys
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.join(AQUI, '..'); MARCA = os.path.join(RAIZ, 'marca')
sys.path.insert(0, os.path.join(RAIZ, 'ferramentas')); import licencas_terceiros
LICENCAS = licencas_terceiros.bloco(RAIZ, licencas_terceiros.V2)
def ler(*p): return open(os.path.join(*p), encoding='utf8').read()
b64 = lambda f: base64.b64encode(open(os.path.join(MARCA, f), 'rb').read()).decode()
logo = lambda f: re.sub(r'<title>.*?</title>', '', ler(MARCA, f).strip()).replace(' role="img" aria-label="FireCalc"', ' aria-hidden="true"')
fav = re.sub(r'<svg[^>]*>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">', re.sub(r'<title>.*?</title>', '', ler(MARCA, 'firecalc_icone.svg').strip()), count=1)
css = ler(AQUI, 'ui', 'ui.css').replace('{{INTER}}', b64('fontes/Inter-FireCalc.woff2')).replace('{{MONO}}', b64('fontes/JetBrainsMono-FireCalc.woff2'))
UI = ['formato.js', 'svg.js', 'validacao.js', 'cadastros.js', 'estado.js', 'componentes.js', 'grafico.js', 'telas/etapas1a3.js', 'telas/rede.js', 'telas/etapas5a7.js', 'telas/abastecimento.js', 'telas/etapas8e9.js', 'telas/modulos.js', 'telas/cadastros_usuario.js', 'app.js']
ui = ''.join('<script>' + ler(AQUI, 'ui', *f.split('/')) + '</script>\n' for f in UI)
for f in UI:
    t = ler(AQUI, 'ui', *f.split('/')); assert '—' not in t and '–' not in t, f + ': travessão no texto'
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
<html lang="pt-BR" data-tema="claro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FireCalc 2.6.4</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,''' + urllib.parse.quote(fav.replace('"', "'"), safe="/=:'") + '''">
<style>''' + css + '''</style>
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<div class="app">
  <nav class="lat" aria-label="Módulos e etapas" id="lat"></nav>
  <div class="area">
    <header class="topo" id="topo"></header>
    <section class="resumo" id="resumo" aria-label="Resumo do projeto"></section>
    <main class="conteudo" id="conteudo" tabindex="-1"></main>
    <div class="pe" id="pe" role="region" aria-label="Situação da etapa, voltar e avançar"></div>
    <footer class="direitos">© 2026 Mateus Beraldi Nobre. Software livre sob a AGPL-3.0, sem garantia.</footer>
  </div>
</div>
<div id="aviso-proto" role="status" hidden></div>
<div id="fala" class="so-leitor" role="status" aria-live="polite" aria-atomic="true"></div>
<input type="file" id="arq" accept=".json,application/json" hidden>
<dialog id="dlg" aria-label="Confirmação"></dialog>
<dialog id="bq" aria-label="Busca rápida">
  <input class="bq-campo" id="bq-campo" type="text" placeholder="Ir para etapa, campo, verificação ou termo do glossário" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="bq-lista" aria-label="Busca rápida: etapa, campo, verificação ou termo do glossário" autocomplete="off">
  <ul class="bq-lista" id="bq-lista" role="listbox" aria-label="Resultados da busca" tabindex="-1"></ul>
  <div class="bq-pe"><span><span class="kbd">↑</span> <span class="kbd">↓</span> escolher</span><span><span class="kbd">Enter</span> abrir</span><span><span class="kbd">Esc</span> fechar</span></div>
</dialog>
<template id="logo-claro">''' + logo('firecalc_horizontal.svg') + '''</template>
<template id="logo-escuro">''' + logo('firecalc_horizontal_tema_escuro.svg') + '''</template>
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
assert '</script' not in ler(RAIZ, 'vendor', 'docx-9.8.1.min.js') and '—' not in ler(RAIZ, 'exporta_docx.js') and '–' not in ler(RAIZ, 'exporta_docx.js')
open(os.path.join(AQUI, 'firecalc2.html'), 'w', encoding='utf8', newline='\n').write(html)
n = len(html.encode('utf8')); assert n < 3 * 1024 * 1024, 'acima de 3 MB'
print('v2/firecalc2.html: %d bytes (%.2f MB)' % (n, n / 1048576))
import shutil
for dest in (os.path.join(RAIZ, 'firecalc.html'), os.path.join(RAIZ, 'kit', 'firecalc.html')): open(dest, 'w', encoding='utf8', newline='\n').write(html)
EX = os.path.join(RAIZ, 'kit', 'exemplos'); os.makedirs(EX, exist_ok=True)
for c in ORDEM + ['tres_hidrantes', 'escritorios_redutora', 'academia_pr', 'gravidade_pr', 'gravidade_insuficiente_pr']: shutil.copyfile(os.path.join(RAIZ, 'casos', c + '.json'), os.path.join(EX, c + '.json'))
print('copiado para firecalc.html e kit/firecalc.html; %d exemplos em kit/exemplos' % (len(ORDEM) + 5))
