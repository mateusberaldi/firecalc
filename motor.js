/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc, motor de cálculo. Funções puras, sem tela e sem dependência de navegador.
 * Unidades: vazão em L/min nos tubos e m³/h na bomba; pressão e altura em mca; comprimento e cota em m; diâmetro em mm.
 * Fontes da verdade: Azevedo Netto, IT 22/2025 (SP), NPT 022 (PR). Catálogos são apoio (dados.js).
 * Convenção de trecho: nome pelos nós, de montante para jusante ("A-H1", Azevedo Netto, cap. 19); BI = bomba, RI = reservatório, A = derivação dos mais desfavoráveis. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.FireMotor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CV = 0.06;              // L/min para m³/h
  var BAR = 10.197;           // mca por bar
  var ITER = 8;               // iterações de ponto fixo do equilíbrio

  // ---------------------------------------------------------------- hidráulica básica
  /** Hazen-Williams, forma da IT 22 (4.8.10.2): J (m/m), Q em L/min, D interno em mm. */
  function J(Q, D, C) { return Q <= 0 ? 0 : 605e4 * Math.pow(Q, 1.85) * Math.pow(C, -1.85) * Math.pow(D, -4.87); }
  function vel(Q, D) { return (Q / 60000) / (Math.PI * Math.pow(D / 1000, 2) / 4); }
  function interp(xs, ys, x) {      // linear, com extrapolação pelos segmentos de ponta
    var n = xs.length, i = 0;
    if (x <= xs[0]) i = 0; else if (x >= xs[n - 1]) i = n - 2; else { while (x > xs[i + 1]) i++; }
    return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
  }
  function bisseca(f, a, b, n) {
    var fa = f(a); n = n || 100;
    for (var k = 0; k < n; k++) { var m = (a + b) / 2, fm = f(m); if ((fa > 0) === (fm > 0)) { a = m; fa = fm; } else b = m; }
    return (a + b) / 2;
  }
  /** Curva da bomba: pts = [[H mca, Q m³/h], ...]; H na vazão Q (m³/h), com aviso de extrapolação. */
  function alturaBomba(pts, Qh) {
    var s = pts.slice().sort(function (a, b) { return a[1] - b[1]; });
    var H = interp(s.map(function (p) { return p[1]; }), s.map(function (p) { return p[0]; }), Qh);
    return { H: H, extrapolado: Qh < s[0][1] || Qh > s[s.length - 1][1] };
  }
  /** Leitura de uma curva do catálogo, pts = [[valor, Q m³/h], ...], na vazão Qh. Fora da faixa desenhada não há leitura: devolve null. */
  function leCurva(pts, Qh) {
    if (!pts || pts.length < 2) return null;
    var s = pts.slice().sort(function (a, b) { return a[1] - b[1]; });
    if (Qh < s[0][1] - 1e-9 || Qh > s[s.length - 1][1] + 1e-9) return null;
    return interp(s.map(function (p) { return p[1]; }), s.map(function (p) { return p[0]; }), Qh);
  }
  /** Vazão (m³/h) da jockey na altura H: tabela [[H, Q]] com o ponto (shut-off, 0). */
  function vazaoJockey(pts, so, H) {
    var s = pts.concat([[so, 0]]).sort(function (a, b) { return a[0] - b[0]; });
    return interp(s.map(function (p) { return p[0]; }), s.map(function (p) { return p[1]; }), H);
  }

  // ---------------------------------------------------------------- ambiente (Azevedo Netto)
  function ambiente(D, altitude, temperatura) {
    return { Patm: interp(D.ambiente.atm.alt, D.ambiente.atm.mca, altitude), Pvap: interp(D.ambiente.vapor.T, D.ambiente.vapor.mca, temperatura) };
  }

  // ---------------------------------------------------------------- tubos e peças
  function achaTubo(D, norma, classe, dn) {
    for (var i = 0; i < D.tubos.length; i++) { var t = D.tubos[i]; if (t.norma === norma && t.classe === classe && t.dn === dn) return t; }
    return null;
  }
  function leqPeca(D, tabela, id, dn) {
    var p = D.leq[tabela].pecas[id];
    if (!p) return { erro: 'peça "' + id + '" não existe na tabela ' + tabela };
    var v = p.dn[String(dn)];
    if (v === undefined || v === null) return { erro: 'peça "' + id + '" sem valor para DN' + dn + ' na tabela ' + tabela };
    return { v: v };
  }
  /** Dados de um trecho: D interno, C, Lt (comprimento real mais virtual) e o detalhe das peças. */
  function prepTrecho(D, proj, t, erros) {
    var tubo = t.tubo || proj.tubo, ft = achaTubo(D, tubo.norma, tubo.classe, t.dn);
    if (!ft) { erros.push('Trecho ' + t.nome + ': tubo ' + tubo.norma + ' ' + tubo.classe + ' DN' + t.dn + ' fora da tabela cadastrada'); ft = { dint: t.dn, rosca: '?' }; }
    var Lv = t.Lvirtual || 0, det = [], pecas = t.pecas || {};
    Object.keys(pecas).forEach(function (id) {
      var r = leqPeca(D, proj.tabelaLeq, id, t.dn);
      if (r.erro) erros.push('Trecho ' + t.nome + ': ' + r.erro); else { Lv += pecas[id] * r.v; det.push({ peca: id, qtd: pecas[id], leq: r.v }); }
    });
    var C = t.C || proj.C;
    return { nome: t.nome, dn: t.dn, dint: ft.dint, rosca: t.junta || ft.rosca, C: C, L: t.L, Lv: Lv, Lt: t.L + Lv, det: det };   // 2.5.0: junta ranhurada no lugar da rosca
  }

  // ---------------------------------------------------------------- grafo pelos nomes dos trechos
  function montaGrafo(D, proj, raiz) {
    var erros = [], adj = {}, vistos = {}, arestas = [], pares = {};
    var tr = proj.trechos.map(function (t) { return prepTrecho(D, proj, t, erros); });
    tr.forEach(function (t) {
      var p = t.nome.split('-');
      if (p.length !== 2 || !p[0] || !p[1]) { erros.push('Trecho "' + t.nome + '": o nome deve ter dois nós separados por hífen'); return; }
      var chave = p.slice().sort().join('|');
      if (pares[chave]) erros.push('Trecho "' + t.nome + '" repetido');
      pares[chave] = true;
      (adj[p[0]] = adj[p[0]] || []).push({ n: p[1], t: t });
      (adj[p[1]] = adj[p[1]] || []).push({ n: p[0], t: t });
    });
    var pai = {}, filaA = [raiz], nArestas = 0; vistos[raiz] = true;
    while (filaA.length) {
      var u = filaA.shift();
      (adj[u] || []).forEach(function (e) {
        if (!vistos[e.n]) { vistos[e.n] = true; pai[e.n] = { de: u, t: e.t }; filaA.push(e.n); }
      });
    }
    var nos = Object.keys(adj);
    nos.forEach(function (n) { if (!vistos[n]) erros.push('Nó solto, sem caminho até ' + raiz + ': ' + n); });
    if (tr.length > Object.keys(vistos).length - 1 && nos.every(function (n) { return vistos[n]; })) erros.push('Laço na rede (malha fechada fora do escopo da v1, IT 22 4.8.13)');
    function caminho(no) {   // arestas da raiz até o nó, na ordem de montante para jusante
      var c = [], n = no;
      while (n !== raiz) { var p = pai[n]; if (!p) return null; c.unshift({ t: p.t, de: p.de, para: n }); n = p.de; }
      return c;
    }
    return { erros: erros, caminho: caminho, tr: tr, nos: nos };
  }
  var hf = function (e, Q) { return J(Q, e.t.dint, e.t.C) * e.t.Lt; };
  function hfSoma(arestas, Q) { var s = 0; arestas.forEach(function (e) { s += hf(e, Q); }); return s; }
  function Ltsoma(arestas) { var s = 0; arestas.forEach(function (e) { s += e.t.Lt; }); return s; }

  // ---------------------------------------------------------------- classificação e reserva
  function faixa(area) { return area <= 2500 ? 0 : area <= 5000 ? 1 : area <= 10000 ? 2 : area <= 20000 ? 3 : area <= 50000 ? 4 : 5; }
  function classifica(D, norma, coluna, area) {
    var n = D.normas[norma], f = faixa(area), r = n.rti[coluna];
    if (!r) return null;
    var tipo = r.tipo;
    if (tipo === '4 ou 5') tipo = f <= 1 ? '4-40' : '5';
    return { tipo: tipo, rti: r.rti[f], faixa: n.faixas[f] };
  }


  /** 2.6.0: reserva pedida para o tipo adotado. A coluna da tabela de reserva é a do tipo adotado quando a divisão admite essa coluna
   *  ou quando o tipo é superior ao da tabela (vale a maior reserva); tipo inferior não admitido fica com a reserva da tabela (e a V30 reprova).
   *  sist = {coluna, area, divisao, carga}. Devolve {tipo, rti, faixa, admitido, inferior} ou nulo. */
  function colunaDoTipo(D, normaId, tipoId) {
    var n = D.normas[normaId], t4 = /^4/.test(tipoId);
    return Object.keys(n.rti).filter(function (c) { var t = n.rti[c].tipo; return t === tipoId || (t4 && /^4/.test(t)) || (tipoId === '5' && t === '4 ou 5'); })[0] || null;
  }
  function reservaPedida(D, normaId, sist, tipoId) {
    if (!sist || !sist.coluna || !(sist.area > 0)) return null;
    var cls = classifica(D, normaId, sist.coluna, sist.area); if (!cls) return null;
    var ids = D.normas[normaId].tipos.map(function (t) { return t.id; }), tb = cls.tipo === '4' ? '4-40' : cls.tipo;
    if (!tipoId) return { tipo: cls.tipo, rti: cls.rti, faixa: cls.faixa, coluna: sist.coluna, admitido: true, inferior: false };
    var iAd = ids.indexOf(tipoId === '4' ? '4-40' : tipoId), iTb = ids.indexOf(tb), colAd = colunaDoTipo(D, normaId, tipoId);
    var g = sist.divisao ? sugereColuna(D, normaId, sist.divisao, sist.carga) : null, adm = !!(colAd && g && g.colunas && g.colunas.indexOf(colAd) >= 0);
    var mesmo = iAd === iTb || (/^4/.test(tipoId) && /^4/.test(tb));
    var r = { tipo: cls.tipo, rti: cls.rti, faixa: cls.faixa, coluna: sist.coluna, admitido: mesmo || adm, inferior: !mesmo && iAd < iTb };
    if (!mesmo && colAd && (adm || iAd > iTb)) { var c2 = classifica(D, normaId, colAd, sist.area); if (c2 && (adm || c2.rti > cls.rti)) { r.tipo = tipoId; r.rti = c2.rti; r.coluna = colAd; } }
    return r;
  }

  /** Classificação assistida: sugere a coluna da tabela de reserva pela divisão e pela carga de incêndio (MJ/m²).
   *  Só sugere; quem confirma é o usuário. Regras em D.ocupacao (dados.json). */
  function sugereColuna(D, norma, div, carga) {
    var O = D.ocupacao; if (!O) return null;
    var rs = O.regras[norma].filter(function (r) { return r.div === div; });
    var fora = O.fora[norma], fonte = O.fonte[norma];
    if (!rs.length) return { colunas: null, precisaCarga: false, msg: fora[div] || fora['*'], fonte: fonte };
    var precisa = rs.some(function (r) { return r.cmin !== null || r.cmax !== null; });
    var temCarga = typeof carga === 'number' && !isNaN(carga);
    if (precisa && !temCarga) return { colunas: null, precisaCarga: true, msg: 'Informe a carga de incêndio (IT 14): a coluna de ' + div + ' depende dela.', fonte: fonte };
    var r = rs.filter(function (r) { return (r.cmin === null || carga > r.cmin) && (r.cmax === null || carga <= r.cmax); })[0];
    if (!r) return { colunas: null, precisaCarga: precisa, msg: fora[div] || fora['*'], fonte: fonte };
    var ft = r.cmin === null && r.cmax === null ? 'qualquer carga' : (r.cmin === null ? 'até ' + r.cmax : (r.cmax === null ? 'acima de ' + r.cmin : 'acima de ' + r.cmin + ' até ' + r.cmax)) + (r.cmin === null && r.cmax === null ? '' : ' MJ/m²');
    return { colunas: r.colunas, precisaCarga: precisa, faixa: ft, msg: '', fonte: fonte };
  }

  // ---------------------------------------------------------------- jatos (caminhos A e B)
  /** Perda unitária (m/m) pelo catálogo da mangueira. 40 mm e 65 mm: Kidde Sintex N tipo 2;
   *  outras: cadastro do usuário em D.mangueirasUsuario[dn] = {Q: [...], J: [...]} (L/min e m/m, em ordem crescente de vazão). */
  function mangueiraJ(D, dn, Q) {
    var xs, ys, usr = D.mangueirasUsuario && D.mangueirasUsuario[String(dn)];
    if (usr) { xs = usr.Q; ys = usr.J; }
    else if (dn === 40) { xs = D.mangueira.J_gabarito_m_m.Q; ys = D.mangueira.J_gabarito_m_m.J; }
    else if (dn === 65 && D.mangueira65) { xs = D.mangueira65.J_m_m.Q; ys = D.mangueira65.J_m_m.J; }
    else throw new Error('Mangueira de ' + dn + ' mm sem curva cadastrada (cadastre a curva do catálogo na tela Hidrantes)');
    if (Q <= xs[0]) return ys[0] * Math.pow(Q / xs[0], 2);
    var i = 0, n = xs.length;
    while (i < n - 2 && Q > xs[i + 1]) i++;
    var b = Math.log(ys[i + 1] / ys[i]) / Math.log(xs[i + 1] / xs[i]);
    return ys[i] * Math.pow(Q / xs[i], b);
  }
  function esguichoP(pts, Q) {      // pts = [{Q,P,alcance}]; P na entrada do esguicho para a vazão Q
    var s = pts.slice().sort(function (a, b) { return a.Q - b.Q; });
    if (Q < s[0].Q) return Math.pow(Q / (s[0].Q / Math.sqrt(s[0].P)), 2);
    return interp(s.map(function (p) { return p.Q; }), s.map(function (p) { return p.P; }), Q);
  }
  /** Dados do esguicho e da mangueira (2.2). Valores oficiais: Tabela 2 da IT 22 (SP) ou Tabela 1 da NPT 022 (PR), pelo tipo.
   *  proj.lancamento = { Q, P, mangueiraDN, Lmang, alcance, Pentrada, fontes: {campo: texto} } traz só o que o usuário alterou; sem a chave, vale o oficial
   *  e o cálculo é o mesmo das versões anteriores. Pentrada (pressão de projeto na entrada do esguicho) só existe no critério do Paraná. */
  var CAMPOS_LANC = ['Q', 'P', 'mangueiraDN', 'Lmang', 'alcance'];
  function positivo(v) { return typeof v === 'number' && isFinite(v) && v > 0; }
  function dadosLancamento(proj, norma, tipo) {
    var l = proj.lancamento || {}, f = l.fontes || {}, of = { Q: tipo.Q, P: tipo.P, mangueiraDN: tipo.mangueira, Lmang: 30, alcance: norma.alcance };
    var r = { oficial: of, alterados: [], onde: norma.pressaoNo === 'esguicho' ? 'ponta do esguicho' : 'válvula do hidrante' };
    CAMPOS_LANC.forEach(function (k) {
      r[k] = positivo(l[k]) ? l[k] : of[k];
      if (Math.abs(r[k] - of[k]) > 1e-9) r.alterados.push({ campo: k, valor: r[k], oficial: of[k], fonte: String(f[k] || '').trim() });
    });
    if (norma.pressaoNo === 'esguicho' && positivo(l.Pentrada)) { r.Pentrada = l.Pentrada; r.fontePentrada = String(f.Pentrada || '').trim(); }
    return r;
  }
  /** Critério do Paraná (NPT 022, Tabela 1, notas 3 e 4; 5.7.1; 5.7.8 e 5.7.8.1): a vazão da Tabela 1 sai do esguicho e a
   *  pressão mínima vale na ponta (expedição). A pressão de entrada mínima é a maior entre a que a curva do fabricante pede para a vazão e a que deixa a pressão
   *  mínima na ponta (razão ponta/entrada da base, quando há leitura registrada; sem ela, a pressão na ponta não passa da de entrada, e a conferência fica com o projetista).
   *  O ponto de projeto é a pressão de entrada informada (proj.lancamento.Pentrada) ou, sem ela, a mínima. O alcance não move o ponto: é só conferido. */
  function pontoParana(D, h, lanc) {
    var cat = D.esguichos.filter(function (e) { return e.modelo === h.esguicho; });
    if (!cat.length) throw new Error('Hidrante ' + h.id + ': esguicho "' + h.esguicho + '" fora do catálogo');
    var ep = (D.esguichoPonta || {})[h.esguicho] || null, pts = cat.concat(ep && ep.pontos ? ep.pontos : []);
    var razao = ep && positivo(ep.razao) ? ep.razao : null;
    var PeQ = esguichoP(pts, lanc.Q), PeP = razao ? lanc.P / razao : lanc.P, PeMin = Math.max(PeQ, PeP);
    var Pe = lanc.Pentrada !== undefined ? lanc.Pentrada : PeMin;
    var Q = bisseca(function (q) { return esguichoP(pts, q) - Pe; }, 0, 4000, 100);
    var ps = cat.map(function (p) { return p.P; }), tabMin = Math.min.apply(null, ps), tabMax = Math.max.apply(null, ps), naTabela = Pe >= tabMin - 1e-9 && Pe <= tabMax + 1e-9, alc = null;
    if (naTabela) { var s = cat.slice().sort(function (a, b) { return a.P - b.P; }); alc = interp(s.map(function (p) { return p.P; }), s.map(function (p) { return p.alcance; }), Pe); }
    return { pts: pts, razao: razao, PeQ: PeQ, PeP: PeP, PeMin: PeMin, P: Pe, Q: Q, ponta: razao ? razao * Pe : null, informado: lanc.Pentrada !== undefined, abaixo: Pe < PeMin - 1e-6,
      tabMin: tabMin, tabMax: tabMax, naTabela: naTabela, alcance: alc, fonte: ep ? ep.fonte : '' };
  }
  /** 2.6.0: esguicho padrão pelo diâmetro do tipo, enquanto o usuário não escolhe outro. */
  var ESG_PADRAO = { 25: 'MR CAC 1" ER longo', 40: 'MR CAC 1 1/2" ER longo', 65: 'MR CAC 2 1/2" ER longo' };
  function esguichoPadrao(dn) { return ESG_PADRAO[dn] || ESG_PADRAO[40]; }
  /** 2.6.0: o que chega ao esguicho com a pressão Pv na válvula (SP, só leitura). Vazão em que o esguicho do catálogo mais a perda na mangueira
   *  pedem a pressão da válvula; pressão na entrada do esguicho; alcance lido no catálogo (interpolado pela pressão, só dentro da tabela de ensaio). */
  function ateEsguicho(D, modelo, dn, L, Pv) {
    var cat = D.esguichos.filter(function (e) { return e.modelo === modelo; });
    if (!cat.length || !(Pv > 0)) return null;
    var Q = bisseca(function (q) { return esguichoP(cat, q) + mangueiraJ(D, dn, q) * L - Pv; }, 0, 4000, 100), Pe = esguichoP(cat, Q);
    var s = cat.slice().sort(function (a, b) { return a.P - b.P; }), tabMin = s[0].P, tabMax = s[s.length - 1].P, naTabela = Pe >= tabMin - 1e-9 && Pe <= tabMax + 1e-9;
    return { Pv: Pv, Q: Q, Pe: Pe, perda: Pv - Pe, alcance: naTabela ? interp(s.map(function (p) { return p.P; }), s.map(function (p) { return p.alcance; }), Pe) : null, naTabela: naTabela, tabMin: tabMin, tabMax: tabMax };
  }
  function montaJato(D, proj, norma, h, tipo, idx, lanc) {
    lanc = lanc || dadosLancamento(proj, norma, tipo);
    var kv = lanc.Q / Math.sqrt(lanc.P), j = { id: h.id + (tipo.exp > 1 ? '.' + (idx + 1) : ''), hid: h, no: h.no, caminho: norma.pressaoNo === 'esguicho' ? 'B' : 'A', tipo: tipo };
    /* 2.6.0: em SP o hidrante é sempre dimensionado pela Tabela 2 na válvula (caminho A), mesmo que o arquivo
     * traga o caminho B; o que chega ao esguicho só é mostrado (ateEsguicho). No PR a vazão e a pressão valem no esguicho (caminho B). */
    if (j.caminho === 'A') {
      j.Qmin = lanc.Q; j.Pmin = lanc.P; j.Kv = kv;
      j.Pv = function (Q) { return Math.pow(Q / kv, 2); };
      j.invPv = function (P) { return kv * Math.sqrt(Math.max(P, 0)); };
    } else {
      var pp = pontoParana(D, h, lanc), dnp = h.mangueiraDN || lanc.mangueiraDN, Lp = h.Lmang || lanc.Lmang;
      j.Qmin = pp.Q; j.Pmin = pp.P; j.ponto = pp; j.esguicho = h.esguicho; j.parana = true; j.Lmang = Lp; j.mangueiraDN = dnp;
      j.Pe = function (Q) { return esguichoP(pp.pts, Q); };
      j.Pv = function (Q) { return esguichoP(pp.pts, Q) + mangueiraJ(D, dnp, Q) * Lp; };
      j.invPv = function (P) { return bisseca(function (Q) { return j.Pv(Q) - P; }, 0, 4000, 80); };
      j.PvMin = j.Pv(j.Qmin);
    }
    return j;
  }

  // ---------------------------------------------------------------- avaliação de um par de jatos
  function avaliaPar(ctx, a, b, exato) {
    var proj = ctx.proj, G = ctx.grafo, pa = G.caminho(a.no), pb = G.caminho(b.no);
    var k = 0; while (k < pa.length && k < pb.length && pa[k].t === pb[k].t) k++;
    var tronco = pa.slice(0, k), ra = pa.slice(k), rb = pb.slice(k);
    var A = k > 0 ? tronco[k - 1].para : ctx.raiz;
    var zA = ctx.z(A), dza = ctx.z(a.no) - zA, dzb = ctx.z(b.no) - zA;
    var PAa = (a.PvMin !== undefined ? a.PvMin : a.Pv(a.Qmin)) + dza + hfSoma(ra, a.Qmin);
    var PAb = (b.PvMin !== undefined ? b.PvMin : b.Pv(b.Qmin)) + dzb + hfSoma(rb, b.Qmin);
    var crit = PAa >= PAb ? a : b, out = crit === a ? b : a, rOut = crit === a ? rb : ra, dzOut = crit === a ? dzb : dza, rCrit = crit === a ? ra : rb, dzCrit = crit === a ? dza : dzb;
    var PA = Math.max(PAa, PAb), PAout = Math.min(PAa, PAb);
    var Qo = out.Qmin;
    if (out.nulo) Qo = 0;   // hidrante único de expedição simples (SP): um jato só
    else if (exato) Qo = bisseca(function (Q) { return out.Pv(Q) + dzOut + hfSoma(rOut, Q) - PA; }, 0, 4000, 100);
    else for (var i = 0; i < ITER; i++) Qo = out.invPv(PA - dzOut - hfSoma(rOut, Qo));
    var Qc = crit.Qmin, Qt = Qc + Qo;
    var hfTr = hfSoma(tronco, Qt), r = { a: a, b: b, A: A, tronco: tronco, crit: crit, out: out, PA: PA, PAout: PAout, dif: PA - PAout, Qcrit: Qc, Qout: Qo, Qt: Qt, Qth: Qt * CV, hfTr: hfTr,
      Pvout: PA - dzOut - hfSoma(rOut, Qo), Pvcrit: PA - dzCrit - hfSoma(rCrit, Qc), ramalOut: rOut, ramalCrit: rCrit, dzOut: dzOut, dzCrit: dzCrit };
    if (out.nulo) { r.unico = true; r.dif = 0; r.Pvout = 0; r.PAout = PA; }
    if (ctx.modo === 'bomba') {
      r.Pd = PA + hfTr + (zA - ctx.z('BI'));
      r.hfSuc = hfSoma(ctx.suc, Qt);
      r.AMT = r.Pd + (ctx.z('BI') - ctx.zX) + r.hfSuc;
    } else {   // reforço ou gravidade: a RI é a raiz; Pg = pressão no ponto A só por gravidade
      r.Pg = pressaoGravidade(ctx.z('RI'), ctx.hProp, zA, hfTr);
      r.AMT = PA - r.Pg;        // reforço: altura da bomba; gravidade: valor negativo = folga
    }
    return r;
  }
  /** Hidrante único de expedição simples em SP: a IT 22 (4.8.3) define os dois jatos para "sistemas com mais de um hidrante simples".
   *  Com um só hidrante simples existe um jato (leitura da ferramenta). No PR vale a V23 (duas expedições). */
  /** 2.6.0: pressão por gravidade em A. zRI é a cota do nó RI, onde a água entra na rede; hProp é a carga própria do reservatório
   *  (taça de coluna seca e torre: desnível da descida interna até a saída na base, sem a perda do tubo interno). Pg = (zRI + hProp - zA) - perdas RI-A. */
  function pressaoGravidade(zRI, hProp, zA, perdas) { return (zRI + (hProp || 0) - zA) - perdas; }
  /** 2.6.0: estado da sucção (IT 22 e NPT 022, C.1.12). g = cota do eixo da bomba menos o nível X; lim = menor entre 2 m e 1/3 da altura efetiva da reserva.
   *  Tomada superior é sempre não afogada (C.2.6). Afogada e positiva por tolerância: 3 m/s; negativa: 2 m/s (4.8.11; 5.7.9). NPSH obrigatório na negativa
   *  e, no PR, em qualquer estado (NPT 022, 5.7.13). É a mesma regra de FireValida.succaoEstado, conferida caso a caso. */
  function estadoSuccao(g, lim, saida, PR) {
    var est = saida === 'cima' ? 'negativa' : g <= 0 ? 'afogada' : g <= lim + 1e-9 ? 'positiva' : 'negativa';
    return { g: g, lim: lim, estado: est, vmax: est === 'negativa' ? 2 : 3, npshObrigatorio: est === 'negativa' || !!PR };
  }
  /** Sucção do projeto pelas cotas do motor: o nível de onde se conta a reserva vem do cálculo do Abastecimento (fonte.nivelX.nivelReserva: o maior
   *  entre X e o piso); sem ele (X informado à mão ou arquivo antigo), do próprio X. O topo é o da reserva (tomada de consumo) ou o nível normal. */
  function succaoProjeto(ctx) {
    var f = ctx.proj.fonte || {}, g = ctx.z('BI') - ctx.zX, nr = f.nivelX && typeof f.nivelX.nivelReserva === 'number' ? f.nivelX.nivelReserva : ctx.zX;
    var topo = typeof f.topoReserva === 'number' ? f.topoReserva : f.zCheio, lim = typeof topo === 'number' && topo > nr ? Math.min(2, (topo - nr) / 3) : 0;
    return estadoSuccao(g, lim, f.saida, ctx.norma.id === 'PR');
  }
  function jatoUnico(ctx) { return ctx.norma.id === 'SP' && ctx.tipo.exp === 1 && ctx.proj.hidrantes.length === 1 && ctx.jatos.length === 1; }
  function jatoNulo(j) { return { id: j.id, hid: j.hid, no: j.no, caminho: j.caminho, tipo: j.tipo, nulo: true, Qmin: 0, Pmin: 0, Kv: j.Kv, Pv: function () { return 0; }, invPv: function () { return 0; } }; }
  function nomePar(p) { return p.b.nulo ? p.a.id + ' (um jato)' : p.a.id + ' + ' + p.b.id; }
  /** 2.5.0: os dois hidrantes mais desfavoráveis são os que, sozinhos, pedem a maior altura
   *  na bomba para receber a vazão e a pressão mínimas, isto é, os de menor pressão na válvula (com o reservatório embaixo, os mais altos).
   *  Até a 2.4.4 valia o par de maior AMT, que junta o crítico com o hidrante mais favorável, porque este abre mais vazão: com a rede
   *  inteira de um prédio alto, o par virava o hidrante do topo com o do térreo. O par de maior AMT continua listado (e pode ser forçado). */
  function parPorHidrante(ctx, pares) {
    var js = ctx.jatos; if (js.length < 3) return null;
    var so = js.map(function (j, i) { return { j: j, i: i, AMT: avaliaPar(ctx, j, jatoNulo(j)).AMT }; }).sort(function (x, y) { return (y.AMT - x.AMT) || (x.i - y.i); });
    var a = so[0].j, b = so[1].j;
    return pares.filter(function (p) { return (p.a === a && p.b === b) || (p.a === b && p.b === a); })[0] || null;
  }
  function listaPares(ctx) {
    var js = ctx.jatos, res = [];
    for (var i = 0; i < js.length; i++) for (var j = i + 1; j < js.length; j++) res.push(avaliaPar(ctx, js[i], js[j]));
    if (js.length === 1) res.push(jatoUnico(ctx) ? avaliaPar(ctx, js[0], jatoNulo(js[0])) : avaliaPar(ctx, js[0], js[0]));
    return res;
  }

  // ---------------------------------------------------------------- ponto de trabalho (curva do sistema x curva da bomba)
  function pontoTrabalho(ctx, par, bomba) {
    var a = par.a, b = par.b, ramA = par.crit === a ? par.ramalCrit : par.ramalOut, ramB = par.crit === a ? par.ramalOut : par.ramalCrit;
    var dzA = par.crit === a ? par.dzCrit : par.dzOut, dzB = par.crit === a ? par.dzOut : par.dzCrit;
    function Qjato(j, ram, dz, PA) {
      if (j.nulo || PA - dz <= 0) return 0;
      return bisseca(function (Q) { return j.Pv(Q) + dz + hfSoma(ram, Q) - PA; }, 0, 6000, 100);
    }
    function sistema(PA) {
      var Qt = Qjato(a, ramA, dzA, PA) + Qjato(b, ramB, dzB, PA);
      var amt = ctx.modo === 'bomba' ? PA + hfSoma(par.tronco, Qt) + (ctx.z(par.A) - ctx.z('BI')) + (ctx.z('BI') - ctx.zX) + hfSoma(ctx.suc, Qt)
        : PA - pressaoGravidade(ctx.z('RI'), ctx.hProp, ctx.z(par.A), hfSoma(par.tronco, Qt));
      return { Qt: Qt, AMT: amt };
    }
    var g = function (PA) { var s = sistema(PA); return alturaBomba(bomba.pts, s.Qt * CV).H - s.AMT; };
    var lo = par.PA, hi = lo;
    if (g(lo) <= 0) { hi = lo; lo = lo - 40; } else { while (g(hi) > 0 && hi < lo + 200) hi += 0.25; }
    if (g(lo) * g(hi) > 0) return { semCruzamento: true };
    var PAw = bisseca(g, lo, hi, 100), s = sistema(PAw), hb = alturaBomba(bomba.pts, s.Qt * CV);
    return { PA: PAw, Qt: s.Qt, Qth: s.Qt * CV, H: hb.H, AMT: s.AMT, extrapolado: hb.extrapolado };
  }

  /** Curva do sistema do par adotado (AMT x Qt), parametrizada pela pressão no ponto A: lista de {PA, Qth (m³/h), AMT}. Só leitura; não altera o cálculo. */
  function curvaSistema(ctx, par, PAs) {
    var a = par.a, b = par.b, ramA = par.crit === a ? par.ramalCrit : par.ramalOut, ramB = par.crit === a ? par.ramalOut : par.ramalCrit;
    var dzA = par.crit === a ? par.dzCrit : par.dzOut, dzB = par.crit === a ? par.dzOut : par.dzCrit;
    function Qj(j, ram, dz, PA) { if (j.nulo || PA - dz <= 0) return 0; return bisseca(function (Q) { return j.Pv(Q) + dz + hfSoma(ram, Q) - PA; }, 0, 6000, 100); }
    return PAs.map(function (PA) {
      var Qt = Qj(a, ramA, dzA, PA) + Qj(b, ramB, dzB, PA);
      var amt = ctx.modo === 'bomba' ? PA + hfSoma(par.tronco, Qt) + (ctx.z(par.A) - ctx.z('BI')) + (ctx.z('BI') - ctx.zX) + hfSoma(ctx.suc, Qt)
        : PA - pressaoGravidade(ctx.z('RI'), ctx.hProp, ctx.z(par.A), hfSoma(par.tronco, Qt));
      return { PA: PA, Qth: Qt * CV, AMT: amt };
    });
  }

  // ---------------------------------------------------------------- ramal de retorno para testes (PR, NPT 022, 5.10.6.3 e 5.7.2.1)
  function temRetorno(proj) { return !!(proj.retorno && proj.retorno.trechos && proj.retorno.trechos.length); }
  /** Encontro da curva da bomba com a curva do ramal de retorno: H da bomba(Q) = (cota da descarga menos a cota do nível X) + perda na sucção(Q) + perda no ramal(Q).
   *  Perdas por Hazen-Williams, com os comprimentos equivalentes da tabela do projeto. proj.retorno = { zDescarga, trechos: [{dn, L, pecas}] }.
   *  Com as peças abertas a vazão costuma passar muito da nominal: quem ajusta o ensaio é o registro de regulagem. A função devolve a vazão com tudo aberto
   *  e a perda que o registro precisa dar para 75%, 100% e 125% da nominal. Só reprova quando o ramal não chega a 75% nem todo aberto
   * Função nova; não altera nenhum número existente. */
  function retornoTeste(ctx, bomba, Qnom) {
    var proj = ctx.proj, ret = proj.retorno, er = [], D = ctx.D;
    var tr = ret.trechos.map(function (t, i) { return prepTrecho(D, proj, { nome: t.nome || 'retorno ' + (i + 1), dn: t.dn, L: t.L, pecas: t.pecas || {}, C: t.C, tubo: t.tubo }, er); });
    var dz = ret.zDescarga - ctx.zX;
    function hfRet(Q) { var s = 0; tr.forEach(function (t) { s += J(Q, t.dint, t.C) * t.Lt; }); return s; }
    function Hs(Q) { return dz + hfSoma(ctx.suc, Q) + hfRet(Q); }
    function g(Q) { return alturaBomba(bomba.pts, Q * CV).H - Hs(Q); }
    var r = { erros: er, min: 75, max: 125, dz: dz, Qnom: Qnom };
    if (er.length) return r;
    var hi = 50; while (g(hi) > 0 && hi < 50000) hi *= 2;
    if (g(0) <= 0 || g(hi) > 0) { r.semCruzamento = true; return r; }
    var Q = bisseca(g, 0, hi, 100), hb = alturaBomba(bomba.pts, Q * CV);
    r.Q = Q; r.Qh = Q * CV; r.H = hb.H; r.extrapolado = hb.extrapolado; r.hfSuc = hfSoma(ctx.suc, Q); r.hfRet = hfRet(Q); r.pct = 100 * Q / Qnom;
    // regulagem: perda que o registro precisa dar para passar 75%, 100% e 125% da vazão nominal (negativa = o ramal não alcança essa vazão nem todo aberto)
    function reg(f) { return alturaBomba(bomba.pts, Qnom * f * CV).H - Hs(Qnom * f); }
    r.hReg75 = reg(0.75); r.hReg100 = reg(1); r.hReg125 = reg(1.25); r.Hnom = alturaBomba(bomba.pts, Qnom * CV).H; r.extrapoladoNom = alturaBomba(bomba.pts, Qnom * CV).extrapolado;
    r.hReg = Math.max(0, r.hReg100);
    r.ok = r.pct >= r.min - 1e-9;   // só reprova quando nem todo aberto o ramal passa 75% da nominal
    return r;
  }

  // ---------------------------------------------------------------- cálculo completo
  /** Pressão em cada hidrante do projeto com os dois jatos do par abertos (dinâmica) e com a bomba fechada (estática).
   *  A dinâmica parte da carga na descarga da bomba (no reforço, da cota da reserva mais a altura do reforço; na gravidade, da cota da reserva)
   *  e desce pelo caminho de cada hidrante com as vazões do par (zero fora do par). Só leitura. */
  /** 2.5.3: cascata de pressões do hidrante mais desfavorável até a bomba (sem bomba, até o reservatório).
   *  Só lê o par já calculado: nenhum número do cálculo muda. Lista de barras, de cima para baixo:
   *  {k: 'sub', r, v, acc} subtotal (pressão acumulada) e {k: 'd', r, v, acc} parcela (v > 0 soma, v < 0 subtrai), com acc = soma até ali.
   *  agrupada = true junta ramal, tronco e sucção numa barra cada, como no manual; senão, trecho a trecho.
   *  Devolve {itens, fecha (soma final), AMT (do motor), eixo {a, b, passo, o}} (o = início das barras de subtotal). */
  function cascata(R, agrupada) {
    var ctx = R.ctx, p = R.par, c = p.crit, L = [], acc = 0, bomba = ctx.modo === 'bomba', raiz = ctx.raiz;
    var f2 = function (x) { return Math.abs(x).toFixed(2).replace('.', ','); }, fz = function (x) { var s = Math.abs(x).toFixed(3); return (/0$/.test(s) ? Math.abs(x).toFixed(2) : s).replace('.', ','); }, z = function (n) { return ctx.z(n); };
    function sub(r, v) { acc = v; L.push({ k: 'sub', r: r, v: v, acc: v }); }
    function d(r, v) { if (!(Math.abs(v) >= 5e-4)) return; acc += v; L.push({ k: 'd', r: r, v: v, acc: acc }); }
    function trechos(arestas, Q, nome) {   // de jusante para montante: perda do trecho e o desnível dele (sobe soma, desce subtrai)
      arestas.slice().reverse().forEach(function (e) {
        var tx = e.de + ' → ' + e.para, dz = z(e.para) - z(e.de);
        d('perda no trecho ' + tx + (nome ? ' (' + nome + ')' : ''), hf(e, Q));
        d('o trecho ' + tx + (dz > 0 ? ' sobe ' : ' desce ') + fz(dz) + ' m', dz);
      });
    }
    var Qc = p.Qcrit, Qt = p.Qt;
    if (typeof c.Pe === 'function') {   // pressão na ponta do esguicho (PR, e o caminho B em SP): a mangueira soma antes da válvula
      var pe = c.Pe(Qc); sub('pressão no esguicho de ' + c.id, pe);
      d('perda na mangueira de ' + c.id + (c.Lmang ? ' (' + String(c.Lmang).replace('.', ',') + ' m)' : ''), p.Pvcrit - pe);
    }
    sub('pressão mínima na válvula de ' + c.id, p.Pvcrit);
    if (agrupada) {
      d('desnível de ' + p.A + ' até a válvula (' + fz(p.dzCrit) + ' m)', p.dzCrit);
      d('perda no ramal ' + p.A + ' → ' + c.id, hfSoma(p.ramalCrit, Qc));
    } else trechos(p.ramalCrit, Qc, '');
    if (p.tronco.length) {
      sub('pressão no ponto ' + p.A + (p.unico ? '' : ', onde o par se divide'), p.PA);
      if (agrupada) {
        d('perda no tronco ' + raiz + ' → ' + p.A, p.hfTr);
        var dzT = z(p.A) - z(raiz); d((bomba ? 'desnível do eixo da bomba até ' : 'desnível do reservatório até ') + p.A + ' (' + (dzT > 0 ? 'sobe ' : 'desce ') + fz(dzT) + ' m)', dzT);
      } else trechos(p.tronco, Qt, 'vazão dos dois jatos');
    }
    if (bomba) {
      sub('pressão na saída da bomba', p.Pd);
      var dzS = z('BI') - ctx.zX;
      d(dzS > 0 ? 'eixo da bomba ' + fz(dzS) + ' m acima do nível X' : 'água ' + fz(dzS) + ' m acima do eixo da bomba (nível X)', dzS);
      if (agrupada) d('perda na sucção', p.hfSuc);
      else ctx.suc.slice().reverse().forEach(function (e) { d('perda no trecho ' + e.para + ' → ' + e.de + ' (sucção)', hf(e, Qt)); });
      sub('altura manométrica total', p.AMT);
    } else {
      d('carga própria do reservatório (desce ' + fz(ctx.hProp) + ' m por dentro até a saída na base)', -ctx.hProp);   // 2.6.0: zero fora da taça seca e da torre
      if (ctx.modo === 'reforco') sub('altura manométrica da bomba de reforço', p.AMT);
      else sub(p.AMT <= 0 ? 'folga por gravidade: sobram ' + f2(p.AMT) + ' mca no reservatório' : 'faltam ' + f2(p.AMT) + ' mca por gravidade', p.AMT);
    }
    // eixo: subtotais cheios desde o início do eixo; com valor negativo (gravidade), desde o zero
    var vs = []; L.forEach(function (x) { vs.push(x.acc); if (x.k === 'd') vs.push(x.acc - x.v); });
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), base = lo > 0 ? Math.max(0, lo - 0.25 * (hi - lo)) : lo, topo = Math.max(hi, 0);
    var bruto = (topo - base) / 5 || 1, ex = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10)), passo = [1, 2, 2.5, 5, 10].map(function (m) { return m * ex; }).filter(function (s) { return s >= bruto - 1e-12; })[0];
    var a = Math.floor(base / passo + 1e-9) * passo, b = Math.ceil(topo / passo - 1e-9) * passo; if (b <= a) b = a + passo;
    return { itens: L, fecha: acc, AMT: p.AMT, eixo: { a: a, b: b, passo: passo, o: lo > 0 ? a : 0 } };
  }
  function pressoesHidrantes(ctx, par) {
    var P = ctx.proj, Q = {}, lista = [];
    par.tronco.forEach(function (e) { Q[e.t.nome] = par.Qt; });
    par.ramalCrit.forEach(function (e) { Q[e.t.nome] = par.Qcrit; });
    par.ramalOut.forEach(function (e) { Q[e.t.nome] = par.Qout; });
    var carga = ctx.modo === 'bomba' ? par.Pd + ctx.z('BI') : ctx.modo === 'reforco' ? ctx.z('RI') + ctx.hProp + par.AMT : ctx.z('RI') + ctx.hProp;
    var b = P.bomba, zc = P.fonte && P.fonte.zCheio;
    P.hidrantes.forEach(function (h) {
      var cam = ctx.grafo.caminho(h.no); if (!cam) return;
      var perda = 0; cam.forEach(function (e) { perda += J(Q[e.t.nome] || 0, e.t.dint, e.t.C) * e.t.Lt; });
      var zh = ctx.z(h.no);
      var o = { id: h.id, no: h.no, z: zh, din: carga - perda - zh, est: zc === undefined || (ctx.modo !== 'gravidade' && !b) ? null : ((b && ctx.modo !== 'gravidade' ? b.shutoff : 0) + (zc - zh)), semBomba: ctx.modo !== 'gravidade' && !b, noPar: par.a.hid === h || par.b.hid === h };
      var rd = redutoraDe(h);
      if (rd) { o.redutora = rd.P; o.dinSem = o.din; o.estSem = o.est; o.din = Math.min(o.din, rd.P); if (o.est !== null) o.est = Math.min(o.est, rd.P); }
      lista.push(o);
    });
    return lista;
  }
  /** 2.6.0: pressão estática e dinâmica em qualquer nó da rede, para o cartão do desenho. É a conta de pressoesHidrantes (carga na saída da fonte
   *  menos a perda do caminho até o nó e a cota do nó), sem redutora e sem mudar nenhum número do cálculo. nomes = nós a ler; nó fora da árvore de cálculo (como RI) não entra.
   *  Devolve { nó: { z, din, est } }, com est = null quando falta a cota do nível cheio. */
  function pressoesNos(ctx, par, nomes) {
    var P = ctx.proj, Q = {}, r = {};
    par.tronco.forEach(function (e) { Q[e.t.nome] = par.Qt; });
    par.ramalCrit.forEach(function (e) { Q[e.t.nome] = par.Qcrit; });
    par.ramalOut.forEach(function (e) { Q[e.t.nome] = par.Qout; });
    var carga = ctx.modo === 'bomba' ? par.Pd + ctx.z('BI') : ctx.modo === 'reforco' ? ctx.z('RI') + ctx.hProp + par.AMT : ctx.z('RI') + ctx.hProp;
    var b = P.bomba, zc = P.fonte && P.fonte.zCheio;
    nomes.forEach(function (n) {
      var cam = ctx.grafo.caminho(n); if (!cam) return;
      var perda = 0; cam.forEach(function (e) { perda += J(Q[e.t.nome] || 0, e.t.dint, e.t.C) * e.t.Lt; });
      var z = ctx.z(n); r[n] = { z: z, din: carga - perda - z, est: zc === undefined || (ctx.modo !== 'gravidade' && !b) ? null : ((b && ctx.modo !== 'gravidade' ? b.shutoff : 0) + (zc - z)), semBomba: ctx.modo !== 'gravidade' && !b };
    });
    return r;
  }
  // ---------------------------------------------------------------- válvula redutora de pressão (função nova)
  // O ponto (hidrante ou cota sem hidrante no cálculo) leva { redutora: { P: regulagem em mca, fonte: texto } }.
  // A regulagem substitui a pressão do ponto na estática (V05) e na dinâmica máxima (V04) quando é menor que a de montante.
  // Não entra na hipótese de cálculo: vazão, par e altura manométrica não mudam.
  function redutoraDe(o) { return o && o.redutora && typeof o.redutora.P === 'number' && isFinite(o.redutora.P) ? o.redutora : null; }
  function verificaRedutoras(ctx, par, shutoff) {
    var proj = ctx.proj, zc = proj.fonte && proj.fonte.zCheio, lista = [], pior = 'OK', ordem = { OK: 0, INFO: 1, ALERTA: 2, ERRO: 3 };
    function pminJatos(js) { var m = 0; js.forEach(function (j) { var p = j.caminho === 'A' ? j.Pmin : j.PvMin; if (p > m) m = p; }); return m; }
    function ponto(nome, z, rd, hid) {
      var js = hid ? ctx.jatos.filter(function (j) { return j.hid === hid; }) : ctx.jatos;
      var r = { nome: nome, z: z, P: rd.P, fonte: rd.fonte || '', Pmin: pminJatos(js), montante: zc === undefined ? null : shutoff + (zc - z), avisos: [], situacao: 'OK' };
      function ap(sit, txt) { r.avisos.push(txt); if (ordem[sit] > ordem[r.situacao]) r.situacao = sit; }
      if (rd.P < r.Pmin - 1e-9) ap('ERRO', 'regulagem abaixo da pressão mínima na válvula (' + r.Pmin.toFixed(1) + ' mca)');
      if (rd.P > ctx.norma.pmax) ap('ERRO', 'regulagem acima de ' + ctx.norma.pmax + ' mca');
      if (hid && (par.a.hid === hid || par.b.hid === hid)) ap('ERRO', 'hidrante do par de cálculo não leva redutora');
      if (r.montante !== null && r.montante <= rd.P) ap('INFO', 'sem efeito: a estática de montante (' + r.montante.toFixed(1) + ' mca) não passa da regulagem');
      if (ordem[r.situacao] > ordem[pior]) pior = r.situacao;
      lista.push(r);
    }
    proj.hidrantes.forEach(function (h) { var rd = redutoraDe(h); if (rd) ponto(h.id, ctx.z(h.no), rd, h); });
    (proj.cotasExtras || []).forEach(function (c) { var rd = redutoraDe(c); if (rd) ponto(c.nome, c.z, rd, null); });
    if (!lista.length) return null;
    var valor = lista.map(function (r) { return r.nome + ': ' + (r.montante === null ? '' : r.montante.toFixed(1) + ' para ') + r.P.toFixed(1) + ' mca' + (r.avisos.length ? ' (' + r.avisos.join('; ') + ')' : ''); }).join('; ');
    return { lista: lista, situacao: pior, valor: valor };
  }

  function resolve(proj, D) {
    var p = Object.assign({}, proj);
    ['bomba', 'jockey'].forEach(function (k) {
      if (p[k] && p[k].id) {
        var b = D.bombas.filter(function (x) { return x.id === p[k].id; })[0];
        if (!b) throw new Error('Bomba "' + p[k].id + '" fora do catálogo');
        p[k] = Object.assign({}, b, p[k]);
      }
    });
    return p;
  }
  function calcular(proj, D) {
    proj = resolve(proj, D);
    var norma = D.normas[proj.norma], erros = [], V = [], num = {};
    var modo = (proj.fonte && proj.fonte.modo) || 'bomba';
    var raiz = modo === 'bomba' ? 'BI' : 'RI';
    var cls = proj.sistema ? classifica(D, proj.norma, proj.sistema.coluna, proj.sistema.area) : null;
    var tipoId = (proj.sistema && proj.sistema.tipo) || (cls && cls.tipo);
    var tipo = norma.tipos.filter(function (t) { return t.id === tipoId; })[0];
    if (!tipo) throw new Error('Tipo de sistema indefinido');
    var grafo = montaGrafo(D, proj, raiz); erros = erros.concat(grafo.erros);
    var ctx = { proj: proj, norma: norma, D: D, grafo: grafo, raiz: raiz, modo: modo, tipo: tipo,
      z: function (n) { var v = proj.nos[n]; if (!v) { erros.push('Nó sem cota: ' + n); return 0; } return v.z; } };
    ctx.zX = proj.fonte ? proj.fonte.zX : 0;
    if (modo === 'gravidade' && (proj.trechos || []).some(function (t) { return String(t.nome || '').split('-').indexOf('BI') >= 0; })) erros.push('Neste abastecimento não há bomba: troque BI por outro nome');   // 2.6.0
    ctx.hProp = modo !== 'bomba' && proj.fonte && proj.fonte.hProp > 0 ? proj.fonte.hProp : 0;   // 2.6.0: carga própria só no elevado (taça seca e torre)
    if (ctx.hProp) num.hProp = ctx.hProp;
    ctx.suc = [];
    if (modo === 'bomba') { ctx.suc = grafo.caminho('RI') || []; if (!ctx.suc.length) erros.push('Sem trecho de sucção RI-BI'); }
    ctx.jatos = [];
    var lanc = dadosLancamento(proj, norma, tipo); ctx.lanc = lanc; num.lancamento = lanc;
    proj.hidrantes.forEach(function (h) {
      if (!grafo.caminho(h.no)) { erros.push('Hidrante ' + h.id + ' sem caminho até ' + raiz); return; }
      for (var i = 0; i < tipo.exp; i++) ctx.jatos.push(montaJato(D, proj, norma, h, tipo, i, lanc));
    });
    var pares = listaPares(ctx).sort(function (x, y) { return (y.AMT - x.AMT) || (y.Qt - x.Qt); });
    var parMaisDesf = parPorHidrante(ctx, pares) || pares[0], par = parMaisDesf, forcado = false;
    if (proj.parForcado) { var pf = pares.filter(function (p) { return nomePar(p) === proj.parForcado; })[0]; if (pf) { par = pf; forcado = true; } }
    num.parForcado = forcado; num.parMaisDesfavoravel = nomePar(parMaisDesf); if (par.unico) num.jatoUnico = true;
    num.tipo = tipo.id; num.classe = cls; num.par = nomePar(par); num.A = par.A;
    num.PA = par.PA; num.Qt = par.Qt; num.Qth = par.Qth; num.AMT = par.AMT; num.dif = par.dif; num.Pd = par.Pd;
    num.Qcrit = par.Qcrit; num.Qout = par.Qout; num.Pvout = par.Pvout; num.Pvcrit = par.Pvcrit; num.hfTr = par.hfTr; num.hfSuc = par.hfSuc; num.Pg = par.Pg;
    num.critico = par.crit.id; num.outro = par.out.id;
    // --- V01 a V03
    var e1 = par.Qcrit >= par.crit.Qmin - 1e-9 && par.Qout >= par.out.Qmin - 1e-9 && par.Pvcrit >= par.crit.Pmin - 1e-6 && par.Pvout >= par.out.Pmin - 1e-6;
    if (par.crit.parana) {   // Paraná: vazão na saída do esguicho e pressão mínima na ponta (NPT 022, 5.7.1; Tabela 1, notas 3 e 4)
      var jc = par.crit, jo = par.out, Peo = jo.nulo ? 0 : jo.Pe(par.Qout), pc = jc.ponto, po = jo.ponto || pc;
      var okQ = par.Qcrit >= lanc.Q - 1e-6 && (jo.nulo || par.Qout >= lanc.Q - 1e-6);
      var okP = pc.razao ? pc.ponta >= lanc.P - 1e-6 && (jo.nulo || po.razao * Peo >= lanc.P - 1e-6) : pc.P >= lanc.P - 1e-6;
      num.pontoProjeto = { esguicho: jc.esguicho, Pentrada: pc.P, Q: pc.Q, ponta: pc.ponta, PeMin: pc.PeMin, PeQ: pc.PeQ, PeP: pc.PeP, informado: pc.informado, razao: pc.razao, alcance: pc.alcance, naTabela: pc.naTabela, tabMin: pc.tabMin,
        PentradaOut: Peo, pontaOut: po.razao ? po.razao * Peo : null, mangueira: par.Pvcrit - pc.P };
      V.push(vf('V01', okQ && okP ? 'OK' : 'ERRO', (par.unico ? 'Vazão no esguicho e pressão mínima no jato' : 'Vazão no esguicho e pressão mínima no par adotado') + (pc.razao ? ' (pressão na ponta do esguicho)' : ' (pressão na entrada do esguicho; a da ponta fica na V27)'),
        'Q ' + par.Qcrit.toFixed(1) + (par.unico ? '' : ' e ' + par.Qout.toFixed(1)) + ' L/min (mínimo ' + lanc.Q + '); entrada do esguicho ' + pc.P.toFixed(2) + (par.unico ? '' : ' e ' + Peo.toFixed(2)) + ' mca' +
        (pc.razao ? '; ponta ' + pc.ponta.toFixed(2) + (par.unico ? '' : ' e ' + (po.razao * Peo).toFixed(2)) + ' mca (mínimo ' + lanc.P + ')' : '') + (pc.abaixo ? '; a pressão de entrada informada fica abaixo da mínima de ' + pc.PeMin.toFixed(2) + ' mca' : ''), norma, '5.7.1; Tabela 1, notas 3 e 4'));
      if (!pc.razao) V.push(vf('V27', 'ALERTA', 'Pressão na ponta do esguicho: a base não tem esse dado para o esguicho escolhido; comprovar os ' + lanc.P + ' mca pelo catálogo do fabricante', jc.esguicho + ': ' + pc.P.toFixed(2) + ' mca na entrada', norma, 'Tabela 1, nota 4'));
      // alcance: só conferência; não move o ponto de projeto; só alerta, nunca erro
      if (pc.naTabela) V.push(vf('V28', 'ALERTA', pc.alcance < lanc.alcance - 1e-9 ? 'Alcance do jato: o catálogo fica abaixo do exigido' : 'Alcance do jato: o catálogo ensaia a 45 graus e a NPT mede com o jato paralelo ao solo; conferir com o fabricante',
        'catálogo: ' + pc.alcance.toFixed(1) + ' m com ' + pc.P.toFixed(1) + ' mca na entrada; exigido: ' + lanc.alcance + ' m', norma, '5.7.1; 5.10.2.3'));
      else V.push(vf('V28', 'ALERTA', 'Alcance do jato a comprovar pelo projetista: o ponto de projeto fica ' + (pc.P < pc.tabMin ? 'abaixo' : 'acima') + ' da tabela de ensaio do fabricante',
        pc.P.toFixed(1) + ' mca na entrada; tabela de ' + pc.tabMin + ' a ' + pc.tabMax + ' mca; exigido: ' + lanc.alcance + ' m', norma, '5.7.1; 5.10.2.3'));
    } else
    {
    if (par.unico) V.push(vf('V01', e1 ? 'OK' : 'ERRO', 'Q e P mínimas no jato', 'Q ' + par.Qcrit.toFixed(1) + ' L/min; P ' + par.Pvcrit.toFixed(2) + ' mca', norma));
    else V.push(vf('V01', e1 ? 'OK' : 'ERRO', 'Q e P mínimas no par adotado', 'Q ' + par.Qcrit.toFixed(1) + ' e ' + par.Qout.toFixed(1) + ' L/min; P ' + par.Pvcrit.toFixed(2) + ' e ' + par.Pvout.toFixed(2) + ' mca', norma));
      /* 2.6.0: a pressão de cada válvula do par, levada pela mangueira até o esguicho (só leitura; o alcance só alerta) */
      var hc = par.crit.hid, mod = hc.esguicho || esguichoPadrao(lanc.mangueiraDN), dnE = lanc.mangueiraDN, LE = lanc.Lmang;
      var ec = ateEsguicho(D, mod, dnE, LE, par.Pvcrit), eo = par.unico || par.out.nulo ? null : ateEsguicho(D, mod, dnE, LE, par.Pvout);
      if (ec) {
        num.esguicho = { modelo: mod, padrao: !hc.esguicho, mangueiraDN: dnE, Lmang: LE, alcanceExigido: lanc.alcance, tabMin: ec.tabMin, tabMax: ec.tabMax, crit: Object.assign({ id: par.crit.id }, ec), out: eo ? Object.assign({ id: par.out.id }, eo) : null };
        var piores = [ec].concat(eo ? [eo] : []), fora = piores.filter(function (e) { return !e.naTabela; }), abaixo = piores.filter(function (e) { return e.naTabela && e.alcance < lanc.alcance - 1e-9; });
        var txE = piores.map(function (e) { return e.Pe.toFixed(1) + ' mca na entrada e ' + e.Q.toFixed(1) + ' L/min' + (e.naTabela ? ', alcance ' + e.alcance.toFixed(1) + ' m' : ''); }).join('; ') + '; exigido: ' + lanc.alcance + ' m (' + mod + ')';
        if (fora.length) V.push(vf('V28', 'ALERTA', 'Alcance do jato a comprovar pelo projetista: a pressão no esguicho fica ' + (fora[0].Pe < ec.tabMin ? 'abaixo' : 'acima') + ' da tabela de ensaio do fabricante (de ' + ec.tabMin + ' a ' + ec.tabMax + ' mca)', txE, norma, '4.8.2; 4.11.2.3'));
        else V.push(vf('V28', abaixo.length ? 'ALERTA' : 'OK', abaixo.length ? 'Alcance do jato: o catálogo fica abaixo do exigido com a pressão da Tabela 2' : 'Alcance do jato no esguicho', txE, norma, '4.8.2; 4.11.2.3'));
      }
    }
    if (par.unico) V.push(vf('V02', 'INFO', 'Um jato: rede com um só hidrante simples (a IT 22, 4.8.3, define os dois jatos para mais de um hidrante simples)', num.par, norma));
    else if (forcado && par !== parMaisDesf) V.push(vf('V02', 'ALERTA', 'Par forçado para estudo; o mais desfavorável é ' + num.parMaisDesfavoravel, num.par + ' (AMT ' + par.AMT.toFixed(2) + ' contra ' + parMaisDesf.AMT.toFixed(2) + ' mca)', norma));
    else V.push(vf('V02', 'OK', 'Dois jatos; par adotado = maior AMT', num.par, norma));
    if (!par.unico) V.push(vf('V03', 'INFO', 'Equilíbrio no nó A', par.dif.toFixed(2) + ' mca ' + (par.dif <= norma.equilibrio ? '(aceita com as vazões mínimas)' : '(acima de ' + norma.equilibrio + ': vazão do ramal favorável pelo K)'), norma));
    // --- V26: dados do esguicho e da mangueira diferentes da tabela oficial (2.2): aceitos, marcados e levados ao relatório, com a fonte
    var ROT_L = { Q: ['vazão por jato', 'L/min'], P: ['pressão mínima', 'mca'], mangueiraDN: ['diâmetro da mangueira', 'mm'], Lmang: ['comprimento da mangueira', 'm'], alcance: ['alcance exigido', 'm'] };
    if (lanc.alterados.length || (lanc.Pentrada !== undefined && par.crit.parana)) {
      /* A fonte não é obrigatória; quando informada, vai junto */
      var txA = lanc.alterados.map(function (a) { return ROT_L[a.campo][0] + ' ' + a.valor + ' ' + ROT_L[a.campo][1] + ' (oficial: ' + a.oficial + (a.fonte ? '; fonte: ' + a.fonte : '') + ')'; });
      if (lanc.Pentrada !== undefined && par.crit.parana) txA.push('pressão de projeto na entrada do esguicho ' + lanc.Pentrada + ' mca (mínima calculada: ' + par.crit.ponto.PeMin.toFixed(2) + (lanc.fontePentrada ? '; fonte: ' + lanc.fontePentrada : '') + ')');
      V.push(vf('V26', 'ALERTA', 'Dados do esguicho e da mangueira alterados em relação à tabela oficial', txA.join('; '), norma, proj.norma === 'SP' ? 'Tabela 2' : 'Tabela 1'));
    }
    // --- velocidades
    var vmax = 0, onde = '';
    par.tronco.forEach(function (e) { var v = vel(par.Qt, e.t.dint); if (v > vmax) { vmax = v; onde = e.t.nome; } });
    [[par.ramalCrit, par.Qcrit], [par.ramalOut, par.Qout]].forEach(function (rq) { rq[0].forEach(function (e) { var v = vel(rq[1], e.t.dint); if (v > vmax) { vmax = v; onde = e.t.nome; } }); });
    num.vmax = vmax;
    V.push(vf('V06', vmax <= norma.vmaxRede ? 'OK' : 'ERRO', 'Velocidade na rede (maior: ' + onde + ')', vmax.toFixed(2) + ' m/s (limite ' + norma.vmaxRede + ')', norma));
    // --- V18 DN mínimo da rede, V21 tabela de Leq única (sem lista de conferência à mão: o projetista confere no desenho)
    var dnMenor = Math.min.apply(null, proj.trechos.map(function (t) { return t.dn; }));
    // 2.3: pela norma. DN65 é o mínimo (IT 22, 4.11.6.1; NPT 022, 5.10.6.1); DN50 é admitido só nos tipos 1 e 2 (4.11.6.2; 5.10.6.2, com comprovação técnica)
    var t12 = tipo.id === '1' || tipo.id === '2', sitDn = dnMenor >= 65 ? 'OK' : (dnMenor >= 50 && t12 ? 'ALERTA' : 'ERRO');
    V.push(vf('V18', sitDn, 'Diâmetro mínimo da rede (DN65; DN50 só nos tipos 1 e 2)', 'menor DN: ' + dnMenor + (sitDn === 'ALERTA' ? '; admitido no tipo ' + tipo.id + (proj.norma === 'PR' ? ', com comprovação técnica do desempenho hidráulico' : '') + '; a ferramenta adota DN65' : sitDn === 'ERRO' ? (dnMenor >= 50 ? '; DN50 só é admitido nos tipos 1 e 2 (este é o tipo ' + tipo.id + ')' : '; abaixo de DN50 não é admitido') : ''), norma, proj.norma === 'PR' ? '5.10.6.1; 5.10.6.2' : '4.11.6.1; 4.11.6.2'));
    // V19: altura da válvula do hidrante (4.7.1.4), só quando todos os hidrantes trazem a altura
    var comAltura = proj.hidrantes.filter(function (h) { return h.alturaValvula !== undefined && h.alturaValvula !== null && h.alturaValvula !== ''; });
    if (proj.hidrantes.length && comAltura.length === proj.hidrantes.length) {
      var fora = comAltura.filter(function (h) { return h.alturaValvula < 1.0 - 1e-9 || h.alturaValvula > 1.5 + 1e-9; });
      V.push(vf('V19', fora.length ? 'ALERTA' : 'OK', 'Altura da válvula do hidrante, de 1,0 a 1,5 m do piso', fora.length ? fora.map(function (h) { return h.id + ' a ' + h.alturaValvula + ' m'; }).join('; ') : comAltura.map(function (h) { return h.id + ' ' + h.alturaValvula + ' m'; }).join('; '), norma));
    }
    var mistura = proj.trechos.some(function (t) { return Object.keys(t.pecas || {}).some(function (id) { return !D.leq[proj.tabelaLeq].pecas[id]; }); });
    V.push(vf('V21', mistura ? 'ERRO' : 'OK', 'Uma tabela de Leq por projeto', 'tabela ' + proj.tabelaLeq, norma));
    // --- V32 (2.6.0, gravidade): sem bomba, o desnível do reservatório elevado tem de dar a pressão mínima no hidrante mais desfavorável
    if (modo === 'gravidade' && num.AMT !== undefined) V.push(vf('V32', num.AMT > 1e-9 ? 'ERRO' : 'OK', 'Desnível do reservatório elevado contra a pressão mínima', num.AMT > 1e-9 ? 'faltam ' + num.AMT.toFixed(2) + ' mca por gravidade' : 'sobram ' + (-num.AMT).toFixed(2) + ' mca por gravidade', norma, norma.itens && norma.itens.V01));
    if (proj.norma === 'PR') {
      V.push(vf('V23', proj.hidrantes.length > 1 || tipo.exp > 1 ? 'OK' : 'ERRO', 'Ponto único de hidrante exige duas expedições', proj.hidrantes.length + ' hidrantes', norma));
      if (modo === 'gravidade') { /* 2.6.0: o ramal de retorno é de teste da bomba; na gravidade não há bomba */ }
      else if (temRetorno(proj)) {   // ramal lançado com trechos: a V24 compara a vazão do retorno com a faixa
        var bR = proj.bomba && modo === 'bomba' ? proj.bomba : null;
        if (!bR) V.push(vf('V24', 'ALERTA', 'Ramal de retorno para testes: falta a bomba para calcular a vazão', 'ramal lançado', norma));
        else {
          var rt = retornoTeste(ctx, bR, par.Qt); num.retorno = rt;
          if (rt.erros.length) { erros = erros.concat(rt.erros); V.push(vf('V24', 'ERRO', 'Ramal de retorno para testes', rt.erros[0], norma)); }
          else if (rt.semCruzamento) V.push(vf('V24', 'ERRO', 'Ramal de retorno para testes: a curva da bomba não encontra a do ramal', 'sem ponto de encontro', norma));
          else if (!rt.ok) V.push(vf('V24', 'ERRO', 'Ramal de retorno para testes: todo aberto não passa ' + rt.min + '% da vazão nominal', rt.Q.toFixed(1) + ' L/min com o registro aberto (' + rt.pct.toFixed(0) + '% de ' + par.Qt.toFixed(1) + ' L/min)', norma));
          else V.push(vf('V24', 'OK', 'Ramal de retorno para testes: regulagem pelo registro', rt.hReg100 >= 0 ? 'registro com perda de ' + rt.hReg.toFixed(1) + ' mca para a vazão nominal de ' + par.Qt.toFixed(1) + ' L/min; todo aberto passam ' + rt.Q.toFixed(1) + ' L/min (' + rt.pct.toFixed(0) + '%)' : 'todo aberto passam ' + rt.Q.toFixed(1) + ' L/min (' + rt.pct.toFixed(0) + '% da nominal de ' + par.Qt.toFixed(1) + ' L/min)', norma));
        }
      } else V.push(vf('V24', proj.retornoTeste ? 'OK' : 'ERRO', 'Ramal de retorno para testes lançado', proj.retornoTeste ? 'sim' : 'não lançado', norma));
    }
    // --- 2.5.1: nível X calculado pela Tabela B.1 (só quando o projeto traz a conta; projeto com o X informado não muda)
    if (proj.fonte && proj.fonte.nivelX) {
      var nx = proj.fonte.nivelX; num.nivelX = nx;
      // 2.6.0: os alertas do Abastecimento (antivórtice fora da tomada admitida, poço mais raso ou mais estreito que o mínimo, nível normal) vão para a V29;
      // antivórtice por cima só em SP (B.3.9); no elevado, poço e antivórtice opcionais conferidos contra o Anexo B (IT 22, 4.9.4; NPT 022, 5.8.7). Carga própria no valor.
      var PRn = proj.norma === 'PR', als = (nx.alertas || []).map(function (a) { return String(a).replace(/\.$/, '').replace(/não admitido nesta tomada$/, 'não admitido nesta tomada (B.3.6)'); });
      var itX = nx.bomba ? 'B.3.3 a B.3.8' + (nx.anti && nx.saida === 'cima' ? '; B.3.9' : '') + '; Tabela B.1' : 'B.2.1' + (proj.fonte.poco || proj.fonte.anti ? (PRn ? '; 5.8.7' : '; 4.9.4') : '');
      V.push(vf('V29', (nx.bomba && nx.exata === false) || als.length ? 'ALERTA' : 'OK', nx.bomba ? 'Nível X calculado pela Tabela B.1' + (nx.exata === false ? ' (DN' + nx.dn + ' fora da tabela: linha do DN' + nx.dnTab + ')' : '') : 'Referência da altura do reservatório elevado',
        (nx.bomba ? 'X = ' : 'cota ') + nx.X.toFixed(3) + ' m' + (nx.hProp > 0 ? '; carga própria ' + nx.hProp.toFixed(2) + ' mca' : '') + (nx.reserva !== undefined ? '; reserva ' + nx.reserva.toFixed(2) + ' m³ em ' + nx.altura.toFixed(3) + ' m de água' : '') + (als.length ? '; ' + als.join('; ') : ''), norma, itX));
    }
    // --- V30 (2.6.0): tipo adotado inferior ao que a tabela indica para a coluna e a área. Tipo igual ou superior não gera item.
    if (cls && proj.sistema && proj.sistema.tipo) {
      var idsT = norma.tipos.map(function (t) { return t.id; }), iAd = idsT.indexOf(tipo.id), iTb = idsT.indexOf(cls.tipo === '4' ? '4-40' : cls.tipo);
      var rpV = reservaPedida(D, proj.norma, proj.sistema, tipo.id);
      if (iAd >= 0 && iTb >= 0 && iAd < iTb && !(rpV && rpV.admitido)) V.push(vf('V30', 'ERRO', 'Tipo de sistema contra a tabela', 'tipo ' + tipo.id + ' adotado; a tabela pede o tipo ' + cls.tipo, norma, proj.norma === 'PR' ? 'Tabela 2' : 'Tabela 3'));
    }
    // --- RTI
    if (cls && proj.fonte && proj.fonte.rtiEfetiva !== undefined) {
      var rp = reservaPedida(D, proj.norma, proj.sistema, tipo.id) || cls;
      num.rtiTabela = rp.rti; num.rtiEfetiva = proj.fonte.rtiEfetiva;
      num.dur = proj.fonte.rtiEfetiva * 1000 / par.Qt;
      V.push(vf('V12', proj.fonte.rtiEfetiva >= rp.rti ? 'OK' : 'ERRO', 'RTI efetiva contra a tabela (tipo ' + rp.tipo + ', ' + rp.faixa + ' m²)', proj.fonte.rtiEfetiva + ' m³ contra ' + rp.rti + ' m³', norma));
      V.push(vf('V13', 'INFO', par.unico ? 'Duração da RTI com um jato' : 'Duração da RTI com os dois jatos', num.dur.toFixed(1) + ' min', norma));
    }
    // --- bomba, ponto de trabalho, sucção, NPSH, estática, jockey
    var b = proj.bomba;
    if (b && modo !== 'gravidade') {
      var hb = alturaBomba(b.pts, par.Qth);
      num.Hb = hb.H; num.margem = hb.H - par.AMT; num.extrapolado = hb.extrapolado;
      V.push(vf('V10', hb.H >= par.AMT ? (hb.extrapolado ? 'ALERTA' : 'OK') : 'ERRO', 'Bomba atende a AMT na vazão nominal', 'H ' + hb.H.toFixed(2) + ' contra AMT ' + par.AMT.toFixed(2) + (hb.extrapolado ? ' (extrapolado)' : ''), norma));
      var pt = pontoTrabalho(ctx, par, b); num.pt = pt;
      if (!pt.semCruzamento) { num.Qw = pt.Qth; num.Hw = pt.H; num.PAw = pt.PA; }
      if (b.potEixo && b.potEixo.pts) { var pe = leCurva(b.potEixo.pts, par.Qt * CV); if (pe !== null) num.potEixo = { P: pe, un: b.potEixo.unidade, Q: par.Qt * CV }; }   // potência no eixo, lida da curva do catálogo (não é a do motor)
      V.push(vf('V11', b.shutoff <= norma.pmax ? 'OK' : 'ALERTA', 'Shut-off da bomba', b.shutoff + ' mca (recomendado até ' + norma.pmax + ')', norma));
      if (modo === 'bomba') {
        var su = succaoProjeto(ctx), neg = su.estado === 'negativa';   // 2.6.0: três estados pela C.1.12 no lugar de "eixo acima de X"
        num.sucNegativa = neg; ctx.succao = su;   // o estado fica no contexto do resultado (R.ctx.succao): a lista de números segue a da 2.5.4
        var vs = vel(par.Qt, ctx.suc.length ? ctx.suc[0].t.dint : 0), lim = neg ? norma.vmaxSucNeg : norma.vmaxSucPos;
        num.vSuc = vs;
        V.push(vf('V07', vs <= lim ? 'OK' : 'ERRO', 'Velocidade na sucção na vazão nominal', vs.toFixed(2) + ' m/s (limite ' + lim + ')', norma));
        V.push(vf('V09', neg ? 'ALERTA' : 'OK', neg ? 'Sucção negativa: escorva e manovacuômetro (C.2.6, C.1.17)' : su.estado === 'positiva' ? 'Sucção positiva por tolerância (C.1.12)' : 'Bomba afogada',
          neg ? (su.g > 0 ? 'eixo ' + su.g.toFixed(2) + ' m acima de X' : 'tomada por cima, eixo ' + (-su.g).toFixed(3) + ' m abaixo de X') + (proj.fonte.saida === 'cima' && su.g > 0 ? '; tomada por cima' : '')
            : su.estado === 'positiva' ? 'eixo ' + su.g.toFixed(2) + ' m acima de X (tolerância até ' + su.lim.toFixed(2) + ' m)' : 'eixo ' + (-su.g).toFixed(3) + ' m abaixo de X', norma));
        // V31 (2.6.0): em SP, bomba com sucção negativa só nos tipos 1, 2 e 3 (IT 22, C.2.6). O PR não tem a restrição.
        if (neg && proj.norma === 'SP' && /^(4|5)/.test(tipo.id)) V.push(vf('V31', 'ERRO', 'Bomba acima do nível da água só nos tipos 1, 2 e 3', 'tipo ' + tipo.id + ' com sucção negativa', norma, 'C.2.6'));
        if (su.npshObrigatorio || su.estado === 'positiva') {   // 2.6.0: NPSH calculado na negativa, no PR em qualquer estado e, em SP, como informação na positiva por tolerância (sem V08). 2.5.4: o disponível é
          // calculado a 1,0 Q e a 1,5 Q (perda na sucção em cada vazão; a altura manométrica é a mesma). O projetista escolhe com qual dos dois o requerido
          // da bomba escolhida é comparado (bomba.npshQ = 1.5; sem o campo, 1,0 Q, a vazão de projeto). A escolha comanda a V08, a planilha e o memorial.
          var amb = ambiente(D, proj.ambiente.altitude, proj.ambiente.temperatura), Q15 = 1.5 * par.Qt, hs = hfSoma(ctx.suc, Q15), hg = ctx.z('BI') - ctx.zX;
          num.Patm = amb.Patm; num.Pvap = amb.Pvap; num.Q15 = Q15; num.hfSuc15 = hs; num.hAsp = hg;
          num.NPSHd = amb.Patm - amb.Pvap - hg - hs;
          num.vSuc15 = vel(Q15, ctx.suc[0].t.dint);
          num.hfSuc1 = hfSoma(ctx.suc, par.Qt); num.NPSHd1 = amb.Patm - amb.Pvap - hg - num.hfSuc1;
          var h15 = alturaBomba(b.pts, Q15 * CV); num.atende15 = !h15.extrapolado && h15.H >= par.AMT - 1e-9; num.H15 = h15.H;   // só informação: a bomba entrega a altura a 1,5 Q?
          var a15 = b.npshQ === 1.5, Qv = a15 ? Q15 : par.Qt, NPSHdv = a15 ? num.NPSHd : num.NPSHd1, hsv = a15 ? hs : num.hfSuc1, qtx = a15 ? '1,5 Q' : '1,0 Q';
          num.Qverif = a15 ? 1.5 : 1;
          var nr = b.npshr, daCurva = false;     // bomba com curva de NPSH requerido no catálogo: leitura na vazão de verificação; fora da faixa da curva vale o valor digitado
          if (b.npsh && b.npsh.length >= 2) { var lc = leCurva(b.npsh, Qv * CV); if (lc !== null) { nr = lc; daCurva = true; num.NPSHrCurva = true; } else num.NPSHrForaDaCurva = true; }
          if (nr !== undefined) {
            num.NPSHr = nr; num.hgMax = amb.Patm - amb.Pvap - hsv - nr;   // altura máxima de aspiração acima do nível X, na vazão de verificação
            if (su.npshObrigatorio) V.push(vf('V08', NPSHdv >= nr - 1e-9 ? 'OK' : 'ERRO', 'NPSH disponível contra o requerido da bomba escolhida, a ' + qtx + ' (sem subtrair depois)', NPSHdv.toFixed(2) + ' contra ' + (daCurva ? nr.toFixed(2) + ' (curva do catálogo)' : nr) + ', a ' + qtx, norma));
          }
          else if (su.npshObrigatorio) V.push(vf('V08', 'ALERTA', num.NPSHrForaDaCurva ? 'NPSH requerido: ' + qtx + ' fica fora da faixa da curva do catálogo; informar o valor do fabricante' : 'NPSH requerido não informado', 'NPSHd ' + NPSHdv.toFixed(2) + ' a ' + qtx, norma));
        }
      }
      // estática: shut-off + (cota do nível cheio menos a cota da válvula), toda válvula e cotas extras
      var zc = proj.fonte.zCheio, cotas = proj.hidrantes.map(function (h) { return { nome: h.id, z: ctx.z(h.no), red: redutoraDe(h) }; }).concat((proj.cotasExtras || []).map(function (c) { return { nome: c.nome, z: c.z, red: redutoraDe(c) }; }));
      var est = cotas.map(function (c) {      // com válvula redutora no ponto, a estática a jusante dela é a regulagem (quando menor que a de montante)
        var e = { nome: c.nome, z: c.z, P: b.shutoff + (zc - c.z) };
        if (c.red) { e.semRedutora = e.P; e.redutora = c.red.P; e.P = Math.min(e.P, c.red.P); }
        return e;
      });
      num.estatica = est; var pior = est.reduce(function (m, e) { return e.P > m.P ? e : m; }, est[0]); num.estaticaMax = pior;
      V.push(vf('V05', pior.P <= norma.pmax ? 'OK' : 'ERRO', 'Pressão estática com a bomba fechada e o reservatório cheio', pior.P.toFixed(1) + ' mca em ' + pior.nome + ' (limite ' + norma.pmax + ')', norma));
      if (modo === 'bomba') { num.zLimite = ctx.z('BI') + (b.shutoff + (zc - ctx.z('BI')) - norma.pmax) - (zc - ctx.z('BI')) + 0; num.zLimite = zc - (norma.pmax - b.shutoff); }
      else num.zLimite = zc - (norma.pmax - b.shutoff);
      // dinâmica: pressão na válvula mais favorável, com a vazão do ponto de trabalho só no tronco
      if (!pt.semCruzamento && modo === 'bomba') {
        var Pdw = pt.PA + hfSoma(par.tronco, pt.Qt) + (ctx.z(par.A) - ctx.z('BI')), pm = -1e9, ph = '';
        proj.hidrantes.forEach(function (h) {
          var cam = grafo.caminho(h.no), k2 = 0; while (k2 < cam.length && k2 < par.tronco.length && cam[k2].t === par.tronco[k2].t) k2++;
          var Pv = Pdw - hfSoma(cam.slice(0, k2), pt.Qt) + (ctx.z('BI') - ctx.z(h.no)); var rdh = redutoraDe(h); if (rdh) Pv = Math.min(Pv, rdh.P); if (Pv > pm) { pm = Pv; ph = h.id; }
        });
        num.dinamica100 = pm; V.push(vf('V04', pm <= norma.pmax ? 'OK' : 'ERRO', 'Pressão dinâmica máxima na válvula mais favorável (limite superior)', pm.toFixed(1) + ' mca em ' + ph, norma));
      }
    }
    // --- válvula redutora de pressão no ponto (leitura da ferramenta: pressão de saída declarada; IT 22, 4.8.8, e Brentano, cap. 15, não dão o modelo)
    var reds = verificaRedutoras(ctx, par, b && modo !== 'gravidade' ? b.shutoff : 0);
    if (reds) { num.redutoras = reds.lista; V.push(vf('V25', reds.situacao, 'Válvula redutora de pressão: regulagem declarada (leitura da ferramenta)', reds.valor, norma)); }
    // --- jockey e escada de pressostatos
    if (proj.jockey && b && modo === 'bomba') {
      var jk = proj.jockey, saidas = proj.saidas || proj.hidrantes.length, asp = ctx.z('BI') - ctx.zX;
      var exig = proj.norma === 'SP' ? saidas > 6 && !(proj.fonte.elevado) : false;
      V.push(vf('V14', exig ? (jk.pts ? 'OK' : 'ERRO') : 'INFO', proj.norma === 'SP' ? 'Jockey exigida acima de 6 saídas' : 'Jockey facultativa no PR', saidas + ' saídas', norma));
      if (jk.pts) {
        // 2.4.3: escada a partir da pressão calculada na descarga (degrau 1: a principal liga); a jockey liga 10 acima e
        // desliga 10 acima da própria partida, sem passar do teto: shut-off da principal no cavalete, água em X (IT 22, C.1.15.1)
        var teto = b.shutoff - asp, e1 = par.Pd, e3 = Math.min(e1 + 20, teto), e2 = e3 - 10, cabe = e2 > e1;
        var Hj = e2 + asp, Qj = vazaoJockey(jk.pts, jk.shutoff, Hj);
        num.HjPartida = Hj; num.Qjh = Qj; num.Qjl = Qj / CV;
        V.push(vf('V15', num.Qjl <= 20 ? 'OK' : 'ERRO', 'Vazão da jockey no ponto de partida (<= 20 L/min)', num.Qjl.toFixed(1) + ' L/min', norma));
        V.push(vf('V16', jk.shutoff >= b.shutoff ? 'OK' : 'ERRO', 'Shut-off da jockey maior ou igual ao da principal', jk.shutoff + ' contra ' + b.shutoff, norma));
        num.escada = { desligaJockey: e3, ligaJockey: e2, ligaPrincipal: e1, fundoJockeyBar: e3 / 0.7 / BAR, fundoPrincipalBar: e1 / 0.7 / BAR, teto: teto, cabe: cabe };
        var fs = proj.pressostatoFundoBar;
        V.push(vf('V17', !cabe ? 'ERRO' : fs === undefined ? 'ALERTA' : (fs * 0.7 * BAR >= e3 ? 'OK' : 'ERRO'), 'Escada de pressostatos (70% do fundo de escala)', e3.toFixed(1) + ' / ' + e2.toFixed(1) + ' / ' + e1.toFixed(1) + ' mca, a partir da pressão calculada; teto ' + teto.toFixed(1) + (cabe ? '' : '; a escada não cabe: o teto fica a menos de 10 mca da pressão calculada') + (fs !== undefined ? '; fundo de escala ' + fs + ' bar' : ''), norma));
      }
    }
    // --- V14 sem jockey lançada: exigida (SP, mais de 6 saídas, reservatório não elevado) ou não
    if (!proj.jockey && modo === 'bomba') {
      var sd = proj.saidas || proj.hidrantes.length, ex2 = proj.norma === 'SP' ? sd > 6 && !(proj.fonte && proj.fonte.elevado) : false;
      V.push(vf('V14', ex2 ? 'ERRO' : 'INFO', proj.norma === 'SP' ? (ex2 ? 'Jockey exigida acima de 6 saídas e não lançada' : 'Jockey não exigida (até 6 saídas ou reservatório elevado)') : 'Jockey facultativa no PR, não lançada', sd + ' saídas', norma));
    }
    // --- recalque: só registro (2.3). O dispositivo recebe água da viatura do Corpo de Bombeiros e não é dimensionado; a conta didática (V20) saiu.
    num.erros = erros;
    return { numeros: num, verificacoes: V, par: par, pares: pares.map(function (p) { return { par: nomePar(p), AMT: p.AMT, Qt: p.Qt, PA: p.PA, A: p.A }; }), erros: erros, ctx: ctx };
  }
  function vf(id, sit, titulo, valor, norma, item) { return { id: id, situacao: sit, titulo: titulo, valor: valor, item: item || (norma.itens && norma.itens[id]) || '' }; }

  return { J: J, vel: vel, interp: interp, alturaBomba: alturaBomba, leCurva: leCurva, vazaoJockey: vazaoJockey, ambiente: ambiente, classifica: classifica, reservaPedida: reservaPedida, sugereColuna: sugereColuna, faixa: faixa,
    montaGrafo: montaGrafo, pressaoGravidade: pressaoGravidade, estadoSuccao: estadoSuccao, retornoTeste: retornoTeste, curvaSistema: curvaSistema, calcular: calcular, pressoesHidrantes: pressoesHidrantes, pressoesNos: pressoesNos, cascata: cascata, redutoraDe: redutoraDe, avaliaPar: avaliaPar, mangueiraJ: mangueiraJ, esguichoP: esguichoP, ateEsguicho: ateEsguicho, esguichoPadrao: esguichoPadrao, dadosLancamento: dadosLancamento, pontoParana: pontoParana, prepTrecho: prepTrecho, achaTubo: achaTubo, leqPeca: leqPeca, CV: CV, BAR: BAR, ITER: ITER };
});
