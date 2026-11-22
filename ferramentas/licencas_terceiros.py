# -*- coding: utf-8 -*-
# FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia.
"""Bloco de avisos de licença das bibliotecas embutidas no HTML montado.
O texto de cada licença vem sempre do arquivo de vendor/; aqui ficam só o nome, a versão embutida e a origem do texto.
Usado pelo script de montagem v2/build_v2.py. Uso: bloco(raiz, ['exceljs', ...]) devolve o elemento <script type="text/plain" id="licencas-terceiros">."""
import os
LIBS = {
    'exceljs': ('ExcelJS', '4.4.0 (nome do arquivo embutido)', 'texto de licença do pacote exceljs 4.4.0', 'exceljs-LICENSE.txt'),
    'docx': ('docx', '9.8.1 (nome do arquivo embutido)', 'texto de licença do pacote docx 9.8.1', 'docx-LICENSE.txt'),
    'jszip': ('JSZip', '3.10.1 (lida no bundle do ExcelJS)', 'texto de licença do pacote npm jszip 3.10.1, a mesma versão; só o trecho MIT, que o FireCalc usa (o arquivo vendor/jszip-LICENSE.txt do repositório traz a dupla licença inteira, com a GPLv3)', 'jszip-LICENSE.txt'),
    'pako': ('pako', 'não declarada pelo bundle', 'texto de licença do pacote 1.0.11 instalado, versão inferida', 'pako-LICENSE.txt'),
    'pako-zlib': ('pako, aviso zlib', 'não declarada pelo bundle', 'lib/zlib/README do pacote pako 1.0.11 instalado, versão inferida', 'pako-zlib-README.txt'),
    'ieee754': ('ieee754', 'não declarada pelo bundle', 'texto de licença do pacote 1.2.1 instalado, versão inferida', 'ieee754-LICENSE.txt'),
    'safe-buffer': ('safe-buffer', 'não declarada pelo bundle', 'texto de licença do pacote 5.2.1 instalado, versão inferida', 'safe-buffer-LICENSE.txt'),
}
# Licença dupla: no HTML entra só o trecho anterior a esta linha (o texto completo fica em vendor/).
CORTE = {'jszip': 'GPL version 3'}
V2 = ['exceljs', 'docx', 'jszip', 'pako', 'pako-zlib', 'ieee754', 'safe-buffer']
CAB = 'Avisos de licença das bibliotecas de terceiros embutidas neste arquivo. Cada texto segue como no arquivo de licença do pacote.'
SEP = '=' * 72

def ler_licenca(raiz, chave):
    nome, emb, origem, arq = LIBS[chave]
    caminho = os.path.join(raiz, 'vendor', arq)
    assert os.path.isfile(caminho), nome + ': falta o arquivo de licença vendor/' + arq + '. Restaure-o do repositório (git checkout -- vendor/' + arq + ') e monte de novo'
    texto = open(caminho, encoding='utf8').read().replace('\r\n', '\n').strip('\n')
    if chave in CORTE:
        assert CORTE[chave] in texto, nome + ': a marca de corte "' + CORTE[chave] + '" sumiu de vendor/' + arq + '. Restaure o arquivo do repositório ou ajuste a constante CORTE deste arquivo'
        texto = texto[:texto.index(CORTE[chave])].strip(chr(10))
    assert texto.strip(), nome + ': texto de licença vazio em vendor/' + arq + '. Restaure o texto do pacote de origem (ver vendor/LICENCAS_TERCEIROS.md) e monte de novo'
    assert '-->' not in texto and '</script' not in texto.lower(), nome + ': o texto de licença em vendor/' + arq + ' contém --> ou </script, que fecharia o bloco do HTML. Use o texto original do pacote, sem essa sequência, e monte de novo'
    return nome, emb, origem, texto

def bloco(raiz, chaves):
    partes = [CAB]
    for k in chaves:
        nome, emb, origem, texto = ler_licenca(raiz, k)
        partes.append(SEP + '\n' + nome + '\nVersão embutida: ' + emb + '\nOrigem do texto: ' + origem + '\n' + SEP + '\n\n' + texto)
    return '<script type="text/plain" id="licencas-terceiros">\n' + '\n\n'.join(partes) + '\n</script>\n'
