/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, validação. Funções puras, sem tela.
 * Regra central: o campo guarda o texto; um texto inválido nunca vira número e nunca chega ao motor.
 * Níveis: 'erro' (bloqueia a etapa e suspende o resultado), 'vazio' (falta preencher), 'alerta' (pede conferência, não bloqueia).
 * As faixas de alerta são de plausibilidade da interface, não regra de norma (as regras de norma são as verificações do motor). */
(function (raiz, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else raiz.FireValida = f(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function num(s) { s = String(s === undefined || s === null ? '' : s).trim(); return /^-?\d+([.,]\d+)?$/.test(s) ? parseFloat(s.replace(',', '.')) : NaN; }
  function vazio(s) { return String(s === undefined || s === null ? '' : s).trim() === ''; }
  function ehHid(n) { return /^H/i.test(String(n)); }
  function E(m) { return { n: 'erro', msg: m }; } function Z(m) { return { n: 'vazio', msg: m }; } function A(m) { return { n: 'alerta', msg: m }; }
  /** 2.5.1: ordem das etapas (Abastecimento antes da Rede). Único lugar em que a posição de cada etapa é escrita. */
  var POS = { ident: 1, edif: 2, sistema: 2, abast: 3, rede: 4, hidr: 5, bomba: 6, verif: 7, rel: 8 };   // 2.5.3: Edificação e Sistema numa etapa só (edif e sistema na mesma posição)
  var SO_NUM = 'Use só número, com vírgula decimal. Exemplo: ';

  // ---- regras de tipo
  function positivo(s, oque, ex) {
    if (vazio(s)) return Z('Digite ' + oque + '. Exemplo: ' + ex);
    var v = num(s); if (isNaN(v)) return E(SO_NUM + ex);
    if (v <= 0) return E(oque.charAt(0).toUpperCase() + oque.slice(1) + ' precisa ser maior que zero.');
    return null;
  }
  function cota(s, oque) {
    if (vazio(s)) return Z('Digite ' + oque + ', em metros. Exemplo: 1,20');
    var v = num(s); if (isNaN(v)) return E(SO_NUM + '1,20');
    if (v < -30 || v > 200) return A('Cota fora da faixa comum (de -30 a 200 m). Confira a unidade (metros).');
    return null;
  }
  function tabela(s, xs, oque, ex) {
    if (vazio(s)) return Z('Digite ' + oque + '. Exemplo: ' + ex);
    var v = num(s); if (isNaN(v)) return E(SO_NUM + ex);
    if (v < xs[0] || v > xs[xs.length - 1]) return E('Valor fora da tabela da base (de ' + xs[0] + ' a ' + xs[xs.length - 1] + '). Digite ' + oque + '.');
    return null;
  }
  function inteiro(s) {
    if (vazio(s)) return null; var t = String(s).trim();
    if (!/^\d+$/.test(t)) return E('Use um número inteiro. Exemplo: 2');
    if (+t > 20) return A('Mais de 20 peças iguais num trecho é incomum. Confira a quantidade.');
    return null;
  }

  // ---- rede
  function nosDaRede(F) { var m = {}; F.trechos.forEach(function (t) { [t.de, t.para].forEach(function (n) { n = String(n).trim(); if (n) m[n] = 1; }); }); return Object.keys(m); }
  function grafo(F) {
    var adj = {}; F.trechos.forEach(function (t, i) { var d = String(t.de).trim(), p = String(t.para).trim(); if (!d || !p || d === p) return; (adj[d] = adj[d] || []).push({ n: p, i: i }); (adj[p] = adj[p] || []).push({ n: d, i: i }); });
    return adj;
  }
  function campoTrecho(F, i, campo) {
    var t = F.trechos[i], v = String(t[campo] === undefined || t[campo] === null ? '' : t[campo]).trim();
    if (campo === 'L') {
      var r = positivo(v, 'o comprimento do tubo em metros', '12,5'); if (r) return r;
      if (num(v) > 500) return A('Mais de 500 m num trecho só é incomum. Confira a unidade (metros) ou divida o trecho.');
      return null;
    }
    if (v === '') return Z(campo === 'de' ? 'Informe o nó de montante, de onde a água vem (lado do reservatório). Exemplo: A' : 'Informe o nó de jusante, para onde a água vai (lado do hidrante). Exemplo: H1');
    if (!/^[A-Za-z0-9]+$/.test(v)) return E('Use só letras e números no nome do nó. Exemplo: H1');
    var d = String(t.de).trim();
    if (campo === 'para' && v === d) return E('O trecho começa e termina no mesmo nó. Troque um dos dois.');
    if (campo === 'para' && F.trechos.some(function (o, k) { var a = String(o.de).trim(), b = String(o.para).trim(); return k < i && d && ((a === d && b === v) || (a === v && b === d)); })) return E('Já existe um trecho entre estes dois nós. Troque um dos nós.');
    return null;
  }
  /** Estrutura da rede: um trecho sai de RI; todo trecho tem caminho até RI; não há anel; há pelo menos um hidrante ligado. */
  function estrutura(F) {
    var av = [], adj = grafo(F), alc = {}, fila = ['RI'], n;
    if (F.trechos.length && !adj.RI) av.push({ i: 0, campo: 'de', msg: 'Nenhum trecho sai do reservatório (nó RI). O trecho da sucção tem RI a montante.' });
    while (fila.length) { n = fila.shift(); if (alc[n]) continue; alc[n] = 1; (adj[n] || []).forEach(function (f) { fila.push(f.n); }); }
    F.trechos.forEach(function (t, i) {
      var d = String(t.de).trim(), p = String(t.para).trim(), nome = d + '-' + p; if (!d || !p || alc[d] || !adj.RI) return;
      var oque = ehHid(p) ? 'O hidrante ' + p.replace(/^H/i, 'H-') : 'O trecho ' + nome;
      var ponta = (adj[d] || []).length === 1 && !ehHid(d) ? d : ((adj[p] || []).length === 1 && !ehHid(p) ? p : '');
      av.push({ i: i, campo: ponta === p ? 'para' : 'de', msg: oque + ' não está ligado ao reservatório: ' + (ponta ? 'o trecho ' + nome + ' tem a montante o nó ' + ponta + ', que não aparece em nenhum outro trecho.' : 'o trecho ' + nome + ' não tem caminho até o nó RI.') });
    });
    if (!av.length && F.trechos.length) {   // anel: numa rede ramificada ligada, trechos = nós - 1
      var pai = {}; var raizDe = function (x) { while (pai[x] !== undefined && pai[x] !== x) x = pai[x]; return x; };
      F.trechos.some(function (t, i) {
        var a = raizDe(String(t.de).trim()), b = raizDe(String(t.para).trim());
        if (a === b) { av.push({ i: i, campo: 'para', msg: 'O trecho ' + String(t.de).trim() + '-' + String(t.para).trim() + ' fecha um anel na rede. A ferramenta calcula rede ramificada: cada nó recebe água por um só trecho.' }); return true; }
        pai[a] = b; return false;
      });
    }
    var nh = (F.hidrantes || []).filter(function (h) { return alc[h.no]; }).length;
    if (F.trechos.length && !av.length && nh < 1) av.push({ i: F.trechos.length - 1, campo: 'para', msg: 'A rede precisa de pelo menos um hidrante ligado ao reservatório (nó que começa com H). Exemplo: H1' });
    return { avisos: av, alc: alc };
  }

  // ---- 2.5.1: nível X calculado (IT 22 e NPT 022, B.3.3 a B.3.8, Tabela B.1 e Figuras B.1 a B.3)
  /** Tabela B.1: [DN da sucção, dimensão A, dimensão B], em mm. */
  var TAB_B1 = [[65, 250, 80], [80, 310, 80], [100, 370, 100], [150, 500, 100], [200, 620, 150], [250, 750, 150]];
  /** Linha da Tabela B.1 para o DN. DN fora da tabela usa a linha do DN imediatamente maior. Acima de DN250 não há linha. */
  function linhaB1(dn) { dn = +dn; if (!(dn > 0)) return null; for (var i = 0; i < TAB_B1.length; i++) if (TAB_B1[i][0] >= dn) return { dn: TAB_B1[i][0], A: TAB_B1[i][1], B: TAB_B1[i][2], exata: TAB_B1[i][0] === dn }; return null; }
  function arr(v, c) { var p = Math.pow(10, c); return Math.round(v * p + (v >= 0 ? 1e-7 : -1e-7)) / p; }
  /* ---- 2.6.0: cálculo da tela do Abastecimento, por tipologia. A E leva o mesmo cálculo ao motor. ---- */
  function volPrisma(a, za, zb) { return a * Math.max(0, zb - za); }
  /** 2.7.0 (FC-027, piscina): volume de uma piscina de planta c x l com o fundo em rampa linear ao longo de c, da cota zr (parte rasa, x = 0) até zf (parte funda, x = c, zr acima de zf),
   *  contado acima do nível s (o maior entre o nível X e o fundo) até o nível zb. A profundidade é linear por trechos entre x = 0, os pontos em que o fundo encontra s e zb, e x = c: soma exata pelos trapézios. */
  function volRampa(c, l, zr, zf, s, zb) {
    var fo = function (x) { return Math.max(0, zb - Math.max(s, zr + (zf - zr) * x / c)); }, xs = [0, c];
    [(zr - zb) / (zr - zf) * c, (zr - s) / (zr - zf) * c].forEach(function (x) { if (x > 0 && x < c) xs.push(x); });
    xs.sort(function (a, b) { return a - b; });
    var v = 0; for (var i = 0; i + 1 < xs.length; i++) v += (fo(xs[i]) + fo(xs[i + 1])) / 2 * (xs[i + 1] - xs[i]);
    return v * l;
  }
  /** Volume de um tronco de cone com a base (diâmetro db) na cota z0 e o topo (dt) em z0 + H, entre as cotas za e zb. */
  function volTronco(z0, db, dt, H, za, zb) {
    za = Math.max(za, z0); zb = Math.min(zb, z0 + H); if (!(zb > za) || !(H > 0)) return 0;
    var r = function (z) { return db / 2 + (dt - db) / 2 * (z - z0) / H; }, ra = r(za), rb = r(zb);
    return Math.PI / 3 * (zb - za) * (ra * ra + ra * rb + rb * rb);
  }
  function areaCirc(d) { return Math.PI * d * d / 4; }
  /** Estado da sucção (IT 22, C.1.12): g = eixo da bomba menos o nível X; lim = menor entre 2 m e 1/3 da altura efetiva; tomada superior é sempre negativa. */
  function succaoEstado(g, lim, saida, PR) {
    var est = saida === 'cima' ? 'negativa' : g <= 0 ? 'afogada' : g <= lim + 1e-9 ? 'positiva' : 'negativa';
    return { g: arr(g, 3), lim: arr(lim, 3), estado: est, vmax: est === 'negativa' ? 2 : 3, npshObrigatorio: est === 'negativa' || !!PR };
  }
  /** Mínimos do poço de sucção (Tabela B.1 e Figuras B.1 a B.3): profundidade que leva o X ao piso e lado da planta quadrada. */
  function pocoMinimos(saida, t, Dm, anti, hAnti) {
    var A = t.A / 1000, B = t.B / 1000, prof = saida === 'lateral' ? B + Dm + A : saida === 'cima' ? (anti ? Math.max(B, 0.15) + hAnti : B + A) : (anti ? hAnti : A);
    return { prof: arr(prof, 3), lado: arr((saida === 'lateral' ? 6 : 6.3) * Dm, 3) };
  }
  var TIPS_INF = ['ret', 'cil', 'tronco', 'piscina'], TIPS_ELE = ['ret', 'cil', 'tronco', 'taca_seca', 'taca_molhada', 'torre', 'standpipe'];
  /** Nível X (reservatório inferior) ou referência da altura (elevado), reserva efetiva, carga própria, poço, antivórtice e estado da sucção pelos dados de F.fonte.
   *  Inferior (B.3): saída lateral X = base + B + D + A; por cima X = base + B + A; pelo fundo X = base + A; com a cota real da tomada X = cota + A; antivórtice dispensa A (B.3.5; PR só pelo fundo,
   *  SP também por cima, B.3.9); com poço, a base é o fundo do poço e a água do poço acima de X conta na reserva (D-024, FC-063). Elevado (B.2.1): a referência é o fundo, a face superior do tubo lateral, o fundo da cuba (taça seca),
   *  o fundo do tanque (torre) ou a face superior da saída (taça molhada e standpipe); taça seca e torre têm carga própria (referência menos a saída na base).
   *  Devolve { ok, falta[], notas[], alertas[], X (= referência no elevado), ref, zRI, hProp, nivelReserva, topoReserva, area, altura, reserva, total, succao, ... }. */
  function nivelX(F) {
    var f = F.fonte || {}, tipo = f.tipo || (f.modo === 'bomba' ? 'inferior' : (f.modo ? 'elevado' : '')), tip = f.tip || (f.resForma === 'cil' ? 'cil' : 'ret'), PR = F.norma === 'PR';
    var r = { ok: false, falta: [], notas: [], alertas: [], tipo: tipo, tip: tip, bomba: tipo === 'inferior' };
    if (!tipo) { r.falta.push('a fonte de pressão'); return r; }
    var inf = tipo === 'inferior', taca = tip === 'taca_seca' || tip === 'taca_molhada', torre = tip === 'torre', sp = tip === 'standpipe';
    if ((inf ? TIPS_INF : TIPS_ELE).indexOf(tip) < 0) { r.falta.push('o tipo do reservatório'); return r; }
    if (tip === 'piscina' && PR) { r.falta.push('outro tipo de reservatório: o programa trata a piscina só em São Paulo'); return r; }   /* 2.7.0 (FC-027): a NPT 022 não foi lida; só a IT 22 (B.1.4) admite a piscina */
    var saida = f.saida, dn = +f.dnSuc || 0, Dm = dn / 1000, zc = num(f.zCheio), zf = num(f.zFundo), zt = num(f.zTomada), real = !vazio(f.zTomada);
    var tubo = tip === 'ret' || tip === 'cil' || tip === 'tronco' || tip === 'piscina';
    if (taca || torre) saida = 'base'; else if (tip === 'tronco' && !inf) saida = 'lateral';
    if (tubo || sp) { var okS = inf ? ['lateral', 'cima', 'fundo'].concat([]) : sp ? ['base', 'acima'] : ['fundo', 'lateral']; if (inf && tip === 'tronco') okS = ['lateral', 'cima']; if (okS.indexOf(saida) < 0) r.falta.push(sp ? 'a posição da saída' : 'como a água sai do reservatório'); }
    if (!taca && !sp && isNaN(zf)) r.falta.push(torre ? 'a cota do fundo do tanque' : 'a cota do fundo do reservatório');
    var zfc = num(f.zFundoCuba), zb = num(f.zBase), zs = num(f.zSaida);
    if (taca && isNaN(zfc)) r.falta.push('a cota do fundo da cuba');
    if ((tip === 'taca_molhada' || sp) && isNaN(zb)) r.falta.push('a cota da base');
    if ((tip === 'taca_seca' || torre) && isNaN(zs)) r.falta.push('a cota da saída na base');
    if (!dn) r.falta.push(inf ? 'o DN da sucção' : 'o DN da saída');
    if (sp && saida === 'acima' && isNaN(zt)) r.falta.push('a cota da face superior da saída');
    if (tip === 'piscina' && !vazio(f.zRaso)) { var zr0 = num(f.zRaso); if (isNaN(zr0) || zr0 <= zf) r.falta.push('a cota do fundo na parte rasa, acima do fundo da parte funda'); }
    if (r.falta.length) return r;
    r.dn = dn; r.D = Dm; r.fundo = zf; r.saida = saida; r.real = real; var t = linhaB1(dn);
    if (inf) {
      if (!t) { r.foraTabela = true; r.falta.push('um DN de sucção até DN250, o maior da Tabela B.1'); return r; }
      if (real && isNaN(zt)) { r.falta.push('a cota real da tomada'); return r; }
      r.A = t.A / 1000; r.B = t.B / 1000; r.dnTab = t.dn; r.exata = t.exata; r.base = zf; r.poco = false;
      if (!t.exata) r.notas.push('DN' + dn + ' não está na Tabela B.1: valem as dimensões A e B do DN' + t.dn + ', o imediatamente maior, a favor da segurança.');
      var lat = saida === 'lateral';
      r.anti = !!f.anti && (saida === 'fundo' || (saida === 'cima' && !PR)); r.hAnti = 0;
      if (f.anti && !r.anti) r.alertas.push('Dispositivo antivórtice não admitido nesta tomada.');
      if (r.anti && !vazio(f.antiH)) { var ha = num(f.antiH); if (isNaN(ha) || ha < 0) { r.falta.push('a altura do dispositivo antivórtice'); return r; } r.hAnti = ha; }
      /* 2.7.0 (FC-029): diâmetro do bocal da tomada superior com antivórtice (IT 22/2025, B.3.9: no mínimo o dobro do diâmetro da tubulação, D = DN da sucção, tolerância de 0,5 mm). Campo opcional, só confere: não entra em nenhuma conta. */
      if (r.anti && saida === 'cima' && !vazio(f.antiBocal)) { var bo = num(f.antiBocal); if (isNaN(bo) || bo <= 0) { r.falta.push('o diâmetro do bocal do antivórtice'); return r; } if (bo < 2 * dn - 0.5) r.alertas.push('O bocal da tomada superior é menor que o dobro do diâmetro da tubulação (' + 2 * dn + ' mm).'); }
      var pm = pocoMinimos(saida, t, Dm, r.anti, r.hAnti); r.pocoProfMin = pm.prof; r.pocoLadoMin = pm.lado;
      if (f.poco && tip !== 'tronco') {
        var pp = num(f.pocoProf); if (!(pp > 0)) { r.falta.push('a profundidade do poço de sucção'); return r; }
        r.poco = true; r.pocoProf = pp; r.base = zf - pp;
        if (pp < pm.prof - 0.0005) r.alertas.push('O poço é mais raso que o mínimo da Tabela B.1: o nível X fica acima do piso.');
        var pl = num(f.pocoLado); if (!isNaN(pl) && pl > 0 && pl < pm.lado - 0.0005) r.alertas.push('O lado do poço é menor que o mínimo das Figuras B.1 a B.3.');
      }
      r.minTopo = lat ? r.base + r.B + Dm : saida === 'cima' ? r.base + (r.anti ? Math.max(r.B, 0.15) : r.B) : r.base;
      r.topo = real ? zt : r.minTopo; r.abaixo = real && zt < r.minTopo - 0.0005;
      r.X = arr(r.anti ? r.topo + r.hAnti : r.topo + r.A, 3);
      /* 2.7.0 (FC-063, D-024): com poço de sucção mais fundo que o mínimo (X abaixo do piso), a água do poço entre X e o piso conta na capacidade efetiva (IT 22/2025, B.3.3: do nível normal ao nível X);
       * a reserva parte de X. Sem poço (B.3.8) ou com o poço no mínimo ou mais raso, vale o maior entre X e o piso, como antes. Sem o lado do poço não há volume a somar: a água do poço não conta. */
      var xPoco = !!r.poco && r.X < zf - 0.0005 && pl > 0;
      r.nivelReserva = xPoco ? r.X : Math.max(r.X, zf);
    } else {
      r.nivelReserva = null;
      if (tubo) {
        var la = saida === 'lateral'; r.real = la && real; if (r.real && isNaN(zt)) { r.falta.push('a cota real da face superior do tubo'); return r; }
        r.minTopo = la ? zf + Dm : zf; r.topo = r.real ? zt : r.minTopo; r.abaixo = r.real && zt < r.minTopo - 0.0005; r.X = arr(r.topo, 3); r.zRI = r.X;
        if (t && (tip === 'ret' || tip === 'cil')) {
          var pm2 = pocoMinimos(saida === 'lateral' ? 'lateral' : 'fundo', t, Dm, false, 0), pp2 = num(f.pocoProf), pl2 = num(f.pocoLado); r.pocoProfMin = pm2.prof; r.pocoLadoMin = pm2.lado;
          if (f.poco && !isNaN(pp2) && pp2 > 0 && pp2 < pm2.prof - 0.0005) r.alertas.push('O poço é mais raso que o mínimo da Tabela B.1.');
          if (f.poco && !isNaN(pl2) && pl2 > 0 && pl2 < pm2.lado - 0.0005) r.alertas.push('O lado do poço é menor que o mínimo das Figuras B.1 a B.3.');
        }
      } else if (taca || sp) {
        var alta = sp && saida === 'acima', base0 = taca ? zfc : zb;
        if (tip === 'taca_seca') { r.minTopo = zfc; r.topo = zfc; r.X = arr(zfc, 3); r.zRI = zs; }
        else { r.minTopo = zb + Dm; if (alta && real && isNaN(zt)) { r.falta.push('a cota da face superior da saída'); return r; } r.topo = (alta || real) ? zt : r.minTopo; r.abaixo = (alta || real) && zt < r.minTopo - 0.0005; r.X = arr(r.topo, 3); r.zRI = r.X; }
        r.real = tip !== 'taca_seca' && (alta || real);
      } else {
        r.minTopo = zf; r.topo = zf; r.X = arr(zf, 3); r.zRI = zs;
        if (t) { var pm3 = pocoMinimos('fundo', t, Dm, false, 0), pp3 = num(f.pocoProf); r.pocoProfMin = pm3.prof; r.pocoLadoMin = pm3.lado; if (f.poco && !isNaN(pp3) && pp3 > 0 && pp3 < pm3.prof - 0.0005) r.alertas.push('O poço é mais raso que o mínimo da Tabela B.1.'); }
      }
      r.nivelReserva = r.X;
    }
    r.ref = r.X; if (inf) r.zRI = zf;
    r.hProp = (tip === 'taca_seca' || torre) ? arr(r.X - zs, 3) : 0;
    r.minTopo = arr(r.minTopo, 3); r.topo = arr(r.topo, 3); r.faixa = inf ? arr(Math.max(r.nivelReserva - zf, 0), 3) : 0; r.ok = true;
    var z0 = taca ? zfc : (tip === 'taca_molhada' || sp) ? zb : zf, zcons = num(f.zConsumo);
    var top = !isNaN(zc) ? (!isNaN(zcons) && zcons < zc ? zcons : zc) : NaN; r.topoReserva = isNaN(top) ? null : top;
    var ar = NaN, vol = NaN, c = num(f.resC), l = num(f.resL), d = num(f.resD), v = num(f.resVol), db = num(f.troncoDb), dt = num(f.troncoDt), H = num(f.troncoH), dc = num(f.colD);
    var forma = tip === 'piscina' ? (f.resForma === 'area' ? 'area' : 'piscina') : (f.resForma === 'vol' ? 'vol' : tip), piso = xPoco ? zf : r.nivelReserva;   /* piso: de onde a planta do reservatório conta; a água do poço abaixo dele entra à parte, pela planta do poço */
    if (forma === 'vol') { if (v > 0 && !isNaN(zc) && zc > z0) ar = v / (zc - z0); if (!isNaN(ar) && !isNaN(top) && top > piso) vol = ar * (top - piso); }
    else {
      var cubaTr = tip === 'tronco' || (taca && f.cubaForma === 'tronco'), zBaseTr = tip === 'tronco' ? zf : zfc;
      if (cubaTr) { if (db > 0 && dt > 0 && H > 0 && !isNaN(top)) { vol = volTronco(zBaseTr, db, dt, H, r.nivelReserva, top); if (!(top <= zBaseTr + H + 0.0005)) r.alertas.push('O nível normal da água passa do topo da caixa.'); } }
      else if (tip === 'ret') { if (c > 0 && l > 0) { ar = c * l; if (!isNaN(top)) vol = volPrisma(ar, piso, top); } }
      else if (tip === 'piscina') {   /* 2.7.0 (FC-027): piscina como o retangular, com o fundo plano ou em rampa linear ao longo do comprimento (zRaso informada) ou só a área do espelho d'água (prisma acima do fundo raso, a favor da segurança) */
        var zr = num(f.zRaso), raso = !isNaN(zr), ap = num(f.resArea); if (raso) { r.zRaso = zr; if (forma !== 'area') r.rampa = true; }
        if (forma === 'area') { if (ap > 0) { ar = ap; if (!isNaN(top)) vol = volPrisma(ar, raso ? Math.max(piso, zr) : piso, top); } }
        else if (c > 0 && l > 0) { ar = c * l; if (!isNaN(top)) vol = raso ? volRampa(c, l, zr, zf, piso, top) : volPrisma(ar, piso, top); }
        if (!isNaN(ar) && !isNaN(zc)) r.total = arr(raso ? (forma === 'area' ? ar * Math.max(0, zc - Math.max(zf, zr)) : volRampa(c, l, zr, zf, zf, zc)) : ar * (zc - zf), 2);
      }
      else if (tip === 'taca_molhada') { if (dc > 0 && d > 0 && !isNaN(top) && !isNaN(zfc)) { var cubaM = f.cubaForma === 'tronco' ? (db > 0 && dt > 0 && H > 0 ? volTronco(zfc, db, dt, H, Math.max(r.nivelReserva, zfc), top) : NaN) : volPrisma(areaCirc(d), Math.max(r.nivelReserva, zfc), top); vol = volPrisma(areaCirc(dc), r.nivelReserva, Math.min(top, zfc)) + cubaM; } }
      else if (d > 0) { ar = areaCirc(d); if (!isNaN(top)) vol = volPrisma(ar, piso, top); }
    }
    if (xPoco && !isNaN(vol) && top > zf) { var vp = pl * pl * (zf - r.X); vol += vp; r.volPoco = arr(vp, 3); }   /* a chave só existe com a água do poço contada */
    if (!isNaN(ar)) r.area = arr(ar, 4);
    if (!isNaN(vol) && !isNaN(top) && top > r.nivelReserva) { r.altura = arr(top - r.nivelReserva, 3); r.reserva = arr(vol, 2); if (inf && tip !== 'piscina' && !isNaN(ar) && !isNaN(zc)) r.total = arr(ar * (zc - zf), 2); }
    if (!isNaN(top) && !isNaN(zc) && zc <= r.nivelReserva) r.alertas.push('O nível normal da água precisa ficar acima ' + (inf ? 'do nível X.' : 'da referência da altura.'));
    if (!isNaN(zcons) && zcons <= r.nivelReserva) r.alertas.push('A tomada de consumo precisa ficar acima ' + (inf ? 'do nível X.' : 'da referência da altura.'));
    var zbi = num(F.nos && F.nos.BI);
    if (inf && !isNaN(zbi) && r.topoReserva !== null) r.succao = succaoEstado(zbi - r.X, r.topoReserva > r.nivelReserva ? Math.min(2, (r.topoReserva - r.nivelReserva) / 3) : 0, saida, PR);   /* 2.7.0 (FC-019): nível normal igual ou abaixo de X (dado inválido, com alerta): limite 0, como o motor */
    return r;
  }
  /** 2.6.0: estado da sucção do projeto, o mesmo que o motor usa: o da função do nível X da tela.
   *  null quando faltam cotas ou a rota não tem bomba puxando de reservatório inferior. */
  function succaoDe(F) {
    var f = F.fonte || {}; if (f.modo !== 'bomba') return null;
    var r = nivelX(F); return r.ok && r.succao ? r.succao : null;
  }
  function m3(v) { return v.toFixed(3).replace('.', ','); }
  /** Texto da conta do nível X, com os números. */
  function contaX(r) {
    if (!r.bomba) return r.saida === 'fundo' ? 'Saída pelo fundo: a altura é medida do fundo do reservatório (B.2.1, a): ' + m3(r.X) + ' m.' : 'Saída lateral: a altura é medida da face superior do tubo de adução (B.2.1, b): ' + (r.real ? 'cota informada, ' : 'fundo ' + m3(r.fundo) + ' + D ' + m3(r.D) + ' = ') + m3(r.X) + ' m.';
    var base = r.poco ? 'fundo do poço ' + m3(r.base) : 'fundo ' + m3(r.fundo), tab = ' (Tabela B.1, linha do DN' + r.dnTab + (r.exata ? '' : ', a imediatamente maior que o DN' + r.dn) + ')';
    if (r.anti) return 'Com dispositivo antivórtice a dimensão A é dispensada (B.3.5): X = ' + (r.real ? 'boca da tomada, na cota informada, ' + m3(r.topo) : r.saida === 'cima' ? base + ' + ' + m3(r.topo - r.base) + ' (boca a pelo menos 150 mm do fundo)' : base) + (r.hAnti ? ' + altura do dispositivo ' + m3(r.hAnti) : '') + ' = ' + m3(r.X) + ' m.';
    if (r.real) return 'X = cota real da ' + (r.saida === 'lateral' ? 'geratriz superior da tomada' : 'boca da tomada') + ' ' + m3(r.topo) + ' + A ' + m3(r.A) + ' = ' + m3(r.X) + ' m' + tab + '.';
    if (r.saida === 'lateral') return 'X = ' + base + ' + B ' + m3(r.B) + ' + D ' + m3(r.D) + ' + A ' + m3(r.A) + ' = ' + m3(r.X) + ' m' + tab + '.';
    if (r.saida === 'cima') return 'X = ' + base + ' + B ' + m3(r.B) + ' + A ' + m3(r.A) + ' = ' + m3(r.X) + ' m' + tab + '.';
    return 'X = ' + base + ' + A ' + m3(r.A) + ' = ' + m3(r.X) + ' m' + tab + '.';
  }

  /** Lista de todos os campos do projeto com o resultado da validação: [{c, etapa, n, msg, motor}].
   *  c é o caminho do campo no formulário (o mesmo do atributo data-c na tela). ctx = {precisaCarga, jockeyExigida, altitudes, temperaturas}. */
  function validar(F, ctx) {
    ctx = ctx || {}; var L = [];
    function p(c, etapa, r, motor) { if (r) L.push({ c: c, etapa: etapa, n: r.n, msg: r.msg, motor: !!motor && r.n === 'vazio' }); }
    var temTipo = !vazio(F.sistema.tipoManual), bombaModo = F.fonte.modo === 'bomba' || F.fonte.tipo === 'inferior', PR = F.norma === 'PR';
    // 1 Identificação
    p('ident.obra', POS.ident, vazio(F.ident.obra) ? Z('Digite o nome da obra. Exemplo: Edifício Aurora') : null);
    p('norma', POS.ident, vazio(F.norma) ? Z('Escolha a norma do projeto: São Paulo (IT 22) ou Paraná (NPT 022).') : null, true);
    // 2 Edificação e sistema (2.5.3: uma etapa só)
    p('sistema.divisao', POS.edif, vazio(F.sistema.divisao) ? Z('Escolha a divisão de ocupação da edificação.') : null);
    p('sistema.area', POS.edif, positivo(F.sistema.area, 'a área da edificação em m²', '1.000 se escreve 1000'), !temTipo);
    if (ctx.precisaCarga || !vazio(F.sistema.carga)) { var rc = vazio(F.sistema.carga) ? Z('Digite a carga de incêndio em MJ/m² (IT 14): a coluna desta divisão depende dela. Exemplo: 700') : (isNaN(num(F.sistema.carga)) || num(F.sistema.carga) < 0 ? E(SO_NUM + '700') : null); p('sistema.carga', POS.edif, rc); }
    if (F.norma === 'SP' && !vazio(F.sistema.altura)) { var va = num(F.sistema.altura); p('sistema.altura', POS.edif, isNaN(va) ? E(SO_NUM + '9') : (va < 0 ? E('A altura da edificação não pode ser negativa. Digite 0 para edificação térrea.') : null)); }   /* 2.7.0 (FC-041): opcional; só SP lê */
    p('sistema.coluna', POS.edif, vazio(F.sistema.coluna) ? Z(vazio(F.sistema.divisao) ? 'Escolha a divisão de ocupação: o enquadramento vem da tabela da norma.' : 'Escolha uma das soluções que a tabela da norma permite para esta divisão.') : null, !temTipo);
    p('conf.tipo', POS.sistema, F.conf.tipo ? null : Z('Confirme o tipo de sistema.'));
    p('C', POS.rede, positivo(F.C, 'o fator C de Hazen-Williams', '120'), true);
    // Rede
    F.trechos.forEach(function (t, i) {
      ['de', 'para', 'L'].forEach(function (k) { p('trechos.' + i + '.' + k, POS.rede, k !== 'L' && F.fonte.modo === 'gravidade' && String(t[k]).trim() === 'BI' ? E('Neste abastecimento não há bomba: troque BI por outro nome.') : campoTrecho(F, i, k), true); });   /* 2.6.0: sem bomba, BI não é nó válido; 2.7.0 (FC-020): só 'BI' exato, como o motor (nó é sensível a maiúsculas) */
      if (!vazio(t.C)) { var vc = num(t.C); p('trechos.' + i + '.C', POS.rede, isNaN(vc) ? E(SO_NUM + '120') : (vc < 60 || vc > 160 ? E('Fator C fora da faixa das tabelas (de 60 a 160). Em branco vale o fator C do projeto.') : null)); }
      Object.keys(t.pecas || {}).forEach(function (id) { p('trechos.' + i + '.pecas.' + id, POS.rede, inteiro(t.pecas[id])); });
      if (ctx.dnsDoTipo && t.tipo) { var dd = ctx.dnsDoTipo(t.tipo); if (dd.indexOf(+t.dn) < 0) p('trechos.' + i + '.tipo', POS.rede, E('Este tipo de tubo não tem DN' + t.dn + ' na tabela da base. Troque o diâmetro ou o tipo.')); }
    });
    var hidNos = {}; (F.hidrantes || []).forEach(function (h) { hidNos[h.no] = 1; });
    var adjR = grafo(F);
    nosDaRede(F).forEach(function (n) {
      if (hidNos[n]) return;
      if (n === 'RI' || n === 'BI') return;   // 2.5.1: pedidas no Abastecimento, antes da rede
      if ((adjR[n] || []).length >= 3 || !vazio(F.nos[n])) p('nos.' + n, POS.rede, cota(F.nos[n], 'a cota do nó ' + n + ', onde a rede deriva'), true);   // nó de passagem (dois trechos) não precisa de cota
    });
    // Hidrantes
    (F.hidrantes || []).forEach(function (h, i) {
      p('nos.' + h.no, POS.rede, cota(F.nos[h.no], 'a cota da válvula do hidrante ' + h.no + ' (coluna da cota no nó do hidrante)'), true);   // 2.5.0: lançada na tabela da rede
    });
    // Hidrantes: dados do esguicho e da mangueira (2.2): valor alterado é aceito, com alerta, marcado e levado ao relatório
    var lc = F.lanc;
    if (lc && lc.of) {
      var of = lc.of, alt = ctx.lancAlt || function () { return false; };   /* A fonte do valor alterado não é pedida */
      [['Q', 'a vazão por jato em L/min', ' L/min'], ['P', 'a pressão mínima em mca', ' mca'], ['L', 'o comprimento da mangueira em metros', ' m'], ['alcance', 'o alcance exigido do jato em metros', ' m']].forEach(function (q) {
        var k = q[0], e = positivo(lc[k], q[1], String(of[k]));
        if (!e && k === 'P' && num(lc.P) > 100) e = E('A pressão mínima não passa de 100 mca, que é o limite da norma na válvula.');
        if (!e && alt(k)) e = A('Diferente da tabela oficial (' + String(of[k]).replace('.', ',') + q[2] + '). O valor é aceito, fica marcado como alterado e vai para o relatório.');
        p('lanc.' + k, POS.hidr, e, true);
      });
      if (alt('dn')) { p('lanc.dn', POS.hidr, A('Diferente da tabela oficial (' + of.dn + ' mm). O valor é aceito, fica marcado como alterado e vai para o relatório.')); }
      if (PR && !lc.PeAuto) {
        var ep = positivo(lc.Pe, 'a pressão de projeto na entrada do esguicho, em mca', '23');
        if (!ep && num(lc.Pe) > 100) ep = E('A pressão na entrada do esguicho não passa de 100 mca, que é o limite da norma na válvula.');
        if (!ep && lc.PeMin !== null && num(lc.Pe) < lc.PeMin - 0.005) ep = A('Abaixo da mínima calculada (' + lc.PeMin.toFixed(2).replace('.', ',') + ' mca): o esguicho não entrega a vazão ou a pressão na ponta. O valor é aceito e a verificação V01 acusa.');
        p('lanc.Pe', POS.hidr, ep, true);
      }
    }
    function red(base, x) {
      if (!x.red) return;
      var e = positivo(x.redP, 'a pressão de saída regulada da válvula redutora, em mca', '60');
      if (!e && num(x.redP) > 100) e = E('A regulagem não passa de 100 mca, que é o limite da norma na válvula. Digite a pressão de saída do catálogo da válvula.');
      p(base + '.redP', POS.hidr, e, true);
    }
    (F.hidrantes || []).forEach(function (h, i) { red('hidrantes.' + i, h); });
    (F.cotasExtras || []).forEach(function (c, i) { red('cotasExtras.' + i, c); });
    (F.cotasExtras || []).forEach(function (c, i) {
      p('cotasExtras.' + i + '.nome', POS.hidr, vazio(c.nome) ? Z('Digite o nome do pavimento. Exemplo: 2º subsolo') : null, true);
      p('cotasExtras.' + i + '.z', POS.hidr, cota(c.z, 'a cota da válvula mais baixa do pavimento'), true);
    });
    // Abastecimento (2.5.1: antes da Rede). Nível X calculado pela Tabela B.1.
    var fo = F.fonte, tipoF = fo.tipo || (fo.modo === 'bomba' ? 'inferior' : fo.modo ? 'elevado' : ''), tipF = fo.tip || (tipoF ? (fo.resForma === 'cil' ? 'cil' : 'ret') : ''), inferior = tipoF === 'inferior', elevado = tipoF === 'elevado';
    p('fonte.tipo', POS.abast, vazio(tipoF) ? Z('Escolha de onde vem a pressão: de um reservatório inferior com bomba, ou de um reservatório elevado.') : null, true);
    if (!vazio(tipoF)) p('fonte.tip', POS.abast, vazio(tipF) ? Z('Escolha o tipo do reservatório.') : (tipF === 'piscina' && (PR || elevado) ? E(PR ? 'O programa trata a piscina só em São Paulo e como reservatório inferior. Escolha outro tipo.' : 'O programa trata a piscina só como reservatório inferior com bomba. Escolha outro tipo.') : null), true);
    if (elevado && !vazio(tipF)) p('fonte.elevModo', POS.abast, vazio(fo.elevModo || fo.modo) ? Z('Escolha se o reservatório elevado tem bomba de reforço ou entrega só por gravidade.') : null, true);
    if (!vazio(tipoF) && !vazio(tipF)) {
      var nx = nivelX(F), tubo = tipF === 'ret' || tipF === 'cil' || tipF === 'tronco' || tipF === 'piscina', ehTaca = tipF === 'taca_seca' || tipF === 'taca_molhada', ehTorre = tipF === 'torre', ehSP = tipF === 'standpipe';
      var saidaOk = !tubo && !ehSP ? true : (ehSP ? (fo.saida === 'base' || fo.saida === 'acima') : inferior ? (tipF === 'tronco' ? (fo.saida === 'lateral' || fo.saida === 'cima') : (fo.saida === 'lateral' || fo.saida === 'cima' || fo.saida === 'fundo')) : (tipF === 'tronco' || fo.saida === 'lateral' || fo.saida === 'fundo'));
      if (tubo || ehSP) p('fonte.saida', POS.abast, !saidaOk ? Z('Escolha como a água sai do reservatório.') : null, true);
      if (!ehTaca && !ehSP) p('fonte.zFundo', POS.abast, cota(fo.zFundo, ehTorre ? 'a cota do fundo do tanque' : 'a cota do fundo do reservatório'), true);
      if (ehTaca) p('fonte.zFundoCuba', POS.abast, cota(fo.zFundoCuba, 'a cota do fundo da cuba'), true);
      if (tipF === 'taca_molhada' || ehSP) p('fonte.zBase', POS.abast, cota(fo.zBase, 'a cota da base'), true);
      if (tipF === 'taca_seca' || ehTorre) p('fonte.zSaida', POS.abast, cota(fo.zSaida, 'a cota da saída na base'), true);
      p('fonte.dnSuc', POS.abast, !(+fo.dnSuc > 0) ? Z(inferior ? 'Escolha o DN da sucção.' : 'Escolha o DN da saída do reservatório.') : (nx.foraTabela ? E('A Tabela B.1 vai até DN250. Escolha um DN até 250.') : (nx.notas.length ? A(nx.notas[0]) : null)), true);
      var usaTomada = inferior || (tubo && fo.saida === 'lateral' && tipF !== 'tronco') || tipF === 'taca_molhada' || (ehSP && fo.saida === 'acima');
      if (usaTomada && !vazio(fo.zTomada)) { var rt = cota(fo.zTomada, 'a cota real da tomada'); if ((!rt || rt.n === 'alerta') && nx.abaixo) rt = E('A tomada fica abaixo do mínimo (' + nx.minTopo.toFixed(3).replace('.', ',') + ' m)' + (inferior ? ', que guarda a dimensão B da Tabela B.1 acima do fundo.' : ': a face superior do tubo não fica abaixo do fundo mais o diâmetro.') + ' Suba a tomada ou deixe o campo em branco.'); p('fonte.zTomada', POS.abast, rt, true); }
      if (ehSP && fo.saida === 'acima') p('fonte.zTomada', POS.abast, cota(fo.zTomada, 'a cota da face superior da saída'), true);
      if (fo.poco && (tipF === 'ret' || tipF === 'cil' || tipF === 'piscina' || ehTorre)) { p('fonte.pocoProf', POS.abast, positivo(fo.pocoProf, 'a profundidade do poço de sucção em metros', '0,50'), true); if (!vazio(fo.pocoLado)) p('fonte.pocoLado', POS.abast, positivo(fo.pocoLado, 'o lado do poço em metros', '1,20')); }
      if (inferior && fo.anti && nx.anti && !vazio(fo.antiH)) { var va = num(fo.antiH); p('fonte.antiH', POS.abast, isNaN(va) ? E(SO_NUM + '0,10') : (va < 0 ? E('A altura do dispositivo não pode ser negativa.') : null), true); }
      if (inferior && fo.anti && nx.anti && fo.saida === 'cima' && !vazio(fo.antiBocal)) p('fonte.antiBocal', POS.abast, positivo(fo.antiBocal, 'o diâmetro do bocal em milímetros', '130'), true);   /* 2.7.0 (FC-029) */
      if (!vazio(fo.zConsumo)) { var rc = cota(fo.zConsumo, 'a cota da tomada de consumo'); if ((!rc || rc.n === 'alerta') && nx.ok && !isNaN(num(fo.zConsumo)) && num(fo.zConsumo) <= nx.nivelReserva) rc = E('A tomada de consumo precisa ficar acima ' + (inferior ? 'do nível X calculado (' + nx.nivelReserva.toFixed(3).replace('.', ',') + ' m).' : 'da referência da altura.')); p('fonte.zConsumo', POS.abast, rc); }
      if (tipF === 'ret') { p('fonte.resC', POS.abast, positivo(fo.resC, 'o comprimento interno do reservatório em metros', '4,00')); p('fonte.resL', POS.abast, positivo(fo.resL, 'a largura interna do reservatório em metros', '3,00')); }
      else if (tipF === 'piscina') {   /* 2.7.0 (FC-027) */
        if (fo.resForma === 'area') p('fonte.resArea', POS.abast, positivo(fo.resArea, 'a área do espelho d\'água em m²', '32,00'));
        else { p('fonte.resC', POS.abast, positivo(fo.resC, 'o comprimento interno da piscina em metros', '8,00')); p('fonte.resL', POS.abast, positivo(fo.resL, 'a largura interna da piscina em metros', '4,00')); }
        if (!vazio(fo.zRaso)) { var rr = cota(fo.zRaso, 'a cota do fundo na parte rasa'); if ((!rr || rr.n === 'alerta') && !isNaN(num(fo.zRaso)) && !isNaN(num(fo.zFundo)) && num(fo.zRaso) <= num(fo.zFundo)) rr = E('A parte rasa precisa ficar acima do fundo da parte funda. Em branco, o fundo é plano.'); p('fonte.zRaso', POS.abast, rr); }
      }
      else if (tipF === 'cil' || ehTorre || ehSP) p('fonte.resD', POS.abast, positivo(fo.resD, ehSP ? 'o diâmetro interno da coluna em metros' : 'o diâmetro interno do reservatório em metros', '3,00'));
      else if (tipF === 'tronco') { p('fonte.troncoDb', POS.abast, positivo(fo.troncoDb, 'o diâmetro interno da base da caixa em metros', '2,40')); p('fonte.troncoDt', POS.abast, positivo(fo.troncoDt, 'o diâmetro interno do topo da caixa em metros', '3,00')); p('fonte.troncoH', POS.abast, positivo(fo.troncoH, 'a altura da caixa em metros', '2,00')); }
      else if (ehTaca) {
        if (fo.cubaForma === 'tronco') { p('fonte.troncoDb', POS.abast, positivo(fo.troncoDb, 'o diâmetro interno da base da cuba em metros', '4,00')); p('fonte.troncoDt', POS.abast, positivo(fo.troncoDt, 'o diâmetro interno do topo da cuba em metros', '6,00')); p('fonte.troncoH', POS.abast, positivo(fo.troncoH, 'a altura da cuba em metros', '3,00')); }
        else p('fonte.resD', POS.abast, positivo(fo.resD, 'o diâmetro interno da cuba em metros', '6,00'));
        if (tipF === 'taca_molhada') p('fonte.colD', POS.abast, positivo(fo.colD, 'o diâmetro interno da coluna em metros', '1,20'));
      }
      if (inferior) p('nos.BI', POS.abast, cota(F.nos.BI, 'a cota do eixo da bomba'), true);
      else if (fo.elevModo === 'reforco') p('nos.BI', POS.abast, cota(F.nos.BI, 'a cota do eixo da bomba de reforço'), false);
      var rz = cota(fo.zCheio, 'a cota do nível normal da água (reservatório cheio)');
      if ((!rz || rz.n === 'alerta') && inferior && !isNaN(num(fo.zX)) && num(fo.zCheio) <= num(fo.zX)) rz = E('O nível normal da água precisa ficar acima do nível X calculado (' + String(fo.zX) + ' m).');
      if ((!rz || rz.n === 'alerta') && !isNaN(num(fo.zFundo)) && num(fo.zCheio) <= num(fo.zFundo)) rz = E('O nível normal da água precisa ficar acima do fundo do reservatório.');
      p('fonte.zCheio', POS.abast, rz, !vazio(F.bomba.id));
    }
    p('ambiente.altitude', POS.ident, tabela(F.ambiente.altitude, ctx.altitudes || [0, 3000], 'a altitude do município em metros', '700'), true);
    p('ambiente.temperatura', POS.ident, tabela(F.ambiente.temperatura, ctx.temperaturas || [0, 100], 'a temperatura da água em °C', '20'), true);
    // 7 Bomba e automação
    if (F.fonte.modo !== 'gravidade') p('bomba.id', POS.bomba, vazio(F.bomba.id) ? Z('Escolha a bomba de incêndio.') : null);
    // 2.5.4: campo do NPSH no cartão Bomba escolhida, sem exemplo. Valor que não é número fica como conferência, sem suspender o cálculo:
    // suspenso, o cartão do campo sumia da tela e não deixava corrigir ("2." no meio da digitação)
    var suc = succaoDe(F), sNeg = !!(suc && suc.npshObrigatorio), vnr = num(F.bomba.npshr);   /* 2.6.0: NPSH pedido na negativa e, no PR, em qualquer estado */
    if (!vazio(F.bomba.npshr)) p('bomba.npshr', POS.bomba, isNaN(vnr) ? A('Use só número, com vírgula decimal.') : vnr <= 0 ? A('O NPSH requerido precisa ser maior que zero.') : null);
    else if (sNeg && !vazio(F.bomba.id) && !ctx.npshCurva) p('bomba.npshr', POS.bomba, A('Informe o NPSH requerido da bomba escolhida, lido na curva do catálogo.'));
    if (!vazio(F.pressostatoDif)) { var vpd = num(F.pressostatoDif); p('pressostatoDif', POS.bomba, isNaN(vpd) ? A('Use só número, com vírgula decimal.') : vpd < 1 || vpd > 20 ? A('Informe o diferencial de acionamento entre 1 e 20 mca. Fora disso vale o da norma.') : null); }   /* FC-073 */
    if (ctx.jockeyExigida) p('jockey.id', POS.bomba, vazio(F.jockey.id) ? Z('Este sistema exige bomba de pressurização (jockey). Escolha o modelo.') : null);
    if (bombaModo) {
      if (!F.recalque.ativo) { /* 2.5.3: o recalque é opcional; sem ele o projeto calcula e avança, sem aviso */ }
      else if (F.recalque.no || (vazio(F.recalque.z) && vazio(F.recalque.L))) {   // 2.5.0: recalque escolhido entre os pontos da rede
        var rr = F.recalque.no ? ramoRecalque(F, F.recalque.no) : null;
        p('recalque.no', POS.rede, !F.recalque.no ? Z('Escolha na lista o ponto da rede que é o recalque. Lance antes, na tabela, o ramo até ele (por exemplo, um trecho que termina em REC1).') : (!rr.ok ? E(rr.msg) : null));
        if (rr && rr.ok) p('nos.' + F.recalque.no, POS.rede, cota(F.nos[F.recalque.no], 'a cota da entrada do recalque (nó ' + F.recalque.no + ', na etapa Rede)'));
        p('recalque.tipo', POS.rede, vazio(F.recalque.tipo) ? Z('Escolha o tipo e a posição do dispositivo de recalque (' + (PR ? 'NPT 022, 5.3.2' : 'IT 22, 4.3.2') + ').') : null);
      }
      else { p('recalque.tipo', POS.rede, vazio(F.recalque.tipo) ? Z('Escolha o tipo e a posição do dispositivo de recalque (' + (PR ? 'NPT 022, 5.3.2' : 'IT 22, 4.3.2') + ').') : null); p('recalque.z', POS.rede, cota(F.recalque.z, 'a cota da entrada do recalque')); p('recalque.L', POS.rede, positivo(F.recalque.L, 'o comprimento do tubo do recalque em metros', '12')); if (!vazio(F.recalque.C)) { var cr = num(F.recalque.C); p('recalque.C', POS.rede, isNaN(cr) ? E(SO_NUM + '120') : (cr < 60 || cr > 160 ? E('Fator C fora da faixa das tabelas (de 60 a 160). Em branco vale o fator C do projeto.') : null)); } Object.keys(F.recalque.pecas || {}).forEach(function (id) { p('recalque.pecas.' + id, POS.rede, inteiro(F.recalque.pecas[id])); }); }
      if (PR) {
        if (!F.retorno.ativo) p('retorno.ativo', POS.bomba, Z('Lance o ramal de retorno para testes.'));
        else { p('retorno.zDescarga', POS.bomba, cota(F.retorno.zDescarga, 'a cota onde o retorno descarrega no reservatório')); F.retorno.trechos.forEach(function (t, i) { p('retorno.trechos.' + i + '.L', POS.bomba, positivo(t.L, 'o comprimento do tubo do ramal em metros', '3')); if (!vazio(t.C)) { var ct = num(t.C); p('retorno.trechos.' + i + '.C', POS.bomba, isNaN(ct) ? E(SO_NUM + '120') : (ct < 60 || ct > 160 ? E('Fator C fora da faixa das tabelas (de 60 a 160). Em branco vale o fator C do projeto.') : null)); } Object.keys(t.pecas || {}).forEach(function (id) { p('retorno.trechos.' + i + '.pecas.' + id, POS.bomba, inteiro(t.pecas[id])); }); }); }
      }
    }
    return L;
  }

  /** Critério de etapa completa. sit = resultado de FireEstado.avalia. Devolve [{n, completa, falta, erros, vazios}] para as etapas (oito desde a 2.5.3). */
  function etapas(F, sit) {
    var res = [], est = sit.av || [];
    for (var n = 1; n <= POS.rel; n++) {
      var cs = sit.campos.filter(function (c) { return c.etapa === n; }), er = cs.filter(function (c) { return c.n === 'erro'; }), vz = cs.filter(function (c) { return c.n === 'vazio'; }), falta = '';
      if (er.length) falta = 'corrigir ' + er.length + (er.length > 1 ? ' campos com valor inválido' : ' campo com valor inválido');
      else if (vz.length) falta = vz.length === 1 ? vz[0].msg.replace(/\.$/, '').replace(/^./, function (c) { return c.toLowerCase(); }) : 'preencher ' + vz.length + ' campos';
      if (n === POS.rede && !falta) { if (!F.trechos.length) falta = 'lançar a rede, com hidrante ligado ao reservatório'; else if (est.length) falta = 'ligar todos os trechos e hidrantes ao reservatório'; }
      if (n === POS.hidr && !falta && !(F.hidrantes || []).length) falta = 'lançar a rede com pelo menos um hidrante';
      if (n === POS.verif) { if (sit.k !== 'ok') falta = 'completar as etapas anteriores'; else { var ne = sit.R.verificacoes.filter(function (v) { return v.situacao === 'ERRO'; }).length; if (ne) falta = ne + (ne > 1 ? ' itens não atendem' : ' item não atende'); } }
      if (n === POS.rel && sit.k !== 'ok') falta = 'ter resultado calculado';
      res.push({ n: n, completa: !falta, falta: falta, erros: er.length, vazios: vz.length });
    }
    return res;
  }
  /** 2.5.0 (item 11): ramo do recalque escolhido entre os pontos da rede. O recalque recebe água da viatura e não se calcula: a partir do
   *  ponto, sobe pela rede (orientada a partir de RI) até o nó que alimenta algum hidrante por outro caminho; os trechos do caminho e os que
   *  ficam a jusante do ponto saem do cálculo. Registro: cota do ponto, DN do trecho que chega a ele e soma dos comprimentos. */
  function ramoRecalque(F, no) {
    var adj = grafo(F), pai = {}, ord = [], vis = { RI: 1 }, fila = ['RI'], n;
    no = String(no || '').trim();
    if (!adj[no]) return { ok: false, msg: 'O ponto ' + no + ' não está na rede. Lance o ramo do recalque na etapa Rede ou escolha outro ponto.' };
    while (fila.length) { n = fila.shift(); ord.push(n); (adj[n] || []).forEach(function (a) { if (!vis[a.n]) { vis[a.n] = 1; pai[a.n] = { n: n, i: a.i }; fila.push(a.n); } }); }
    if (no === 'RI' || no === 'BI' || ehHid(no)) return { ok: false, msg: 'O recalque não pode ser o reservatório, a bomba nem um hidrante.' };
    if (!vis[no]) return { ok: false, msg: 'O ponto ' + no + ' não está ligado ao reservatório.' };
    var hid = {}; ord.slice().reverse().forEach(function (x) { if (ehHid(x)) hid[x] = 1; if (pai[x] && hid[x]) hid[pai[x].n] = 1; });
    if (hid[no]) return { ok: false, msg: 'Há hidrante a jusante do ponto ' + no + '. O recalque é a ponta de um ramo sem hidrante.' };
    var idx = [], x = no;
    while (pai[x]) { idx.push(pai[x].i); x = pai[x].n; if (hid[x] || x === 'BI' || x === 'RI') break; }
    var sub = {}; sub[no] = 1; ord.forEach(function (y) { if (pai[y] && sub[pai[y].n]) { sub[y] = 1; idx.push(pai[y].i); } });
    var L = 0; idx.forEach(function (i) { L += num(F.trechos[i].L); });
    return { ok: true, idx: idx, deriva: x, dn: F.trechos[pai[no].i].dn, L: L, z: F.nos[no] };
  }
  /** Pontos da rede que podem ser o recalque: pontas de ramo ligadas ao reservatório, que não são RI, BI nem hidrante. */
  function pontosRecalque(F) {
    var adj = grafo(F), est = estrutura(F);
    return nosDaRede(F).filter(function (n) { return n !== 'RI' && n !== 'BI' && !ehHid(n) && (adj[n] || []).length === 1 && est.alc[n]; });
  }
  return { succaoEstado: succaoEstado, succaoDe: succaoDe, pocoMinimos: pocoMinimos, ramoRecalque: ramoRecalque, pontosRecalque: pontosRecalque, num: num, vazio: vazio, ehHid: ehHid, validar: validar, estrutura: estrutura, grafo: grafo, nosDaRede: nosDaRede, campoTrecho: campoTrecho, etapas: etapas, POS: POS, nivelX: nivelX, contaX: contaX, linhaB1: linhaB1, TAB_B1: TAB_B1 };
});
