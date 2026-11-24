/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, componentes e moldura: estado da tela, campo com rótulo e mensagem, pílula, cartão de indicador,
 * barra lateral, topo, resumo em cartões e rodapé do assistente. As telas ficam em ui/telas/*.js e se registram em U.telas. */
(function () {
  'use strict';
  var D = FIREDADOS, M = FireMotor, E = FireEstado, V = FireValida, FT = FireFormato, fmt = FT.fmt, esc = FT.esc, vir = FT.vir;
  D.bombasBase = D.bombas.slice();
  var U = window.FireUI = { D: D, M: M, E: E, V: V, fmt: fmt, esc: esc, vir: vir, telas: {}, VERSAO: 'FireCalc 2.8.0' };
  /** Ícones Lucide (ISC) do sprite embutido no HTML pelo build (v2/ui/ds/icones). Mesmo contrato de antes: cada ícone é uma string SVG. */
  U.icone = function (nome, cls) { return '<svg class="ic-lu' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#ic-' + nome + '"/></svg>'; };
  /** Botão X do cabeçalho de uma Janela (README de Janela): aria-label "Fechar", alvo de 36 px (fc-bt--icone). Atributo próprio, data-dlg-fechar, para o [data-fechar] do pé continuar único por janela. */
  U.xFechar = function () { return '<button type="button" class="fc-bt fc-bt--icone fc-bt--disc" data-dlg-fechar aria-label="Fechar">' + U.icone('x', 'fc-ic') + '</button>'; };
  var IC = U.IC = { ok: U.icone('circle-check'), er: U.icone('circle-x'), al: U.icone('triangle-alert'), in: U.icone('info'), cad: U.icone('lock').replace('<svg', '<svg width="12" height="12"') };
  var PAL = { ok: ['p-ok', 'Atende'], er: ['p-er', 'Não atende'], al: ['p-al', 'Conferir'], in: ['p-in', 'Informação'] };
  U.ETAPAS = ['Identificação', 'Edificação e sistema', 'Abastecimento', 'Rede', 'Hidrantes', 'Bomba e automação', 'Verificações', 'Relatório'];
  U.POS = V.POS;   // 2.5.1: posição de cada etapa (Abastecimento antes da Rede)
  U.MODULOS = [['inicio', 'Início'], ['projeto', 'Projeto'], ['cadastros', 'Cadastros'], ['config', 'Configurações'], ['ajuda', 'Ajuda'], ['sobre', 'Sobre']];
  var S = U.S = { F: E.novo(), aberto: false, tela: 'inicio', etapa: 1, sel: -1, tema: 'claro', modo: 'padrao', tocados: {}, forcar: {}, visit: {}, sit: null, et: null, sujo: false, ajuda: '', menu: false };
  U.H = E.Historico();
  /** Modo de largura (F4): 'amplo' (1280 px ou mais: três colunas), 'medio' (1024 a 1279 px: barra lateral, faixa do resumo e gaveta) e 'movel' (abaixo de 1024 px: menu da barra lateral
   *  em gaveta, nome do projeto em linha própria, faixa da etapa e folha do resumo). Os limites são os mesmos das regras @media do ui.css. */
  var MQ_MEDIO = window.matchMedia('(max-width:1279px)'), MQ_MOVEL = window.matchMedia('(max-width:1023px)');
  U.mqs = [MQ_MEDIO, MQ_MOVEL];
  U.modo = function () { return MQ_MOVEL.matches ? 'movel' : MQ_MEDIO.matches ? 'medio' : 'amplo'; };

  // ---- estado
  U.recalc = function () { S.sit = E.avalia(S.F, D, M); S.et = V.etapas(S.F, S.sit); };
  U.pega = function (c) { var o = S.F, p = c.split('.'); for (var i = 0; i < p.length && o !== undefined && o !== null; i++) o = o[p[i]]; return o; };
  U.poe = function (c, v) { var o = S.F, p = c.split('.'); for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] === undefined) o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = v; };
  U.idDe = function (c) { return 'f-' + c.replace(/[^A-Za-z0-9]/g, '-'); };
  U.info = function (c) { return S.sit.campos.filter(function (x) { return x.c === c; })[0] || null; };
  /** Mensagem do campo: erro e alerta sempre; campo vazio só depois que perdeu o foco ou que o usuário apertou "Próximo". */
  U.msg = function (c, etapa) { var i = U.info(c); if (!i) return null; if (i.n === 'vazio' && !S.tocados[c] && !S.forcar[etapa || i.etapa]) return null; return i; };
  U.pilula = function (s, txt) { var p = PAL[s]; return '<span class="fc-selo fc-selo--' + s + '">' + IC[s].replace('class="ic-lu', 'class="ic-lu fc-ic') + (txt || p[1]) + '</span>'; };
  function attrMsg(c, m) { return m && m.n !== 'alerta' ? ' aria-invalid="true" aria-describedby="' + U.idDe(c) + '-m"' : (m ? ' aria-describedby="' + U.idDe(c) + '-m"' : ''); }
  /** Anúncio uma vez só (correção da validação F5 a F7): desenhar() reescreve todo o #conteudo a cada tecla, e um role="alert" recém-inserido é lido de novo a cada inserção.
   *  U.novo(chave) diz se a chave (erro de campo ou aviso de erro, com a mensagem) é nova: não foi vista no desenho anterior nem neste. O erro que continua na tela nos desenhos
   *  seguintes volta como texto comum (aria-describedby e aria-invalid ficam); se some e reaparece, ou se a etapa é aberta de novo, vale como novo. */
  var vistoAnt = {}, vistoAgora = {};
  U.novo = function (chave) { var visto = vistoAnt[chave] || vistoAgora[chave]; vistoAgora[chave] = 1; return !visto; };
  U.viuTudo = function () { vistoAnt = vistoAgora; vistoAgora = {}; };
  /** Mensagem do campo (F5): erro com ícone e role="alert" só quando recém-aparecido (fc-campo__erro); alerta como linha de referência com o ícone triangle-alert na cor de alerta (fc-campo__ref),
   *  sem o prefixo "Conferir: " (o ícone vai como imagem com nome "Conferir", que o leitor de tela diz; não entra no texto da tela). */
  function htmlMsg(c, m) { return m ? (m.n === 'alerta' ? '<span class="fc-campo__ref fc-campo__conferir" id="' + U.idDe(c) + '-m"><span class="fc-campo__ic" role="img" aria-label="Conferir">' + U.icone('triangle-alert', 'fc-ic') + '</span>' + esc(m.msg) + '</span>' : '<span class="fc-campo__erro"' + (U.novo('c:' + c + '|' + m.msg) ? ' role="alert"' : '') + ' id="' + U.idDe(c) + '-m">' + U.icone('circle-x', 'fc-ic') + esc(m.msg) + '</span>') : ''; }
  /** Caixa do campo (Campo do design system): a unidade fica dentro da caixa; num = largura do número (176 px). */
  function caixa(inner, o) { return '<span class="fc-entrada' + (o.num ? ' fc-entrada--num' : '') + (o.area ? ' fc-entrada--area' : '') + '">' + inner + (o.un ? '<span class="fc-entrada__un">' + o.un + '</span>' : '') + '</span>'; }
  /** Campo de texto com rótulo, unidade, exemplo e mensagem. o = {un, ex, aj, larga, num} */
  U.attrMsg = attrMsg; U.htmlMsg = htmlMsg; U.caixa = caixa;
  /** Área de uma linha lógica (nome da obra): a altura acompanha o texto, nada fica escondido. */
  U.ajustaLinhas = function () { Array.prototype.forEach.call(document.querySelectorAll('textarea[data-uma-linha]'), function (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }); };
  U.campo = function (c, rot, o) {
    o = o || {}; var m = U.msg(c), v = U.pega(c);
    if (o.uma) return '<label class="fc-campo' + (o.larga ? ' larga' : '') + (m && m.n !== 'alerta' ? ' fc-campo--erro' : '') + '"><span class="fc-campo__rot">' + rot + '</span>' + caixa('<textarea rows="1" data-uma-linha="1" id="' + U.idDe(c) + '" data-c="' + c + '"' + (o.ex ? ' placeholder="' + esc(o.ex) + '"' : '') + attrMsg(c, m) + ' autocomplete="off">' + esc(v) + '</textarea>', { area: true }).replace('fc-entrada--area', 'fc-entrada--area fc-entrada--uma') + htmlMsg(c, m) + (o.aj ? '<span class="fc-campo__ref">' + o.aj + '</span>' : '') + '</label>';   /* texto livre de uma linha lógica que pode passar da caixa (nome longo da obra): área que cresce, sem quebra de linha digitada */
    return '<label class="fc-campo' + (o.larga ? ' larga' : '') + (m && m.n !== 'alerta' ? ' fc-campo--erro' : '') + '"><span class="fc-campo__rot">' + rot + '</span>' + caixa('<input' + (o.cls ? ' class="' + o.cls + '"' : '') + ' id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(v) + '"' + (o.ex ? ' placeholder="' + esc(o.ex) + '"' : '') + (o.num ? ' inputmode="decimal"' : '') + attrMsg(c, m) + ' autocomplete="off">', o) + htmlMsg(c, m) + (o.aj ? '<span class="fc-campo__ref">' + o.aj + '</span>' : '') + '</label>';
  };
  /** 2.6.0: "?" de ajuda. O botão fica fora do rótulo (um botão dentro do label confunde o leitor de tela); o balão abre por clique ou toque,
   *  fecha com Esc ou ao clicar fora, e fica aberto enquanto a tela é redesenhada (S.ajuda guarda qual está aberto). F5: o botão é o fc-ajuda (ícone circle-help) e o balão tem a forma da Dica larga. */
  U.textoAjuda = function (chave) {
    var m = String(S.F.ident.municipio || '').trim() || '[município]';
    return chave === 'altitude' ? 'Altura do município acima do nível do mar, em metros. Define a pressão atmosférica do NPSH disponível. Busque: Altitude de ' + esc(m) + ' em relação ao nível do mar.'
      : 'Temperatura da água do reservatório, em °C. Define a pressão de vapor do NPSH disponível. Busque: Temperatura da água em ' + esc(m) + ' NPSH.';
  };
  U.campoAjuda = function (c, rot, o, chave) {
    var id = 'ajuda-' + chave, ab = S.ajuda === chave;
    return '<div class="fc-campo-ajuda">' + U.campo(c, rot, o) + '<button type="button" class="fc-ajuda" data-ajuda="' + chave + '" aria-expanded="' + ab + '" aria-controls="' + id + '" aria-label="O que é ' + esc(rot.toLowerCase()) + '">' + U.icone('circle-help', 'fc-ic') + '</button>' +
      '<div class="fc-dica fc-dica--larga bal" id="' + id + '" role="note"' + (ab ? '' : ' hidden') + '>' + U.textoAjuda(chave) + '</div></div>';
  };
  /** Célula de tabela com campo de texto. */
  U.celula = function (c, rotAria, cls) { var m = U.msg(c); return '<td>' + caixa('<input' + (cls ? ' class="' + cls + '"' : '') + ' id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(U.pega(c)) + '" aria-label="' + esc(rotAria) + '"' + attrMsg(c, m) + ' autocomplete="off">', {}) + htmlMsg(c, m) + '</td>'; };
  /** Campo de escolha (Selecao). ops = [[valor, rótulo]]; o = {aj, larga, num (guarda número), vazio (rótulo da opção vazia), aria} */
  U.escolha = function (c, rot, ops, o) {
    o = o || {}; var m = U.msg(c), v = U.pega(c), longo = ops.some(function (x) { return String(x[1]).length > 22; }) || String(o.vazio || '').length > 22;   /* nome longo de opção: a seleção ocupa a coluna inteira (o design system fixa 240 px para nomes curtos) */
    var h = '<span class="fc-sel' + (longo ? ' fc-sel--larga' : '') + '">' + caixa('<select' + (o.cls ? ' class="' + o.cls + '"' : '') + ' id="' + U.idDe(c) + '" data-c="' + c + '"' + (o.num ? ' data-num="1"' : '') + attrMsg(c, m) + (rot ? '' : ' aria-label="' + esc(o.aria || '') + '"') + '>' + (o.vazio ? '<option value="">' + esc(o.vazio) + '</option>' : '') +
      ops.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(v) === String(x[0]) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>', {}) + U.icone('chevron-down', 'fc-ic') + '</span>' + htmlMsg(c, m);
    return rot ? '<label class="fc-campo' + (o.larga ? ' larga' : '') + (m && m.n !== 'alerta' ? ' fc-campo--erro' : '') + '"><span class="fc-campo__rot">' + rot + '</span>' + h + (o.aj ? '<span class="fc-campo__ref">' + o.aj + '</span>' : '') + '</label>' : h;
  };
  /** Caixa de marcar: sem peça no design system (L2); composta em ui.css só com tokens. */
  U.marcar = function (c, texto) { return '<label class="marcar"><input type="checkbox" id="' + U.idDe(c) + '" data-c="' + c + '"' + (U.pega(c) ? ' checked' : '') + '><span>' + texto + '</span></label>'; };
  /** acoes (FC-073, opcional): botões do Aviso à direita, em fc-bt de 36 px: [[rótulo, atributos prontos]]. */
  U.aviso = function (tipo, html, acoes) { var t = tipo === 'er' ? 'er' : tipo === 'al' ? 'al' : 'in'; return '<div class="fc-aviso fc-aviso--' + t + (acoes && acoes.length ? ' fc-aviso--acoes' : '') + '" role="' + (t === 'er' && U.novo('a:' + html) ? 'alert' : 'status') + '">' + IC[t].replace('class="ic-lu', 'class="ic-lu fc-ic') + '<div class="fc-aviso__tx">' + html + '</div>' + (acoes || []).map(function (a) { return '<button type="button" class="fc-bt" ' + a[1] + '>' + a[0] + '</button>'; }).join('') + '</div>'; };
  /** Cabeçalho da tela (CabEtapa do design system): "Etapa N de 8" em rótulo e o nome em título de página; nada de parágrafo abaixo do título. */
  U.cab = function (n, titulo) { return '<div class="fc-cab-etapa">' + (n ? '<span class="fc-ind__rot">Etapa ' + n + ' de ' + U.ETAPAS.length + '</span>' : '') + '<h1>' + titulo + '</h1></div>'; };
  /** Cartão do design system (FC-042, bloco F10 a F14): cabeçalho com título (h2) e, à direita, um selo ou botão discreto; corpo; pé opcional para as ações do cartão.
   *  o: id, cls (classes extras), attrs (atributos prontos, ex.: aria-live), tag ('div' por padrão), tid (id do título), extra (HTML à direita do título), pe (HTML do pé). O título e o corpo chegam prontos (quem chama passa os dados do usuário por esc()). */
  U.cartaoAbre = function (titulo, o) {
    o = o || {}; var tag = o.tag || 'div';
    return '<' + tag + ' class="fc-cartao' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + (o.attrs ? ' ' + o.attrs : '') + '><div class="fc-cartao__cab"><h2 class="t3"' + (o.tid ? ' id="' + o.tid + '"' : '') + '>' + titulo + '</h2>' + (o.extra || '') + '</div><div class="fc-cartao__corpo">';
  };
  U.cartaoFim = function (pe, tag) { return '</div>' + (pe ? '<div class="fc-cartao__pe">' + pe + '</div>' : '') + '</' + (tag || 'div') + '>'; };
  U.cartao = function (titulo, corpo, o) { o = o || {}; return U.cartaoAbre(titulo, o) + corpo + U.cartaoFim(o.pe, o.tag); };
  U.norma = function () { return D.normas[S.F.norma]; };
  U.tipoObj = function () { var id = E.tipoFinal(S.F, D, M), N = U.norma(); return id && N ? N.tipos.filter(function (t) { return t.id === id; })[0] : null; };
  U.dns = function () { return E.dnsDoTipo(D, S.F.tipoTubo); };   // 2.5.0: DN do tipo de tubo do projeto
  U.leq = function (id, dn) { var p = D.leq[S.F.tabelaLeq].pecas[id]; return p && p.dn[String(dn)] !== undefined && p.dn[String(dn)] !== null ? p.dn[String(dn)] : NaN; };
  U.nomePeca = function (id) { var p = D.leq[S.F.tabelaLeq].pecas[id]; return p ? p.nome : id; };
  /** Editor de peças de um trecho (etapa Rede, recalque e ramal de retorno). base = caminho do objeto que tem dn e pecas. */
  U.pecasEd = function (base) {
    var t = U.pega(base), h = '<ul class="pecas">', soma = 0, falta = false, ids = Object.keys(t.pecas || {});
    ids.forEach(function (id) {
      var c = base + '.pecas.' + id, m = U.msg(c), q = parseInt(t.pecas[id], 10), l = U.leq(id, t.dn); if (isNaN(l)) falta = true; else if (q > 0) soma += q * l;
      h += '<li><span class="fc-entrada"><input id="' + U.idDe(c) + '" data-c="' + esc(c) + '" value="' + esc(t.pecas[id]) + '" inputmode="numeric" aria-label="Quantidade de ' + esc(U.nomePeca(id)) + '"' + attrMsg(c, m) + '></span><span class="nm">' + esc(U.nomePeca(id)) + htmlMsg(c, m) + '</span><span class="tec">' + (isNaN(l) ? 'sem dado para DN' + esc(t.dn) : fmt((q > 0 ? q : 0) * l, 1) + ' m') + '</span><button class="fc-bt fc-bt--disc fc-bt--p" data-tirapeca="' + esc(c) + '" aria-label="Tirar ' + esc(U.nomePeca(id)) + '">tirar</button></li>';
    });
    if (!ids.length) h += '<li><span class="nm peq">Nenhuma peça lançada.</span></li>';
    var ops = Object.keys(D.leq[S.F.tabelaLeq].pecas).filter(function (id) { return ids.indexOf(id) < 0; });
    h += '</ul><span class="fc-sel"><span class="fc-entrada"><select data-addpeca="' + base + '" aria-label="Adicionar peça" style="margin:10px 0;width:100%"><option value="">Adicionar peça...</option>' + ops.map(function (id) { return '<option value="' + esc(id) + '">' + esc(U.nomePeca(id)) + '</option>'; }).join('') + '</select></span>' + U.icone('chevron-down', 'fc-ic') + '</span>';
    return { html: h, soma: falta ? NaN : soma };
  };

  // ---- moldura
  /** No modo padrão a etapa só abre com as anteriores completas. A etapa Verificações abre quando há resultado (etapas 1 a 5 completas)
   *  e a etapa Relatório abre, com ressalva, mesmo com verificação não atendida. */
  U.aberta = function (n) {
    if (S.modo === 'personalizado' || n === 1) return true;
    var ate = n === U.POS.verif ? U.POS.hidr : n === U.POS.rel ? U.POS.bomba : n - 1;   // 2.5.3: posições por U.POS
    for (var k = 0; k < ate; k++) if (!S.et[k].completa) return false;
    return n < U.POS.verif || S.sit.k === 'ok';
  };
  /** Barra lateral (Etapas do design system): Início no topo, as oito etapas com estado e barra de progresso, e no pé Estatísticas, Cadastros, Configurações, Ajuda e Sobre. */
  function itemApp(id, nome, icone, extra) {
    return '<button type="button" class="fc-etapa fc-etapa--app" data-ir="tela:' + id + '"' + (S.tela === id ? ' aria-current="page"' : '') + (extra || '') + '>' + icone + '<span class="fc-etapa__t">' + nome + '</span></button>';
  }
  /** Marcação da barra lateral; serve ao #lat e ao menu em gaveta (abaixo de 1024 px). Etapa bloqueada traz o motivo numa Dica (visível ao passar o mouse e ao focar), igual ao aria-label. */
  function lateralHtml() {
    var h = '<a class="fc-lat__marca" href="#" data-ir="tela:inicio" aria-label="FireCalc, início"><span class="claro">' + document.getElementById('logo-claro').innerHTML + '</span><span class="escuro">' + document.getElementById('logo-escuro').innerHTML + '</span></a>';
    h += itemApp('inicio', 'Início', U.icone('house', 'fc-ic'));
    if (S.aberto) {
      var feitas = 0, lis = '';
      U.ETAPAS.forEach(function (nome, k) {
        var n = k + 1, e = S.et[k], ab = U.aberta(n), cur = S.tela === 'projeto' && S.etapa === n, cls = '', est = '', rot = '';
        if (!ab) { cls = 'fc-etapa--bloq'; rot = 'bloqueada até as etapas anteriores ficarem completas'; }
        else if (n === U.POS.rel) { var res = S.sit.k === 'ok' && !S.et[U.POS.verif - 1].completa; est = res ? 'com ressalva' : ''; if (res) cls = 'fc-etapa--alerta'; rot = res ? 'liberada com ressalva' : 'liberada'; }
        else if (e.completa) { cls = 'fc-etapa--feita'; rot = 'completa'; feitas++; }
        else if (e.erros || (n === U.POS.rede && S.sit.k === 'incompleta') || n === U.POS.verif || S.visit[n]) {
          cls = 'fc-etapa--erro'; rot = 'com pendência: ' + e.falta;
          est = e.erros ? e.erros + (e.erros > 1 ? ' campos' : ' campo') : n === U.POS.rede && S.sit.k === 'incompleta' ? 'incompleta' : n === U.POS.verif ? (S.sit.k === 'ok' ? e.falta.replace(/itens não atendem/, 'erros').replace(/item não atende/, 'erro') : 'aguarda') : e.vazios ? 'falta ' + e.vazios : 'pendente';
        } else rot = 'a preencher';
        if (cur && cls === '') rot = 'etapa atual';
        var bt = '<button type="button" class="fc-etapa' + (cls ? ' ' + cls : '') + '" data-ir="etapa:' + n + '"' + (cur ? ' aria-current="page"' : '') + (ab ? '' : ' aria-disabled="true"') + ' aria-label="Etapa ' + n + ', ' + nome + ', ' + esc(rot) + '"><span class="fc-etapa__n">' + (cls === 'fc-etapa--feita' ? U.icone('check', 'fc-ic') : n) + '</span><span class="fc-etapa__t">' + nome + '</span>' + (est ? '<span class="fc-etapa__e">' + esc(est) + '</span>' : '') + '</button>';
        if (!ab) bt = '<span class="fc-dica-ancora fc-dica-ancora--lat">' + bt + '<span class="fc-dica fc-dica--larga" aria-hidden="true">' + esc(rot.charAt(0).toUpperCase() + rot.slice(1)) + '</span></span>';   /* o aria-label já diz o motivo ao leitor de tela: a Dica é só visual */
        lis += '<li>' + bt + '</li>';
      });
      h += '<div class="fc-lat__grupo"><span>Etapas do projeto</span><span>' + feitas + ' de ' + U.ETAPAS.length + '</span></div><div class="fc-progresso" role="progressbar" aria-label="Etapas concluídas" aria-valuemin="0" aria-valuemax="' + U.ETAPAS.length + '" aria-valuenow="' + feitas + '"><i style="width:' + (feitas * 100 / U.ETAPAS.length) + '%"></i></div>' +
        '<div role="group" aria-label="Etapas do projeto"><ol class="fc-etapas">' + lis + '</ol></div>';
    }
    h += '<div class="fc-lat__pe">';
    if (S.aberto) h += itemApp('estat', 'Estatísticas', U.icone('chart-column', 'fc-ic'), (S.sit.k === 'ok' ? '' : ' aria-disabled="true"') + ' aria-label="Estatísticas do projeto"');
    h += itemApp('cadastros', 'Cadastros', U.icone('database', 'fc-ic')) + itemApp('config', 'Configurações', U.icone('settings', 'fc-ic')) + itemApp('ajuda', 'Ajuda', U.icone('circle-help', 'fc-ic')) + itemApp('sobre', 'Sobre', U.icone('info', 'fc-ic')) + '<span class="apoio fc-lat__versao">' + U.VERSAO + '</span></div>';
    return h;
  }
  /** Gaveta do menu (abaixo de 1024 px): o mesmo conteúdo da barra lateral num dialog nativo, aberto pelo botão de menu da barra superior. */
  U.gavLat = function () {
    var g = document.getElementById('gav-lat'); if (!g) return;
    g.innerHTML = '<button type="button" class="fc-bt fc-bt--icone fc-bt--disc fc-gaveta__x" data-acao="gav-fechar" aria-label="Fechar menu">' + U.icone('x', 'fc-ic') + '</button><nav class="fc-lat fc-lat--gav" aria-label="Módulos e etapas">' + lateralHtml() + '</nav>';
  };
  U.lateral = function () {
    document.getElementById('lat').innerHTML = lateralHtml();
    var g = document.getElementById('gav-lat'); if (g && g.open) U.gavLat();
  };
  /** Barra superior (BarraSuperior e MenuProjeto do design system): nome do projeto com o menu do arquivo, estado de gravação, busca, desfazer, refazer, tema e "Baixar projeto". */
  function btIcone(acao, nome, icone, atalho, extra) {
    var id = 'dica-' + acao;
    return '<span class="fc-dica-ancora"><button type="button" class="fc-bt fc-bt--icone fc-bt--disc" data-acao="' + acao + '" aria-label="' + nome + '" aria-describedby="' + id + '"' + (extra || '') + '>' + icone + '</button><span class="fc-dica" role="tooltip" id="' + id + '">' + nome + (atalho ? ' <span class="fc-kbd">' + atalho + '</span>' : '') + '</span></span>';
  }
  function itemMenu(icone, txt, acao, off) { return '<button type="button" class="fc-menu__item" role="menuitem" data-acao="' + acao + '"' + (off ? ' disabled' : '') + '>' + icone + '<span>' + txt + '</span></button>'; }
  /** Marca sozinha (ícone) da barra superior no celular; vem dos templates que o build embute. */
  function marcaIcone() { return '<span class="fc-topo__marca" aria-hidden="true"><span class="claro">' + document.getElementById('logo-icone-claro').innerHTML + '</span><span class="escuro">' + document.getElementById('logo-icone-escuro').innerHTML + '</span></span>'; }
  U.topo = function () {
    var p = U.H.pode(), a = S.aberto, ok = a && S.sit.k === 'ok', escuro = S.tema === 'escuro', modo = U.modo(), movel = modo === 'movel', amplo = modo === 'amplo', t = document.getElementById('topo');
    var h = movel ? '<div class="topo-esq"><button type="button" class="fc-bt fc-bt--icone fc-bt--disc" id="menu-lat-bt" data-acao="menulat" aria-label="Abrir menu" aria-haspopup="dialog">' + U.icone('menu', 'fc-ic') + '</button>' + marcaIcone() + '</div>' : '';
    h += '<div class="fc-topo__proj"><button type="button" class="fc-topo__proj-bt" id="menu-projeto-bt" data-acao="menu" aria-haspopup="menu" aria-expanded="' + !!S.menu + '" aria-controls="menu-projeto"><b>' + (a ? esc(S.F.ident.obra || 'Projeto sem nome') : 'Nenhum projeto aberto') + '</b>' + U.icone('chevron-down', 'fc-ic') + '</button>' +
      (a ? '<span class="fc-topo__salvo' + (S.sujo ? ' fc-topo__salvo--sujo' : '') + '">' + (S.sujo ? 'Alterações não baixadas' : 'Salvo neste navegador') + '</span>' : '');
    if (S.menu) h += '<div class="fc-menu fc-topo__menu" id="menu-projeto" role="menu" aria-labelledby="menu-projeto-bt">' + itemMenu(U.icone('file-plus', 'fc-ic'), 'Novo projeto', 'novo') + itemMenu(U.icone('folder-open', 'fc-ic'), 'Abrir projeto', 'abrir') + '<div class="fc-menu__div" role="separator"></div><div class="fc-menu__tit" role="presentation">Baixar</div>' +
      itemMenu(U.icone('download', 'fc-ic'), 'Projeto (.json)', 'salvar', !a) + itemMenu(U.icone('file-text', 'fc-ic'), 'Planilha de cálculo (.xlsx)', 'xlsx', !ok) + itemMenu(U.icone('file-text', 'fc-ic'), 'Memorial (.docx)', 'docx', !ok) + '</div>';
    h += '</div><div class="topo-dir"><button type="button" class="fc-busca" data-acao="busca" aria-haspopup="dialog">' + U.icone('search', 'fc-ic') + '<span>Buscar</span><kbd class="fc-kbd">Ctrl K</kbd></button><span class="fc-topo__div"></span>' +
      (a ? btIcone('desfazer', 'Desfazer', U.icone('undo-2', 'fc-ic'), 'Ctrl Z', p.desfazer ? '' : ' disabled') + btIcone('refazer', 'Refazer', U.icone('redo-2', 'fc-ic'), 'Ctrl Y', p.refazer ? '' : ' disabled') : '') +
      btIcone('tema', escuro ? 'Tema claro' : 'Tema escuro', escuro ? U.icone('sun', 'fc-ic') : U.icone('moon', 'fc-ic'), '') +   /* um só mecanismo: o aria-label muda com o tema e o botão não leva aria-pressed (o leitor não repete o estado) */
      (a ? '<button type="button" class="fc-bt" data-acao="salvar">' + U.icone('download', 'fc-ic') + '<span>Baixar projeto</span></button>' : '') + '</div>';
    t.innerHTML = h; t.classList.toggle('fc-topo--movel', movel); U.ajustaTopo();
  };
  /** Barra superior sem nada cortado (BarraSuperior: o nome do projeto inteiro e em uma linha; a busca e os botões cedem espaço para ele). Abaixo de 1280 px a busca vira ícone
   *  e "Baixar projeto" vai ao menu do projeto; abaixo de 1024 px o nome ganha linha própria. Em 1280 px ou mais, e de 1024 a 1279 px, se o nome não couber cedem, em ordem,
   *  a busca (c1), o botão "Baixar projeto" (c2), a linha "Salvo neste navegador", que passa para baixo do nome (c3), e por fim o nome vai para uma linha própria (linha).
   *  O nome nunca é cortado (regra "Nada cortado"). */
  U.ajustaTopo = function () {
    var t = document.getElementById('topo'); if (!t) return; var modo = U.modo(), pj = t.querySelector('.fc-topo__proj');
    t.classList.remove('fc-topo--c1', 'fc-topo--c2', 'fc-topo--c3', 'fc-topo--linha');
    if (modo !== 'amplo') t.classList.add('fc-topo--c1', 'fc-topo--c2');
    if (modo === 'movel') { t.classList.add('fc-topo--linha'); return; }
    if (!pj || !t.getClientRects().length) return;
    var cabe = function () { return pj.scrollWidth <= pj.clientWidth + 1; };
    ['fc-topo--c1', 'fc-topo--c2', 'fc-topo--c3'].forEach(function (c) { if (!cabe()) t.classList.add(c); });
    if (!cabe()) t.classList.add('fc-topo--linha');
  };
  /** Indicador do painel de resumo (fc-ind do design system). */
  function ind(rot, v, un, s, txt) { return '<div class="fc-ind"><span class="fc-ind__rot">' + rot + '</span><span class="fc-ind__v' + (txt ? ' fc-ind__v--tx' : '') + '">' + v + (un ? ' <small>' + un + '</small>' : '') + '</span><span class="fc-ind__s">' + s + '</span></div>'; }
  function indVazio(rot, s) { return '<div class="fc-ind fc-ind--vazio"><span class="fc-ind__rot">' + rot + '</span><span class="fc-ind__v">sem resultado</span><span class="fc-ind__s">' + s + '</span></div>'; }
  /** Verificações como a tela mostra: [{v, s, nota}]. Fica de fora a V22 (itens de lançamento da rede, que o projetista confere no desenho). A V10 com a vazão de projeto abaixo do primeiro ponto tabelado do catálogo não é pendência: nesse lado da curva
   *  a bomba entrega altura igual ou maior. O motor não muda; só a apresentação. */
  U.vers0 = function () {
    var n = S.sit.R.numeros, b = U.bombaDe(S.F.bomba.id), SIT = { ERRO: 'er', ALERTA: 'al', INFO: 'in', OK: 'ok' };
    var lista = S.sit.R.verificacoes.filter(function (v) { return v.id !== 'V22'; });
    /* FC-014: SP com o esguicho escolhido ausente da base e da biblioteca: o motor não monta a V28; a tela diz que o alcance não foi verificado */
    if (S.sit.esgAusente && S.F.norma === 'SP') lista = lista.concat([{ id: 'V28', situacao: 'ALERTA', titulo: 'Alcance do jato no esguicho: esguicho não encontrado', valor: 'Esguicho "' + S.sit.esgAusente + '" fora da base e da biblioteca; alcance não verificado. Cadastre o modelo de novo em Minha biblioteca ou escolha outro esguicho.', item: '4.8.2; 4.11.2.3' }]);
    return lista.map(function (v) {
      var s = SIT[v.situacao], nota = '';
      if (v.id === 'V10' && v.situacao === 'ALERTA' && b && n.Hb >= n.AMT) {
        var q0 = Math.min.apply(null, b.pts.map(function (p) { return p[1]; }));
        if (n.Qth < q0) { s = 'ok'; nota = 'A vazão de projeto (' + fmt(n.Qth, 2) + ' m³/h) fica abaixo do primeiro ponto tabelado no catálogo (' + fmt(q0, 1) + ' m³/h). Nesse lado da curva a bomba entrega altura igual ou maior; o valor foi estimado pelo prolongamento da curva.'; }
      }
      return { v: v, s: s, nota: nota };
    });
  };
  /** 2.5.4: marca "Conferido" do projetista, só nos itens a conferir. Vale enquanto a situação e o valor do item forem os da hora da marca; se mudarem, a marca some. */
  U.assinaConf = function (v) { return v.situacao + '|' + v.valor; };
  U.vers = function () {
    var l = U.vers0(), F = S.F, CF = F.conferidos || (F.conferidos = {}), vivos = {};
    l.forEach(function (x) { var k = x.v.id; x.cf = false; if (CF[k] !== undefined && x.s === 'al' && CF[k] === U.assinaConf(x.v)) { x.cf = true; vivos[k] = 1; } });
    Object.keys(CF).forEach(function (k) { if (!vivos[k]) delete CF[k]; });
    return l;
  };
  U.contaVer = function () { var c = { er: 0, al: 0, in: 0, ok: 0, cf: 0 }; U.vers().forEach(function (x) { c[x.cf ? 'cf' : x.s]++; }); return c; };
  /** Potência como o catálogo dá: cv do motor (Schneider) ou, na KSB, só a potência no eixo lida da curva (o catálogo não dá o motor), dita como as listas: valor e unidade. */
  U.potTxt = function (b, pe) { return b.cv ? fmt(b.cv, b.cv % 1 ? 1 : 0) + ' cv' : (pe ? fmt(pe.P, 1) + ' ' + pe.un : (b.potEixo ? 'potência pela curva' : 'potência não informada')); };
  U.bombaDe = function (id) { return id ? D.bombas.filter(function (x) { return x.id === id; })[0] : null; };
  /** Painel de resumo (PainelResumo do design system): coluna à direita com a situação das verificações e os resultados do projeto; estados vazios e de erro como Aviso. */
  function selo(tipo, txt) { var i = { er: U.icone('circle-x', 'fc-ic'), al: U.icone('triangle-alert', 'fc-ic'), ok: U.icone('circle-check', 'fc-ic') }[tipo]; return '<span class="fc-selo fc-selo--' + tipo + '">' + i + txt + '</span>'; }
  function avisoRes(tipo, html, bt) { return '<div class="fc-aviso fc-aviso--' + tipo + '">' + (tipo === 'er' ? U.icone('circle-x', 'fc-ic') : U.icone('info', 'fc-ic')) + '<div class="fc-aviso__tx">' + html + '</div>' + (bt || '') + '</div>'; }
  /** Faixa do resumo (TelaEtapa1024): situação das verificações e três indicadores, com o botão que abre o resumo inteiro em gaveta. */
  function indF(rot, v, un, vazio) { return '<div class="fc-ind' + (vazio ? ' fc-ind--vazio' : '') + '"><span class="fc-ind__rot">' + rot + '</span><span class="fc-ind__v">' + v + (un ? '<small>' + un + '</small>' : '') + '</span></div>'; }
  /** Selo compacto da faixa (TelaEtapa1024): ícone e contagem; o texto por extenso fica para o leitor de tela (fc-so-leitor) e para o mouse (title). */
  function seloC(tipo, n, txt) { var i = tipo === 'er' ? U.icone('circle-x', 'fc-ic') : U.icone('triangle-alert', 'fc-ic'); return '<span class="fc-selo fc-selo--' + tipo + '" title="' + n + ' ' + txt + '">' + i + n + '<span class="fc-so-leitor"> ' + txt + '</span></span>'; }
  function faixaMedia(sit) {
    var d = '<span class="fc-resumo-faixa__div"></span>', bt = '<button type="button" class="fc-bt fc-bt--p" data-acao="resumo-abrir" aria-haspopup="dialog">Resumo completo</button>';
    if (sit.k !== 'ok') return indF('Verificações', 'sem resultado', '', true) + d + indF('Vazão', 'sem resultado', '', true) + d + indF('Pressão mínima', 'sem resultado', '', true) + d + indF('Altura manométrica', 'sem resultado', '', true) + bt;
    var n = sit.R.numeros, c = U.contaVer(), grav = S.F.fonte.modo === 'gravidade';
    return '<div class="fc-ind"><span class="fc-ind__rot">Verificações</span><span class="fc-bts fc-bts--faixa">' + (c.er ? seloC('er', c.er, c.er > 1 ? 'não atendem' : 'não atende') : '') + (c.al ? seloC('al', c.al, 'a conferir') : '') + (!c.er && !c.al ? selo('ok', 'Tudo atende') : '') + '</span></div>' + d +
      indF(n.jatoUnico ? 'Vazão de um jato' : 'Vazão dos dois jatos', fmt(n.Qt, 1), 'L/min') + d + indF('Pressão mínima', fmt(n.Pvcrit, 2), 'mca') + d + indF(grav ? 'Folga por gravidade' : 'Altura manométrica', fmt(grav ? -n.AMT : n.AMT, 2), 'mca') + bt;
  }
  /** Faixa da etapa (TelaEtapa390, abaixo de 1024 px): "Etapa N de 8", progresso e o botão que abre o resumo em folha. */
  function faixaMovel() {
    var et = S.tela === 'projeto' ? '<span class="fc-ind__rot">Etapa ' + S.etapa + ' de ' + U.ETAPAS.length + '</span><div class="fc-progresso" role="progressbar" aria-label="Etapa atual" aria-valuemin="1" aria-valuemax="' + U.ETAPAS.length + '" aria-valuenow="' + S.etapa + '"><i style="width:' + (S.etapa * 100 / U.ETAPAS.length) + '%"></i></div>' : '<span class="fc-ind__rot">Estatísticas</span><span class="fc-etapa-movel__vaz"></span>';
    return et + '<button type="button" class="fc-bt fc-bt--p" data-acao="resumo-abrir" aria-haspopup="dialog">' + U.icone('list-checks', 'fc-ic') + '<span>Resumo</span></button>';
  }
  /** Gaveta do resumo inteiro (1024 a 1279 px, pela direita) ou folha (abaixo de 1024 px, de baixo para cima): um dialog nativo, com Esc e foco de volta ao botão. */
  U.gavResumo = function () {
    var g = document.getElementById('gav-resumo'); if (!g) return;
    g.classList.toggle('fc-gaveta--folha', U.modo() === 'movel'); g.classList.toggle('fc-gaveta--dir', U.modo() !== 'movel');
    g.innerHTML = '<div class="fc-gaveta__cab"><h2 id="gav-resumo-t">Resumo do projeto</h2>' + (U.resumoUF ? '<span class="apoio">' + U.resumoUF + '</span>' : '') + '<button type="button" class="fc-bt fc-bt--icone fc-bt--disc" data-acao="gav-fechar" aria-label="Fechar resumo">' + U.icone('x', 'fc-ic') + '</button></div><div class="fc-resumo fc-resumo--gav">' + (U.resumoCorpo || '') + '</div>';
  };
  U.resumo = function () {
    var el = document.getElementById('resumo'), sit = S.sit, h = '', app = document.getElementById('app'), modo = U.modo(), g = document.getElementById('gav-resumo'), fx = document.getElementById('resumo-faixa');
    el.hidden = (S.tela !== 'projeto' && S.tela !== 'estat') || !S.aberto; app.classList.toggle('fc-app--sem-resumo', el.hidden); app.classList.toggle('fc-app--media', modo === 'medio'); app.classList.toggle('fc-app--movel', modo === 'movel');
    if ((el.hidden || modo === 'amplo') && fx) { fx.remove(); fx = null; }
    if (el.hidden) { el.innerHTML = ''; U.resumoCorpo = ''; if (g && g.open) g.close(); return; }
    var UF = S.F.norma === 'SP' || S.F.norma === 'PR' ? S.F.norma : '';
    var cab = '<div class="fc-resumo__cab"><h2>Resumo do projeto</h2>' + (UF ? '<span class="apoio">' + UF + '</span>' : '') + '</div>';
    if (sit.k === 'ok') {
      var n = sit.R.numeros, N = U.norma(), c = U.contaVer(), b = U.bombaDe(S.F.bomba.id), grav = S.F.fonte.modo === 'gravidade';
      h += '<div class="fc-resumo__ver"><span class="fc-ind__rot">Verificações</span><div class="fc-bts">' + (c.er ? selo('er', c.er + (c.er > 1 ? ' não atendem' : ' não atende')) : '') + (c.al ? selo('al', c.al + ' a conferir') : '') + (!c.er && !c.al ? selo('ok', 'Tudo atende') : '') + '</div>' +
        '<button type="button" class="fc-bt fc-bt--disc fc-resumo__ver-bt" data-ir="etapa:' + U.POS.verif + '">Ver verificações ' + U.icone('arrow-right', 'fc-ic') + '</button></div>';
      h += ind('Tipo de sistema', esc(n.tipo), '', N.id === 'SP' ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1') + ind(n.jatoUnico ? 'Vazão de um jato' : 'Vazão dos dois jatos', fmt(n.Qt, 1), 'L/min', fmt(n.Qth, 2) + ' m³/h') +
        ind('Pressão mínima', fmt(n.Pvcrit, 2), 'mca', 'na válvula de ' + esc(n.critico)) + ind(grav ? 'Folga por gravidade' : 'Altura manométrica', fmt(grav ? -n.AMT : n.AMT, 2), 'mca', n.Pd !== undefined ? fmt(n.Pd, 2) + ' na descarga da bomba' : 'reservatório elevado') +
        (b && !grav ? ind('Bomba', esc(b.modelo), '', esc(U.potTxt(b, n.potEixo)) + (n.Qw !== undefined ? ', trabalha em ' + fmt(n.Qw, 1) + ' m³/h e ' + fmt(n.Hw, 1) + ' mca' : ''), true) : ind('Bomba', grav ? 'sem bomba' : 'a escolher', '', grav ? 'só gravidade' : 'etapa ' + U.POS.bomba, true)) +
        /* Reserva (PainelResumo): os dois números já saem do motor (R.numeros.rtiEfetiva e rtiTabela, a V12); sem cálculo novo. Sem reservatório definido: "Falta a etapa Abastecimento". */
        (n.rtiEfetiva !== undefined && n.rtiTabela !== undefined ? ind('Reserva de incêndio', fmt(n.rtiEfetiva, 2), 'm³', 'pedida pela tabela: ' + fmt(n.rtiTabela, 2) + ' m³') : '<div class="fc-ind fc-ind--vazio"><span class="fc-ind__rot">Reserva de incêndio</span><span class="fc-ind__v">Falta a etapa ' + U.ETAPAS[U.POS.abast - 1] + '</span></div>');
      if (n.jatoUnico) h += avisoRes('in', 'Rede com um só hidrante simples: cálculo com um jato. A IT 22 define os dois jatos para sistemas com mais de um hidrante simples (4.8.3).');
    } else {
      var motivo = { branco: 'aguarda a rede', invalido: 'suspenso', incompleta: 'suspenso', aguarda: 'aguarda dados', falha: 'suspenso' }[sit.k];
      h += ['Tipo de sistema', 'Vazão dos jatos', 'Pressão mínima', 'Altura manométrica', 'Bomba', 'Verificações'].map(function (r) { return indVazio(r, motivo); }).join('');
      if (sit.k === 'invalido') h += avisoRes('er', '<b>Resultado suspenso:</b> ' + sit.inv.length + (sit.inv.length > 1 ? ' campos com valor inválido' : ' campo com valor inválido') + ' (etapa ' + U.ETAPAS[sit.inv[0].etapa - 1] + '). Nenhum número é mostrado até a correção.', '<button type="button" class="fc-bt fc-bt--p" data-corrigir="' + esc(sit.inv[0].c) + '">Ir corrigir</button>');
      if (sit.k === 'incompleta') h += avisoRes('er', '<b>Rede incompleta:</b> ' + esc(sit.av[0].msg) + ' Corrija o nó ou lance o trecho que falta.', '<button type="button" class="fc-bt fc-bt--p" data-corrigir="trechos.' + sit.av[0].i + '.' + sit.av[0].campo + '">Ir corrigir</button>');
      if (sit.k === 'aguarda') { var ets = []; sit.falta.forEach(function (f) { if (ets.indexOf(U.ETAPAS[f.etapa - 1]) < 0) ets.push(U.ETAPAS[f.etapa - 1]); }); h += avisoRes('in', 'O resultado aparece quando o cálculo tiver todos os dados. Falta preencher: ' + ets.join(', ') + '.', '<button type="button" class="fc-bt fc-bt--p" data-corrigir="' + esc(sit.falta[0].c) + '">Ir preencher</button>'); }
      if (sit.k === 'falha') h += avisoRes('er', '<b>O cálculo não fechou:</b> ' + esc(vir(sit.msg)));
      if (sit.k === 'branco') h += avisoRes('in', 'O resumo aparece aqui quando a rede tiver hidrante ligado ao reservatório e os dados das etapas 1 a ' + U.POS.hidr + ' estiverem preenchidos.');
    }
    el.innerHTML = cab + h; U.resumoCorpo = h; U.resumoUF = UF;
    if (modo !== 'amplo') {
      if (!fx) { fx = document.createElement('div'); fx.id = 'resumo-faixa'; document.getElementById('topo').insertAdjacentElement('afterend', fx); }
      fx.className = modo === 'movel' ? 'fc-etapa-movel' : 'fc-resumo-faixa'; fx.setAttribute('role', 'region'); fx.setAttribute('aria-label', modo === 'movel' ? 'Etapa e resumo do projeto' : 'Resumo do projeto em faixa');
      fx.innerHTML = modo === 'movel' ? faixaMovel() : faixaMedia(sit);
    }
    if (g && g.open) U.gavResumo();
  };
  /* Leitor de tela: uma frase curta quando a situação do resultado muda. O resumo inteiro não é região falada, para não ser lido a cada tecla. */
  var tFala = null, ultFala = '';
  U.textoFala = function () {
    var sit = S.sit; if (!S.aberto || (S.tela !== 'projeto' && S.tela !== 'estat')) return '';
    if (sit.k === 'ok') {
      var n = sit.R.numeros, c = U.contaVer(), grav = S.F.fonte.modo === 'gravidade';
      return 'Resultado calculado. Vazão de ' + fmt(n.Qt, 1) + ' litros por minuto. ' + (grav ? 'Folga por gravidade de ' + fmt(-n.AMT, 2) : 'Altura manométrica de ' + fmt(n.AMT, 2)) + ' metros de coluna de água. ' +
        (c.er ? c.er + (c.er > 1 ? ' verificações não atendem.' : ' verificação não atende.') : (c.al ? 'Nenhuma verificação em erro.' : 'Todas as verificações atendem.')) + (c.al ? ' ' + c.al + (c.al > 1 ? ' itens a conferir.' : ' item a conferir.') : '');
    }
    if (sit.k === 'invalido') return 'Resultado suspenso. ' + sit.inv.length + (sit.inv.length > 1 ? ' campos com valor inválido' : ' campo com valor inválido') + ', etapa ' + U.ETAPAS[sit.inv[0].etapa - 1] + '. ' + sit.inv[0].msg;
    if (sit.k === 'incompleta') return 'Rede incompleta. ' + sit.av[0].msg;
    if (sit.k === 'aguarda') { var ets = []; sit.falta.forEach(function (f) { if (ets.indexOf(U.ETAPAS[f.etapa - 1]) < 0) ets.push(U.ETAPAS[f.etapa - 1]); }); return 'Sem resultado ainda. Falta preencher: ' + ets.join(', ') + '.'; }
    if (sit.k === 'falha') return 'O cálculo não fechou. ' + vir(sit.msg);
    return '';
  };
  U.falar = function () {
    var t = U.textoFala(); clearTimeout(tFala);
    tFala = setTimeout(function () { if (t === ultFala) return; ultFala = t; var el = document.getElementById('fala'); if (el) el.textContent = t; }, 900);
  };
  function nomeRed(c) { var o = U.pegaObj(c.replace(/\.redP$/, '')) || {}; return /^cotasExtras/.test(c) ? 'Pavimento ' + o.nome : 'Hidrante ' + (o.id || o.no); }
  U.rodape = function () {
    var pe = document.getElementById('pe'); pe.hidden = S.tela !== 'projeto' || !S.aberto; if (pe.hidden) return;
    var n = S.etapa, e = S.et[n - 1], prox = n < U.POS.rel && (U.aberta(n + 1) || (n === U.POS.edif && U.soTipo())), falta = e.completa ? (n === U.POS.rel ? '' : 'Etapa completa.') : 'Falta: ' + e.falta + '.';
    if (n === U.POS.verif && S.sit.k === 'ok' && !e.completa) falta = 'Há ' + e.falta.replace(/^(\d+) ite(ns|m) não atende(m)?$/, function (t, q) { return q + (q > 1 ? ' itens que não atendem' : ' item que não atende'); }) + '. O relatório sai com ressalva.';
    if (n === U.POS.bomba && !e.completa && prox) falta += ' As verificações já podem ser vistas.';
    /* 2.6.4 (FC-017): falta só a pressão de saída regulada (um ou vários .redP vazios, nenhum erro de valor na etapa): atalho para o menu da válvula redutora */
    var vzR = n === U.POS.hidr && !e.completa ? S.sit.campos.filter(function (c) { return c.etapa === n && c.n === 'vazio'; }) : [], atalho = '';
    if (vzR.length && e.erros === 0 && vzR.every(function (c) { return /\.redP$/.test(c.c); }))
      atalho = '<button type="button" class="fc-bt fc-bt--disc fc-bt--p" data-corrigir="' + vzR[0].c + '" data-acao="red-rodape" aria-haspopup="dialog" aria-label="Abrir a válvula redutora' + (vzR.length === 1 ? ', ' + esc(nomeRed(vzR[0].c)) : '') + '">Abrir a válvula redutora</button>';
    var movel = U.modo() === 'movel';   /* no celular o Voltar é só o ícone (com aria-label) e o primário se estica */
    pe.innerHTML = '<button type="button" class="fc-bt' + (movel ? ' fc-bt--icone' : '') + '" data-ir="etapa:' + Math.max(1, n - 1) + '"' + (n === 1 ? ' disabled' : '') + (movel ? ' aria-label="Voltar"' : '') + '>' + U.icone('arrow-left', 'fc-ic') + (movel ? '' : '<span>Voltar</span>') + '</button><span class="fc-rodape__falta">' + (e.completa && n !== U.POS.rel ? U.icone('circle-check', 'fc-ic fc-rodape__ok') : '') + esc(falta) + '</span>' + atalho +
      (n === U.POS.rel ? '' : '<button type="button" class="fc-bt fc-bt--pri fc-bt--g" data-acao="proximo"' + (prox ? '' : ' aria-disabled="true"') + '><span>Próximo: ' + U.ETAPAS[n] + '</span>' + U.icone('arrow-right', 'fc-ic') + '</button>');
  };
})();
