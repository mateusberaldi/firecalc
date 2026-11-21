/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.6.0: etapa Abastecimento refeita. Fonte de pressão em dois botões com desenho, tipo do reservatório em botões pela rota,
 * menu sobreposto com saída, cotas, medidas, bomba, particularidades e modo avançado, cartão de dados, desenho com os níveis e comentários no rodapé.
 * O cálculo vem de V.nivelX (validacao.js); o motor só recebe os campos (a carga própria entra no cálculo pelo motor). */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, V = U.V, S = U.S, E = U.E, esc = U.esc, fmt = U.fmt, SV = window.FireSVG;

  /** Reserva de incêndio pedida pela tabela, pela classificação da etapa 2 (não depende da rede lançada). */
  U.rtiTabela = function () {
    var F = S.F, a = V.num(F.sistema.area); if (!F.norma || !F.sistema.coluna || isNaN(a) || a <= 0) return null;
    var to = U.tipoObj(), rp = M.reservaPedida(D, F.norma, U.sistemaMotor(), to ? to.id : null); return rp && rp.rti !== undefined && rp.rti !== null ? rp.rti : null;
  };

  var FONTES = {
    inferior: ['Reservatório inferior com bomba', '', 'fonte_inferior'],
    elevado: ['Reservatório elevado', '', 'fonte_elevado']
  };
  var TIPOS_INF = [['ret', 'Retangular', 'Concreto ou alvenaria, de planta retangular.', 'in_retangular'], ['cil', 'Cilíndrico', 'Metálico ou de concreto, de planta circular.', 'in_cilindrico'], ['tronco', 'Caixa de polietileno ou fibra', 'Formato de tronco de cone.', 'in_polietileno']];
  var TIPOS_ELE = [['ret', 'Retangular', 'Concreto ou alvenaria.', 'el_concreto'], ['cil', 'Cilíndrico', 'Metálico ou de concreto.', 'el_cilindrico'], ['tronco', 'Caixa de polietileno ou fibra', 'Tronco de cone sobre laje.', 'el_polietileno'],
    ['taca_seca', 'Taça seca', 'Cuba larga sobre uma coluna seca.', 'el_taca_seca'], ['taca_molhada', 'Taça molhada', 'Cuba larga sobre uma coluna cheia de água.', 'el_taca_molhada'], ['torre', 'Torre', 'Tanque alto sobre estrutura, com saída na base.', 'el_torre'], ['standpipe', 'Standpipe', 'Coluna alta e estreita, cheia de água.', 'el_standpipe']];
  var SAIDAS_INF = [['lateral', 'Saída lateral', 'Tubo que sai pela parede, junto ao fundo.', 'sai_lateral'], ['cima', 'Tubo por cima', 'Tubo que entra por cima e mergulha até perto do fundo.', 'sai_superior'], ['fundo', 'Saída pelo fundo', 'Tubo que atravessa o fundo e desce.', 'sai_inferior']];
  var SAIDAS_ELE = [['fundo', 'Saída pelo fundo', 'A altura é medida do fundo.', 'ele_fundo'], ['lateral', 'Saída lateral', 'A altura é medida da face superior do tubo.', 'ele_lateral']];
  var SAIDAS_SP = [['base', 'Saída na base', 'Tubo que sai pela base da coluna.', 'sp_base'], ['acima', 'Saída acima da base', 'Tubo que sai da coluna acima da base.', 'sp_acima']];
  var ELEV_MODO = [['reforco', 'Com bomba de reforço', 'A bomba reforça a pressão do elevado.', 'reforco'], ['gravidade', 'Só gravidade', 'A pressão vem só da altura da água.', 'gravidade']];

  function nomeTipo(tipo, tip) { var l = (tipo === 'inferior' ? TIPOS_INF : TIPOS_ELE).filter(function (x) { return x[0] === tip; })[0]; return l ? l[1] : ''; }
  function botao(id, acao, v, on, svg, titulo, texto, attr) {
    return '<button type="button" class="ab-bt' + (on ? ' on' : '') + '" id="' + id + '" ' + (attr || 'data-acao') + '="' + acao + '" data-v="' + v + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + SV.abast(svg) + '<b>' + titulo + '</b>' + (texto ? '<span>' + texto + '</span>' : '') + '</button>';
  }
  function grupo(idTit, lista, atual, prefixo, acao, attr) {
    return '<div class="ab-bts" role="group" aria-labelledby="' + idTit + '">' + lista.map(function (x) { return botao(prefixo + x[0], acao, x[0], atual === x[0], x[3], x[1], x[2], attr); }).join('') + '</div>';
  }

  /* ---------- tela ---------- */
  function blocoFonte() {
    var fo = S.F.fonte, m = U.msg('fonte.tipo');
    return '<div class="cartao bloco" id="ab-fonte"><h2 class="t3" id="ab-fonte-t">De onde vem a pressão?</h2>' +
      '<div class="ab-bts" role="group" aria-labelledby="ab-fonte-t">' + ['inferior', 'elevado'].map(function (k) { var t = FONTES[k]; return botao('ab-fonte-' + k, 'fonte', k, fo.tipo === k, t[2], t[0], t[1]); }).join('') + '</div>' +
      (m ? '<div class="msg-er" id="ab-fonte-m">' + esc(m.msg) + '</div>' : '') + '</div>';
  }
  function blocoTipo() {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', m = U.msg('fonte.tip');
    return '<div class="cartao bloco" id="ab-tipo"><h2 class="t3" id="ab-tipo-t">Que tipo de reservatório?</h2>' + grupo('ab-tipo-t', inf ? TIPOS_INF : TIPOS_ELE, fo.tip, 'ab-tip-', 'tip') +
      (m ? '<div class="msg-er" id="ab-tipo-m">' + esc(m.msg) + '</div>' : '') + '</div>';
  }
  function linhaDado(id, valor, un, texto) { return '<div id="' + id + '"><b>' + valor + '</b>' + un + ', ' + texto + '</div>'; }
  var ROT_SUC = { afogada: ['ok', 'Bomba afogada'], positiva: ['al', 'Sucção positiva, dentro da tolerância'], negativa: ['al', 'Sucção negativa'] };
  function cartaoDados(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', rt = U.rtiTabela(), h = '<div class="cartao bloco" id="ab-dados" aria-live="polite"><h2 class="t3">Dados do reservatório <span class="pilula p-in">calculado</span></h2>';
    if (!r.ok) return h + '<p class="peq" id="x-falta">O resultado aparece quando você informar ' + esc(r.falta.join(', ')) + '.</p>' + btnAbrir(true) + '</div>';
    h += '<div class="dados">' + linhaDado('x-valor', fmt(r.X, 3), 'm', inf ? 'cota do nível X' : 'cota de referência da altura') +
      (r.hProp > 0 ? linhaDado('x-prop', fmt(r.hProp, 3), 'm', 'carga própria da coluna, entre a referência e a saída na base') : '') +
      (inf && r.faixa > 0 ? linhaDado('x-faixa', fmt(r.faixa, 3), 'm', 'de água acima do fundo que não contam como reserva') : '') +
      (r.reserva !== undefined ? linhaDado('x-reserva', fmt(r.reserva, 2), 'm³', 'reserva efetiva') : '') + (rt !== null ? linhaDado('x-tabela', fmt(rt, 0), 'm³', 'reserva de incêndio pedida pela tabela') : '') + '</div>';
    if (r.reserva !== undefined && rt !== null) h += r.reserva >= rt - 1e-9 ? '<p class="peq" id="x-sit">' + U.pilula('ok', 'Reserva suficiente') + ' ' + fmt(r.reserva, 2) + ' m³ contra ' + fmt(rt, 0) + ' m³ da tabela.</p>' : '<div id="x-sit">' + U.aviso('er', '<b>Reserva insuficiente:</b> ' + fmt(r.reserva, 2) + ' m³ contra ' + fmt(rt, 0) + ' m³ da tabela. Aumente as medidas do reservatório ou a altura entre o nível normal e o ' + (inf ? 'nível X' : 'nível de referência') + '.') + '</div>';
    else if (r.reserva === undefined) h += '<p class="peq" id="x-sit">A reserva efetiva aparece com o nível normal da água e as medidas do reservatório.</p>';
    else h += '<p class="peq" id="x-sit">A reserva pedida pela tabela aparece quando a classificação da etapa Edificação e sistema estiver completa.</p>';
    if (inf && r.succao) h += '<p class="peq" id="x-succao">' + U.pilula(ROT_SUC[r.succao.estado][0], ROT_SUC[r.succao.estado][1]) + ' O eixo da bomba fica ' + fmt(Math.abs(r.succao.g), 2) + ' m ' + (r.succao.g > 0 ? 'acima' : 'abaixo') + ' do nível X.</p>';
    r.alertas.forEach(function (a) { h += U.aviso('al', esc(a)); });
    r.notas.forEach(function (n) { h += U.aviso('al', esc(n)); });
    if (inf && r.poco && r.X < r.fundo) h += U.aviso('in', 'O nível X fica dentro do poço de sucção, abaixo do piso do reservatório: a reserva é contada do piso para cima.');
    if (fo.zXAnt && inf) { var za = V.num(fo.zXAnt); if (!isNaN(za)) h += U.aviso(Math.abs(za - r.X) > 0.0005 ? 'al' : 'in', 'Nível X informado antes: ' + fmt(za, 3) + ' m. Calculado agora: ' + fmt(r.X, 3) + ' m (diferença de ' + fmt(Math.abs(za - r.X), 3) + ' m). Os números do cálculo acompanham o valor calculado.'); }
    return h + btnAbrir(false) + '</div>';
  }
  function btnAbrir(pri) { return '<div class="linha-ac"><button type="button" class="bt' + (pri ? ' pri' : '') + '" id="ab-abrir" data-acao="abmenu" aria-haspopup="dialog">' + (pri ? 'Informar os dados do reservatório' : 'Alterar os dados do reservatório') + '</button></div>'; }

  /** Comentários do rodapé: o que a figura mostra e o que cuidar, sem item de norma (a norma fica nas Verificações). */
  function comentarios(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, c = [];
    if (inf) {
      c.push('A água entre o fundo e o nível X não conta como reserva de incêndio: a reserva é a água acima do nível X, até o nível normal.');
      c.push('O nível X sobe com o diâmetro da sucção: um DN maior pede mais água sobre a tomada para evitar vórtice e entrada de ar.');
      if (r.poco) c.push('Com poço de sucção, a tomada fica no poço e o nível X pode cair abaixo do piso. A água do poço não entra na reserva.');
      if (r.anti) c.push('Com dispositivo antivórtice, a dimensão A deixa de valer e o nível X fica na boca da tomada, mais a altura do dispositivo.');
      if (r.succao) c.push(r.succao.estado === 'afogada' ? 'Bomba afogada: o eixo fica abaixo do nível X, e a água chega à bomba por gravidade.' : r.succao.estado === 'positiva' ? 'O eixo da bomba fica pouco acima do nível X, dentro da tolerância de sucção positiva. Confira o NPSH na etapa da bomba.' : 'Sucção negativa: o eixo da bomba fica acima do nível X. Informe o NPSH requerido da bomba e confira o disponível na etapa da bomba.');
    } else {
      if (tip === 'taca_seca' || tip === 'torre') c.push('A coluna entre a saída na base e a referência da água tem carga própria, mostrada no cartão de dados.');
      else if (tip === 'taca_molhada') c.push('A coluna é cheia de água: a referência fica na face superior da saída, na base da coluna.');
      else if (tip === 'standpipe') c.push('No standpipe a referência é a base da coluna, ou a face superior da saída quando ela fica acima da base.');
      else c.push('A altura do elevado é medida da referência da água, que depende de a saída ser pelo fundo ou pela lateral.');
      c.push(fo.elevModo === 'reforco' ? 'Com bomba de reforço, informe a cota do eixo da bomba. A pressão do elevado e a da bomba somam-se na rede.' : fo.elevModo === 'gravidade' ? 'Só por gravidade: a pressão nos hidrantes vem da altura entre a referência e cada hidrante, descontadas as perdas.' : 'Escolha se o elevado tem bomba de reforço ou entrega só por gravidade.');
      c.push('A reserva efetiva é a água acima da referência, até o nível normal.');
    }
    if (!V.vazio(fo.zConsumo)) c.push('Com a tomada de consumo acima da referência, a reserva termina na tomada de consumo, e não no nível normal.');
    return '<div class="cartao bloco" id="ab-coment"><h2 class="t3">Comentários</h2><ul class="ab-coment">' + c.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }

  /* ---------- desenho com os níveis ---------- */
  function figura(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, n = V.num, zc = n(fo.zCheio);
    if (!r.ok) return '<div class="cartao bloco" id="fig-res"><h2 class="t3">Desenho do reservatório</h2><p class="peq">O desenho aparece com o tipo do reservatório, as cotas e o DN.</p></div>';
    var zbi = (inf || fo.elevModo === 'reforco') ? n(F.nos.BI) : NaN, taca = tip === 'taca_seca' || tip === 'taca_molhada', torre = tip === 'torre', sp = tip === 'standpipe';
    var zf = taca ? n(fo.zFundoCuba) : sp ? n(fo.zBase) : r.fundo, ref = r.X;
    var zbaseCol = tip === 'taca_molhada' ? n(fo.zBase) : (tip === 'taca_seca' || torre) ? n(fo.zSaida) : NaN, piso = inf && r.poco ? r.base : zf;
    var topoAgua = isNaN(zc) || zc <= ref ? Math.max(ref, zf) + 1.5 : zc;
    var vs = [piso, topoAgua, ref].concat(isNaN(zbi) ? [] : [zbi], isNaN(zbaseCol) ? [] : [zbaseCol]), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pd = Math.max(0.3, (hi - lo) * 0.14); lo -= pd; hi += pd;
    var T = 22, B = 238; function Y(z) { return B - (z - lo) / (hi - lo) * (B - T); }
    var yc = Y(topoAgua), yr = Y(ref), yf = Y(zf), yp = Y(piso), s = '', ext = 'var(--fc-texto-2)';
    function rot(y, t, forte, ev) { var yy = y + 4; if (ev !== undefined && Math.abs(yy - ev) < 13) yy = ev + (yy >= ev ? 13 : -13); return '<text x="262" y="' + yy + '"' + (forte ? ' font-weight="700"' : '') + '>' + t + '</text>'; }
    var xe = 40, xd = 240;   /* bordas do reservatório */
    if (taca) { /* cuba larga sobre coluna */
      var yb = isNaN(zbaseCol) ? yf + 40 : Y(zbaseCol), coluna = tip === 'taca_molhada';
      s += '<path d="M40 ' + (yc - 12) + 'V' + yf + 'H120V' + yb + 'M160 ' + yb + 'V' + yf + 'H240V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="41" y="' + yc + '" width="198" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--fc-info-fundo)"/>';
      if (coluna) s += '<rect x="121" y="' + yf + '" width="38" height="' + Math.max(0, yb - yf) + '" fill="var(--fc-info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="41" y="' + yr + '" width="198" height="' + (yf - yr - 1) + '" fill="var(--fc-superficie-2)"/>';
      if (!coluna) s += '<path d="M120 ' + yf + 'V' + yb + 'M160 ' + yf + 'V' + yb + '" stroke="' + ext + '" stroke-width="2" fill="none"/>';
      s += '<text class="s" x="140" y="' + (yb + 14) + '" text-anchor="middle">base ' + (isNaN(zbaseCol) ? '' : fmt(zbaseCol, 2)) + '</text>';
    } else if (torre || sp) {
      var xa = sp ? 110 : 80, xb = sp ? 170 : 200, yb2 = isNaN(zbaseCol) ? yf + 30 : Y(zbaseCol);
      if (sp) { yb2 = yf; }
      s += '<path d="M' + xa + ' ' + (yc - 12) + 'V' + yf + 'H' + xb + 'V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="' + (xa + 1) + '" y="' + yc + '" width="' + (xb - xa - 2) + '" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--fc-info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="' + (xa + 1) + '" y="' + yr + '" width="' + (xb - xa - 2) + '" height="' + (yf - yr - 1) + '" fill="var(--fc-superficie-2)"/>';
      if (torre) s += '<path d="M130 ' + yf + 'V' + yb2 + 'M150 ' + yf + 'V' + yb2 + '" stroke="' + ext + '" stroke-width="2" fill="none"/><text class="s" x="140" y="' + (yb2 + 14) + '" text-anchor="middle">saída na base ' + fmt(zbaseCol, 2) + '</text>';
      xe = xa; xd = xb;
    } else if (tip === 'tronco') {
      s += '<path d="M40 ' + (yc - 12) + 'L72 ' + yf + 'H208L240 ' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<path d="M' + (41 + (yf - yc) / Math.max(1, yf - yc + 12) * 30) + ' ' + yc + 'H' + (239 - (yf - yc) / Math.max(1, yf - yc + 12) * 30) + 'L208 ' + Math.min(yr, yf) + 'H72Z" fill="var(--fc-info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="73" y="' + yr + '" width="134" height="' + (yf - yr - 1) + '" fill="var(--fc-superficie-2)"/>';
    } else {
      s += '<path d="M40 ' + (yc - 12) + 'V' + yf + (inf && r.poco ? 'H150V' + yp + 'H240' : 'H240') + 'V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="41" y="' + yc + '" width="198" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--fc-info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="41" y="' + yr + '" width="198" height="' + (yf - yr - 1) + '" fill="var(--fc-superficie-2)"/>';
      if (inf && r.poco) s += '<rect x="151" y="' + Math.max(yr, yf) + '" width="88" height="' + Math.max(0, yp - Math.max(yr, yf) - 1) + '" fill="var(--fc-superficie-2)"/>';
    }
    s += '<line x1="30" x2="254" y1="' + yc + '" y2="' + yc + '" stroke="var(--fc-agua)" stroke-width="2"/>' + rot(yc, 'nível normal ' + (isNaN(zc) ? 'a informar' : fmt(zc, 2)));
    s += '<line x1="30" x2="254" y1="' + yr + '" y2="' + yr + '" stroke="var(--fc-fogo)" stroke-width="2" stroke-dasharray="6 4"/>' + rot(yr, (inf ? 'nível X ' : 'referência ') + fmt(ref, 3), true, yc + 4);
    if (!taca && !sp) s += '<text class="s" x="' + (inf && r.poco ? 96 : 140) + '" y="' + (yf + 14) + '" text-anchor="middle">fundo ' + fmt(zf, 2) + '</text>';
    else if (taca) s += '<text class="s" x="80" y="' + (yf + 14) + '" text-anchor="middle">fundo da cuba ' + fmt(zf, 2) + '</text>';
    else s += '<text class="s" x="140" y="' + (yf + 14) + '" text-anchor="middle">base ' + fmt(zf, 2) + '</text>';
    if (inf && yf - yr > 16) s += '<text class="s" x="' + (r.poco ? 96 : 140) + '" y="' + ((yr + yf) / 2 + 4) + '" text-anchor="middle">fora da reserva</text>';
    if (r.hProp > 0 && !isNaN(zbaseCol)) { var yz = Y(zbaseCol); s += '<line x1="' + (xd + 8) + '" x2="' + (xd + 8) + '" y1="' + yr + '" y2="' + yz + '" stroke="' + ext + '" stroke-width="1.5"/><text class="s" x="' + (xd + 14) + '" y="' + ((yr + yz) / 2 + 4) + '">carga própria ' + fmt(r.hProp, 2) + ' m</text>'; }
    /* saída do reservatório */
    if (inf || tip === 'ret' || tip === 'cil' || tip === 'tronco' || sp) {
      var yt = Y(r.topo), dpx = Math.max(6, Y(r.topo - r.D) - yt), lat = r.saida === 'lateral' || (sp && r.saida === 'acima') || (!inf && tip === 'tronco');
      if (lat) s += '<rect x="' + xd + '" y="' + yt + '" width="16" height="' + dpx + '" fill="var(--fc-agua)" opacity=".85"/>';
      else if (r.saida === 'fundo' || r.saida === 'base') s += '<rect x="' + (inf && r.poco ? 190 : 136) + '" y="' + yp + '" width="8" height="' + Math.min(18, 256 - yp) + '" fill="var(--fc-agua)" opacity=".85"/>';
      else s += '<path d="M254 ' + (yc - 22) + 'H200V' + yt + '" fill="none" stroke="var(--fc-agua)" stroke-width="7" opacity=".85"/>';
      if (inf && !r.anti && yt - yr > 8) s += '<line x1="222" x2="222" y1="' + yt + '" y2="' + yr + '" stroke="' + ext + '" stroke-width="1.5"/><text class="s" x="216" y="' + ((yt + yr) / 2 + 4) + '" text-anchor="end">A</text>';
      if (!isNaN(zbi)) s += '<path d="M' + (lat ? xd + 16 : 262) + ' ' + (lat ? yt + dpx / 2 : Y(zbi)) + 'H430V' + Y(zbi) + '" fill="none" stroke="var(--fc-agua)" stroke-width="3" opacity=".5"/>';
    }
    if (!isNaN(zbi)) s += '<circle cx="450" cy="' + Y(zbi) + '" r="15" fill="var(--fc-superficie)" stroke="var(--fc-agua)" stroke-width="2"/><text x="450" y="' + (Y(zbi) + 4) + '" text-anchor="middle" font-weight="700">BI</text><text class="s" x="472" y="' + (Y(zbi) + 4) + '">' + fmt(zbi, 2) + '</text>';
    var st = '';
    if (inf && !isNaN(zbi)) { var g = zbi - ref; st = g > 0 ? 'Pelas cotas, o eixo da bomba fica ' + fmt(g, 2) + ' m acima do nível X.' : 'Pelas cotas, o eixo da bomba fica ' + fmt(-g, 2) + ' m abaixo do nível X: bomba afogada.'; }
    var rotA = 'Corte esquemático do reservatório, ' + nomeTipo(fo.tipo, tip).toLowerCase() + '. Fundo na cota ' + fmt(zf, 2) + ' m, ' + (inf ? 'nível X na cota ' : 'referência da água na cota ') + fmt(ref, 3) + ' m' + (isNaN(zc) ? '' : ', nível normal na cota ' + fmt(zc, 2) + ' m') + '. ' + st;
    return '<div class="cartao bloco" id="fig-res"><h2 class="t3">Desenho do reservatório</h2><svg class="fig-res" viewBox="0 0 560 262" role="img" aria-label="' + esc(rotA) + '">' + s + '</svg><p class="peq">' + (st ? '<b>' + esc(st) + '</b> ' : '') + 'Esquema fora de escala na horizontal; as alturas seguem as cotas.</p></div>';
  }

  /* ---------- modo manual (nível X ou referência informados à mão) ---------- */
  function blocoManual() {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', rt = U.rtiTabela();
    var h = '<div class="grade g-fig"><div class="cartao bloco" id="x-manual"><h2 class="t3">Reservatório e cotas <span class="pilula p-al">' + U.IC.al + (inf ? 'nível X informado' : 'cotas informadas') + '</span></h2>' + (fo.xOrigem === 'antigo' ? U.aviso('in', 'Este projeto veio de uma versão anterior: os valores digitados continuam valendo.') : '') + '<div class="form">' +
      U.campo('nos.RI', inf ? 'Cota do fundo do reservatório (nó RI)' : 'Cota de referência da altura (nó RI)', { un: 'm', num: true }) +
      (inf ? U.campo('fonte.zX', 'Cota do nível X', { un: 'm', num: true, aj: 'Nível da água quando só resta a reserva de incêndio, acima da geratriz superior da tomada de sucção; veja o desenho.' }) : '') +
      U.campo('fonte.zCheio', 'Cota do reservatório cheio', { un: 'm', num: true, aj: 'Entra na pressão estática máxima.' }) +
      ((inf || fo.elevModo === 'reforco') ? U.campo('nos.BI', inf ? 'Cota do eixo da bomba (nó BI)' : 'Cota do eixo da bomba de reforço (nó BI)', { un: 'm', num: true, aj: inf ? 'Acima do nível X a sucção é negativa.' : '' }) : '') +
      (fo.tipo === 'elevado' ? U.escolha('fonte.elevModo', 'Entrega da água', ELEV_MODO.map(function (x) { return [x[0], x[1]]; }), { vazio: 'Escolha' }) : '') +
      U.campo('fonte.rtiEfetiva', 'Reserva de incêndio efetiva', { un: 'm³', num: true, aj: rt !== null ? 'A tabela pede ' + fmt(rt, 0) + ' m³.' : 'Comparada com a tabela da norma.' }) + '</div>' +
      '<div class="linha-ac" style="margin-top:12px"><button type="button" class="bt" data-acao="xmodo" data-v="calc">' + (inf ? 'Calcular o nível X' : 'Calcular pelos dados do reservatório') + '</button><span class="peq">Pede a saída do reservatório, a cota do fundo, o DN e as medidas; mostra a diferença para o valor informado.</span></div></div>';
    return h + U.figuraReservatorio() + '</div>';
  }

  U.telas[U.POS.abast] = function () {
    var F = S.F, fo = F.fonte, h = U.cab(U.POS.abast, 'Abastecimento', '');
    h += blocoFonte();
    if (!fo.tipo) return h;
    h += blocoTipo();
    if (!fo.tip) return h;
    if (fo.xModo !== 'calc') return h + blocoManual();
    var r = V.nivelX(F);
    h += '<div class="grade g-fig">' + cartaoDados(r) + figura(r) + '</div>';
    return h + comentarios(r);
  };

  /* ---------- troca de fonte e de tipo, com confirmação antes de apagar ---------- */
  U.abTroca = function (acao, v) {
    var F = S.F, fo = F.fonte, tipo = acao === 'fonte' ? v : fo.tipo, tip = acao === 'tip' ? v : fo.tip;
    if (acao === 'fonte' && fo.tipo === v) return;
    if (acao === 'tip' && fo.tip === v) { U.abMenu(); return; }
    if (acao === 'fonte' && (tip === 'taca_seca' || tip === 'taca_molhada' || tip === 'torre' || tip === 'standpipe') && v === 'inferior') tip = '';
    var perdidos = E.camposPerdidos(F, tipo, tip), aplica = function () {
      E.trocaRota(F, tipo, tip); S.tocados['fonte.tipo'] = 1; U.mudou();
      var b = document.getElementById(acao === 'fonte' ? 'ab-fonte-' + v : 'ab-tip-' + v); if (b) b.focus({ preventScroll: true });
      if (acao === 'tip') U.abMenu();
    };
    if (!perdidos.length) { aplica(); return; }
    U.dialogo('Trocar ' + (acao === 'fonte' ? 'a fonte de pressão' : 'o tipo do reservatório'), '<p>Esta troca apaga o que você já digitou e não vale para ' + (acao === 'fonte' ? 'a fonte nova' : 'o tipo novo') + ': ' + esc(perdidos.join(', ')) + '.</p><p>A cota do nível normal, o DN e a tomada de consumo ficam.</p>', [['Trocar e apagar', function () { aplica(); }, true], ['Manter como está', function () {}]]);
  };

  /* ---------- menu sobreposto ---------- */
  var snap = null, confirmou = false;
  function ajDnTxt() {
    var F = S.F, sg = E.dnSugerido(F, D, M), ts = E.trechoSuc(F);
    return (sg ? 'Sugerido: DN' + sg.dn + ' (' + fmt(sg.v, 2) + ' m/s com ' + fmt(sg.Q, 0) + ' L/min, a vazão de dois jatos da tabela; limite de ' + fmt(sg.lim, 1) + ' m/s na sucção negativa' + (sg.acima ? ', que nenhum DN deste tubo cumpre' : '') + '). ' : 'A sugestão aparece quando o tipo de sistema estiver definido. ') + (ts ? 'É o mesmo DN do trecho ' + esc(String(ts.de).trim() + '-' + String(ts.para).trim()) + ' da rede: trocar aqui ou lá muda os dois.' : 'Vira o DN do trecho que sai de RI quando a rede for lançada.');
  }
  function bloco(id, titulo, corpo, extra) { return '<section class="ab-m-bloco" id="abm-' + id + '" aria-labelledby="abm-' + id + '-t"><h3 id="abm-' + id + '-t">' + titulo + '</h3>' + (extra || '') + corpo + '</section>'; }
  function corpoMenu() {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, PR = F.norma === 'PR', h = '', r = V.nivelX(F);
    var tubo = tip === 'ret' || tip === 'cil' || tip === 'tronco', taca = tip === 'taca_seca' || tip === 'taca_molhada', torre = tip === 'torre', sp = tip === 'standpipe';
    h += '<h2 id="dlg-tit">Dados do reservatório: ' + esc(nomeTipo(fo.tipo, tip).toLowerCase()) + (inf ? ', inferior' : ', elevado') + '</h2>';
    if (!inf) h += bloco('elev', 'Entrega da água', grupo('abm-elev-t', ELEV_MODO, fo.elevModo, 'abm-elev-', 'elev', 'data-abm') + (U.msg('fonte.elevModo') ? '<div class="msg-er">' + esc(U.msg('fonte.elevModo').msg) + '</div>' : ''));
    /* saída */
    var lista = null; if (inf) lista = tip === 'tronco' ? SAIDAS_INF.filter(function (x) { return x[0] !== 'fundo'; }) : SAIDAS_INF; else if (sp) lista = SAIDAS_SP; else if (tip === 'ret' || tip === 'cil') lista = SAIDAS_ELE;
    if (lista) h += bloco('saida', 'Saída da água', grupo('abm-saida-t', lista, fo.saida, 'abm-saida-', 'saida', 'data-abm') + (U.msg('fonte.saida') ? '<div class="msg-er" id="abm-saida-m">' + esc(U.msg('fonte.saida').msg) + '</div>' : ''));
    /* cotas */
    var c = '<div class="form">';
    if (!taca && !sp) c += U.campo('fonte.zFundo', torre ? 'Cota do fundo do tanque' : 'Cota do fundo do reservatório', { un: 'm', num: true, aj: 'Face de dentro do fundo, onde a água se apoia.' });
    if (taca) c += U.campo('fonte.zFundoCuba', 'Cota do fundo da cuba', { un: 'm', num: true });
    if (tip === 'taca_molhada' || sp) c += U.campo('fonte.zBase', 'Cota da base', { un: 'm', num: true, aj: sp ? 'Base da coluna.' : 'Base da coluna cheia de água.' });
    if (tip === 'taca_seca' || torre) c += U.campo('fonte.zSaida', 'Cota da saída na base', { un: 'm', num: true, aj: 'Onde o tubo sai da base da coluna.' });
    c += U.campo('fonte.zCheio', 'Cota do nível normal da água', { un: 'm', num: true, aj: 'Reservatório cheio. Entra na reserva efetiva e na pressão estática máxima.' });
    var dns = U.dns().filter(function (d) { return d >= 50 || d === +fo.dnSuc; });
    c += U.escolha('fonte.dnSuc', inf ? 'DN da sucção' : 'DN da saída do reservatório', dns.map(function (d) { return [d, 'DN' + d]; }), { num: true, vazio: 'Escolha', aj: ajDnTxt() });
    h += bloco('cotas', 'Cotas', c + '</div>');
    /* medidas */
    var m = '<div class="form">';
    if (tip === 'ret' || tip === 'cil') m += U.escolha('fonte.resForma', 'Como informar as medidas', [[tip === 'cil' ? 'cil' : 'ret', tip === 'cil' ? 'Pelo diâmetro' : 'Pelo comprimento e largura'], ['vol', 'Só o volume nominal']], { aj: 'Servem para conferir a reserva efetiva.' });
    if (fo.resForma === 'vol' && (tip === 'ret' || tip === 'cil')) m += U.campo('fonte.resVol', 'Volume nominal', { un: 'm³', num: true, aj: 'Volume do fundo até o nível normal. A área sai do volume dividido por essa altura.' });
    else if (tip === 'ret') m += U.campo('fonte.resC', 'Comprimento interno', { un: 'm', num: true }) + U.campo('fonte.resL', 'Largura interna', { un: 'm', num: true });
    else if (tip === 'cil' || torre) m += U.campo('fonte.resD', 'Diâmetro interno', { un: 'm', num: true });
    else if (sp) m += U.campo('fonte.resD', 'Diâmetro interno da coluna', { un: 'm', num: true });
    else if (tip === 'tronco') m += U.campo('fonte.troncoDb', 'Diâmetro interno da base', { un: 'm', num: true }) + U.campo('fonte.troncoDt', 'Diâmetro interno do topo', { un: 'm', num: true }) + U.campo('fonte.troncoH', 'Altura da caixa', { un: 'm', num: true });
    else if (taca) {
      m += U.escolha('fonte.cubaForma', 'Forma da cuba', [['cil', 'Cilíndrica'], ['tronco', 'Tronco de cone']]);
      if (fo.cubaForma === 'tronco') m += U.campo('fonte.troncoDb', 'Diâmetro interno da base da cuba', { un: 'm', num: true }) + U.campo('fonte.troncoDt', 'Diâmetro interno do topo da cuba', { un: 'm', num: true }) + U.campo('fonte.troncoH', 'Altura da cuba', { un: 'm', num: true });
      else m += U.campo('fonte.resD', 'Diâmetro interno da cuba', { un: 'm', num: true });
      if (tip === 'taca_molhada') m += U.campo('fonte.colD', 'Diâmetro interno da coluna', { un: 'm', num: true });
    }
    h += bloco('medidas', 'Medidas', m + '</div>');
    /* bomba */
    if (inf || fo.elevModo === 'reforco') h += bloco('bomba', inf ? 'Bomba de incêndio' : 'Bomba de reforço', '<div class="form">' + U.campo('nos.BI', inf ? 'Cota do eixo da bomba (nó BI)' : 'Cota do eixo da bomba de reforço (nó BI)', { un: 'm', num: true, aj: inf ? 'Abaixo do nível X, a bomba é afogada. Acima, a sucção é negativa.' : 'O eixo da bomba que reforça a pressão do elevado.' }) + '</div>');
    /* particularidades */
    var p = '', temPoco = (inf && tip !== 'tronco') || (!inf && (tip === 'ret' || tip === 'cil' || torre));
    if (temPoco) {
      p += U.marcar('fonte.poco', 'O reservatório tem poço de sucção.');
      if (fo.poco) p += '<div class="form">' + U.campo('fonte.pocoProf', 'Profundidade do poço', { un: 'm', num: true, aj: 'Já preenchida com o mínimo. Abaixo do piso do reservatório; as dimensões A e B passam a ser medidas do fundo do poço.' }) + U.campo('fonte.pocoLado', 'Lado do poço', { un: 'm', num: true, aj: 'Poço quadrado. Já preenchido com o mínimo; você pode alterar.' }) + '</div>';
    }
    if (inf) {
      if (fo.saida === 'fundo' || (fo.saida === 'cima' && !PR)) { p += U.marcar('fonte.anti', 'A tomada tem dispositivo antivórtice (dispensa a dimensão A).'); if (fo.anti) p += '<div class="form">' + U.campo('fonte.antiH', 'Altura do dispositivo antivórtice', { un: 'm', num: true, aj: 'Pelo fabricante. Em branco, o nível X fica na boca da tomada.' }) + '</div>'; }
      else p += '<p class="peq">Dispositivo antivórtice só se usa em tomada pelo fundo' + (PR ? '' : ' ou por cima') + '.</p>';
    }
    p += '<div class="form">' + U.campo('fonte.zConsumo', 'Cota da tomada de consumo (opcional)', { un: 'm', num: true, aj: 'Se o consumo diário sai por uma tomada acima da reserva, a reserva termina nela. Em branco, vale o nível normal.' }) + '</div>';
    h += bloco('part', 'Particularidades', p);
    /* modo avançado */
    var usa = !V.vazio(fo.zTomada), ab = S.avanc || usa, tomada = inf || (tubo && fo.saida === 'lateral' && tip !== 'tronco') || tip === 'taca_molhada' || (sp && fo.saida === 'acima');
    var av = '<button type="button" class="bt lig" id="abm-av-bt" data-abm="avanc" aria-expanded="' + (ab ? 'true' : 'false') + '" aria-controls="abm-av-c">Modo avançado' + (usa ? ' (em uso)' : '') + '</button>';
    if (!ab) av += '<p class="peq">Cota real da tomada, ou nível X e referência informados à mão. Fechado, a ferramenta usa o mínimo da norma.</p>';
    else {
      av += '<div id="abm-av-c">' + (tomada ? '<div class="form">' + U.campo('fonte.zTomada', inf ? (fo.saida === 'lateral' ? 'Cota real da geratriz superior da tomada' : 'Cota real da boca da tomada') : 'Cota real da face superior do tubo de saída', { un: 'm', num: true, aj: 'Só se a tomada ficar acima do mínimo' + (r.ok ? ' (' + fmt(r.minTopo, 3) + ' m)' : '') + '. Em branco, vale o mínimo.' }) + '</div>' : '<p class="peq">Este tipo de reservatório não usa a cota da tomada.</p>') +
        '<div class="linha-ac"><button type="button" class="bt" data-abm="manual">' + (inf ? 'Informar o nível X à mão' : 'Informar a referência à mão') + '</button><span class="peq">O valor informado fica marcado na tela e no relatório.</span></div></div>';
    }
    h += '<section class="ab-m-bloco" id="abm-avancado">' + av + '</section>';
    /* resultado ao vivo */
    h += '<div class="ab-m-res" id="abm-res" aria-live="polite">' + resumoMenu(r) + '</div>';
    return h + '<div class="linha-ac" style="margin-top:16px"><button type="button" class="bt pri" data-abm="ok" id="abm-ok">Confirmar</button><button type="button" class="bt" data-abm="cancela">Cancelar</button></div>';
  }
  function resumoMenu(r) {
    var inf = S.F.fonte.tipo === 'inferior';
    if (!r.ok) return '<p class="peq">O resultado aparece quando você informar ' + esc(r.falta.join(', ')) + '.</p>';
    return '<p><b>' + fmt(r.X, 3) + ' m</b>, ' + (inf ? 'cota do nível X' : 'cota de referência da altura') + (r.reserva !== undefined ? '. Reserva efetiva: <b>' + fmt(r.reserva, 2) + ' m³</b>' : '') + '.</p>' + r.alertas.map(function (a) { return '<p class="peq">' + esc(a) + '</p>'; }).join('');
  }
  function redesenhaMenu(d, idFoco) {
    if (d.dataset.modo !== 'abast' || !d.open) return;
    var rol = d.scrollTop, at = document.activeElement, ss = null, se = null;
    if (at && at.id === idFoco) { try { ss = at.selectionStart; se = at.selectionEnd; } catch (x) { /* campo sem seleção */ } }
    d.innerHTML = corpoMenu(); d.scrollTop = rol;
    var e = idFoco && document.getElementById(idFoco);
    if (e) { e.focus({ preventScroll: true }); if (ss !== null && se !== null) { try { e.setSelectionRange(ss, se); } catch (x) { /* campo sem seleção */ } } }
  }
  U.abMenu = function () {
    var d = document.getElementById('dlg'), F = S.F; if (!F.fonte.tip) return;
    snap = JSON.stringify({ fonte: F.fonte, BI: F.nos.BI, RI: F.nos.RI }); confirmou = false;
    d.dataset.modo = 'abast'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoMenu();
    d.onclick = function (ev) {
      var b = ev.target.closest('[data-abm]');
      if (!b) { var rc = d.getBoundingClientRect(); if (ev.clientX < rc.left || ev.clientX > rc.right || ev.clientY < rc.top || ev.clientY > rc.bottom) d.close(); return; }
      var a = b.dataset.abm, F2 = S.F, fo = F2.fonte;
      if (a === 'ok') { confirmou = true; d.close(); return; }
      if (a === 'cancela') { d.close(); return; }
      if (a === 'saida') { fo.saida = b.dataset.v; if (fo.saida === 'lateral' || (fo.saida === 'cima' && F2.norma === 'PR')) { fo.anti = false; fo.antiH = ''; } S.tocados['fonte.saida'] = 1; fo.pocoProfAuto = fo.pocoLadoAuto = true; U.mudou(); redesenhaMenu(d, b.id); return; }
      if (a === 'elev') { fo.elevModo = b.dataset.v; if (fo.elevModo === 'gravidade') F2.nos.BI = ''; S.tocados['fonte.elevModo'] = 1; U.mudou(); redesenhaMenu(d, b.id); return; }
      if (a === 'avanc') { S.avanc = !S.avanc; redesenhaMenu(d, 'abm-av-bt'); return; }
      if (a === 'manual') { var rx = V.nivelX(F2); fo.xModo = 'manual'; fo.xOrigem = ''; fo.zXAnt = ''; if (rx.ok && !rx.bomba && rx.hProp > 0) F2.nos.RI = E.txt(rx.X); else if (V.vazio(F2.nos.RI)) F2.nos.RI = fo.zFundo;   /* 2.6.0: na taça seca e na torre, à mão vale a referência, sem a carga própria */ confirmou = true; U.avisa('Nível X e reserva agora são digitados.'); d.close(); return; }
    };
    var tIn = null;   /* digitando: o menu é refeito 250 ms depois da última tecla, com o foco e a seleção de volta, para mostrar o resultado e as mensagens do campo */
    d.oninput = function (ev) { var t = ev.target; if (d.dataset.modo !== 'abast' || !t.dataset || !t.dataset.c) return; clearTimeout(tIn); tIn = setTimeout(function () { var at = document.activeElement; redesenhaMenu(d, at && d.contains(at) && at.id ? at.id : t.id); }, 250); };
    d.onchange = function (ev) {
      var t = ev.target; if (d.dataset.modo !== 'abast' || !t.dataset || !t.dataset.c) return; var idc = t.id;
      /* o foco pode já ter passado a outro campo (clique direto de um campo para outro): o desenho refeito devolve o foco a quem o tem agora */
      setTimeout(function () { var at = document.activeElement; redesenhaMenu(d, at && d.contains(at) && at.id ? at.id : idc); }, 120);
    };
    d.onclose = function () {
      var fechando = d.dataset.modo === 'abast'; d.dataset.modo = ''; d.onclick = null; d.oninput = null; d.onchange = null;
      if (fechando && !confirmou && snap) { var s = JSON.parse(snap), F3 = S.F; F3.fonte = s.fonte; F3.nos.BI = s.BI; F3.nos.RI = s.RI; U.mudou(); }
      else if (fechando) U.mudou();
      snap = null; var b = document.getElementById('ab-abrir'); if (b) b.focus({ preventScroll: true });
    };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('.ab-bt.on') || d.querySelector('input,select'); if (p1) p1.focus({ preventScroll: true });
  };
})();
