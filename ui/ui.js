/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc, interface: telas 0 a 8 sobre o motor.js. Sem dependência externa. Texto sem travessões. */
(function () {
  'use strict';
  var D = FIREDADOS, M = FireMotor, CASOS = FIRECASOS, REF = FIREREF;
  var VERSAO = 'FireCalc 1.0.0';
  var TELAS = ['Projeto', 'Sistema', 'Materiais', 'Trechos', 'Hidrantes', 'Fonte', 'Bomba', 'Resultados', 'Exportar'];
  D.bombasBase = D.bombas.slice();
  var S = { proj: null, tela: 0, sel: 0, R: null, upd: [], auto: null, msg: '' };

  // ------------------------------------------------------------------ utilidades
  function $(tag, a, kids) {
    var e = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v; else if (k === 'checked') e.checked = !!v;
      else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c === null || c === undefined) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function fmt(v, d) { if (v === undefined || v === null || typeof v !== 'number' || isNaN(v)) return '-'; return v.toFixed(d === undefined ? 2 : d).replace('.', ','); }
  function pn(s) { var v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isNaN(v) ? null : v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function badge(sit, txt) { return $('span', { class: 'badge ' + sit, text: txt || sit }); }
  function norma() { return D.normas[S.proj.norma]; }
  function numIn(valor, onSet, extra) {
    var i = $('input', { type: 'text', inputmode: 'decimal', class: 'n', value: valor === undefined || valor === null || valor === '' ? '' : String(typeof valor === 'number' ? Math.round(valor * 1e4) / 1e4 : valor).replace('.', ',') });
    if (extra && extra.w) i.style.width = extra.w;
    i.addEventListener('input', function () { var v = pn(i.value); onSet(v); mudou(); });
    return i;
  }
  function txtIn(valor, onSet, cls) {
    var i = $('input', { type: 'text', class: cls || '', value: valor || '' });
    i.addEventListener('input', function () { onSet(i.value); mudou(); });
    return i;
  }
  function sel(opcoes, valor, onSet, estr) {   // opcoes: [[valor, rotulo]]
    var s = $('select', null, opcoes.map(function (o) { return $('option', { value: o[0], text: o[1], selected: String(o[0]) === String(valor) ? 'selected' : null }); }));
    s.value = String(valor);
    s.addEventListener('change', function () { onSet(s.value); mudou(!!estr); });
    return s;
  }
  function lab(texto, ctl) { return $('label', null, [texto, ctl]); }
  function llab(texto, ctl) { return $('label', { class: 'l' }, [ctl, texto]); }
  function chk(valor, onSet, estr) { var c = $('input', { type: 'checkbox', checked: valor }); c.addEventListener('change', function () { onSet(c.checked); mudou(!!estr); }); return c; }

  // ------------------------------------------------------------------ projeto
  function modeloMinimo() {
    return { meta: { nome: 'Projeto novo', edificacao: '' }, norma: 'SP', tabelaLeq: 'A', tubo: { norma: 'NBR 5580', classe: 'leve' }, C: 120,
      sistema: { coluna: '1-t2', area: 1000, esg4: '40' }, ambiente: { altitude: 700, temperatura: 20 },
      fonte: { modo: 'bomba', zX: 0.465, zCheio: 2.095, rtiEfetiva: 8 },
      nos: { H1: { z: 1.2 }, H2: { z: 1.2 }, A: { z: -0.5 }, BI: { z: 0.3 }, RI: { z: 0.465 } },
      trechos: [{ nome: 'A-H1', dn: 65, L: 20, pecas: { te_sl: 1, cot90_medio: 2, angulo: 1 } }, { nome: 'A-H2', dn: 65, L: 15, pecas: { te_pd: 1, cot90_medio: 2, angulo: 1 } },
        { nome: 'BI-A', dn: 65, L: 5, pecas: { gaveta: 1, ret_leve: 1, cot90_medio: 2 } }, { nome: 'RI-BI', dn: 65, L: 1, pecas: { entrada_normal: 1, gaveta: 1 } }],
      hidrantes: [{ id: 'H-1', no: 'H1', caminho: 'A', alturaValvula: 1.2 }, { id: 'H-2', no: 'H2', caminho: 'A', alturaValvula: 1.2 }] };
  }
  function normaliza(p) {
    p.meta = p.meta || { nome: p.nome || 'Projeto', edificacao: '' };
    if (!p.meta.nome && p.nome) p.meta.nome = p.nome;
    p.norma = p.norma || 'SP'; p.tabelaLeq = p.tabelaLeq || 'A'; p.tubo = p.tubo || { norma: 'NBR 5580', classe: 'leve' }; p.C = p.C || 120;
    p.sistema = p.sistema || {};
    var s = p.sistema;
    if (!s.coluna) { s.tipoManual = s.tipoManual || s.tipo || '2'; s.coluna = p.norma === 'SP' ? '1-t2' : '2'; s.area = s.area || 1000; }
    if (!s.area) s.area = 1000;
    if (!s.esg4) s.esg4 = s.tipo === '4-65' ? '65' : '40';
    if (s.tipo && !s.tipoManual) {   // tipo explícito do caso deve coincidir com a classificação; se não, vale como manual
      var cl = M.classifica(D, p.norma, s.coluna, s.area), tf = cl && tipoDe(cl.tipo, s.esg4);
      if (tf !== s.tipo) s.tipoManual = s.tipo;
    }
    delete s.tipo;
    p.ambiente = p.ambiente || { altitude: 700, temperatura: 20 }; p.fonte = p.fonte || { modo: 'bomba', zX: 0, zCheio: 2 };
    p.nos = p.nos || {}; p.trechos = p.trechos || []; p.hidrantes = p.hidrantes || [];
    p.trechos.forEach(function (t) { t.pecas = t.pecas || {}; });
    if (p.recalque && p.recalque.ativo === undefined) p.recalque.ativo = true;
    return p;
  }
  function tipoDe(t, esg4) { return (t === '4' || t === '4-40') ? (esg4 === '65' ? '4-65' : '4-40') : t; }
  function tipoFinal() {
    var s = S.proj.sistema; if (s.tipoManual) return s.tipoManual;
    var cl = M.classifica(D, S.proj.norma, s.coluna, s.area); return cl ? tipoDe(cl.tipo, s.esg4) : null;
  }
  function tipoObj() { var id = tipoFinal(); return id && norma().tipos.filter(function (t) { return t.id === id; })[0]; }
  function raizAtual() { return S.proj.fonte.modo === 'bomba' ? 'BI' : 'RI'; }
  function carregarCaso(id) {
    var c = CASOS.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    S.proj = normaliza(clone(c.proj)); S.proj.meta.nome = c.rotulo; S.sel = 0; mudou(true);
  }
  function paraMotor() {
    var P = clone(S.proj), s = P.sistema;
    delete P.meta;
    P.sistema = { coluna: s.coluna, area: s.area, tipo: tipoFinal() };
    if (s.divisao) { P.sistema.divisao = s.divisao; if (typeof s.carga === 'number') P.sistema.carga = s.carga; }
    if (!P.bomba || !P.bomba.id) delete P.bomba;
    if (!P.jockey || !P.jockey.id) delete P.jockey;
    if (!P.recalque || !P.recalque.ativo) delete P.recalque; else { delete P.recalque.ativo; }
    var to = tipoObj(), mod0 = D.esguichos.length ? D.esguichos[0].modelo : '';
    P.hidrantes.forEach(function (h) {
      if (h.alturaValvula === null || h.alturaValvula === '') delete h.alturaValvula;
      if (P.norma === 'PR' || h.caminho === 'B') { h.caminho = 'B'; h.esguicho = h.esguicho || mod0; h.mangueiraDN = h.mangueiraDN || (to ? to.mangueira : 40); h.Lmang = h.Lmang || 30; }
    });
    P.trechos = P.trechos.filter(function (t) { return true; });
    delete P.mangueirasUsuario; delete P.bombasUsuario;
    return P;
  }
  function calc() {
    D.mangueirasUsuario = S.proj.mangueirasUsuario || {};
    D.bombas = D.bombasBase.concat((S.proj.bombasUsuario || []).filter(function (b) { return b.id; }));
    try { S.R = { res: M.calcular(paraMotor(), D) }; } catch (e) { S.R = { erro: e.message }; }
  }
  var salvaTimer = null;
  function mudou(estrutura) {
    calc();
    if (estrutura) render(); else atualiza();
    clearTimeout(salvaTimer);
    salvaTimer = setTimeout(function () { try { localStorage.setItem('firecalc_auto', JSON.stringify(S.proj)); } catch (e) { /* sem armazenamento */ } }, 400);
  }
  function atualiza() { S.upd.forEach(function (f) { f(); }); resumo(); cabecalho(); }

  // nós e fluxos
  function nosDaRede() {
    var v = {}, l = [];
    S.proj.trechos.forEach(function (t) { String(t.nome || '').split('-').forEach(function (n) { n = n.trim(); if (n && !v[n]) { v[n] = 1; l.push(n); } }); });
    return l;
  }
  function garanteNos() {
    var u = nosDaRede(); u.forEach(function (n) { if (!S.proj.nos[n]) S.proj.nos[n] = { z: 0 }; });
    Object.keys(S.proj.nos).forEach(function (n) { if (u.indexOf(n) < 0) delete S.proj.nos[n]; });
    return u;
  }
  function fluxos() {
    var m = {}, r = S.R && S.R.res; if (!r) return m;
    var p = r.par, ctx = r.ctx;
    p.tronco.forEach(function (e) { m[e.t.nome] = p.Qt; });
    p.ramalCrit.forEach(function (e) { m[e.t.nome] = p.Qcrit; });
    p.ramalOut.forEach(function (e) { m[e.t.nome] = p.Qout; });
    (ctx.suc || []).forEach(function (e) { m[e.t.nome] = p.Qt; });
    return m;
  }

  // ------------------------------------------------------------------ cabeçalho, navegação e resumo
  function cabecalho() {
    var P = S.proj, e = document.getElementById('cab'); e.textContent = '';
    e.appendChild($('span', null, ['Norma ', $('b', { text: P.norma }), '  |  Tubo ', $('b', { text: P.tubo.norma + ' ' + P.tubo.classe }), '  |  C ', $('b', { text: String(P.C) }), '  |  Leq ', $('b', { text: P.tabelaLeq })]));
  }
  function navega() {
    var n = document.getElementById('nav'); n.textContent = '';
    TELAS.forEach(function (t, i) { n.appendChild($('button', { class: i === S.tela ? 'at' : '', onclick: function () { S.tela = i; render(); window.scrollTo(0, 0); } }, [$('span', { class: 'n', text: String(i) }), t])); });
  }
  function resumo() {
    var a = document.getElementById('res'); a.textContent = '';
    a.appendChild($('h3', { text: 'Resumo' }));
    if (!S.R) return;
    if (S.R.erro) { a.appendChild($('div', { class: 'msg er', text: 'Não calculável: ' + S.R.erro })); return; }
    var r = S.R.res, n = r.numeros, dl = $('dl');
    function ln(k, v) { dl.appendChild($('dt', { text: k })); dl.appendChild($('dd', { text: v })); }
    ln('Tipo', String(n.tipo)); ln('Par adotado', n.par); ln('Ponto A', n.A);
    ln('Vazão total', fmt(n.Qt, 2) + ' L/min'); ln('Pressão em A', fmt(n.PA, 2) + ' mca');
    if (n.Pd !== undefined) ln('Descarga da bomba', fmt(n.Pd, 2) + ' mca');
    ln(S.proj.fonte.modo === 'bomba' ? 'AMT' : 'Altura do reforço', fmt(n.AMT, 2) + ' mca');
    if (n.dur !== undefined) ln('Duração da RTI', fmt(n.dur, 1) + ' min');
    if (n.Qw !== undefined) { ln('Ponto de trabalho', fmt(n.Qw, 2) + ' m³/h'); ln('', fmt(n.Hw, 2) + ' mca'); }
    a.appendChild(dl);
    var c = { ERRO: 0, ALERTA: 0, OK: 0 }; r.verificacoes.forEach(function (v) { if (c[v.situacao] !== undefined) c[v.situacao]++; });
    a.appendChild($('p', { style: 'margin:10px 0 0' }, [badge('ERRO', c.ERRO + ' erro(s)'), ' ', badge('ALERTA', c.ALERTA + ' alerta(s)'), ' ', badge('OK', c.OK + ' ok')]));
    if (r.erros.length) a.appendChild($('div', { class: 'msg al', text: r.erros.length + ' aviso(s) de estrutura (tela Trechos)' }));
  }

  function render() {
    S.upd = []; garanteNos();
    navega();
    var host = document.getElementById('tela'); host.textContent = '';
    var f = [tela0, tela1, tela2, tela3, tela4, tela5, tela6, tela7, tela8][S.tela];
    host.appendChild(f());
    atualiza();
  }
  window.__hc = { S: S, M: M, D: D, mudou: mudou, render: render, carregarCaso: carregarCaso, calc: calc, paraMotor: paraMotor };

  // ------------------------------------------------------------------ blocos reutilizáveis
  function tabela(cab, linhas, cls) {
    var t = $('table', cls ? { class: cls } : null, [$('thead', null, [$('tr', null, cab.map(function (c) { return $('th', { class: c[1] || '', text: c[0] }); }))]), $('tbody', null, linhas)]);
    return $('div', { class: 'tw' }, [t]);
  }
  function td(x, cls) { return $('td', cls ? { class: cls } : null, [x === undefined || x === null ? '' : (typeof x === 'string' ? document.createTextNode(x) : x)]); }
  function spanUpd(fn) { var s = $('span'); S.upd.push(function () { s.textContent = fn(); }); s.textContent = fn(); return s; }
  function cell(fn, cls) { return $('td', { class: cls || 'r' }, [spanUpd(fn)]); }
  function dnsDisponiveis() {
    var t = S.proj.tubo, l = [];
    D.tubos.forEach(function (x) { if (x.norma === t.norma && x.classe === t.classe && l.indexOf(x.dn) < 0) l.push(x.dn); });
    return l.sort(function (a, b) { return a - b; });
  }
  function tuboDe(dn) { return M.achaTubo(D, S.proj.tubo.norma, S.proj.tubo.classe, dn); }
  function trechoInfo(nome) { var r = S.R && S.R.res; if (!r) return null; return r.ctx.grafo.tr.filter(function (t) { return t.nome === nome; })[0] || null; }

  /** Editor de peças: tabela com todas as peças da tabela de Leq do projeto; dn vem de dnFn(). */
  function pecasEd(pecas, dnFn, restr) {
    var tab = D.leq[S.proj.tabelaLeq], ids = Object.keys(tab.pecas), tot = $('b'), filtro = '';
    var corpo = $('tbody');
    function soma() {
      var dn = dnFn(), s = 0;
      Object.keys(pecas).forEach(function (id) { var r = M.leqPeca(D, S.proj.tabelaLeq, id, dn); if (!r.erro) s += pecas[id] * r.v; });
      return s;
    }
    var subs = [];
    function monta() {
      corpo.textContent = ''; subs = [];
      ids.forEach(function (id) {
        if (restr && restr.indexOf(id) < 0) return;
        var nome = tab.pecas[id].nome;
        if (filtro && (nome + ' ' + id).toLowerCase().indexOf(filtro) < 0 && !pecas[id]) return;
        var inp = $('input', { type: 'text', class: 'cx', inputmode: 'numeric', value: pecas[id] ? String(pecas[id]) : '' });
        var sub = $('td', { class: 'r' }), leqc = $('td', { class: 'r' });
        function pinta() {
          var r = M.leqPeca(D, S.proj.tabelaLeq, id, dnFn());
          leqc.textContent = r.erro ? 'sem valor' : fmt(r.v, 2);
          sub.textContent = r.erro ? '' : (pecas[id] ? fmt(pecas[id] * r.v, 2) : '');
        }
        subs.push(pinta);
        inp.addEventListener('input', function () { var v = parseInt(inp.value, 10); if (v > 0) pecas[id] = v; else delete pecas[id]; pinta(); tot.textContent = fmt(soma(), 2) + ' m'; mudou(false); });
        pinta();
        corpo.appendChild($('tr', null, [td(nome), td(inp), leqc, sub]));
      });
    }
    monta();
    var fi = $('input', { type: 'text', class: 'w', placeholder: 'filtrar peças (ex.: cotovelo, tê, gaveta)' });
    fi.addEventListener('input', function () { filtro = fi.value.toLowerCase(); monta(); });
    S.upd.push(function () { subs.forEach(function (f) { f(); }); tot.textContent = fmt(soma(), 2) + ' m'; });
    tot.textContent = fmt(soma(), 2) + ' m';
    return $('div', null, [$('div', { class: 'fl' }, [fi, $('span', { style: 'margin:0 0 10px 12px' }, ['Leq total das peças: ', tot])]),
      $('div', { class: 'tw', style: 'max-height:300px' }, [$('table', null, [$('thead', null, [$('tr', null, [$('th', { text: 'Peça (' + tab.titulo.split(',')[0] + ')' }), $('th', { text: 'Qtd' }), $('th', { class: 'r', text: 'Leq (m)' }), $('th', { class: 'r', text: 'Subtotal (m)' })])]), corpo])])]);
  }
  function cab(t, n) { return [$('h2', { text: t }), n ? $('p', { class: 'nota', text: n }) : null]; }

  // ------------------------------------------------------------------ tela 0, projeto
  function baixa(nome, texto, tipo) {
    try {
      var b = new Blob([texto], { type: tipo || 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { S.msg = 'Não foi possível baixar o arquivo neste navegador.'; }
  }
  function tela0() {
    var P = S.proj, el = $('div', null, cab('Tela 0, Projeto', 'Nome, norma e tabela de Leq valem para o projeto inteiro e aparecem no cabeçalho de todas as telas.'));
    el.appendChild($('div', { class: 'fl' }, [
      lab('Nome do projeto', txtIn(P.meta.nome, function (v) { P.meta.nome = v; }, 'w')),
      lab('Edificação', txtIn(P.meta.edificacao, function (v) { P.meta.edificacao = v; }, 'w')),
      lab('Norma', sel([['SP', 'SP, IT 22/2025 (CBPMESP)'], ['PR', 'PR, NPT 022 v03 (CBMPR)']], P.norma, function (v) { P.norma = v; var cols = Object.keys(D.normas[v].rti); if (cols.indexOf(P.sistema.coluna) < 0) P.sistema.coluna = cols[1]; delete P.sistema.tipoManual; }, true)),
      lab('Tabela de Leq', sel([['A', 'A, Azevedo Netto (Tabela 7.6)'], ['B', 'B, Tupy']], P.tabelaLeq, function (v) { P.tabelaLeq = v; }, true))]));
    el.appendChild($('div', { class: 'eq' }, [norma().nome + '. ' + (P.norma === 'PR' ? 'Caminho B obrigatório (pressão no esguicho, mangueira no cálculo), piso de 10 mca no esguicho, jockey facultativa, retorno para testes obrigatório.' : 'Caminho A (pressão na válvula) com caminho B opcional; jockey exigida acima de 6 saídas, salvo reservatório elevado.') + ' Declare a tabela de Leq no memorial: uma por projeto.']));
    el.appendChild($('h3', { class: 's', text: 'Arquivo do projeto' }));
    var fi = $('input', { type: 'file', accept: '.json,application/json', class: 'sr', id: 'abrir' });
    fi.addEventListener('change', function () {
      var f = fi.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { var o = JSON.parse(r.result); if (!o.trechos || !o.norma) throw new Error('arquivo sem trechos ou norma'); S.proj = normaliza(o); S.sel = 0; mudou(true); } catch (e) { S.msg = 'Arquivo inválido: ' + e.message; render(); } };
      r.readAsText(f);
    });
    el.appendChild(fi);
    el.appendChild($('button', { class: 'b', onclick: function () { baixa((P.meta.nome || 'projeto').replace(/[^\w\-]+/g, '_') + '.firecalc.json', JSON.stringify(S.proj, null, 1)); } }, ['Salvar projeto (.firecalc.json)']));
    el.appendChild($('button', { class: 'b s', onclick: function () { document.getElementById('abrir').click(); } }, ['Abrir projeto']));
    el.appendChild($('button', { class: 'b s', onclick: function () { S.proj = normaliza(modeloMinimo()); S.sel = 0; mudou(true); } }, ['Projeto novo (modelo mínimo)']));
    var bk; try { bk = localStorage.getItem('firecalc_auto'); } catch (e) { bk = null; }
    if (bk) el.appendChild($('button', { class: 'b s', onclick: function () { try { S.proj = normaliza(JSON.parse(bk)); S.sel = 0; mudou(true); } catch (e) { /* cópia inválida */ } } }, ['Recuperar cópia automática']));
    el.appendChild($('h3', { class: 's', text: 'Casos de exemplo' }));
    el.appendChild($('p', { class: 'nota', text: 'Cada caso carrega o projeto completo; é o ponto de partida para estudar e para comparar com as memórias.' }));
    CASOS.filter(function (c) { return !c.teste; }).forEach(function (c) { el.appendChild($('button', { class: 'b s', onclick: function () { carregarCaso(c.id); } }, [c.rotulo])); });
    el.appendChild($('h3', { class: 's', text: 'Testar meu computador' }));
    el.appendChild($('p', { class: 'nota', text: 'Roda as conferências do motor contra os números das memórias de cálculo (tolerâncias de cada linha), monta a memória .xlsx de cada caso e confere fórmulas, Memorial e arquivo gerado. Todas devem passar.' }));
    el.appendChild($('button', { class: 'b', onclick: function () { S.auto = autoteste(); render(); autotesteXlsx(S.auto).then(function () { render(); }); } }, ['Rodar conferências']));
    if (S.msg) { el.appendChild($('div', { class: 'msg al', text: S.msg })); S.msg = ''; }
    if (S.auto) {
      var a = S.auto;
      el.appendChild($('div', { class: 'msg ' + (a.falha ? 'er' : (a.pendente ? 'al' : 'ok')), text: a.ok + ' conferidas, ' + a.falha + ' falhas' + (a.pendente ? ' (gerando o arquivo .xlsx de teste...)' : '') }));
      el.appendChild(tabela([['Conferência'], ['Obtido', 'r'], ['Esperado', 'r'], ['Dif.', 'r'], ['Tol.', 'r'], ['']], a.linhas.map(function (l) {
        return $('tr', null, [td(l.nome), td(l.obt === null ? '-' : fmt(l.obt, 4), 'r'), td(l.esp === null ? '-' : fmt(l.esp, 4), 'r'), td(l.dif === null ? '' : fmt(l.dif, 4), 'r'), td(l.tol === null ? '' : String(l.tol).replace('.', ','), 'r'), td(badge(l.ok ? 'OK' : 'ERRO', l.ok ? 'OK' : 'FALHA'))]);
      })));
    }
    return el;
  }
  function autoteste() {
    var salvo = D.mangueirasUsuario, salvoB = D.bombas; D.mangueirasUsuario = {}; D.bombas = D.bombasBase;
    var linhas = [], ok = 0, falha = 0, R = {};
    function caso(id) {   /* 2.6.0: igreja_B saiu dos exemplos; o autoteste refaz a igreja com o caminho B no arquivo, que SP calcula pela Tabela 2 */
      if (id === 'igreja_B') { var pb = clone(caso('igreja')); pb.hidrantes.forEach(function (h) { h.caminho = 'B'; h.esguicho = 'MR CAC 1 1/2" ER longo'; h.Lmang = 30; h.mangueiraDN = 40; }); return pb; }
      return CASOS.filter(function (c) { return c.id === id; })[0].proj; }
    function conf(nome, obt, esp, tol) { var d = Math.abs(obt - esp), p = d <= tol; p ? ok++ : falha++; linhas.push({ nome: nome, obt: obt, esp: esp, dif: d, tol: tol, ok: p }); }
    function bool(nome, p) { p ? ok++ : falha++; linhas.push({ nome: nome, obt: null, esp: null, dif: null, tol: null, ok: p }); }
    try {
      ['igreja', 'escritorios', 'edificio_alto', 'escola', 'igreja_B', 'igreja_pr'].forEach(function (c) { R[c] = M.calcular(clone(caso(c)), D); });
      (FIREREF.classificacao || []).forEach(function (c) { var g = M.sugereColuna(D, c[0], c[1], c[2] === null ? undefined : c[2]); bool('Classificação ' + c[0] + ', ' + c[4], c[3] === null ? !g.colunas : !!(g.colunas && g.colunas.indexOf(c[3]) >= 0)); });
      ['igreja', 'escritorios', 'edificio_alto', 'escola', 'igreja_B', 'igreja_pr'].forEach(function (c) { var s = caso(c).sistema, g = M.sugereColuna(D, caso(c).norma, s.divisao, s.carga); bool('Classificação do caso ' + c + ' (' + s.divisao + ') cai na coluna do gabarito', !!(g && g.colunas && g.colunas.indexOf(s.coluna) >= 0)); });
      var n = R.igreja.numeros, P = 'Igreja A: ';
      conf(P + 'Qt (L/min)', n.Qt, 300.78, 0.05); conf(P + 'AMT (mca)', n.AMT, 31.99, 0.01); conf(P + 'P na válvula de H-2', n.Pvout, 30.31, 0.01); conf(P + 'RTI (min)', n.dur, 26.6, 0.1); conf(P + 'ponto de trabalho Q (m³/h)', n.Qw, 18.64, 0.01); conf(P + 'ponto de trabalho H (mca)', n.Hw, 34.08, 0.01);
      n = R.escritorios.numeros; P = 'Escritórios: ';
      conf(P + 'Qt (L/min)', n.Qt, 408.71, 0.05); conf(P + 'Pd (mca)', n.Pd, 73.99, 0.01); conf(P + 'AMT (mca)', n.AMT, 77.95, 0.01); conf(P + 'estática no 2º subsolo', n.estaticaMax.P, 102.0, 0.1); conf(P + 'NPSHd (mca)', n.NPSHd, 4.28, 0.01); conf(P + 'jockey na partida (L/min)', n.Qjl, 16.1, 0.1); conf(P + 'recalque só registrado, sem conta (0 = não calculado)', n.PR === undefined ? 0 : 1, 0, 0); conf(P + 'ponto de trabalho Q (m³/h)', n.Qw, 26.39, 0.01); conf(P + 'ponto de trabalho H (mca)', n.Hw, 85.91, 0.01);
      n = R.edificio_alto.numeros; P = 'Edifício alto: ';
      conf(P + 'AMT (mca)', n.AMT, 27.85, 0.01); conf(P + 'Qt (L/min)', n.Qt, 307.6, 0.1); conf(P + 'estática no térreo', n.estaticaMax.P, 82.8, 0.05); conf(P + 'ponto de trabalho Q (m³/h)', n.Qw, 19.39, 0.01); conf(P + 'ponto de trabalho H (mca)', n.Hw, 31.22, 0.01);
      n = R.escola.numeros; P = 'Escola E-1: ';
      conf(P + 'Pd (mca)', n.Pd, 34.19, 0.01); conf(P + 'AMT (mca)', n.AMT, 33.79, 0.01); conf(P + 'H da bomba na nominal', n.Hb, 34.3, 0.1); conf(P + 'ponto de trabalho Q (m³/h)', n.Qw, 18.1, 0.06); conf(P + 'ponto de trabalho H (mca)', n.Hw, 34.2, 0.06);
      n = R.igreja_B.numeros; P = 'Igreja com pressão no esguicho no arquivo, pela Tabela 2: ';
      conf(P + 'P na válvula de H-1 (mca)', n.Pvcrit, 30.00, 0.02); conf(P + 'Qt (L/min)', n.Qt, 300.78, 0.02); conf(P + 'AMT (mca)', n.AMT, 31.99, 0.02);
      var g = REF.gabaritoPR; n = R.igreja_pr.numeros; P = 'Paraná (gabarito independente): ';
      conf(P + 'P na válvula de H-1 (mca)', n.Pvcrit, g.Pv1, 0.001); conf(P + 'Qt (L/min)', n.Qt, g.Qt, 0.01); conf(P + 'AMT (mca)', n.AMT, g.AMT, 0.001);
      if (REF.gabaritoAcademia) { var ga = REF.gabaritoAcademia, na = M.calcular(clone(caso('academia_pr')), D).numeros; P = 'Academia, Paraná (gabarito independente): ';
        conf(P + 'Qt (L/min)', na.Qt, ga.pares.HD1_HD2.Qt, 0.01); conf(P + 'AMT (mca)', na.AMT, ga.pares.HD1_HD2.AMT, 0.001); conf(P + 'pressão na ponta do esguicho de HD1 (mca)', na.pontoProjeto.ponta, ga.ponto.ponta, 0.001); }
      var ids = R.igreja_pr.verificacoes.map(function (v) { return v.id; }), sp = R.igreja.verificacoes.map(function (v) { return v.id; });
      bool('V23 presente no PR', ids.indexOf('V23') >= 0); bool('V24 presente no PR', ids.indexOf('V24') >= 0);
      bool('V23 e V24 ausentes no SP', sp.indexOf('V23') < 0 && sp.indexOf('V24') < 0);
      bool('V05 reprova o 2º subsolo dos escritórios', R.escritorios.verificacoes.filter(function (v) { return v.id === 'V05'; })[0].situacao === 'ERRO');
      var PL = REF.planilhas;
      [['planilha_pato_branco', 'planilha_pato_branco|tipo 2'], ['planilha_escola', 'planilha_escola|tipo 2']].forEach(function (cc) {
        var r = M.calcular(clone(caso(cc[0])), D).numeros, s = PL[cc[1]];
        conf(cc[0] + ': Qt (L/min)', r.Qt, s.Qt, 0.005); conf(cc[0] + ': AMT contra H man da planilha', r.AMT, s.Hman, 0.005); conf(cc[0] + ': vazão do hidrante equilibrado', r.Qout, s.Q16, 0.005);
      });
    } catch (e) { falha++; linhas.push({ nome: 'Erro: ' + e.message, obt: null, esp: null, dif: null, tol: null, ok: false }); }
    // memória .xlsx: modelo e avaliador, sem gerar arquivo (a geração é assíncrona, em autotesteXlsx)
    var WX = null;
    try {
      if (typeof FireExporta === 'undefined') throw new Error('módulo de exportação ausente');
      ['igreja', 'escritorios', 'edificio_alto', 'escola', 'igreja_B', 'igreja_pr'].forEach(function (c) {
        var pj = clone(caso(c)), Rx = M.calcular(pj, D), W = FireExporta.modelo(pj, D, Rx, M, { versao: VERSAO }); FireExporta.avalia(W);
        var amt = W.ev(W.chaves.mapa.AMT, 'Capa'), esp = Rx.numeros.AMT, nErr = 0, nItens = 0;
        conf('.xlsx ' + c + ': AMT da planilha igual à do motor', amt, esp, Number((1e-6 * Math.max(1, Math.abs(esp))).toPrecision(1)));
        W.folhas.forEach(function (f) { Object.keys(f.c).forEach(function (k) { var x = f.c[k]; if (x.f !== undefined && x.r instanceof FireExporta.XlErr) nErr++; if (f.nome === 'Memorial' && /^A\d+$/.test(k) && /^(1[0-3]|[1-9])\. /.test(String(x.v))) nItens++; }); });
        bool('.xlsx ' + c + ': nenhuma fórmula com erro', nErr === 0);
        bool('.xlsx ' + c + ': Memorial com os 13 itens', nItens === 13);
        if (c === 'igreja') WX = W;
      });
    } catch (e) { falha++; linhas.push({ nome: 'Erro no .xlsx: ' + e.message, obt: null, esp: null, dif: null, tol: null, ok: false }); }
    D.mangueirasUsuario = salvo; D.bombas = salvoB;
    return { ok: ok, falha: falha, linhas: linhas, WX: WX, pendente: !!WX };
  }
  // gera de fato o .xlsx da igreja na memória do navegador e relê o arquivo (não baixa nada)
  function autotesteXlsx(a) {
    function bool(nome, p) { p ? a.ok++ : a.falha++; a.linhas.push({ nome: nome, obt: null, esp: null, dif: null, tol: null, ok: p }); }
    if (!a.WX || typeof ExcelJS === 'undefined') { if (a.WX) bool('.xlsx igreja: biblioteca de planilha carregada', false); a.pendente = false; return Promise.resolve(); }
    var W = a.WX, nF = 0; W.folhas.forEach(function (f) { Object.keys(f.c).forEach(function (k) { if (f.c[k].f !== undefined) nF++; }); });
    return FireExporta.gerar(ExcelJS, W).xlsx.writeBuffer().then(function (buf) {
      var wb = new ExcelJS.Workbook(); return wb.xlsx.load(buf).then(function () {
        var nomes = wb.worksheets.map(function (w) { return w.name; }), nL = 0;
        wb.worksheets.forEach(function (w) { w.eachRow(function (r) { r.eachCell(function (cc) { if (cc.formula || (cc.value && cc.value.formula)) nL++; }); }); });
        bool('.xlsx igreja gerado e relido: 15 abas, Resumo na frente', nomes.length === 15 && nomes[0] === 'Resumo' && nomes.indexOf('Memorial') >= 0);
        bool('.xlsx igreja gerado e relido: ' + nF + ' fórmulas preservadas', nL === nF && nF > 0);
      });
    }).catch(function (e) { bool('.xlsx igreja: geração do arquivo (' + e.message + ')', false); }).then(function () { a.pendente = false; a.WX = null; });
  }

  // ------------------------------------------------------------------ tela 1, sistema
  var COLS = {
    SP: { '1-t1': 'Coluna 1, subcoluna tipo 1', '1-t2': 'Coluna 1, subcoluna tipo 2', '2': 'Coluna 2 (D-1 acima de 300 MJ/m², B-1, B-2 etc.)', '3': 'Coluna 3 (C-2 acima de 1000 MJ/m², G-1 a G-4 etc.)', '4': 'Coluna 4 (G-5, I-3, J-4, L-2, L-3, M-7)' },
    PR: { '1': 'Coluna 1', '2': 'Coluna 2', '3': 'Coluna 3', '4': 'Coluna 4', '5': 'Coluna 5' } };
  // Classificação assistida. Sugere a coluna pela divisão e pela carga; o usuário confirma com um botão.
  function classAssistida(P, s, cols) {
    var O = D.ocupacao, box = $('div', { class: 'eq' }); box.style.fontFamily = 'inherit';
    box.appendChild($('h3', { class: 's', text: 'Classificação assistida (sugestão; quem decide é o projetista)' }));
    var ops = [['', 'Escolha a divisão']].concat(O.divisoes.map(function (d) { return [d.div, d.div + ', ' + d.desc]; }));
    box.appendChild($('div', { class: 'fl' }, [
      lab('Divisão (' + (P.norma === 'SP' ? 'Decreto 69.118/24, Tabela 1' : 'CSCIP-CB/PMPR, Tabela 1') + ')', sel(ops, s.divisao || '', function (v) { if (v) s.divisao = v; else delete s.divisao; }, true)),
      lab('Carga de incêndio (MJ/m², IT 14)', numIn(s.carga, function (v) { if (v === null) delete s.carga; else s.carga = v; }))]));
    var out = $('div'); box.appendChild(out);
    function desenha() {
      out.innerHTML = '';
      if (!s.divisao) { out.appendChild($('p', { class: 'nota', text: 'Opcional. Escolha a divisão e, quando a tabela pedir, a carga de incêndio; a ferramenta mostra a coluna que a tabela da norma indica e você confirma.' })); return; }
      var g = M.sugereColuna(D, P.norma, s.divisao, s.carga);
      if (!g.colunas) { out.appendChild($('div', { class: 'msg al', text: g.msg })); out.appendChild($('p', { class: 'nota', text: 'Fonte: ' + g.fonte })); return; }
      var rot = function (k) { var c = cols.filter(function (x) { return x[0] === k; })[0]; return c ? c[1] : k; };
      out.appendChild($('p', null, ['Sugestão para ' + s.divisao + (g.precisaCarga ? ' com carga ' + g.faixa : '') + ': ' + g.colunas.map(rot).join(' ou ') + (g.colunas.length > 1 ? ' (a tabela oferece as duas; escolha uma).' : '.')]));
      g.colunas.forEach(function (k) { out.appendChild($('button', { class: 'b s', onclick: function () { s.coluna = k; delete s.tipoManual; mudou(true); } }, ['Usar ' + rot(k)])); });
      var ok = g.colunas.indexOf(s.coluna) >= 0;
      out.appendChild($('div', { class: 'msg ' + (ok ? 'ok' : 'al'), text: ok ? 'A coluna escolhida abaixo coincide com a sugestão.' : 'A coluna escolhida abaixo não coincide com a sugestão. Confira ou justifique no memorial.' }));
      out.appendChild($('p', { class: 'nota', text: 'Fonte: ' + g.fonte + '. A carga só muda a coluna quando a divisão aparece com faixa de MJ/m² na tabela.' }));
    }
    S.upd.push(desenha); desenha();
    return box;
  }
  function tela1() {
    var P = S.proj, s = P.sistema, N = norma(), el = $('div', null, cab('Tela 1, Sistema', 'Coluna da tabela de reserva e área da edificação definem o tipo de sistema e a RTI mínima. A coluna sai da ocupação na tabela da norma; confirme-a no seu projeto.'));
    var cols = Object.keys(N.rti).map(function (k) { return [k, (COLS[P.norma] && COLS[P.norma][k]) || ('Coluna ' + k)]; });
    el.appendChild(classAssistida(P, s, cols));
    el.appendChild($('div', { class: 'fl' }, [
      lab('Coluna da tabela de reserva (' + (P.norma === 'SP' ? 'Tabela 3' : 'Tabela 4') + ')', sel(cols, s.coluna, function (v) { s.coluna = v; delete s.tipoManual; }, true)),
      lab('Área construída (m²)', numIn(s.area, function (v) { s.area = v || 0; })),
      (function () { var cl = M.classifica(D, P.norma, s.coluna, s.area); return cl && (cl.tipo === '4 ou 5' || cl.tipo === '4-40' || cl.tipo === '4') ? lab('Esguicho do tipo 4', sel([['40', 'Esguicho 40 (65 mca)'], ['65', 'Esguicho 65 (30 mca)']], s.esg4, function (v) { s.esg4 = v; }, true)) : null; })()]));
    var linha = $('div', { class: 'eq' }); S.upd.push(function () {
      var cl = M.classifica(D, P.norma, s.coluna, s.area), to = tipoObj();
      linha.textContent = cl ? 'Faixa de área: ' + cl.faixa + ' m². RTI mínima da tabela: ' + cl.rti + ' m³.' + (to ? '\nTipo ' + to.id + ': esguicho ' + to.esguicho + ' mm, mangueira ' + to.mangueira + ' mm, ' + (to.exp > 1 ? 'duplo (2 expedições)' : 'simples') + ', Q mín. ' + to.Q + ' L/min, P mín. ' + to.P + ' mca, Kv = ' + fmt(to.Q / Math.sqrt(to.P), 2) + ' L/min por raiz de mca.' : '') : 'Coluna sem linha na tabela.';
    });
    el.appendChild(linha);
    el.appendChild($('h3', { class: 's', text: 'Tipos da norma ' + P.norma }));
    el.appendChild(tabela([['Tipo'], ['Esguicho (mm)', 'r'], ['Mangueira (mm)', 'r'], ['Expedições', 'r'], ['Q mín. (L/min)', 'r'], ['P mín. (mca)', 'r'], ['Kv', 'r']], N.tipos.map(function (t) {
      return $('tr', { class: tipoFinal() === t.id ? 'sel' : '' }, [td(t.id), td(String(t.esguicho), 'r'), td(String(t.mangueira), 'r'), td(t.exp > 1 ? 'duplo' : 'simples', 'r'), td(String(t.Q), 'r'), td(String(t.P), 'r'), td(fmt(t.Q / Math.sqrt(t.P), 2), 'r')]);
    })));
    el.appendChild($('h3', { class: 's', text: 'Reserva técnica de incêndio por coluna e faixa de área (m³)' }));
    el.appendChild(tabela([['Coluna'], ['Tipo']].concat(N.faixas.map(function (f) { return [f, 'r']; })), Object.keys(N.rti).map(function (k) {
      return $('tr', { class: k === s.coluna ? 'sel' : '' }, [td(String(k)), td(N.rti[k].tipo)].concat(N.rti[k].rti.map(function (v) { return td(String(v), 'r'); })));
    })));
    el.appendChild($('h3', { class: 's', text: 'Tipo informado manualmente' }));
    el.appendChild($('p', { class: 'nota', text: 'Use só quando o tipo não vem da tabela (por exemplo, exigência do parecer). A RTI continua comparada com a linha da coluna acima.' }));
    el.appendChild($('div', { class: 'fl' }, [lab('Tipo', sel([['', 'Da tabela']].concat(N.tipos.map(function (t) { return [t.id, 'Tipo ' + t.id]; })), s.tipoManual || '', function (v) { if (v) s.tipoManual = v; else delete s.tipoManual; }, true))]));
    el.appendChild($('p', { class: 'nota', text: 'Ocupação mista: o sistema é dimensionado pela ocupação de maior exigência (IT 22, 4.8.5). Um projeto por ocupação com sistemas independentes.' }));
    return el;
  }

  // ------------------------------------------------------------------ tela 2, materiais
  function tela2() {
    var P = S.proj, el = $('div', null, cab('Tela 2, Materiais', 'O diâmetro interno não é digitado: vem da tabela de tubos por norma, classe e DN. A tela mostra D externo, parede, D interno e rosca.'));
    var normas = [], classes = [];
    D.tubos.forEach(function (t) { if (normas.indexOf(t.norma) < 0) normas.push(t.norma); if (t.norma === P.tubo.norma && classes.indexOf(t.classe) < 0) classes.push(t.classe); });
    if (classes.indexOf(P.tubo.classe) < 0) P.tubo.classe = classes[0];
    var mats = D.C.map(function (c, i) { return [String(c.C), c.C + ', ' + c.material]; });
    var ci = $('div', { class: 'fl' }, [
      lab('Norma do tubo', sel(normas.map(function (n) { return [n, n]; }), P.tubo.norma, function (v) { P.tubo.norma = v; var c = []; D.tubos.forEach(function (t) { if (t.norma === v && c.indexOf(t.classe) < 0) c.push(t.classe); }); P.tubo.classe = c[0]; }, true)),
      lab('Classe ou schedule', sel(classes.map(function (n) { return [n, n]; }), P.tubo.classe, function (v) { P.tubo.classe = v; }, true)),
      lab('Material (fator C, Tabela 1)', sel(mats, String(P.C), function (v) { P.C = parseFloat(v); }, true)),
      lab('C digitado (outro material)', numIn(P.C, function (v) { if (v) P.C = v; }))]);
    el.appendChild(ci);
    el.appendChild($('h3', { class: 's', text: 'Tubos cadastrados: ' + P.tubo.norma + ', ' + P.tubo.classe }));
    el.appendChild(tabela([['DN', 'r'], ['Polegada'], ['D ext. (mm)', 'r'], ['Parede (mm)', 'r'], ['D interno (mm)', 'r'], ['Rosca'], ['Fonte']], D.tubos.filter(function (t) { return t.norma === P.tubo.norma && t.classe === P.tubo.classe; }).map(function (t) {
      return $('tr', null, [td(String(t.dn), 'r'), td(t.pol), td(fmt(t.dext, 1), 'r'), td(fmt(t.parede, 2), 'r'), td(fmt(t.dint, 1), 'r'), td(t.rosca), td(t.fonte)]);
    })));
    el.appendChild($('h3', { class: 's', text: 'Leq das peças, tabela ' + P.tabelaLeq + ' (' + D.leq[P.tabelaLeq].titulo + ')' }));
    var dns = ['25', '32', '40', '50', '65', '80', '100', '125', '150'], tab = D.leq[P.tabelaLeq].pecas;
    el.appendChild(tabela([['Peça']].concat(dns.map(function (d) { return ['DN' + d, 'r']; })), Object.keys(tab).map(function (id) {
      return $('tr', null, [td(tab[id].nome)].concat(dns.map(function (d) { var v = tab[id].dn[d]; return td(v === undefined || v === null ? '-' : fmt(v, 2), 'r'); })));
    })));
    return el;
  }

  // ------------------------------------------------------------------ tela 3, trechos
  function arvore() {
    var r = S.R && S.R.res; if (!r) return '';
    var g = r.ctx.grafo, raiz = r.ctx.raiz, filhos = {}, nosL = g.nos.slice();
    nosL.forEach(function (n) { if (n === raiz) return; var c = g.caminho(n); if (!c || !c.length) return; var u = c[c.length - 1]; (filhos[u.de] = filhos[u.de] || []).push({ n: n, t: u.t }); });
    var hid = {}; S.proj.hidrantes.forEach(function (h) { hid[h.no] = h.id; });
    var out = [];
    (function vai(n, pre, t) {
      out.push(pre + n + (hid[n] ? '  [hidrante ' + hid[n] + ']' : '') + (t ? '   (' + t.nome + ', DN' + t.dn + ', Lt ' + fmt(t.Lt, 2) + ' m)' : ''));
      (filhos[n] || []).forEach(function (f) { vai(f.n, pre + '    ', f.t); });
    })(raiz, '', null);
    return out.join('\n');
  }
  function tela3() {
    var P = S.proj, el = $('div', null, cab('Tela 3, Trechos', 'Uma linha por trecho, nomeado pelos dois nós, de montante para jusante (RI-BI, BI-A, A-H1). BI é a bomba, RI o reservatório, A a derivação dos dois hidrantes mais desfavoráveis. A topologia sai dos nomes.'));
    var dns = dnsDisponiveis(), Q = fluxos();
    if (S.sel >= P.trechos.length) S.sel = Math.max(0, P.trechos.length - 1);
    var corpo = $('tbody');
    P.trechos.forEach(function (t, i) {
      var nome = $('input', { type: 'text', value: t.nome, style: 'width:90px' });
      nome.addEventListener('input', function () { t.nome = nome.value.trim(); mudou(false); });
      nome.addEventListener('change', function () { mudou(true); });
      var tr = $('tr', { class: i === S.sel ? 'sel' : '' }, [
        td($('button', { class: 'b p s', title: 'Selecionar', onclick: function () { S.sel = i; render(); } }, [String(i + 1)])),
        td(nome),
        td(sel(dns.map(function (d) { return [String(d), 'DN' + d]; }), String(t.dn), function (v) { t.dn = parseInt(v, 10); }, true)),
        td(numIn(t.L, function (v) { t.L = v || 0; }, { w: '70px' })),
        td(numIn(t.Lvirtual || '', function (v) { if (v) t.Lvirtual = v; else delete t.Lvirtual; }, { w: '60px' })),
        cell(function () { var i2 = trechoInfo(t.nome); return i2 ? fmt(i2.Lv, 2) : '-'; }),
        cell(function () { var i2 = trechoInfo(t.nome); return i2 ? fmt(i2.Lt, 2) : '-'; }),
        cell(function () { var i2 = trechoInfo(t.nome); return i2 ? fmt(i2.dint, 1) : '-'; }),
        cell(function () { var i2 = trechoInfo(t.nome), q = fluxos()[t.nome]; return i2 && q ? fmt(M.J(q, i2.dint, i2.C), 5) : '-'; }),
        cell(function () { var i2 = trechoInfo(t.nome), q = fluxos()[t.nome]; return i2 && q ? fmt(M.J(q, i2.dint, i2.C) * i2.Lt, 3) : '-'; }),
        cell(function () { var q = fluxos()[t.nome]; return q ? fmt(q, 1) : '-'; }),
        cell(function () { var i2 = trechoInfo(t.nome), q = fluxos()[t.nome]; return i2 && q ? fmt(M.vel(q, i2.dint), 2) : '-'; }),
        td($('span', null, [
          $('button', { class: 'b p s', title: 'Duplicar', onclick: function () { var c = clone(t); c.nome = ''; P.trechos.splice(i + 1, 0, c); S.sel = i + 1; mudou(true); } }, ['dup']),
          $('button', { class: 'b p x', title: 'Apagar', onclick: function () { P.trechos.splice(i, 1); mudou(true); } }, ['x'])]))]);
      corpo.appendChild(tr);
    });
    el.appendChild($('div', { class: 'tw' }, [$('table', null, [$('thead', null, [$('tr', null, [''].concat(['Trecho', 'DN', 'L real (m)', 'L virtual extra (m)', 'Leq pecas (m)', 'L total (m)', 'D int. (mm)', 'J (m/m)', 'hf (mca)', 'Q (L/min)', 'v (m/s)', '']).map(function (c, k) { return $('th', { class: k > 2 && k < 12 ? 'r' : '', text: c }); }))]), corpo])]));
    el.appendChild($('button', { class: 'b', onclick: function () { P.trechos.push({ nome: '', dn: dns.indexOf(65) >= 0 ? 65 : dns[0], L: 0, pecas: {} }); S.sel = P.trechos.length - 1; mudou(true); } }, ['Novo trecho']));
    el.appendChild($('p', { class: 'nota', text: 'Vazão e velocidade mostradas para o par adotado (tronco com a vazão total, ramais com a vazão de cada jato). Trechos fora do par adotado ficam sem vazão.' }));
    // detalhe do trecho selecionado
    var t = P.trechos[S.sel];
    if (t) {
      var det = $('div', { class: 'dois' });
      var esq = $('div', null, [$('h3', { class: 's', text: 'Peças do trecho ' + (t.nome || '(sem nome)') }), pecasEd(t.pecas, function () { return t.dn; })]);
      var eq = $('div', { class: 'eq' });
      S.upd.push(function () {
        var i2 = trechoInfo(t.nome), q = fluxos()[t.nome];
        if (!i2) { eq.textContent = 'Trecho sem nome válido ou com erro.'; return; }
        var tub = tuboDe(t.dn), ln = [];
        ln.push('Hazen-Williams, forma da IT 22 (4.8.10.2):');
        ln.push('J = 605e4 × Q^1,85 × C^-1,85 × D^-4,87   (Q em L/min, D interno em mm)');
        ln.push('');
        ln.push('Tubo: ' + P.tubo.norma + ' ' + P.tubo.classe + ' DN' + t.dn + (tub ? ', D ext. ' + fmt(tub.dext, 1) + ', parede ' + fmt(tub.parede, 2) + ', D interno ' + fmt(tub.dint, 1) + ' mm, rosca ' + tub.rosca : ''));
        ln.push('C = ' + i2.C + '   D = ' + fmt(i2.dint, 1) + ' mm');
        ln.push('');
        ln.push('Lt = L real + Leq das peças (tabela ' + P.tabelaLeq + ')');
        i2.det.forEach(function (d) { ln.push('   ' + d.qtd + ' × ' + D.leq[P.tabelaLeq].pecas[d.peca].nome + ' (' + fmt(d.leq, 2) + ' m) = ' + fmt(d.qtd * d.leq, 2) + ' m'); });
        if (t.Lvirtual) ln.push('   extra digitado = ' + fmt(t.Lvirtual, 2) + ' m');
        ln.push('Lt = ' + fmt(i2.L, 2) + ' + ' + fmt(i2.Lv, 2) + ' = ' + fmt(i2.Lt, 2) + ' m');
        if (q) {
          var j = M.J(q, i2.dint, i2.C);
          ln.push(''); ln.push('Q = ' + fmt(q, 2) + ' L/min');
          ln.push('J = 605e4 × ' + fmt(q, 2) + '^1,85 × ' + i2.C + '^-1,85 × ' + fmt(i2.dint, 1) + '^-4,87 = ' + fmt(j, 5) + ' m/m');
          ln.push('hf = J × Lt = ' + fmt(j, 5) + ' × ' + fmt(i2.Lt, 2) + ' = ' + fmt(j * i2.Lt, 3) + ' mca');
          ln.push('v = Q / A = ' + fmt(M.vel(q, i2.dint), 2) + ' m/s');
        } else ln.push('\nSem vazão no par adotado.');
        eq.textContent = ln.join('\n');
      });
      det.appendChild(esq); det.appendChild($('div', null, [$('h3', { class: 's', text: 'Equação com os números do trecho' }), eq]));
      el.appendChild(det);
    }
    el.appendChild($('h3', { class: 's', text: 'Cotas dos nós (m, referencial único)' }));
    el.appendChild($('p', { class: 'nota', text: 'A elevação de cada trecho sai da diferença das cotas; não se digita sinal.' }));
    var us = garanteNos();
    el.appendChild($('div', { class: 'fl' }, us.map(function (n) { return lab('Nó ' + n, numIn(P.nos[n].z, function (v) { P.nos[n].z = v === null ? 0 : v; })); })));
    el.appendChild($('h3', { class: 's', text: 'Árvore da rede e avisos de estrutura' }));
    var av = $('div'), ar = $('pre', { class: 'arv' });
    S.upd.push(function () {
      var r = S.R && S.R.res; ar.textContent = arvore() || 'Rede não montada.'; av.textContent = '';
      if (S.R && S.R.erro) av.appendChild($('div', { class: 'msg er', text: S.R.erro }));
      if (r) r.erros.forEach(function (e) { av.appendChild($('div', { class: 'msg al', text: e })); });
      if (r && !r.erros.length) av.appendChild($('div', { class: 'msg ok', text: 'Estrutura sem avisos: todos os nós ligados, sem laço, hidrantes com caminho até ' + r.ctx.raiz + '.' }));
    });
    el.appendChild(ar); el.appendChild(av);
    return el;
  }

  // ------------------------------------------------------------------ tela 4, hidrantes
  function tela4() {
    var P = S.proj, N = norma(), el = $('div', null, cab('Tela 4, Hidrantes', P.norma === 'PR' ? 'Na NPT 022 a pressão se verifica no esguicho: o caminho B é obrigatório (mangueira e esguicho no cálculo).' : 'Caminho A: P mínima na válvula (Tabela 2). Caminho B: pressão do esguicho do catálogo mais a perda na mangueira (IT 22, 4.8.9).'));
    var nos = nosDaRede().filter(function (n) { return n !== 'BI' && n !== 'RI'; }), modelos = [];
    D.esguichos.forEach(function (e) { if (modelos.indexOf(e.modelo) < 0) modelos.push(e.modelo); });
    var dnsM = ['25', '40', '65'].concat(Object.keys(P.mangueirasUsuario || {}).filter(function (k) { return ['25', '40', '65'].indexOf(k) < 0; }));
    var corpo = $('tbody');
    P.hidrantes.forEach(function (h, i) {
      var caminho = P.norma === 'PR' ? 'B' : (h.caminho || 'A'), isB = caminho === 'B';
      corpo.appendChild($('tr', null, [
        td(txtIn(h.id, function (v) { h.id = v; }, 'cx')),
        td(sel(nos.map(function (n) { return [n, n]; }).concat(nos.indexOf(h.no) < 0 ? [[h.no, h.no]] : []), h.no, function (v) { h.no = v; }, true)),
        cell(function () { var n = P.nos[h.no]; return n ? fmt(n.z, 3) : '-'; }),
        td(numIn(h.alturaValvula === undefined ? '' : h.alturaValvula, function (v) { if (v === null) delete h.alturaValvula; else h.alturaValvula = v; }, { w: '60px' })),
        td(P.norma === 'PR' ? 'B' : sel([['A', 'A'], ['B', 'B']], caminho, function (v) { h.caminho = v; if (v === 'B') { h.esguicho = h.esguicho || modelos[0]; h.mangueiraDN = h.mangueiraDN || 40; h.Lmang = h.Lmang || 30; } }, true)),
        td(isB ? sel(modelos.map(function (m) { return [m, m]; }), h.esguicho || modelos[0], function (v) { h.esguicho = v; }) : '-'),
        td(isB ? sel(dnsM.map(function (d) { return [d, d + ' mm']; }), String(h.mangueiraDN || (tipoObj() ? tipoObj().mangueira : 40)), function (v) { h.mangueiraDN = parseInt(v, 10); }) : '-'),
        td(isB ? numIn(h.Lmang || 30, function (v) { h.Lmang = v || 30; }, { w: '60px' }) : '-'),
        cell(function () { var r = S.R && S.R.res; if (!r) return '-'; var j = r.ctx.jatos.filter(function (x) { return x.hid === undefined ? false : x.hid.id === h.id; }); return j.length ? fmt(j[0].Qmin, 1) + ' L/min, ' + fmt(j[0].Pmin, 2) + ' mca' : '-'; }),
        td($('button', { class: 'b p x', onclick: function () { P.hidrantes.splice(i, 1); mudou(true); } }, ['x']))]));
    });
    el.appendChild($('div', { class: 'tw' }, [$('table', null, [$('thead', null, [$('tr', null, ['Id', 'Nó', 'Cota do nó (m)', 'Altura da válvula (m)', 'Caminho', 'Esguicho (caminho B)', 'Mangueira', 'L mangueira (m)', 'Q e P mínimas do jato', ''].map(function (c) { return $('th', { text: c }); }))]), corpo])]));
    el.appendChild($('button', { class: 'b', onclick: function () { var n = P.hidrantes.length + 1; P.hidrantes.push({ id: 'H-' + n, no: nos[0] || 'H1', caminho: P.norma === 'PR' ? 'B' : 'A', alturaValvula: 1.2 }); mudou(true); } }, ['Novo hidrante']));
    el.appendChild($('p', { class: 'nota', text: 'Altura da válvula de 1,0 a 1,5 m do piso (IT 22, 4.7.1.4): fora disso a verificação V19 dá alerta. Deixe em branco para não verificar. Tipo 5 gera dois jatos por hidrante.' }));
    var par = $('div', { class: 'eq' }); S.upd.push(function () {
      var r = S.R && S.R.res; if (!r) { par.textContent = 'Sem cálculo.'; return; }
      par.textContent = 'Par adotado: ' + r.numeros.par + ' (maior AMT), derivação em ' + r.numeros.A + '.\nPares avaliados:\n' + r.pares.map(function (p) { return '  ' + p.par + '   A = ' + p.A + '   PA ' + fmt(p.PA, 2) + ' mca   Qt ' + fmt(p.Qt, 1) + ' L/min   AMT ' + fmt(p.AMT, 2) + ' mca'; }).join('\n');
    });
    el.appendChild($('h3', { class: 's', text: 'Par mais desfavorável' })); el.appendChild(par);
    var rr0 = S.R && S.R.res, opcPar = [['', 'Automático: o par mais desfavorável (maior AMT)']].concat(rr0 ? rr0.pares.map(function (p) { return [p.par, p.par + '   AMT ' + fmt(p.AMT, 2) + ' mca']; }) : []);
    el.appendChild($('h3', { class: 's', text: 'Forçar par (estudo)' }));
    el.appendChild($('div', { class: 'fl' }, [lab('Par usado no cálculo', sel(opcPar, P.parForcado || '', function (v) { if (v) P.parForcado = v; else delete P.parForcado; }, true)),
      $('span', { class: 'nota', text: 'Forçar um par diferente do mais desfavorável serve só para estudo: a verificação V02 passa a dar alerta e o resultado deixa de ser o da norma (IT 22, 4.8.3 e 4.8.4).' })]));
    el.appendChild($('h3', { class: 's', text: 'Pressão em qualquer hidrante' }));
    el.appendChild($('p', { class: 'nota', text: 'Dinâmica: com os dois jatos do par abertos, a pressão em cada válvula sai da carga na descarga da bomba (no reforço, da cota da reserva mais a altura do reforço; na gravidade, da cota da reserva), descendo pelos trechos com as vazões do par. Estática: bomba fechada e reservatório cheio. Limite de 100 mca na válvula (IT 22, 4.8.8).' }));
    var quadroP = $('div'); el.appendChild(quadroP);
    S.upd.push(function () {
      quadroP.textContent = ''; var r = S.R && S.R.res; if (!r) return;
      var lp = M.pressoesHidrantes(r.ctx, r.par);
      quadroP.appendChild(tabela([['Hidrante'], ['Nó'], ['No par'], ['Cota da válvula (m)', 'r'], ['Dinâmica (mca)', 'r'], ['Estática (mca)', 'r'], ['Limite de 100 mca']], lp.map(function (x) {
        var acima = x.din > 100 || (x.est !== null && x.est > 100);
        return $('tr', null, [td(x.id), td(x.no), td(x.noPar ? 'sim' : 'não'), td(fmt(x.z, 3), 'r'), td(fmt(x.din, 2), 'r'), td(x.est === null ? '-' : fmt(x.est, 2), 'r'), td(badge(acima ? 'ERRO' : 'OK', acima ? 'acima de 100 mca' : 'até 100 mca'))]);
      })));
    });
    // mangueiras
    el.appendChild($('h3', { class: 's', text: 'Curva de perda de carga das mangueiras (caminho B)' }));
    el.appendChild($('p', { class: 'nota', text: 'Cadastradas: 40 mm e 65 mm, Kidde Sintex N tipo 2 (apoio; curva lida do catálogo). Outra mangueira: informe a curva do catálogo, uma linha por ponto, "vazão em L/min; perda em kPa por metro", com a fonte.' }));
    var m65 = D.mangueira65, J40 = D.mangueira.J_gabarito_m_m;
    el.appendChild(tabela([['Q (L/min)', 'r'], ['40 mm: J (m/m)', 'r'], ['65 mm: J (m/m)', 'r']], [150, 200, 300, 400, 600, 800, 1000, 1200, 1500].map(function (q) {
      return $('tr', null, [td(String(q), 'r'), td(q <= 700 && q >= 100 ? fmt(M.mangueiraJ(D, 40, q), 4) : fmt(M.mangueiraJ(D, 40, q), 4) + ' *', 'r'), td(fmt(M.mangueiraJ(D, 65, q), 4) + (q < 300 ? ' *' : ''), 'r')]);
    })));
    el.appendChild($('p', { class: 'nota', text: '* fora da faixa lida do gráfico (extrapolação pela curva). 65 mm: leitura de 300 a 1.500 L/min, incerteza de cerca de 0,1 kPa/m. Mangueira de 65 mm abaixo de 300 L/min é extrapolada.' }));
    var ta = $('textarea', { rows: '5', cols: '30', placeholder: '300; 0,33\n600; 1,33\n1000; 3,00' }), dn = $('input', { type: 'text', class: 'cx', value: '50' }), fo = $('input', { type: 'text', class: 'w', placeholder: 'fonte: catálogo e página (obrigatória)' }), ms = $('span', { style: 'margin-left:8px' });
    el.appendChild($('div', { class: 'fl' }, [lab('DN (mm)', dn), lab('Pontos', ta), lab('Fonte', fo),
      $('button', { class: 'b s', onclick: function () {
        var q = [], j = []; ta.value.split('\n').forEach(function (l) { var p = l.split(';'); if (p.length === 2) { var a = pn(p[0]), b = pn(p[1]); if (a !== null && b !== null) { q.push(a); j.push(b / 9.80665); } } });
        var d = parseInt(dn.value, 10), ok = q.length >= 3 && d > 0 && fo.value.trim() && q.every(function (x, k) { return k === 0 || (x > q[k - 1] && j[k] > j[k - 1]); });
        if (!ok) { ms.textContent = 'Informe DN, a fonte e pelo menos 3 pontos com vazão e perda crescentes.'; return; }
        P.mangueirasUsuario = P.mangueirasUsuario || {}; P.mangueirasUsuario[String(d)] = { Q: q, J: j, fonte: fo.value.trim() }; mudou(true);
      } }, ['Cadastrar mangueira']), ms]));
    Object.keys(P.mangueirasUsuario || {}).forEach(function (k) { var m = P.mangueirasUsuario[k]; el.appendChild($('div', { class: 'msg ok' }, ['Mangueira de ' + k + ' mm cadastrada pelo usuário (' + m.Q.length + ' pontos). Fonte: ' + m.fonte + '  ', $('button', { class: 'b p x', onclick: function () { delete P.mangueirasUsuario[k]; mudou(true); } }, ['remover'])])); });
    return el;
  }

  // ------------------------------------------------------------------ tela 5, fonte e casa de bombas
  function tela5() {
    var P = S.proj, F = P.fonte, N = norma(), el = $('div', null, cab('Tela 5, Fonte e casa de bombas', 'Modo de alimentação, cotas, ambiente (tabelas do Azevedo Netto), reserva e recalque. Os trechos de sucção ou de descida (RI-BI ou RI-A) são lançados na tela 3.'));
    el.appendChild($('div', { class: 'fl' }, [
      lab('Modo', sel([['bomba', 'Reservatório inferior com bomba (raiz BI)'], ['reforco', 'Reservatório elevado com reforço (raiz RI)'], ['gravidade', 'Só gravidade (raiz RI)']], F.modo, function (v) { F.modo = v; }, true)),
      lab('Cota do nível mínimo X (m)', numIn(F.zX, function (v) { F.zX = v === null ? 0 : v; })),
      lab('Cota do nível cheio (m)', numIn(F.zCheio, function (v) { F.zCheio = v === null ? 0 : v; })),
      lab('Volume efetivo da RTI (m³)', numIn(F.rtiEfetiva === undefined ? '' : F.rtiEfetiva, function (v) { if (v === null) delete F.rtiEfetiva; else F.rtiEfetiva = v; })),
      llab('Reservatório elevado (isenta jockey, SP)', chk(!!F.elevado, function (v) { F.elevado = v; }, true))]));
    var info = $('div', { class: 'eq' }); S.upd.push(function () {
      var cl = M.classifica(D, P.norma, P.sistema.coluna, P.sistema.area), r = S.R && S.R.res;
      info.textContent = 'RTI da tabela: ' + (cl ? cl.rti + ' m³ (tipo ' + cl.tipo + ', ' + cl.faixa + ' m²)' : '-') + '   efetiva: ' + (F.rtiEfetiva === undefined ? 'não informada' : F.rtiEfetiva + ' m³') + (r && r.numeros.dur !== undefined ? '   duração com os dois jatos: ' + fmt(r.numeros.dur, 1) + ' min' : '') + '\nSubdivisão mínima de 3 m³ por compartimento (4.9.7); sem conjugar com outras reservas (4.9.8).';
    });
    el.appendChild(info);
    el.appendChild($('h3', { class: 's', text: 'Ambiente (NPSH disponível)' }));
    var amb = $('div', { class: 'eq' }); S.upd.push(function () {
      var a = M.ambiente(D, P.ambiente.altitude, P.ambiente.temperatura);
      amb.textContent = 'Pressão atmosférica a ' + P.ambiente.altitude + ' m: ' + fmt(a.Patm, 2) + ' mca (Azevedo Netto, Tabela 11-1, p. 285, interpolação linear)\nPressão de vapor a ' + P.ambiente.temperatura + ' °C: ' + fmt(a.Pvap, 3) + ' mca (Azevedo Netto, Quadro 1.7, p. 9, interpolação linear)\nO NPSH só é verificado na sucção negativa (bomba acima de X): NPSHd = Patm - Pvap - altura estática - hf com 1,5 Q (IT 22, 4.8.15).';
    });
    el.appendChild($('div', { class: 'fl' }, [lab('Altitude (m)', numIn(P.ambiente.altitude, function (v) { P.ambiente.altitude = v === null ? 0 : v; })), lab('Temperatura da água (°C)', numIn(P.ambiente.temperatura, function (v) { P.ambiente.temperatura = v === null ? 20 : v; }))]));
    el.appendChild(amb);
    el.appendChild($('h3', { class: 's', text: 'Saídas, jockey e pressostatos' }));
    el.appendChild($('div', { class: 'fl' }, [
      lab('Saídas de hidrante (jockey, SP: acima de 6)', numIn(P.saidas === undefined ? '' : P.saidas, function (v) { if (v === null) delete P.saidas; else P.saidas = v; })),
      lab('Fundo de escala do pressostato (bar)', numIn(P.pressostatoFundoBar === undefined ? '' : P.pressostatoFundoBar, function (v) { if (v === null) delete P.pressostatoFundoBar; else P.pressostatoFundoBar = v; }))]));
    if (P.norma === 'PR') el.appendChild($('div', { class: 'fl' }, [llab('Ramal de retorno para testes lançado e dimensionado para a curva da bomba (NPT 022, 5.10.6.3)', chk(!!P.retornoTeste, function (v) { if (v) P.retornoTeste = true; else delete P.retornoTeste; }))]));
    // cotas extras
    el.appendChild($('h3', { class: 's', text: 'Cotas extras para a pressão estática (V05)' }));
    el.appendChild($('p', { class: 'nota', text: 'Pavimentos mais baixos que qualquer hidrante, por exemplo subsolos: a estática é calculada em cada cota.' }));
    P.cotasExtras = P.cotasExtras || [];
    el.appendChild(tabela([['Nome'], ['Cota (m)', 'r'], ['']], P.cotasExtras.map(function (c, i) {
      return $('tr', null, [td(txtIn(c.nome, function (v) { c.nome = v; })), td(numIn(c.z, function (v) { c.z = v === null ? 0 : v; }), 'r'), td($('button', { class: 'b p x', onclick: function () { P.cotasExtras.splice(i, 1); mudou(true); } }, ['x']))]);
    })));
    el.appendChild($('button', { class: 'b s', onclick: function () { P.cotasExtras.push({ nome: 'pavimento', z: 0 }); mudou(true); } }, ['Nova cota']));
    // recalque
    el.appendChild($('h3', { class: 's', text: 'Dispositivo de recalque (registro; não é dimensionado)' }));
    var rc = P.recalque = P.recalque || { ativo: false, z: 0, dn: 65, L: 0 };   /* 2.4: sem peças do recalque (não se calcula) */
    delete rc.pecas; delete rc.descontaTronco;
    el.appendChild($('div', { class: 'fl' }, [llab('Lançar recalque', chk(!!rc.ativo, function (v) { rc.ativo = v; }, true))]));
    if (rc.ativo) {
      el.appendChild($('div', { class: 'fl' }, [lab('Cota do recalque (m)', numIn(rc.z, function (v) { rc.z = v === null ? 0 : v; })), lab('DN', sel(dnsDisponiveis().map(function (d) { return [String(d), 'DN' + d]; }), String(rc.dn || 65), function (v) { rc.dn = parseInt(v, 10); }, true)), lab('Comprimento (m)', numIn(rc.L, function (v) { rc.L = v || 0; }))]));
    }
    return el;
  }

  // ------------------------------------------------------------------ tela 6, bomba e jockey
  function svgEl(tag, a, kids) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(a || {}).forEach(function (k) { e.setAttribute(k, a[k]); }); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function svgTxt(x, y, t, a) { var e = svgEl('text', Object.assign({ x: x, y: y, fill: 'currentColor', 'font-size': 11 }, a || {})); e.textContent = t; return e; }
  function grafico(r, b) {
    var W = 680, H = 360, ml = 48, mr = 14, mt = 14, mb = 40, pw = W - ml - mr, ph = H - mt - mb;
    var n = r.numeros, pts = b.pts.map(function (p) { return [p[1], p[0]]; }).sort(function (a, c) { return a[0] - c[0]; });
    pts.unshift([0, b.shutoff]);
    var PAs = []; for (var i = 0; i <= 40; i++) PAs.push(n.PA - 6 + i * 1.0);
    var sis = M.curvaSistema(r.ctx, r.par, PAs).filter(function (p) { return p.Qth > 0; });
    var qmax = Math.max(pts[pts.length - 1][0], n.Qth * 1.6), hmax = Math.max(b.shutoff, n.AMT) * 1.08;
    var gx = function (q) { return ml + q / qmax * pw; }, gy = function (h) { return mt + ph - Math.min(h, hmax) / hmax * ph; };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: 'max-width:720px;color:var(--tx);background:var(--pn);border:1px solid var(--bd);border-radius:6px' });
    function passo(m) { var p = Math.pow(10, Math.floor(Math.log(m / 5) / Math.LN10)), f = [1, 2, 5, 10].filter(function (x) { return m / (x * p) <= 8; })[0]; return f * p; }
    var sx = passo(qmax), sy = passo(hmax), v;
    for (v = 0; v <= qmax; v += sx) { svg.appendChild(svgEl('line', { x1: gx(v), x2: gx(v), y1: mt, y2: mt + ph, style: 'stroke:var(--bd)' })); svg.appendChild(svgTxt(gx(v), H - mb + 14, fmt(v, v % 1 ? 1 : 0), { 'text-anchor': 'middle' })); }
    for (v = 0; v <= hmax; v += sy) { svg.appendChild(svgEl('line', { x1: ml, x2: ml + pw, y1: gy(v), y2: gy(v), style: 'stroke:var(--bd)' })); svg.appendChild(svgTxt(ml - 6, gy(v) + 4, fmt(v, 0), { 'text-anchor': 'end' })); }
    svg.appendChild(svgTxt(ml + pw / 2, H - 6, 'Vazão (m³/h)', { 'text-anchor': 'middle' }));
    var yl = svgTxt(12, mt + ph / 2, 'Altura (mca)', { 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mt + ph / 2) + ')' }); svg.appendChild(yl);
    svg.appendChild(svgEl('polyline', { points: pts.map(function (p) { return gx(p[0]) + ',' + gy(p[1]); }).join(' '), fill: 'none', 'stroke-width': 2.4, style: 'stroke:var(--ac)' }));
    svg.appendChild(svgEl('polyline', { points: sis.filter(function (p) { return p.AMT <= hmax && p.Qth <= qmax; }).map(function (p) { return gx(p.Qth) + ',' + gy(p.AMT); }).join(' '), fill: 'none', 'stroke-width': 2.4, 'stroke-dasharray': '6 4', style: 'stroke:var(--al)' }));
    pts.slice(1).forEach(function (p) { svg.appendChild(svgEl('circle', { cx: gx(p[0]), cy: gy(p[1]), r: 2.6, style: 'fill:var(--ac)' })); });
    svg.appendChild(svgEl('circle', { cx: gx(n.Qth), cy: gy(n.AMT), r: 5, fill: 'none', 'stroke-width': 2, style: 'stroke:var(--tx)' })); svg.appendChild(svgTxt(gx(n.Qth) - 8, gy(n.AMT) + 18, 'nominal '  + fmt(n.Qth, 2) + ' m³/h, ' + fmt(n.AMT, 2) + ' mca'));
    if (n.Qw !== undefined) { svg.appendChild(svgEl('circle', { cx: gx(n.Qw), cy: gy(n.Hw), r: 5, style: 'fill:var(--er)' })); svg.appendChild(svgTxt(gx(n.Qw) + 8, gy(n.Hw) - 8, 'trabalho ' + fmt(n.Qw, 2) + ' m³/h, ' + fmt(n.Hw, 2) + ' mca')); }
    return svg;
  }
  function todasBombas() { return D.bombasBase.concat(S.proj.bombasUsuario || []); }
  function tela6() {
    var P = S.proj, el = $('div', null, cab('Tela 6, Bomba e jockey', 'Catálogo Schneider 2025, linha de incêndio (apoio; lido do PDF por script), mais as bombas cadastradas por você. O NPSHr não consta do catálogo: informe o do fabricante para verificar V08 na sucção negativa.'));
    var rotulo = function (b) { return [b.usuario ? b.fabricante + ' ' + b.modelo : b.modelo, b.cv ? b.cv + ' cv' : '', b.rotorTxt ? 'rotor ' + b.rotorTxt : '', b.polos ? b.polos + ' polos' : ''].filter(Boolean).join(', ') + (b.usuario ? ' [cadastrada pelo usuário]' : ' (p. ' + b.pagina + ')'); };
    var all = todasBombas(), bs = all.filter(function (b) { return !b.jockey; }), js = all.filter(function (b) { return b.jockey; });
    var b = P.bomba = P.bomba || { id: '' };
    el.appendChild($('div', { class: 'fl' }, [
      lab('Bomba principal', sel([['', 'Sem bomba lançada']].concat(bs.map(function (x) { return [x.id, rotulo(x)]; })), b.id || '', function (v) { b.id = v; if (!v) delete b.npshr; }, true)),
      lab('NPSHr (mca, do fabricante)', numIn(b.npshr === undefined ? '' : b.npshr, function (v) { if (v === null) delete b.npshr; else b.npshr = v; }))]));
    var j = P.jockey = P.jockey || { id: '' };
    el.appendChild($('div', { class: 'fl' }, [lab('Bomba jockey (Schneider p. 61 ou cadastrada)', sel([['', 'Sem jockey']].concat(js.map(function (x) { return [x.id, rotulo(x)]; })), j.id || '', function (v) { j.id = v; }, true))]));
    var cur = all.filter(function (x) { return x.id === b.id; })[0];
    // gráfico
    el.appendChild($('h3', { class: 's', text: 'Curva da bomba contra a curva do sistema' }));
    var gr = $('div'), gnota = $('p', { class: 'nota' });
    S.upd.push(function () {
      gr.textContent = ''; var r = S.R && S.R.res;
      if (!cur) { gnota.textContent = 'Escolha uma bomba para ver o gráfico.'; return; }
      if (!r) { gnota.textContent = 'Corrija os erros da rede para desenhar o sistema.'; return; }
      if (r.ctx.modo === 'gravidade') { gnota.textContent = 'Modo só gravidade: sem bomba.'; return; }
      gr.appendChild(grafico(r, cur));
      var n = r.numeros;
      gnota.textContent = 'Linha azul: bomba. Linha tracejada: sistema do par adotado. Círculo vazio: ponto nominal do par adotado (' + fmt(n.Qth, 2) + ' m³/h e AMT ' + fmt(n.AMT, 2) + ' mca). Ponto vermelho: ponto de trabalho' + (n.Qw !== undefined ? ' (' + fmt(n.Qw, 2) + ' m³/h e ' + fmt(n.Hw, 2) + ' mca)' : ' (sem cruzamento: a bomba não atende ou o sistema pede mais altura)') + '. Pontos azuis: leitura do catálogo; entre eles, interpolação linear; fora, extrapolação pelo último segmento.';
    });
    el.appendChild(gr); el.appendChild(gnota);
    if (cur) {
      el.appendChild($('h3', { class: 's', text: 'Dados da bomba escolhida' }));
      el.appendChild($('p', { class: 'nota', text: 'Shut-off ' + cur.shutoff + ' mca; altura máxima de sucção ' + (cur.hsucMax === undefined || cur.hsucMax === null ? '-' : cur.hsucMax + ' mca') + '; sucção ' + (cur.succaoPol || '-') + '", recalque ' + (cur.recalquePol || '-') + '". Fonte: ' + cur.fonte }));
      el.appendChild(tabela([['Q (m³/h)', 'r'], ['H (mca)', 'r']], cur.pts.slice().sort(function (a, c) { return a[1] - c[1]; }).map(function (p) { return $('tr', null, [td(fmt(p[1], 2), 'r'), td(fmt(p[0], 1), 'r')]); })));
    }
    // escada de pressostatos
    el.appendChild($('h3', { class: 's', text: 'Escada de pressostatos (jockey e bomba principal)' }));
    var es = $('div'); S.upd.push(function () {
      es.textContent = ''; var r = S.R && S.R.res, n = r && r.numeros;
      if (!n || !n.escada) { es.appendChild($('p', { class: 'nota', text: 'Lance a bomba principal e a jockey (modo com bomba) para ver a escada.' })); return; }
      var e = n.escada, asp = r.ctx.z('BI') - r.ctx.zX, fs = P.pressostatoFundoBar, bar = M.BAR, so = r.ctx.proj.bomba.shutoff;
      es.appendChild($('div', { class: 'eq' }, ['Regra (IT 22, C.1.15.1 e 4.11.7.2), a partir da pressão calculada, com o teto no pior nível (X):\nLiga a principal = pressão calculada na descarga = ' + fmt(e.ligaPrincipal, 1) + ' mca\nLiga a jockey = desliga - 10 = ' + fmt(e.ligaJockey, 1) + ' mca\nDesliga a jockey = liga a principal + 20, até o teto = ' + fmt(e.desligaJockey, 1) + ' mca\nTeto = shut-off da principal - altura de aspiração = ' + fmt(so, 1) + ' - ' + fmt(asp, 2) + ' = ' + fmt(e.teto, 1) + ' mca\nundo de escala do instrumento: o ajuste deve ficar em até 70% dele.']));
      es.appendChild(tabela([['Ajuste'], ['mca', 'r'], ['bar', 'r'], ['Fundo de escala mínimo (bar)', 'r'], ['Situação']], [['Desliga a jockey', e.desligaJockey, e.fundoJockeyBar], ['Liga a jockey', e.ligaJockey, e.ligaJockey / 0.7 / bar], ['Liga a principal', e.ligaPrincipal, e.fundoPrincipalBar]].map(function (x) {
        var ok = fs === undefined ? null : fs * 0.7 * bar >= x[1] - 1e-9;
        return $('tr', null, [td(x[0]), td(fmt(x[1], 1), 'r'), td(fmt(x[1] / bar, 2), 'r'), td(fmt(x[2], 1), 'r'), td(fs === undefined ? badge('PENDENTE', 'informe o fundo de escala (tela 5)') : badge(ok ? 'OK' : 'ERRO', ok ? 'cabe em ' + fmt(fs, 1) + ' bar' : 'não cabe em ' + fmt(fs, 1) + ' bar'))]);
      })));
      es.appendChild($('p', { class: 'nota', text: 'Vazão da jockey no ponto de partida (H = liga a jockey + altura de aspiração): ' + fmt(n.Qjl, 1) + ' L/min (limite 20). A jockey precisa de shut-off maior ou igual ao da principal.' }));
    });
    el.appendChild(es);
    // seleção assistida
    el.appendChild($('h3', { class: 's', text: 'Seleção assistida' }));
    var sa = $('div'); S.upd.push(function () {
      sa.textContent = ''; var r = S.R && S.R.res; if (!r) { sa.appendChild($('p', { class: 'nota', text: 'Corrija os erros da rede para listar as bombas.' })); return; }
      var Qh = r.numeros.Qth, amt = r.numeros.AMT, l = [];
      todasBombas().filter(function (x) { return !x.jockey; }).forEach(function (x) { var h = M.alturaBomba(x.pts, Qh); if (!h.extrapolado && h.H >= amt) l.push({ b: x, H: h.H, m: h.H - amt }); });
      l.sort(function (a, c) { return a.m - c.m; });
      sa.appendChild($('p', { class: 'nota', text: 'Par adotado: Qt ' + fmt(r.numeros.Qt, 1) + ' L/min (' + fmt(Qh, 2) + ' m³/h) e AMT ' + fmt(amt, 2) + ' mca. Bombas com H na vazão nominal maior ou igual à AMT, sem extrapolar a tabela, pela menor margem. O usuário ainda escolhe e confere V05, V10 e V11.' }));
      var zmin = Math.min.apply(null, P.hidrantes.map(function (h) { return P.nos[h.no] ? P.nos[h.no].z : 0; }).concat((P.cotasExtras || []).map(function (c) { return c.z; })));
      sa.appendChild(tabela([['Modelo'], ['H nominal (mca)', 'r'], ['Margem (mca)', 'r'], ['Shut-off (mca)', 'r'], ['Estática máx. aprox. (mca)', 'r'], ['']], l.slice(0, 25).map(function (x) {
        return $('tr', { class: x.b.id === b.id ? 'sel' : '' }, [td(rotulo(x.b)), td(fmt(x.H, 2), 'r'), td(fmt(x.m, 2), 'r'), td(String(x.b.shutoff), 'r'), td(fmt(x.b.shutoff + (P.fonte.zCheio - zmin), 1), 'r'), td($('button', { class: 'b p s', onclick: function () { b.id = x.b.id; mudou(true); } }, ['usar']))]);
      })));
      if (!l.length) sa.appendChild($('div', { class: 'msg al', text: 'Nenhuma bomba atende. Revise a rede ou cadastre outra bomba abaixo.' }));
    });
    el.appendChild(sa);
    // cadastro
    el.appendChild($('h3', { class: 's', text: 'Cadastrar bomba' }));
    el.appendChild($('p', { class: 'nota', text: 'Bomba fora do catálogo: informe os dados do fabricante e a fonte (catálogo e página, obrigatória). Pontos da curva, um por linha: "vazão em m³/h; altura em mca", com vazão crescente e altura decrescente, no mínimo 3. O shut-off é a altura com a vazão zero e não pode ser menor que a primeira altura. Valores do catálogo, nunca estimados.' }));
    var f = {}, ms = $('div');
    function campo(rot, k, w, ph) { f[k] = $('input', { type: 'text', class: w ? '' : 'n', placeholder: ph || '', style: w ? 'width:' + w : null }); return lab(rot, f[k]); }
    f.pts = $('textarea', { rows: '6', cols: '22', placeholder: '0,0; 60\n10; 55\n20; 48\n30; 38' });
    f.jockey = $('input', { type: 'checkbox' });
    el.appendChild($('div', { class: 'fl' }, [campo('Fabricante', 'fab', '140px'), campo('Modelo', 'mod', '140px'), campo('Potência (cv)', 'cv'), campo('Rotor (mm)', 'rotor'), campo('Rotação (rpm)', 'rpm'), campo('Sucção (pol.)', 'suc'), campo('Recalque (pol.)', 'rec'), campo('Shut-off (mca)', 'so'), campo('Altura máx. de sucção (mca)', 'hs')]));
    el.appendChild($('div', { class: 'fl' }, [lab('Pontos da curva (Q; H)', f.pts), campo('Fonte (catálogo e página)', 'fonte', '260px'), llab('É bomba jockey', f.jockey),
      $('button', { class: 'b s', onclick: function () {
        var q = [], h = [], pts = [], erro = '';
        f.pts.value.split('\n').forEach(function (l) { var p = l.split(';'); if (p.length === 2) { var a = pn(p[0]), c = pn(p[1]); if (a !== null && c !== null) { q.push(a); h.push(c); } } });
        var so = pn(f.so.value);
        if (!f.fab.value.trim() || !f.mod.value.trim()) erro = 'Informe fabricante e modelo.';
        else if (!f.fonte.value.trim()) erro = 'Informe a fonte (catálogo e página).';
        else if (so === null || so <= 0) erro = 'Informe o shut-off (mca).';
        else if (q.length < 3) erro = 'Informe pelo menos 3 pontos da curva.';
        else if (!q.every(function (x, k) { return x >= 0 && (k === 0 || x > q[k - 1]); })) erro = 'A vazão deve crescer de um ponto para o seguinte.';
        else if (!h.every(function (x, k) { return x > 0 && (k === 0 || x < h[k - 1]); })) erro = 'A altura deve decrescer com a vazão.';
        else if (so < h[0] - 1e-9) erro = 'O shut-off não pode ser menor que a altura do primeiro ponto.';
        if (erro) { ms.textContent = ''; ms.appendChild($('div', { class: 'msg er', text: erro })); return; }
        q.forEach(function (x, k) { if (x > 0) pts.push([h[k], x]); });
        if (pts.length < 3) { ms.textContent = ''; ms.appendChild($('div', { class: 'msg er', text: 'Informe pelo menos 3 pontos com vazão maior que zero.' })); return; }
        var n = (P.bombasUsuario || []).length + 1, id = 'usr-' + n; while (todasBombas().some(function (x) { return x.id === id; })) { n++; id = 'usr-' + n; }
        var rotor = pn(f.rotor.value);
        P.bombasUsuario = (P.bombasUsuario || []).concat([{ id: id, usuario: true, fabricante: f.fab.value.trim(), serie: 'cadastrada pelo usuário', modelo: f.mod.value.trim(), pagina: '-', cv: pn(f.cv.value) || 0, rotor: rotor || 0, rotorTxt: rotor ? String(rotor) : '', rpm: pn(f.rpm.value), succaoPol: pn(f.suc.value), recalquePol: pn(f.rec.value), polos: null, shutoff: so, hsucMax: pn(f.hs.value), jockey: !!f.jockey.checked, pts: pts, fonte: f.fonte.value.trim() }]);
        mudou(true);
      } }, ['Cadastrar bomba'])]));
    el.appendChild(ms);
    (P.bombasUsuario || []).forEach(function (x) {
      el.appendChild($('div', { class: 'msg ok' }, [rotulo(x) + (x.jockey ? ' (jockey)' : '') + ', shut-off ' + x.shutoff + ' mca, ' + x.pts.length + ' pontos. Fonte: ' + x.fonte + '  ',
        $('button', { class: 'b p s', onclick: function () { b.id = x.jockey ? b.id : x.id; if (x.jockey) j.id = x.id; mudou(true); } }, ['usar']), $('button', { class: 'b p x', onclick: function () { P.bombasUsuario = P.bombasUsuario.filter(function (y) { return y !== x; }); if (b.id === x.id) b.id = ''; if (j.id === x.id) j.id = ''; mudou(true); } }, ['remover'])]));
    });
    el.appendChild($('p', { class: 'nota', text: 'Minhas bombas ficam no arquivo do projeto (.firecalc.json) e vão junto com ele.' }));
    return el;
  }

  // ------------------------------------------------------------------ tela 7, resultados
  var VT = {
    V01: 'Q e P mínimas no mais desfavorável', V02: 'Dois jatos; par adotado = maior AMT', V03: 'Equilíbrio no nó de derivação', V04: 'Pressão dinâmica máxima na válvula', V05: 'Pressão estática (shut-off + coluna)',
    V06: 'Velocidade na rede', V07: 'Velocidade na sucção', V08: 'NPSH disponível contra requerido', V09: 'Condição de sucção', V10: 'Bomba atende a AMT', V11: 'Shut-off da bomba',
    V12: 'RTI efetiva contra a tabela', V13: 'Duração da RTI', V14: 'Jockey', V15: 'Vazão da jockey na partida', V16: 'Shut-off da jockey', V17: 'Escada de pressostatos', V18: 'DN mínimo da rede',
    V19: 'Altura da válvula do hidrante', V20: 'Pressão da viatura no recalque', V21: 'Uma tabela de Leq por projeto', V22: 'Lista de conferência manual', V23: 'Ponto único de hidrante (PR)', V24: 'Retorno para testes (PR)' };
  var VMOTIVO = { V04: 'precisa de bomba lançada e sucção', V05: 'precisa de bomba lançada', V07: 'precisa de bomba (modo com bomba)', V08: 'só na sucção negativa, com bomba', V09: 'precisa de bomba (modo com bomba)', V10: 'precisa de bomba', V11: 'precisa de bomba',
    V12: 'informe o volume efetivo da RTI (tela 5)', V13: 'informe o volume efetivo da RTI (tela 5)', V14: 'só no modo com bomba', V15: 'precisa de jockey', V16: 'precisa de jockey', V17: 'precisa de jockey', V19: 'informe a altura da válvula de todos os hidrantes (tela 4)', V20: 'lance o recalque (tela 5)' };
  function vir(t) { return String(t).replace(/(\d)\.(\d)/g, '$1,$2'); }
  function tela7() {
    var P = S.proj, el = $('div', null, cab('Tela 7, Resultados', 'Semáforo de V01 a V24 com valor e item da norma ' + P.norma + '. Cinza: depende de algo ainda não lançado. O sistema avisa, não bloqueia.'));
    var corpo = $('tbody'), sem = $('div'), pares = $('div'), hid = $('div'), calc = $('div');
    el.appendChild(sem); el.appendChild($('div', { class: 'tw', style: 'max-height:none' }, [$('table', null, [$('thead', null, [$('tr', null, ['ID', 'Situação', 'Verificação', 'Valor', 'Item da norma'].map(function (c) { return $('th', { text: c }); }))]), corpo])]));
    el.appendChild($('h3', { class: 's', text: 'Hidrantes do par adotado' })); el.appendChild(hid);
    el.appendChild($('h3', { class: 's', text: 'Pares avaliados (ordem de AMT)' })); el.appendChild(pares);
    el.appendChild($('h3', { class: 's', text: 'Lista de conferência manual (V22)' }));
    el.appendChild($('ul', null, ['Cobertura de toda a edificação pelo trajeto da mangueira e do esguicho (IT 22, 4.7 e 4.8.2).', 'Alcance do jato com visada (10 m na IT 22 e na NPT 022).', 'Lances de escada de até 15 m e hidrante a até 5 m do acesso (4.11.3.1).', 'Resolva e registre no memorial; a ferramenta não prova cobertura.'].map(function (t) { return $('li', { text: t }); })));
    el.appendChild($('h3', { class: 's', text: 'Mostrar o cálculo' })); el.appendChild(calc);
    S.upd.push(function () {
      corpo.textContent = ''; sem.textContent = ''; pares.textContent = ''; hid.textContent = ''; calc.textContent = '';
      if (S.R && S.R.erro) { sem.appendChild($('div', { class: 'msg er', text: 'Não calculável: ' + S.R.erro })); return; }
      var r = S.R.res, N = norma(), por = {};
      r.verificacoes.forEach(function (v) { por[v.id] = v; });
      for (var k = 1; k <= 24; k++) {
        var id = 'V' + (k < 10 ? '0' : '') + k, v = por[id], item = (N.itens && N.itens[id]) || '';
        if (v) corpo.appendChild($('tr', null, [td(id), td(badge(v.situacao)), td(vir(v.titulo)), td(vir(v.valor)), td(item)]));
        else {
          var soPR = (id === 'V23' || id === 'V24');
          corpo.appendChild($('tr', null, [td(id), td(badge(soPR ? 'NA' : 'PENDENTE', soPR ? 'não se aplica' : 'pendente')), td(VT[id]), td(soPR ? 'só no PR' : (VMOTIVO[id] || '')), td(item)]));
        }
      }
      var n = r.numeros;
      sem.appendChild($('p', null, ['Tipo ', $('b', { text: String(n.tipo) }), ', par ', $('b', { text: n.par }), ', derivação em ', $('b', { text: n.A }), '. ', badge('ERRO', r.verificacoes.filter(function (v) { return v.situacao === 'ERRO'; }).length + ' erro(s)'), ' ', badge('ALERTA', r.verificacoes.filter(function (v) { return v.situacao === 'ALERTA'; }).length + ' alerta(s)')]));
      hid.appendChild(tabela([['Jato'], ['Papel'], ['Q (L/min)', 'r'], ['P na válvula (mca)', 'r'], ['Q mín.', 'r'], ['P mín.', 'r']], [[r.par.crit, 'crítico', n.Qcrit, n.Pvcrit], [r.par.out, 'outro (equilibrado)', n.Qout, n.Pvout]].map(function (x) {
        return $('tr', null, [td(x[0].id), td(x[1]), td(fmt(x[2], 2), 'r'), td(fmt(x[3], 2), 'r'), td(fmt(x[0].Qmin, 1), 'r'), td(fmt(x[0].PvMin !== undefined ? x[0].PvMin : x[0].Pmin, 2), 'r')]);
      })));
      pares.appendChild(tabela([['Par'], ['Derivação'], ['PA (mca)', 'r'], ['Qt (L/min)', 'r'], ['AMT (mca)', 'r']], r.pares.map(function (p, i) { return $('tr', { class: i === 0 ? 'sel' : '' }, [td(p.par), td(p.A), td(fmt(p.PA, 2), 'r'), td(fmt(p.Qt, 2), 'r'), td(fmt(p.AMT, 2), 'r')]); })));
      var ln = [];
      ln.push('PA = P na válvula do crítico + dz + hf do ramal = ' + fmt(n.PA, 2) + ' mca');
      ln.push('Qt = ' + fmt(n.Qcrit, 2) + ' + ' + fmt(n.Qout, 2) + ' = ' + fmt(n.Qt, 2) + ' L/min; diferença de equilíbrio ' + fmt(n.dif, 2) + ' mca');
      if (n.Pd !== undefined) { ln.push('Pd = PA + hf do tronco(' + fmt(n.Qt, 1) + ') + (zA - zBI) = ' + fmt(n.PA, 2) + ' + ' + fmt(n.hfTr, 2) + ' + ' + fmt(P.nos[n.A] ? P.nos[n.A].z - P.nos.BI.z : 0, 2) + ' = ' + fmt(n.Pd, 2) + ' mca'); ln.push('AMT = Pd + (zBI - zX) + hf da sucção = ' + fmt(n.Pd, 2) + ' + ' + fmt((P.nos.BI ? P.nos.BI.z : 0) - P.fonte.zX, 2) + ' + ' + fmt(n.hfSuc, 2) + ' = ' + fmt(n.AMT, 2) + ' mca'); }
      else ln.push('Reforço: AMT = PA - Pg = ' + fmt(n.PA, 2) + ' - ' + fmt(n.Pg, 2) + ' = ' + fmt(n.AMT, 2) + ' mca');
      if (n.Qw !== undefined) ln.push('Ponto de trabalho: ' + fmt(n.Qw, 2) + ' m³/h e ' + fmt(n.Hw, 2) + ' mca');
      if (n.NPSHd !== undefined) ln.push('NPSHd = ' + fmt(n.Patm, 2) + ' - ' + fmt(n.Pvap, 3) + ' - altura estática - ' + fmt(n.hfSuc15, 2) + ' (1,5 Q) = ' + fmt(n.NPSHd, 2) + ' mca');
      if (n.PR !== undefined) ln.push('Pressão na entrada do recalque (viatura): ' + fmt(n.PR, 2) + ' mca');
      calc.appendChild($('div', { class: 'eq' }, [ln.join('\n')]));
      var tt = r.par.tronco.map(function (e) { return [e, n.Qt]; }).concat(r.par.ramalCrit.map(function (e) { return [e, n.Qcrit]; })).concat(r.par.ramalOut.map(function (e) { return [e, n.Qout]; }));
      calc.appendChild(tabela([['Trecho'], ['Q (L/min)', 'r'], ['D int. (mm)', 'r'], ['Lt (m)', 'r'], ['J (m/m)', 'r'], ['hf (mca)', 'r'], ['v (m/s)', 'r']], tt.map(function (x) {
        var t = x[0].t, j = M.J(x[1], t.dint, t.C); return $('tr', null, [td(t.nome), td(fmt(x[1], 2), 'r'), td(fmt(t.dint, 1), 'r'), td(fmt(t.Lt, 2), 'r'), td(fmt(j, 5), 'r'), td(fmt(j * t.Lt, 3), 'r'), td(fmt(M.vel(x[1], t.dint), 2), 'r')]);
      })));
      if (n.escada) calc.appendChild($('div', { class: 'eq' }, ['Escada de pressostatos (mca): desliga jockey ' + fmt(n.escada.desligaJockey, 1) + ', liga jockey ' + fmt(n.escada.ligaJockey, 1) + ', liga principal ' + fmt(n.escada.ligaPrincipal, 1) + '\nFundo de escala mínimo (70%): jockey ' + fmt(n.escada.fundoJockeyBar, 1) + ' bar, principal ' + fmt(n.escada.fundoPrincipalBar, 1) + ' bar']));
    });
    return el;
  }

  // ------------------------------------------------------------------ tela 8, exportar
  function baixaBlob(nome, blob) {
    try {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { S.msg = 'Não foi possível baixar o arquivo neste navegador.'; }
  }
  function nomeArq() { return String((S.proj.meta && S.proj.meta.nome) || 'projeto').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'projeto'; }
  function tela8() {
    var P = S.proj, el = $('div', null, cab('Tela 8, Exportar', 'Todos os arquivos são gerados no navegador; nenhum dado sai do computador. O .xlsx traz as fórmulas vivas: abra no Excel ou no LibreOffice e mude qualquer entrada azul.'));
    var msg = $('div');
    function aviso(t, ok) { msg.textContent = ''; msg.appendChild($('div', { class: 'msg ' + (ok ? 'ok' : 'er'), text: t })); }
    function pronto() { if (!S.R || !S.R.res) { aviso('Resolva os erros do cálculo (tela Resultados) antes de exportar.', false); return false; } return true; }
    var bx = $('button', { class: 'b s', onclick: function () {
      if (!pronto()) return;
      if (typeof ExcelJS === 'undefined' || typeof FireExporta === 'undefined') { aviso('A biblioteca de planilha não foi carregada neste arquivo.', false); return; }
      try {
        var W = FireExporta.modelo(paraMotor(), D, S.R.res, M, { versao: VERSAO }); FireExporta.avalia(W);
        FireExporta.gerar(ExcelJS, W).xlsx.writeBuffer().then(function (buf) {
          baixaBlob(nomeArq() + '_memoria_de_calculo.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
          aviso('Arquivo gerado: ' + nomeArq() + '_memoria_de_calculo.xlsx (15 abas, fórmulas vivas, valor guardado em cada fórmula).', true);
        }).catch(function (e) { aviso('Falha ao gerar o .xlsx: ' + e.message, false); });
      } catch (e) { aviso('Falha ao montar a planilha: ' + e.message, false); }
    } }, ['Baixar a memória de cálculo (.xlsx)']);
    var bp = $('button', { class: 'b', onclick: function () { baixa(nomeArq() + '.firecalc.json', JSON.stringify(P, null, 1)); aviso('Projeto salvo: ' + nomeArq() + '.firecalc.json', true); } }, ['Baixar o projeto (.firecalc.json)']);
    var bb = $('button', { class: 'b', onclick: function () { baixa('minhas_bombas.firecalc.json', JSON.stringify({ bombasUsuario: P.bombasUsuario || [] }, null, 1)); aviso('Bombas cadastradas salvas: ' + (P.bombasUsuario || []).length + ' bomba(s).', true); } }, ['Baixar minhas bombas']);
    var br = $('button', { class: 'b', onclick: function () {
      if (!pronto()) return; var r = S.R.res;
      var t = 'FireCalc: relatório de verificações\nProjeto: ' + nomeArq() + '\nNorma: ' + P.norma + '\nPar adotado: ' + r.numeros.par + '\n\n' + r.verificacoes.map(function (v) { return v.id + ' [' + v.situacao + '] ' + v.titulo + ': ' + vir(v.valor) + (v.item ? ' (' + v.item + ')' : ''); }).join('\n') + '\n';
      baixa(nomeArq() + '_verificacoes.txt', t, 'text/plain'); aviso('Relatório de verificações salvo.', true);
    } }, ['Baixar o relatório de verificações']);
    var bl = $('button', { class: 'b', onclick: function () {
      var t = 'Lista de conferência manual (V22)\n1. Cobertura de toda a edificação pelo trajeto da mangueira e do esguicho (IT 22, 4.7 e 4.8.2).\n2. Alcance do jato com visada (10 m).\n3. Lances de escada de até 15 m e hidrante a até 5 m do acesso (4.11.3.1).\n4. Registre no memorial o resultado de cada item.\n';
      baixa(nomeArq() + '_conferencia.txt', t, 'text/plain'); aviso('Lista de conferência salva.', true);
    } }, ['Baixar a lista de conferência']);
    el.appendChild($('div', { class: 'fl' }, [bx])); el.appendChild($('div', { class: 'fl' }, [bp, bb, br, bl])); el.appendChild(msg);
    el.appendChild($('p', { class: 'nota', text: 'Azul = entrada; preto = fórmula viva; amarelo = parâmetro da grade do ponto de trabalho; cinza = valor do motor (não vivo): recalque, dinâmica de 100 mca, verificações sem fórmula e o caminho B. A aba Hipotese segue o par adotado na hora da exportação; a aba Pares é toda viva.' }));
    el.appendChild($('h3', { class: 's', text: 'Números do memorial' }));
    var mem = $('div'); el.appendChild(mem);
    S.upd.push(function () {
      mem.textContent = ''; var r = S.R && S.R.res; if (!r) return; var n = r.numeros, l = [];
      function a(k, v) { l.push($('tr', null, [td(k), td(v, 'r')])); }
      a('Tipo de sistema', String(n.tipo)); a('Par adotado', n.par); a('Nó de derivação', n.A); a('Q total (L/min)', fmt(n.Qt, 2)); a('PA no nó de derivação (mca)', fmt(n.PA, 2)); a(P.fonte.modo === 'bomba' ? 'AMT (mca)' : 'Altura do reforço (mca)', fmt(n.AMT, 2));
      if (n.Qw !== undefined) { a('Ponto de trabalho, vazão (m³/h)', fmt(n.Qw, 2)); a('Ponto de trabalho, altura (mca)', fmt(n.Hw, 2)); }
      if (n.NPSHd !== undefined) a('NPSH disponível (mca)', fmt(n.NPSHd, 2)); if (n.dur !== undefined) a('Duração da RTI (min)', fmt(n.dur, 1));
      if (n.estaticaMax) a('Estática máxima (mca)', fmt(n.estaticaMax.P, 1));
      if (n.escada) a('Escada de pressostatos (mca)', fmt(n.escada.desligaJockey, 1) + ' / ' + fmt(n.escada.ligaJockey, 1) + ' / ' + fmt(n.escada.ligaPrincipal, 1));
      mem.appendChild(tabela([['Item'], ['Valor', 'r']], l));
    });
    return el;
  }

  // ------------------------------------------------------------------ início
  function iniciar() {
    document.getElementById('versao').textContent = VERSAO + ' | versão fechada (motor, interface, exportação, classificação assistida e kit) | Azevedo Netto, IT 22/2025, NPT 022, Brentano; catálogos são apoio';
    carregarCaso(CASOS[0].id);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
