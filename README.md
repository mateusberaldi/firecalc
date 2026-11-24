# FireCalc

Programa de dimensionamento de hidrantes e mangotinhos para o Paraná (NPT 022 do CBMPR) e para São Paulo (IT 22 do CBPMESP). É um arquivo HTML único: abre no navegador, funciona sem internet e não envia nenhum dado do projeto para fora do computador.

Versão **2.8.0** (23/11/2026); o que mudou está em [NOTAS_DA_VERSAO.md](NOTAS_DA_VERSAO.md).

## O que ele faz

- Enquadra a edificação e escolhe o tipo de sistema pela norma do estado.
- Lança a rede trecho a trecho.
- Calcula perdas de carga, pressões, vazões, reserva de incêndio e a bomba.
- Confere o resultado com as verificações da norma e gera o relatório em planilha (.xlsx, com fórmulas vivas) e o memorial de cálculo (.docx).

O FireCalc é ferramenta de apoio ao cálculo. A responsabilidade técnica pelo projeto é do profissional habilitado que o assina.

## Como usar

Baixe `firecalc.html` e abra no navegador. Não há instalação. Os casos de exemplo estão em `casos/`.

## Como montar o código

Precisa só de Python 3. Na raiz do repositório:

```
bash montar.sh
```

O script gera `dados.js` a partir de `dados.json` e monta `firecalc.html` e o pacote `kit/` a partir do código.
Os números do cálculo dos oito casos de exemplo de `casos/` são conferidos pelo mantenedor a cada versão; uma mudança de número do cálculo exige a fonte (norma com item ou catálogo com página) e um gabarito feito de forma independente.

## Estrutura do repositório

| Caminho | O que é |
|---|---|
| `firecalc.html` | O programa montado (não editar à mão; sai do `montar.sh`). |
| `montar.sh` | Monta o programa a partir do código. |
| `v2/ui/`, `v2/build_v2.py` | Fonte da interface (telas, estado, validação, componentes, gráficos e estilo) e o script que embute tudo num arquivo. |
| `ui/ui.js` | Fonte do autoteste "Testar meu computador", embutido no programa por `v2/build_v2.py`. |
| `motor.js` | Motor de cálculo (rede, pares de hidrantes, bomba, verificações). |
| `exporta.js`, `exporta_docx.js` | Relatório em planilha e memorial em .docx. |
| `dados.json` | Base de dados (tubos, peças, esguichos, mangueiras, bombas, normas, ocupações), com a fonte de cada dado. `dados.js` é gerado a partir dele. |
| `casos/` | Os casos de exemplo. |
| `kit/` | Pacote de distribuição: programa, manual, notas da versão e exemplos. |
| `marca/` | Logo, ícones e fontes. |
| `vendor/` | Bibliotecas embutidas (ExcelJS e docx, ambas MIT). |

## Licença

Copyright (C) 2026 Mateus Beraldi Nobre.

O FireCalc é software livre, distribuído sob a **GNU Affero General Public License, versão 3** (AGPL-3.0-only). O texto completo está em [LICENSE](LICENSE). Em resumo, você pode usar, estudar, modificar e redistribuir, inclusive em projeto pago, desde que:

- mantenha os avisos de direito autoral e de licença;
- entregue o código-fonte completo de qualquer versão modificada que distribuir;
- ofereça esse código-fonte também a quem usar a sua versão modificada por rede, por exemplo em um site ou por assinatura;
- publique a sua versão sob a mesma licença.

O código-fonte completo de cada versão, a partir da 2.6.3, está em https://github.com/mateusberaldi/firecalc (este repositório), que é a oferta de código da seção 13 da licença. O das versões 2.6.0 a 2.6.2 é fornecido a pedido, pelo contato abaixo.

O programa é fornecido sem garantia de qualquer espécie, nos termos da licença.

## Nome e logo

A licença cobre o código. O nome **FireCalc** e o logo (pasta `marca/`) são reservados ao titular e não fazem parte da licença. Uma versão modificada tem de usar outro nome e outro logo. As regras estão em [MARCA.md](MARCA.md).

## Componentes e dados de terceiros

- ExcelJS 4.4.0 e docx 9.8.1, ambas sob licença MIT; os textos de licença estão em `vendor/`.
- Fontes Inter e JetBrains Mono, sob a licença SIL Open Font 1.1; os textos estão em `marca/fontes/`.
- Os dados de catálogo (curvas de bomba, esguichos, mangueiras, tubos e peças) são fatos lidos de documentos de fabricantes e de normas. Cada dado mostra a fonte ao lado, na tela de Cadastros. Os PDFs dos catálogos não fazem parte do repositório e continuam sob os direitos dos seus autores.

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Contato

Mateus Beraldi Nobre, Estúdio BIM Engenharia, Pato Branco, PR. estudiobim.com.br
