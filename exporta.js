/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc: exportação .xlsx com fórmulas vivas.
 * Três partes: (1) modelo da pasta de trabalho, com fórmulas em sintaxe do arquivo (nomes em inglês, vírgula);
 * (2) avaliador próprio de fórmulas, que guarda o valor de cada fórmula sem depender do motor;
 * (3) gerador ExcelJS 4.4.0. O avaliador é conferido contra o LibreOffice e contra o motor.
 * Só funções comuns: IF, IFERROR, INDEX, MATCH, SUMPRODUCT, SQRT, MAX, MIN, SUM, ABS, ROUNDDOWN, AND, OR, PI. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.FireExporta = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSAO_EXPORTA = 'E.4';
  /* 2.5.0: tipo de tubo com nome comercial; a tabela de tubos traz o D interno de cada DN do tipo do projeto */
  function tipoP(P, D) { return (D.tiposTubo || []).filter(function (x) { return x.id === P.tipoTubo; })[0] || null; }
  function nomeTuboP(P, D) { var tp = tipoP(P, D); return tp ? tp.nome : P.tubo.norma + ', ' + P.tubo.classe; }
  function tubosP(P, D) { var tp = tipoP(P, D); if (!tp) return D.tubos.filter(function (t) { return t.norma === P.tubo.norma && t.classe === P.tubo.classe; }); return D.tubos.filter(function (t) { return tp.segmentos.some(function (s) { return t.norma === s.norma && t.classe === s.classe && (!s.dns || s.dns.indexOf(t.dn) >= 0); }); }); }
  function outrosTubos(P, D) { var l = []; P.trechos.forEach(function (t) { if (t.tipo && t.tipo !== P.tipoTubo) { var tp = (D.tiposTubo || []).filter(function (x) { return x.id === t.tipo; })[0]; l.push(t.nome + ': ' + (tp ? tp.nome : t.tipo)); } }); return l; }
  // ------------------------------------------------------------ endereços e folhas
  function L(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function A(c, r) { return L(c) + r; }
  function Ab(c, r) { return '$' + L(c) + '$' + r; }
  function cl(sh, c, r) { return sh + '!' + Ab(c, r); }
  function rg(sh, c1, r1, c2, r2) { return sh + '!' + Ab(c1, r1) + ':' + Ab(c2, r2); }
  function Folha(nome) { this.nome = nome; this.c = {}; this.w = {}; this.nota = {}; }
  Folha.prototype.s = function (c, r, v, est) {
    var x = { co: c, ro: r, est: est || null };
    if (v !== null && typeof v === 'object' && v.f !== undefined) x.f = v.f; else x.v = v;
    this.c[A(c, r)] = x; return this;
  };
  Folha.prototype.lin = function (c, r, arr, est) { for (var i = 0; i < arr.length; i++) this.s(c + i, r, arr[i], est); };

  // ------------------------------------------------------------ avaliador de fórmulas
  function XlErr(code) { this.code = code; }
  var cacheAst = {};
  function tokeniza(s) {
    var t = [], i = 0, m;
    while (i < s.length) {
      var ch = s[i];
      if (ch === ' ') { i++; continue; }
      if (ch === '"') { var j = i + 1, str = ''; while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { str += '"'; j += 2; continue; } break; } str += s[j++]; } t.push({ k: 's', v: str }); i = j + 1; continue; }
      var rest = s.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))) { t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^([A-Za-z][A-Za-z0-9.]*)\(/.exec(rest))) { t.push({ k: 'f', v: m[1].toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^(TRUE|FALSE)\b/.exec(rest))) { t.push({ k: 'b', v: m[1] === 'TRUE' }); i += m[0].length; continue; }
      if ((m = /^(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/.exec(rest))) {
        t.push({ k: 'r', sh: m[1] || m[2] || null, c1: m[3], r1: +m[4], c2: m[5] || null, r2: m[6] ? +m[6] : null }); i += m[0].length; continue;
      }
      if ((m = /^(<>|<=|>=)/.exec(rest))) { t.push({ k: 'o', v: m[1] }); i += 2; continue; }
      if ('+-*/^&=<>(),'.indexOf(ch) >= 0) { t.push({ k: 'o', v: ch }); i++; continue; }
      throw new Error('Fórmula com caractere inesperado "' + ch + '" em: ' + s);
    }
    return t;
  }
  function parse(src) {
    if (cacheAst[src]) return cacheAst[src];
    var t = tokeniza(src), p = 0;
    function pk() { return t[p]; }
    function op(v) { return pk() && pk().k === 'o' && pk().v === v; }
    function cmp() { var a = cat(); while (pk() && pk().k === 'o' && ['=', '<>', '<', '>', '<=', '>='].indexOf(pk().v) >= 0) { var o = t[p++].v; a = { t: 'b', o: o, a: a, b: cat() }; } return a; }
    function cat() { var a = add(); while (op('&')) { p++; a = { t: 'b', o: '&', a: a, b: add() }; } return a; }
    function add() { var a = mul(); while (op('+') || op('-')) { var o = t[p++].v; a = { t: 'b', o: o, a: a, b: mul() }; } return a; }
    function mul() { var a = pot(); while (op('*') || op('/')) { var o = t[p++].v; a = { t: 'b', o: o, a: a, b: pot() }; } return a; }
    function pot() { var a = una(); while (op('^')) { p++; a = { t: 'b', o: '^', a: a, b: una() }; } return a; }
    function una() { if (op('-')) { p++; return { t: 'u', a: una() }; } if (op('+')) { p++; return una(); } return pri(); }
    function pri() {
      var k = t[p++];
      if (!k) throw new Error('Fórmula incompleta: ' + src);
      if (k.k === 'n') return { t: 'n', v: k.v };
      if (k.k === 's') return { t: 's', v: k.v };
      if (k.k === 'b') return { t: 'n', v: k.v };
      if (k.k === 'r') return { t: 'r', x: k };
      if (k.k === 'f') {
        var args = [];
        if (op(')')) { p++; return { t: 'f', n: k.v, a: args }; }
        for (;;) { args.push(cmp()); if (op(',')) { p++; continue; } if (op(')')) { p++; break; } throw new Error('Esperado , ou ) em: ' + src); }
        return { t: 'f', n: k.v, a: args };
      }
      if (k.k === 'o' && k.v === '(') { var e = cmp(); if (!op(')')) throw new Error('Esperado ) em: ' + src); p++; return e; }
      throw new Error('Fórmula inválida: ' + src);
    }
    var ast = cmp(); if (p < t.length) throw new Error('Sobra de fórmula: ' + src);
    return (cacheAst[src] = ast);
  }
  function colNum(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + s.charCodeAt(i) - 64; return n; }
  function num(x) {
    if (x === null || x === undefined) return 0; if (typeof x === 'boolean') return x ? 1 : 0;
    if (typeof x === 'string') { if (x === '') return 0; var v = Number(x); if (isNaN(v)) throw new XlErr('#VALUE!'); return v; }
    if (Array.isArray(x)) throw new XlErr('#VALUE!'); return x;
  }
  function lift(f) {
    return function (x, y) {
      var ax = Array.isArray(x), ay = Array.isArray(y);
      if (!ax && !ay) return f(x, y);
      var n = ax ? x.length : y.length, m = ax ? x[0].length : y[0].length, o = [];
      if (ax && ay && (x.length !== y.length || x[0].length !== y[0].length)) throw new XlErr('#VALUE!');
      for (var i = 0; i < n; i++) { o[i] = []; for (var j = 0; j < m; j++) o[i][j] = f(ax ? x[i][j] : x, ay ? y[i][j] : y); }
      return o;
    };
  }
  var OPS = {
    '+': lift(function (a, b) { return num(a) + num(b); }), '-': lift(function (a, b) { return num(a) - num(b); }),
    '*': lift(function (a, b) { return num(a) * num(b); }),
    '/': lift(function (a, b) { var d = num(b); if (d === 0) throw new XlErr('#DIV/0!'); return num(a) / d; }),
    '^': lift(function (a, b) { var r = Math.pow(num(a), num(b)); if (isNaN(r)) throw new XlErr('#NUM!'); return r; }),
    '&': lift(function (a, b) { return String(a === null ? '' : a) + String(b === null ? '' : b); }),
    '=': lift(function (a, b) { return eq(a, b); }), '<>': lift(function (a, b) { return !eq(a, b); }),
    '<': lift(function (a, b) { return cmpv(a, b) < 0; }), '>': lift(function (a, b) { return cmpv(a, b) > 0; }),
    '<=': lift(function (a, b) { return cmpv(a, b) <= 0; }), '>=': lift(function (a, b) { return cmpv(a, b) >= 0; })
  };
  function eq(a, b) { if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase(); if (a === null) a = typeof b === 'string' ? '' : 0; if (b === null) b = typeof a === 'string' ? '' : 0; return a === b; }
  function cmpv(a, b) { if (typeof a === 'string' && typeof b === 'string') { a = a.toLowerCase(); b = b.toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; } a = num(a); b = num(b); return a < b ? -1 : a > b ? 1 : 0; }
  function plano(x, soNum) {
    var o = [];
    (function f(v) { if (Array.isArray(v)) v.forEach(f); else if (!soNum || typeof v === 'number') o.push(v); else if (!soNum || (v !== null && typeof v !== 'string')) o.push(v); })(x);
    return o;
  }

  // nome da bomba como está no catálogo do fabricante: "Schneider BPI-21 R 2 1/2, 5 cv, rotor 146"
  function rotuloBomba(b, pe) {
    if (!b) return '';
    var m = String(b.modelo || b.id || ''), nome = m;
    var t = (b.usuario ? (b.fabricante || '') + ' ' : (b.fabricante ? b.fabricante + ' ' : '')) + nome;
    if (b.cv) t += ', ' + String(b.cv).replace('.', ',') + ' cv'; if (b.rotorTxt || b.rotor) t += ', rotor ' + (b.rotorTxt || b.rotor);
    if (pe) t += ', potência no eixo de ' + pe.P.toFixed(1).replace('.', ',') + ' ' + pe.un + ' na vazão nominal (lida da curva do catálogo; não é a potência do motor)';
    return t + (b.fonte ? '; ' + b.fonte : '; catálogo Schneider 2025, apoio');
  }
  function avalia(W) {
    var por = {}; W.folhas.forEach(function (f) { por[f.nome] = f; });
    function valorCelula(sh, addr) {
      var f = por[sh]; if (!f) throw new Error('Folha inexistente: ' + sh);
      var c = f.c[addr]; if (!c) return null;
      if (c.f === undefined) return c.v;
      if (c.r !== undefined) { if (c.r instanceof XlErr) throw c.r; return c.r; }
      if (c.calc) throw new Error('Referência circular em ' + sh + '!' + addr);
      c.calc = 1;
      try { c.r = ev(parse(c.f), sh); } catch (e) { if (e instanceof XlErr) { c.r = e; c.calc = 0; throw e; } throw e; }
      c.calc = 0;
      if (Array.isArray(c.r)) c.r = c.r[0][0];
      return c.r;
    }
    function ev(n, sh) {
      switch (n.t) {
        case 'n': case 's': return n.v;
        case 'u': return OPS['-'](0, ev(n.a, sh));
        case 'b': return OPS[n.o](ev(n.a, sh), ev(n.b, sh));
        case 'r': {
          var x = n.x, s = x.sh || sh;
          if (!x.c2) return valorCelula(s, x.c1 + x.r1);
          var c1 = colNum(x.c1), c2 = colNum(x.c2), o = [];
          for (var r = x.r1; r <= x.r2; r++) { var lin = []; for (var c = c1; c <= c2; c++) lin.push(valorCelula(s, L(c) + r)); o.push(lin); }
          return o;
        }
        case 'f': return fn(n, sh);
      }
      throw new Error('nó desconhecido');
    }
    function fn(n, sh) {
      var a = n.a, nome = n.n;
      var E = function (i) { return ev(a[i], sh); };
      switch (nome) {
        case 'IF': { var c = E(0); if (Array.isArray(c)) throw new XlErr('#VALUE!'); var tv = typeof c === 'string' ? (function () { throw new XlErr('#VALUE!'); })() : num(c) !== 0; return tv ? E(1) : (a.length > 2 ? E(2) : false); }
        case 'IFERROR': try { return E(0); } catch (e) { if (e instanceof XlErr) return E(1); throw e; }
        case 'AND': return plano(a.map(function (_, i) { return E(i); })).every(function (v) { return num(v) !== 0; });
        case 'OR': return plano(a.map(function (_, i) { return E(i); })).some(function (v) { return num(v) !== 0; });
        case 'SQRT': { var v = num(E(0)); if (v < 0) throw new XlErr('#NUM!'); return Math.sqrt(v); }
        case 'ABS': return Math.abs(num(E(0)));
        case 'PI': return Math.PI;
        case 'ROUNDDOWN': { var d = Math.pow(10, a.length > 1 ? num(E(1)) : 0), x = num(E(0)); return Math.trunc(x * d) / d; }
        case 'MAX': case 'MIN': case 'SUM': {
          var vs = []; a.forEach(function (_, i) { var v = E(i); if (Array.isArray(v)) plano(v).forEach(function (q) { if (typeof q === 'number') vs.push(q); }); else vs.push(num(v)); });
          if (nome === 'SUM') return vs.reduce(function (s, q) { return s + q; }, 0);
          if (!vs.length) return 0; return nome === 'MAX' ? Math.max.apply(null, vs) : Math.min.apply(null, vs);
        }
        case 'SUMPRODUCT': {
          var arrs = a.map(function (_, i) { var v = E(i); return Array.isArray(v) ? plano(v) : [v]; });
          var len = arrs[0].length; arrs.forEach(function (q) { if (q.length !== len) throw new XlErr('#VALUE!'); });
          var s = 0; for (var i = 0; i < len; i++) { var p = 1; arrs.forEach(function (q) { p *= (typeof q[i] === 'number' ? q[i] : (typeof q[i] === 'boolean' ? (q[i] ? 1 : 0) : 0)); }); s += p; } return s;
        }
        case 'MATCH': {
          var v = E(0), arr = plano(E(1)), t = a.length > 2 ? num(E(2)) : 1, k;
          if (t === 0) { for (k = 0; k < arr.length; k++) if (eq(arr[k], v) && (typeof arr[k] === typeof v)) return k + 1; throw new XlErr('#N/A'); }
          var ult = -1; for (k = 0; k < arr.length; k++) { if (typeof arr[k] === 'number' && arr[k] <= num(v)) ult = k; else break; }
          if (ult < 0) throw new XlErr('#N/A'); return ult + 1;
        }
        case 'INDEX': {
          var m = E(0), r = a.length > 1 ? num(E(1)) : 1, c = a.length > 2 ? num(E(2)) : null;
          if (!Array.isArray(m)) return m;
          if (c === null) { if (m.length === 1) { c = r; r = 1; } else c = 1; }
          if (r === 0) { if (c < 1 || c > m[0].length) throw new XlErr('#REF!'); return m.map(function (l) { return [l[c - 1]]; }); }
          if (r < 1 || r > m.length || c < 1 || c > m[0].length) throw new XlErr('#REF!');
          return m[r - 1][c - 1];
        }
      }
      throw new Error('Função não suportada no avaliador: ' + nome);
    }
    W.ev = function (src, sh) { var v = ev(parse(src), sh || 'Capa'); return Array.isArray(v) ? v[0][0] : v; };
    W.folhas.forEach(function (f) { Object.keys(f.c).forEach(function (k) { var c = f.c[k]; if (c.f !== undefined) { try { valorCelula(f.nome, k); } catch (e) { if (!(e instanceof XlErr)) throw e; } } }); });
    return W;
  }

  // ------------------------------------------------------------ modelo da pasta de trabalho
  function interpF(x, xs, ys, n) {
    var i = 'MIN(MAX(IFERROR(MATCH(' + x + ',' + xs + ',1),1),1),' + (n - 1) + ')';
    return 'INDEX(' + ys + ',' + i + ')+(INDEX(' + ys + ',' + i + '+1)-INDEX(' + ys + ',' + i + '))*(' + x + '-INDEX(' + xs + ',' + i + '))/(INDEX(' + xs + ',' + i + '+1)-INDEX(' + xs + ',' + i + '))';
  }
  var HW = '605E4';

  function modelo(proj0, D, R, M, opc) {
    opc = opc || {};
    var ctx = R.ctx, P = ctx.proj, N = ctx.norma, par = R.par, num0 = R.numeros, modo = ctx.modo, grafo = ctx.grafo;
    function redDe(o) { return o && o.redutora && typeof o.redutora.P === 'number' && isFinite(o.redutora.P) ? o.redutora : null; }   // válvula redutora de pressão no ponto (mesma regra do motor)
    var W = { folhas: [], chaves: {}, aviso: [] }, FO = {};
    ['Resumo', 'Memorial_descritivo', 'Memorial', 'Passo_a_passo', 'Capa', 'Premissas', 'Trechos', 'Topologia', 'Pares', 'Hipotese', 'Bomba', 'Jockey', 'Reservatorio', 'Verificacoes', 'Tabelas_norma'].forEach(function (n) { var f = new Folha(n); FO[n] = f; W.folhas.push(f); });
    var tab = P.tabelaLeq, jatos = ctx.jatos, nJ = jatos.length;
    var temB = jatos.some(function (j) { return j.caminho === 'B'; });
    var bomb = P.bomba, jk = P.jockey, bombaModo = modo === 'bomba';
    var npCurva = !!(num0.NPSHrCurva && bomb && bomb.npsh), temNpshr = !!(bomb && (bomb.npshr !== undefined || npCurva));   // NPSH requerido lido da curva do catálogo (KSB) ou digitado
    var UN = !!num0.jatoUnico;   // hidrante único de expedição simples em SP: um jato (o segundo jato da linha do par fica com vazão zero)
    var RT_ = num0.retorno && !(num0.retorno.erros && num0.retorno.erros.length) && !num0.retorno.semCruzamento ? num0.retorno : null;   // ramal de retorno para testes (PR)

    // ===== Tabelas_norma
    var T = FO.Tabelas_norma, tr = 1;
    T.s(1, tr++, 'Tabelas da norma e da base técnica (apoio e fontes da verdade rotulados)', 'tit');
    T.s(1, tr, 'Comprimentos equivalentes, tabela ' + tab + ': ' + D.leq[tab].titulo + ' (' + D.leq[tab].fonte + ')', 'tx'); tr += 2;
    var pecasIds = Object.keys(D.leq[tab].pecas), dns = Object.keys(D.leq[tab].pecas[pecasIds[0]].dn).map(Number).sort(function (a, b) { return a - b; });
    var LQ = { hr: tr, r1: tr + 1, r2: tr + pecasIds.length, c1: 3, c2: 2 + dns.length };
    T.s(1, tr, 'Peça (id)', 'cab'); T.s(2, tr, 'Descrição', 'cab'); dns.forEach(function (d, i) { T.s(3 + i, tr, d, 'cab'); }); tr++;
    pecasIds.forEach(function (id) { var p = D.leq[tab].pecas[id]; T.s(1, tr, id, 'tx'); T.s(2, tr, p.nome, 'tx'); dns.forEach(function (d, i) { var v = p.dn[String(d)]; T.s(3 + i, tr, v === undefined ? null : v, 'in'); }); tr++; });
    tr++;
    var LQID = rg('Tabelas_norma', 1, LQ.r1, 1, LQ.r2), LQDN = rg('Tabelas_norma', LQ.c1, LQ.hr, LQ.c2, LQ.hr), LQM = rg('Tabelas_norma', LQ.c1, LQ.r1, LQ.c2, LQ.r2);
    // tubos
    T.s(1, tr++, 'Tubos: ' + nomeTuboP(P, D) + ' (D interno cadastrado; nunca digitado)' + (outrosTubos(P, D).length ? '. Trechos com outro tubo, com o D interno na aba Trechos: ' + outrosTubos(P, D).join('; ') : ''), 'tx');
    var tubosL = tubosP(P, D);
    var TB = { r1: tr + 1, r2: tr + tubosL.length };
    ['DN', 'D externo (mm)', 'Parede (mm)', 'D interno (mm)', 'Rosca', 'Fonte'].forEach(function (h, i) { T.s(1 + i, tr, h, 'cab'); }); tr++;
    tubosL.forEach(function (t) { T.lin(1, tr, [t.dn, t.dext, t.parede, t.dint, t.rosca, t.fonte], 'in'); tr++; });
    tr++;
    var TBDN = rg('Tabelas_norma', 1, TB.r1, 1, TB.r2), TBDI = rg('Tabelas_norma', 4, TB.r1, 4, TB.r2);
    // tipos (Tabela 2)
    T.s(1, tr++, N.nome + ': tipos de sistema (Tabela 2 da IT 22 em SP; Tabela 1 da NPT 022 no PR)', 'tx');
    ['Tipo', 'Q mín. (L/min)', 'P mín. (mca)', 'Expedições', 'Kv = Q/raiz(P)'].forEach(function (h, i) { T.s(1 + i, tr, h, 'cab'); }); tr++;
    var TP = { r1: tr, r2: tr + N.tipos.length - 1 };
    N.tipos.forEach(function (t) { T.lin(1, tr, [t.id, t.Q, t.P, t.exp], 'in'); T.s(5, tr, { f: 'B' + tr + '/SQRT(C' + tr + ')' }, 'fo'); tr++; });
    tr++;
    var TPID = rg('Tabelas_norma', 1, TP.r1, 1, TP.r2), TPQ = rg('Tabelas_norma', 2, TP.r1, 2, TP.r2), TPP = rg('Tabelas_norma', 3, TP.r1, 3, TP.r2), TPK = rg('Tabelas_norma', 5, TP.r1, 5, TP.r2);
    // RTI
    T.s(1, tr++, 'Reserva de incêndio (Tabela 3 da IT 22; Tabela 4 da NPT 022): RTI em m³ por coluna e faixa de área', 'tx');
    T.s(1, tr, 'Coluna', 'cab'); T.s(2, tr, 'Tipo', 'cab'); N.faixas.forEach(function (f, i) { T.s(3 + i, tr, f, 'cab'); }); tr++;
    var RT = {}; Object.keys(N.rti).forEach(function (k) { RT[k] = tr; T.s(1, tr, k, 'tx'); T.s(2, tr, N.rti[k].tipo, 'tx'); N.rti[k].rti.forEach(function (v, i) { T.s(3 + i, tr, v, 'in'); }); tr++; });
    tr++;
    // ambiente
    T.s(1, tr++, 'Pressão atmosférica (Azevedo Netto, Tabela 11-1) e pressão de vapor (Quadro 1.7)', 'tx');
    var AM = D.ambiente, nA = AM.atm.alt.length, nV = AM.vapor.T.length;
    T.s(1, tr, 'Altitude (m)', 'cab'); T.s(2, tr, 'Patm (mca)', 'cab'); T.s(4, tr, 'Temperatura (°C)', 'cab'); T.s(5, tr, 'Pvap (mca)', 'cab'); tr++;
    var AR1 = tr; for (var i = 0; i < Math.max(nA, nV); i++) { if (i < nA) { T.s(1, tr, AM.atm.alt[i], 'in'); T.s(2, tr, AM.atm.mca[i], 'in'); } if (i < nV) { T.s(4, tr, AM.vapor.T[i], 'in'); T.s(5, tr, AM.vapor.mca[i], 'in'); } tr++; }
    var AA = rg('Tabelas_norma', 1, AR1, 1, AR1 + nA - 1), AP = rg('Tabelas_norma', 2, AR1, 2, AR1 + nA - 1), AT = rg('Tabelas_norma', 4, AR1, 4, AR1 + nV - 1), AV = rg('Tabelas_norma', 5, AR1, 5, AR1 + nV - 1);
    T.w = { 1: 18, 2: 40 };

    // ===== Premissas
    var S = FO.Premissas, pr = 1, PR = {};
    S.s(1, pr++, 'Premissas do projeto (azul = entrada; preto = fórmula; cinza = valor do motor)', 'tit');
    function pe(key, rot, v, est, un, fonte) { S.s(1, pr, rot, 'tx'); S.s(2, pr, v, est); S.s(3, pr, un || '', 'tx'); S.s(4, pr, fonte || '', 'tx'); PR[key] = cl('Premissas', 2, pr); pr++; }
    pe('nome', 'Projeto', (P.meta && P.meta.nome) || P.nome || 'Projeto', 'tx');
    pe('norma', 'Norma', P.norma + ' (' + N.nome + ')', 'tx');
    pe('tabLeq', 'Tabela de comprimento equivalente (uma por projeto)', tab, 'tx', '', D.leq[tab].fonte);
    pe('tubo', 'Tubo do projeto', nomeTuboP(P, D), 'tx');
    pe('C', 'Coeficiente C de Hazen-Williams', P.C, 'in', '', 'IT 22, Tabela 1');
    pe('tipo', 'Tipo de sistema', ctx.tipo.id, 'tx', '', 'IT 22, Tabelas 2 e 3');
    // 2.2: dados do esguicho e da mangueira. Sem alteração, as três linhas seguem a tabela da norma por fórmula, como antes; valor alterado entra como dado digitado, com a fonte.
    var LN = num0.lancamento || M.dadosLancamento(P, N, ctx.tipo), LA = {}, brn = function (v, d) { return typeof v === 'number' ? parseFloat(v.toPrecision(12)).toFixed(d === undefined ? 2 : d).replace('.', ',') : String(v); }; LN.alterados.forEach(function (a) { LA[a.campo] = a; });
    var TABN = P.norma === 'SP' ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1', PARANA = N.pressaoNo === 'esguicho';
    function fonteAlt(a) { return 'ALTERADO pelo projetista; ' + TABN + ': ' + a.oficial + (a.fonte ? '; fonte: ' + a.fonte : ''); }   /* Fonte só quando informada */
    if (LA.Q) pe('Qt0', 'Q mínima por jato (alterada)', LN.Q, 'in', 'L/min', fonteAlt(LA.Q)); else pe('Qt0', 'Q mínima por jato', { f: 'INDEX(' + TPQ + ',MATCH(' + 'B' + (pr - 1) + ',' + TPID + ',0))' }, 'fo', 'L/min');
    if (LA.P) pe('Pt0', PARANA ? 'P mínima por jato, na ponta do esguicho (alterada)' : 'P mínima por jato, pressão na válvula (alterada)', LN.P, 'in', 'mca', fonteAlt(LA.P)); else pe('Pt0', 'P mínima por jato (pressão na válvula)', { f: 'INDEX(' + TPP + ',MATCH(B' + (pr - 2) + ',' + TPID + ',0))' }, 'fo', 'mca');
    if (LA.Q || LA.P) pe('Kvt', 'Kv = Q mín. / raiz(P mín.), com os valores adotados', { f: PR.Qt0 + '/SQRT(' + PR.Pt0 + ')' }, 'fo', 'L/min/mca^0,5', 'Derivado dos valores adotados'); else pe('Kvt', 'Kv do tipo = Q mín. / raiz(P mín.)', { f: 'INDEX(' + TPK + ',MATCH(B' + (pr - 3) + ',' + TPID + ',0))' }, 'fo', 'L/min/mca^0,5', 'Derivado da Tabela 2');
    if (temB && !PARANA) pe('piso', 'Piso de pressão no esguicho', N.pisoEsguicho || 0, 'in', 'mca', 'NPT 022, Tabela 1 (PR); zero em SP');
    if (PARANA) {
      var JP = jatos.filter(function (j) { return j.parana; })[0], PP = JP ? JP.ponto : null;
      pe('piso', 'Pressão mínima na ponta do esguicho', LN.P, 'in', 'mca', LA.P ? fonteAlt(LA.P) : 'NPT 022, Tabela 1, nota 4');
      if (PP) {
        pe('PeMin', 'Pressão de entrada mínima do esguicho (valor do FireCalc)', PP.PeMin, 'mo', 'mca', 'a maior entre a da curva do fabricante para a vazão (' + brn(PP.PeQ, 2) + ') e a que deixa a pressão mínima na ponta (' + brn(PP.PeP, 2) + ')');
        pe('PeProj', 'Pressão de projeto na entrada do esguicho' + (PP.informado ? ' (informada)' : ''), PP.P, PP.informado ? 'in' : 'mo', 'mca', PP.informado ? 'INFORMADA pelo projetista' + (LN.fontePentrada ? '; fonte: ' + LN.fontePentrada : '') : 'igual à mínima');
        pe('QProj', 'Vazão no ponto de projeto (curva do fabricante; valor do FireCalc)', PP.Q, 'mo', 'L/min', JP.esguicho);
        if (PP.razao) { pe('razao', 'Pressão na ponta / pressão na entrada do esguicho', PP.razao, 'in', '', PP.fonte); pe('PPonta', 'Pressão na ponta do esguicho no ponto de projeto', { f: PR.razao + '*' + PR.PeProj }, 'fo', 'mca', 'NPT 022, Tabela 1, nota 4: mínimo de ' + brn(LN.P, 0) + ' mca'); }
        else pe('PPonta', 'Pressão na ponta do esguicho', 'sem dado na base para este esguicho: comprovar pelo catálogo', 'tx', '', 'NPT 022, Tabela 1, nota 4');
      }
    }
    ['mangueiraDN', 'Lmang', 'alcance'].forEach(function (k) { var R0 = { mangueiraDN: ['Diâmetro da mangueira', 'mm'], Lmang: ['Comprimento da mangueira', 'm'], alcance: ['Alcance exigido do jato', 'm'] }[k]; if (LA[k]) pe('l_' + k, R0[0] + ' (alterado)', LN[k], 'in', R0[1], fonteAlt(LA[k])); });
    pe('alt', 'Altitude', P.ambiente ? P.ambiente.altitude : 0, 'in', 'm');
    pe('temp', 'Temperatura da água', P.ambiente ? P.ambiente.temperatura : 20, 'in', '°C');
    pe('Patm', 'Pressão atmosférica local', { f: interpF(PR.alt, AA, AP, nA) }, 'fo', 'mca', 'Azevedo Netto, Tabela 11-1 (interpolação linear)');
    pe('Pvap', 'Pressão de vapor da água', { f: interpF(PR.temp, AT, AV, nV) }, 'fo', 'mca', 'Azevedo Netto, Quadro 1.7 (interpolação linear)');
    pe('zX', 'Cota do nível mínimo X', P.fonte && P.fonte.zX !== undefined ? P.fonte.zX : 0, 'in', 'm');
    if (P.fonte && P.fonte.modo !== 'bomba' && P.fonte.hProp > 0) pe('hProp', 'Carga própria do reservatório (descida interna até a saída na base)', P.fonte.hProp, 'in', 'm');   // 2.6.0
    pe('zCheio', 'Cota do nível cheio', P.fonte && P.fonte.zCheio !== undefined ? P.fonte.zCheio : 0, 'in', 'm');
    pe('saidas', 'Saídas (expedições) do sistema', P.saidas || P.hidrantes.length, 'in');
    pr++;
    // nós
    S.s(1, pr, 'Nó', 'cab'); S.s(2, pr, 'Cota (m)', 'cab'); pr++;
    var nosN = Object.keys(P.nos); grafo.nos.forEach(function (n) { if (nosN.indexOf(n) < 0) nosN.push(n); });
    var ND = { r1: pr, r2: pr + nosN.length - 1 };
    nosN.forEach(function (n) { S.s(1, pr, n, 'tx'); S.s(2, pr, P.nos[n] ? P.nos[n].z : 0, 'in'); if (!P.nos[n]) S.s(3, pr, 'sem cota no projeto: 0 adotado, como no motor', 'tx'); pr++; });
    var NODN = rg('Premissas', 1, ND.r1, 1, ND.r2), NODZ = rg('Premissas', 2, ND.r1, 2, ND.r2);
    function zNo(n) { return 'INDEX(' + NODZ + ',MATCH("' + n + '",' + NODN + ',0))'; }
    function zNoR(ref) { return 'INDEX(' + NODZ + ',MATCH(' + ref + ',' + NODN + ',0))'; }
    pr++;
    // jatos
    S.s(1, pr++, 'Jatos (um por expedição; tipo 5 gera dois por hidrante)', 'tx');
    var JH = ['Jato', 'Hidrante', 'Nó', 'Cota do nó (m)', 'Caminho', 'Q mín. (L/min)', 'P mín. (mca)', 'Kv', 'P esguicho (mca)', 'J mangueira (m/m)', 'L mangueira (m)', 'P na válvula a Q mín. (mca)', 'Altura da válvula (m)'];
    JH.forEach(function (h, i) { S.s(1 + i, pr, h, 'cab'); }); pr++;
    var JR = pr;
    jatos.forEach(function (j) {
      var r = pr++, h = j.hid, isB = j.caminho === 'B';
      S.s(1, r, j.id, 'tx'); S.s(2, r, h.id, 'tx'); S.s(3, r, j.no, 'tx'); S.s(4, r, { f: zNoR('C' + r) }, 'fo'); S.s(5, r, j.caminho, 'tx');
      if (!isB) {
        S.s(6, r, { f: PR.Qt0 }, 'fo'); S.s(7, r, { f: PR.Pt0 }, 'fo'); S.s(8, r, { f: PR.Kvt }, 'fo'); S.s(12, r, { f: 'G' + r }, 'fo');
      } else {
        var dnm = h.mangueiraDN || LN.mangueiraDN, Lm = h.Lmang || LN.Lmang;
        S.s(6, r, j.Qmin, 'mo'); S.s(7, r, j.Pmin, 'mo'); S.s(9, r, j.ponto.P, 'mo'); S.s(10, r, M.mangueiraJ(D, dnm, j.Qmin), 'mo'); S.s(11, r, Lm, 'in');
        S.s(12, r, { f: j.parana ? 'I' + r + '+J' + r + '*K' + r : 'MAX(' + PR.piso + ',I' + r + ')+J' + r + '*K' + r }, 'fo');
      }
      S.s(13, r, h.alturaValvula === undefined ? null : h.alturaValvula, 'in');
    });
    var JF = pr - 1; S.w = { 1: 46, 2: 28, 3: 10, 4: 14, 12: 22 };
    function JC(c, i) { return cl('Premissas', c, JR + i); }

    // ===== Trechos e Topologia
    var TR = FO.Trechos, TO = FO.Topologia;
    var usados = []; P.trechos.forEach(function (t) { Object.keys(t.pecas || {}).forEach(function (id) { if (usados.indexOf(id) < 0) usados.push(id); }); });
    usados.sort(function (a, b) { return pecasIds.indexOf(a) - pecasIds.indexOf(b); });
    var np = usados.length, cQ1 = 7, cL1 = 7 + np, cLv = 7 + 2 * np, cLt = cLv + 1, cK = cLt + 1, cQ = cK + 1, cJ = cQ + 1, cHf = cJ + 1, cV = cHf + 1;
    var tres = grafo.tr, naTopo = {}, caminhos = jatos.map(function (j) { return grafo.caminho(j.no) || []; });
    caminhos.forEach(function (c) { c.forEach(function (e) { naTopo[e.t.nome] = true; }); });
    var arv = tres.filter(function (t) { return naTopo[t.nome] || ctx.suc.every(function (e) { return e.t.nome !== t.nome; }); }), suc = tres.filter(function (t) { return !naTopo[t.nome] && ctx.suc.some(function (e) { return e.t.nome === t.nome; }); });
    var ordem = arv.concat(suc), r0 = 4, rA1 = r0, rA2 = r0 + arv.length - 1, rS1 = rA2 + 1, rS2 = rA2 + suc.length;
    TR.s(1, 1, 'Trechos: comprimento total pelas peças da tabela ' + tab + ', J e perda no cenário do par adotado', 'tit');
    var hdrT = ['Trecho', 'DN', 'D interno (mm)', 'C', 'L real (m)', 'L virtual extra (m)']; hdrT.forEach(function (h, i) { TR.s(1 + i, 3, h, 'cab'); });
    usados.forEach(function (id, i) { TR.s(cQ1 + i, 3, id, 'cab'); TR.s(cL1 + i, 3, id, 'cab'); TR.s(cQ1 + i, 2, 'quantidade', 'tx'); TR.s(cL1 + i, 2, 'Leq (m)', 'tx'); });
    ['L virtual (m)', 'L total (m)', 'k = ' + HW + '·C^-1,85·D^-4,87·Lt', 'Q (L/min)', 'J (m/m)', 'hf (mca)', 'v (m/s)'].forEach(function (h, i) { TR.s(cLv + i, 3, h, 'cab'); });
    var rVz = rA2 + 1;          // linha da vazão do par adotado na Topologia
    var HP = 'Hipotese';
    // referências à posição do par adotado
    var ADr = cl(HP, 2, 3);
    ordem.forEach(function (t, k) {
      var r = r0 + k, tt = P.trechos.filter(function (x) { return x.nome === t.nome; })[0];
      TR.s(1, r, t.nome, 'tx'); TR.s(2, r, t.dn, 'in');
      if (tt.tipo && tt.tipo !== P.tipoTubo) TR.s(3, r, t.dint, 'in'); else TR.s(3, r, { f: 'INDEX(' + TBDI + ',MATCH(B' + r + ',' + TBDN + ',0))' }, 'fo');   // 2.5.0: trecho com outro tubo
      TR.s(4, r, tt.C ? tt.C : { f: PR.C }, tt.C ? 'in' : 'fo');
      TR.s(5, r, t.L, 'in'); TR.s(6, r, tt.Lvirtual || 0, 'in');
      usados.forEach(function (id, i) {
        TR.s(cQ1 + i, r, (tt.pecas && tt.pecas[id]) || 0, 'in');
        TR.s(cL1 + i, r, { f: 'INDEX(' + LQM + ',MATCH(' + A(cL1 + i, 3) + ',' + LQID + ',0),MATCH($B' + r + ',' + LQDN + ',0))' }, 'fo');
      });
      TR.s(cLv, r, { f: (np ? 'SUMPRODUCT(' + A(cQ1, r) + ':' + A(cQ1 + np - 1, r) + ',' + A(cL1, r) + ':' + A(cL1 + np - 1, r) + ')+' : '') + 'F' + r }, 'fo');
      TR.s(cLt, r, { f: 'E' + r + '+' + A(cLv, r) }, 'fo');
      TR.s(cK, r, { f: HW + '*D' + r + '^-1.85*C' + r + '^-4.87*' + A(cLt, r) }, 'fo');
      if (k <= arv.length - 1) TR.s(cQ, r, { f: 'SUMPRODUCT(Topologia!' + Ab(2, r) + ':' + Ab(1 + nJ, r) + ',Topologia!' + Ab(2, rVz) + ':' + Ab(1 + nJ, rVz) + ')' }, 'fo');
      else TR.s(cQ, r, { f: cl(HP, 2, 5) }, 'fo');
      TR.s(cJ, r, { f: HW + '*' + A(cQ, r) + '^1.85*D' + r + '^-1.85*C' + r + '^-4.87' }, 'fo');
      TR.s(cHf, r, { f: A(cJ, r) + '*' + A(cLt, r) }, 'fo');
      TR.s(cV, r, { f: A(cQ, r) + '/60000/(PI()*(C' + r + '/1000)^2/4)' }, 'fo');
    });
    var rTfim = r0 + ordem.length - 1;
    function tcol(c) { return rg('Trechos', c, r0, c, rTfim); }
    var TNOME = tcol(1);
    TR.s(1, rTfim + 2, 'Rosca do tubo (D interno e rosca cadastrados): ' + (tres[0] ? tres[0].rosca : ''), 'tx');
    TO.s(1, 1, 'Topologia: 1 se o trecho está no caminho da bomba (BI, ou RI no reforço) até o jato (único dado de estrutura, deduzido dos nomes dos trechos)', 'tit');
    TO.s(1, 2, 'Índice do jato', 'tx'); TO.s(1, 3, 'Trecho', 'cab');
    jatos.forEach(function (j, i) { TO.s(2 + i, 2, i + 1, 'tx'); TO.s(2 + i, 3, j.id, 'cab'); });
    arv.forEach(function (t, k) { var r = r0 + k; TO.s(1, r, t.nome, 'tx'); caminhos.forEach(function (c, i) { TO.s(2 + i, r, c.some(function (e) { return e.t.nome === t.nome; }) ? 1 : 0, 'in'); }); });
    TO.s(1, rVz, 'Vazão do par adotado (L/min)', 'tx');
    var PA_ = 'Pares';
    // posições das colunas de Pares (definidas abaixo) usadas aqui: ia, ib, Qa, Qb
    var PC = {}, pcl = ['par', 'ia', 'ib', 'A', 'zA', 'Qa0', 'Qb0', 'Pa0', 'Pb0', 'dza', 'dzb', 'Kra', 'Krb', 'Ktr', 'PAa', 'PAb', 'ca', 'PA', 'PAo', 'dif', 'Qc', 'Qo0', 'Kva', 'Kvb', 'Kvc', 'Kvo', 'dzc', 'dzo', 'Krc', 'Kro', 'Pmc', 'Pmo'];
    for (var q = 1; q <= 8; q++) pcl.push('q' + q);
    pcl = pcl.concat(['Qo', 'Qt', 'Qth', 'hfTr', 'Pd', 'hfSuc', 'AMT', 'Qa', 'Qb', 'Pvc', 'Pvo']);
    pcl.forEach(function (k, i) { PC[k] = i + 1; });
    var pares = []; for (var ii = 0; ii < nJ; ii++) for (var jj = ii + 1; jj < nJ; jj++) pares.push([ii, jj]);
    if (nJ === 1) pares.push([0, 0]);
    var PR1 = 4, PR2 = PR1 + pares.length - 1;
    function pcol(k) { return rg('Pares', PC[k], PR1, PC[k], PR2); }
    function adIdx(k) { return 'INDEX(' + pcol(k) + ',' + ADr + ')'; }
    jatos.forEach(function (j, i) {
      TO.s(2 + i, rVz, { f: 'IF(' + A(2 + i, 2) + '=' + adIdx('ia') + ',' + adIdx('Qa') + ',0)+IF(' + A(2 + i, 2) + '=' + adIdx('ib') + ',' + adIdx('Qb') + ',0)' }, 'fo');
    });

    // ===== Pares
    var PS = FO.Pares;
    PS.s(1, 1, 'Pares de jatos: PA exigida por cada jato, equilíbrio no nó de derivação (' + (temB ? 'pressão no esguicho: vazão do jato equilibrado é valor do motor, em cinza' : '8 iterações de ponto fixo') + '), Qt, Pd e AMT', 'tit');
    var rotulos = { par: 'Par', ia: 'Jato a (índice)', ib: 'Jato b (índice)', A: 'Nó de derivação', zA: 'Cota de A', Qa0: 'Q mín. a', Qb0: 'Q mín. b', Pa0: 'P na válvula a', Pb0: 'P na válvula b', dza: 'dz a', dzb: 'dz b', Kra: 'Σk ramal a', Krb: 'Σk ramal b', Ktr: 'Σk tronco',
      PAa: 'PA exigida por a', PAb: 'PA exigida por b', ca: 'a é crítico (1) ou b (0)', PA: 'PA = máx.', PAo: 'PA do outro', dif: 'Diferença (4.8.14)', Qc: 'Q do crítico', Qo0: 'Q mín. do outro', Kva: 'Kv a', Kvb: 'Kv b', Kvc: 'Kv crítico', Kvo: 'Kv outro', dzc: 'dz crítico', dzo: 'dz outro', Krc: 'Σk ramal crítico', Kro: 'Σk ramal outro', Pmc: 'P mín. crítico', Pmo: 'P mín. outro',
      Qo: 'Q do outro (equilibrado)', Qt: 'Qt (L/min)', Qth: 'Qt (m³/h)', hfTr: 'hf do tronco', Pd: bombaModo ? 'Pd (descarga da bomba)' : 'Pg (por gravidade em A)', hfSuc: 'hf da sucção', AMT: bombaModo ? 'AMT' : 'AMT do reforço', Qa: 'Q do jato a', Qb: 'Q do jato b', Pvc: 'P na válvula do crítico', Pvo: 'P na válvula do outro' };
    for (q = 1; q <= 8; q++) rotulos['q' + q] = 'Q do outro, iteração ' + q;
    pcl.forEach(function (k) { PS.s(PC[k], 3, rotulos[k], 'cab'); });
    var zBI = 'INDEX(' + NODZ + ',MATCH("BI",' + NODN + ',0))', zRI = 'INDEX(' + NODZ + ',MATCH("RI",' + NODN + ',0))', zRIc = PR.hProp ? '(' + zRI + '+' + PR.hProp + ')' : zRI;   // 2.6.0: carga em RI com a carga própria
   
    var K = tcol(cK), Ksuc = suc.length ? 'SUM(' + rg('Trechos', cK, rS1, cK, rS2) + ')' : '0';
    pares.forEach(function (pq, k) {
      var r = PR1 + k, a = pq[0], b = pq[1], ra = a === b ? null : null;
      var Ta = rg('Topologia', 2 + a, rA1, 2 + a, rA2), Tb = rg('Topologia', 2 + b, rA1, 2 + b, rA2), Kk = rg('Trechos', cK, rA1, cK, rA2);
      var av = R.pares[0] && null, res = M.avaliaPar(ctx, jatos[a], jatos[b]);
      function c(k2) { return A(PC[k2], r); }
      function f(k2, formula, est) { PS.s(PC[k2], r, { f: formula }, est || 'fo'); }
      PS.s(PC.par, r, UN ? jatos[a].id + ' (um jato)' : jatos[a].id + ' + ' + jatos[b].id, 'tx'); PS.s(PC.ia, r, a + 1, 'tx'); PS.s(PC.ib, r, b + 1, 'tx'); PS.s(PC.A, r, res.A, 'tx');
      f('zA', zNoR(c('A')));
      f('Qa0', JC(6, a)); f('Qb0', JC(6, b)); f('Pa0', JC(12, a)); f('Pb0', JC(12, b));
      f('dza', JC(4, a) + '-' + c('zA')); f('dzb', JC(4, b) + '-' + c('zA'));
      f('Kra', 'SUMPRODUCT(' + Ta + '*(1-' + Tb + '),' + Kk + ')'); f('Krb', 'SUMPRODUCT(' + Tb + '*(1-' + Ta + '),' + Kk + ')'); f('Ktr', 'SUMPRODUCT(' + Ta + '*' + Tb + ',' + Kk + ')');
      f('PAa', c('Pa0') + '+' + c('dza') + '+' + c('Kra') + '*' + c('Qa0') + '^1.85'); f('PAb', c('Pb0') + '+' + c('dzb') + '+' + c('Krb') + '*' + c('Qb0') + '^1.85');
      f('ca', 'IF(' + c('PAa') + '>=' + c('PAb') + ',1,0)'); f('PA', 'MAX(' + c('PAa') + ',' + c('PAb') + ')'); f('PAo', 'MIN(' + c('PAa') + ',' + c('PAb') + ')'); f('dif', c('PA') + '-' + c('PAo'));
      f('Qc', 'IF(' + c('ca') + '=1,' + c('Qa0') + ',' + c('Qb0') + ')'); f('Qo0', 'IF(' + c('ca') + '=1,' + c('Qb0') + ',' + c('Qa0') + ')');
      f('Kva', temB ? '0' : JC(8, a)); f('Kvb', temB ? '0' : JC(8, b));
      f('Kvc', 'IF(' + c('ca') + '=1,' + c('Kva') + ',' + c('Kvb') + ')'); f('Kvo', 'IF(' + c('ca') + '=1,' + c('Kvb') + ',' + c('Kva') + ')');
      f('dzc', 'IF(' + c('ca') + '=1,' + c('dza') + ',' + c('dzb') + ')'); f('dzo', 'IF(' + c('ca') + '=1,' + c('dzb') + ',' + c('dza') + ')');
      f('Krc', 'IF(' + c('ca') + '=1,' + c('Kra') + ',' + c('Krb') + ')'); f('Kro', 'IF(' + c('ca') + '=1,' + c('Krb') + ',' + c('Kra') + ')');
      f('Pmc', 'IF(' + c('ca') + '=1,' + JC(7, a) + ',' + JC(7, b) + ')'); f('Pmo', 'IF(' + c('ca') + '=1,' + JC(7, b) + ',' + JC(7, a) + ')');
      if (!temB) {
        for (var q2 = 1; q2 <= 8; q2++) { var prev = q2 === 1 ? c('Qo0') : c('q' + (q2 - 1)); f('q' + q2, UN ? '0' : c('Kvo') + '*SQRT(MAX(' + c('PA') + '-' + c('dzo') + '-' + c('Kro') + '*' + prev + '^1.85,0))'); }
        f('Qo', c('q8'));
      } else PS.s(PC.Qo, r, UN ? 0 : res.Qout, 'mo');
      f('Qt', c('Qc') + '+' + c('Qo')); f('Qth', c('Qt') + '*0.06'); f('hfTr', c('Ktr') + '*' + c('Qt') + '^1.85');
      if (bombaModo) {
        f('Pd', c('PA') + '+' + c('hfTr') + '+(' + c('zA') + '-' + zBI + ')'); f('hfSuc', Ksuc + '*' + c('Qt') + '^1.85');
        f('AMT', c('Pd') + '+(' + zBI + '-' + PR.zX + ')+' + c('hfSuc'));
      } else { f('Pd', '(' + zRIc + '-' + c('zA') + ')-' + c('hfTr')); f('hfSuc', '0'); f('AMT', c('PA') + '-' + c('Pd')); }
      f('Qa', 'IF(' + c('ca') + '=1,' + c('Qc') + ',' + c('Qo') + ')'); f('Qb', 'IF(' + c('ca') + '=1,' + c('Qo') + ',' + c('Qc') + ')');
      f('Pvc', c('PA') + '-' + c('dzc') + '-' + c('Krc') + '*' + c('Qc') + '^1.85'); f('Pvo', UN ? '0' : c('PA') + '-' + c('dzo') + '-' + c('Kro') + '*' + c('Qo') + '^1.85');
    });

    // ===== Hipotese
    var H = FO.Hipotese;
    H.s(1, 1, 'Hipótese: par adotado (os dois jatos mais desfavoráveis, cada um sozinho) no leiaute das planilhas de memória; a cadeia de trechos é a do par adotado na exportação', 'tit');
    /* 2.5.0: o par adotado é o do motor (os dois jatos que, sozinhos, pedem a maior altura na bomba); o de maior AMT fica como referência */
    var kForc = -1; pares.forEach(function (pq, k) { if (jatos[pq[0]].id + ' + ' + jatos[pq[1]].id === num0.par) kForc = k; });
    H.s(1, 2, 'Par de maior AMT na aba Pares (referência; critério até a 2.4.4)', 'tx'); H.s(2, 2, { f: 'MATCH(MAX(' + pcol('AMT') + '),' + pcol('AMT') + ',0)' }, 'fo');
    H.s(1, 3, kForc >= 0 ? (num0.parForcado ? 'Posição do par FORÇADO para estudo na aba Pares (entrada)' : 'Posição do par adotado na aba Pares (os dois jatos mais desfavoráveis, cada um sozinho, pela ferramenta; entrada)') : 'Posição do par adotado na aba Pares', 'tx');
    H.s(2, 3, kForc >= 0 ? kForc + 1 : { f: 'MATCH(MAX(' + pcol('AMT') + '),' + pcol('AMT') + ',0)' }, kForc >= 0 ? 'in' : 'fo');
    var HR = {};   // referências
    var hl = [['par', 'Par adotado', 'par'], ['Qt', 'Qt (L/min)', 'Qt'], ['PA', 'PA no nó de derivação (mca)', 'PA'], ['Pd', bombaModo ? 'Pd na descarga (mca)' : 'Pg por gravidade em A (mca)', 'Pd'], ['AMT', bombaModo ? 'AMT (mca)' : 'AMT do reforço (mca)', 'AMT'], ['A', 'Nó de derivação', 'A'], ['zA', 'Cota de A', 'zA'],
      ['Kvc', 'Kv do crítico', 'Kvc'], ['dzc', 'dz do crítico', 'dzc'], ['Krc', 'Σk do ramal crítico', 'Krc'], ['Kvo', 'Kv do outro', 'Kvo'], ['dzo', 'dz do outro', 'dzo'], ['Kro', 'Σk do ramal outro', 'Kro'], ['Ktr', 'Σk do tronco', 'Ktr']];
    var hr = 4; hl.forEach(function (x) { H.s(1, hr, x[1], 'tx'); H.s(2, hr, { f: adIdx(x[2]) }, 'fo'); HR[x[0]] = cl(HP, 2, hr); hr++; });
    // linha 5 deve ser Qt (usada em Trechos): hl[1] está na linha 5
    hr++;
    var HH = ['Trecho', 'Vazão (L/min)', 'P a jusante (mca)', 'D interno (mm)', 'L real (m)', 'L virtual (m)', 'L total (m)', 'C', 'J unit. (m/m)', 'J total (mca)', 'Elevação (m)', 'v (m/s)', 'P a montante (mca)', 'Equalização (mca)'];
    H.s(1, hr++, 'Cadeia de cálculo do hidrante para a bomba: P a montante = P a jusante + J total + elevação', 'tx');
    HH.forEach(function (h, i) { H.s(1 + i, hr, h, 'cab'); }); hr++;
    function lk(c, nome) { return 'INDEX(' + tcol(c) + ',MATCH("' + nome + '",' + TNOME + ',0))'; }
    function cadeia(arestas, primeiraP, dzSpec) {   // arestas do jusante para montante
      var ultimo = null, prevP = primeiraP;
      arestas.forEach(function (e, i) {
        var r = hr++, nm = e.t.nome;
        H.s(1, r, nm, 'tx'); H.s(2, r, { f: lk(cQ, nm) }, 'fo'); H.s(3, r, { f: prevP }, 'fo'); H.s(4, r, { f: lk(3, nm) }, 'fo'); H.s(5, r, { f: lk(5, nm) }, 'fo'); H.s(6, r, { f: lk(cLv, nm) }, 'fo'); H.s(7, r, { f: lk(cLt, nm) }, 'fo');
        H.s(8, r, { f: lk(4, nm) }, 'fo'); H.s(9, r, { f: lk(cJ, nm) }, 'fo'); H.s(10, r, { f: lk(cHf, nm) }, 'fo');
        H.s(11, r, { f: dzSpec ? dzSpec(e) : zNo(e.para) + '-' + zNo(e.de) }, 'fo'); H.s(12, r, { f: lk(cV, nm) }, 'fo');
        H.s(13, r, { f: 'C' + r + '+J' + r + '+K' + r }, 'fo'); prevP = 'M' + r; ultimo = r;
      });
      return ultimo;
    }
    function inv(a) { return a.slice().reverse(); }
    var rc = cadeia(inv(par.ramalCrit), adIdx('Pvc')), ro = cadeia(inv(par.ramalOut), adIdx('Pvo'));
    if (rc) H.s(14, rc, { f: 'M' + rc + '-' + HR.PA }, 'fo'); if (ro) H.s(14, ro, { f: 'M' + ro + '-' + HR.PA }, 'fo');
    var rt = cadeia(inv(par.tronco), HR.PA), rs = null, rFim = rt;
    if (bombaModo && ctx.suc.length) { rs = cadeia(inv(ctx.suc), 'M' + rt, function (e) { return zBI + '-' + PR.zX; }); rFim = rs; }
    if (!bombaModo && PR.hProp && rt) { var rh = hr++; H.s(1, rh, 'Carga própria do reservatório (descida interna até RI)', 'tx'); H.s(3, rh, { f: 'M' + rt }, 'fo'); H.s(11, rh, { f: '-' + PR.hProp }, 'fo'); H.s(13, rh, { f: 'C' + rh + '+K' + rh }, 'fo'); rFim = rh; }   // 2.6.0
    H.s(1, hr + 1, 'AMT da cadeia menos AMT da aba Pares (deve ser zero)', 'tx'); H.s(13, hr + 1, { f: 'M' + rFim + '-' + HR.AMT }, 'fo');
    H.s(1, hr + 2, 'A cadeia acima segue o par adotado na exportação: se um dado mudar e outro par passar a ser o adotado, consulte a aba Pares.', 'tx');
    W.chaves.PA = [HP, 2, 6]; W.chaves.Qt = [HP, 2, 5]; W.chaves.AMT = [HP, 2, 8]; W.chaves.Pd = [HP, 2, 7];
    W.chaves.dzCadeia = [HP, 13, hr + 1];

    // ===== Bomba
    var B = FO.Bomba, br = 1, BR = {};
    B.s(1, br++, bombaModo ? 'Bomba, ponto de trabalho, sucção, NPSH e estática' : 'Bomba de reforço e estática', 'tit');
    if (bomb) {
      var pts = bomb.pts.slice().sort(function (a, b2) { return a[1] - b2[1]; }), nb = pts.length;
      B.s(1, br, 'Bomba', 'tx'); B.s(2, br, rotuloBomba(bomb, num0.potEixo), 'tx'); br++;
      B.s(1, br, 'Shut-off (mca)', 'tx'); B.s(2, br, bomb.shutoff, 'in'); BR.so = cl('Bomba', 2, br); br += 2;
      B.s(1, br, 'Q (m³/h)', 'cab'); B.s(2, br, 'H (mca)', 'cab'); br++;
      var BP1 = br; pts.forEach(function (p) { B.s(1, br, p[1], 'in'); B.s(2, br, p[0], 'in'); br++; });
      var BQ = rg('Bomba', 1, BP1, 1, BP1 + nb - 1), BH = rg('Bomba', 2, BP1, 2, BP1 + nb - 1); br++;
      function Hb(x) { return interpF(x, BQ, BH, nb); }
      B.s(1, br, 'Qt nominal (m³/h)', 'tx'); B.s(2, br, { f: HR.Qt + '*0.06' }, 'fo'); BR.Qth = cl('Bomba', 2, br); br++;
      B.s(1, br, 'H da bomba na vazão nominal (mca)', 'tx'); B.s(2, br, { f: Hb(BR.Qth) }, 'fo'); BR.H = cl('Bomba', 2, br); br++;
      B.s(1, br, 'Margem H menos AMT (mca)', 'tx'); B.s(2, br, { f: BR.H + '-' + HR.AMT }, 'fo'); BR.marg = cl('Bomba', 2, br); br++;
      B.s(1, br, 'Faixa da tabela', 'tx'); B.s(2, br, { f: 'IF(OR(' + BR.Qth + '<' + 'INDEX(' + BQ + ',1),' + BR.Qth + '>INDEX(' + BQ + ',' + nb + ')),"extrapolado","dentro da tabela")' }, 'fo'); BR.faixa = cl('Bomba', 2, br); br += 2;
      // estática
      B.s(1, br++, 'Pressão estática com a bomba fechada e o reservatório cheio (' + (P.norma === 'PR' ? '5.7.7' : '4.8.8') + ', C.1.14): shut-off + cota cheio - cota da válvula', 'tx');
      B.s(1, br, 'Ponto', 'cab'); B.s(2, br, 'Cota (m)', 'cab'); B.s(3, br, 'P estática (mca)', 'cab'); br++;
      var E1 = br, cotas = P.hidrantes.map(function (h) { return { nome: h.id, f: zNo(h.no), red: redDe(h) }; }).concat((P.cotasExtras || []).map(function (c) { return { nome: c.nome, z: c.z, red: redDe(c) }; }));
      var temRed = cotas.some(function (c) { return c.red; });      // válvula redutora de pressão em algum ponto: duas colunas a mais (regulagem e pressão no ponto)
      if (temRed) { B.s(3, br - 1, 'P estática antes da válvula (mca)', 'cab'); B.s(4, br - 1, 'Regulagem da válvula redutora (mca)', 'cab'); B.s(5, br - 1, 'P estática no ponto (mca)', 'cab'); B.s(6, br - 1, 'Fonte da regulagem', 'cab'); }
      cotas.forEach(function (c) {
        B.s(1, br, c.nome, 'tx'); if (c.f) B.s(2, br, { f: c.f }, 'fo'); else B.s(2, br, c.z, 'in'); B.s(3, br, { f: BR.so + '+' + PR.zCheio + '-B' + br }, 'fo');
        if (temRed) { if (c.red) { B.s(4, br, c.red.P, 'in'); B.s(5, br, { f: 'MIN(C' + br + ',D' + br + ')' }, 'fo'); B.s(6, br, c.red.fonte || 'sem fonte informada', 'tx'); c.lin = br; } else B.s(5, br, { f: 'C' + br }, 'fo'); }
        br++;
      });
      BR.estCol = temRed ? 5 : 3; BR.redutoras = cotas.filter(function (c) { return c.red; });
      B.s(1, br, 'Máxima', 'tx'); if (temRed) { B.s(3, br, { f: 'MAX(' + rg('Bomba', 3, E1, 3, br - 1) + ')' }, 'fo'); BR.estMaxSem = cl('Bomba', 3, br); }
      B.s(BR.estCol, br, { f: 'MAX(' + rg('Bomba', BR.estCol, E1, BR.estCol, br - 1) + ')' }, 'fo'); BR.estMax = cl('Bomba', BR.estCol, br); br++;
      if (temRed) B.s(1, br++, 'Válvula redutora de pressão: a regulagem (pressão de saída declarada, do catálogo da válvula) vale como pressão do ponto quando é menor que a de montante. Critério da ferramenta; a IT 22 fixa só o limite de 100 mca (4.8.8) e o Brentano (cap. 15) indica dispositivos redutores.', 'tx');
      br++;
      // NPSH
      var su0 = bombaModo && ctx.succao, neg = bombaModo && num0.NPSHd !== undefined;   /* 2.6.0: NPSH na planilha sempre que o motor o calculou (negativa; no PR, qualquer estado; em SP, positiva por tolerância como informação) */
      if (bombaModo && ctx.suc.length) {
        var sd = ctx.suc[0].t.dnome || null, rs1 = rS1;
        B.s(1, br, 'Eixo acima de X (m); positivo = eixo acima do nível X (C.1.12)', 'tx'); B.s(2, br, { f: zBI + '-' + PR.zX }, 'fo'); BR.asp = cl('Bomba', 2, br); br++;
        B.s(1, br, 'Velocidade na sucção, vazão nominal (m/s)', 'tx'); B.s(2, br, { f: cl('Trechos', cV, rS1) }, 'fo'); BR.vsuc = cl('Bomba', 2, br); br++;
        B.s(1, br, 'Limite de velocidade na sucção (m/s), pelo estado da sucção (C.1.12): ' + (su0 ? (su0.estado === 'negativa' ? 'sucção negativa' : su0.estado === 'positiva' ? 'sucção positiva por tolerância, até ' + su0.lim.toFixed(2).replace('.', ',') + ' m acima de X' : 'bomba afogada') : 'sucção'), 'tx'); B.s(2, br, su0 && su0.estado === 'negativa' ? N.vmaxSucNeg : N.vmaxSucPos, 'in'); BR.vsucLim = cl('Bomba', 2, br); br++;
        if (neg) {
          B.s(1, br, 'Q com 1,5 Qt (L/min)', 'tx'); B.s(2, br, { f: '1.5*' + HR.Qt }, 'fo'); var q15 = cl('Bomba', 2, br); br++;
          B.s(1, br, 'hf da sucção com 1,5 Qt (mca)', 'tx'); B.s(2, br, { f: Ksuc + '*' + q15 + '^1.85' }, 'fo'); var hs15 = cl('Bomba', 2, br); br++;
          B.s(1, br, 'NPSH disponível (mca) = Patm - Pvap - (eixo acima de X) - hf', 'tx'); B.s(2, br, { f: PR.Patm + '-' + PR.Pvap + '-' + BR.asp + '-' + hs15 }, 'fo'); BR.npshd = cl('Bomba', 2, br); br++;
          B.s(1, br, 'hf da sucção com 1,0 Qt (mca)', 'tx'); B.s(2, br, { f: Ksuc + '*' + HR.Qt + '^1.85' }, 'fo'); var hs1 = cl('Bomba', 2, br); br++;   // 2.5.4
          B.s(1, br, 'NPSH disponível com 1,0 Qt (mca)', 'tx'); B.s(2, br, { f: PR.Patm + '-' + PR.Pvap + '-' + BR.asp + '-' + hs1 }, 'fo'); BR.npshd1 = cl('Bomba', 2, br); br++;
          var a15 = num0.Qverif === 1.5, qv = a15 ? q15 : HR.Qt, hsv = a15 ? hs15 : hs1, qtx = a15 ? '1,5 Q' : '1,0 Q'; BR.npshdV = a15 ? BR.npshd : BR.npshd1;
          B.s(1, br, 'Vazão da verificação do NPSH: ' + qtx + ' (escolhida pelo projetista)', 'tx'); br++;
          if (npCurva) {   // curva do catálogo na planilha, com interpolação viva na vazão de 1,5 Q
            var npt = bomb.npsh.slice().sort(function (a, b2) { return a[1] - b2[1]; }), nn = npt.length, rN = br + 3;
            B.s(1, br, 'NPSH requerido (mca), lido da curva do catálogo a ' + qtx, 'tx'); B.s(2, br, { f: interpF(qv + '*0.06', rg('Bomba', 1, rN, 1, rN + nn - 1), rg('Bomba', 2, rN, 2, rN + nn - 1), nn) }, 'fo'); BR.npshr = cl('Bomba', 2, br); br += 2;
            B.s(1, br, 'Q (m³/h), curva de NPSH', 'cab'); B.s(2, br, 'NPSH requerido (mca)', 'cab'); br++;
            npt.forEach(function (p) { B.s(1, br, p[1], 'in'); B.s(2, br, p[0], 'in'); br++; });
          } else { B.s(1, br, 'NPSH requerido (mca, do fabricante)', 'tx'); if (bomb.npshr !== undefined) B.s(2, br, bomb.npshr, 'in'); BR.npshr = cl('Bomba', 2, br); br++; }
          if (temNpshr) { B.s(1, br, 'Altura máxima de aspiração (m) = Patm - Pvap - hf(' + qtx + ') - NPSH requerido', 'tx'); B.s(2, br, { f: PR.Patm + '-' + PR.Pvap + '-' + hsv + '-' + BR.npshr }, 'fo'); BR.hgmax = cl('Bomba', 2, br); br++; }   // 2.5.4
        }
        br++;
      }
      // ponto de trabalho
      var todosA = !temB;
      B.s(1, br++, 'Ponto de trabalho: curva do sistema por grade de 41 pressões em A (início e passo em amarelo) contra a curva da bomba', 'tx');
      if (todosA && bombaModo || todosA && !bombaModo) {
        B.s(1, br, 'Início da grade (mca) = PA arredondada para baixo', 'tx'); B.s(2, br, { f: 'ROUNDDOWN(' + HR.PA + ',0)' }, 'am'); var g0 = cl('Bomba', 2, br); br++;
        B.s(1, br, 'Passo (mca)', 'tx'); B.s(2, br, 1, 'am'); var gp = cl('Bomba', 2, br); br += 2;
        var gh = ['PA em A'], ci = 2; for (q = 0; q <= 8; q++) gh.push('Q crítico it.' + q); for (q = 0; q <= 8; q++) gh.push('Q outro it.' + q); gh = gh.concat(['Qt (L/min)', 'AMT do sistema', 'H da bomba', 'H menos AMT']);
        gh.forEach(function (h, i) { B.s(1 + i, br, h, 'cab'); }); br++;
        var G1 = br;
        for (var g = 0; g <= 40; g++) {
          var r = br++, cA = function (c) { return A(c, r); };
          B.s(1, r, { f: g0 + '+' + gp + '*' + g }, 'am');
          B.s(2, r, { f: HR.Kvc + '*SQRT(MAX(A' + r + '-' + HR.dzc + ',0))' }, 'fo'); B.s(11, r, { f: HR.Kvo + '*SQRT(MAX(A' + r + '-' + HR.dzo + ',0))' }, 'fo');
          for (q = 1; q <= 8; q++) { B.s(2 + q, r, { f: HR.Kvc + '*SQRT(MAX(A' + r + '-' + HR.dzc + '-' + HR.Krc + '*' + cA(1 + q) + '^1.85,0))' }, 'fo'); B.s(11 + q, r, { f: HR.Kvo + '*SQRT(MAX(A' + r + '-' + HR.dzo + '-' + HR.Kro + '*' + cA(10 + q) + '^1.85,0))' }, 'fo'); }
          B.s(20, r, { f: UN ? cA(10) : cA(10) + '+' + cA(19) }, 'fo');
          B.s(21, r, { f: bombaModo ? 'A' + r + '+' + HR.Ktr + '*T' + r + '^1.85+(' + HR.zA + '-' + zBI + ')+(' + zBI + '-' + PR.zX + ')+' + Ksuc + '*T' + r + '^1.85' : 'A' + r + '-((' + zRIc + '-' + HR.zA + ')-' + HR.Ktr + '*T' + r + '^1.85)' }, 'fo');
          B.s(22, r, { f: Hb('T' + r + '*0.06') }, 'fo'); B.s(23, r, { f: 'V' + r + '-U' + r }, 'fo');
        }
        var G2 = br - 1, gg = rg('Bomba', 23, G1, 23, G2); br++;
        B.s(1, br, 'Linhas da grade com H maior que AMT (k)', 'tx'); B.s(2, br, { f: 'SUMPRODUCT((' + gg + '>0)*1)' }, 'fo'); var kk = cl('Bomba', 2, br); br++;
        var QQ = rg('Bomba', 20, G1, 20, G2);
        function ix(rgx, off) { return 'INDEX(' + rgx + ',' + kk + (off ? '+' + off : '') + ')'; }
        var frac = ix(gg) + '/(' + ix(gg) + '-' + ix(gg, 1) + ')';
        var qw = ix(QQ) + '+' + frac + '*(' + ix(QQ, 1) + '-' + ix(QQ) + ')';
        B.s(1, br, 'Ponto de trabalho: vazão (m³/h)', 'tx'); B.s(2, br, { f: 'IF(AND(' + kk + '>=1,' + kk + '<=40),(' + qw + ')*0.06,"fora da grade")' }, 'fo'); BR.Qw = cl('Bomba', 2, br); br++;
        var HH2 = rg('Bomba', 22, G1, 22, G2), hw = ix(HH2) + '+' + frac + '*(' + ix(HH2, 1) + '-' + ix(HH2) + ')';
        B.s(1, br, 'Ponto de trabalho: altura (mca)', 'tx'); B.s(2, br, { f: 'IF(AND(' + kk + '>=1,' + kk + '<=40),' + hw + ',"fora da grade")' }, 'fo'); BR.Hw = cl('Bomba', 2, br); br++;
      } else {
        B.s(1, br, 'Pressão no esguicho: a curva do esguicho e da mangueira vem do catálogo; ponto de trabalho do motor (valor, cinza)', 'tx'); br++;
        B.s(1, br, 'Vazão (m³/h)', 'tx'); B.s(2, br, num0.Qw === undefined ? 'sem cruzamento' : num0.Qw, 'mo'); BR.Qw = cl('Bomba', 2, br); br++;
        B.s(1, br, 'Altura (mca)', 'tx'); B.s(2, br, num0.Hw === undefined ? 'sem cruzamento' : num0.Hw, 'mo'); BR.Hw = cl('Bomba', 2, br); br++;
      }
    } else B.s(1, br, 'Nenhuma bomba selecionada no projeto.', 'tx');
    if (RT_) {   // ramal de retorno para testes (PR): valores do motor (encontro da curva da bomba com a curva do ramal)
      br += 2; B.s(1, br++, 'Ramal de retorno para testes (NPT 022, 5.10.6.3 e 5.7.2.1): valores do motor', 'cab');
      [['Vazão com o registro todo aberto (L/min)', RT_.Q], ['Percentual da vazão nominal (%)', RT_.pct], ['Altura da bomba nesse ponto (mca)', RT_.H], ['Perda no ramal, todo aberto (mca)', RT_.hfRet], ['Perda que o registro precisa dar a 75% da nominal (mca)', RT_.hReg75], ['Perda que o registro precisa dar na vazão nominal (mca)', RT_.hReg100], ['Perda que o registro precisa dar a 125% da nominal (mca)', RT_.hReg125]].forEach(function (x) { B.s(1, br, x[0], 'tx'); B.s(2, br, x[1], 'mo'); br++; });
      B.s(1, br++, 'Perda negativa: o ramal não chega a essa vazão nem com o registro todo aberto. A faixa de 75% a 125% é a referência do ensaio.', 'tx');
    }

    // ===== Jockey e escada
    var JO = FO.Jockey, jr = 1, JR2 = {};
    JO.s(1, jr++, 'Jockey e escada de pressostatos (C.1.15, C.1.15.1, 4.11.7.2)', 'tit');
    if (jk && jk.pts && bomb && bombaModo) {
      var jp = jk.pts.slice().concat([[jk.shutoff, 0]]).sort(function (a, b2) { return a[0] - b2[0]; }), nj = jp.length;
      JO.s(1, jr, 'Shut-off da jockey (mca)', 'tx'); JO.s(2, jr, jk.shutoff, 'in'); JR2.so = cl('Jockey', 2, jr); jr += 2;
      JO.s(1, jr, 'H (mca)', 'cab'); JO.s(2, jr, 'Q (m³/h)', 'cab'); jr++; var JP1 = jr;
      jp.forEach(function (p) { JO.s(1, jr, p[0], 'in'); JO.s(2, jr, p[1], 'in'); jr++; }); jr++;
      var JHr = rg('Jockey', 1, JP1, 1, JP1 + nj - 1), JQr = rg('Jockey', 2, JP1, 2, JP1 + nj - 1);
      JO.s(1, jr, 'Escada a partir da pressão calculada (2.4.3): a principal liga na pressão calculada na descarga; a jockey liga 10 mca acima e desliga 10 mca acima da própria partida, até o teto', 'tx'); jr++;
      JO.s(1, jr, 'Liga a principal = pressão calculada na descarga, Pd (mca)', 'tx'); JO.s(2, jr, { f: HR.Pd }, 'fo'); JR2.d3 = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'Teto = shut-off da principal - (eixo acima de X) (mca)', 'tx'); JO.s(2, jr, { f: BR.so + '-' + BR.asp }, 'fo'); JR2.teto = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'Desliga a jockey = MIN(liga a principal + 20; teto) (mca)', 'tx'); JO.s(2, jr, { f: 'MIN(' + JR2.d3 + '+20,' + JR2.teto + ')' }, 'fo'); JR2.d1 = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'Liga a jockey = desliga - 10 (mca)', 'tx'); JO.s(2, jr, { f: JR2.d1 + '-10' }, 'fo'); JR2.d2 = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'H no ponto de partida = liga a jockey + (eixo acima de X) (mca)', 'tx'); JO.s(2, jr, { f: JR2.d2 + '+' + BR.asp }, 'fo'); var hj = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'Vazão da jockey na partida (L/min)', 'tx'); JO.s(2, jr, { f: '(' + interpF(hj, JHr, JQr, nj) + ')/0.06' }, 'fo'); JR2.Qj = cl('Jockey', 2, jr); jr++;
      JO.s(1, jr, 'Fundo de escala mínimo, pressostato da jockey (bar) = desliga / 0,7 / 10,197', 'tx'); JO.s(2, jr, { f: JR2.d1 + '/0.7/10.197' }, 'fo'); jr++;
      JO.s(1, jr, 'Fundo de escala mínimo, pressostato da principal (bar)', 'tx'); JO.s(2, jr, { f: JR2.d3 + '/0.7/10.197' }, 'fo'); jr++;
      if (P.pressostatoFundoBar !== undefined) { JO.s(1, jr, 'Fundo de escala informado (bar)', 'tx'); JO.s(2, jr, P.pressostatoFundoBar, 'in'); JR2.fs = cl('Jockey', 2, jr); jr++; }
    } else JO.s(1, jr, 'Sem jockey lançada neste projeto.', 'tx');

    // ===== Reservatorio
    var RS = FO.Reservatorio, rr = 1, RR = {};
    RS.s(1, rr++, 'Reserva técnica de incêndio (4.9.1, Tabela 3)', 'tit');
    var rpX = P.sistema && P.sistema.coluna ? M.reservaPedida(D, P.norma, P.sistema, P.sistema.tipo) : null, colR = rpX && rpX.coluna ? rpX.coluna : P.sistema && P.sistema.coluna;   /* 2.6.0: coluna do tipo adotado */
    if (P.sistema && colR && P.fonte && P.fonte.rtiEfetiva !== undefined && RT[colR]) {
      RS.s(1, rr, 'Coluna da tabela', 'tx'); RS.s(2, rr, colR, 'tx'); rr++;
      RS.s(1, rr, 'Área construída (m²)', 'tx'); RS.s(2, rr, P.sistema.area, 'in'); var ar = cl('Reservatorio', 2, rr); rr++;
      RS.s(1, rr, 'Faixa (1 a 6)', 'tx'); RS.s(2, rr, { f: '1+(' + ar + '>2500)+(' + ar + '>5000)+(' + ar + '>10000)+(' + ar + '>20000)+(' + ar + '>50000)' }, 'fo'); var fx = cl('Reservatorio', 2, rr); rr++;
      RS.s(1, rr, 'RTI da tabela (m³)', 'tx'); RS.s(2, rr, { f: 'INDEX(' + rg('Tabelas_norma', 3, RT[colR], 2 + N.faixas.length, RT[colR]) + ',' + fx + ')' }, 'fo'); RR.tab = cl('Reservatorio', 2, rr); rr++;
      RS.s(1, rr, 'RTI efetiva (m³)', 'tx'); RS.s(2, rr, P.fonte.rtiEfetiva, 'in'); RR.ef = cl('Reservatorio', 2, rr); rr++;
      RS.s(1, rr, UN ? 'Duração com um jato (min)' : 'Duração com os dois jatos (min)', 'tx'); RS.s(2, rr, { f: RR.ef + '*1000/' + HR.Qt }, 'fo'); RR.dur = cl('Reservatorio', 2, rr); rr++;
    } else RS.s(1, rr, 'Reserva não verificada (faltam coluna da tabela ou RTI efetiva).', 'tx');

    // ===== Verificacoes
    var VS = FO.Verificacoes, vr = 1, CONF = opc.conferidos && Object.keys(opc.conferidos).length ? opc.conferidos : null;   // 2.5.4
    VS.s(1, vr++, 'Verificações (cinza = valor do motor, não vivo; preto = fórmula)', 'tit');
    ['ID', 'Verificação', 'Valor', 'Limite', 'Situação', 'Item da norma', 'Origem'].concat(CONF ? ['Conferência do projetista'] : []).forEach(function (h, i) { VS.s(1 + i, vr, h, 'cab'); }); vr++;
    var V1 = vr, vivo = {};
    var margP = 'MIN(' + adIdx('Pvc') + '-' + adIdx('Pmc') + ',' + adIdx('Pvo') + '-' + adIdx('Pmo') + ')';
    vivo.V01 = UN ? { v: adIdx('Pvc') + '-' + adIdx('Pmc'), l: '0', s: 'IF(%v>=-0.000001,"OK","ERRO")' } : { v: margP, l: '0', s: 'IF(AND(%v>=-0.000001,' + adIdx('Qo') + '>=' + adIdx('Qo0') + '-0.000000001),"OK","ERRO")' };
    vivo.V06 = { v: 'MAX(' + rg('Trechos', cV, rA1, cV, rA2) + ')', l: String(N.vmaxRede), s: 'IF(%v<=%l,"OK","ERRO")' };
    vivo.V18 = { v: 'MIN(' + rg('Trechos', 2, rA1, 2, rTfim) + ')', l: '65', s: 'IF(%v>=%l,"OK","ALERTA")' };
    if (bomb) {
      vivo.V05 = { v: BR.estMax, l: String(N.pmax), s: 'IF(%v<=%l,"OK","ERRO")' };
      vivo.V10 = { v: BR.marg, l: '0', s: 'IF(%v>=0,IF(' + BR.faixa + '="extrapolado","ALERTA","OK"),"ERRO")' };
      vivo.V11 = { v: BR.so, l: String(N.pmax), s: 'IF(%v<=%l,"OK","ALERTA")' };
      if (BR.vsuc) vivo.V07 = { v: BR.vsuc, l: BR.vsucLim, s: 'IF(%v<=%l,"OK","ERRO")' };
      if (BR.npshr && temNpshr) vivo.V08 = { v: BR.npshdV, l: BR.npshr, s: 'IF(%v>=%l,"OK","ERRO")' };   // 2.5.4: na vazão de verificação, maior ou igual
    }
    if (RR.tab) { vivo.V12 = { v: RR.ef, l: RR.tab, s: 'IF(%v>=%l,"OK","ERRO")' }; }
    if (JR2.Qj) { vivo.V15 = { v: JR2.Qj, l: '20', s: 'IF(%v<=%l,"OK","ERRO")' }; vivo.V16 = { v: JR2.so, l: BR.so, s: 'IF(%v>=%l,"OK","ERRO")' }; if (JR2.fs) vivo.V17 = { v: JR2.fs, l: JR2.d1 + '/0.7/10.197', s: 'IF(' + JR2.d2 + '>' + JR2.d3 + ',IF(%v>=%l,"OK","ERRO"),"ERRO")' }; }
    R.verificacoes.forEach(function (v) {
      var r = vr++, lv = vivo[v.id];
      VS.s(1, r, v.id, 'tx'); VS.s(2, r, v.titulo, 'tx'); VS.s(6, r, v.item, 'tx'); if (CONF && CONF[v.id] && v.situacao === 'ALERTA') VS.s(8, r, CONF[v.id], 'tx');
      if (lv) { VS.s(3, r, { f: lv.v }, 'fo'); VS.s(4, r, { f: lv.l }, 'fo'); VS.s(5, r, { f: lv.s.replace(/%v/g, 'C' + r).replace(/%l/g, 'D' + r) }, 'fo'); VS.s(7, r, 'fórmula', 'tx'); }
      else { VS.s(3, r, v.valor, 'mo'); VS.s(5, r, v.situacao, 'mo'); VS.s(7, r, 'valor do motor', 'tx'); }
    });
    var V2 = vr - 1, VSIT = rg('Verificacoes', 5, V1, 5, V2);

    // ===== Memorial (13 itens; IT 22, 4.1.2 e 4.2.1)
    var ME = FO.Memorial, mr = 1;
    ME.s(1, mr++, 'Memorial de cálculo em 13 itens (' + (P.norma === 'PR' ? 'NPT 022, 5.1.2 e 5.2.1' : 'IT 22, 4.1.2 e 4.2.1') + '): números ligados às abas de cálculo', 'tit');
    ME.s(1, mr++, 'O memorial não é um print desta aba: cada item vira texto com a fonte. "A redigir" marca o que o FireCalc não calcula.', 'tx');
    function sec(n, t) { mr++; ME.s(1, mr, n + '. ' + t, 'cab'); ME.s(2, mr, 'Valor', 'cab'); ME.s(3, mr, 'Unidade', 'cab'); ME.s(4, mr, 'Fonte ou aba', 'cab'); mr++; }
    function mi(rot, f, un, fonte, est) { ME.s(1, mr, rot, 'tx'); ME.s(2, mr, { f: f }, est || 'fo'); ME.s(3, mr, un || '', 'tx'); ME.s(4, mr, fonte || '', 'tx'); mr++; return cl('Memorial', 2, mr - 1); }
    function mt(rot, v, fonte) { ME.s(1, mr, rot, 'tx'); ME.s(2, mr, v, 'tx'); ME.s(4, mr, fonte || '', 'tx'); mr++; }
    function mm(rot, v, un, fonte) { ME.s(1, mr, rot, 'tx'); ME.s(2, mr, v, 'mo'); ME.s(3, mr, un || '', 'tx'); ME.s(4, mr, fonte || '', 'tx'); mr++; }
    var AR = 'a redigir';
    sec(1, 'Dados da edificação');
    mi('Projeto', PR.nome, '', 'Premissas');
    mt('Área considerada (m²)', P.sistema && P.sistema.area !== undefined ? String(P.sistema.area) : AR, 'Decreto 69.118/24, art. 18');
    mt('Coluna da tabela de reserva', P.sistema && P.sistema.coluna !== undefined ? String(P.sistema.coluna) : AR, P.norma === 'SP' ? 'IT 22, Tabela 3' : 'NPT 022, Tabela 4');
    (function () {
      var sd = P.sistema || {}, txt = AR;
      if (sd.divisao) txt = 'Divisão ' + sd.divisao + (typeof sd.carga === 'number' ? '; carga de incêndio ' + String(sd.carga).replace('.', ',') + ' MJ/m²' : '') + '; coluna sugerida pela classificação assistida e confirmada pelo usuário; grupo, altura e enquadramento: a redigir';
      mt('Grupo, divisão, altura (romano), carga de incêndio, enquadramento', txt, P.norma === 'SP' ? 'Decreto 69.118/24, Tabela 1; IT 14; IT 22, Tabela 3 (o FireCalc sugere, o projetista confirma)' : 'CSCIP-CB/PMPR, Tabela 1; NPT 022, Tabela 2 (o FireCalc sugere, o projetista confirma)');
    })();
    sec(2, 'Tipo de sistema e RTI');
    mi('Norma', PR.norma, '', 'Premissas');
    mi('Tipo de sistema (arábico)', PR.tipo, '', 'IT 22, Tabelas 2 e 3');
    mi('Q mínima por jato', PR.Qt0, 'L/min', 'IT 22, Tabela 2'); mi('P mínima (pressão na válvula)', PR.Pt0, 'mca', 'IT 22, Tabela 2'); mi('Kv do tipo', PR.Kvt, 'L/min/mca^0,5', 'derivado da Tabela 2');
    if (RR.tab) mi('RTI mínima da tabela', RR.tab, 'm³', 'Reservatorio');
    mt('Materiais por ponto (mangueira, esguicho, chave)', AR, 'IT 22, Tabela 4');
    sec(3, 'Distribuição');
    mt('Hidrantes do projeto', String(P.hidrantes.length) + ' (' + P.hidrantes.map(function (h) { return h.id || h.no; }).join(', ') + ')', 'Premissas');
    mi('Saídas (expedições) do sistema', PR.saidas, '', 'Premissas');
    mt('Prova de cobertura pelo trajeto real + 10 m; 5 m dos acessos; válvula de 1,0 a 1,5 m', AR, 'IT 22, 4.7.1 e 4.8.2');
    sec(4, 'Tubulação');
    mi('Tubo (norma e classe; D interno cadastrado)', PR.tubo, '', 'Tabelas_norma');
    mi('Coeficiente C', PR.C, '', 'IT 22, Tabela 1');
    mi('Tabela de comprimento equivalente declarada', PR.tabLeq, '', D.leq[tab].fonte);
    mi('Menor DN da rede', vivo.V18.v, 'mm', 'Trechos; DN65 adotado pela ferramenta; DN50 admitido nos tipos 1 e 2 (' + (P.norma === 'PR' ? 'NPT 022, 5.10.6.2' : 'IT 22, 4.11.6.2') + ')');
    sec(5, 'Hipótese de cálculo');
    mi(UN ? 'Hidrante adotado (um jato: rede com um só hidrante simples, leitura do 4.8.3)' : 'Par de jatos adotado', HR.par, '', 'Pares e Hipotese'); mi('Nó de derivação (ponto A)', HR.A, '', 'Hipotese');
    mi('Q do jato crítico', adIdx('Qc'), 'L/min', 'Pares'); mi('Q do jato equilibrado', adIdx('Qo'), 'L/min', 'Pares (Q = Kv raiz de P)');
    mi('Diferença de pressão no nó de derivação', adIdx('dif'), 'mca', 'IT 22, 4.8.14 (até 0,50 com vazões mínimas)');
    mi('Q total no tronco', HR.Qt, 'L/min', 'Hipotese'); mi('Pressão no nó de derivação', HR.PA, 'mca', 'Hipotese');
    mt('Fórmula de J', 'Hazen-Williams, forma da IT, D interno', 'IT 22, 4.8.10.2');
    sec(6, 'Tabela de cálculo por trecho');
    mt('Comprimento real, Leq, Lt, vazão, DN, D interno, velocidade, J, perda', 'ver aba Trechos', 'Trechos e Topologia');
    mi(bombaModo ? 'Pressão na descarga da bomba' : 'Pressão por gravidade em A', HR.Pd, 'mca', 'Hipotese');
    sec(7, 'Reservatório e sucção');
    if (RR.ef) mi('RTI efetiva', RR.ef, 'm³', 'IT 22, 4.9 e Anexo B'); if (RR.dur) mi(UN ? 'Duração com um jato' : 'Duração com os dois jatos', RR.dur, 'min', 'Reservatorio');
    mi('Cota do nível X', PR.zX, 'm', 'IT 22, Figuras B.1 a B.3');
    if (BR.asp) mi('Eixo da bomba acima de X (positivo = eixo acima do nível X)', BR.asp, 'm', 'C.1.12 ou C.2.6');
    sec(8, 'Bomba');
    mi(bombaModo ? 'AMT' : 'AMT do reforço', HR.AMT, 'mca', 'Hipotese');
    if (bomb) {
      mt('Bomba adotada (fabricante, modelo, potência, rotor, fonte)', rotuloBomba(bomb, num0.potEixo), 'catálogo e página');
      mi('Vazão nominal', BR.Qth, 'm³/h', 'Bomba'); mi('H da bomba na vazão nominal', BR.H, 'mca', 'Bomba');
      mi('Ponto de trabalho, vazão', BR.Qw, 'm³/h', 'Bomba (curva do sistema)'); mi('Ponto de trabalho, altura', BR.Hw, 'mca', 'Bomba (curva do sistema)');
      mi('Pressão a vazão nula (shut-off)', BR.so, 'mca', 'catálogo'); if (!bomb.cv) mt(num0.potEixo ? 'Potência do motor' : 'Potência e rotor', AR, num0.potEixo ? 'a definir com o fabricante (o catálogo dá só a potência no eixo)' : 'catálogo');
    } else mt('Bomba', 'sem bomba no projeto', '');
    if (RT_) { mm('Ramal de retorno para testes: vazão com o registro todo aberto', RT_.Q, 'L/min', 'NPT 022, 5.10.6.3; valor do motor (aba Bomba)'); mm('Ramal de retorno para testes: perda no registro para a vazão nominal', RT_.hReg, 'mca', 'valor do motor (aba Bomba)'); }
    sec(9, P.norma === 'PR' ? 'NPSH (em qualquer estado da sucção)' : 'NPSH (sucção negativa)');
    if (BR.npshd) { mi('NPSH disponível (1,5 Q)', BR.npshd, 'mca', 'IT 22, 4.8.15; Azevedo Netto, Tabela 11-1 e Quadro 1.7'); if (temNpshr) mi('NPSH requerido da bomba escolhida (verificado a ' + qtx + ')', BR.npshr, 'mca', npCurva ? 'curva do catálogo do fabricante (aba Bomba)' : 'fabricante');
      if (BR.npshd1) mi('NPSH disponível (1,0 Q)', BR.npshd1, 'mca', 'perda na sucção na vazão de projeto');
      if (BR.hgmax) mi('Altura máxima de aspiração (' + qtx + ')', BR.hgmax, 'm', 'Patm - Pvap - perda na sucção - NPSH requerido'); }
    else mt('NPSH', 'não calculado (bomba afogada ou sem bomba)', 'IT 22, 4.8.15');
    sec(10, 'Pressurização (jockey) e pressostatos');
    if (JR2.Qj) { mi('Vazão da pressurização na partida', JR2.Qj, 'L/min', 'C.1.15 (até 20)'); mi('Pressão a vazão nula da pressurização', JR2.so, 'mca', 'C.1.15.1'); mi('Desliga pressurização', JR2.d1, 'mca', 'Jockey'); mi('Liga pressurização', JR2.d2, 'mca', 'Jockey'); mi('Liga principal', JR2.d3, 'mca', 'Jockey'); if (JR2.fs) mi('Fundo de escala do pressostato', JR2.fs, 'bar', '4.11.7.2 (70%)'); }
    else mt('Pressurização', 'não lançada no projeto', 'C.1.15 (exigida acima de 6 saídas, salvo reservatório elevado)');
    sec(11, 'Verificações');
    mi('Verificações com ERRO', 'SUMPRODUCT((' + VSIT + '="ERRO")*1)', '', 'Verificacoes'); mi('Verificações com ALERTA', 'SUMPRODUCT((' + VSIT + '="ALERTA")*1)', '', 'Verificacoes');
    mi('Maior velocidade na rede', vivo.V06.v, 'm/s', 'IT 22, 4.8.12 (5 m/s)');
    if (BR.vsuc) mi('Velocidade na sucção (vazão nominal)', BR.vsuc, 'm/s', 'IT 22, 4.8.11');
    if (BR.estMax) mi('Estática máxima com a bomba fechada', BR.estMax, 'mca', P.norma === 'PR' ? 'NPT 022, 5.7.7 e C.1.14 (100 mca)' : 'IT 22, 4.8.8 (100 mca)');
    (BR.redutoras || []).forEach(function (c) {
      mi('Válvula redutora de pressão em ' + c.nome + ': estática antes da válvula', cl('Bomba', 3, c.lin), 'mca', 'Bomba');
      mi('Válvula redutora de pressão em ' + c.nome + ': regulagem (pressão de saída declarada)', cl('Bomba', 4, c.lin), 'mca', (c.red.fonte || 'sem fonte informada') + '. Critério da ferramenta; ' + (P.norma === 'PR' ? 'NPT 022, 5.7.7' : 'IT 22, 4.8.8') + '; Brentano, cap. 15');
    });
    sec(12, 'Recalque');
    mt('Dispositivo de recalque', (P.recalque ? ({ fachada: 'coluna na fachada', muro: 'coluna em abrigo embutido no muro', passeio: 'no passeio público' }[P.recalque.tipo] || 'tipo a definir') + ', DN' + (P.recalque.dn || 65) + ', entrada na cota ' + brn(P.recalque.z, 2) + ' m, ' + brn(P.recalque.L, 2) + ' m de tubo até a rede' : 'não registrado'), 'registro; o recalque recebe água da viatura e não é dimensionado');
    mt('Dispositivo (coluna ou muro), entradas, retenção', AR, 'IT 22, 4.3 e Figura 1');
    sec(13, 'Referências');
    mt('Comprimento equivalente', D.leq[tab].titulo + ' (' + D.leq[tab].fonte + ')', P.norma === 'PR' ? '5.1.2' : '4.1.2');
    mt('Tubo', nomeTuboP(P, D) + '; D interno na aba Tabelas_norma' + (outrosTubos(P, D).length ? '; trechos com outro tubo: ' + outrosTubos(P, D).join('; ') : '') + (function () { var tp = tipoP(P, D); return tp && Math.abs(P.C - tp.C) > 1e-9 ? '; fator C ' + P.C + ' alterado (Tabela 1: ' + tp.C + ')' + (P.Cfonte ? ', fonte: ' + P.Cfonte : '') : (P.Cfonte ? '; fator C ' + P.C + ', fonte: ' + P.Cfonte : ''); })(), P.norma === 'PR' ? '5.1.2' : '4.1.2');
    mt('Norma', N.nome, P.norma === 'PR' ? '5.1.2' : '4.1.2'); mt('Pressão atmosférica e de vapor', 'Azevedo Netto, Tabela 11-1 e Quadro 1.7', P.norma === 'PR' ? '5.1.2' : '4.1.2');
    if (bomb) mt('Catálogo da bomba', bomb.fonte || 'catálogo Schneider 2025, apoio', P.norma === 'PR' ? '5.1.2' : '4.1.2');
    mt('Mangueiras, esguichos e demais catálogos', AR, P.norma === 'PR' ? '5.1.2' : '4.1.2');
    ME.w = { 1: 52, 2: 30, 3: 14, 4: 44 };

    // ===== Capa
    var CA = FO.Capa, cr = 1;
    CA.s(1, cr++, 'FireCalc: memória de cálculo de hidrantes e mangotinhos', 'tit');
    CA.s(1, cr, 'Projeto', 'tx'); CA.s(2, cr, { f: PR.nome }, 'fo'); cr++;
    CA.s(1, cr, 'Norma', 'tx'); CA.s(2, cr, { f: PR.norma }, 'fo'); cr++;
    CA.s(1, cr, 'Tabela de Leq', 'tx'); CA.s(2, cr, { f: PR.tabLeq }, 'fo'); cr++;
    CA.s(1, cr, 'Tubo', 'tx'); CA.s(2, cr, { f: PR.tubo }, 'fo'); cr++;
    CA.s(1, cr, 'Versões', 'tx'); CA.s(2, cr, (opc.versao || 'FireCalc') + ' | dados ' + (D.versao || '') + ' | exportação ' + VERSAO_EXPORTA, 'tx'); cr++;
    CA.s(1, cr, 'Verificações com ERRO', 'tx'); CA.s(2, cr, { f: 'SUMPRODUCT((' + VSIT + '="ERRO")*1)' }, 'fo'); W.chaves.nErro = ['Capa', 2, cr]; cr++;
    CA.s(1, cr, 'Verificações com ALERTA', 'tx'); CA.s(2, cr, { f: 'SUMPRODUCT((' + VSIT + '="ALERTA")*1)' }, 'fo'); cr += 2;
    ['Fontes da verdade: Azevedo Netto, IT 22/2025 (SP) ou NPT 022 (PR), NBR respectiva e Brentano. Catálogos são apoio e aparecem rotulados.',
      'Azul = entrada; preto = fórmula viva; amarelo = parâmetro de grade; cinza = valor do motor do FireCalc (não vivo).',
      'Limites desta exportação: valores em cinza (dinâmica de 100 mca, verificações sem fórmula, pressão no esguicho) vêm do motor; a cadeia da aba Hipotese segue o par adotado na exportação.',
      'Cada fórmula traz o valor calculado e o Excel recalcula tudo ao abrir. Sem macro, sem vínculo externo.'].forEach(function (t) { CA.s(1, cr++, t, 'tx'); });
    CA.w = { 1: 36, 2: 40 };

    // ===== Passo_a_passo: a conta escrita passo a passo. Cada linha de conta traz os valores em células
    // ligadas às abas de cálculo, os operadores entre elas e o resultado calculado na própria linha (conferido contra a aba de origem no teste).
    (function () {
      var PP = FO.Passo_a_passo, qr = 1, passos = [], NC = 13, PN = 'Passo_a_passo', SP = P.norma === 'SP';
      PP.s(1, qr++, 'Memorial de cálculo em passo a passo: fórmula, valores substituídos e resultado', 'tit');
      PP.s(1, qr++, 'Cada valor é uma célula ligada às abas de cálculo; o resultado em negrito é calculado na própria linha, com os valores à esquerda. Mude um dado nas abas de cálculo e a conta inteira acompanha.', 'tx');
      function pt(n, t, fonte) { qr++; PP.s(1, qr, 'Passo ' + n + '. ' + t, 'sec'); for (var i = 2; i <= NC; i++) PP.s(i, qr, '', 'sec'); qr++; if (fonte) { PP.s(1, qr, 'Fonte', 'tx'); PP.s(2, qr, fonte, 'tx'); qr++; } }
      function pf(txt) { PP.s(1, qr, 'Fórmula', 'tx'); PP.s(2, qr, txt, 'fx'); qr++; }
      function pn(txt) { PP.s(1, qr, txt, 'tx'); qr++; }
      function pv(rot, f, un, fmt) { PP.s(1, qr, rot, 'tx'); if (typeof f === 'string' && fmt === 'txt') PP.s(2, qr, f, 'tx'); else { PP.s(2, qr, { f: f }, 'fo'); PP.c[A(2, qr)].fmt = fmt || '0.00'; } PP.s(3, qr, un || '', 'tx'); qr++; }
      function V(f, fmt) { return { f: f, fmt: fmt }; }
      function pc(rot, toks, monta, un, fmt, ref) {
        var c = 2, ad = [];
        PP.s(1, qr, rot, 'tx');
        toks.forEach(function (t) { if (typeof t === 'string') PP.s(c, qr, t, 'op'); else { PP.s(c, qr, { f: t.f }, 'fo'); PP.c[A(c, qr)].fmt = t.fmt || '0.00'; ad.push(A(c, qr)); } c++; });
        PP.s(c, qr, '=', 'op'); c++;
        PP.s(c, qr, { f: monta(ad) }, 'res'); PP.c[A(c, qr)].fmt = fmt || '0.00';
        var end = cl(PN, c, qr); if (ref) passos.push([end, ref, rot]);
        c++; PP.s(c, qr, un || '', 'tx'); qr++; return end;
      }
      var SCI = '0.000E+00', soma = function (a) { return a.join('+'); };
      var crit = inv(par.ramalCrit), e1 = (crit.length ? crit : inv(par.tronco))[0], n1 = e1 ? e1.t.nome : null;
      var Pv0c = 'IF(' + adIdx('ca') + '=1,' + adIdx('Pa0') + ',' + adIdx('Pb0') + ')';
      // 1
      pt(1, UN ? 'Hipótese de cálculo: um jato' : 'Hipótese de cálculo: os dois jatos mais desfavoráveis', SP ? 'IT 22, 4.8.3 e Tabela 2' : 'NPT 022, Tabela 1');
      pv(UN ? 'Hidrante adotado (rede com um só hidrante simples)' : 'Par de jatos adotado (maior altura manométrica)', HR.par, '');
      pv('Vazão mínima por jato', PR.Qt0, 'L/min'); pv('Pressão mínima na válvula', PR.Pt0, 'mca');
      if (!temB) {
        pf('Kv = Q mínima / raiz(P mínima). Com o Kv, a vazão de cada jato acompanha a pressão que chega: Q = Kv x raiz(P)');
        pc('Fator de vazão do hidrante (Kv)', [V(PR.Qt0), '/ raiz(', V(PR.Pt0), ')'], function (a) { return a[0] + '/SQRT(' + a[1] + ')'; }, 'L/min/mca^0,5', '0.00', PR.Kvt);
      } else pn('Pressão no esguicho: a pressão na válvula sai da curva do esguicho e da perda na mangueira (aba Premissas, tabela dos jatos).');
      // 2
      pt(2, 'Vazão e pressão no hidrante mais desfavorável', SP ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1');
      pv('Vazão do jato crítico', adIdx('Qc'), 'L/min'); pv('Pressão exigida na válvula do jato crítico', Pv0c, 'mca');
      pn('O jato crítico é o que exige a maior pressão no nó de derivação; o outro jato do par recebe essa pressão e entrega mais vazão que a mínima.');
      // 3
      pt(3, 'Perda de carga por Hazen-Williams, com o diâmetro interno do tubo', 'IT 22, 4.8.10.2; Azevedo Netto (Hazen-Williams)');
      pf('J = 605 x 10^4 x Q^1,85 x C^-1,85 x D^-4,87 (J em m/m, Q em L/min, D interno em mm);  hf = J x L total;  L total = L real + L virtual das peças');
      if (n1) {
        var cJ1 = pc('Perda unitária no trecho ' + n1, ['605 x 10^4 x', V(lk(cQ, n1)), '^1,85 x', V(lk(4, n1), '0'), '^-1,85 x', V(lk(3, n1), '0.0'), '^-4,87'], function (a) { return HW + '*' + a[0] + '^1.85*' + a[1] + '^-1.85*' + a[2] + '^-4.87'; }, 'm/m', '0.00000', lk(cJ, n1));
        var cL1 = pc('Comprimento total do trecho ' + n1, [V(lk(5, n1)), '+', V(lk(cLv, n1))], soma, 'm', '0.00', lk(cLt, n1));
        pc('Perda no trecho ' + n1, [V(cJ1, '0.00000'), 'x', V(cL1)], function (a) { return a[0] + '*' + a[1]; }, 'mca', '0.00', lk(cHf, n1));
        pn('Os demais trechos seguem a mesma conta, linha a linha, nas abas Trechos e Hipotese. O comprimento virtual é a soma dos comprimentos equivalentes das peças do trecho (tabela ' + tab + ', aba Tabelas_norma).');
      }
      // 4
      pt(4, 'Pressão no nó de derivação (ponto A)', 'IT 22, 4.8.14');
      pf('PA = P na válvula + desnível (cota do hidrante - cota de A) + Σk x Q^1,85, em que Σk x Q^1,85 é a soma das perdas do ramal do hidrante');
      pv('Nó de derivação', HR.A, '');
      var cPA = pc('PA exigida pelo jato crítico', [V(Pv0c), '+', V(HR.dzc), '+', V(HR.Krc, SCI), 'x', V(adIdx('Qc')), '^1,85'], function (a) { return a[0] + '+' + a[1] + '+' + a[2] + '*' + a[3] + '^1.85'; }, 'mca', '0.00', HR.PA);
      if (!UN) pc('Diferença para a PA exigida pelo outro jato', [V(cPA), '-', V(adIdx('PAo'))], function (a) { return a[0] + '-' + a[1]; }, 'mca', '0.00', adIdx('dif'));
      // 5
      pt(5, 'Vazão do segundo hidrante (equilíbrio no ponto A)', 'IT 22, 4.8.14');
      var cQo = adIdx('Qo');
      if (UN) pn('Rede com um só hidrante simples: o cálculo considera um jato. Não há segundo jato a equilibrar.');
      else if (temB) { pv('Vazão do jato equilibrado (valor calculado pelo FireCalc, pressão no esguicho)', adIdx('Qo'), 'L/min'); }
      else {
        pf('Q = Kv x raiz(PA - desnível - Σk x Q^1,85). A vazão aparece dos dois lados: a conta é repetida até o valor parar de mudar (8 repetições, aba Pares)');
        cQo = pc('Vazão do jato equilibrado', [V(HR.Kvo), 'x raiz(', V(cPA), '-', V(HR.dzo), '-', V(HR.Kro, SCI), 'x', V(adIdx('q7')), '^1,85 )'], function (a) { return a[0] + '*SQRT(MAX(' + a[1] + '-' + a[2] + '-' + a[3] + '*' + a[4] + '^1.85,0))'; }, 'L/min', '0.00', adIdx('Qo'));
        pn('O quinto valor da linha acima é a vazão da repetição anterior.');
        pc('Pressão na válvula do jato equilibrado', [V(cPA), '-', V(HR.dzo), '-', V(HR.Kro, SCI), 'x', V(cQo), '^1,85'], function (a) { return a[0] + '-' + a[1] + '-' + a[2] + '*' + a[3] + '^1.85'; }, 'mca', '0.00', adIdx('Pvo'));
      }
      // 6
      pt(6, bombaModo ? 'Vazão total e perdas do ponto A até a bomba' : 'Vazão total e perdas do reservatório até o ponto A', 'IT 22, 4.8.10.2');
      var cQt = pc('Vazão total', [V(adIdx('Qc')), '+', V(cQo)], soma, 'L/min', '0.00', HR.Qt);
      var cHt = pc('Perda no tronco (Σk x Qt^1,85)', [V(HR.Ktr, SCI), 'x', V(cQt), '^1,85'], function (a) { return a[0] + '*' + a[1] + '^1.85'; }, 'mca', '0.00', adIdx('hfTr'));
      var cPd;
      if (bombaModo) {
        pf('Pd = PA + perda no tronco + (cota de A - cota da bomba)');
        cPd = pc('Pressão na descarga da bomba', [V(cPA), '+', V(cHt), '+ (', V(HR.zA), '-', V(zBI), ')'], function (a) { return a[0] + '+' + a[1] + '+(' + a[2] + '-' + a[3] + ')'; }, 'mca', '0.00', HR.Pd);
      } else {
        if (PR.hProp) {
          pf('Pg = (cota do reservatório + carga própria - cota de A) - perda no tronco');
          cPd = pc('Pressão por gravidade em A', ['(', V(zRI), '+', V(PR.hProp), '-', V(HR.zA), ') -', V(cHt)], function (a) { return '(' + a[0] + '+' + a[1] + '-' + a[2] + ')-' + a[3]; }, 'mca', '0.00', HR.Pd);
        } else {
          pf('Pg = (cota do reservatório - cota de A) - perda no tronco');
          cPd = pc('Pressão por gravidade em A', ['(', V(zRI), '-', V(HR.zA), ') -', V(cHt)], function (a) { return '(' + a[0] + '-' + a[1] + ')-' + a[2]; }, 'mca', '0.00', HR.Pd);
        }
      }
      // 7
      pt(7, bombaModo ? 'Altura manométrica total' : 'Altura manométrica (o que falta ou sobra por gravidade)', 'IT 22, 4.8.10.2');
      if (bombaModo) {
        pf('AMT = Pd + (cota da bomba - cota do nível mínimo X) + perda na sucção');
        var cHs = pc('Perda na sucção (Σk x Qt^1,85)', [V(Ksuc, SCI), 'x', V(cQt), '^1,85'], function (a) { return a[0] + '*' + a[1] + '^1.85'; }, 'mca', '0.00', adIdx('hfSuc'));
        pc('Altura manométrica total', [V(cPd), '+ (', V(zBI), '-', V(PR.zX), ') +', V(cHs)], function (a) { return a[0] + '+(' + a[1] + '-' + a[2] + ')+' + a[3]; }, 'mca', '0.00', HR.AMT);
      } else {
        pf('Altura manométrica = PA - Pg (negativa: a gravidade atende com folga; positiva: é o que a bomba de reforço precisa dar)');
        pc('Altura manométrica', [V(cPA), '-', V(cPd)], function (a) { return a[0] + '-' + a[1]; }, 'mca', '0.00', HR.AMT);
      }
      // 8
      pt(8, 'Bomba e ponto de trabalho', 'IT 22, Anexo C; curva do catálogo do fabricante (apoio)');
      if (bomb) {
        pv('Bomba adotada', rotuloBomba(bomb, num0.potEixo), '', 'txt');
        var cQh = pc('Vazão nominal em m³/h', [V(cQt), 'x 0,06'], function (a) { return a[0] + '*0.06'; }, 'm³/h', '0.00', BR.Qth);
        pv('Altura da bomba na vazão nominal (interpolada na curva, aba Bomba)', BR.H, 'mca');
        pc('Margem = altura da bomba - altura manométrica', [V(BR.H), '-', V(HR.AMT)], function (a) { return a[0] + '-' + a[1]; }, 'mca', '0.00', BR.marg);
        pv('Ponto de trabalho: vazão (encontro da curva da bomba com a curva do sistema)', BR.Qw, 'm³/h'); pv('Ponto de trabalho: altura', BR.Hw, 'mca');
      } else pn('Sem bomba no projeto.');
      // 9
      pt(9, P.norma === 'PR' ? 'NPSH disponível (em qualquer estado da sucção)' : 'NPSH disponível (sucção negativa; na positiva por tolerância, como informação)', (P.norma === 'PR' ? 'NPT 022, 5.7.13' : 'IT 22, 4.8.15') + '; Azevedo Netto, Tabela 11-1 e Quadro 1.7');
      if (BR.npshd) {
        pf('NPSH disponível = Patm - Pvap - altura do eixo acima do nível X - perda na sucção, com 1,5 vez a vazão nominal');
        var c15 = pc('Vazão de verificação', ['1,5 x', V(cQt)], function (a) { return '1.5*' + a[0]; }, 'L/min', '0.00', q15);
        var cH15 = pc('Perda na sucção com 1,5 Q', [V(Ksuc, SCI), 'x', V(c15), '^1,85'], function (a) { return a[0] + '*' + a[1] + '^1.85'; }, 'mca', '0.00', hs15);
        pc('NPSH disponível', [V(PR.Patm), '-', V(PR.Pvap), '-', V(BR.asp), '-', V(cH15)], function (a) { return a.join('-'); }, 'mca', '0.00', BR.npshd);
        if (temNpshr) pv(npCurva ? 'NPSH requerido, lido da curva do catálogo em 1,5 Q; o disponível, na vazão de verificação, tem que ser maior ou igual' : 'NPSH requerido pela bomba (fabricante); o disponível, na vazão de verificação, tem que ser maior ou igual', BR.npshr, 'mca');
        else pn('NPSH requerido: a informar, do catálogo do fabricante.');
      } else pn('Não calculado: bomba afogada ou projeto sem bomba. A IT 22 pede o cálculo na sucção negativa.');
      // 10
      pt(10, 'Velocidades', 'IT 22, 4.8.11 e 4.8.12');
      pf('v = Q / A, com Q em m³/s e A = π x D² / 4 (D interno em m)');
      if (n1) pc('Velocidade no trecho ' + n1, [V(lk(cQ, n1)), '/ 60000 / (π x (', V(lk(3, n1), '0.0'), '/ 1000)² / 4)'], function (a) { return a[0] + '/60000/(PI()*(' + a[1] + '/1000)^2/4)'; }, 'm/s', '0.00', lk(cV, n1));
      pv('Maior velocidade na rede', vivo.V06.v, 'm/s'); pv('Limite na rede', String(N.vmaxRede), 'm/s');
      if (BR.vsuc) { pv('Velocidade na sucção, na vazão nominal', BR.vsuc, 'm/s'); pv('Limite na sucção', BR.vsucLim, 'm/s'); }
      // 11
      pt(11, 'Pressão estática máxima', P.norma === 'PR' ? 'NPT 022, 5.7.7' : 'IT 22, 4.8.8');
      if (BR.estMax) {
        pf('P estática = pressão a vazão nula da bomba + cota do nível cheio - cota do ponto mais baixo');
        pc(BR.redutoras.length ? 'Estática máxima antes das válvulas redutoras, bomba fechada e reservatório cheio' : 'Estática máxima, bomba fechada e reservatório cheio', [V(BR.so), '+', V(PR.zCheio), '-', V('MIN(' + rg('Bomba', 2, E1, 2, E1 + cotas.length - 1) + ')')], function (a) { return a[0] + '+' + a[1] + '-' + a[2]; }, 'mca', '0.00', BR.redutoras.length ? BR.estMaxSem : BR.estMax);
        if (BR.redutoras.length) {
          pf('Com válvula redutora: P no ponto = o menor valor entre a estática antes da válvula e a regulagem (pressão de saída declarada)');
          BR.redutoras.forEach(function (c) { pc('Ponto ' + c.nome, ['mín. entre', V(cl('Bomba', 3, c.lin)), 'e', V(cl('Bomba', 4, c.lin))], function (a) { return 'MIN(' + a[0] + ',' + a[1] + ')'; }, 'mca', '0.00', cl('Bomba', 5, c.lin)); });
          pv('Estática máxima, com as válvulas redutoras', BR.estMax, 'mca');
        }
        pv('Limite', String(N.pmax), 'mca');
      } else pn('Sem bomba no projeto: a estática é a do desnível do reservatório (aba Verificacoes).');
      qr++; pn('Situação de cada verificação, com o item da norma: aba Verificacoes e Resumo.');
      PP.w = { 1: 58 }; for (var wi = 2; wi <= NC; wi++) PP.w[wi] = 13;
      PP.congela = [0, 2]; W.chaves.passos = passos;
    })();

    // ===== Resumo (uma página A4 para o Corpo de Bombeiros) e Memorial descritivo
    (function () {
      var ID = opc.ident || {}, AP = 'a preencher', sd = P.sistema || {}, tp = ctx.tipo, brn = function (v, d) { return typeof v === 'number' ? parseFloat(v.toPrecision(12)).toFixed(d === undefined ? 2 : d).replace('.', ',') : String(v); };
      var RE = FO.Resumo, r = 1;
      RE.s(1, r, 'FireCalc: resumo do sistema de ' + (tp.mangueira <= 25 ? 'mangotinhos' : 'hidrantes'), 'tit'); r++;
      RE.s(1, r, (ID.escritorio || 'Escritório: ' + AP) + (ID.cnpj ? ', CNPJ ' + ID.cnpj : ''), 'tx'); r++;
      function sc(t) { r++; RE.s(1, r, t, 'sec'); RE.s(2, r, '', 'sec'); RE.s(3, r, '', 'sec'); RE.s(4, r, '', 'sec'); r++; }
      function lt(rot, v, fonte) { RE.s(1, r, rot, 'tx'); RE.s(2, r, v === undefined || v === null || v === '' ? AP : v, 'ft'); RE.s(4, r, fonte || '', 'pq'); r++; }
      function lf(rot, f, un, fonte, est) { if (!f) return; RE.s(1, r, rot, 'tx'); RE.s(2, r, { f: f }, est || 'f2'); RE.s(3, r, un || '', 'tx'); RE.s(4, r, fonte || '', 'pq'); r++; }
      function lm(rot, v, un, fonte) { RE.s(1, r, rot, 'tx'); RE.s(2, r, v, 'm2'); RE.s(3, r, un || '', 'tx'); RE.s(4, r, fonte || '', 'pq'); r++; }
      sc('Identificação');
      lf('Obra', PR.nome, '', '', 'ft'); lt('Endereço', ID.endereco); lt('Município e estado', [ID.municipio, ID.uf].filter(function (x) { return x; }).join(', '));
      lt('Responsável técnico', ID.rt); lt('Registro profissional (CREA ou CAU)', ID.registro); lt('ART ou RRT', ID.art);
      sc('Classificação');
      lf('Norma', PR.norma, '', '', 'ft'); lt('Divisão de ocupação', sd.divisao, P.norma === 'SP' ? 'Decreto 69.118/24, Tabela 1' : 'CSCIP-CB/PMPR, Tabela 1');
      lt('Carga de incêndio (MJ/m²)', typeof sd.carga === 'number' ? brn(sd.carga, 0) : 'não informada', P.norma === 'SP' ? 'IT 14' : ''); lt('Área considerada (m²)', typeof sd.area === 'number' ? brn(sd.area, 0) : '');
      lt('Coluna da tabela de reserva', sd.coluna, P.norma === 'SP' ? 'IT 22, Tabela 3' : 'NPT 022, Tabela 4');
      sc('Sistema');
      lf('Tipo de sistema', PR.tipo, '', P.norma === 'SP' ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1', 'ft'); lf('Vazão mínima por jato', PR.Qt0, 'L/min'); lf('Pressão mínima por jato', PR.Pt0, 'mca');
      lf('Reserva de incêndio da tabela', RR.tab, 'm³'); lf('Reserva de incêndio efetiva', RR.ef, 'm³'); lf(UN ? 'Duração com um jato' : 'Duração com os dois jatos', RR.dur, 'min');
      sc(UN ? 'Hidrante de cálculo (um jato)' : 'Hidrantes de cálculo (par mais desfavorável)');
      lf(UN ? 'Hidrante adotado' : 'Par adotado', HR.par, '', UN ? 'um só hidrante simples: um jato (leitura do 4.8.3)' : 'maior altura manométrica', 'ft');
      lf('Vazão do jato mais desfavorável', adIdx('Qc'), 'L/min'); lf('Pressão na válvula do jato mais desfavorável', adIdx('Pvc'), 'mca');
      if (!UN) { lf('Vazão do segundo jato', adIdx('Qo'), 'L/min'); lf('Pressão na válvula do segundo jato', adIdx('Pvo'), 'mca'); }
      lf('Vazão total', HR.Qt, 'L/min'); lf('Maior velocidade na rede', vivo.V06.v, 'm/s', 'limite ' + brn(N.vmaxRede, 1) + ' m/s');
      sc('Abastecimento e bomba');
      lt('Pressurização', modo === 'bomba' ? 'bomba de incêndio' : modo === 'reforco' ? 'reservatório elevado com bomba de reforço' : 'só gravidade (reservatório elevado)');
      lf(bombaModo ? 'Altura manométrica total' : (modo === 'reforco' ? 'Altura manométrica do reforço' : 'Altura manométrica (negativa = folga por gravidade)'), HR.AMT, 'mca');
      if (bomb) {
        lt('Bomba adotada', rotuloBomba(bomb)); if (num0.potEixo) lt('Potência no eixo na vazão de projeto', brn(num0.potEixo.P, 1) + ' ' + num0.potEixo.un + ' (lida da curva do catálogo; o motor é definido com o fabricante)', 'catálogo do fabricante'); lf('Vazão de projeto', BR.Qth, 'm³/h'); lf('Altura da bomba na vazão de projeto', BR.H, 'mca');
        lf('Ponto de trabalho, vazão', BR.Qw, 'm³/h'); lf('Ponto de trabalho, altura', BR.Hw, 'mca'); lf('Pressão a vazão nula', BR.so, 'mca'); lf(BR.redutoras && BR.redutoras.length ? 'Estática máxima, com válvula redutora em ' + BR.redutoras.map(function (c) { return c.nome; }).join(', ') : 'Estática máxima na válvula mais baixa', BR.estMax, 'mca', 'limite ' + brn(N.pmax, 0) + ' mca');
        if (BR.npshd) { lf('NPSH disponível (1,0 Q)', BR.npshd1, 'mca'); lf('NPSH disponível (1,5 Q)', BR.npshd, 'mca'); if (temNpshr) lf('NPSH requerido, verificado a ' + qtx, BR.npshr, 'mca', npCurva ? 'curva do catálogo' : 'fabricante'); }
      } else if (modo !== 'gravidade') lt('Bomba adotada', 'não escolhida');
      sc('Pressurização (jockey), pressostatos e recalque');
      if (JR2.Qj) { lt('Bomba de pressurização', rotuloBomba(jk)); lf('Desliga a pressurização', JR2.d1, 'mca'); lf('Liga a pressurização', JR2.d2, 'mca'); lf('Liga a bomba principal', JR2.d3, 'mca'); }
      else lt('Bomba de pressurização', 'não lançada');
      lt('Recalque', (P.recalque ? ({ fachada: 'coluna na fachada', muro: 'coluna em abrigo embutido no muro', passeio: 'no passeio público' }[P.recalque.tipo] || 'tipo a definir') + ', DN' + (P.recalque.dn || 65) + ', entrada na cota ' + brn(P.recalque.z, 2) + ' m, ' + brn(P.recalque.L, 2) + ' m de tubo até a rede' : 'não registrado'), 'registro do dispositivo; não é dimensionado');
      if (RT_) { lm('Retorno para testes: vazão com o registro todo aberto', RT_.Q, 'L/min', brn(RT_.pct, 0) + '% da vazão nominal'); lm('Retorno para testes: perda no registro para a vazão nominal', RT_.hReg, 'mca', 'NPT 022, 5.10.6.3'); }
      sc('Verificações');
      RE.s(1, r, 'Verificação', 'cab'); RE.s(2, r, 'Situação', 'cab'); RE.s(3, r, 'ID', 'cab'); RE.s(4, r, 'Item da norma', 'cab'); r++;
      for (var vr2 = V1; vr2 <= V2; vr2++) { RE.s(1, r, { f: cl('Verificacoes', 2, vr2) }, 'ft'); RE.s(2, r, { f: CONF ? 'IF(' + cl('Verificacoes', 8, vr2) + '<>"","CONFERIDO",' + cl('Verificacoes', 5, vr2) + ')' : cl('Verificacoes', 5, vr2) }, 'ft'); RE.s(3, r, { f: cl('Verificacoes', 1, vr2) }, 'ft'); RE.s(4, r, { f: cl('Verificacoes', 6, vr2) }, 'pq'); r++; }
      lf('Verificações que não atendem', 'SUMPRODUCT((' + VSIT + '="ERRO")*1)', '', '', 'f0'); if (CONF) { var VCF = rg('Verificacoes', 8, V1, 8, V2); lf('Verificações a conferir', 'SUMPRODUCT((' + VSIT + '="ALERTA")*(' + VCF + '=""))', '', '', 'f0'); lf('Verificações conferidas pelo projetista', 'SUMPRODUCT((' + VSIT + '="ALERTA")*(' + VCF + '<>""))', '', '', 'f0'); }
      else lf('Verificações a conferir', 'SUMPRODUCT((' + VSIT + '="ALERTA")*1)', '', '', 'f0');
      r += 2; RE.s(1, r, 'Responsável técnico: ' + (ID.rt || '________________________________'), 'tx'); RE.s(4, r, 'Assinatura: ______________________________', 'tx'); r++;
      RE.s(1, r, (ID.registro ? 'Registro: ' + ID.registro : 'Registro: ____________') + (ID.art ? '   ART ou RRT: ' + ID.art : '   ART ou RRT: ____________'), 'tx'); RE.s(4, r, 'Data: ____/____/________', 'tx'); r += 2;
      RE.s(1, r, 'Gerado pelo ' + (opc.versao || 'FireCalc') + '. Os números desta página são fórmulas ligadas às abas de cálculo deste arquivo. Cinza: valor calculado pelo FireCalc, sem fórmula.', 'pq');
      RE.w = { 1: 46, 2: 34, 3: 8, 4: 44 }; RE.imp = { retrato: true, umaPagina: true }; W.chaves.resumo = { linhas: r }; W.versao = opc.versao || 'FireCalc';

      // ---- Memorial descritivo: texto gerado dos dados; o que a ferramenta não sabe fica marcado "A completar pelo projetista"
      var MD = FO.Memorial_descritivo, m = 1, AC = 'A completar pelo projetista: ';
      MD.s(1, m++, 'Memorial descritivo do sistema de ' + (tp.mangueira <= 25 ? 'mangotinhos' : 'hidrantes'), 'tit');
      MD.s(1, m++, 'Texto gerado dos dados do projeto. O documento que o Corpo de Bombeiros exige é o memorial de cálculo; este descritivo acompanha o projeto e precisa ser completado onde indicado.', 'pq');
      function sm(t) { m++; MD.s(1, m++, t, 'sec'); } function pm(t) { MD.s(1, m++, t, 'par'); }
      var dnsU = []; P.trechos.forEach(function (t) { if (dnsU.indexOf(t.dn) < 0) dnsU.push(t.dn); }); dnsU.sort(function (a, b) { return a - b; });
      var nomeN = P.norma === 'SP' ? 'IT 22/2025 do CBPMESP' : 'NPT 022 do CBMPR';
      sm('1. Objeto');
      pm('Sistema de ' + (tp.mangueira <= 25 ? 'mangotinhos' : 'hidrantes') + ' para combate a incêndio da edificação ' + ((P.meta && P.meta.nome) || P.nome || AP) + (ID.endereco ? ', ' + ID.endereco : '') + (ID.municipio ? ', ' + ID.municipio + (ID.uf ? ', ' + ID.uf : '') : '') + ', dimensionado conforme a ' + nomeN + '.');
      sm('2. Classificação e sistema adotado');
      pm((sd.divisao ? 'Ocupação da divisão ' + sd.divisao : 'Divisão de ocupação: ' + AP) + (typeof sd.area === 'number' ? ', com área considerada de ' + brn(sd.area, 0) + ' m²' : '') + (typeof sd.carga === 'number' ? ' e carga de incêndio de ' + brn(sd.carga, 0) + ' MJ/m²' : '') + (sd.coluna ? ', enquadrada na coluna ' + sd.coluna + ' da tabela de reserva de incêndio' : '') + '.');
      pm('Sistema tipo ' + tp.id + ': ' + brn(tp.Q, 0) + ' L/min e ' + brn(tp.P, 0) + ' mca por jato, ' + (tp.exp > 1 ? tp.exp + ' expedições por ponto' : 'uma expedição por ponto') + ', esguicho de ' + tp.esguicho + ' mm e mangueira de ' + tp.mangueira + ' mm (' + (P.norma === 'SP' ? 'IT 22, Tabela 2' : 'NPT 022, Tabela 1') + ').' + (UN ? ' A rede tem um só hidrante simples, e o cálculo considera um jato (leitura do item 4.8.3 da IT 22, que define os dois jatos para sistemas com mais de um hidrante simples).' : ' O cálculo considera o uso simultâneo dos dois jatos mais desfavoráveis.'));
      var ROTL = { Q: ['vazão por jato', ' L/min'], P: ['pressão mínima', ' mca'], mangueiraDN: ['diâmetro da mangueira', ' mm'], Lmang: ['comprimento da mangueira', ' m'], alcance: ['alcance exigido do jato', ' m'] };
      if (LN.alterados.length) pm('Dados do esguicho e da mangueira diferentes da tabela oficial (' + TABN + '), adotados pelo projetista: ' + LN.alterados.map(function (a) { return ROTL[a.campo][0] + ' de ' + brn(a.valor, a.valor % 1 ? 2 : 0) + ROTL[a.campo][1] + ' (oficial: ' + brn(a.oficial, 0) + ROTL[a.campo][1] + (a.fonte ? '; fonte: ' + a.fonte : '') + ')'; }).join('; ') + '.');
      if (PARANA && num0.pontoProjeto) { var PJ = num0.pontoProjeto;
        pm('Critério de cálculo do Paraná: a vazão é obtida na saída do esguicho (NPT 022, 5.7.1) e a pressão mínima de ' + brn(LN.P, 0) + ' mca vale na ponta do esguicho (Tabela 1, nota 4); a conta soma a perda no esguicho, na mangueira e na rede (5.7.8 e 5.7.8.1). Ponto de projeto do hidrante mais desfavorável, com o esguicho ' + PJ.esguicho + ': ' + brn(PJ.Pentrada, 2) + ' mca na entrada do esguicho' + (PJ.informado ? ' (pressão informada pelo projetista; fonte: ' + (LN.fontePentrada || 'a completar pelo projetista') + '; mínima calculada: ' + brn(PJ.PeMin, 2) + ' mca)' : ' (mínima calculada)') + ', ' + brn(PJ.Q, 1) + ' L/min' + (PJ.ponta !== null ? ' e ' + brn(PJ.ponta, 2) + ' mca na ponta' : '') + '; perda na mangueira de ' + brn(PJ.mangueira, 2) + ' mca.' +
          (PJ.ponta === null ? ' A base da ferramenta não tem a pressão na ponta deste esguicho. ' + AC + 'comprovação da pressão mínima na ponta pelo catálogo do fabricante.' : '') + ' Alcance exigido de ' + brn(LN.alcance, LN.alcance % 1 ? 2 : 0) + ' m: ' + (PJ.naTabela ? 'o catálogo dá ' + brn(PJ.alcance, 1) + ' m nesse ponto, ensaiado a 45 graus; a NPT 022 mede o alcance com o jato paralelo ao solo (5.10.2.3). ' : 'o ponto de projeto fica fora da tabela de ensaio do fabricante. ') + AC + 'comprovação do alcance (ensaio ou declaração do fabricante).'); }
      var redMD = (num0.redutoras || []);
      sm('3. Hidrantes');
      pm(P.hidrantes.length + (P.hidrantes.length > 1 ? ' pontos' : ' ponto') + ' no cálculo: ' + P.hidrantes.map(function (h) { return (h.id || h.no) + ' (válvula na cota ' + brn(ctx.z(h.no), 2) + ' m)'; }).join('; ') + '.' + (temB ? ' Pressão calculada pelo esguicho do catálogo (' + jatos.filter(function (j) { return j.esguicho; }).map(function (j) { return j.esguicho; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join('; ') + '), com a perda de carga da mangueira.' : ' Pressão contada na válvula do hidrante.'));
      if (redMD.length) pm('Válvula redutora de pressão: ' + redMD.map(function (r) { return r.nome + ', com pressão de saída regulada em ' + brn(r.P, 1) + ' mca' + (r.montante === null ? '' : ' (estática antes da válvula: ' + brn(r.montante, 1) + ' mca)') + (r.fonte ? '; fonte da regulagem: ' + r.fonte : ''); }).join('. ') + '. A regulagem declarada vale como pressão do ponto na verificação do limite de 100 mca (IT 22, 4.8.8); a IT não descreve o dispositivo, e o critério segue a indicação de dispositivos redutores do Brentano (cap. 15). ' + AC + 'modelo da válvula, posição na instalação e forma de ensaio da regulagem.');
      pm(AC + 'abrigos, comprimento e lances das mangueiras, chaves, esguichos e demais materiais de cada ponto (IT 22, Tabela 4); prova de cobertura pelo trajeto real e posição dos pontos (IT 22, 4.7.1 e 4.8.2).');
      sm('4. Tubulação');
      pm('Tubo ' + nomeTuboP(P, D) + (outrosTubos(P, D).length ? ' (trechos com outro tubo: ' + outrosTubos(P, D).join('; ') + ')' : '') + ', nos diâmetros nominais ' + dnsU.map(function (d) { return 'DN' + d; }).join(', ') + ', com o diâmetro interno da tabela da norma do tubo. Perda de carga por Hazen-Williams (IT 22, 4.8.10.2) com fator C igual a ' + brn(P.C, 0) + (P.trechos.some(function (t) { return t.C; }) ? ' (trechos com fator C próprio: ' + P.trechos.filter(function (t) { return t.C; }).map(function (t) { return t.nome + ' com ' + t.C; }).join('; ') + ')' : '') + '. Comprimentos equivalentes: ' + D.leq[tab].titulo + ' (' + D.leq[tab].fonte + ').');
      pm(AC + 'material e tipo de junta, pintura e identificação, suportes e proteção da tubulação.');
      sm('5. Reservatório e reserva de incêndio');
      pm((modo === 'bomba' ? 'Abastecimento por bomba de incêndio' : modo === 'reforco' ? 'Abastecimento por reservatório elevado com bomba de reforço' : 'Abastecimento só por gravidade, de reservatório elevado') + '.' + (P.fonte && P.fonte.rtiEfetiva !== undefined ? ' Reserva de incêndio efetiva de ' + brn(P.fonte.rtiEfetiva, 1) + ' m³' + (num0.rtiTabela !== undefined ? ' (a tabela da norma pede ' + brn(num0.rtiTabela, 0) + ' m³)' : '') + '.' : '') + (bombaModo && P.fonte && P.fonte.zX !== undefined ? ' Nível X (água quando só resta a reserva de incêndio) na cota ' + brn(P.fonte.zX, 2) + ' m.' : '') + (P.fonte && P.fonte.zCheio !== undefined ? ' Reservatório cheio na cota ' + brn(P.fonte.zCheio, 2) + ' m.' : ''));
      pm(AC + 'tipo, material, volume total e localização do reservatório, e como a reserva de incêndio fica garantida (IT 22, 4.9 e Anexo B).');
      sm('6. Bomba de incêndio');
      if (bomb && modo !== 'gravidade') {
        pm('Bomba ' + rotuloBomba(bomb, num0.potEixo) + '. Vazão de projeto de ' + brn(num0.Qth, 2) + ' m³/h com altura manométrica de ' + brn(num0.AMT, 2) + ' mca; na vazão de projeto a bomba entrega ' + brn(num0.Hb, 2) + ' mca' + (num0.Qw !== undefined ? ', e o ponto de trabalho fica em ' + brn(num0.Qw, 2) + ' m³/h e ' + brn(num0.Hw, 2) + ' mca' : '') + '.' + (bombaModo && P.nos.BI && P.fonte ? (P.nos.BI.z > P.fonte.zX ? ' Eixo da bomba ' + brn(P.nos.BI.z - P.fonte.zX, 2) + ' m acima do nível X (sucção negativa).' : ' Bomba afogada (eixo no nível X ou abaixo dele).') : ''));
        pm(AC + 'casa de bombas, barrilete (válvula de retenção e registros), manômetro, quadro de comando e alimentação elétrica (IT 22, Anexo C).');
      } else pm(modo === 'gravidade' ? 'Sistema sem bomba: a pressão vem só do desnível do reservatório elevado.' : 'Bomba ainda não escolhida no projeto.');
      sm('7. Pressurização e acionamento');
      pm(JR2.Qj ? 'Bomba de pressurização (jockey) ' + rotuloBomba(jk) + '. Pressostatos: a pressurização desliga em ' + brn(num0.escada.desligaJockey, 1) + ' mca e liga em ' + brn(num0.escada.ligaJockey, 1) + ' mca; a bomba principal liga em ' + brn(num0.escada.ligaPrincipal, 1) + ' mca, a pressão calculada na descarga. A escada parte da pressão calculada e o desligamento da pressurização não passa de ' + brn(num0.escada.teto, 1) + ' mca, a pressão de shut-off da principal no cavalete (IT 22, C.1.15.1).' : 'Bomba de pressurização (jockey) não lançada no projeto.');
      pm(AC + 'acionamento manual junto aos hidrantes, quando exigido, sinalização e alarme de bomba em funcionamento.');
      sm('8. Dispositivo de recalque');
      pm(P.recalque ? 'Dispositivo de recalque: ' + (P.recalque ? ({ fachada: 'coluna na fachada', muro: 'coluna em abrigo embutido no muro', passeio: 'no passeio público' }[P.recalque.tipo] || 'tipo a definir') + ', DN' + (P.recalque.dn || 65) + ', entrada na cota ' + brn(P.recalque.z, 2) + ' m, ' + brn(P.recalque.L, 2) + ' m de tubo até a rede' : 'não registrado') + '. O recalque recebe água da viatura do Corpo de Bombeiros e não é dimensionado (' + (P.norma === 'PR' ? 'NPT 022, 5.3' : 'IT 22, 4.3') + ').' : 'Dispositivo de recalque não registrado.');
      pm(AC + 'tipo (coluna ou passeio), posição, tampa, sinalização e válvula de retenção do recalque (IT 22, 4.3 e Figura 1).');
      if (P.norma === 'PR') { sm('9. Ramal de retorno para testes');
        pm(RT_ ? 'Ramal de retorno em DN' + P.retorno.trechos[0].dn + '. Com o registro todo aberto passam ' + brn(RT_.Q, 1) + ' L/min (' + brn(RT_.pct, 0) + '% da vazão nominal de ' + brn(RT_.Qnom, 1) + ' L/min). Para o ensaio na vazão nominal o registro de regulagem precisa dar ' + brn(RT_.hReg, 1) + ' mca de perda (NPT 022, 5.10.6.3 e 5.7.2.1).' : (P.retornoTeste ? 'Ramal de retorno para testes previsto, sem os trechos lançados no cálculo.' : 'Ramal de retorno para testes não lançado.')); }
      sm((P.norma === 'PR' ? '10' : '9') + '. Ensaios e manutenção');
      pm(AC + 'ensaios de recebimento, rotina de inspeção e manutenção do sistema e responsáveis.');
      MD.w = { 1: 92 }; MD.imp = { retrato: true };
    })();
    // ---- casas decimais por grandeza nas abas técnicas (só o formato; o valor não muda), painéis congelados e logo
    function fmtRot(t) {
      t = String(t || '');
      if (/Σk|^k = /.test(t)) return '0.000E+00';
      if (/^J \(m\/m\)|J unit|J mangueira/.test(t)) return '0.00000';
      if (/índice|Posição|^DN$|\(k\)$|Saídas|Coeficiente C|^C$|crítico \(1\)|com ERRO|com ALERTA|Menor DN/.test(t)) return '0';
      if (/D interno/.test(t)) return '0.0';
      return '0.00';
    }
    ['Capa', 'Memorial', 'Premissas', 'Trechos', 'Topologia', 'Pares', 'Hipotese', 'Bomba', 'Jockey', 'Reservatorio', 'Verificacoes'].forEach(function (nome) {
      var f = FO[nome], ks = Object.keys(f.c), porLin = {};
      ks.forEach(function (k) { var c = f.c[k]; porLin[c.ro] = (porLin[c.ro] || 0) + 1; });
      ks.forEach(function (k) {
        var c = f.c[k]; if (['fo', 'am', 'mo'].indexOf(c.est) < 0 || c.fmt) return;
        var a = f.c['A' + c.ro], rot = null;
        if (porLin[c.ro] <= 4 && c.co > 1 && a && typeof a.v === 'string') rot = a.v;     // linha de rótulo e valor
        else for (var r = c.ro - 1; r >= 1; r--) { var h = f.c[A(c.co, r)]; if (h && h.est === 'cab') { rot = h.v; break; } }   // coluna de tabela
        c.fmt = fmtRot(rot);
      });
    });
    FO.Trechos.congela = [1, 3]; FO.Topologia.congela = [1, 3]; FO.Pares.congela = [1, 3]; FO.Hipotese.congela = [1, 1]; FO.Bomba.congela = [1, 1];
    FO.Premissas.congela = [0, 1]; FO.Jockey.congela = [0, 1]; FO.Reservatorio.congela = [0, 1]; FO.Verificacoes.congela = [0, 2]; FO.Tabelas_norma.congela = [0, 1]; FO.Memorial.congela = [0, 2];
    W.logo = opc.logo || null;
    // chaves para o teste
    W.chaves.Qcrit = ['Memorial', 2, 0]; W.chaves.rotulos = [];
    W.chaves.mapa = { PA: BR && HR.PA, Qt: HR.Qt, AMT: HR.AMT, Pd: HR.Pd, Qc: adIdx('Qc'), Qo: adIdx('Qo'), Pvo: adIdx('Pvo'), Pvc: adIdx('Pvc'), dif: adIdx('dif'), Qw: BR.Qw, Hw: BR.Hw, estMax: BR.estMax, npshd: BR.npshd, dur: RR.dur, Qj: JR2.Qj, d1: JR2.d1, d2: JR2.d2, d3: JR2.d3, vmax: vivo.V06 && vivo.V06.v, Hnom: BR.H };
    W.chaves.VSIT = VSIT; W.chaves.V1 = V1; W.chaves.V2 = V2;
    // nomes de aba por extenso: o código monta tudo com os nomes internos, sem acento; aqui eles viram os nomes que o usuário vê,
    // nas abas, nas fórmulas (com aspas) e nos textos que citam a aba
    var NOMES = { Memorial_descritivo: 'Memorial descritivo', Passo_a_passo: 'Passo a passo', Hipotese: 'Hipótese de cálculo', Jockey: 'Pressurização', Reservatorio: 'Reservatório', Verificacoes: 'Verificações', Tabelas_norma: 'Tabelas da norma' };
    var reF = /\b(Memorial_descritivo|Passo_a_passo|Hipotese|Jockey|Reservatorio|Verificacoes|Tabelas_norma)!/g, reT = /\b(Memorial_descritivo|Passo_a_passo|Hipotese|Reservatorio|Verificacoes|Tabelas_norma)\b/g;
    function nomeF(t) { return t.replace(reF, function (m, n) { return "'" + NOMES[n] + "'!"; }); }
    function nomeT(t) { return t.replace(reT, function (n) { return NOMES[n]; }); }
    W.folhas.forEach(function (f) {
      Object.keys(f.c).forEach(function (k) { var c = f.c[k]; if (c.f !== undefined) c.f = nomeF(c.f); else if (typeof c.v === 'string') c.v = c.v === 'Jockey' ? NOMES.Jockey : nomeT(c.v); });
      if (NOMES[f.nome]) f.nome = NOMES[f.nome];
    });
    (function anda(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === 'string') o[k] = NOMES[v] || nomeF(v); else if (v && typeof v === 'object') anda(v); }); })(W.chaves);
    W.nomes = NOMES;
    return W;
  }

  // ------------------------------------------------------------ gerador ExcelJS
  var ESTILO = {
    tit: { font: { bold: true, size: 14, color: 'FFA84300' } }, cab: { font: { bold: true }, fill: 'FFECECEA' }, tx: {}, in: { font: { color: 'FF0000FF' } }, fo: { font: { color: 'FF000000' }, fmt: '0.0000' },
    am: { fill: 'FFFFF6D9', fmt: '0.0000' }, mo: { font: { color: 'FF595959' }, fill: 'FFE7E6E6', fmt: '0.0000' },
    // seção (faixa na cor da marca), fórmula com 2 casas, inteiro, texto vindo de fórmula, valor do motor com 2 casas, letra pequena e parágrafo
    sec: { font: { bold: true, color: 'FFFFFFFF' }, fill: 'FFB84A00' }, f2: { fmt: '0.00', alinha: 'left' }, f0: { fmt: '0', alinha: 'left' }, ft: { quebra: true }, m2: { font: { color: 'FF595959' }, fill: 'FFE7E6E6', fmt: '0.00', alinha: 'left' },
    pq: { font: { size: 8, color: 'FF5A5A5A' }, quebra: true }, par: { quebra: true },
    // passo a passo: operador entre os valores, resultado da conta, fórmula escrita
    op: { font: { color: 'FF5A5A5A' }, alinha: 'center' }, res: { font: { bold: true }, fill: 'FFFFEBDD', fmt: '0.00', alinha: 'right' }, fx: { font: { italic: true, color: 'FF8A3800' } }
  };
  var DIREITOS = '© 2026 Mateus Beraldi Nobre. Software livre sob a AGPL-3.0, sem garantia.';
  function gerar(ExcelJS, W, opc) {
    opc = opc || {};
    var wb = new ExcelJS.Workbook();
    wb.creator = 'FireCalc'; wb.created = new Date(); wb.title = 'Memória de cálculo de hidrantes (FireCalc)';
    W.folhas.forEach(function (f) {
      var ws = wb.addWorksheet(f.nome, {});
      Object.keys(f.c).forEach(function (k) {
        var c = f.c[k], cell = ws.getCell(k);
        if (c.f !== undefined) {
          var r = c.r; if (r instanceof XlErr) r = { error: r.code };
          cell.value = opc.semValor ? { formula: c.f } : { formula: c.f, result: r };
        } else cell.value = c.v;
        var e = ESTILO[c.est || 'tx'] || {};
        if (e.font) cell.font = e.font; if (e.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: e.fill } };
        var fm = c.fmt || e.fmt; if (fm && (c.f !== undefined || typeof c.v === 'number') && c.est !== 'in') cell.numFmt = fm;
        if (e.quebra || e.alinha) cell.alignment = { wrapText: !!e.quebra, vertical: 'top', horizontal: e.alinha || 'left' };
        if (c.est === 'par' && typeof c.v === 'string') ws.getRow(c.ro).height = 15 * Math.max(1, Math.ceil(c.v.length / 95));
      });
      var maxc = 0; Object.keys(f.c).forEach(function (k) { if (f.c[k].co > maxc) maxc = f.c[k].co; });
      for (var i = 1; i <= maxc; i++) ws.getColumn(i).width = (f.w && f.w[i]) || 14;
      // impressão pronta em todas as abas (o usuário gera o PDF no Excel ou no LibreOffice): A4, largura de uma página, rodapé com versão e paginação
      var maxr = 0, imp = f.imp || {}; Object.keys(f.c).forEach(function (k) { if (f.c[k].ro > maxr) maxr = f.c[k].ro; });
      ws.pageSetup = { paperSize: 9, orientation: imp.retrato ? 'portrait' : 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: imp.umaPagina ? 1 : 0, horizontalCentered: true,
        margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 }, printArea: 'A1:' + L(Math.max(1, maxc)) + Math.max(1, maxr) };
      ws.headerFooter = { oddHeader: '&R&8' + f.nome.replace(/_/g, ' '), oddFooter: '&L&7' + (W.versao || 'FireCalc') + '. ' + DIREITOS + '&R&8Página &P de &N' };
      ws.views = [f.congela ? { state: 'frozen', xSplit: f.congela[0], ySplit: f.congela[1], showGridLines: false } : { showGridLines: false }];
      // logo do FireCalc no alto do Resumo (imagem PNG embutida pelo build; sem ela a planilha sai igual, só sem a figura)
      if (f.nome === 'Resumo' && W.logo) { try { ws.addImage(wb.addImage({ base64: W.logo, extension: 'png' }), { tl: { col: 3.02, row: 0.1 }, ext: { width: 146, height: 42 } }); } catch (e) { } }
    });
    return wb;
  }
  return { modelo: modelo, avalia: avalia, gerar: gerar, XlErr: XlErr, A: A, L: L, VERSAO: VERSAO_EXPORTA };
});
