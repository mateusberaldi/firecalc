/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, componentes e moldura: estado da tela, campo com rótulo e mensagem, pílula, cartão de indicador,
 * barra lateral, topo, resumo em cartões e rodapé do assistente. As telas ficam em ui/telas/*.js e se registram em U.telas. */
(function () {
  'use strict';
  var D = FIREDADOS, M = FireMotor, E = FireEstado, V = FireValida, FT = FireFormato, fmt = FT.fmt, esc = FT.esc, vir = FT.vir;
  D.bombasBase = D.bombas.slice();
  var U = window.FireUI = { D: D, M: M, E: E, V: V, fmt: fmt, esc: esc, vir: vir, telas: {}, VERSAO: 'FireCalc 2.6.4' };
  var IC = U.IC = {
    ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2l2.3 2.3 4.7-5" fill="none" stroke="var(--fc-superficie)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    er: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="var(--fc-superficie)" stroke-width="1.8" stroke-linecap="round"/></svg>',
    al: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l7 12.5H1z" fill="var(--fc-alerta)" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><path d="M8 6v4" stroke="#0A0A0A" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="12" r=".9" fill="#0A0A0A"/></svg>',
    in: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M8 7.2v4" stroke="var(--fc-superficie)" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="4.8" r="1" fill="var(--fc-superficie)"/></svg>',
    cad: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  };
  var PAL = { ok: ['p-ok', 'Atende'], er: ['p-er', 'Não atende'], al: ['p-al', 'Conferir'], in: ['p-in', 'Informação'] };
  U.ETAPAS = ['Identificação', 'Edificação e sistema', 'Abastecimento', 'Rede', 'Hidrantes', 'Bomba e automação', 'Verificações', 'Relatório'];
  U.POS = V.POS;   // 2.5.1: posição de cada etapa (Abastecimento antes da Rede)
  U.MODULOS = [['inicio', 'Início'], ['projeto', 'Projeto'], ['cadastros', 'Cadastros'], ['config', 'Configurações'], ['ajuda', 'Ajuda'], ['sobre', 'Sobre']];
  var S = U.S = { F: E.novo(), aberto: false, tela: 'inicio', etapa: 1, sel: -1, tema: 'claro', modo: 'padrao', tocados: {}, forcar: {}, visit: {}, sit: null, et: null, sujo: false, ajuda: '' };
  U.H = E.Historico();

  // ---- estado
  U.recalc = function () { S.sit = E.avalia(S.F, D, M); S.et = V.etapas(S.F, S.sit); };
  U.pega = function (c) { var o = S.F, p = c.split('.'); for (var i = 0; i < p.length && o !== undefined && o !== null; i++) o = o[p[i]]; return o; };
  U.poe = function (c, v) { var o = S.F, p = c.split('.'); for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] === undefined) o[p[i]] = {}; o = o[p[i]]; } o[p[p.length - 1]] = v; };
  U.idDe = function (c) { return 'f-' + c.replace(/[^A-Za-z0-9]/g, '-'); };
  U.info = function (c) { return S.sit.campos.filter(function (x) { return x.c === c; })[0] || null; };
  /** Mensagem do campo: erro e alerta sempre; campo vazio só depois que perdeu o foco ou que o usuário apertou "Próximo". */
  U.msg = function (c, etapa) { var i = U.info(c); if (!i) return null; if (i.n === 'vazio' && !S.tocados[c] && !S.forcar[etapa || i.etapa]) return null; return i; };
  U.pilula = function (s, txt) { var p = PAL[s]; return '<span class="pilula ' + p[0] + '">' + IC[s] + (txt || p[1]) + '</span>'; };
  function attrMsg(c, m) { return m && m.n !== 'alerta' ? ' aria-invalid="true" aria-describedby="' + U.idDe(c) + '-m"' : (m ? ' aria-describedby="' + U.idDe(c) + '-m"' : ''); }
  function htmlMsg(c, m) { return m ? '<div class="' + (m.n === 'alerta' ? 'msg-al' : 'msg-er') + '" id="' + U.idDe(c) + '-m">' + esc(m.msg) + '</div>' : ''; }
  /** Campo de texto com rótulo, unidade, exemplo e mensagem. o = {un, ex, aj, larga, num} */
  U.attrMsg = attrMsg; U.htmlMsg = htmlMsg;
  U.campo = function (c, rot, o) {
    o = o || {}; var m = U.msg(c), v = U.pega(c);
    return '<label class="cmp' + (o.larga ? ' larga' : '') + '"><span class="rt">' + rot + (o.un ? ' <small>(' + o.un + ')</small>' : '') + '</span><input class="campo' + (o.num ? ' num' : '') + (o.cls ? ' ' + o.cls : '') + '" id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(v) + '"' + (o.ex ? ' placeholder="' + esc(o.ex) + '"' : '') + attrMsg(c, m) + ' autocomplete="off">' + htmlMsg(c, m) + (o.aj ? '<span class="aj">' + o.aj + '</span>' : '') + '</label>';
  };
  /** 2.6.0: "?" de ajuda. O botão fica fora do rótulo (um botão dentro do label confunde o leitor de tela); o balão abre por clique ou toque,
   *  fecha com Esc ou ao clicar fora, e fica aberto enquanto a tela é redesenhada (S.ajuda guarda qual está aberto). */
  U.textoAjuda = function (chave) {
    var m = String(S.F.ident.municipio || '').trim() || '[município]';
    return chave === 'altitude' ? 'Altura do município acima do nível do mar, em metros. Define a pressão atmosférica do NPSH disponível. Busque: Altitude de ' + esc(m) + ' em relação ao nível do mar.'
      : 'Temperatura da água do reservatório, em °C. Define a pressão de vapor do NPSH disponível. Busque: Temperatura da água em ' + esc(m) + ' NPSH.';
  };
  U.campoAjuda = function (c, rot, o, chave) {
    var id = 'ajuda-' + chave, ab = S.ajuda === chave;
    return '<div class="cmp-ajuda">' + U.campo(c, rot, o) + '<button type="button" class="bt-aj" data-ajuda="' + chave + '" aria-expanded="' + ab + '" aria-controls="' + id + '" aria-label="O que é ' + esc(rot.toLowerCase()) + '">?</button>' +
      '<div class="bal" id="' + id + '" role="note"' + (ab ? '' : ' hidden') + '>' + U.textoAjuda(chave) + '</div></div>';
  };
  /** Célula de tabela com campo de texto. */
  U.celula = function (c, rotAria, cls) { var m = U.msg(c); return '<td><input class="campo ' + (cls || '') + '" id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(U.pega(c)) + '" aria-label="' + esc(rotAria) + '"' + attrMsg(c, m) + ' autocomplete="off">' + htmlMsg(c, m) + '</td>'; };
  /** Campo de escolha. ops = [[valor, rótulo]]; o = {aj, larga, num (guarda número), vazio (rótulo da opção vazia), aria} */
  U.escolha = function (c, rot, ops, o) {
    o = o || {}; var m = U.msg(c), v = U.pega(c);
    var h = '<select class="campo' + (o.cls ? ' ' + o.cls : '') + '" id="' + U.idDe(c) + '" data-c="' + c + '"' + (o.num ? ' data-num="1"' : '') + attrMsg(c, m) + (rot ? '' : ' aria-label="' + esc(o.aria || '') + '"') + '>' + (o.vazio ? '<option value="">' + esc(o.vazio) + '</option>' : '') +
      ops.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(v) === String(x[0]) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' + htmlMsg(c, m);
    return rot ? '<label class="cmp' + (o.larga ? ' larga' : '') + '"><span class="rt">' + rot + '</span>' + h + (o.aj ? '<span class="aj">' + o.aj + '</span>' : '') + '</label>' : h;
  };
  U.marcar = function (c, texto) { return '<label class="marcar"><input type="checkbox" id="' + U.idDe(c) + '" data-c="' + c + '"' + (U.pega(c) ? ' checked' : '') + '><span>' + texto + '</span></label>'; };
  U.aviso = function (tipo, html) { return '<div class="aviso ' + tipo + '">' + IC[tipo === 'er' ? 'er' : tipo === 'al' ? 'al' : 'in'].replace('<svg', '<svg width="18" height="18"') + '<span>' + html + '</span></div>'; };
  U.cab = function (n, titulo, texto, extra) { return '<div class="cab"><div class="tx">' + (n ? '<span class="rot">Etapa ' + n + ' de ' + U.ETAPAS.length + '</span>' : '') + '<h1>' + titulo + '</h1>' + (texto ? '<p>' + texto + '</p>' : '') + '</div>' + (extra || '') + '</div>'; };
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
      h += '<li><input class="campo" id="' + U.idDe(c) + '" data-c="' + esc(c) + '" value="' + esc(t.pecas[id]) + '" inputmode="numeric" aria-label="Quantidade de ' + esc(U.nomePeca(id)) + '"' + attrMsg(c, m) + '><span class="nm">' + esc(U.nomePeca(id)) + htmlMsg(c, m) + '</span><span class="tec">' + (isNaN(l) ? 'sem dado para DN' + esc(t.dn) : fmt((q > 0 ? q : 0) * l, 1) + ' m') + '</span><button class="bt lig min" data-tirapeca="' + esc(c) + '" aria-label="Tirar ' + esc(U.nomePeca(id)) + '">tirar</button></li>';
    });
    if (!ids.length) h += '<li><span class="nm peq">Nenhuma peça lançada.</span></li>';
    var ops = Object.keys(D.leq[S.F.tabelaLeq].pecas).filter(function (id) { return ids.indexOf(id) < 0; });
    h += '</ul><select class="campo" data-addpeca="' + base + '" aria-label="Adicionar peça" style="margin:10px 0;width:100%"><option value="">Adicionar peça...</option>' + ops.map(function (id) { return '<option value="' + esc(id) + '">' + esc(U.nomePeca(id)) + '</option>'; }).join('') + '</select>';
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
  U.lateral = function () {
    var h = '<a class="marca" href="#" data-ir="tela:inicio" aria-label="FireCalc, início"><span class="claro">' + document.getElementById('logo-claro').innerHTML + '</span><span class="escuro">' + document.getElementById('logo-escuro').innerHTML + '</span></a>';
    U.MODULOS.forEach(function (m) {
      h += '<button class="nav" data-ir="tela:' + m[0] + '"' + (S.tela === m[0] ? ' aria-current="page"' : '') + '><span class="t">' + m[1] + '</span></button>';
      if (m[0] !== 'projeto' || !S.aberto) return;
      h += '<div class="etapas" role="group" aria-label="Etapas do projeto">';
      U.ETAPAS.forEach(function (nome, k) {
        var n = k + 1, e = S.et[k], ab = U.aberta(n), cur = S.tela === 'projeto' && S.etapa === n, cls = '', est = '', rot = '';
        if (!ab) { cls = 'bloq'; rot = 'bloqueada até as etapas anteriores ficarem completas'; }
        else if (n === U.POS.rel) { var res = S.sit.k === 'ok' && !S.et[U.POS.verif - 1].completa; est = res ? 'com ressalva' : ''; rot = res ? 'liberada com ressalva' : 'liberada'; }
        else if (e.completa) { cls = 'feita'; rot = 'completa'; }
        else if (e.erros || (n === U.POS.rede && S.sit.k === 'incompleta') || n === U.POS.verif || S.visit[n]) {
          cls = 'pend'; rot = 'com pendência: ' + e.falta;
          est = e.erros ? e.erros + (e.erros > 1 ? ' campos' : ' campo') : n === U.POS.rede && S.sit.k === 'incompleta' ? 'incompleta' : n === U.POS.verif ? (S.sit.k === 'ok' ? e.falta.replace(/itens não atendem/, 'erros').replace(/item não atende/, 'erro') : 'aguarda') : e.vazios ? 'falta ' + e.vazios : 'pendente';
        } else rot = 'a preencher';
        if (cur && cls === '') { cls = 'atual'; rot = 'etapa atual'; }
        h += '<button class="nav ' + cls + '" data-ir="etapa:' + n + '"' + (cur ? ' aria-current="page"' : '') + (ab ? '' : ' aria-disabled="true"') + ' aria-label="Etapa ' + n + ', ' + nome + ', ' + esc(rot) + '"><span class="n">' + (cls === 'feita' ? '✓' : n) + '</span><span class="t">' + nome + '</span>' + (cls === 'bloq' ? '<span class="est" title="Bloqueada">' + IC.cad + '</span>' : (est ? '<span class="est">' + esc(est) + '</span>' : '')) + '</button>';
      });
      h += '<button class="nav" data-ir="tela:estat"' + (S.tela === 'estat' ? ' aria-current="page"' : '') + (S.sit.k === 'ok' ? '' : ' aria-disabled="true"') + ' aria-label="Estatísticas do projeto"><span class="n">Σ</span><span class="t">Estatísticas</span></button></div>';
    });
    h += '<div class="fim"><div><b>Modo:</b> ' + (S.modo === 'padrao' ? 'padrão' : 'personalizado') + ' <button class="bt lig min" data-acao="modo">trocar</button></div><div>' + U.VERSAO + '</div></div>';
    document.getElementById('lat').innerHTML = h;
  };
  U.topo = function () {
    var p = U.H.pode();
    document.getElementById('topo').innerHTML = '<div class="proj"><span class="rot">Projeto</span><b>' + (S.aberto ? esc(S.F.ident.obra || 'Projeto sem nome') : 'nenhum aberto') + '</b></div>' +
      '<button class="busca" data-acao="busca" aria-haspopup="dialog">Buscar etapa, campo ou termo <kbd>Ctrl K</kbd></button><div class="ac">' +
      (S.aberto ? '<button class="bt min" data-acao="desfazer"' + (p.desfazer ? '' : ' disabled') + '>Desfazer</button><button class="bt min" data-acao="refazer"' + (p.refazer ? '' : ' disabled') + '>Refazer</button><button class="bt min" data-acao="salvar">Baixar o projeto (.json)</button>' : '') +
      '<button class="bt min" data-acao="tema" aria-pressed="' + (S.tema === 'escuro') + '">' + (S.tema === 'escuro' ? 'Tema claro' : 'Tema escuro') + '</button></div>';
  };
  function ind(rot, v, un, s, txt) { return '<div class="cartao ind"><div class="rot">' + rot + '</div><div class="v' + (txt ? ' txt' : '') + '">' + v + (un ? ' <small>' + un + '</small>' : '') + '</div><div class="s">' + s + '</div></div>'; }
  function indVazio(rot, s) { return '<div class="cartao ind vazio"><div class="rot">' + rot + '</div><div class="v">sem resultado</div><div class="s">' + s + '</div></div>'; }
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
  U.resumo = function () {
    var el = document.getElementById('resumo'), sit = S.sit, h = '', svg = function (k) { return IC[k].replace('<svg', '<svg width="18" height="18"'); };
    el.hidden = (S.tela !== 'projeto' && S.tela !== 'estat') || !S.aberto; if (el.hidden) { el.innerHTML = ''; return; }
    if (sit.k === 'ok') {
      var n = sit.R.numeros, N = U.norma(), c = U.contaVer(), b = U.bombaDe(S.F.bomba.id), grav = S.F.fonte.modo === 'gravidade';
      h = ind('Tipo de sistema', esc(n.tipo), '', N.id === 'SP' ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1') + ind(n.jatoUnico ? 'Vazão de um jato' : 'Vazão dos dois jatos', fmt(n.Qt, 1), 'L/min', fmt(n.Qth, 2) + ' m³/h') +
        ind('Pressão mínima', fmt(n.Pvcrit, 2), 'mca', 'na válvula de ' + esc(n.critico)) + ind(grav ? 'Folga por gravidade' : 'Altura manométrica', fmt(grav ? -n.AMT : n.AMT, 2), 'mca', n.Pd !== undefined ? fmt(n.Pd, 2) + ' na descarga da bomba' : 'reservatório elevado') +
        (b && !grav ? ind('Bomba', esc(b.modelo), '', esc(U.potTxt(b, n.potEixo)) + (n.Qw !== undefined ? ', trabalha em ' + fmt(n.Qw, 1) + ' m³/h e ' + fmt(n.Hw, 1) + ' mca' : ''), true) : ind('Bomba', grav ? 'sem bomba' : 'a escolher', '', grav ? 'só gravidade' : 'etapa ' + U.POS.bomba, true)) +
        '<div class="cartao ind"><div class="rot">Verificações</div><div class="v" style="margin:8px 0 4px">' + (c.er ? U.pilula('er', c.er + (c.er > 1 ? ' não atendem' : ' não atende')) : (c.al ? U.pilula('al', 'Nenhum erro') : U.pilula('ok', 'Tudo atende'))) + '</div><div class="s"><button class="bt lig min" data-ir="etapa:' + U.POS.verif + '" style="margin-left:-8px">' + (c.al ? c.al + ' a conferir, ver' : 'ver a lista') + '</button></div></div>';
      if (n.jatoUnico) h += '<div class="estado info">' + svg('in') + '<span>Rede com um só hidrante simples: cálculo com um jato. A IT 22 define os dois jatos para sistemas com mais de um hidrante simples (4.8.3).</span></div>';
    } else {
      var motivo = { branco: 'aguarda a rede', invalido: 'suspenso', incompleta: 'suspenso', aguarda: 'aguarda dados', falha: 'suspenso' }[sit.k];
      h = ['Tipo de sistema', 'Vazão dos jatos', 'Pressão mínima', 'Altura manométrica', 'Bomba', 'Verificações'].map(function (r) { return indVazio(r, motivo); }).join('');
      if (sit.k === 'invalido') h += '<div class="estado erro">' + svg('er') + '<span><b>Resultado suspenso:</b> ' + sit.inv.length + (sit.inv.length > 1 ? ' campos com valor inválido' : ' campo com valor inválido') + ' (etapa ' + U.ETAPAS[sit.inv[0].etapa - 1] + '). Nenhum número é mostrado até a correção.</span><button class="bt" data-corrigir="' + esc(sit.inv[0].c) + '">Ir corrigir</button></div>';
      if (sit.k === 'incompleta') h += '<div class="estado erro">' + svg('er') + '<span><b>Rede incompleta:</b> ' + esc(sit.av[0].msg) + ' Corrija o nó ou lance o trecho que falta.</span><button class="bt" data-corrigir="trechos.' + sit.av[0].i + '.' + sit.av[0].campo + '">Ir corrigir</button></div>';
      if (sit.k === 'aguarda') { var ets = []; sit.falta.forEach(function (f) { if (ets.indexOf(U.ETAPAS[f.etapa - 1]) < 0) ets.push(U.ETAPAS[f.etapa - 1]); }); h += '<div class="estado info">' + svg('in') + '<span>O resultado aparece quando o cálculo tiver todos os dados. Falta preencher: ' + ets.join(', ') + '.</span><button class="bt" data-corrigir="' + esc(sit.falta[0].c) + '">Ir preencher</button></div>'; }
      if (sit.k === 'falha') h += '<div class="estado erro">' + svg('er') + '<span><b>O cálculo não fechou:</b> ' + esc(vir(sit.msg)) + '</span></div>';
      if (sit.k === 'branco') h += '<div class="estado info">' + svg('in') + '<span>O resumo aparece aqui quando a rede tiver hidrante ligado ao reservatório e os dados das etapas 1 a ' + U.POS.hidr + ' estiverem preenchidos.</span></div>';
    }
    el.innerHTML = h;
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
      atalho = '<button type="button" class="bt lig min" data-corrigir="' + vzR[0].c + '" data-acao="red-rodape" aria-haspopup="dialog" aria-label="Abrir a válvula redutora' + (vzR.length === 1 ? ', ' + esc(nomeRed(vzR[0].c)) : '') + '">Abrir a válvula redutora</button>';
    pe.innerHTML = '<button class="bt" data-ir="etapa:' + Math.max(1, n - 1) + '"' + (n === 1 ? ' disabled' : '') + '>Voltar</button><span class="falta">' + esc(falta) + '</span>' + atalho +
      (n === U.POS.rel ? '' : '<button class="bt pri" data-acao="proximo"' + (prox ? '' : ' aria-disabled="true"') + '>Próximo: ' + U.ETAPAS[n] + '</button>');
  };
})();
