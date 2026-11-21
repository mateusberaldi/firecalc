/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.5.0, tela da etapa Rede (a 5 desde a 2.5.1): tabela de trechos com 12 colunas, cota por nó nas colunas de montante e de
 * jusante, tipo de tubo por trecho, peças em diálogo com ícones (item 5), duplicar e excluir como ícones (item 4), reordenar (item 2),
 * formato dos nomes (item 7), recomendação de lançar a rede inteira (item 9) e o desenho da rede, com o ramo do recalque fora do cálculo. */
(function () {
  'use strict';
  var U = window.FireUI, V = U.V, S = U.S, E = U.E, D = U.D, esc = U.esc, fmt = U.fmt;
  function nome(t) { return (String(t.de).trim() || '?') + '-' + (String(t.para).trim() || '?'); }
  U.nomeTrecho = nome;
  function ramoRec(F) { var r = F.recalque && F.recalque.ativo && F.recalque.no ? V.ramoRecalque(F, F.recalque.no) : null; return r && r.ok ? r : null; }
  U.ramoRec = ramoRec;

  /** 2.6.0: dados por trecho e por nó para o cartão do mouse, a planilha e os alertas. Só existe com o cálculo fechado (sit.k 'ok').
   *  Pressão por nó = M.pressoesNos, a mesma conta dos hidrantes. Trecho fora do par de cálculo não leva água no cenário (vazão 0); o ramo do recalque fica fora de tudo. */
  var AC = 'a calcular', NA = 'não se aplica';
  function dadosRede(F, sit) {
    if (!sit || sit.k !== 'ok') return null;
    var R = sit.R, ctx = R.ctx, nm = ctx.norma, M = U.M, vaz = {}, suc = {}, rr = ramoRec(F), rec = {}, lista = [], nomesNo = {}, pn = {}, d = { tr: [], nos: {}, nm: nm, alerta: false };
    if (rr) rr.idx.forEach(function (i) { rec[i] = 1; });
    [[R.par.tronco, R.par.Qt], [R.par.ramalCrit, R.par.Qcrit], [R.par.ramalOut, R.par.Qout]].forEach(function (g) { g[0].forEach(function (e) { vaz[e.t.nome] = { Q: g[1], t: e.t }; }); });
    ctx.suc.forEach(function (e) { suc[e.t.nome] = { Q: R.par.Qt, t: e.t }; });
    var limSuc = ctx.succao && ctx.succao.estado === 'negativa' ? nm.vmaxSucNeg : nm.vmaxSucPos;
    F.trechos.forEach(function (t, i) { if (!rec[i]) { nomesNo[String(t.de).trim()] = 1; nomesNo[String(t.para).trim()] = 1; } });
    try { pn = M.pressoesNos(ctx, R.par, Object.keys(nomesNo)); } catch (e) { pn = {}; }
    Object.keys(pn).forEach(function (n) {
      var x = pn[n], semP = n === 'RI';
      d.nos[n] = { z: x.z, din: semP ? null : x.din, est: semP ? null : x.est, semBomba: !semP && x.semBomba, al: !semP && (x.din > nm.pmax || (x.est !== null && x.est > nm.pmax)) };
      if (d.nos[n].al) d.alerta = true;
    });
    F.trechos.forEach(function (t, i) {
      var n = nome(t), q = vaz[n] || suc[n], r = { n: n, dn: t.dn, L: t.L, fora: !!rec[i], suc: !!suc[n] };
      if (!r.fora) {
        var Q = q ? q.Q : 0;
        r.Q = Q; r.v = q ? M.vel(Q, q.t.dint) : 0; r.hf = q ? M.J(Q, q.t.dint, q.t.C) * q.t.Lt : 0;
        r.lim = r.suc ? limSuc : nm.vmaxRede; r.vAl = r.v > r.lim;
        var nj = d.nos[String(t.para).trim()]; r.P = r.suc || !nj ? null : nj.din; r.pAl = r.P !== null && r.P > nm.pmax;
        if (r.vAl || r.pAl) d.alerta = true;
      }
      d.tr[i] = r;
    });
    return d;
  }

  /** Cartão do trecho e do nó: [título, [[rótulo, valor, alerta]]]. Sem cálculo fechado, só o que o projetista já lançou. */
  function cartaoTrecho(t, r) {
    var l = [['Diâmetro', 'DN' + t.dn], ['Comprimento', V.vazio(t.L) || isNaN(V.num(t.L)) ? 'a informar' : fmt(V.num(t.L), 2) + ' m']];
    if (r && !r.fora) l.push(['Vazão', fmt(r.Q, 1) + ' L/min'], ['Velocidade', fmt(r.v, 2) + ' m/s' + (r.vAl ? ' (limite ' + fmt(r.lim, 2) + ')' : ''), r.vAl], ['Perda de carga', fmt(r.hf, 2) + ' mca']);
    else { var tx = r ? NA : AC; l.push(['Vazão', tx], ['Velocidade', tx], ['Perda de carga', tx]); }
    return [nome(t), l];
  }
  function cartaoNo(n, F, d) {
    var x = d && d.nos[n], z = x ? x.z : F.nos[n], l = [['Cota', V.vazio(z) ? 'a informar' : fmt(V.num(z), 2) + ' m']];
    if (x && x.din !== null) l.push(['Pressão estática', x.est === null ? (x.semBomba ? AC : NA) : fmt(x.est, 1) + ' mca', x.est !== null && x.est > d.nm.pmax], ['Pressão dinâmica', fmt(x.din, 1) + ' mca' + (x.din > d.nm.pmax ? ' (limite ' + fmt(d.nm.pmax, 0) + ')' : ''), x.din > d.nm.pmax]);
    else { var tx = x ? NA : AC; l.push(['Pressão estática', tx], ['Pressão dinâmica', tx]); }
    return [n, l];
  }

  /** Planilha trecho a trecho: seis colunas, preenchida quando o cálculo fecha; ▲ no que passa do limite do estado. */
  function planilha(F, sit) {
    var d = dadosRede(F, sit), h = '<div class="rolar" tabindex="0" role="region" aria-label="Planilha da rede, trecho a trecho"><table class="tab-res"><thead><tr><th>Trecho</th><th>Diâmetro</th><th class="r">Vazão <small>(L/min)</small></th><th class="r">Velocidade <small>(m/s)</small></th><th class="r">Perda <small>(mca)</small></th><th class="r">Pressão <small>(mca, no fim do trecho)</small></th></tr></thead><tbody>';
    function c(txt, al) { return '<td class="r' + (al ? ' alerta' : '') + '">' + txt + (al ? ' <span class="al-m" aria-hidden="true">▲</span><span class="so-leitor">acima do limite</span>' : '') + '</td>'; }
    F.trechos.forEach(function (t, i) {
      var r = d && d.tr[i], ok = r && !r.fora, v0 = d ? NA : AC;
      h += '<tr' + (r && (r.vAl || r.pAl) ? ' class="al"' : '') + '><th scope="row">' + esc(nome(t)) + '</th><td>DN' + esc(t.dn) + '</td>' + c(ok ? fmt(r.Q, 1) : v0) + c(ok ? fmt(r.v, 2) : v0, ok && r.vAl) + c(ok ? fmt(r.hf, 2) : v0) + c(ok && r.P !== null ? fmt(r.P, 1) : v0, ok && r.pAl) + '</tr>';
    });
    return h + '</tbody></table></div><p class="peq">' + (d ? 'Valores do cenário de cálculo: só o par de hidrantes mais desfavorável está em uso, e o trecho que não leva água nele aparece com vazão zero.' + (d.alerta ? ' ▲ marca o que passa do limite do estado.' : '') : 'Vazão, velocidade, perda e pressão aparecem quando o cálculo do projeto fecha.') + '</p>';
  }
  U.planilhaRede = planilha;

  /** Desenho esquemático, sem escala, gerado dos trechos. Par mais desfavorável em fogo; ramo sem ligação em vermelho tracejado; ramo do recalque em cinza tracejado. */
  function arvore(F0, sit0) {
    var F = F0 || S.F, sit = sit0 || S.sit, est = V.estrutura(F), adj = V.grafo(F), filhos = {}, ori = {}, pos = {}, y = 0, vis = {}, raizes = ['RI'], hid = {}, rr = ramoRec(F), rec = {};
    if (rr) rr.idx.forEach(function (i) { rec[i] = 1; });
    F.hidrantes.forEach(function (h) { hid[h.no] = h; });
    function orienta(r) { var f = [r], m = {}; m[r] = 1; while (f.length) { var n = f.shift(); (adj[n] || []).forEach(function (a) { if (ori[a.i]) return; ori[a.i] = { m: n, j: a.n }; (filhos[n] = filhos[n] || []).push({ p: a.n }); if (!m[a.n]) { m[a.n] = 1; f.push(a.n); } }); } return m; }
    var feito = orienta('RI');
    Object.keys(adj).sort(function (a, b) { return (V.ehHid(a) ? 1 : 0) - (V.ehHid(b) ? 1 : 0) || adj[a].length - adj[b].length; }).forEach(function (n) { if (!feito[n]) { raizes.push(n); var m = orienta(n); Object.keys(m).forEach(function (k) { feito[k] = 1; }); } });
    function coloca(n, prof) { if (vis[n]) return pos[n].y; vis[n] = 1; var fs = filhos[n] || [], ys = fs.map(function (f) { return coloca(f.p, prof + 1); }); var yy = ys.length ? (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 : y++; pos[n] = { x: prof, y: yy }; return yy; }
    raizes.forEach(function (r) { if (adj[r] || r === 'RI') coloca(r, r === 'RI' ? 0 : 1); });
    var prof = 0; Object.keys(pos).forEach(function (n) { prof = Math.max(prof, pos[n].x); });
    var W = 760, dx = prof ? Math.min(200, (W - 150) / prof) : 0, dy = 78, H = Math.max(1, y) * dy + 30;
    function X(n) { return 60 + pos[n].x * dx; } function Y(n) { return 34 + pos[n].y * dy; }
    var par = {}, nomePar = '';
    if (sit.k === 'ok') { var R = sit.R; [R.par.tronco, R.par.ramalCrit, R.par.ramalOut].forEach(function (l) { l.forEach(function (e) { par[e.t.nome] = 1; }); }); nomePar = R.numeros.par; }
    var dr = dadosRede(F, sit), g = '', nos = '', hit = '', tri = function (x, y) { return '<path class="al-m" d="M' + (x - 8) + ' ' + (y + 7) + 'L' + x + ' ' + (y - 8) + 'L' + (x + 8) + ' ' + (y + 7) + 'Z" fill="var(--fc-erro)"/><text class="al-t" x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">!</text>'; };
    F.trechos.forEach(function (t, i) {
      if (!ori[i]) return; var d = ori[i].m, p = ori[i].j; if (!pos[d] || !pos[p]) return;
      var solto = !est.alc[d], noPar = par[nome(t)], cor = solto ? 'var(--fc-erro)' : (rec[i] ? 'var(--fc-texto-3)' : (noPar ? 'var(--fc-fogo)' : 'var(--fc-agua)'));
      var x1 = X(d), y1 = Y(d), x2 = X(p), y2 = Y(p), xm = x1 + 26;
      g += '<path d="M' + x1 + ' ' + y1 + 'H' + xm + 'V' + y2 + 'H' + x2 + '" fill="none" stroke="' + cor + '" stroke-width="3"' + (solto ? ' stroke-dasharray="6 5"' : (rec[i] ? ' stroke-dasharray="3 4"' : '')) + ' stroke-linejoin="round"/>' +
        '<text x="' + ((xm + x2) / 2) + '" y="' + (y2 - 9) + '" text-anchor="middle">' + esc(nome(t)) + '</text><text class="s" x="' + ((xm + x2) / 2) + '" y="' + (y2 + 17) + '" text-anchor="middle">DN' + esc(t.dn) + ', ' + esc(t.L) + ' m</text>';
      var rt = dr && dr.tr[i];
      if (rt && (rt.vAl || rt.pAl)) g += tri((xm + x2) / 2, y2 + 33);
      hit += '<path class="hit" d="M' + x1 + ' ' + y1 + 'H' + xm + 'V' + y2 + 'H' + x2 + '" data-card="' + esc(JSON.stringify(cartaoTrecho(t, rt))) + '"/>';
    });
    Object.keys(pos).forEach(function (n) {
      var x = X(n), yy = Y(n), solto = !est.alc[n];
      if (n === 'RI') nos += '<rect x="' + (x - 22) + '" y="' + (yy - 16) + '" width="44" height="32" rx="4" fill="var(--fc-info-fundo)" stroke="var(--fc-agua)" stroke-width="2"/><text x="' + x + '" y="' + (yy + 4) + '" text-anchor="middle" font-weight="700">RI</text>';
      else if (n === 'BI') nos += '<circle cx="' + x + '" cy="' + yy + '" r="16" fill="var(--fc-superficie)" stroke="var(--fc-agua)" stroke-width="2"/><text x="' + x + '" y="' + (yy + 4) + '" text-anchor="middle" font-weight="700">BI</text>';
      else if (hid[n]) { var q = sit.k === 'ok' && (sit.R.par.a.no === n || sit.R.par.b.no === n); nos += '<rect x="' + (x - 4) + '" y="' + (yy - 13) + '" width="52" height="26" rx="13" fill="' + (solto ? 'var(--fc-erro-fundo)' : (q ? 'var(--fc-fogo-fundo)' : 'var(--fc-superficie)')) + '" stroke="' + (solto ? 'var(--fc-erro)' : (q ? 'var(--fc-fogo)' : 'var(--fc-agua)')) + '" stroke-width="2"/><text x="' + (x + 22) + '" y="' + (yy + 4) + '" text-anchor="middle" font-weight="700">' + esc(n) + '</text>'; }
      else if (rr && n === F.recalque.no) nos += '<rect x="' + (x - 4) + '" y="' + (yy - 13) + '" width="52" height="26" rx="4" fill="var(--fc-superficie)" stroke="var(--fc-texto-3)" stroke-width="2" stroke-dasharray="3 3"/><text x="' + (x + 22) + '" y="' + (yy + 4) + '" text-anchor="middle" font-weight="700">' + esc(n) + '</text>';
      else nos += '<circle cx="' + x + '" cy="' + yy + '" r="7" fill="' + (solto ? 'var(--fc-erro)' : 'var(--fc-agua)') + '"/><text x="' + x + '" y="' + (yy - 14) + '" text-anchor="middle" font-weight="700">' + esc(n) + '</text>';
      var dn_ = dr && dr.nos[n];
      if (dn_ && dn_.al) nos += tri(x + (hid[n] ? 62 : 16), yy - (hid[n] ? 14 : 24));
      if (!(rr && n === F.recalque.no)) hit += '<rect class="hit" x="' + (x - 24) + '" y="' + (yy - 20) + '" width="' + (hid[n] ? 76 : 48) + '" height="40" rx="10" data-card="' + esc(JSON.stringify(cartaoNo(n, F, dr))) + '"/>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Desenho esquemático da rede, gerado dos trechos">' + g + nos + hit + '</svg>' +
      '<div class="leg"><span><i style="background:var(--fc-agua)"></i>tubo</span>' + (nomePar ? '<span><i style="background:var(--fc-fogo)"></i>' + (sit.R.numeros.jatoUnico ? 'caminho do jato (' : 'par mais desfavorável (') + esc(nomePar) + ')</span>' : '') + (rr ? '<span><i style="background:var(--fc-texto-3)"></i>tracejado cinza: ramo do recalque, fora do cálculo</span>' : '') + (est.avisos.length ? '<span><i style="background:var(--fc-erro)"></i>tracejado vermelho: sem ligação ao reservatório</span>' : '') + (dr && dr.alerta ? '<span><svg class="leg-al" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 15L8 1l7 14Z" fill="var(--fc-erro)"/></svg>acima do limite do estado</span>' : '') + '<span>RI reservatório, BI bomba, H hidrante</span></div>';
  }
  U.arvore = arvore;

  /** 2.6.0: guia de lançamento em passos numerados curtos, sem desenho. O primeiro passo muda com a rota (RI-BI com bomba, RI-A na gravidade). */
  function guiaLancamento() {
    var grav = S.F.fonte.modo === 'gravidade', passos = [
      ['Comece pela saída', grav ? 'Montante <span class="tec">RI</span> reservatório, jusante <span class="tec">A</span>: <span class="tec">RI-A</span>.' : 'Montante <span class="tec">RI</span> reservatório, jusante <span class="tec">BI</span> bomba: <span class="tec">RI-BI</span>.'],
      ['Siga a água até cada hidrante', 'Hidrantes são <span class="tec">H1</span>, <span class="tec">H2</span>...; nós onde a rede se divide são <span class="tec">A</span>, <span class="tec">B</span>, <span class="tec">C</span>...; <span class="tec">REC1</span> é o recalque. A bomba de pressurização (<span class="tec">BJ</span>) não se lança.'],
      ['O nome se forma sozinho', 'Montante e jusante dão o nome do trecho, como <span class="tec">A-H1</span>.'],
      ['A cota é do nó', 'O mesmo nó tem uma cota só, em todas as linhas em que aparece.'],
      ['Lance a rede inteira', 'Com os hidrantes de todos os pavimentos, também os de baixo.']];
    return '<section class="cartao bloco guia" id="guia-lancamento" aria-labelledby="guia-tit"><h2 class="t3" id="guia-tit">Como lançar os trechos</h2><ol class="guia-passos">' +
      passos.map(function (x) { return '<li><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('') + '</ol></section>';
  }
  /** 2.6.0: tubo padrão em 1/3 da largura e, ao lado, o guia nos 2/3 restantes. */
  function topoRede() { return '<div class="g-rd1">' + U.barraTubo() + guiaLancamento() + '</div>'; }

  var IC_MOVER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l-4 4h8zM12 21l-4-4h8zM6 11h12M6 14h12" fill="currentColor" stroke="currentColor" stroke-width="1.6"/></svg>';
  var IC_DUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  var IC_EXC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  /** Célula de cota de um nó. A cota é do nó: o mesmo nó aparece em várias linhas e todas mostram e editam o mesmo valor (F.nos). */
  function celCota(n, i, lado, vistos) {
    var F = S.F; n = String(n || '').trim();
    if (!n) return '<td class="c-cota" data-rot="Cota ' + lado + '"></td>';
    if (n === 'RI' || n === 'BI') {   /* 2.6.0: cota só leitura; o botão abre o menu do Abastecimento, onde ela é lançada */
      var bm = F.fonte.modo === 'bomba', rx = V.nivelX(F), prop = n === 'RI' && rx.ok && rx.hProp > 0, v = n === 'RI' ? (bm ? F.fonte.zX : F.nos.RI) : F.nos.BI,
        o = n === 'RI' ? (bm ? 'nível X' : prop ? 'saída na base' : 'referência') : 'eixo', onde = n === 'RI' ? (bm ? 'do nível X' : prop ? 'da saída na base do reservatório' : 'de referência do reservatório') : 'do eixo da bomba';
      return '<td class="c-cota ro" data-rot="Cota ' + lado + '"><span class="tec">' + (V.vazio(v) ? 'a informar' : fmt(V.num(v), 2)) + '</span> <small>' + o + '</small>' + (prop ? '<br><small class="carga-propria">carga própria ' + fmt(rx.hProp, 2) + ' mca</small>' : '') +
        '<br><button class="bt lig min" data-acao="abmenu" aria-label="Cota ' + onde + ': editar no menu do Abastecimento">editar</button></td>';
    }
    var c = 'nos.' + n, prim = !vistos[n], m = prim ? U.msg(c) : null, idc = U.idDe(c) + (prim ? '' : '-l' + i); vistos[n] = 1;
    var opc = !V.ehHid(n) && (V.grafo(F)[n] || []).length < 3;
    return '<td class="c-cota" data-rot="Cota ' + lado + '"><input class="campo num" id="' + idc + '" data-c="' + c + '" value="' + esc(U.pega(c) === undefined ? '' : U.pega(c)) + '"' + (opc ? ' placeholder="opcional"' : '') + ' inputmode="decimal" aria-label="' + esc((V.ehHid(n) ? 'Cota da válvula do hidrante ' : 'Cota do nó ') + n + ', em metros. Vale para todas as linhas com ' + n) + '"' + (m ? U.attrMsg(c, m) : '') + ' autocomplete="off">' + (m ? U.htmlMsg(c, m) : '') + '</td>';
  }

  /** Fator C só deste trecho: no modo personalizado, campo abaixo do tipo de tubo; no padrão, só o aviso quando o arquivo traz um C próprio. */
  function celC(t, base, nm) {
    var c = base + '.C', m = U.msg(c);
    if (S.modo === 'personalizado') return '<label class="c-proprio"><span class="peq">C só deste trecho</span><input class="campo num" id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(t.C || '') + '" placeholder="' + esc(S.F.C || '120') + '" inputmode="decimal" aria-label="Fator C só do trecho ' + esc(nm) + ', modo personalizado. Em branco vale o do tubo"' + U.attrMsg(c, m) + ' autocomplete="off">' + U.htmlMsg(c, m) + '</label>';
    return String(t.C || '').trim() ? '<small class="peq" id="c-trecho-' + esc(base.split('.')[1]) + '">C próprio: ' + esc(t.C) + '</small>' : '';
  }
  function linha(t, i, avs, dns0, vistos) {
    var F = S.F, sit = S.sit, base = 'trechos.' + i, nm = nome(t);
    var er = sit.campos.some(function (c) { return c.c.indexOf(base + '.') === 0 && c.n === 'erro'; }), vz = sit.campos.some(function (c) { return c.c.indexOf(base + '.') === 0 && c.n === 'vazio'; }), solto = avs.some(function (a) { return a.i === i && !/^A rede precisa de pelo menos um hidrante/.test(a.msg); });   /* O aviso da falta de hidrante não faz da RI-BI uma linha sem ligação */
    var lq = 0, np = 0, falta = false; Object.keys(t.pecas || {}).forEach(function (id) { var q = parseInt(t.pecas[id], 10) || 0, l = U.leq(id, t.dn); np += q; if (isNaN(l)) falta = true; else lq += q * l; }); lq += (t._o && t._o.Lvirtual) || 0;
    var dns = t.tipo ? E.dnsDoTipo(D, t.tipo) : dns0, rr = ramoRec(F), noRec = rr && rr.idx.indexOf(i) >= 0;
    var tps = D.tiposTubo.map(function (x) { return [x.id, x.curto]; }), tp0 = E.tipoTubo(D, F.tipoTubo);
    return '<tr class="' + (i === S.sel ? 'sel' : '') + (noRec ? ' rec' : '') + '" data-linha="' + i + '">' +
      '<td class="c-trecho" data-rot="Trecho"><span class="mover"><button class="bt ic" data-arrasta="' + i + '" draggable="true" title="Arrastar ou usar as setas para mover" aria-label="Mover o trecho ' + esc(nm) + '. Use as setas para cima e para baixo">' + IC_MOVER + '</button></span><b class="tec">' + esc(nm) + '</b>' + (noRec ? '<small class="peq">recalque, fora do cálculo</small>' : '') + '</td>' +
      U.celula(base + '.de', 'Nó de montante do trecho ' + nm).replace('<td>', '<td data-rot="Montante">') + celCota(t.de, i, 'montante', vistos) +
      U.celula(base + '.para', 'Nó de jusante do trecho ' + nm).replace('<td>', '<td data-rot="Jusante">') + celCota(t.para, i, 'jusante', vistos) +
      '<td data-rot="Diâmetro">' + U.escolha(base + '.dn', '', (dns.indexOf(t.dn) < 0 ? [t.dn] : []).concat(dns).map(function (d) { return [d, 'DN' + d]; }), { num: true, aria: 'Diâmetro do trecho ' + nm }) + '</td>' +
      U.celula(base + '.L', 'Comprimento do tubo em metros, trecho ' + nm, 'num').replace('<td>', '<td data-rot="Tubo (m)">') +
      '<td data-rot="Tipo tubo"><button class="bt lig min" id="' + U.idDe(base + '.tipo') + '" data-tubo="' + i + '" aria-haspopup="dialog" aria-label="Tipo de tubo do trecho ' + esc(nm) + ': ' + esc(t.tipo && E.tipoTubo(D, t.tipo) ? E.tipoTubo(D, t.tipo).nome : 'padrão do projeto, ' + (tp0 ? tp0.nome : 'a definir')) + '">' + esc(t.tipo && E.tipoTubo(D, t.tipo) ? E.tipoTubo(D, t.tipo).curto : 'Padrão') + '</button>' + (U.msg(base + '.tipo') ? U.htmlMsg(base + '.tipo', U.msg(base + '.tipo')) : '') + celC(t, base, nm) + '</td>' +
      '<td class="r" data-rot="Peças"><button class="bt lig min" data-pecas="' + i + '" aria-haspopup="dialog" aria-label="Peças do trecho ' + esc(nm) + ': ' + np + (np === 1 ? ' peça' : ' peças') + '">' + np + (np === 1 ? ' peça, ' : ' peças, ') + (falta ? 'ver' : fmt(lq, 1) + '&nbsp;m') + '</button></td>' +
      '<td data-rot="Situação">' + (er ? U.pilula('er', 'Corrigir') : solto ? U.pilula('er', 'Sem ligação') : vz ? U.pilula('in', 'Preencher') : U.pilula('ok', 'Completo')) + '</td>' +
      '<td class="c-ac" data-rot="Duplicar"><button class="bt ic" data-dup="' + i + '" title="Duplicar o trecho ' + esc(nm) + '" aria-label="Duplicar o trecho ' + esc(nm) + '">' + IC_DUP + '</button></td>' +
      '<td class="c-ac" data-rot="Excluir"><button class="bt ic perigo" data-exc="' + i + '" title="Excluir o trecho ' + esc(nm) + '" aria-label="Excluir o trecho ' + esc(nm) + '">' + IC_EXC + '</button></td></tr>';
  }

  U.telas[U.POS.rede] = function () {
    var F = S.F, sit = S.sit, cab = U.cab(U.POS.rede, 'Rede', '');
    if (!F.trechos.length) return cab + topoRede() + '<div class="vazia" style="margin-top:16px"><svg class="il" viewBox="0 0 96 96" aria-hidden="true"><rect x="8" y="36" width="22" height="24" rx="3" fill="var(--fc-info-fundo)" stroke="var(--fc-agua)" stroke-width="2"/><path d="M30 48h18v-20h22M48 48v20h22" fill="none" stroke="var(--fc-agua)" stroke-width="3" stroke-dasharray="5 4"/><rect x="70" y="20" width="18" height="16" rx="8" fill="none" stroke="var(--fc-borda-campo)" stroke-width="2"/><rect x="70" y="60" width="18" height="16" rx="8" fill="none" stroke="var(--fc-borda-campo)" stroke-width="2"/></svg>' +
      '<h2>Nenhum trecho lançado</h2><p>' + (F.fonte.modo === 'gravidade' ? 'Comece pela saída do reservatório: montante RI (reservatório), jusante A. Depois siga a água até cada hidrante. O nome do trecho se forma sozinho com os dois nós, de montante para jusante (RI-A, A-H1).' : 'Comece pela sucção: montante RI (reservatório), jusante BI (bomba). Depois siga a água até cada hidrante. O nome do trecho se forma sozinho com os dois nós, de montante para jusante (RI-BI, BI-A, A-H1).') + '</p>' +
      '<div class="acoes"><button class="bt pri" data-acao="primeiro">Lançar o primeiro trecho</button></div>' +
      '<p class="peq">Não sabe o que é nó ou trecho? <button class="bt lig min" data-acao="busca">Abrir o glossário</button></p></div>';
    var avs = sit.k === 'incompleta' ? sit.av : (sit.k === 'invalido' ? V.estrutura(F).avisos : []), dns = U.dns(), vistos = {};
    var h = cab + topoRede() + '<div class="cartao" style="margin-top:16px"><div id="aviso-cota" role="note">' + U.aviso('in', 'A cota é sempre o valor real, em relação ao nível 0,00 do projeto.') + '</div><div class="rolar"><table class="tab-rede"><thead><tr><th>Trecho <small>(automático)</small></th><th>Montante <small>(de onde vem)</small></th><th class="r">Cota montante <small>(m)</small></th><th>Jusante <small>(para onde vai)</small></th><th class="r">Cota jusante <small>(m)</small></th><th>Diâmetro</th><th class="r">Tubo <small>(m)</small></th><th>Tipo tubo</th><th class="r">Peças <small>(m equiv.)</small></th><th>Situação</th><th><span class="so-leitor">Duplicar</span></th><th><span class="so-leitor">Excluir</span></th></tr></thead><tbody>';
    F.trechos.forEach(function (t, i) { h += linha(t, i, avs, dns, vistos); });
    h += '</tbody></table></div><div class="rodape-tab"><button class="bt" data-acao="linha">Adicionar trecho</button><span class="peq" style="margin-left:auto"><span class="kbd">Enter</span> na última linha cria um trecho novo. A cota é do nó: muda em todas as linhas em que ele aparece.</span></div></div>';
    if (F.fonte.modo === 'bomba') h += '<div class="cartao bloco" id="cartao-recalque" style="margin-top:16px"><h2 class="t3">Dispositivo de recalque</h2>' + U.marcar('recalque.ativo', 'Registrar o dispositivo de recalque (entrada na fachada, no muro ou no passeio).') + '<p class="peq">Opcional. O recalque recebe água da viatura do Corpo de Bombeiros. Não é dimensionado: aqui fica só o registro do dispositivo, que vai para o relatório.</p>' + (F.recalque.ativo ? U.cartaoRecalque() : '') + '</div>';   /* 2.5.2: saiu da etapa Bomba e automação */
    h += '<div class="cartao bloco des" style="margin-top:16px"><h2 class="t3">Desenho da rede</h2><p class="peq" style="margin-bottom:8px">Esquema sem escala, para conferir a ligação dos trechos com o isométrico da prancha.</p><div id="des-rede">' + arvore() + '</div><div id="cartao-mouse" role="tooltip" hidden></div></div>';
    h += '<div class="cartao bloco" id="cartao-planilha" style="margin-top:16px"><h2 class="t3">Planilha da rede</h2><div id="plan-rede">' + planilha(F, sit) + '</div></div>';
    return h;
  };

  /* ---------- peças do trecho, em diálogo (item 5): múltipla escolha com ícone, quantidade e o Leq no DN do trecho */
  var PC = [[/^cot90/, 'M6 21V7h15'], [/^curva90/, 'M6 21v-7a8 8 0 0 1 8-8h7'], [/^(cot45|curva45)/, 'M4 21l9-9h8'], [/^entrada_normal/, 'M4 3v18M4 12h17M8 9l-4 3 4 3'], [/^entrada_borda/, 'M7 3v18M2 12h19'],
    [/^saida/, 'M3 12h13M16 6v12M19 9v6'], [/^gaveta/, 'M3 8l9 4-9 4zM21 8l-9 4 9 4zM12 12V4M9 4h6'], [/^globo/, 'M3 12h4M17 12h4M12 7a5 5 0 1 0 .01 0M12 7V3M9 3h6'], [/^angulo/, 'M3 12h7M14 16v5M12 10a3 3 0 1 0 .01 0M12 7V3'],
    [/^te_pd/, 'M2 12h20M12 12v8M6 9l3 3-3 3'], [/^te_sl/, 'M2 12h20M12 12v8M9 16l3 3 3-3'], [/^te_bil/, 'M2 12h20M12 12v8M7 9l-3 3 3 3M17 9l3 3-3 3'], [/^cruz_pd/, 'M2 12h20M12 3v18M6 9l3 3-3 3'], [/^cruz_sl/, 'M2 12h20M12 3v18M9 18l3 3 3-3'],
    [/^pe_crivo/, 'M12 2v11M7 13h10v8H7zM9 16h0M12 16h0M15 16h0M9 19h0M12 19h0M15 19h0'], [/^ret_leve/, 'M2 12h20M9 6v12l7-6z'], [/^ret_pesada/, 'M2 12h20M8 6v12l8-6zM16 6v12'], [/^luva/, 'M2 12h4M18 12h4M6 8h12v8H6z'], [/^uniao/, 'M2 12h3M19 12h3M5 8h6v8H5zM13 8h6v8h-6z']];
  U.iconePeca = function (id) { var d = ''; PC.some(function (x) { if (x[0].test(id)) { d = x[1]; return true; } return false; }); return '<svg class="ic-peca" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d || 'M4 12h16') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  function corpoPecas(i) {
    var F = S.F, t = F.trechos[i], tab = D.leq[F.tabelaLeq], ids = Object.keys(tab.pecas), soma = 0, falta = false, L = V.num(t.L), Lv = (t._o && t._o.Lvirtual) || 0, nm = nome(t);
    var h = '<p class="peq">Marque as peças do trecho e a quantidade de cada uma. O diâmetro é o da coluna Diâmetro (DN' + esc(t.dn) + '); o comprimento equivalente vem da ' + esc(tab.titulo) + '.</p><ul class="lista-pecas">';
    ids.forEach(function (id) {
      var tem = t.pecas && t.pecas[id] !== undefined, c = 'trechos.' + i + '.pecas.' + id, q = parseInt(tem ? t.pecas[id] : 0, 10), l = U.leq(id, t.dn), m = tem ? U.msg(c) : null;
      if (tem) { if (isNaN(l)) falta = true; else if (q > 0) soma += q * l; }
      h += '<li class="' + (tem ? 'marcada' : '') + '"><label class="pc"><input type="checkbox" id="pc-' + id + '" data-pc="' + id + '"' + (tem ? ' checked' : '') + '>' + U.iconePeca(id) + '<span>' + esc(U.nomePeca(id)) + '</span></label>' +
        '<span class="leq tec">' + (isNaN(l) ? 'sem dado no DN' + esc(t.dn) : fmt(l, 2) + ' m cada') + '</span>' +
        (tem ? '<input class="campo num qt" id="' + U.idDe(c) + '" data-c="' + c + '" value="' + esc(t.pecas[id]) + '" inputmode="numeric" aria-label="Quantidade de ' + esc(U.nomePeca(id)) + '"' + (m && m.n === 'erro' ? ' aria-invalid="true"' : '') + '>' : '<span class="qt"></span>') + '</li>';
    });
    h += '</ul><div class="soma-pecas" id="soma-pecas">' + somaTxt(soma, falta, L, Lv) + '</div>';
    return '<h2 id="dlg-tit">Peças do trecho ' + esc(nm) + ', DN' + esc(t.dn) + '</h2>' + h + '<div class="linha-ac" style="margin-top:16px"><button class="bt pri" data-fechar="1">Fechar</button></div>';
  }
  function somaTxt(soma, falta, L, Lv) {
    var lok = !isNaN(L) && L > 0;
    return (Lv ? '<div class="soma" style="font-weight:400"><span>Comprimento equivalente lido do arquivo</span><span>' + fmt(Lv, 2) + ' m</span></div>' : '') +
      '<div class="soma"><span>Peças</span><span>' + (falta ? 'sem dado' : fmt(soma + Lv, 1) + ' m') + '</span></div><div class="soma" style="font-weight:400"><span>Tubo</span><span>' + (lok ? fmt(L, 2) + ' m' : 'corrigir o campo') + '</span></div>' +
      '<div class="soma"><span>Comprimento total</span><span>' + (lok && !falta ? fmt(L + soma + Lv, 2) + ' m' : 'suspenso') + '</span></div>';
  }
  /* ---------- 2.5.2: tipo de tubo em menu sobreposto, como as peças, com a ficha de cada tubo (material, junta, fator C e fonte, DN com o diâmetro interno).
   * k = 'p' (tubo padrão do projeto, com o fator C e a tabela de comprimento equivalente, que saíram da etapa Sistema) ou o índice do trecho. */
  function fichaTubo(x) {
    var dn = []; E.dnsDoTipo(D, x.id).forEach(function (d) { var tb = E.tuboDoTipo(D, x.id, d); if (tb) dn.push('DN' + d + ' <small>' + fmt(tb.dint, 1) + '</small>'); });
    return '<span class="tb-n"><b>' + esc(x.nome) + '</b>' + (x.usuario ? ' <span class="pilula p-al">personalizado</span>' : '') + '</span>' +
      '<span class="tb-d">' + esc(x.material) + '; junta ' + esc(x.junta) + '. <b>Fator C ' + x.C + '</b> (' + esc(x.fonteC) + ').' + (x.template ? ' Tipo do template Revit: <span class="tec">' + esc(x.id) + '</span>.' : '') + (x.nota ? ' ' + esc(x.nota) : '') + '</span>' +
      '<span class="tb-dn tec">Diâmetro interno (mm): ' + dn.join(' · ') + '</span>';
  }
  function corpoTubo(k) {
    var F = S.F, proj = k === 'p', t = proj ? null : F.trechos[k], at = proj ? F.tipoTubo : (t.tipo || ''), tp0 = E.tipoTubo(D, F.tipoTubo), alt = E.cAlterado(F, D);
    var h = '<h2 id="dlg-tit">' + (proj ? 'Tubo padrão do projeto' : 'Tubo do trecho ' + esc(nome(t))) + '</h2><p class="peq">' + (proj ? 'Vale para todos os trechos que não tiverem um tubo próprio. O fator C acompanha o tubo escolhido.' : 'Escolha um tubo só para este trecho, ou deixe o padrão do projeto.') + '</p><ul class="lista-tubos">';
    if (!proj) h += '<li class="' + (at === '' ? 'marcada' : '') + '"><label class="tb"><input type="radio" name="tb" value=""' + (at === '' ? ' checked' : '') + '><span class="tb-f"><span class="tb-n"><b>Padrão do projeto</b></span><span class="tb-d">' + (tp0 ? esc(tp0.nome) + ', fator C ' + esc(F.C) : 'a definir') + '.</span></span></label></li>';
    D.tiposTubo.forEach(function (x) { h += '<li class="' + (at === x.id ? 'marcada' : '') + '"><label class="tb"><input type="radio" name="tb" value="' + esc(x.id) + '"' + (at === x.id ? ' checked' : '') + '><span class="tb-f">' + fichaTubo(x) + '</span></label></li>'; });
    h += '</ul>';
    if (proj) h += '<div class="form">' + U.campo('C', 'Fator C de Hazen-Williams' + (alt ? ' <span class="pilula p-al">alterado</span>' : ''), { ex: tp0 ? String(tp0.C) : '120', num: true, aj: tp0 ? 'Preenchido pelo tubo: C ' + tp0.C + ' (' + esc(tp0.fonteC) + '). Pode alterar, com a fonte.' : '' }) +
      U.escolha('tabelaLeq', 'Tabela de comprimento equivalente', Object.keys(D.leq).map(function (q) { return [q, D.leq[q].titulo]; }), { aj: 'Uma só tabela por projeto.' }) + '</div>';
    return h + '<div class="linha-ac" style="margin-top:16px"><button class="bt pri" data-fechar="1">Fechar</button></div>';
  }
  U.dialogoTubo = function (k) {
    var d = document.getElementById('dlg'); if (k !== 'p') { k = +k; if (!S.F.trechos[k]) return; }
    d.dataset.modo = 'tubos'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoTubo(k);
    d.onclick = function (ev) { if (ev.target.closest('[data-fechar]') || ev.target === d) d.close(); };
    d.oninput = null;
    d.onchange = function (ev) {
      var b = ev.target; if (d.dataset.modo !== 'tubos') return;
      if (b.name === 'tb') {
        var F = S.F; if (k === 'p') { F.tipoTubo = b.value; var tp = E.tipoTubo(D, b.value); if (tp) { F.C = String(tp.C); F.Cfonte = ''; } E.sincTubo(F, D); } else F.trechos[k].tipo = b.value;
        U.mudou(); d.innerHTML = corpoTubo(k); var r = d.querySelector('input[name="tb"]:checked'); if (r) r.focus(); return;
      }
      var idc = b.id; setTimeout(function () { if (d.dataset.modo !== 'tubos' || !d.open) return; d.innerHTML = corpoTubo(k); var e = idc && document.getElementById(idc); if (e) e.focus(); }, 0);
    };
    d.onclose = function () { d.dataset.modo = ''; var bt = document.querySelector('[data-tubo="' + k + '"]'); if (bt) bt.focus(); };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('input[name="tb"]:checked') || d.querySelector('input'); if (p1) p1.focus();
  };
  /** 2.6.0: cartão do tubo padrão do projeto, com o desenho do tubo e uma informação por linha. O botão ocupa o cartão inteiro: o clique continua abrindo a troca do tubo, do fator C e da tabela. */
  U.barraTubo = function () {
    var F = S.F, tp = E.tipoTubo(D, F.tipoTubo), alt = E.cAlterado(F, D), mc = U.msg('C'), l = function (r, v) { return '<div><dt>' + r + '</dt><dd>' + v + '</dd></div>'; };
    return '<section class="cartao bloco tubo-card" id="tubo-padrao" aria-labelledby="tubo-tit"><h2 class="t3" id="tubo-tit">Tubo padrão do projeto</h2><div class="tubo-corpo">' + FireSVG.tubo() + '<dl class="tubo-l">' +
      l('Tubo', tp ? esc(tp.nome) : 'a definir') + l('Material', tp ? esc(tp.material) : '') + l('Junta', tp ? esc(tp.junta) : '') + l('Fator C', esc(F.C) + (alt ? ' <span class="pilula p-al">alterado</span>' : '')) + l('Comprimento equivalente', 'tabela ' + esc(F.tabelaLeq)) + '</dl></div>' +
      (mc && mc.n !== 'alerta' ? '<div class="msg-er" style="max-width:none">Fator C: ' + esc(mc.msg) + '</div>' : '') +
      '<button type="button" class="bt lig min tubo-troca" data-tubo="p" aria-haspopup="dialog" aria-label="Trocar o tubo, o fator C ou a tabela. Tubo padrão atual: ' + (tp ? esc(tp.nome) : 'a definir') + ', fator C ' + esc(F.C) + '">Trocar</button></section>';
  };
  U.dialogoPecas = function (i) {
    var d = document.getElementById('dlg'); if (!S.F.trechos[i]) return;
    d.dataset.modo = 'pecas'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoPecas(i);
    d.onclick = function (ev) { if (ev.target.closest('[data-fechar]') || ev.target === d) d.close(); };
    d.onchange = function (ev) {
      var b = ev.target; if (d.dataset.modo !== 'pecas' || !b.dataset.pc) return;
      var t = S.F.trechos[i]; t.pecas = t.pecas || {}; if (b.checked) t.pecas[b.dataset.pc] = '1'; else delete t.pecas[b.dataset.pc];
      U.mudou(); d.innerHTML = corpoPecas(i); var f = b.checked ? document.getElementById(U.idDe('trechos.' + i + '.pecas.' + b.dataset.pc)) : document.getElementById('pc-' + b.dataset.pc); if (f) { f.focus(); if (f.select) f.select(); }
    };
    d.oninput = function () {
      if (d.dataset.modo !== 'pecas') return; var t = S.F.trechos[i], soma = 0, falta = false;
      Object.keys(t.pecas || {}).forEach(function (id) { var q = parseInt(t.pecas[id], 10), l = U.leq(id, t.dn); if (isNaN(l)) falta = true; else if (q > 0) soma += q * l; });
      var s = document.getElementById('soma-pecas'); if (s) s.innerHTML = somaTxt(soma, falta, V.num(t.L), (t._o && t._o.Lvirtual) || 0);
    };
    d.onclose = function () { d.dataset.modo = ''; var b = document.querySelector('[data-pecas="' + i + '"]'); if (b) b.focus(); };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('input'); if (p1) p1.focus();
  };

  /** 2.6.0: cartão ao passar o mouse (ou tocar) sobre um ponto ou trecho do Desenho da rede. Esc fecha; sair da área fecha depois de um instante, e o cartão aceita o ponteiro.
   *  Quem usa só o teclado ou o leitor de tela tem os mesmos dados na Planilha da rede. */
  var cartaoT = null;
  function cartaoMostra(el, ev) {
    var box = document.getElementById('cartao-mouse'), pai = box && box.parentNode; if (!box || !el) return;
    var dados; try { dados = JSON.parse(el.getAttribute('data-card')); } catch (e) { return; }
    clearTimeout(cartaoT);
    box.innerHTML = '<b class="cm-t">' + esc(dados[0]) + '</b><dl>' + dados[1].map(function (l) { return '<div' + (l[2] ? ' class="al"' : '') + '><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + (l[2] ? ' <span class="al-m" aria-hidden="true">▲</span><span class="so-leitor">acima do limite</span>' : '') + '</dd></div>'; }).join('') + '</dl>';
    box.hidden = false;
    var r = pai.getBoundingClientRect(), x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    x = Math.max(4, Math.min(x, r.width - box.offsetWidth - 4)); y = Math.max(4, Math.min(y, r.height - box.offsetHeight - 4));
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function cartaoEsconde(logo) {
    var box = document.getElementById('cartao-mouse'); if (!box) return;
    clearTimeout(cartaoT); if (logo) { box.hidden = true; return; }
    cartaoT = setTimeout(function () { box.hidden = true; }, 160);
  }
  document.addEventListener('pointerover', function (ev) {
    var h = ev.target.closest && ev.target.closest('#des-rede .hit'); if (h) cartaoMostra(h, ev);
    else if (ev.target.closest && ev.target.closest('#cartao-mouse')) clearTimeout(cartaoT);
  });
  document.addEventListener('pointermove', function (ev) {
    var h = ev.target.closest && ev.target.closest('#des-rede .hit'); if (h && ev.pointerType !== 'touch') cartaoMostra(h, ev);
  });
  document.addEventListener('pointerout', function (ev) {
    var t = ev.target.closest && ev.target.closest('#des-rede .hit, #cartao-mouse'); if (t) cartaoEsconde(false);
  });
  document.addEventListener('click', function (ev) {
    var h = ev.target.closest && ev.target.closest('#des-rede .hit'); if (h) cartaoMostra(h, ev); else if (!(ev.target.closest && ev.target.closest('#cartao-mouse'))) cartaoEsconde(true);
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cartaoEsconde(true); });
})();
