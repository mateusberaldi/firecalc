# Componentes de terceiros embutidos nas bibliotecas de vendor/

As duas bibliotecas de `vendor/` vêm empacotadas com outras, que vão junto no `firecalc.html`. Cada uma segue com a
licença do seu autor; os textos completos estão nos repositórios de origem.

| Componente | Onde vem embutido | Licença | Origem |
|---|---|---|---|
| ExcelJS 4.4.0 | `exceljs-4.4.0.min.js` | MIT (`exceljs-LICENSE.txt`) | github.com/exceljs/exceljs |
| docx 9.8.1 | `docx-9.8.1.min.js` | MIT (`docx-LICENSE.txt`) | github.com/dolanmiu/docx |
| JSZip | nas duas | MIT ou GPLv3, à escolha; o FireCalc usa sob a MIT | github.com/Stuk/jszip |
| pako | nas duas | MIT e Zlib | github.com/nodeca/pako |
| ieee754 | `exceljs-4.4.0.min.js` | BSD-3-Clause | github.com/feross/ieee754 |
| safe-buffer | `exceljs-4.4.0.min.js` | MIT | github.com/feross/safe-buffer |

O `docx-9.8.1.min.js` foi minificado sem mudança de código e não traz o aviso de licença no próprio arquivo; o aviso
está em `docx-LICENSE.txt`.
