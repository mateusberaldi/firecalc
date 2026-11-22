/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, gráficos em SVG (sem biblioteca): curva da bomba contra a curva do sistema e curva do hidrante,
 * com os eixos cruzados no ponto de seleção. É uma segunda conferência, visual, dos números da tabela: nada aqui entra no cálculo. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, S = U.S, esc = U.esc, fmt = U.fmt;
  function passo(max, n) { var b = max / n, p = Math.pow(10, Math.floor(Math.log(b) / Math.LN10)), f = b / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  /** o = {xmax, ymax, xl, yl, series: [{pts: [[x, y]], cor, rot, pontos, traco}], cruz: {x, y, rx, ry}, marcas: [{x, y, rot, cor}], aria} */
  U.grafico = function (o) {
    var W = 720, H = 340, mL = 56, mR = 16, mT = 14, mB = 44, pw = W - mL - mR, ph = H - mT - mB, dx = passo(o.xmax, 7), dy = passo(o.ymax, 6);
    var xm = Math.ceil(o.xmax / dx) * dx, ym = Math.ceil(o.ymax / dy) * dy, X = function (x) { return mL + pw * x / xm; }, Y = function (y) { return mT + ph * (1 - y / ym); }, casas = function (p) { return p < 1 ? 1 : 0; };
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '" class="graf">', i, v;
    for (i = 0; i * dx <= xm + 1e-9; i++) { v = i * dx; g += '<line x1="' + X(v) + '" y1="' + mT + '" x2="' + X(v) + '" y2="' + (mT + ph) + '" class="gl"/><text x="' + X(v) + '" y="' + (mT + ph + 16) + '" text-anchor="middle">' + fmt(v, casas(dx)) + '</text>'; }
    for (i = 0; i * dy <= ym + 1e-9; i++) { v = i * dy; g += '<line x1="' + mL + '" y1="' + Y(v) + '" x2="' + (mL + pw) + '" y2="' + Y(v) + '" class="gl"/><text x="' + (mL - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, casas(dy)) + '</text>'; }
    g += '<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '" fill="none" class="gb"/><text x="' + (mL + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="ge">' + esc(o.xl) + '</text><text transform="translate(14 ' + (mT + ph / 2) + ') rotate(-90)" text-anchor="middle" class="ge">' + esc(o.yl) + '</text>';
    o.series.forEach(function (s) {
      var pts = s.pts.filter(function (p) { return p[0] >= 0 && p[0] <= xm && p[1] >= 0 && p[1] <= ym; });
      if (pts.length > 1) g += '<polyline points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="' + s.cor + '" stroke-width="2.5"' + (s.traco ? ' stroke-dasharray="6 4"' : '') + ' stroke-linejoin="round"/>';
      if (s.pontos) pts.forEach(function (p) { g += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3.5" fill="var(--fc-superficie)" stroke="' + s.cor + '" stroke-width="2"/>'; });
    });
    if (o.cruz && o.cruz.x <= xm && o.cruz.y <= ym && o.cruz.y >= 0) {
      var cx = X(o.cruz.x), cy = Y(o.cruz.y);
      g += '<line x1="' + mL + '" y1="' + cy + '" x2="' + (mL + pw) + '" y2="' + cy + '" class="gc"/><line x1="' + cx + '" y1="' + mT + '" x2="' + cx + '" y2="' + (mT + ph) + '" class="gc"/><circle cx="' + cx + '" cy="' + cy + '" r="5.5" fill="var(--fc-fogo)" stroke="var(--fc-superficie)" stroke-width="2"/>' +
        '<text x="' + (cx + (cx > mL + pw - 150 ? -8 : 8)) + '" y="' + (mT + 12) + '" text-anchor="' + (cx > mL + pw - 150 ? 'end' : 'start') + '" class="gr">' + esc(o.cruz.rx) + '</text><text x="' + (mL + pw - 6) + '" y="' + (cy - 6) + '" text-anchor="end" class="gr">' + esc(o.cruz.ry) + '</text>';
    }
    (o.marcas || []).forEach(function (m) { if (m.x > xm || m.y > ym || m.y < 0) return; g += '<rect x="' + (X(m.x) - 5) + '" y="' + (Y(m.y) - 5) + '" width="10" height="10" transform="rotate(45 ' + X(m.x) + ' ' + Y(m.y) + ')" fill="' + m.cor + '" stroke="var(--fc-superficie)" stroke-width="2"/>'; });
    g += '</svg><div class="leg">' + o.series.filter(function (s) { return s.rot; }).map(function (s) { return '<span><i style="background:' + s.cor + '"></i>' + esc(s.rot) + '</span>'; }).join('') + (o.cruz ? '<span><i style="background:var(--fc-fogo);border-radius:50%"></i>' + esc(o.cruz.rot) + '</span>' : '') + (o.marcas || []).map(function (m) { return '<span><i style="background:' + m.cor + '"></i>' + esc(m.rot) + '</span>'; }).join('') + '</div>';
    return g;
  };
  /** Curva da bomba escolhida (pontos da tabela do catálogo, ligados, mais a pressão a vazão nula) contra a curva do sistema, com os eixos cruzados no ponto de projeto.
   *  2.6.0: sem os rótulos "ligação reta" e fonte do catálogo na legenda; com {card: true} vai dentro de um cartão (sem margem) e, sem bomba escolhida,
   *  mostra só a curva do sistema e o ponto de projeto. */
  U.graficoBomba = function (opt) {
    var sit = S.sit, esc0 = U.bombaDe(S.F.bomba.id), vb = opt && opt.ver && U.verBombaEf ? U.verBombaEf() : null, b = vb || esc0, card = !!(opt && opt.card); if (sit.k !== 'ok' || S.F.fonte.modo === 'gravidade' || (!b && !card)) return '';
    var n = sit.R.numeros, pt = vb ? M.pontoTrabalho(sit.R.ctx, sit.R.par, vb) : { semCruzamento: n.Qw === undefined, Qth: n.Qw, H: n.Hw }, pts = b ? b.pts.map(function (p) { return [p[1], p[0]]; }).sort(function (a, c) { return a[0] - c[0]; }) : [], qmax = b ? pts[pts.length - 1][0] : n.Qth * 1.5;
    var PAs = [], k; for (k = 1; k <= 40; k++) PAs.push(n.PA * 2.2 * k / 40);
    var sis = M.curvaSistema(sit.R.ctx, sit.R.par, PAs).map(function (p) { return [p.Qth, p.AMT]; }).filter(function (p) { return p[0] > 0; });
    var series = b ? [{ pts: [[0, b.shutoff]].concat(pts.slice(0, 1)), cor: 'var(--fc-agua)', traco: true }, { pts: pts, cor: 'var(--fc-agua)', rot: vb ? 'em visualização: ' + vb.modelo : 'bomba', pontos: true }] : [];
    series.push({ pts: sis, cor: 'var(--fc-texto-2)', rot: 'sistema' });
    return '<div class="des"' + (card ? '' : ' style="margin-top:14px"') + '>' + (vb ? '<p class="peq"><button type="button" class="bt lig min bt-voltar" data-vb="' + esc(S.F.bomba.id) + '" id="vb-voltar">Voltar à bomba escolhida</button></p>' : '') + U.grafico({ xmax: Math.max(qmax, n.Qth, pt.semCruzamento ? 0 : pt.Qth || 0) * 1.12, ymax: Math.max(b ? b.shutoff : 0, n.AMT) * 1.1, xl: 'Vazão (m³/h)', yl: 'Altura (mca)', aria: (b ? 'Curva da bomba ' + b.modelo + (vb ? ' (em visualização, não é a escolhida)' : '') + ' contra a curva do sistema' : 'Curva do sistema e ponto de projeto'),
      series: series,
      cruz: { x: n.Qth, y: n.AMT, rx: fmt(n.Qth, 2) + ' m³/h', ry: fmt(n.AMT, 2) + ' mca', rot: 'ponto de projeto' },
      marcas: b && !pt.semCruzamento && pt.Qth !== undefined ? [{ x: pt.Qth, y: pt.H, rot: 'ponto de trabalho: ' + fmt(pt.Qth, 1) + ' m³/h e ' + fmt(pt.H, 1) + ' mca', cor: 'var(--fc-sucesso, #1B7F3B)' }] : [] }) + '</div>';
  };
  /** 2.6.0: curva da bomba de pressurização escolhida (pontos do catálogo mais a pressão a vazão nula) e o ponto de partida: a vazão que ela dá na altura em que liga. */
  U.graficoJockey = function () {
    var sit = S.sit, jk = U.bombaDe(S.F.jockey.id);
    if (!jk) return '<p class="peq" id="curva-jockey-vazio">Escolha uma bomba na lista.</p>';
    var pts = jk.pts.map(function (p) { return [p[1], p[0]]; }).sort(function (a, c) { return a[0] - c[0]; }), n = sit.k === 'ok' ? sit.R.numeros : null, par = n && n.escada && n.Qjh !== undefined ? { x: n.Qjh, y: n.HjPartida } : null;
    return '<div class="des">' + U.grafico({ xmax: Math.max(pts[pts.length - 1][0], par ? par.x : 0) * 1.12, ymax: Math.max(jk.shutoff, par ? par.y : 0) * 1.1, xl: 'Vazão (m³/h)', yl: 'Altura (mca)', aria: 'Curva da bomba de pressurização ' + jk.modelo,
      series: [{ pts: [[0, jk.shutoff]].concat(pts.slice(0, 1)), cor: 'var(--fc-agua)', traco: true }, { pts: pts, cor: 'var(--fc-agua)', rot: 'bomba de pressurização', pontos: true }],
      cruz: par ? { x: par.x, y: par.y, rx: fmt(n.Qjl, 1) + ' L/min', ry: fmt(par.y, 1) + ' mca', rot: 'ponto de partida' } : null }) + '</div>';
  };
  /** Curva do hidrante: pressão na válvula em função da vazão. 2.6.0: o hidrante vem do clique na tabela das pressões (S.hidCurva); sem clique,
   *  o mais desfavorável. No par, os eixos se cruzam no ponto adotado; fora do par, na pressão dinâmica que chega à válvula com o par aberto (e a vazão que a curva dá a ela). */
  U.graficoHidrante = function () {
    var sit = S.sit; if (sit.k !== 'ok') return '';
    var n = sit.R.numeros, par = sit.R.par, hc = par.crit.hid.id, ho = par.out && !par.out.nulo ? par.out.hid.id : null, id = S.hidCurva || hc, j = null, pto = null;   /* tipo de duas expedições: o jato é H7.1, o hidrante é H7 */
    if (id === hc) { j = par.crit; pto = { x: n.Qcrit, y: n.Pvcrit, rot: 'ponto adotado no hidrante ' + id }; }
    else if (!par.unico && ho && id === ho) { j = par.out; pto = { x: n.Qout, y: n.Pvout, rot: 'ponto adotado no hidrante ' + id }; }
    else {
      j = (sit.R.ctx.jatos || []).filter(function (x) { return x.id === id || x.id === id + '.1'; })[0];
      var lp = M.pressoesHidrantes(sit.R.ctx, par).filter(function (x) { return x.id === id; })[0];
      if (!j || !lp) { id = hc; j = par.crit; pto = { x: n.Qcrit, y: n.Pvcrit, rot: 'ponto adotado no hidrante ' + id }; }
      else pto = { x: j.invPv(lp.din), y: lp.din, rot: 'pressão dinâmica com o par ' + n.par + ' aberto' };
    }
    var qm = Math.max(n.Qcrit, pto.x) * 1.7, pts = [], k, B = j.caminho === 'B';
    for (k = 0; k <= 40; k++) pts.push([qm * k / 40, j.Pv(qm * k / 40)]);
    var cat = B ? D.esguichos.filter(function (e) { return e.modelo === j.esguicho; }).map(function (e) { return [e.Q, e.P]; }) : [], ymax = Math.max(j.Pv(qm), pto.y, cat.reduce(function (m, p) { return Math.max(m, p[1]); }, 0));
    var series = [{ pts: pts, cor: 'var(--fc-agua)', rot: B ? 'pressão na válvula: esguicho do catálogo mais a perda na mangueira' : 'pressão na válvula: Q = K √P, com K de ' + fmt(j.Kv, 2) + ' (vazão e pressão do tipo ' + j.tipo.id + ')' }];
    if (cat.length) series.push({ pts: cat.sort(function (a, c) { return a[0] - c[0]; }), cor: 'var(--fc-texto-2)', rot: 'esguicho ' + j.esguicho + ': pontos do catálogo (pressão no esguicho)', pontos: true, traco: true });
    return '<div class="cartao bloco" id="curva-hidrante"><h2 class="t3">' + (id === hc ? 'Curva do hidrante mais desfavorável (' + esc(id) + ')' : 'Curva do hidrante ' + esc(id)) + '</h2><div class="des">' +
      U.grafico({ xmax: qm, ymax: ymax * 1.08, xl: 'Vazão (L/min)', yl: 'Pressão (mca)', aria: 'Curva de pressão e vazão do hidrante ' + id, series: series,
        cruz: { x: pto.x, y: pto.y, rx: fmt(pto.x, 1) + ' L/min', ry: fmt(pto.y, 2) + ' mca', rot: pto.rot } }) + '</div></div>';
  };
})();
