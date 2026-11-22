# FireCalc 2.6.4: notas da versão

21/11/2026. Sobre a 2.6.3. Software livre sob a AGPL-3.0; código-fonte em github.com/mateusberaldi/firecalc.

## O que muda na 2.6.4

- **Avisos de licença dentro do arquivo (FC-039):** o firecalc.html traz, num bloco sem texto visível, o aviso de ExcelJS, docx, JSZip, pako, ieee754 e safe-buffer; o arquivo cresce 11.506 bytes (de 2.545.066 para 2.556.572) e nenhum número do cálculo mudou.
- **Três textos da tela (FC-008):** o cartão Bomba escolhida pede o NPSH requerido uma vez só, o aviso de arquivo anterior com bomba e marca de elevado só fala da dispensa em SP quando a norma é SP, e os botões de sistema do Paraná dizem "Pressão mínima na ponta do esguicho"; nenhum número do cálculo mudou.
- **Cotas sem número cru (FC-006):** os campos de cota mostram os valores arredondados a 10 casas, então -0,8099999999999999 de dois exemplos aparece como -0,81 e o arquivo salvo de novo grava -0.81; nenhum número do cálculo mudou.
- **Menu "Alterar sistema" sem reserva enganosa (FC-004):** o tipo inferior que a divisão não admite mantém o selo "Inferior" e mostra "não admitido" no lugar da reserva em m³ (a da tabela, que não era dele), no menu e no aviso de confirmação do tipo; os demais tipos seguem com o valor. Nenhum número do cálculo mudou.
- **Dois exemplos de gravidade no Paraná (FC-003):** entram na pasta de exemplos do kit o edifício E-3 abastecido por reservatório elevado, um com folga por gravidade e outro com desnível insuficiente, e nenhum número do cálculo mudou.
- **Estatísticas por gravidade (FC-002):** no sistema por gravidade, as Estatísticas e a tabela Hipótese de cálculo mostram "Folga por gravidade", com o mesmo valor do resumo do topo, no lugar de "Altura manométrica" e de "Pressão na descarga da bomba"; bomba comum e reforço ficam como estavam. Nenhum número do cálculo mudou.
- **Planilha, memorial e nomes de dois exemplos sem "caminho A" e "caminho B" (FC-001):** a planilha e o memorial exportados passam a dizer "pressão na válvula" e "pressão no esguicho", como a tela. Os exemplos Igreja F-2 e Loja com mezanino, três hidrantes passam a se chamar "Igreja F-2 (SP)" e "Loja com mezanino, três hidrantes (SP)". O teste "Testar meu computador" também deixa de dizer "caminho B" no rótulo da igreja com esguicho no arquivo. Só o texto mudou: nenhum número, fórmula ou campo do projeto.
- **Potência da bomba KSB sem "no eixo" (FC-035):** o cartão Bomba escolhida, o resumo lateral e a linha Bomba do relatório da tela dizem só valor e unidade (por exemplo, 2,4 hp), como as listas; sem leitura da curva, "potência pela curva". A Schneider segue em cv. A planilha e o memorial mantêm a distinção entre potência no eixo e do motor. Nenhum número do cálculo mudou.
- **Ver a curva de uma bomba sem escolhê-la (FC-033):** na etapa Bomba, clicar numa linha das listas de bombas de incêndio (as sugeridas e as que atendem a 1,5 Q), ou usar Enter e Espaço no nome da bomba, mostra a curva dela no gráfico, com o ponto de trabalho e o rótulo "em visualização". A linha vista ganha o sinal "em visualização", diferente da escolhida, e o botão "Voltar à bomba escolhida" desfaz. Só o botão Escolher escolhe. A visualização não entra no projeto salvo nem nos exportados e some ao sair da etapa. Dica na Ajuda, no glossário.
- **Pressostatos sem texto explicativo (FC-034):** o cartão Pressostatos da etapa Bomba e automação mostra só as três pressões e, quando a escada não cabe, um aviso curto sem norma; a regra da escada (a principal liga na pressão calculada na descarga; a bomba de pressurização liga 10 mca acima e desliga 10 mca acima da própria partida, até o teto, que é o shut-off da principal no cavalete) passou para o glossário da Ajuda, com a fonte IT 22, C.1.15.1. Nenhum número muda.
- **Desenho da rede pelo teclado (FC-032):** o Tab entra no desenho em uma só parada; as setas, Home e End passam de um trecho ou ponto a outro, da RI para os hidrantes, e cada um abre o mesmo cartão que o mouse abre. Esc fecha o cartão sem tirar o foco; sair por Tab também fecha. O foco aparece com contorno nos dois temas, cada elemento tem nome curto para o leitor de tela e o desenho passa a ser um grupo, não mais uma imagem única. Mouse e toque ficam como estavam; a dica de teclado está no Glossário da Ajuda.
- **Tela Início (FC-023):** o título "Início" não traz mais o parágrafo abaixo dele; o que ele dizia (oito etapas, Novo projeto, Abrir projeto, os três cartões) continua na própria tela. A tela Sobre já estava assim. O modo IFC da Rede não se aplica (o leitor IFC saiu na 2.6.1). Nenhum número do cálculo mudou.
- **Rodapé da etapa Hidrantes (FC-017):** quando falta só a pressão de saída regulada da válvula redutora, o rodapé ganha o botão "Abrir a válvula redutora", que abre o menu da válvula com o foco no primeiro campo vazio; ao fechar, o foco volta ao botão. Nenhum número do cálculo mudou.
- **Atalho "Pular para o conteúdo":** com o foco no atalho (primeiro Tab) sobrava um pequeno resíduo laranja logo abaixo dele, a ponta da chama do logotipo da barra lateral. Com o foco no atalho, o logotipo fica coberto; sem foco ele aparece como antes. O contorno de foco de 2 px, a posição e o comportamento do atalho não mudam.
- **"Trazer de um arquivo" da "Minha biblioteca de bombas":** lia só o arquivo antigo (`bombasUsuario`) e dizia "Nenhuma bomba nova no arquivo" para o JSON gerado com a IA. Agora o botão traz tudo pela mesma rota da inclusão em lote (todos os grupos do modelo, com o relatório do que entrou e do que foi recusado) e continua aceitando o arquivo baixado por "Baixar a biblioteca". Bomba com o mesmo fabricante e modelo de uma do catálogo, da biblioteca ou do projeto é recusada, também no lote. O passo 7 do menu "?" de bombas cita as duas rotas. Num arquivo que mistura o formato antigo e o novo, as bombas antigas recusadas também aparecem no relatório, com o motivo.
- **Menu "?" no celular:** ocupava a tela toda e só fechava pelo botão Fechar. Agora vira uma folha ancorada embaixo, com uma faixa do fundo no alto que fecha ao toque; o toque dentro do menu não fecha, e acima de 640px nada muda.
- **Cartão da bomba escolhida:** não mostra mais o aviso da curva aceita como lida (52 bombas KSB). O dado da bomba não muda.
- **Fonte do comprimento equivalente da tabela B:** agora indica o arquivo e as páginas do catálogo da Tupy (Catalogo_Completo_Tupy.pdf, pp. 16 e 18). Nenhum número mudou, só o texto da fonte e o título da tabela.
- **Arquivo antigo com esguichos diferentes (FC-013):** ao abrir, no Paraná, um projeto anterior à 2.6.0 cujos hidrantes tinham esguichos diferentes, o aviso "Projeto de uma versão anterior" passa a dizer qual esguicho ficou (o do primeiro hidrante) e que a pressão na válvula e a de entrada mínima podem mudar. A regra de carga é a mesma da 2.6.0; só o aviso é novo. A lista de avisos de qualquer arquivo antigo passa a abrir com "O que mudou ao abrir este arquivo:" (antes dizia "O que mudou na 2.5.0:" mesmo para avisos de outras versões). Em São Paulo, com esguichos iguais, em arquivo da 2.6.0 em diante e em projeto novo, nada aparece.
- **Esguicho da biblioteca que sai do cadastro (FC-014):** o projeto passa a guardar a cópia do esguicho da Minha biblioteca que ele usa, e o arquivo salvo leva essa cópia; retirar o esguicho da biblioteca com o projeto aberto não faz mais sumir o que chega ao esguicho nem a V28 (SP), nem o ponto de projeto (PR). Arquivo salvo pela 2.6.0 a 2.6.3, sem a cópia e aberto num computador sem o esguicho, avisa na abertura e no cartão Esguicho da etapa Hidrantes, e entra como item de alerta nas Verificações (SP). O esguicho escolhido não é trocado em silêncio. No Paraná a tela explica a situação em vez do erro de código. Ao retirar da Minha biblioteca um esguicho que o projeto usa, o aviso diz que o projeto guarda a cópia.
- **Menu da redutora, pavimento sem hidrante de arquivo antigo (FC-016):** nas colunas Dinâmica antes e Dinâmica depois da linha do pavimento que vem de arquivo anterior à 2.5.0, sem hidrante na rede, aparecia "sem dado". Agora aparece "sem hidrante na rede", sem número. Saída regulada e estáticas da linha, e as linhas de hidrante, não mudam.
- **Texto de arquivo sem efeito na tela (FC-H07):** nome da obra no aviso de trabalho não baixado, nós e peças de arquivo de projeto, unidade da potência de bomba e números de cadastro de um arquivo de projeto passam a ser escritos como texto, nunca como marcação; com dados normais a tela é idêntica.
- **Números do cálculo:** nenhum muda. Os oito exemplos dão os mesmos resultados da 2.6.3.

### Manutenção do repositório (sem mudança no programa)

- **Patches antigos fora da pasta de ferramentas (FC-038):** saem os blocos das versões 2.1 a 2.5.2 (42 arquivos). O programa e os quatro arquivos HTML não mudam.
- **Interface antiga 1.0.0 fora do repositório (FC-037):** saem o arquivo da interface antiga, o script que o montava e o estilo dela; a trava, os testes e a documentação deixam de citá-la. O programa e os três arquivos HTML não mudam, nem os números do cálculo. Só o git guarda a interface antiga.

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
