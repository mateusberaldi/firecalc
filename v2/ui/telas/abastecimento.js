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
  var TIPOS_INF = [['ret', 'Retangular', 'Concreto ou alvenaria, de planta retangular.', 'in_retangular'], ['cil', 'Cilíndrico', 'Metálico ou de concreto, de planta circular.', 'in_cilindrico'], ['tronco', 'Caixa de polietileno ou fibra', 'Formato de tronco de cone.', 'in_polietileno'], ['piscina', 'Piscina', 'Piscina da própria edificação.', 'in_piscina']];
  var TIPOS_ELE = [['ret', 'Retangular', 'Concreto ou alvenaria.', 'el_concreto'], ['cil', 'Cilíndrico', 'Metálico ou de concreto.', 'el_cilindrico'], ['tronco', 'Caixa de polietileno ou fibra', 'Tronco de cone sobre laje.', 'el_polietileno'],
    ['taca_seca', 'Taça seca', 'Cuba larga sobre uma coluna seca.', 'el_taca_seca'], ['taca_molhada', 'Taça molhada', 'Cuba larga sobre uma coluna cheia de água.', 'el_taca_molhada'], ['torre', 'Torre', 'Tanque alto sobre estrutura, com saída na base.', 'el_torre'], ['standpipe', 'Standpipe', 'Coluna alta e estreita, cheia de água.', 'el_standpipe']];
  var SAIDAS_INF = [['lateral', 'Saída lateral', 'Tubo que sai pela parede, junto ao fundo.', 'sai_lateral'], ['cima', 'Tubo por cima', 'Tubo que entra por cima e mergulha até perto do fundo.', 'sai_superior'], ['fundo', 'Saída pelo fundo', 'Tubo que atravessa o fundo e desce.', 'sai_inferior']];
  var SAIDAS_ELE = [['fundo', 'Saída pelo fundo', 'A altura é medida do fundo.', 'ele_fundo'], ['lateral', 'Saída lateral', 'A altura é medida da face superior do tubo.', 'ele_lateral']];
  var SAIDAS_SP = [['base', 'Saída na base', 'Tubo que sai pela base da coluna.', 'sp_base'], ['acima', 'Saída acima da base', 'Tubo que sai da coluna acima da base.', 'sp_acima']];
  var ELEV_MODO = [['reforco', 'Com bomba de reforço', 'A bomba reforça a pressão do elevado.', 'reforco'], ['gravidade', 'Só gravidade', 'A pressão vem só da altura da água.', 'gravidade']];

  function nomeTipo(tipo, tip) { var l = (tipo === 'inferior' ? TIPOS_INF : TIPOS_ELE).filter(function (x) { return x[0] === tip; })[0]; return l ? l[1] : ''; }
  function botao(id, acao, v, on, svg, titulo, texto, attr) {
    return '<button type="button" class="fc-opcao" id="' + id + '" ' + (attr || 'data-acao') + '="' + acao + '" data-v="' + v + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span class="fc-opcao__des">' + SV.abast(svg) + '</span><span class="fc-opcao__marca"></span><span class="fc-opcao__tx"><b>' + titulo + '</b>' + (texto ? '<span>' + texto + '</span>' : '') + '</span></button>';
  }
  function grupo(idTit, lista, atual, prefixo, acao, attr) {
    return '<div class="fc-opcoes" role="group" aria-labelledby="' + idTit + '">' + lista.map(function (x) { return botao(prefixo + x[0], acao, x[0], atual === x[0], x[3], x[1], x[2], attr); }).join('') + '</div>';
  }

  /* ---------- tela ---------- */
  function blocoFonte() {
    var fo = S.F.fonte, m = U.msg('fonte.tipo');
    return U.cartaoAbre('De onde vem a pressão?', { id: 'ab-fonte', tid: 'ab-fonte-t' }) +
      '<div class="fc-opcoes" role="group" aria-labelledby="ab-fonte-t">' + ['inferior', 'elevado'].map(function (k) { var t = FONTES[k]; return botao('ab-fonte-' + k, 'fonte', k, fo.tipo === k, t[2], t[0], t[1]); }).join('') + '</div>' +
      (m ? '<div class="fc-campo__erro" role="alert" id="ab-fonte-m">' + U.icone('circle-x', 'fc-ic') + esc(m.msg) + '</div>' : '') + U.cartaoFim();
  }
  function blocoTipo() {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', m = U.msg('fonte.tip');
    var lista = inf ? TIPOS_INF.filter(function (x) { return x[0] !== 'piscina' || F.norma === 'SP'; }) : TIPOS_ELE;   /* 2.7.0 (FC-027): a piscina só em SP (reservatório inferior) */
    return U.cartaoAbre('Que tipo de reservatório?', { id: 'ab-tipo', tid: 'ab-tipo-t' }) + grupo('ab-tipo-t', lista, fo.tip, 'ab-tip-', 'tip') +
      (m ? '<div class="fc-campo__erro" role="alert" id="ab-tipo-m">' + U.icone('circle-x', 'fc-ic') + esc(m.msg) + '</div>' : '') + U.cartaoFim();
  }
  /** Valor calculado (fc-entrada--calc): valor e unidade em destaque e a frase que o explica, só leitura; o texto é o mesmo de antes. */
  function linhaDado(id, valor, un, texto) { return '<div class="fc-entrada fc-entrada--calc fc-calc" id="' + id + '"><b>' + valor + '</b>' + un + ', ' + texto + '</div>'; }
  var ROT_SUC = { afogada: ['ok', 'Bomba afogada'], positiva: ['al', 'Sucção positiva, dentro da tolerância'], negativa: ['al', 'Sucção negativa'] };
  function cartaoDados(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', rt = U.rtiTabela(), h = U.cartaoAbre('Dados do reservatório', { id: 'ab-dados', attrs: 'aria-live="polite"', extra: '<span class="fc-selo fc-selo--in">' + U.icone('info', 'fc-ic') + 'calculado</span>' });
    if (!r.ok) return h + '<p class="peq" id="x-falta">O resultado aparece quando você informar ' + esc(r.falta.join(', ')) + '.</p>' + btnAbrir(true) + U.cartaoFim();
    h += '<div class="fc-form">' + linhaDado('x-valor', fmt(r.X, 3), 'm', inf ? 'cota do nível X' : 'cota de referência da altura') +
      (r.hProp > 0 ? linhaDado('x-prop', fmt(r.hProp, 3), 'm', 'carga própria da coluna, entre a referência e a saída na base') : '') +
      (inf && r.faixa > 0 ? linhaDado('x-faixa', fmt(r.faixa, 3), 'm', 'de água acima do fundo que não contam como reserva') : '') +
      (r.reserva !== undefined ? linhaDado('x-reserva', fmt(r.reserva, 2), 'm³', 'reserva efetiva') : '') + (rt !== null ? linhaDado('x-tabela', fmt(rt, 0), 'm³', 'reserva de incêndio pedida pela tabela') : '') + '</div>';
    if (r.reserva !== undefined && rt !== null) h += r.reserva >= rt - 1e-9 ? '<p class="peq" id="x-sit">' + U.pilula('ok', 'Reserva suficiente') + ' ' + fmt(r.reserva, 2) + ' m³ contra ' + fmt(rt, 0) + ' m³ da tabela.</p>' : '<div id="x-sit">' + U.aviso('er', '<b>Reserva insuficiente:</b> ' + fmt(r.reserva, 2) + ' m³ contra ' + fmt(rt, 0) + ' m³ da tabela. Aumente as medidas do reservatório ou a altura entre o nível normal e o ' + (inf ? 'nível X' : 'nível de referência') + '.') + '</div>';
    else if (r.reserva === undefined) h += '<p class="peq" id="x-sit">A reserva efetiva aparece com o nível normal da água e as medidas do reservatório.</p>';
    else h += '<p class="peq" id="x-sit">A reserva pedida pela tabela aparece quando a classificação da etapa Edificação e sistema estiver completa.</p>';
    if (inf && r.succao) h += '<p class="peq" id="x-succao">' + U.pilula(ROT_SUC[r.succao.estado][0], ROT_SUC[r.succao.estado][1]) + ' O eixo da bomba fica ' + fmt(Math.abs(r.succao.g), 2) + ' m ' + (r.succao.g > 0 ? 'acima' : 'abaixo') + ' do nível X.</p>';
    if (fo.tip === 'piscina' && !fo.declaracao) h += U.aviso('al', 'Falta marcar a declaração do responsável pelo uso garantindo a reserva permanentemente.');
    r.alertas.forEach(function (a) { h += U.aviso('al', esc(a)); });
    r.notas.forEach(function (n) { h += U.aviso('al', esc(n)); });
    if (inf && r.poco && r.X < r.fundo) h += U.aviso('in', r.volPoco !== undefined ? 'O nível X fica dentro do poço de sucção, abaixo do piso do reservatório: a água do poço entre o nível X e o piso entra na reserva (' + fmt(r.volPoco, 3) + ' m³).' : 'O nível X fica dentro do poço de sucção, abaixo do piso do reservatório: sem o lado do poço, a água do poço não entra na reserva, que é contada do piso para cima.');
    return h + btnAbrir(false) + U.cartaoFim();
  }
  function btnAbrir(pri) { return '<div class="linha-ac"><button type="button" class="fc-bt' + (pri ? ' fc-bt--pri' : '') + '" id="ab-abrir" data-acao="abmenu" aria-haspopup="dialog">' + (pri ? 'Informar os dados do reservatório' : 'Alterar os dados do reservatório') + '</button></div>'; }

  /** Comentários do rodapé: o que a figura mostra e o que cuidar, sem item de norma (a norma fica nas Verificações). */
  function comentarios(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, c = [];
    if (inf) {
      c.push(r.volPoco !== undefined ? 'A reserva de incêndio é a água acima do nível X, até o nível normal, inclusive a que está no poço de sucção.' : 'A água entre o fundo e o nível X não conta como reserva de incêndio: a reserva é a água acima do nível X, até o nível normal.');
      c.push('O nível X sobe com o diâmetro da sucção: um DN maior pede mais água sobre a tomada para evitar vórtice e entrada de ar.');
      if (tip === 'piscina') c.push('A reserva da piscina é a água acima do nível X, até o nível normal, e só vale com a declaração do responsável pelo uso.' + (!V.vazio(fo.zRaso) ? ' Com o fundo em rampa, o volume soma a água acima do nível X ao longo da rampa, tomada reta de uma ponta à outra.' : ''));
      if (r.poco) c.push('Com poço de sucção, a tomada fica no poço e o nível X pode cair abaixo do piso.' + (r.volPoco !== undefined ? ' A água do poço acima do nível X entra na reserva.' : r.X < r.fundo ? ' Sem o lado do poço informado, a água do poço não entra na reserva.' : ''));
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
    return U.cartao('Comentários', '<ul class="ab-coment">' + c.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', { id: 'ab-coment' });
  }

  /* ---------- desenho com os níveis ---------- */
  function figura(r) {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, n = V.num, zc = n(fo.zCheio);
    if (!r.ok) return U.cartao('Desenho do reservatório', '<p class="peq">O desenho aparece com o tipo do reservatório, as cotas e o DN.</p>', { id: 'fig-res' });
    var zbi = (inf || fo.elevModo === 'reforco') ? n(F.nos.BI) : NaN, taca = tip === 'taca_seca' || tip === 'taca_molhada', torre = tip === 'torre', sp = tip === 'standpipe';
    var zf = taca ? n(fo.zFundoCuba) : sp ? n(fo.zBase) : r.fundo, ref = r.X;
    var zbaseCol = tip === 'taca_molhada' ? n(fo.zBase) : (tip === 'taca_seca' || torre) ? n(fo.zSaida) : NaN, piso = inf && r.poco ? r.base : zf;
    var topoAgua = isNaN(zc) || zc <= ref ? Math.max(ref, zf) + 1.5 : zc;
    var zras = tip === 'piscina' ? n(fo.zRaso) : NaN;   /* 2.7.0 (FC-027): piscina com o fundo em rampa, parte rasa à esquerda e funda (com a tomada) à direita */
    var vs = [piso, topoAgua, ref].concat(isNaN(zbi) ? [] : [zbi], isNaN(zbaseCol) ? [] : [zbaseCol], isNaN(zras) ? [] : [zras]), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pd = Math.max(0.3, (hi - lo) * 0.14); lo -= pd; hi += pd;
    var T = 22, B = 238; function Y(z) { return B - (z - lo) / (hi - lo) * (B - T); }
    var yc = Y(topoAgua), yr = Y(ref), yf = Y(zf), yp = Y(piso), s = '', ext = 'var(--texto-2)';
    function rot(y, t, forte, ev) { var yy = y + 4; if (ev !== undefined && Math.abs(yy - ev) < 13) yy = ev + (yy >= ev ? 13 : -13); return '<text x="262" y="' + yy + '"' + (forte ? ' font-weight="700"' : '') + '>' + t + '</text>'; }
    var xe = 40, xd = 240;   /* bordas do reservatório */
    if (taca) { /* cuba larga sobre coluna */
      var yb = isNaN(zbaseCol) ? yf + 40 : Y(zbaseCol), coluna = tip === 'taca_molhada';
      s += '<path d="M40 ' + (yc - 12) + 'V' + yf + 'H120V' + yb + 'M160 ' + yb + 'V' + yf + 'H240V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="41" y="' + yc + '" width="198" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--info-fundo)"/>';
      if (coluna) s += '<rect x="121" y="' + yf + '" width="38" height="' + Math.max(0, yb - yf) + '" fill="var(--info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="41" y="' + yr + '" width="198" height="' + (yf - yr - 1) + '" fill="var(--superficie-2)"/>';
      if (!coluna) s += '<path d="M120 ' + yf + 'V' + yb + 'M160 ' + yf + 'V' + yb + '" stroke="' + ext + '" stroke-width="2" fill="none"/>';
      s += '<text class="s" x="140" y="' + (yb + 14) + '" text-anchor="middle">base ' + (isNaN(zbaseCol) ? '' : fmt(zbaseCol, 2)) + '</text>';
    } else if (torre || sp) {
      var xa = sp ? 110 : 80, xb = sp ? 170 : 200, yb2 = isNaN(zbaseCol) ? yf + 30 : Y(zbaseCol);
      if (sp) { yb2 = yf; }
      s += '<path d="M' + xa + ' ' + (yc - 12) + 'V' + yf + 'H' + xb + 'V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="' + (xa + 1) + '" y="' + yc + '" width="' + (xb - xa - 2) + '" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="' + (xa + 1) + '" y="' + yr + '" width="' + (xb - xa - 2) + '" height="' + (yf - yr - 1) + '" fill="var(--superficie-2)"/>';
      if (torre) s += '<path d="M130 ' + yf + 'V' + yb2 + 'M150 ' + yf + 'V' + yb2 + '" stroke="' + ext + '" stroke-width="2" fill="none"/><text class="s" x="140" y="' + (yb2 + 14) + '" text-anchor="middle">saída na base ' + fmt(zbaseCol, 2) + '</text>';
      xe = xa; xd = xb;
    } else if (tip === 'tronco') {
      s += '<path d="M40 ' + (yc - 12) + 'L72 ' + yf + 'H208L240 ' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<path d="M' + (41 + (yf - yc) / Math.max(1, yf - yc + 12) * 30) + ' ' + yc + 'H' + (239 - (yf - yc) / Math.max(1, yf - yc + 12) * 30) + 'L208 ' + Math.min(yr, yf) + 'H72Z" fill="var(--info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="73" y="' + yr + '" width="134" height="' + (yf - yr - 1) + '" fill="var(--superficie-2)"/>';
    } else if (!isNaN(zras) && zras > zf) {
      var yz0 = Y(zras), xi = 41 + 198 * Math.min(1, Math.max(0, (zras - ref) / (zras - zf))), pXi = zras > ref ? xi + ',' + yr : '41,' + yr;
      s += '<path d="M40 ' + (yc - 12) + 'V' + yz0 + 'L240 ' + yf + 'V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<polygon points="41,' + yc + ' 239,' + yc + ' 239,' + yf + ' 41,' + yz0 + '" fill="var(--info-fundo)"/>';
      if (yf - yr > 1) s += '<polygon points="' + pXi + ' 239,' + yr + ' 239,' + (yf - 1) + (zras > ref ? '' : ' 41,' + (yz0 - 1)) + '" fill="var(--superficie-2)"/>';
    } else {
      s += '<path d="M40 ' + (yc - 12) + 'V' + yf + (inf && r.poco ? 'H150V' + yp + 'H240' : 'H240') + 'V' + (yc - 12) + '" fill="none" stroke="' + ext + '" stroke-width="2"/>';
      s += '<rect x="41" y="' + yc + '" width="198" height="' + Math.max(0, Math.min(yr, yf) - yc) + '" fill="var(--info-fundo)"/>';
      if (yf - yr > 1) s += '<rect x="41" y="' + yr + '" width="198" height="' + (yf - yr - 1) + '" fill="var(--superficie-2)"/>';
      if (inf && r.poco) s += '<rect x="151" y="' + Math.max(yr, yf) + '" width="88" height="' + Math.max(0, yp - Math.max(yr, yf) - 1) + '" fill="var(--superficie-2)"/>';
    }
    s += '<line x1="30" x2="254" y1="' + yc + '" y2="' + yc + '" stroke="var(--grafico-sistema)" stroke-width="2"/>' + rot(yc, 'nível normal ' + (isNaN(zc) ? 'a informar' : fmt(zc, 2)));
    s += '<line x1="30" x2="254" y1="' + yr + '" y2="' + yr + '" stroke="var(--grafico-ponto)" stroke-width="2" stroke-dasharray="6 4"/>' + rot(yr, (inf ? 'nível X ' : 'referência ') + fmt(ref, 3), true, yc + 4);
    if (!taca && !sp) s += '<text class="s" x="' + (inf && r.poco ? 96 : 140) + '" y="' + (yf + 14) + '" text-anchor="middle">fundo ' + fmt(zf, 2) + '</text>';
    else if (taca) s += '<text class="s" x="80" y="' + (yf + 14) + '" text-anchor="middle">fundo da cuba ' + fmt(zf, 2) + '</text>';
    else s += '<text class="s" x="140" y="' + (yf + 14) + '" text-anchor="middle">base ' + fmt(zf, 2) + '</text>';
    if (inf && yf - yr > 16) s += '<text class="s" x="' + (r.poco ? 96 : 140) + '" y="' + ((yr + yf) / 2 + 4) + '" text-anchor="middle">fora da reserva</text>';
    if (r.hProp > 0 && !isNaN(zbaseCol)) { var yz = Y(zbaseCol); s += '<line x1="' + (xd + 8) + '" x2="' + (xd + 8) + '" y1="' + yr + '" y2="' + yz + '" stroke="' + ext + '" stroke-width="1.5"/><text class="s" x="' + (xd + 14) + '" y="' + ((yr + yz) / 2 + 4) + '">carga própria ' + fmt(r.hProp, 2) + ' m</text>'; }
    /* saída do reservatório */
    if (inf || tip === 'ret' || tip === 'cil' || tip === 'tronco' || sp) {
      var yt = Y(r.topo), dpx = Math.max(6, Y(r.topo - r.D) - yt), lat = r.saida === 'lateral' || (sp && r.saida === 'acima') || (!inf && tip === 'tronco');
      if (lat) s += '<rect x="' + xd + '" y="' + yt + '" width="16" height="' + dpx + '" fill="var(--grafico-sistema)" opacity=".85"/>';
      else if (r.saida === 'fundo' || r.saida === 'base') s += '<rect x="' + (inf && r.poco ? 190 : 136) + '" y="' + yp + '" width="8" height="' + Math.min(18, 256 - yp) + '" fill="var(--grafico-sistema)" opacity=".85"/>';
      else s += '<path d="M254 ' + (yc - 22) + 'H200V' + yt + '" fill="none" stroke="var(--grafico-sistema)" stroke-width="7" opacity=".85"/>';
      if (inf && !r.anti && yt - yr > 8) s += '<line x1="222" x2="222" y1="' + yt + '" y2="' + yr + '" stroke="' + ext + '" stroke-width="1.5"/><text class="s" x="216" y="' + ((yt + yr) / 2 + 4) + '" text-anchor="end">A</text>';
      if (!isNaN(zbi)) s += '<path d="M' + (lat ? xd + 16 : 262) + ' ' + (lat ? yt + dpx / 2 : Y(zbi)) + 'H430V' + Y(zbi) + '" fill="none" stroke="var(--grafico-sistema)" stroke-width="3" opacity=".5"/>';
    }
    if (!isNaN(zbi)) s += '<circle cx="450" cy="' + Y(zbi) + '" r="15" fill="var(--superficie)" stroke="var(--grafico-sistema)" stroke-width="2"/><text x="450" y="' + (Y(zbi) + 4) + '" text-anchor="middle" font-weight="700">BI</text><text class="s" x="472" y="' + (Y(zbi) + 4) + '">' + fmt(zbi, 2) + '</text>';
    var st = '';
    if (inf && !isNaN(zbi)) { var g = zbi - ref; st = g > 0 ? 'Pelas cotas, o eixo da bomba fica ' + fmt(g, 2) + ' m acima do nível X.' : 'Pelas cotas, o eixo da bomba fica ' + fmt(-g, 2) + ' m abaixo do nível X: bomba afogada.'; }
    var rotA = 'Corte esquemático do reservatório, ' + nomeTipo(fo.tipo, tip).toLowerCase() + '. Fundo na cota ' + fmt(zf, 2) + ' m, ' + (inf ? 'nível X na cota ' : 'referência da água na cota ') + fmt(ref, 3) + ' m' + (isNaN(zc) ? '' : ', nível normal na cota ' + fmt(zc, 2) + ' m') + '. ' + st;
    return U.cartao('Desenho do reservatório', '<svg class="fig-res" viewBox="0 0 560 262" role="img" aria-label="' + esc(rotA) + '">' + s + '</svg><p class="peq">' + (st ? '<b>' + esc(st) + '</b> ' : '') + 'Esquema fora de escala na horizontal; as alturas seguem as cotas.</p>', { id: 'fig-res' });
  }

  U.telas[U.POS.abast] = function () {
    var F = S.F, fo = F.fonte, h = U.cab(U.POS.abast, 'Abastecimento', '');
    h += blocoFonte();
    if (!fo.tipo) return h;
    h += blocoTipo();
    if (!fo.tip) return h;
    var r = V.nivelX(F);
    h += '<div class="grade g-fig">' + cartaoDados(r) + figura(r) + '</div>';
    return h + comentarios(r);
  };

  /* ---------- troca de fonte e de tipo, com confirmação antes de apagar ---------- */
  U.abTroca = function (acao, v) {
    var F = S.F, fo = F.fonte, tipo = acao === 'fonte' ? v : fo.tipo, tip = acao === 'tip' ? v : fo.tip;
    if (acao === 'fonte' && fo.tipo === v) return;
    if (acao === 'tip' && fo.tip === v) { U.abMenu(); return; }
    if (acao === 'fonte' && tip === 'piscina' && v === 'elevado') tip = '';   /* 2.7.0 (FC-027): a piscina é só reservatório inferior */
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
  /** 2.7.0 (FC-024): itens da biblioteca de reservatórios que servem ao tipo da tela (a taça serve à seca e à molhada; a piscina não tem seletor). */
  function bibDoTipo(tip) {
    var alvo = tip === 'taca_seca' || tip === 'taca_molhada' ? 'taca' : tip;
    return (U.cad && U.cad.reservatorios || []).map(function (x, i) { return [x, i]; }).filter(function (p) { return p[0].tipo === alvo; });
  }
  function seletorBib(tip) {
    var l = bibDoTipo(tip); if (!l.length) return '';
    return '<label class="fc-campo larga"><span class="fc-campo__rot">Escolher da minha biblioteca</span><span class="fc-sel"><span class="fc-entrada"><select id="abm-bib" data-bib="1"><option value="">Escolha</option>' + l.map(function (p) {
      var x = p[0]; return '<option value="' + p[1] + '">' + esc(x.fabricante + ' ' + x.modelo + ', ' + U.medidasRes(x) + (x.volumeNominal ? ', ' + fmt(x.volumeNominal, 3) + ' m³' : '')) + '</option>'; }).join('') + '</select></span>' + U.icone('chevron-down', 'fc-ic') + '</span></label>';
  }
  /** Só preenche os campos de medida; nada mais muda e cada campo segue editável. */
  function preencheDaBib(i) {
    var fo = S.F.fonte, tip = fo.tip, p = bibDoTipo(tip).filter(function (q) { return q[1] === i; })[0]; if (!p) return false;
    var x = p[0], v = function (n) { return n === undefined || n === null ? '' : String(n).replace('.', ','); };
    if (tip === 'ret' || tip === 'cil') { if (x.comprimento || x.diametro) { fo.resForma = tip; if (tip === 'ret') { fo.resC = v(x.comprimento); fo.resL = v(x.largura); } else fo.resD = v(x.diametro); } else { fo.resForma = 'vol'; fo.resVol = v(x.volumeNominal); } }
    else if (tip === 'tronco') { fo.troncoDb = v(x.diametroBase); fo.troncoDt = v(x.diametroTopo); fo.troncoH = v(x.altura); }
    else if (tip === 'taca_seca' || tip === 'taca_molhada') { fo.cubaForma = x.cubaForma === 'tronco' ? 'tronco' : 'cil'; if (fo.cubaForma === 'tronco') { fo.troncoDb = v(x.diametroBase); fo.troncoDt = v(x.diametroTopo); fo.troncoH = v(x.altura); } else fo.resD = v(x.diametro); if (tip === 'taca_molhada' && x.diametroColuna) fo.colD = v(x.diametroColuna); }
    else fo.resD = v(x.diametro);
    return true;
  }
  function bloco(id, titulo, corpo, extra) { return '<section class="ab-m-bloco" id="abm-' + id + '" aria-labelledby="abm-' + id + '-t"><h3 id="abm-' + id + '-t">' + titulo + '</h3>' + (extra || '') + corpo + '</section>'; }
  function corpoMenu() {
    var F = S.F, fo = F.fonte, inf = fo.tipo === 'inferior', tip = fo.tip, PR = F.norma === 'PR', h = '', r = V.nivelX(F);
    var tubo = tip === 'ret' || tip === 'cil' || tip === 'tronco' || tip === 'piscina', taca = tip === 'taca_seca' || tip === 'taca_molhada', torre = tip === 'torre', sp = tip === 'standpipe';
    h += '<h2 id="dlg-tit">Dados do reservatório: ' + esc(nomeTipo(fo.tipo, tip).toLowerCase()) + (inf ? ', inferior' : ', elevado') + '</h2>';
    if (!inf) h += bloco('elev', 'Entrega da água', grupo('abm-elev-t', ELEV_MODO, fo.elevModo, 'abm-elev-', 'elev', 'data-abm') + (U.msg('fonte.elevModo') ? '<div class="fc-campo__erro" role="alert">' + U.icone('circle-x', 'fc-ic') + esc(U.msg('fonte.elevModo').msg) + '</div>' : ''));
    /* saída */
    var lista = null; if (inf) lista = tip === 'tronco' ? SAIDAS_INF.filter(function (x) { return x[0] !== 'fundo'; }) : SAIDAS_INF; else if (sp) lista = SAIDAS_SP; else if (tip === 'ret' || tip === 'cil') lista = SAIDAS_ELE;
    if (lista) h += bloco('saida', 'Saída da água', grupo('abm-saida-t', lista, fo.saida, 'abm-saida-', 'saida', 'data-abm') + (U.msg('fonte.saida') ? '<div class="fc-campo__erro" role="alert" id="abm-saida-m">' + U.icone('circle-x', 'fc-ic') + esc(U.msg('fonte.saida').msg) + '</div>' : ''));
    /* cotas */
    var c = '<div class="form">';
    if (tip === 'piscina') c += U.campo('fonte.zFundo', 'Cota do fundo na parte funda', { un: 'm', num: true, aj: 'Junto à tomada, face de dentro do fundo.' }) + U.campo('fonte.zRaso', 'Cota do fundo na parte rasa (opcional)', { un: 'm', num: true, aj: 'Em branco, o fundo é plano. Fundo em rampa reta de uma ponta à outra; com patamar, informe a forma pela área.' });
    else if (!taca && !sp) c += U.campo('fonte.zFundo', torre ? 'Cota do fundo do tanque' : 'Cota do fundo do reservatório', { un: 'm', num: true, aj: 'Face de dentro do fundo, onde a água se apoia.' });
    if (taca) c += U.campo('fonte.zFundoCuba', 'Cota do fundo da cuba', { un: 'm', num: true });
    if (tip === 'taca_molhada' || sp) c += U.campo('fonte.zBase', 'Cota da base', { un: 'm', num: true, aj: sp ? 'Base da coluna.' : 'Base da coluna cheia de água.' });
    if (tip === 'taca_seca' || torre) c += U.campo('fonte.zSaida', 'Cota da saída na base', { un: 'm', num: true, aj: 'Onde o tubo sai da base da coluna.' });
    c += U.campo('fonte.zCheio', 'Cota do nível normal da água', { un: 'm', num: true, aj: tip === 'piscina' ? 'Nível mínimo de operação: a menor cota de água garantida em uso, e não a borda. Entra na reserva efetiva e na pressão estática máxima.' : 'Reservatório cheio. Entra na reserva efetiva e na pressão estática máxima.' });
    var dns = U.dns().filter(function (d) { return d >= 50 || d === +fo.dnSuc; });
    c += U.escolha('fonte.dnSuc', inf ? 'DN da sucção' : 'DN da saída do reservatório', dns.map(function (d) { return [d, 'DN' + d]; }), { num: true, vazio: 'Escolha', aj: ajDnTxt() });
    h += bloco('cotas', 'Cotas', c + '</div>');
    /* medidas */
    var m = '<div class="form">' + (tip === 'piscina' ? '' : seletorBib(tip));
    if (tip === 'piscina') m += U.escolha('fonte.resForma', 'Como informar as medidas', [['ret', 'Pelo comprimento e largura'], ['area', 'Pela área do espelho d\'água']], { aj: 'Servem para conferir a reserva efetiva.' });
    if (tip === 'ret' || tip === 'cil') m += U.escolha('fonte.resForma', 'Como informar as medidas', [[tip === 'cil' ? 'cil' : 'ret', tip === 'cil' ? 'Pelo diâmetro' : 'Pelo comprimento e largura'], ['vol', 'Só o volume nominal']], { aj: 'Servem para conferir a reserva efetiva.' });
    if (fo.resForma === 'vol' && (tip === 'ret' || tip === 'cil')) m += U.campo('fonte.resVol', 'Volume nominal', { un: 'm³', num: true, aj: 'Volume do fundo do reservatório até o nível normal, sem o poço de sucção: a água do poço que conta entra à parte. A área sai do volume dividido por essa altura.' });
    else if (tip === 'ret') m += U.campo('fonte.resC', 'Comprimento interno', { un: 'm', num: true }) + U.campo('fonte.resL', 'Largura interna', { un: 'm', num: true });
    else if (tip === 'piscina') m += (fo.resForma === 'area' ? U.campo('fonte.resArea', 'Área do espelho d\'água', { un: 'm²', num: true }) : U.campo('fonte.resC', 'Comprimento interno', { un: 'm', num: true, aj: 'Direção em que o fundo desce, da parte rasa à funda.' }) + U.campo('fonte.resL', 'Largura interna', { un: 'm', num: true }));
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
      if (fo.saida === 'fundo' || (fo.saida === 'cima' && !PR)) { p += U.marcar('fonte.anti', 'A tomada tem dispositivo antivórtice (dispensa a dimensão A).'); if (fo.anti) p += '<div class="form">' + U.campo('fonte.antiH', 'Altura do dispositivo antivórtice', { un: 'm', num: true, aj: 'Pelo fabricante. Em branco, o nível X fica na boca da tomada.' }) + (fo.saida === 'cima' ? U.campo('fonte.antiBocal', 'Diâmetro do bocal (opcional)', { un: 'mm', num: true, aj: 'Pelo fabricante. Em branco, não é conferido.' }) : '') + '</div>'; }
      else p += '<p class="peq">Dispositivo antivórtice só se usa em tomada pelo fundo' + (PR ? '' : ' ou por cima') + '.</p>';
    }
    if (tip === 'piscina') p += U.marcar('fonte.declaracao', 'Há declaração do responsável pelo uso garantindo a reserva permanentemente.');
    p += '<div class="form">' + U.campo('fonte.zConsumo', 'Cota da tomada de consumo (opcional)', { un: 'm', num: true, aj: 'Se o consumo diário sai por uma tomada acima da reserva, a reserva termina nela. Em branco, vale o nível normal.' }) + '</div>';
    h += bloco('part', 'Particularidades', p);
    /* modo avançado */
    var usa = !V.vazio(fo.zTomada), ab = S.avanc || usa, tomada = inf || (tubo && fo.saida === 'lateral' && tip !== 'tronco') || tip === 'taca_molhada' || (sp && fo.saida === 'acima');
    var av = '<button type="button" class="fc-bt fc-bt--disc" id="abm-av-bt" data-abm="avanc" aria-expanded="' + (ab ? 'true' : 'false') + '" aria-controls="abm-av-c">Modo avançado' + (usa ? ' (em uso)' : '') + '</button>';
    if (!ab) av += '<p class="peq">Cota real da tomada. Fechado, a ferramenta usa o mínimo da norma.</p>';
    else {
      av += '<div id="abm-av-c">' + (tomada ? '<div class="form">' + U.campo('fonte.zTomada', inf ? (fo.saida === 'lateral' ? 'Cota real da geratriz superior da tomada' : 'Cota real da boca da tomada') : 'Cota real da face superior do tubo de saída', { un: 'm', num: true, aj: 'Só se a tomada ficar acima do mínimo' + (r.ok ? ' (' + fmt(r.minTopo, 3) + ' m)' : '') + '. Em branco, vale o mínimo.' }) + '</div>' : '<p class="peq">Este tipo de reservatório não usa a cota da tomada.</p>') +
        '</div>';
    }
    h += '<section class="ab-m-bloco" id="abm-avancado">' + av + '</section>';
    /* resultado ao vivo */
    h += '<div class="ab-m-res" id="abm-res" aria-live="polite">' + resumoMenu(r) + '</div>';
    return h + '<div class="linha-ac" style="margin-top:16px"><button type="button" class="fc-bt fc-bt--pri" data-abm="ok" id="abm-ok">Confirmar</button><button type="button" class="fc-bt" data-abm="cancela">Cancelar</button></div>';
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
      if (a === 'saida') { fo.saida = b.dataset.v; if (fo.saida === 'lateral' || (fo.saida === 'cima' && F2.norma === 'PR')) { fo.anti = false; fo.antiH = ''; fo.antiBocal = ''; } S.tocados['fonte.saida'] = 1; fo.pocoProfAuto = fo.pocoLadoAuto = true; U.mudou(); redesenhaMenu(d, b.id); return; }
      if (a === 'elev') { fo.elevModo = b.dataset.v; if (fo.elevModo === 'gravidade') F2.nos.BI = ''; S.tocados['fonte.elevModo'] = 1; U.mudou(); redesenhaMenu(d, b.id); return; }
      if (a === 'avanc') { S.avanc = !S.avanc; redesenhaMenu(d, 'abm-av-bt'); return; }
    };
    var tIn = null;   /* digitando: o menu é refeito 250 ms depois da última tecla, com o foco e a seleção de volta, para mostrar o resultado e as mensagens do campo */
    d.oninput = function (ev) { var t = ev.target; if (d.dataset.modo !== 'abast' || !t.dataset || !t.dataset.c) return; clearTimeout(tIn); tIn = setTimeout(function () { var at = document.activeElement; redesenhaMenu(d, at && d.contains(at) && at.id ? at.id : t.id); }, 250); };
    d.onchange = function (ev) {
      var tb = ev.target; if (d.dataset.modo === 'abast' && tb.dataset && tb.dataset.bib) { if (tb.value !== '' && preencheDaBib(+tb.value)) { U.mudou(); redesenhaMenu(d, 'abm-bib'); } return; }
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
    var p1 = d.querySelector('.fc-opcao[aria-pressed="true"]') || d.querySelector('input,select'); if (p1) p1.focus({ preventScroll: true });
  };
})();
