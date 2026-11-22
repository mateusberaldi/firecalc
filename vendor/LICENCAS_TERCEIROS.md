# Componentes de terceiros embutidos nas bibliotecas de vendor/

As duas bibliotecas principais de `vendor/` vêm empacotadas com outras, e todas vão junto no `firecalc.html`. Cada uma segue com a
licença do seu autor; os textos completos estão nos repositórios de origem.

| Componente | Onde vem embutido | Licença | Origem |
|---|---|---|---|
| ExcelJS 4.4.0 | `exceljs-4.4.0.min.js` | MIT (`exceljs-LICENSE.txt`) | github.com/exceljs/exceljs |
| docx 9.8.1 | `docx-9.8.1.min.js` | MIT (`docx-LICENSE.txt`) | github.com/dolanmiu/docx |
| JSZip | nas duas | MIT ou GPLv3, à escolha; o FireCalc usa sob a MIT | github.com/Stuk/jszip |
| pako | nas duas | MIT e Zlib (`pako-LICENSE.txt` e `pako-zlib-README.txt`) | github.com/nodeca/pako |
| ieee754 | `exceljs-4.4.0.min.js` | BSD-3-Clause | github.com/feross/ieee754 |
| safe-buffer | `exceljs-4.4.0.min.js` | MIT | github.com/feross/safe-buffer |

O `docx-9.8.1.min.js` foi minificado sem mudança de código e não traz o aviso de licença no próprio arquivo; o aviso
está em `docx-LICENSE.txt`.

## Textos de licença e versões (FC-039)

O `firecalc.html` traz, no bloco `licencas-terceiros` (script `text/plain`, sem texto visível), o aviso de cada biblioteca. O texto vem destes arquivos, lidos pelo build, e a versão embutida é a que o bundle declara.

| Biblioteca | Versão embutida | Arquivo | Origem do texto |
|---|---|---|---|
| ExcelJS | 4.4.0 | `exceljs-LICENSE.txt` | pacote exceljs 4.4.0 |
| docx | 9.8.1 | `docx-LICENSE.txt` | pacote docx 9.8.1 |
| JSZip | 3.10.1 (lida no bundle) | `jszip-LICENSE.txt` | JSZip 3.10.1, LICENSE do tarball npm jszip@3.10.1; igual, byte a byte, ao do 3.10.2 |
| pako | não declarada | `pako-LICENSE.txt` | pacote 1.0.11 instalado; versão inferida; só a MIT |
| pako, aviso zlib | não declarada | `pako-zlib-README.txt` | `lib/zlib/README` do pacote 1.0.11 instalado, copiado inteiro (traz o aviso da licença Zlib); versão inferida |
| ieee754 | não declarada | `ieee754-LICENSE.txt` | pacote 1.2.1 instalado; versão inferida |
| safe-buffer | não declarada | `safe-buffer-LICENSE.txt` | pacote 5.2.1 instalado; versão inferida |

O bundle do ExcelJS não declara a versão de pako, ieee754 nem safe-buffer; as versões acima são as instaladas com o exceljs 4.4.0, e o texto de licença não foi conferido contra a versão exata embutida.
O JSZip é de licença dupla (MIT ou GPLv3): o arquivo guarda o texto inteiro e o bloco do HTML traz só o trecho MIT, que o FireCalc usa.
