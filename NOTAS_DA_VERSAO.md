# FireCalc 2.6.3: notas da versão

20/11/2026. Sobre a 2.6.2. Software livre sob a AGPL-3.0; código-fonte em github.com/mateusberaldi/firecalc.

## O que muda na 2.6.3

- **Textos revisados:** comentários do código, glossário, Ajuda, nomes e notas dos exemplos e o manual de uma página.
- **Números do cálculo:** nenhum muda. Os oito exemplos dão os mesmos resultados da 2.6.2.

## O que muda na 2.6.2

- Alguns valores foram limpos.

## O que muda na 2.6.1

- **Importação de IFC retirada.** O programa deixa de ler arquivos IFC: saem o leitor, a tela, o campo de arquivo e os testes dessa importação. Desde a 2.5.4 a importação já não aparecia na Rede; a rede se lança trecho a trecho.
- **Projetos antigos continuam abrindo.** Um projeto salvo na 2.6.0 depois de uma importação abre como rede digitada, com os mesmos trechos, cotas e resultados. A marca de origem da rede é ignorada ao abrir e some ao salvar de novo.
- **Números do cálculo:** nenhum muda. Os oito exemplos dão os mesmos resultados da 2.6.0.

## Números do cálculo (2.6.0, sobre a 2.5.4)

Nenhum resultado dos exemplos mudou. O que muda na conferência:

- **Sucção da bomba:** a ferramenta deduz da tomada se a bomba é afogada, de sucção positiva ou negativa. No Paraná o NPSH é conferido em qualquer estado; o exemplo academia_pr passa a mostrar o NPSH e a verificação V08.
- **São Paulo:** o dimensionamento segue pela Tabela 2 da IT 22, na válvula. A tela mostra o que chega ao esguicho (pressão, vazão e alcance); o alcance do jato é só alerta (V28), nos dois estados.
- **Alterar sistema:** qualquer tipo pode ser adotado. A reserva pedida passa a ser a do tipo adotado (tipo e área na tabela de reserva); o tipo inferior que a tabela não admite para a divisão não atende na V30.
- **Gravidade:** a verificação nova V32 confere se o desnível do reservatório elevado dá a pressão mínima no hidrante mais desfavorável e diz quanto falta ou sobra; no Paraná o ramal de retorno (teste da bomba) não é pedido sem bomba.
- **Pressão estática sem bomba escolhida:** fica "a calcular" até a escolha da bomba; na gravidade aparece direto.
- **Antivórtice e poço de sucção:** alerta V29 quando a tomada não admite o antivórtice ou o poço é raso; em SP, a V31 confere a sucção.
- O exemplo igreja_B saiu (o caminho B de SP deixou de existir); arquivos antigos com ele abrem pela Tabela 2. Ficam oito exemplos.

## Por etapa (2.6.0)

- **Identificação:** altitude do local e temperatura da água passam para cá, obrigatórias, cada uma com um "?" que explica e sugere a busca.
- **Edificação e sistema:** cartão dos dados em destaque e responsivo; cada sistema é um botão com desenho, vazão, pressão, mangueira e reserva; sai a lista "Tipo adotado", o "Por que isso?" e o botão "Confirmar o tipo" (o "Próximo" pede a confirmação uma vez).
- **Abastecimento:** fonte de pressão e tipo do reservatório por botões com desenho (concreto, taça seca ou molhada, torre, standpipe, cilíndrico, caixa de polietileno); menu sobreposto com saída, cotas, medidas, bomba, particularidades e modo avançado; desenho final com os níveis, reserva efetiva e aviso de reserva suficiente ou insuficiente; desnível próprio da taça seca e da torre entra no cálculo; cota do eixo da bomba lançada aqui.
- **Rede:** cartão do tubo padrão com o guia de lançamento; linha RI-BI já preenchida; títulos e campos alinhados; aviso da cota real; cartão com os dados ao passar o mouse no desenho; planilha da rede trecho a trecho com alertas. Sai o "Colar do Excel".
- **Hidrantes:** cartões da mangueira e do esguicho com desenho; "Selecionar esguicho" com todos os esguichos cadastrados (padrão do diâmetro sem escolha); curva do hidrante e pressão em cada hidrante lado a lado, com clique para ver a curva de cada um; botão "V. redutora".
- **Bomba e automação:** as cinco bombas de menor folga ao lado da curva; bomba de pressurização pela lista completa, com o ponto de partida; pressostatos em cartão próprio.
- **Estatísticas:** cartão "Hipótese de cálculo" ao lado da curva; pressão estática por ponto em barras horizontais, com o limite da norma.
- **Cadastros:** fonte de cada dado com o arquivo do catálogo e a página; 51 pontos de esguicho dos catálogos Reunidas e Kidde; "?" da Minha biblioteca com o passo a passo, o modelo .json e o prompt para gerar o arquivo com uma IA.
- **Configurações, Ajuda e Sobre:** sem os textos explicativos; Ajuda na largura toda; Sobre com a licença, o titular, a marca e o endereço do código.
- **Todas as telas:** sem o texto abaixo do título e sem comentário de norma fora de Verificações, Ajuda e Sobre.

## Código aberto

Licença GNU AGPL-3.0-only, titular Mateus Beraldi Nobre. O nome FireCalc e o logo são reservados (MARCA.md). Contribuições pelo CONTRIBUTING.md.
