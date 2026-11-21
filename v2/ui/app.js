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
    ['Comprimento equivalente (Leq)', 'Comprimento de tubo reto que causa a mesma perda de carga de uma peça. Fonte: Azevedo Netto, Tabela 7.6.'],
    ['Reserva técnica de incêndio (RTI)', 'Volume de água guardado só para o combate a incêndio. Fonte: IT 22, Tabela 3.'],
    ['NPSH disponível', 'Energia da água na entrada da bomba, acima da pressão de vapor. Precisa ser maior que o NPSH requerido do catálogo. Fonte: IT 22, 4.8.15.'],
    ['Pressão a vazão nula (shut-off)', 'Pressão que a bomba dá com o registro fechado, sem vazão. Fonte: IT 22, C.1.14.'],
    ['Bomba de pressurização (jockey)', 'Bomba pequena que mantém a rede pressurizada e repõe pequenas perdas, para a bomba principal não partir à toa. Fonte: IT 22, C.1.15.'],
    ['Par mais desfavorável', 'Os dois jatos que, abertos juntos, pedem a maior altura manométrica. Fonte: IT 22, 4.8.3.'],
    ['Nível X', 'Nível da água no reservatório quando só resta a reserva de incêndio. A altura manométrica é contada a partir dele. Fonte: convenção do FireCalc.'],
    ['Fator C', 'Coeficiente de Hazen-Williams, que mede o atrito do tubo: quanto menor, mais perda de carga. Aço galvanizado: 120. Fonte: IT 22, Tabela 1.'],
    ['Perda de carga', 'Pressão que a água gasta para vencer o atrito do tubo e das peças. Calculada pela fórmula de Hazen-Williams. Fonte: IT 22, 4.8.10.2.'],
    ['Pressão dinâmica', 'Pressão na válvula do hidrante com a água correndo. É nela que a pressão mínima da norma é verificada. Fonte: IT 22, 4.8.4.'],
    ['Pressão estática', 'Pressão na válvula com a rede cheia e sem vazão, bomba ligada. Não pode passar de 100 mca. Fonte: IT 22, 4.8.8; no Paraná, NPT 022, 5.7.7.'],
    ['Ponto de trabalho', 'Vazão e altura em que a bomba de fato opera: o encontro da curva da bomba com a curva do sistema. Fonte: Azevedo Netto, Manual de Hidráulica.'],
    ['Dispositivo de recalque', 'Entrada de água na fachada ou no passeio, por onde a viatura dos bombeiros abastece a rede. Fonte: IT 22, 4.3.'],
    ['Ramal de retorno para testes', 'Tubo que leva a água da descarga da bomba de volta ao reservatório, para ensaiar a bomba sem abrir hidrante. Exigido no Paraná. Fonte: NPT 022, 5.10.6.3.']
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
  function telaInicio() {
    var L = listaProj();
    var rec = L.length ? '<div class="cartao grupo" style="margin-top:16px" id="salvos"><div class="gt"><h2 class="t3">Projetos salvos neste navegador</h2></div><div class="rolar"><table><thead><tr><th>Projeto</th><th>Norma</th><th>Etapa</th><th>Última mudança</th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' +
      L.map(function (a, k) { var nome = esc(a.F.ident.obra || 'Projeto sem nome'), et = etapaGuardada(a); return '<tr><td><b>' + nome + '</b>' + (S.aberto && S.F.pid === a.pid ? ' <span class="peq">aberto agora</span>' : '') + '</td><td>' + (a.F.norma && D.normas[a.F.norma] ? esc(D.normas[a.F.norma].nome) : 'a escolher') + '</td><td>' + et + ' de ' + U.ETAPAS.length + ', ' + U.ETAPAS[et - 1] + '</td><td>' + esc(a.quando || '') + '</td><td class="r" style="white-space:nowrap"><button class="bt min' + (k ? '' : ' pri') + '" data-acao="continuar" data-v="' + esc(a.pid) + '" aria-label="Abrir o projeto ' + nome + '">Abrir</button> <button class="bt lig min" data-acao="esquecer" data-v="' + esc(a.pid) + '" aria-label="Tirar o projeto ' + nome + ' da lista">Tirar da lista</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="rodape-tab"><span class="peq">A lista guarda os ' + MAXP + ' projetos mais recentes, só neste navegador. Para não depender dela, baixe o arquivo .json de cada projeto.</span></div></div>' : '';
    return '<div class="cab"><div class="tx"><h1>Início</h1><p>Dimensionamento de hidrantes e mangotinhos em oito etapas, com as verificações da norma e o relatório em planilha.</p></div></div>' +
      '<div class="vazia" id="solta"><svg class="il" viewBox="0 0 96 96" aria-hidden="true"><rect x="14" y="10" width="68" height="76" rx="8" fill="var(--fc-superficie-2)" stroke="var(--fc-borda-campo)" stroke-width="1.5"/><path d="M26 30h32M26 42h44M26 54h20" stroke="var(--fc-borda-campo)" stroke-width="3" stroke-linecap="round"/><circle cx="66" cy="66" r="16" fill="var(--fc-fogo)"/><path d="M66 58v16M58 66h16" stroke="var(--fc-superficie)" stroke-width="3" stroke-linecap="round"/></svg>' +
      '<h2>' + (S.aberto ? 'Começar outro projeto' : 'Nenhum projeto aberto') + '</h2><p>O projeto novo começa em branco. Você preenche uma etapa por vez e a ferramenta mostra o que falta antes de avançar.</p>' +
      '<div class="passos">' + U.ETAPAS.map(function (e, i) { return '<span>' + (i + 1) + ' ' + e.split(' ')[0] + '</span>'; }).join('') + '</div>' +
      '<div class="acoes"><button class="bt pri" data-acao="novo">Novo projeto</button><button class="bt" data-acao="abrir">Abrir projeto (.json)</button>' + (S.aberto ? '<button class="bt" data-ir="etapa:' + S.etapa + '">Voltar ao projeto aberto</button>' : '') + '</div>' +
      '<p class="peq">Ou arraste o arquivo do projeto para esta área. Os casos de exemplo estão na pasta <span class="tec">exemplos</span> do kit. Projetos da versão 1.0.0 abrem sem conversão.</p></div>' + rec +
      '<div class="grade g3" style="margin-top:16px">' +
      '<div class="cartao bloco"><h2 class="t3">Primeira vez aqui?</h2><p class="peq">Cada etapa diz o que falta. A busca rápida (Ctrl K) leva a qualquer etapa, campo ou termo do glossário.</p><button class="bt lig" data-acao="busca" style="margin:8px 0 0 -8px">Abrir a busca</button></div>' +
      '<div class="cartao bloco"><h2 class="t3">Não perca o trabalho</h2><p class="peq">A ferramenta guarda cada projeto neste navegador a cada mudança (lista acima). Para levar o projeto a outro computador, baixe o arquivo .json.</p></div>' +
      '<div class="cartao bloco"><h2 class="t3">Nada sai do seu computador</h2><p class="peq">O projeto fica salvo neste navegador e no arquivo que você baixar. A ferramenta funciona sem internet.</p></div></div>';
  }
  function telaSobre() {
    var fontes = D.fontes.map(function (f) { return '<li>' + esc(typeof f === 'string' ? f : (f.titulo || f.nome || JSON.stringify(f))) + '</li>'; }).join('');
    return '<div class="cab"><div class="tx"><h1>Sobre</h1></div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Versão</h2><p>' + U.VERSAO + '. Base técnica ' + esc(D.versao) + ', gerada em ' + esc(D.gerado) + '.</p></div>' +
      '<div class="cartao bloco" id="sobre-licenca"><h2 class="t3">Licença</h2><p>Copyright (C) 2026 Mateus Beraldi Nobre.</p>' +
      '<p>O FireCalc é software livre, distribuído sob a GNU Affero General Public License, versão 3 (AGPL-3.0-only). Você pode usar, estudar, modificar e redistribuir, inclusive em projeto pago, mantendo os avisos de direito autoral e de licença e entregando o código-fonte de qualquer versão modificada, também a quem a usar por rede.</p>' +
      '<p>Este programa é fornecido sem garantia de qualquer espécie, nos termos da licença.</p>' +
      '<p class="peq">Texto completo da licença: arquivo LICENSE do código-fonte e gnu.org/licenses/agpl-3.0.html. Código-fonte completo de cada versão: github.com/mateusberaldi/firecalc.</p></div>' +
      '<div class="cartao bloco" id="sobre-marca"><h2 class="t3">Nome e logo</h2><p>O nome FireCalc e o logo são reservados ao titular e não fazem parte da licença. Uma versão modificada usa outro nome e outro logo. As regras estão no arquivo MARCA.md do código-fonte.</p></div>' +
      '<div class="cartao bloco"><h2 class="t3">Fontes da verdade técnica</h2><p>Azevedo Netto, Manual de Hidráulica; IT 22/2025 do CBPMESP; NPT 022 do CBMPR; normas da ABNT citadas em cada item; Telmo Brentano. Catálogos de fabricantes são apoio e aparecem com a fonte ao lado do dado.</p><ul class="peq">' + fontes + '</ul></div>' +
      '<div class="cartao bloco" id="sobre-terceiros"><h2 class="t3">Componentes de terceiros</h2><p class="peq">ExcelJS 4.4.0, licença MIT. docx 9.8.1, licença MIT. Os dois trazem dentro JSZip (MIT) e pako (MIT e Zlib); o ExcelJS traz também ieee754 (BSD-3-Clause) e safe-buffer (MIT). Fontes Inter e JetBrains Mono, licença SIL Open Font 1.1. Os catálogos de fabricantes continuam sob os direitos dos seus autores.</p></div>';
  }
  // ---------- desenho geral
  function conteudo() {
    var h;
    if (S.tela === 'inicio') h = telaInicio();
    else if (S.tela === 'sobre') h = telaSobre();
    else if (S.tela === 'estat') h = U.telas.estat();
    else if (S.tela === 'projeto') h = S.aberto ? (U.telas[S.etapa] || U.telas[S.etapa = 1])() : telaInicio();   /* 2.5.3: etapa fora da faixa (lista antiga) abre a 1 */
    else h = U.telas[S.tela]();
    document.getElementById('conteudo').innerHTML = h;
  }
  function desenhar(manterFoco) {
    var a = document.activeElement, id = a && a.id, ini = a && a.selectionStart, fim = a && a.selectionEnd;   // guarda a seleção inteira: campo que recebe o foco pela tecla Tab vem todo selecionado
    U.recalc(); document.documentElement.setAttribute('data-tema', S.tema);
    if (S.sel >= S.F.trechos.length) S.sel = S.F.trechos.length - 1;
    U.lateral(); U.topo(); U.resumo(); conteudo(); U.rodape(); U.falar();
    var h1 = document.querySelector('#conteudo h1'); document.title = (h1 ? h1.textContent + (S.tela === 'projeto' && S.aberto ? ', etapa ' + S.etapa + ' de ' + U.ETAPAS.length : '') + ' | ' : '') + 'FireCalc';
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
  U.avisa = function (tx, ms) { var a = document.getElementById('aviso-proto'); a.textContent = tx; a.hidden = false; clearTimeout(U.avisa.t); U.avisa.t = setTimeout(function () { a.hidden = true; }, ms || 4500); };
  /** 2.5.3: etapa guardada na lista de projetos do navegador. Até a 2.5.2 eram nove etapas (sem a marca etv): da 3 em diante, uma a menos. */
  function etapaGuardada(a) { var n = a.etapa || 1; if (a.etv !== 8 && n >= 3) n -= 1; return Math.min(U.ETAPAS.length, Math.max(1, n)); }
  function carrega(F, etapa) { E.migraF(F, D); if (!F.pid) F.pid = novoPid(); S.F = F; if (F._aviso) { var av = F._aviso; delete F._aviso; setTimeout(function () { U.avisa(av, 12000); }, 0); } S.aberto = true; S.tela = 'projeto'; S.etapa = etapa || 1; S.sel = F.trechos.length ? 0 : -1; S.tocados = {}; S.forcar = {}; S.visit = {}; S.sujo = false; S.origem = 'digitar'; S.hidCurva = ''; U.H = E.Historico(); U.H.guarda(S.F); desenhar(); window.scrollTo(0, 0); }
  function ir(dest) {
    var p = dest.split(':');
    S.ajuda = '';
    if (p[0] === 'tela') { if (p[1] === 'estat' && (!S.aberto || S.sit.k !== 'ok')) { U.avisa('As estatísticas aparecem quando o projeto tiver resultado calculado.'); return; } if (p[1] === 'projeto' && !S.aberto) { U.avisa('Nenhum projeto aberto. Comece um projeto novo ou abra um arquivo.'); S.tela = 'inicio'; } else S.tela = p[1]; }
    else { var n = +p[1]; if (!S.aberto) return; if (!U.aberta(n)) { U.avisa('A etapa ' + U.ETAPAS[n - 1] + ' abre quando as anteriores estiverem completas.'); return; } if (S.tela === 'projeto') S.visit[S.etapa] = 1; S.tela = 'projeto'; S.etapa = n; }
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
    if (etapa === U.POS.abast && S.F.fonte.xModo === 'calc' && S.F.fonte.tip && /^(fonte\.(?!tipo$|tip$)|nos\.(BI|RI)$)/.test(c) && U.abMenu) { U.abMenu(); return; }   /* 2.6.0: o campo está no menu do reservatório */
    if (c === 'fonte.tipo') { var bf = document.getElementById('ab-fonte-inferior'); if (bf) { bf.scrollIntoView({ block: 'center' }); bf.focus(); } return; }
    if (c === 'fonte.tip') { var bt0 = document.querySelector('#ab-tipo .ab-bt'); if (bt0) { bt0.scrollIntoView({ block: 'center' }); bt0.focus(); } return; }
    if (/\.redP$/.test(c) && S.etapa === U.POS.hidr && U.dialogoRedutora) U.dialogoRedutora();   /* 2.6.0: a regulagem fica no menu da válvula redutora */
    if (/^(C|Cfonte|tabelaLeq|tipoTubo)$/.test(c) && S.etapa === U.POS.rede && U.dialogoTubo) U.dialogoTubo('p');   /* 2.5.2: o fator C fica no menu do tubo */
    var el = document.getElementById(U.idDe(c)); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); if (el.select) el.select(); el.classList.add('pulso'); }
  }
  function comTrabalho(fn) {
    if (!S.aberto || !S.sujo) { fn(); return; }
    dialogo('Há trabalho que ainda não foi baixado', 'O projeto "' + (S.F.ident.obra || 'sem nome') + '" tem mudanças que só estão na cópia deste navegador.', [['Baixar e continuar', function () { U.baixaJson(); fn(); }, true], ['Continuar sem baixar', fn], ['Cancelar', function () {}]]);
  }
  U.dialogo = dialogo;
  function dialogo(titulo, corpo, botoes) {
    var d = document.getElementById('dlg'); d.dataset.modo = ''; d.onchange = null; d.oninput = null; d.onclose = null; d.removeAttribute('aria-labelledby'); d.innerHTML = '<h2 style="margin-bottom:8px">' + esc(titulo) + '</h2><div>' + corpo + '</div><div class="linha-ac" style="margin-top:16px">' + botoes.map(function (b, k) { return '<button class="bt' + (b[2] ? ' pri' : '') + '" data-dlg="' + k + '">' + esc(b[0]) + '</button>'; }).join('') + '</div>';
    d.onclick = function (ev) { var b = ev.target.closest('[data-dlg]'); if (!b) return; var f = botoes[+b.dataset.dlg][1], r = f(); if (r !== false) d.close(); };
    if (!d.open) d.showModal();
  }
  /** 2.6.0: aviso que pede a confirmação do tipo; com "Sim" o projeto guarda a confirmação e segue para a etapa seguinte. */
  function pedeTipo() {
    var n = S.etapa;
    dialogo('Confirmar o tipo de sistema', U.corpoConfirmaTipo(), [['Sim', function () { S.F.conf.tipo = true; mudou(); ir('etapa:' + (n + 1)); }, true], ['Não', function () {}]]);
  }
  function abrirArquivo(f) {
    var r = new FileReader();
    r.onload = function () { try { var o = JSON.parse(r.result); if (!o.trechos && !o.norma && !o.identificacao) throw new Error('o arquivo não é um projeto do FireCalc'); carrega(E.abrir(o, D, M), 1); guardaProjeto(); S.etapa = primeiraPendente(); desenhar(); var mg = S.F.migracao; delete S.F.migracao; if (mg) dialogo('Projeto de uma versão anterior', '<p class="peq">O arquivo abriu sem perder dado. O que mudou na 2.5.0:</p><ul class="peq">' + mg.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', [['Entendi', function () {}, true]]); else U.avisa('Projeto aberto: ' + (S.F.ident.obra || f.name)); } catch (e) { U.avisa('Arquivo inválido: ' + e.message); } };
    r.readAsText(f);
  }
  function primeiraPendente() { for (var n = 1; n < U.POS.rel; n++) if (!S.et[n - 1].completa) return U.aberta(n) ? n : Math.max(1, n - 1); return U.POS.rel; }
  function novaLinha() { var u = S.F.trechos[S.F.trechos.length - 1]; S.F.trechos.push({ de: u ? String(u.de).trim() : 'RI', para: '', dn: u ? u.dn : 65, L: '', pecas: {}, _o: {} }); var i = S.F.trechos.length - 1; S.sel = i; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); mudou(); var f = document.getElementById(U.idDe('trechos.' + i + '.para')); if (f) f.focus(); }
  // ---------- eventos
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-ir],[data-acao],[data-corrigir],[data-sel],[data-dup],[data-exc],[data-rolar],[data-tirapeca],[data-pecas],[data-tubo],[data-ajuda]');
    if (S.ajuda && !ev.target.closest('.cmp-ajuda')) { S.ajuda = ''; desenhar(true); }
    if (!t || t.disabled) return;
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
    else if (d.acao === 'tema') { S.tema = S.tema === 'claro' ? 'escuro' : 'claro'; guarda(CH.tema, S.tema); desenhar(); }
    else if (d.acao === 'modo') { S.modo = S.modo === 'padrao' ? 'personalizado' : 'padrao'; guarda(CH.modo, S.modo); desenhar(); U.avisa(S.modo === 'padrao' ? 'Modo padrão: as etapas abrem em ordem.' : 'Modo personalizado: todas as etapas abertas.'); }
    else if (d.acao === 'busca') abrirBusca();
    else if (d.acao === 'novo') comTrabalho(function () { var F0 = E.novo(); U.aplicaCfg(F0); carrega(F0, 1); });
    else if (d.acao === 'abrir') comTrabalho(function () { document.getElementById('arq').click(); });
    else if (d.acao === 'continuar') comTrabalho(function () { var a = listaProj().filter(function (x) { return x.pid === d.v; })[0]; if (!a) { U.avisa('Este projeto não está mais na lista deste navegador.'); desenhar(); return; } try { if (!a.F.bombasUsuario) a.F.bombasUsuario = []; a.F.trechos.forEach(function (t) { if (t.C === undefined) t.C = ''; }); carrega(a.F, etapaGuardada(a)); if (!U.aberta(S.etapa)) { S.etapa = primeiraPendente(); desenhar(); } S.sujo = true; } catch (e) { U.avisa('A cópia deste navegador não pôde ser lida.'); } });
    else if (d.acao === 'esquecer') dialogo('Tirar o projeto da lista', 'O projeto sai da lista deste navegador. Se você não baixou o arquivo .json, ele se perde.', [['Tirar da lista', function () { guarda(CH.lista, JSON.stringify(listaProj().filter(function (x) { return x.pid !== d.v; }))); try { localStorage.removeItem(CH.auto); } catch (e) { /* sem armazenamento */ } desenhar(); }, true], ['Cancelar', function () {}]]);
    else if (d.acao === 'salvar') U.baixaJson();
    else if (d.acao === 'xlsx') U.baixaXlsx();
    else if (d.acao === 'docx') U.baixaDocx();
    else if (d.acao === 'desfazer' || d.acao === 'refazer') { var f = d.acao === 'desfazer' ? U.H.desfaz() : U.H.refaz(); if (f) { S.F = f; S.sujo = true; desenhar(); } }
    else if (d.acao === 'proximo') { var n = S.etapa; if (!U.aberta(n + 1) && n === U.POS.edif && U.soTipo()) pedeTipo(); else if (U.aberta(n + 1)) { if (n === U.POS.abast && E.criaSuccao(F, D, M)) { S.sel = 0; mudou(); } ir('etapa:' + (n + 1)); } else { S.forcar[n] = 1; var pr = S.sit.campos.filter(function (x) { return x.etapa === n && x.n !== 'alerta'; })[0]; if (pr) corrigir(pr.c); else if (n === U.POS.rede && S.sit.av.length) corrigir('trechos.' + S.sit.av[0].i + '.' + S.sit.av[0].campo); else desenhar(); U.avisa('Falta: ' + S.et[n - 1].falta + '.'); } }
    else if (d.acao === 'coluna') { F.sistema.coluna = d.v; F.sistema.colManual = false; F.sistema.tipoManual = ''; F.conf.coluna = true; F.conf.tipo = false; mudou(); }
    else if (d.acao === 'alterar') U.dialogoSistema();
    else if (d.acao === 'tipotabela') { F.sistema.tipoManual = ''; F.conf.tipo = false; mudou(); }
    else if (d.acao === 'colauto') { F.sistema.colManual = false; F.sistema.coluna = ''; E.autoColuna(F, D, M); mudou(); }
    else if (d.acao === 'casc') { S.casc = d.v; desenhar(); }
    else if (d.acao === 'conferir') { var CF = F.conferidos || (F.conferidos = {}); if (CF[d.v] !== undefined) delete CF[d.v]; else CF[d.v] = d.s; mudou(); var bc = document.getElementById('conf-' + d.v); if (bc) bc.focus({ preventScroll: true }); }   /* 2.5.4 */   /* 2.5.3: cascata trecho a trecho ou agrupada */
    else if (d.acao === 'bomba') { F.bomba.id = d.v; mudou(); }
    else if (d.acao === 'jockey') { F.jockey.id = d.v; mudou(); }   /* 2.6.0: escolher ou tirar a bomba de pressurização pela lista */
    else if (d.acao === 'fonte' || d.acao === 'tip') U.abTroca(d.acao, d.v);   /* 2.6.0: fonte de pressão e tipo do reservatório */
    else if (d.acao === 'abmenu') { if (F.fonte.tip && U.abMenu) U.abMenu(); else ir('etapa:' + U.POS.abast); }   /* 2.6.0: a cota de RI e BI na Rede abre o menu do Abastecimento */
    else if (d.acao === 'xmodo') {   /* 2.5.1: nível X calculado ou informado à mão */
      var fx = F.fonte;
      if (d.v === 'manual') { var rx = V.nivelX(F); fx.xModo = 'manual'; fx.xOrigem = ''; fx.zXAnt = ''; if (rx.ok && !rx.bomba && rx.hProp > 0) F.nos.RI = E.txt(rx.X); else if (V.vazio(F.nos.RI)) F.nos.RI = fx.zFundo;   /* 2.6.0: na taça seca e na torre, à mão vale a referência, sem a carga própria */ U.avisa('Nível X e reserva agora são digitados.'); }
      else { fx.zXAnt = fx.modo === 'bomba' ? fx.zX : ''; fx.xModo = 'calc'; fx.xOrigem = ''; fx.zXFonte = ''; U.avisa('Nível X calculado pelos dados do reservatório. Informe a saída do reservatório, a cota do fundo, o DN e as medidas.'); }
      mudou(); var hx = document.querySelector('#conteudo h1'); if (hx) { hx.setAttribute('tabindex', '-1'); hx.focus({ preventScroll: true }); }
    }
    else if (d.acao === 'primeiro') { F.trechos.push(E.primeiroTrecho(F, D, M)); S.sel = 0; mudou(); var f0 = document.getElementById(U.idDe('trechos.0.L')); if (f0) f0.focus(); }
    else if (d.acao === 'linha') novaLinha();
    else if (d.acao === 'maiscota') { F.cotasExtras.push({ nome: '', z: '' }); mudou(); }
    else if (d.acao === 'tiracota') { F.cotasExtras.splice(+d.v, 1); mudou(); }
    else if (d.acao === 'tiralista') { F.cotasExtras = []; mudou(); U.avisa('Lista de pavimentos sem hidrante retirada. Os pontos da rede continuam conferidos.'); }
    else if (d.acao === 'maisred') { var sr = document.getElementById('red-ponto'), pr0 = sr && sr.value ? U.pegaObj(sr.value) : null; if (pr0) { pr0.red = true; mudou(); if (U.refazDlg) U.refazDlg(); var fr = document.getElementById(U.idDe(sr.value + '.redP')); if (fr) fr.focus(); } }
    else if (d.acao === 'lancoficial') { var esg0 = F.lanc.esg; F.lanc = E.lancNovo(); F.lanc.esg = esg0; F.hidrantes.forEach(function (h) { h.mangueiraDN = ''; if (!V.vazio(h.Lmang)) h.Lmang = '30'; }); mudou(); U.avisa('Dados do esguicho e da mangueira de volta aos valores da tabela oficial.'); }
    else if (d.acao === 'tirared') { var pr1 = U.pegaObj(d.v); if (pr1) { pr1.red = false; pr1.redP = ''; pr1.redFonte = ''; mudou(); if (U.refazDlg) U.refazDlg(); var fd = document.querySelector('#dlg #red-tab input') || document.getElementById('red-ponto'); if (fd && document.getElementById('dlg').open) fd.focus(); } }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target, c = t.dataset && t.dataset.c; if (!c || t.tagName !== 'INPUT' || t.type === 'checkbox') return;
    U.poe(c, t.value); if (c === 'fonte.pocoProf') S.F.fonte.pocoProfAuto = false; if (c === 'fonte.pocoLado') S.F.fonte.pocoLadoAuto = false; if (c === 'sistema.carga') E.autoColuna(S.F, D, M);
    if (c === 'sistema.area' || c === 'sistema.carga') S.F.conf.tipo = false;   /* 2.6.0: mudou a área ou a carga, o tipo é confirmado de novo */
    if (/^lanc\./.test(c)) { var lc = S.F.lanc; lc.tocou = true; if (c === 'lanc.Pe') lc.PeAuto = String(t.value).trim() === ''; if (c === 'lanc.L' && V.num(t.value) > 0) S.F.hidrantes.forEach(function (h) { h.Lmang = t.value; }); } var m = /^trechos\.(\d+)\./.exec(c); if (m) S.sel = +m[1];
    mudou(true);
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target, d = t.dataset || {}, F = S.F;
    if (t.id === 'arq') { if (t.files[0]) abrirArquivo(t.files[0]); t.value = ''; return; }
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
    document.querySelectorAll('tr[data-linha]').forEach(function (tr) { tr.classList.toggle('sel', +tr.dataset.linha === S.sel); });
    var lp = document.getElementById('lado-pecas'), dr = document.getElementById('des-rede'); if (lp) lp.innerHTML = U.painelPecas(); if (dr) dr.innerHTML = U.arvore();
  });
  document.addEventListener('keydown', function (ev) {
    var k = ev.key.toLowerCase(), t = ev.target, campo = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    if (ev.key === 'Escape' && S.ajuda && !document.querySelector('dialog[open]')) { var ca = S.ajuda; S.ajuda = ''; desenhar(); var bc2 = document.querySelector('[data-ajuda="' + ca + '"]'); if (bc2) bc2.focus({ preventScroll: true }); return; }
    if ((ev.ctrlKey || ev.metaKey) && k === 'k') { ev.preventDefault(); abrirBusca(); return; }
    if ((ev.ctrlKey || ev.metaKey) && !campo && S.aberto && (k === 'z' || k === 'y')) { ev.preventDefault(); var f = k === 'z' && !ev.shiftKey ? U.H.desfaz() : U.H.refaz(); if (f) { S.F = f; S.sujo = true; desenhar(); } return; }
    var m = /^trechos\.(\d+)\./.exec((t.dataset && t.dataset.c) || '');
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
    bql.innerHTML = bqItens.length ? bqItens.map(function (i, k) { return '<li role="option" id="bq-op-' + k + '" data-k="' + k + '" aria-selected="' + (k === bqSel) + '"><span class="tp">' + i.tp + '</span><span>' + esc(i.tx) + (i.ds ? '<div class="ds">' + esc(i.ds) + '</div>' : '') + '</span></li>'; }).join('') : '<li role="option" aria-disabled="true" aria-selected="false"><span class="ds">Nada encontrado. Tente o nome de uma etapa, de um campo ou de um termo.</span></li>';
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
  bq.addEventListener('click', function (ev) { if (ev.target === bq) bq.close(); });

  // ---------- início
  S.tema = le(CH.tema) === 'escuro' ? 'escuro' : 'claro'; S.modo = le(CH.modo) === 'personalizado' ? 'personalizado' : 'padrao';
  U.abrirProjeto = function (o) { carrega(E.abrir(o, D, M), 1); };   // usado pelos testes de navegador
  desenhar();
})();
