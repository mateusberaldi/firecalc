/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, aplicação: tela Início, módulos, desenho geral, eventos, busca rápida, cópia automática e arquivos. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, E = U.E, V = U.V, S = U.S, esc = U.esc;
  var CH = { auto: 'firecalc2_auto', lista: 'firecalc2_projetos', tema: 'firecalc2_tema', modo: 'firecalc2_modo' };
  function guarda(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  function le(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var GLOSS = [
    ['Nó', 'Ponto da rede onde um trecho começa ou termina: o reservatório (RI), a bomba (BI), uma derivação (A, B...) ou um hidrante (H1, H2...). Fonte: convenção do FireCalc.'],
    ['Trecho', 'Pedaço de tubo entre dois nós, com um só diâmetro e uma só vazão. O nome é formado pelos dois nós, de montante para jusante (RI-BI, BI-A, A-H1). Fonte da convenção: Azevedo Netto, Manual de Hidráulica, cap. 19.'],
    ['Montante e jusante', 'Montante é o lado de onde a água vem (o reservatório); jusante é o lado para onde ela vai (o hidrante). Fonte: Azevedo Netto, Manual de Hidráulica.'],
    ['Altura manométrica total (AMT)', 'Energia que a bomba entrega à água, em metros de coluna de água: a pressão na descarga menos a pressão na sucção. Fonte: Azevedo Netto, Manual de Hidráulica.'],
    ['Curva da bomba em visualização', 'Na etapa Bomba, clicar numa linha das listas de bombas (ou usar Enter e Espaço no nome da bomba) mostra a curva dela no gráfico, sem escolhê-la. A linha ganha o sinal "em visualização" e só o botão Escolher troca a bomba. Fonte: convenção do FireCalc.'],
    ['Comprimento equivalente (Leq)', 'Comprimento de tubo reto que causa a mesma perda de carga de uma peça. Fonte: Azevedo Netto, Tabela 7.6.'],
    ['Reserva técnica de incêndio (RTI)', 'Volume de água guardado só para o combate a incêndio. Fonte: IT 22, Tabela 3.'],
    ['NPSH disponível', 'Energia da água na entrada da bomba, acima da pressão de vapor. Precisa ser maior que o NPSH requerido do catálogo. Fonte: IT 22, 4.8.15.'],
    ['Pressão a vazão nula (shut-off)', 'Pressão que a bomba dá com o registro fechado, sem vazão. Fonte: IT 22, C.1.14.'],
    ['Bomba de pressurização (jockey)', 'Bomba pequena que mantém a rede pressurizada e repõe pequenas perdas, para a bomba principal não partir à toa. Fonte: IT 22, C.1.15.'],
    ['Escada de pressostatos', 'Pressões em que as bombas ligam e desligam, contadas a partir da pressão calculada na descarga. A bomba principal liga nessa pressão; a bomba de pressurização liga 10 mca acima e desliga 10 mca acima da própria partida, sem passar do teto, que é o shut-off da bomba principal no cavalete, com a água no nível X. A norma recomenda um diferencial de cerca de 10 mca; o projetista pode adotar outro valor, de 1 a 20 mca, no cartão Pressostatos, e a verificação e o memorial registram o valor adotado. Fonte: IT 22, C.1.15.1.'],
    ['Par mais desfavorável', 'Os dois jatos que, abertos juntos, pedem a maior altura manométrica. Fonte: IT 22, 4.8.3.'],
    ['Nível X', 'Nível da água no reservatório quando só resta a reserva de incêndio. A altura manométrica é contada a partir dele. Fonte: convenção do FireCalc.'],
    ['Fator C', 'Coeficiente de Hazen-Williams, que mede o atrito do tubo: quanto menor, mais perda de carga. Aço galvanizado: 120. Fonte: IT 22, Tabela 1.'],
    ['Perda de carga', 'Pressão que a água gasta para vencer o atrito do tubo e das peças. Calculada pela fórmula de Hazen-Williams. Fonte: IT 22, 4.8.10.2.'],
    ['Pressão dinâmica', 'Pressão na válvula do hidrante com a água correndo. É nela que a pressão mínima da norma é verificada. Fonte: IT 22, 4.8.4.'],
    ['Pressão estática', 'Pressão na válvula com a rede cheia e sem vazão, bomba ligada. Não pode passar de 100 mca. Fonte: IT 22, 4.8.8; no Paraná, NPT 022, 5.7.7.'],
    ['Piscina como reservatório inferior', 'Só em São Paulo. A reserva é a água entre o nível X e o nível mínimo de operação, garantida permanentemente por declaração do responsável pelo uso. O fundo em rampa é tomado reto de uma ponta à outra; com patamar raso, informe a forma pela área do espelho de água. Fonte: IT 22, B.1.4.'],
    ['Ponto de trabalho', 'Vazão e altura em que a bomba de fato opera: o encontro da curva da bomba com a curva do sistema. Fonte: Azevedo Netto, Manual de Hidráulica.'],
    ['Dispositivo de recalque', 'Entrada de água na fachada ou no passeio, por onde a viatura dos bombeiros abastece a rede. Fonte: IT 22, 4.3.'],
    ['Ramal de retorno para testes', 'Tubo que leva a água da descarga da bomba de volta ao reservatório, para ensaiar a bomba sem abrir hidrante. Exigido no Paraná. Fonte: NPT 022, 5.10.6.3.'],
    ['Exigência pelo decreto (São Paulo)', 'O decreto indica hidrantes e mangotinhos pela divisão, pela área e pela altura da edificação. Com área até 750 m² e altura até 12 m (os dois valores incluídos) o decreto não traz hidrantes (Tabela 5); acima de 750 m² ou de 12 m vale a tabela da divisão (Tabelas 6A a 6M.5). Há exceções. Nos grupos K e M a tabela específica vale em qualquer área e altura (M-3 segue a regra comum). Em L-1 acima de 100 m² o caso vai à análise do Corpo de Bombeiros. Em F-7 a altura pesa também acima de 6 m, que vai à análise. Em K-1 o decreto indica hidrantes quando a área passa de 750 m² ou a altura passa de 12 m (o "ou" das notas 3 e 4 da Tabela 6K), e por isso o resultado de K-1 é verifique. A ferramenta usa a área e a altura que você informa. Altura: do piso mais baixo ocupado ao piso do último pavimento, sem contar subsolos de estacionamento, vestiários, sanitários e áreas técnicas sem permanência, subsolo de primeiro ou segundo nível com outras ocupações que somem até 50 m² (exceto F-11, art. 16, II), ático, casa de máquinas, barrilete, reservatório, mezanino até um terço do pavimento e o pavimento superior de duplex ou triplex do último piso residencial. Área: a da edificação, sem telheiro até 10 m², beiral até 3 m, passagem coberta até 3 m de largura, reservatório, piscina e escada enclausurada, cobertura de bomba de combustível e de praça de pedágio, duto de ventilação das saídas de emergência e, no tocante a sistemas hidráulicos, banheiros e vestiários (art. 18, IV, VI e VIII). Ficam fora do resultado e só são apontados: ocupação mista, isolamento de risco, edificação existente, subsolo ocupado, depósito descoberto e as isenções da IT 22, Anexo E. Em E-3 e F-3 a isenção do E.1.3 vale para ginásio poliesportivo e piscina coberta sem uso para outros eventos que não sejam atividades esportivas, e para áreas de apoio até 750 m². Quando a exigência depende disso, o resultado é verifique. Fonte: Decreto 69.118/24, arts. 3º, 4º, 16 a 19 e 22, Anexo A, Tabelas 5, 6 e 7; IT 22/2025, Anexo E.'],
    ['Minha biblioteca de reservatórios', 'Lista de caixas de água cadastradas por você, com fabricante, modelo, tipo, medidas internas, volume nominal e fonte. O programa não traz medida de fabricante: cada item vem do seu catálogo, e o item sem fonte fica marcado. No Abastecimento, "Escolher da minha biblioteca" só preenche os campos de medida do tipo de reservatório; você pode editar cada um. O arquivo da IA segue o modelo, no grupo reservatorios. Fonte: convenção do FireCalc.'],
    ['Desenho da rede pelo teclado', 'Tab leva ao desenho. Setas, Home e End passam de um trecho ou ponto a outro e abrem o cartão com os dados; Esc fecha o cartão; Tab segue para fora do desenho. Fonte: convenção do FireCalc.']
  ];
  U.GLOSS = GLOSS;
  var CAMPOS = [['Nome da obra', 'ident.obra'], ['Norma do projeto', 'norma'], ['Divisão de ocupação', 'sistema.divisao'], ['Área da edificação', 'sistema.area'], ['Fator C', 'C'], ['Tabela de comprimento equivalente', 'tabelaLeq'],
    ['Cota do nível X', 'fonte.zX'], ['Reserva de incêndio efetiva', 'fonte.rtiEfetiva'], ['Altitude', 'ambiente.altitude'], ['Bomba de incêndio', 'bomba.id'], ['NPSH requerido', 'bomba.npshr'], ['Bomba de pressurização (jockey)', 'jockey.id']];

  // ---------- projetos salvos neste navegador (lista; a cópia única da primeira versão da 2.0 é trazida para a lista)
  var MAXP = 12;
  function novoPid() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  function listaProj() {
    var l = null; try { l = JSON.parse(le(CH.lista)); } catch (e) { l = null; }
    if (!Array.isArray(l)) l = [];
    if (!l.length) { try { var a = JSON.parse(le(CH.auto)); if (a && a.F) { a.F.pid = a.F.pid || novoPid(); l = [{ pid: a.F.pid, F: a.F, etapa: a.etapa, quando: a.quando }]; } } catch (e) { /* sem cópia antiga */ } }
    return l.filter(function (x) { return x && x.pid && x.F && x.F.ident; });
  }
  function guardaProjeto() {
    if (!S.aberto) return; if (!S.F.pid) S.F.pid = novoPid();
    var l = listaProj().filter(function (x) { return x.pid !== S.F.pid; });
    l.unshift({ pid: S.F.pid, F: S.F, etapa: S.etapa, etv: 8, quando: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) });
    guarda(CH.lista, JSON.stringify(l.slice(0, MAXP)));
  }
  U.listaProj = listaProj;

  // ---------- telas fora do assistente
  /** Situação de um projeto guardado, para o selo da lista do Início: refaz o cálculo da cópia (sem tocar na guardada) e conta as verificações; sem resultado, "Em andamento". */
  function seloProjeto(a) {
    try {
      var F = JSON.parse(JSON.stringify(a.F)); if (!F.bombasUsuario) F.bombasUsuario = []; E.migraF(F, D);
      var sit = E.avalia(F, D, M); if (sit.k !== 'ok') return '<span class="fc-selo">' + U.icone('circle-dashed', 'fc-ic') + 'Em andamento</span>';
      var er = 0, al = 0; sit.R.verificacoes.forEach(function (v) { if (v.id === 'V22') return; if (v.situacao === 'ERRO') er++; else if (v.situacao === 'ALERTA') al++; });
      return er ? U.pilula('er', er + (er > 1 ? ' não atendem' : ' não atende')) : al ? U.pilula('al', al + ' a conferir') : U.pilula('ok', 'Atende');
    } catch (e) { return '<span class="fc-selo">' + U.icone('circle-dashed', 'fc-ic') + 'Em andamento</span>'; }
  }
  function telaInicio() {
    var L = listaProj(), nE = U.ETAPAS.length;
    var rec = L.length ? U.cartao('Projetos neste navegador', '<ul class="fc-lista fc-lista--proj">' +
      L.map(function (a) {
        var nome = esc(a.F.ident.obra || 'Projeto sem nome'), et = etapaGuardada(a), nm = a.F.norma && D.normas[a.F.norma] ? esc(D.normas[a.F.norma].nome) : 'norma a escolher';
        return '<li data-pid="' + esc(a.pid) + '">' + U.icone('file-text', 'fc-ic') + '<span><b>' + nome + '</b><small>' + (S.aberto && S.F.pid === a.pid ? 'Aberto agora' : esc(a.quando || '')) + ' · ' + nm + ' · etapa ' + et + ' de ' + nE + ', ' + U.ETAPAS[et - 1] + '</small></span>' + seloProjeto(a) +
          '<button class="fc-bt fc-bt--p" data-acao="continuar" data-v="' + esc(a.pid) + '" aria-label="Abrir o projeto ' + nome + '">Abrir</button>' +
          '<button class="fc-bt fc-bt--icone fc-bt--disc" data-acao="esquecer" data-v="' + esc(a.pid) + '" aria-label="Tirar o projeto ' + nome + ' da lista" title="Tirar da lista">' + U.icone('trash-2', 'fc-ic') + '</button></li>';
      }).join('') + '</ul>', { id: 'salvos', extra: '<span class="apoio fc-cartao__nota">Salvos automaticamente</span>', pe: '<span class="apoio">A lista guarda os ' + MAXP + ' projetos mais recentes, só neste navegador. Para não depender dela, baixe o arquivo .json de cada projeto.</span>' }) : '';
    return U.cab(0, 'Início') +
      '<div class="fc-vazio" id="solta"><span class="fc-vazio__ic">' + U.icone('file-plus', 'fc-ic fc-ic--g') + '</span><h2>' + (S.aberto ? 'Começar outro projeto' : 'Comece um projeto') + '</h2><p>Uma etapa por vez; o programa mostra o que falta antes de avançar.</p>' +
      '<div class="fc-bts"><button class="fc-bt fc-bt--pri" data-acao="novo">Novo projeto</button><button class="fc-bt" data-acao="abrir">Abrir projeto (.json)</button>' + (S.aberto ? '<button class="fc-bt" data-ir="etapa:' + S.etapa + '">Voltar ao projeto aberto</button>' : '') + '</div>' +
      '<span class="fc-vazio__dica">ou arraste o arquivo para esta área · os casos de exemplo estão na pasta <span class="tec">exemplos</span></span></div>' + rec +
      U.aviso('in', '<b>Nada sai do seu computador.</b> O projeto fica neste navegador e no arquivo que você baixar; o programa funciona sem internet.');
  }
  function telaSobre() {
    var fontes = D.fontes.map(function (f) { return '<li>' + esc(typeof f === 'string' ? f : (f.titulo || f.nome || JSON.stringify(f))) + '</li>'; }).join('');
    return U.cab(0, 'Sobre') +
      U.cartao('Versão', '<p>' + U.VERSAO + '. Base técnica ' + esc(D.versao) + ', gerada em ' + esc(D.gerado) + '.</p>') +
      U.cartao('Licença', '<p>Copyright (C) 2026 Mateus Beraldi Nobre.</p>' +
        '<p>O FireCalc é software livre, distribuído sob a GNU Affero General Public License, versão 3 (AGPL-3.0-only). Você pode usar, estudar, modificar e redistribuir, inclusive em projeto pago, mantendo os avisos de direito autoral e de licença e entregando o código-fonte de qualquer versão modificada, também a quem a usar por rede.</p>' +
        '<p>Este programa é fornecido sem garantia de qualquer espécie, nos termos da licença.</p>' +
        '<p class="peq">Texto completo da licença: arquivo LICENSE do código-fonte e gnu.org/licenses/agpl-3.0.html. Código-fonte completo de cada versão: github.com/mateusberaldi/firecalc.</p>', { id: 'sobre-licenca' }) +
      U.cartao('Nome e logo', '<p>O nome FireCalc e o logo são reservados ao titular e não fazem parte da licença. Uma versão modificada usa outro nome e outro logo. As regras estão no arquivo MARCA.md do código-fonte.</p>', { id: 'sobre-marca' }) +
      U.cartao('Fontes da verdade técnica', '<p>Azevedo Netto, Manual de Hidráulica; IT 22/2025 do CBPMESP; NPT 022 do CBMPR; normas da ABNT citadas em cada item; Telmo Brentano. Catálogos de fabricantes são apoio e aparecem com a fonte ao lado do dado.</p><ul class="peq">' + fontes + '</ul>') +
      U.cartao('Componentes de terceiros', '<p class="peq">ExcelJS 4.4.0, licença MIT. docx 9.8.1, licença MIT. Os dois trazem dentro JSZip (MIT) e pako (MIT e Zlib); o ExcelJS traz também ieee754 (BSD-3-Clause) e safe-buffer (MIT). Fontes Inter e JetBrains Mono, licença SIL Open Font 1.1. Ícones Lucide 0.460.0, licença ISC. Os catálogos de fabricantes continuam sob os direitos dos seus autores.</p>', { id: 'sobre-terceiros' }) +
      '<p class="apoio fc-direitos">© 2026 Mateus Beraldi Nobre. Software livre sob a AGPL-3.0, sem garantia.</p>';
  }
  // ---------- desenho geral
  function conteudo() {
    var h;
    if (S.tela === 'inicio') h = telaInicio();
    else if (S.tela === 'sobre') h = telaSobre();
    else if (S.tela === 'estat') h = U.telas.estat();
    else if (S.tela === 'projeto') h = S.aberto ? (U.telas[S.etapa] || U.telas[S.etapa = 1])() : telaInicio();   /* 2.5.3: etapa fora da faixa (lista antiga) abre a 1 */
    else h = U.telas[S.tela]();
    if (!(S.tela === 'projeto' && S.etapa === U.POS.bomba)) S.verBomba = '';   /* 2.6.4: a curva em visualização some ao sair da etapa Bomba */
    document.getElementById('conteudo').innerHTML = h;
  }
  function desenhar(manterFoco) {
    var a = document.activeElement, id = a && a.id, ini = a && a.selectionStart, fim = a && a.selectionEnd;   // guarda a seleção inteira: campo que recebe o foco pela tecla Tab vem todo selecionado
    U.recalc(); document.documentElement.setAttribute('data-theme', S.tema); U.viuTudo();   /* anúncio de erro uma vez só (U.novo) */
    if (S.sel >= S.F.trechos.length) S.sel = S.F.trechos.length - 1;
    U.lateral(); U.topo(); U.resumo(); conteudo(); U.rodape(); U.falar();
    var h1 = document.querySelector('#conteudo h1'); document.title = (h1 ? h1.textContent + (S.tela === 'projeto' && S.aberto ? ', etapa ' + S.etapa + ' de ' + U.ETAPAS.length : '') + ' | ' : '') + 'FireCalc';
    U.ajustaLinhas();
    if (manterFoco && id) { var el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(ini, fim === undefined || fim === null ? ini : fim); } catch (e) { /* campo sem cursor */ } } }
  }
  U.desenhar = desenhar;
  var tAuto = null, tHist = null;
  /** Depois de qualquer mudança no formulário: recalcula, redesenha, guarda a cópia automática e o passo de desfazer. */
  function mudou(digitando) {
    S.sujo = true; desenhar(true);
    clearTimeout(tAuto); tAuto = setTimeout(guardaProjeto, 400);
    clearTimeout(tHist); if (digitando) tHist = setTimeout(function () { U.H.guarda(S.F); U.topo(); }, 600); else { U.H.guarda(S.F); U.topo(); }
  }
  U.mudou = mudou;
  U.avisa = function (tx, ms) { var a = document.getElementById('aviso-proto'); a.innerHTML = '<span></span>'; a.firstChild.textContent = tx; a.hidden = false; clearTimeout(U.avisa.t); U.avisa.t = setTimeout(function () { a.hidden = true; }, ms || 4500); };
  /** 2.5.3: etapa guardada na lista de projetos do navegador. Até a 2.5.2 eram nove etapas (sem a marca etv): da 3 em diante, uma a menos. */
  function etapaGuardada(a) { var n = a.etapa || 1; if (a.etv !== 8 && n >= 3) n -= 1; return Math.min(U.ETAPAS.length, Math.max(1, n)); }
  function carrega(F, etapa) { E.migraF(F, D); if (!F.pid) F.pid = novoPid(); S.F = F; S.esgFalado = ''; if (F._aviso) { var av = F._aviso; delete F._aviso; setTimeout(function () { U.avisa(av, 12000); }, 0); } S.aberto = true; S.tela = 'projeto'; S.etapa = etapa || 1; S.sel = F.trechos.length ? 0 : -1; S.tocados = {}; S.forcar = {}; S.visit = {}; S.sujo = false; S.origem = 'digitar'; S.hidCurva = ''; S.verBomba = ''; U.H = E.Historico(); U.H.guarda(S.F); desenhar(); window.scrollTo(0, 0); }
  function ir(dest) {
    var p = dest.split(':');
    S.ajuda = '';
    if (p[0] === 'tela') { if (p[1] === 'estat' && (!S.aberto || S.sit.k !== 'ok')) { U.avisa('As estatísticas aparecem quando o projeto tiver resultado calculado.'); return; } if (p[1] === 'projeto' && !S.aberto) { U.avisa('Nenhum projeto aberto. Comece um projeto novo ou abra um arquivo.'); S.tela = 'inicio'; } else S.tela = p[1]; }
    else { var n = +p[1]; if (!S.aberto) return; if (!U.aberta(n)) { U.avisa('A etapa ' + U.ETAPAS[n - 1] + ' abre quando as anteriores estiverem completas.'); return; } if (S.tela === 'projeto') S.visit[S.etapa] = 1; S.tela = 'projeto'; S.etapa = n; S.esgFalado = ''; }
    desenhar(); window.scrollTo(0, 0); document.getElementById('conteudo').focus({ preventScroll: true });
  }
  /** "Ir corrigir": abre a etapa do campo e põe o foco nele. */
  function corrigir(c) {
    var i = U.info(c), etapa = i ? i.etapa : null, m = /^trechos\.(\d+)\./.exec(c);
    if (!etapa) etapa = /^ident|^norma|^ambiente/.test(c) ? U.POS.ident : /^(sistema|conf\.tipo)/.test(c) ? U.POS.edif : /^(C$|Cfonte$|tabelaLeq|tipoTubo|recalque)/.test(c) ? U.POS.rede : m || /^nos\.(?!RI|BI)/.test(c) ? U.POS.rede : /^(hidrantes|cotasExtras|conf\.lista)/.test(c) ? U.POS.hidr : /^(fonte|nos)/.test(c) ? U.POS.abast : U.POS.bomba;
    if (S.tela === 'projeto') S.visit[S.etapa] = 1;
    S.tela = 'projeto'; S.etapa = etapa; S.tocados[c] = 1; if (m) { S.sel = +m[1]; }
    desenhar();
    if (c === 'conf.tipo' && U.soTipo()) { pedeTipo(); return; }
    if (etapa === U.POS.abast && S.F.fonte.tip && /^(fonte\.(?!tipo$|tip$)|nos\.(BI|RI)$)/.test(c) && U.abMenu) { U.abMenu(); return; }   /* 2.6.0: o campo está no menu do reservatório */
    if (c === 'fonte.tipo') { var bf = document.getElementById('ab-fonte-inferior'); if (bf) { bf.scrollIntoView({ block: 'center' }); bf.focus(); } return; }
    if (c === 'fonte.tip') { var bt0 = document.querySelector('#ab-tipo .fc-opcao'); if (bt0) { bt0.scrollIntoView({ block: 'center' }); bt0.focus(); } return; }
    if (/\.redP$/.test(c) && S.etapa === U.POS.hidr && U.dialogoRedutora) { U.redRodape = !!document.querySelector('#pe [data-acao="red-rodape"]'); U.dialogoRedutora(); }   /* 2.6.4: vindo do rodapé, o foco volta a ele ao fechar; 2.6.0: a regulagem fica no menu da válvula redutora */
    if (/^(C|Cfonte|tabelaLeq|tipoTubo)$/.test(c) && S.etapa === U.POS.rede && U.dialogoTubo) U.dialogoTubo('p');   /* 2.5.2: o fator C fica no menu do tubo */
    if (c === 'jockey.id') { var bj0 = document.querySelector('#card-jockey #tab-jockey tbody .fc-bt[data-acao="jockey"]') || document.querySelector('#card-jockey select'); if (bj0) { bj0.scrollIntoView({ block: 'center' }); bj0.focus(); } return; }   /* FC-073: a lista da bomba de pressurização */
    var el = document.getElementById(U.idDe(c)); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); if (el.select) el.select(); el.classList.add('pulso'); }
  }
  function comTrabalho(fn) {
    if (!S.aberto || !S.sujo) { fn(); return; }
    dialogo('Há trabalho que ainda não foi baixado', 'O projeto "' + esc(S.F.ident.obra || 'sem nome') + '" tem mudanças que só estão na cópia deste navegador.', [['Baixar e continuar', function () { U.baixaJson(); fn(); }, true], ['Continuar sem baixar', fn], ['Cancelar', function () {}]]);
  }
  U.dialogo = dialogo;
  function dialogo(titulo, corpo, botoes) {
    var d = document.getElementById('dlg'); d.dataset.modo = ''; d.onchange = null; d.oninput = null; d.onclose = null; d.removeAttribute('aria-labelledby'); var cancela = function (b) { return /^(Cancelar|Manter como está)$/.test(b[0]); }, pos = function (k) { return cancela(botoes[k]) ? 0 : botoes[k][2] ? 2 : 1; }, ordem = botoes.map(function (b, k) { return k; }).sort(function (a, c) { return pos(a) - pos(c) || a - c; });   /* o que cancela vem primeiro, o que conclui (primário) por último, e a ação destrutiva ou que perde trabalho fica entre os dois, nunca no último lugar (Janela) */
    d.className = 'fc-janela'; d.setAttribute('aria-labelledby', 'dlg-tit');
    d.innerHTML = '<div class="fc-janela__cab"><h2 id="dlg-tit">' + esc(titulo) + '</h2><button type="button" class="fc-bt fc-bt--icone fc-bt--disc" data-dlg-fechar aria-label="Fechar">' + U.icone('x', 'fc-ic') + '</button></div><div class="fc-janela__corpo">' + corpo + '</div><div class="fc-janela__pe">' + ordem.map(function (k) { var b = botoes[k]; return '<button class="fc-bt' + (b[3] === 'perigo' ? ' fc-bt--perigo' : b[2] ? ' fc-bt--pri' : '') + '" data-dlg="' + k + '">' + esc(b[0]) + '</button>'; }).join('') + '</div>';
    d.onclick = function (ev) { if (ev.target.closest('[data-dlg-fechar]')) { d.close(); return; } var b = ev.target.closest('[data-dlg]'); if (!b) return; var f = botoes[+b.dataset.dlg][1], r = f(); if (r !== false) d.close(); };
    if (!d.open) d.showModal();
    var perigo = botoes.some(function (b) { return b[3] === 'perigo'; }), ki = perigo ? botoes.map(function (b, k) { return cancela(b) ? k : -1; }).filter(function (k) { return k >= 0; })[0] : botoes.map(function (b, k) { return b[2] ? k : -1; }).filter(function (k) { return k >= 0; })[0];
    var bf = d.querySelector('[data-dlg="' + (ki === undefined ? 0 : ki) + '"]'); if (bf) bf.focus();   /* confirmação destrutiva: Cancelar recebe o foco inicial; nas outras, o botão que conclui (o botão Fechar não toma o foco) */
  }
  /** 2.6.0: aviso que pede a confirmação do tipo; com "Sim" o projeto guarda a confirmação e segue para a etapa seguinte. */
  function pedeTipo() {
    var n = S.etapa;
    dialogo('Confirmar o tipo de sistema', U.corpoConfirmaTipo(), [['Sim', function () { S.F.conf.tipo = true; mudou(); ir('etapa:' + (n + 1)); }, true], ['Não', function () {}]]);
  }
  function abrirArquivo(f) {
    var r = new FileReader();
    r.onload = function () { try { var o = JSON.parse(r.result); if (!o.trechos && !o.norma && !o.identificacao) throw new Error('o arquivo não é um projeto do FireCalc'); carrega(E.abrir(o, D, M), 1); guardaProjeto(); S.etapa = primeiraPendente(); desenhar(); var mg = S.F.migracao; delete S.F.migracao; if (mg) dialogo('Projeto de uma versão anterior', '<p class="peq">O arquivo abriu sem perder dado. O que mudou ao abrir este arquivo:</p><ul class="peq">' + mg.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', [['Entendi', function () {}, true]]); else U.avisa('Projeto aberto: ' + (S.F.ident.obra || f.name)); } catch (e) { U.avisa('Arquivo inválido: ' + e.message); } };
    r.readAsText(f);
  }
  function primeiraPendente() { for (var n = 1; n < U.POS.rel; n++) if (!S.et[n - 1].completa) return U.aberta(n) ? n : Math.max(1, n - 1); return U.POS.rel; }
  function novaLinha() { var u = S.F.trechos[S.F.trechos.length - 1]; S.F.trechos.push({ de: u ? String(u.de).trim() : 'RI', para: '', dn: u ? u.dn : 65, L: '', pecas: {}, _o: {} }); var i = S.F.trechos.length - 1; S.sel = i; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); mudou(); var f = document.getElementById(U.idDe('trechos.' + i + '.para')); if (f) f.focus(); }
  // ---------- eventos
  /* Clique no véu: só fecha a janela se o botão foi apertado E solto no véu; arrastar de dentro de um campo e soltar fora não fecha (Janela). */
  var veuDe = null, veuAte = null;
  document.addEventListener('mousedown', function (ev) { veuDe = ev.target; veuAte = null; }, true);
  document.addEventListener('mouseup', function (ev) { veuAte = ev.target; }, true);
  U.veu = function (ev, d) { return ev.target === d && veuDe === d && veuAte === d; };
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-ir],[data-acao],[data-corrigir],[data-sel],[data-dup],[data-exc],[data-rolar],[data-tirapeca],[data-pecas],[data-tubo],[data-ajuda]');
    var gv = ev.target.closest('.fc-gaveta');
    if (gv && U.veu(ev, gv)) { gv.close(); return; }   /* clique no véu fecha a gaveta ou a folha */
    if (S.ajuda && !ev.target.closest('.fc-campo-ajuda')) { S.ajuda = ''; desenhar(true); }
    var noMenu = !!ev.target.closest('#menu-projeto');
    if (S.menu && !noMenu && !ev.target.closest('#menu-projeto-bt')) { S.menu = false; U.topo(); }
    if (!t || t.disabled) return;
    if (gv && (t.dataset.ir || t.dataset.corrigir)) gv.close();   /* escolher uma etapa, um módulo ou "ir corrigir" fecha a gaveta antes de navegar */
    if (noMenu && S.menu) { S.menu = false; U.topo(); var bm = document.getElementById('menu-projeto-bt'); if (bm) bm.focus({ preventScroll: true }); }
    var d = t.dataset, F = S.F;
    if (d.ajuda) { S.ajuda = S.ajuda === d.ajuda ? '' : d.ajuda; desenhar(); var ba = document.querySelector('[data-ajuda="' + d.ajuda + '"]'); if (ba) ba.focus({ preventScroll: true }); }
    else if (d.ir) { ev.preventDefault(); if (d.abrirAba) { var pa = d.abrirAba.split(':'); S.aba[pa[0]] = pa[1]; } ir(d.ir); }
    else if (d.corrigir) corrigir(d.corrigir);
    else if (d.sel) { S.sel = +d.sel; desenhar(); }
    else if (d.pecas) U.dialogoPecas(+d.pecas);
    else if (d.tubo) U.dialogoTubo(d.tubo);
    else if (d.dup) { var c = E.clone(F.trechos[+d.dup]); c.para = ''; F.trechos.splice(+d.dup + 1, 0, c); S.sel = +d.dup + 1; mudou(); var fj = document.getElementById(U.idDe('trechos.' + S.sel + '.para')); if (fj) fj.focus(); U.avisa('Trecho duplicado: digite o nó de jusante da cópia.'); }
    else if (d.exc) { var nx = U.nomeTrecho(F.trechos[+d.exc]); F.trechos.splice(+d.exc, 1); S.sel = Math.min(S.sel, F.trechos.length - 1); mudou(); U.avisa('Trecho ' + nx + ' excluído. Para desfazer, use o botão Desfazer ou Ctrl+Z.', 7000); var fx = document.querySelector('[data-exc="' + Math.max(0, S.sel) + '"]') || document.querySelector('[data-acao="linha"]'); if (fx) fx.focus(); }
    else if (d.rolar) { var el = document.getElementById(d.rolar); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (d.tirapeca) { var p = d.tirapeca.split('.'), id = p.pop(), o = U.pega(p.join('.')); delete o[id]; mudou(); }
    else if (d.acao === 'menu') { abreMenu(!S.menu); }
    else if (d.acao === 'menulat') abreGaveta('gav-lat', t);
    else if (d.acao === 'resumo-abrir') abreGaveta('gav-resumo', t);
    else if (d.acao === 'gav-fechar') { var gd = t.closest('dialog'); if (gd) gd.close(); }
    else if (d.acao === 'tema') { var tn = d.v === 'claro' || d.v === 'escuro' ? d.v : (S.tema === 'claro' ? 'escuro' : 'claro'); if (tn === S.tema) return; S.tema = tn; guarda(CH.tema, S.tema); desenhar(); var bsg = document.getElementById('seg-tema-' + S.tema); if (bsg && d.v) bsg.focus({ preventScroll: true }); }   /* Segmentado: o foco volta ao botão escolhido depois de desenhar a tela de novo */
    else if (d.acao === 'modo') { var mn = d.v === 'padrao' || d.v === 'personalizado' ? d.v : (S.modo === 'padrao' ? 'personalizado' : 'padrao'); if (mn === S.modo) return; S.modo = mn; guarda(CH.modo, S.modo); desenhar(); var bsm = document.getElementById('seg-modo-' + S.modo); if (bsm && d.v) bsm.focus({ preventScroll: true }); U.avisa(S.modo === 'padrao' ? 'Modo padrão: as etapas abrem em ordem.' : 'Modo personalizado: todas as etapas abertas.'); }
    else if (d.acao === 'busca') abrirBusca();
    else if (d.acao === 'novo') comTrabalho(function () { var F0 = E.novo(); U.aplicaCfg(F0); carrega(F0, 1); });
    else if (d.acao === 'abrir') comTrabalho(function () { document.getElementById('arq').click(); });
    else if (d.acao === 'continuar') comTrabalho(function () { var a = listaProj().filter(function (x) { return x.pid === d.v; })[0]; if (!a) { U.avisa('Este projeto não está mais na lista deste navegador.'); desenhar(); return; } try { if (!a.F.bombasUsuario) a.F.bombasUsuario = []; a.F.trechos.forEach(function (t) { if (t.C === undefined) t.C = ''; }); carrega(a.F, etapaGuardada(a)); if (!U.aberta(S.etapa)) { S.etapa = primeiraPendente(); desenhar(); } S.sujo = true; } catch (e) { U.avisa('A cópia deste navegador não pôde ser lida.'); } });
    else if (d.acao === 'esquecer') dialogo('Tirar o projeto da lista', 'O projeto sai da lista deste navegador. Se você não baixou o arquivo .json, ele se perde.', [['Tirar da lista', function () { guarda(CH.lista, JSON.stringify(listaProj().filter(function (x) { return x.pid !== d.v; }))); try { localStorage.removeItem(CH.auto); } catch (e) { /* sem armazenamento */ } desenhar(); }, false, 'perigo'], ['Cancelar', function () {}]]);
    else if (d.acao === 'salvar') U.baixaJson();
    else if (d.acao === 'xlsx') U.baixaXlsx();
    else if (d.acao === 'docx') U.baixaDocx();
    else if (d.acao === 'desfazer' || d.acao === 'refazer') { var f = d.acao === 'desfazer' ? U.H.desfaz() : U.H.refaz(); if (f) { S.F = f; S.sujo = true; desenhar(); } }
    else if (d.acao === 'proximo') { var n = S.etapa; if (!U.aberta(n + 1) && n === U.POS.edif && U.soTipo()) pedeTipo(); else if (U.aberta(n + 1)) { if (n === U.POS.abast && E.criaSuccao(F, D, M)) { S.sel = 0; mudou(); } ir('etapa:' + (n + 1)); } else { S.forcar[n] = 1; var pr = S.sit.campos.filter(function (x) { return x.etapa === n && x.n !== 'alerta'; })[0]; if (pr) corrigir(pr.c); else if (n === U.POS.rede && S.sit.av.length) corrigir('trechos.' + S.sit.av[0].i + '.' + S.sit.av[0].campo); else desenhar(); U.avisa('Falta: ' + S.et[n - 1].falta + '.'); } }
    else if (d.acao === 'coluna') { F.sistema.coluna = d.v; F.sistema.colManual = false; F.sistema.tipoManual = ''; F.conf.coluna = true; F.conf.tipo = false; mudou(); }
    else if (d.acao === 'alterar') U.dialogoSistema();
    else if (d.acao === 'tipotabela') { F.sistema.tipoManual = ''; F.conf.tipo = false; mudou(); }
    else if (d.acao === 'colauto') { F.sistema.colManual = false; F.sistema.coluna = ''; E.autoColuna(F, D, M); mudou(); }
    else if (d.acao === 'conferir') { var CF = F.conferidos || (F.conferidos = {}); if (CF[d.v] !== undefined) delete CF[d.v]; else CF[d.v] = d.s; mudou(); var bc = document.getElementById('conf-' + d.v); if (bc) bc.focus({ preventScroll: true }); }   /* 2.5.4 */   /* 2.5.3: cascata trecho a trecho ou agrupada */
    else if (d.acao === 'bomba') { F.bomba.id = d.v; S.verBomba = ''; mudou(); }
    else if (d.acao === 'dif-restaura') { F.pressostatoDif = ''; mudou(); var fdr = document.getElementById(U.idDe('pressostatoDif')); if (fdr) fdr.focus({ preventScroll: true }); }   /* FC-073: volta ao diferencial da norma */
    else if (d.acao === 'escala-alterar') { var fdi = document.getElementById(U.idDe('pressostatoDif')); if (fdi) { fdi.scrollIntoView({ block: 'center' }); fdi.focus(); if (fdi.select) fdi.select(); fdi.classList.add('pulso'); } }   /* FC-073: foca o campo da escala de acionamento */
    else if (d.acao === 'bomba-trocar') { var cjk = document.getElementById('card-jockey'), bjk = cjk && (cjk.querySelector('#tab-jockey tbody .fc-bt[data-acao="jockey"]') || cjk.querySelector('select')); if (cjk) cjk.scrollIntoView({ block: 'start' }); if (bjk) bjk.focus({ preventScroll: true }); }   /* FC-073: volta à bomba de pressurização, com o foco na lista */
    else if (d.acao === 'jockey') { F.jockey.id = d.v; mudou(); }   /* 2.6.0: escolher ou tirar a bomba de pressurização pela lista */
    else if (d.acao === 'fonte' || d.acao === 'tip') U.abTroca(d.acao, d.v);   /* 2.6.0: fonte de pressão e tipo do reservatório */
    else if (d.acao === 'abmenu') { if (F.fonte.tip && U.abMenu) U.abMenu(); else ir('etapa:' + U.POS.abast); }   /* 2.6.0: a cota de RI e BI na Rede abre o menu do Abastecimento */
    else if (d.acao === 'primeiro') { F.trechos.push(E.primeiroTrecho(F, D, M)); S.sel = 0; mudou(); var f0 = document.getElementById(U.idDe('trechos.0.L')); if (f0) f0.focus(); }
    else if (d.acao === 'linha') novaLinha();
    else if (d.acao === 'maiscota') { F.cotasExtras.push({ nome: '', z: '' }); mudou(); }
    else if (d.acao === 'tiracota') { F.cotasExtras.splice(+d.v, 1); mudou(); }
    else if (d.acao === 'tiralista') { F.cotasExtras = []; mudou(); U.avisa('Lista de pavimentos sem hidrante retirada. Os pontos da rede continuam conferidos.'); }
    else if (d.acao === 'maisred') { var sr = document.getElementById('red-ponto'), pr0 = sr && sr.value ? U.pegaObj(sr.value) : null; if (pr0) { pr0.red = true; mudou(); if (U.refazDlg) U.refazDlg(); var fr = document.getElementById(U.idDe(sr.value + '.redP')); if (fr) fr.focus(); } }
    else if (d.acao === 'restaura') { var kr = d.v, lr = F.lanc; if (lr && lr.of && ['Q', 'P', 'dn', 'L', 'alcance'].indexOf(kr) >= 0) { lr[kr] = kr === 'dn' ? lr.of[kr] : E.txt(lr.of[kr]); lr['f' + kr] = ''; mudou(); var fr0 = document.getElementById(U.idDe('lanc.' + kr)); if (fr0) fr0.focus({ preventScroll: true }); } }   /* F5: Restaurar o valor da norma de um campo de lançamento */
    else if (d.acao === 'lancoficial') { var esg0 = F.lanc.esg; F.lanc = E.lancNovo(); F.lanc.esg = esg0; F.hidrantes.forEach(function (h) { h.mangueiraDN = ''; if (!V.vazio(h.Lmang)) h.Lmang = '30'; }); mudou(); U.avisa('Dados do esguicho e da mangueira de volta aos valores da tabela oficial.'); }
    else if (d.acao === 'tirared') { var pr1 = U.pegaObj(d.v); if (pr1) { pr1.red = false; pr1.redP = ''; pr1.redFonte = ''; mudou(); if (U.refazDlg) U.refazDlg(); var fd = document.querySelector('#dlg #red-tab input') || document.getElementById('red-ponto'); if (fd && document.getElementById('dlg').open) fd.focus(); } }
  });
  window.addEventListener('resize', function () { U.ajustaLinhas(); });
  document.addEventListener('input', function (ev) {
    var t = ev.target, c = t.dataset && t.dataset.c; if (!c || !(t.tagName === 'INPUT' || (t.tagName === 'TEXTAREA' && t.dataset.umaLinha)) || t.type === 'checkbox') return;
    if (t.tagName === 'TEXTAREA') { var lv = t.value.replace(/\s*[\r\n]+\s*/g, ' '); if (lv !== t.value) { var cp = t.selectionStart; t.value = lv; try { t.setSelectionRange(cp, cp); } catch (x) { /* sem cursor */ } } U.ajustaLinhas(); }
    U.poe(c, t.value); if (c === 'fonte.pocoProf') S.F.fonte.pocoProfAuto = false; if (c === 'fonte.pocoLado') S.F.fonte.pocoLadoAuto = false; if (c === 'sistema.carga') E.autoColuna(S.F, D, M);
    if (c === 'sistema.area' || c === 'sistema.carga') S.F.conf.tipo = false;   /* 2.6.0: mudou a área ou a carga, o tipo é confirmado de novo */
    if (/^lanc\./.test(c)) { var lc = S.F.lanc; lc.tocou = true; if (c === 'lanc.Pe') lc.PeAuto = String(t.value).trim() === ''; if (c === 'lanc.L' && V.num(t.value) > 0) S.F.hidrantes.forEach(function (h) { h.Lmang = t.value; }); } var m = /^trechos\.(\d+)\./.exec(c); if (m) S.sel = +m[1];
    mudou(true);
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target, d = t.dataset || {}, F = S.F;
    if (t.id === 'arq') { if (t.files[0]) abrirArquivo(t.files[0]); t.value = ''; return; }
    if (t.id === 'casc-sel') { S.casc = t.value === 'g' ? 'g' : 't'; desenhar(); var bsc = document.getElementById('casc-sel'); if (bsc) bsc.focus({ preventScroll: true }); return; }   /* Seleção do detalhe da cascata (Estatísticas): o foco volta ao seletor depois de desenhar a tela de novo */
    if (d.addpeca) { if (t.value) { var o = U.pega(d.addpeca); o.pecas = o.pecas || {}; o.pecas[t.value] = '1'; mudou(); } return; }
    if (d.colmanual) { F.sistema.coluna = t.value; F.sistema.colManual = !!t.value; F.conf.coluna = !!t.value; F.conf.tipo = false; E.autoColuna(F, D, M); mudou(); return; }
    if (d.tubo) { var p = t.value.split('|'); F.tubo = { norma: p[0], classe: p[1] }; mudou(); return; }
    if (!d.c || (t.tagName !== 'SELECT' && t.type !== 'checkbox')) return;
    U.poe(d.c, t.type === 'checkbox' ? t.checked : (d.num ? +t.value : t.value)); S.tocados[d.c] = 1;
    if (d.c === 'lanc.dn') F.hidrantes.forEach(function (h) { h.mangueiraDN = ''; });
    if (d.c === 'fonte.dnSuc') { F.fonte.dnAuto = false; if (!F.fonte.dnSuc) F.fonte.dnSuc = ''; }   /* 2.5.1: o DN escolhido à mão deixa de seguir a sugestão */
    if (d.c === 'norma') { F.sistema.coluna = ''; F.sistema.colManual = false; F.sistema.tipoManual = ''; F.conf.coluna = false; F.conf.tipo = false; }
    if (d.c === 'norma' || d.c === 'sistema.divisao') { E.autoColuna(F, D, M); F.conf.tipo = false; }
    if (d.c === 'sistema.tipoManual' || d.c === 'sistema.esg4') F.conf.tipo = false;
    if (d.c === 'tipoTubo') { var tpn = E.tipoTubo(D, F.tipoTubo); if (tpn) { F.C = String(tpn.C); F.Cfonte = ''; } E.sincTubo(F, D); }   // 2.5.0: o C vem do tubo (Tabela 1)
    mudou();
  });
  document.addEventListener('focusout', function (ev) {
    var c = ev.target.dataset && ev.target.dataset.c; if (!c || S.tocados[c]) return; S.tocados[c] = 1;
    var i = U.info(c); if (i && i.n === 'vazio') setTimeout(function () { desenhar(true); }, 0);
  });
  /** Renomear nó (etapa Rede): guarda o nome antigo quando o campo do nó recebe o foco; ao sair do campo, a cota (e os dados do hidrante) vai para o nome novo. */
  var ren = null;
  function fechaRen() {
    var r = ren; ren = null; if (!r) return;
    var novo = U.pega(r.c); if (novo === undefined || String(novo).trim() === r.antes) return;
    if (E.renomeiaNo(S.F, r.antes, novo, r.hid)) { mudou(true); U.avisa('Nó ' + r.antes + ' renomeado para ' + String(novo).trim() + ': a cota foi junto.'); }
  }
  document.addEventListener('focusin', function (ev) {
    var cr = (ev.target.dataset && ev.target.dataset.c) || '';
    if (ren && ren.c !== cr) fechaRen();
    if (!ren && /^trechos\.\d+\.(de|para)$/.test(cr)) { var v0 = String(U.pega(cr) || '').trim(), h0 = S.F.hidrantes.filter(function (x) { return x.no === v0; })[0]; if (v0) ren = { c: cr, antes: v0, hid: h0 ? E.clone(h0) : null }; }
  });
  document.addEventListener('focusout', function () { if (ren) setTimeout(function () { var a = document.activeElement; if (ren && !(a && a.dataset && a.dataset.c === ren.c)) fechaRen(); }, 0); });
  document.addEventListener('focusin', function (ev) {
    var m = /^trechos\.(\d+)\./.exec((ev.target.dataset && ev.target.dataset.c) || ''); if (!m || S.sel === +m[1] || S.etapa !== U.POS.rede) return; S.sel = +m[1];
    document.querySelectorAll('tr[data-linha]').forEach(function (tr) { if (+tr.dataset.linha === S.sel) tr.setAttribute('aria-selected', 'true'); else tr.removeAttribute('aria-selected'); });
    var lp = document.getElementById('lado-pecas'), dr = document.getElementById('des-rede'); if (lp) lp.innerHTML = U.painelPecas(); if (dr) dr.innerHTML = U.arvore();
  });
  /** Menu do projeto (MenuProjeto do design system): abre no nome do projeto; setas, Home, End, Enter e Esc; o foco volta ao botão ao fechar. */
  function abreMenu(abrir, foco) {
    S.menu = abrir; U.topo();
    var bt = document.getElementById('menu-projeto-bt');
    if (!abrir) { if (bt && foco !== false) bt.focus({ preventScroll: true }); return; }
    var it = document.querySelector('#menu-projeto [role="menuitem"]:not(:disabled)'); if (it) it.focus({ preventScroll: true });
  }
  /** Gaveta do menu (abaixo de 1024 px) e gaveta ou folha do resumo (F4): dialog nativo; Esc fecha e o foco volta ao botão que abriu (se a tela foi redesenhada, ao botão novo de mesmo data-acao). */
  var gavOrigem = '';
  function abreGaveta(id, origem) {
    var g = document.getElementById(id); if (!g) return;
    if (id === 'gav-lat') U.gavLat(); else U.gavResumo();
    gavOrigem = origem && origem.getAttribute ? origem.getAttribute('data-acao') || '' : '';
    if (!g.open) g.showModal();
    var f = g.querySelector('[data-acao="gav-fechar"]'); if (f && id === 'gav-resumo') f.focus({ preventScroll: true });
  }
  ['gav-lat', 'gav-resumo'].forEach(function (id) {
    var g = document.getElementById(id); if (!g) return;
    g.addEventListener('close', function () {
      g.innerHTML = '';
      setTimeout(function () { var ae = document.activeElement; if ((!ae || ae === document.body) && gavOrigem) { var o = document.querySelector('[data-acao="' + gavOrigem + '"]'); if (o) o.focus({ preventScroll: true }); } }, 0);
    });
  });
  /* mudou o modo de largura (amplo, medio, movel): fecha as gavetas e redesenha a moldura; a barra superior também se ajusta quando a janela muda dentro do mesmo modo */
  U.mqs.forEach(function (m) { m.addEventListener('change', function () { document.querySelectorAll('.fc-gaveta[open]').forEach(function (d) { d.close(); }); desenhar(true); }); });
  var tRz = 0; window.addEventListener('resize', function () { cancelAnimationFrame(tRz); tRz = requestAnimationFrame(function () { U.ajustaTopo(); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { U.ajustaTopo(); });
  document.addEventListener('keydown', function (ev) {
    var k = ev.key.toLowerCase(), t = ev.target, campo = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    var mp = document.getElementById('menu-projeto');
    if (S.menu && mp && ev.key === 'Escape') { ev.preventDefault(); abreMenu(false); return; }
    if (S.menu && mp && ev.key === 'Tab') { ev.preventDefault(); abreMenu(false); return; }
    if (mp && mp.contains(t) && /^(ArrowDown|ArrowUp|Home|End)$/.test(ev.key)) {
      ev.preventDefault(); var its = Array.prototype.slice.call(mp.querySelectorAll('[role="menuitem"]:not(:disabled)')), i = its.indexOf(t);
      i = ev.key === 'Home' ? 0 : ev.key === 'End' ? its.length - 1 : ev.key === 'ArrowDown' ? (i + 1) % its.length : (i - 1 + its.length) % its.length; its[i].focus({ preventScroll: true }); return;
    }
    if (t.id === 'menu-projeto-bt' && ev.key === 'ArrowDown') { ev.preventDefault(); abreMenu(true); return; }
    if (ev.key === 'Escape' && S.ajuda && !document.querySelector('dialog[open]')) { var ca = S.ajuda; S.ajuda = ''; desenhar(); var bc2 = document.querySelector('[data-ajuda="' + ca + '"]'); if (bc2) bc2.focus({ preventScroll: true }); return; }
    if ((ev.ctrlKey || ev.metaKey) && k === 'k') { ev.preventDefault(); abrirBusca(); return; }
    if ((ev.ctrlKey || ev.metaKey) && !campo && S.aberto && (k === 'z' || k === 'y')) { ev.preventDefault(); var f = k === 'z' && !ev.shiftKey ? U.H.desfaz() : U.H.refaz(); if (f) { S.F = f; S.sujo = true; desenhar(); } return; }
    if (t.getAttribute && t.getAttribute('role') === 'radio' && t.closest('.fc-seg') && /^(ArrowRight|ArrowDown|ArrowLeft|ArrowUp)$/.test(ev.key)) {   /* Segmentado (radiogroup): as setas trocam a opção */
      ev.preventDefault(); var rs = Array.prototype.slice.call(t.closest('.fc-seg').querySelectorAll('[role="radio"]')), ir0 = rs.indexOf(t);
      rs[(ir0 + (/^Arrow(Right|Down)$/.test(ev.key) ? 1 : rs.length - 1)) % rs.length].click(); return;
    }
    var m = /^trechos\.(\d+)\./.exec((t.dataset && t.dataset.c) || '');
    if (ev.key === 'Enter' && t.tagName === 'TEXTAREA' && t.dataset.umaLinha) { ev.preventDefault(); return; }
    if (ev.key === 'Enter' && m && t.tagName === 'INPUT' && +m[1] === S.F.trechos.length - 1) { ev.preventDefault(); novaLinha(); }
    if (t.dataset && t.dataset.arrasta !== undefined && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) { ev.preventDefault(); var i0 = +t.dataset.arrasta, j0 = i0 + (ev.key === 'ArrowUp' ? -1 : 1); if (E.move(S.F, i0, j0)) { S.sel = j0; mudou(); var fm = document.querySelector('[data-arrasta="' + j0 + '"]'); if (fm) fm.focus(); U.avisa('Trecho ' + U.nomeTrecho(S.F.trechos[j0]) + ' na posição ' + (j0 + 1) + ' de ' + S.F.trechos.length + '.'); } }
  });
  /* reordenar os trechos arrastando a alça (item 2) */
  var arr = null;
  document.addEventListener('dragstart', function (ev) { var h = ev.target.closest && ev.target.closest('[data-arrasta]'); if (!h) return; arr = +h.dataset.arrasta; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(arr)); } catch (e) { /* navegador sem dados */ } });
  document.addEventListener('dragover', function (ev) { if (S.tela === 'inicio') ev.preventDefault(); else if (arr !== null && ev.target.closest && ev.target.closest('tr[data-linha]')) ev.preventDefault(); });
  document.addEventListener('drop', function (ev) { if (arr === null) return; var tr = ev.target.closest && ev.target.closest('tr[data-linha]'); var i0 = arr; arr = null; if (!tr) return; ev.preventDefault(); var j0 = +tr.dataset.linha; if (E.move(S.F, i0, j0)) { S.sel = j0; mudou(); } });
  document.addEventListener('dragend', function () { arr = null; });
  document.addEventListener('drop', function (ev) { if (S.tela !== 'inicio') return; ev.preventDefault(); var f = ev.dataTransfer.files[0]; if (f) comTrabalho(function () { abrirArquivo(f); }); });
  window.addEventListener('beforeunload', function (ev) { if (S.aberto && S.sujo) { ev.preventDefault(); ev.returnValue = ''; } });

  // ---------- busca rápida (Ctrl+K)
  var bq = document.getElementById('bq'), bqc = document.getElementById('bq-campo'), bql = document.getElementById('bq-lista'), bqSel = 0, bqItens = [];
  var BQG = { 'Etapa': ['Etapas', U.icone('waypoints', 'fc-ic')], 'Módulo': ['Etapas', U.icone('settings', 'fc-ic')], 'Campo': ['Campos', U.icone('pencil', 'fc-ic')], 'Verificação': ['Verificações', U.icone('list-checks', 'fc-ic')], 'Estatística': ['Verificações', U.icone('chart-column', 'fc-ic')], 'Glossário': ['Glossário', U.icone('file-text', 'fc-ic')] };   /* grupo e ícone do tipo (BuscaRapida) */
  function semAcento(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function indice() {
    var l = [];
    U.ETAPAS.forEach(function (e, i) { l.push({ tp: 'Etapa', tx: (i + 1) + ' ' + e, ir: 'etapa:' + (i + 1) }); });
    U.MODULOS.forEach(function (m) { if (m[0] !== 'projeto') l.push({ tp: 'Módulo', tx: m[1], ir: 'tela:' + m[0] }); });
    if (S.aberto) CAMPOS.forEach(function (c) { l.push({ tp: 'Campo', tx: c[0], c: c[1] }); });
    if (S.aberto && S.sit.k === 'ok') U.vers().forEach(function (x) { var v = x.v; if (x.s === 'in') l.push({ tp: 'Estatística', tx: (U.VT[v.id] || v.titulo) + ' (' + v.id + ')', ir: 'tela:estat', ds: U.vir(v.valor) }); else l.push({ tp: 'Verificação', tx: (U.VT[v.id] || v.titulo) + ' (' + v.id + ')', ver: v.id, ds: U.vir(v.valor) }); });
    GLOSS.forEach(function (g) { l.push({ tp: 'Glossário', tx: g[0], ds: g[1] }); });
    return l;
  }
  function listarBusca() {
    var q = semAcento(bqc.value.trim()); bqItens = indice().filter(function (i) { return !q || semAcento(i.tx + ' ' + (i.tp === 'Glossário' ? i.ds : '')).indexOf(q) >= 0; }).slice(0, 14);
    bqSel = Math.min(bqSel, Math.max(0, bqItens.length - 1));
    var ult = '';
    bql.innerHTML = bqItens.length ? bqItens.map(function (i, k) { var g = BQG[i.tp] || ['Outros', U.icone('info', 'fc-ic')], cab = g[0] !== ult ? '<li class="fc-bq__grupo" role="presentation">' + g[0] + '</li>' : ''; ult = g[0]; return cab + '<li class="fc-bq__item" role="option" id="bq-op-' + k + '" data-k="' + k + '" aria-selected="' + (k === bqSel) + '">' + g[1] + '<span>' + esc(i.tx) + (i.ds ? '<small>' + esc(i.ds) + '</small>' : '') + '</span></li>'; }).join('') : '<li class="fc-bq__item" role="option" aria-disabled="true" aria-selected="false"><span><small>Nada encontrado. Tente o nome de uma etapa, de um campo ou de um termo.</small></span></li>';
    /* leitor de tela: o campo aponta a opção marcada, e a opção marcada fica à vista */
    if (bqItens.length) { bqc.setAttribute('aria-activedescendant', 'bq-op-' + bqSel); var op = document.getElementById('bq-op-' + bqSel); if (op && op.scrollIntoView) op.scrollIntoView({ block: 'nearest' }); } else bqc.removeAttribute('aria-activedescendant');
  }
  function abrirBusca() { bqc.value = ''; bqSel = 0; listarBusca(); if (!bq.open) bq.showModal(); bqc.focus(); }
  function escolher(k) {
    var i = bqItens[k]; if (!i) return; if (i.tp === 'Glossário') return;
    bq.close();
    if (i.ir) ir(i.ir); else if (i.c) corrigir(i.c); else if (i.ver) { ir('etapa:' + U.POS.verif); var el = document.getElementById('ver-' + i.ver); if (el) { var dt = el.closest('details'); if (dt) dt.open = true; el.scrollIntoView({ block: 'center' }); el.classList.add('pulso'); } }
  }
  bqc.addEventListener('input', function () { bqSel = 0; listarBusca(); });
  bqc.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { bqSel = Math.min(bqItens.length - 1, bqSel + 1); listarBusca(); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { bqSel = Math.max(0, bqSel - 1); listarBusca(); ev.preventDefault(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); escolher(bqSel); }
  });
  bql.addEventListener('click', function (ev) { var li = ev.target.closest('li[data-k]'); if (li) escolher(+li.dataset.k); });
  bq.addEventListener('click', function (ev) { if (U.veu(ev, bq)) bq.close(); });

  // ---------- início
  S.tema = le(CH.tema) === 'escuro' ? 'escuro' : 'claro'; S.modo = le(CH.modo) === 'personalizado' ? 'personalizado' : 'padrao';
  U.abrirProjeto = function (o) { carrega(E.abrir(o, D, M), 1); };   // usado pelos testes de navegador
  desenhar();
})();
