/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, telas das etapas Verificações e Relatório (7 e 8 desde a 2.5.3), e as Estatísticas. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, E = U.E, S = U.S, esc = U.esc, fmt = U.fmt, vir = U.vir;
  /* Nome de cada verificação: diz O QUE é conferido, sem afirmar o resultado (o resultado é a pílula e a frase do valor). */
  var VT = U.VT = { V01: 'Vazão e pressão no hidrante mais desfavorável', V02: 'Hipótese de cálculo: jatos simultâneos', V03: 'Equilíbrio de pressões no nó de derivação', V04: 'Pressão dinâmica máxima nas válvulas',
    V05: 'Pressão estática máxima (bomba fechada e reservatório cheio)', V06: 'Velocidade da água na rede', V07: 'Velocidade da água na sucção', V08: 'NPSH disponível contra o requerido', V09: 'Posição da bomba em relação ao nível da água',
    V10: 'Altura da bomba na vazão de projeto', V11: 'Pressão a vazão nula da bomba (shut-off)', V12: 'Volume da reserva de incêndio', V13: 'Duração da reserva', V14: 'Bomba de pressurização (jockey)',
    V15: 'Vazão da bomba de pressurização na partida', V16: 'Pressão a vazão nula da bomba de pressurização', V17: 'Ajuste dos pressostatos', V18: 'Diâmetro mínimo da rede', V19: 'Altura da válvula do hidrante',
    V20: 'Pressão necessária na entrada do recalque', V21: 'Tabela de comprimento equivalente', V23: 'Ponto único de hidrante', V30: 'Tipo de sistema contra a tabela', V24: 'Ramal de retorno para testes', V25: 'Válvula redutora de pressão (regulagem declarada)', V29: 'Nível X e reserva efetiva pela Tabela B.1' };
  /* O que fazer e para onde ir, por verificação: [frases], [[rótulo do botão, etapa, campo opcional]]. */
  var FAZER = {
    V29: [['Conferir o DN da sucção: fora da Tabela B.1 a ferramenta usa a linha do DN imediatamente maior, a favor da segurança.'], [['o abastecimento', U.POS.abast]]],
    V01: [['Rever os diâmetros e os comprimentos no caminho até o hidrante mais desfavorável.'], [['a rede', U.POS.rede]]],
    V02: [['O par foi forçado para estudo. Volte ao par mais desfavorável antes de emitir o relatório.'], [['a rede', U.POS.rede]]],
    V04: [['Escolher uma bomba com curva mais plana.', 'Ou instalar válvula redutora de pressão no hidrante mais favorável, no cartão Válvula redutora de pressão da etapa Hidrantes.'], [['a bomba', 7, 'bomba.id'], ['os hidrantes', U.POS.hidr]]],
    V05: [['Escolher uma bomba com pressão a vazão nula menor.', 'Ou instalar válvula redutora de pressão nos pontos mais baixos, no cartão Válvula redutora de pressão da etapa Hidrantes.', 'Ou separar os pavimentos mais baixos em outra zona de pressão.'], [['a bomba', 7, 'bomba.id'], ['os hidrantes', U.POS.hidr]]],
    V06: [['Aumentar o diâmetro do trecho indicado.'], [['a rede', U.POS.rede]]],
    V07: [['Aumentar o diâmetro do trecho da sucção (RI-BI).'], [['a rede', U.POS.rede]]],
    V08: [['Informar o NPSH requerido da bomba escolhida, no cartão Bomba escolhida. Se cavita na vazão de projeto: comparar a 1,5 Q, escolher bomba que entregue a altura manométrica a 1,5 vez a vazão de projeto e informar o requerido dela. Se já informado: baixar a bomba, subir o nível da água, encurtar a sucção ou aumentar o diâmetro dela.'], [['o NPSH requerido', 7, 'bomba.npshr'], ['o abastecimento', U.POS.abast]]],
    V09: [['Sucção negativa: prever o sistema de escorva e o manovacuômetro na sucção.'], [['o abastecimento', U.POS.abast]]],
    V10: [['Escolher uma bomba que, na vazão de projeto, entregue altura igual ou maior que a altura manométrica, com essa vazão dentro da faixa da curva do catálogo.'], [['a bomba', 7, 'bomba.id']]],
    V11: [['Conferir a pressão a vazão nula da bomba com o limite de pressão dos componentes.'], [['a bomba', 7, 'bomba.id']]],
    V12: [['Aumentar a reserva de incêndio efetiva até o volume da tabela.'], [['a reserva', U.POS.abast]]],
    V30: [['Adotar o tipo que a tabela pede para esta área, ou um tipo superior, no botão Alterar sistema.'], [['o sistema', U.POS.edif]]],
    V14: [['Lançar a bomba de pressurização (jockey).'], [['a bomba de pressurização', 7, 'jockey.id']]],
    V15: [['Escolher uma bomba de pressurização menor: no ponto de partida ela não pode passar de 20 L/min.'], [['a bomba de pressurização', 7, 'jockey.id']]],
    V16: [['Escolher uma bomba de pressurização com pressão a vazão nula igual ou maior que a da principal.'], [['a bomba de pressurização', 7, 'jockey.id']]],
    V17: [['Conferir se cada ajuste fica em até 70% do fundo de escala do pressostato.'], [['a automação', 7]]],
    V18: [['Usar no mínimo DN65 na rede. DN50 só é admitido nos sistemas tipo 1 e 2.'], [['a rede', U.POS.rede]]],
    V19: [['Colocar a válvula entre 1,0 e 1,5 m do piso.'], [['os hidrantes', U.POS.hidr]]],
    V21: [['Usar peças de uma só tabela de comprimento equivalente.'], [['a rede', U.POS.rede]]],
    V23: [['Usar hidrante de duas expedições (tipo superior) ou lançar um segundo hidrante.'], [['a rede', U.POS.rede]]],
    V25: [['Usar regulagem entre a pressão mínima do tipo de sistema (Tabela 2) e 100 mca, com a fonte do catálogo.', 'Tirar a válvula redutora de hidrante que entra no par de cálculo: ela fica nos pontos de pressão alta, não nos mais desfavoráveis.'], [['as válvulas redutoras', 5]]],
    V24: [['Lançar o ramal de retorno. Se, com o registro todo aberto, a vazão não chegar a 75% da nominal, aumentar o diâmetro ou tirar peças do ramal. Acima da nominal, quem ajusta o ensaio é o registro de regulagem.'], [['o ramal de retorno', 7, 'retorno.trechos.0.dn']]]
  };
  /* Frase do resultado. Onde o texto do motor é telegráfico, a tela escreve a frase inteira com os mesmos números. */
  function valor(x) {
    var v = x.v, n = S.sit.R.numeros, N = U.norma();
    if (v.id === 'V10' && n.Hb !== undefined) {
      var bb = U.bombaDe(S.F.bomba.id), qmax = bb ? Math.max.apply(null, bb.pts.map(function (p) { return p[1]; })) : Infinity;
      if (n.Qth > qmax) return 'A vazão de projeto (' + fmt(n.Qth, 2) + ' m³/h) passa do fim da curva do catálogo desta bomba (' + fmt(qmax, 1) + ' m³/h)' + (n.Hb >= n.AMT ? '; a altura de ' + fmt(n.Hb, 2) + ' mca é uma estimativa fora da curva' : '; ela não entrega os ' + fmt(n.AMT, 2) + ' mca que o sistema pede');
    }
    if (v.id === 'V10' && n.Hb !== undefined) return (n.Hb >= n.AMT ? 'A bomba entrega ' : 'A bomba só entrega ') + fmt(n.Hb, 2) + ' mca na vazão de projeto (' + fmt(n.Qth, 2) + ' m³/h); o sistema pede ' + fmt(n.AMT, 2) + ' mca' + (n.Hb >= n.AMT ? '' : ': faltam ' + fmt(n.AMT - n.Hb, 2) + ' mca');
    if (v.id === 'V05' && n.estaticaMax) return fmt(n.estaticaMax.P, 1) + ' mca em ' + n.estaticaMax.nome + '; o limite é ' + fmt(N.pmax, 0) + ' mca';
    if (v.id === 'V25' && n.redutoras) return n.redutoras.map(function (r) { return r.nome + ': ' + (r.montante === null ? 'regulagem de ' : 'de ' + fmt(r.montante, 1) + ' para ') + fmt(r.P, 1) + ' mca' + (r.avisos.length ? ' (' + vir(r.avisos.join('; ')) + ')' : ''); }).join('; ') + '. Critério da ferramenta: pressão de saída declarada';
    if (v.id === 'V12' && n.rtiTabela !== undefined) return 'Reserva de ' + fmt(n.rtiEfetiva, 1) + ' m³; a tabela pede ' + fmt(n.rtiTabela, 0) + ' m³';
    if (v.id === 'V01') return vir(v.valor).replace(/^Q /, 'Vazão de ').replace('; P ', '; pressão de ');
    return vir(v.valor);
  }
  var COMTIT = { V02: 1, V06: 1, V09: 1, V14: 1 };   // verificações em que o texto do motor traz informação a mais (trecho, situação da sucção, exigência)
  function item(x, aberto) {
    var v = x.v, N = U.norma(), f = FAZER[v.id], h = '<div class="ver" id="ver-' + v.id + '"><div><span class="nm">' + esc(VT[v.id] || v.titulo) + '</span><span class="cod">' + v.id + '</span><div class="val">' + esc(valor(x)) + '. <span class="peq">' + (COMTIT[v.id] ? esc(vir(v.titulo)) + '. ' : '') + (v.item ? (/^(regra da ferramenta|didático)/.test(v.item) ? '' : (N.id === 'SP' ? 'IT 22, ' : 'NPT 022, ')) + esc(v.item) : '') + '</span></div>' + (x.nota ? '<p class="peq" style="margin-top:4px">' + esc(x.nota) + '</p>' : '') + '</div><div>' + (x.cf ? U.pilula('ok', 'Conferido') : U.pilula(x.s)) + '</div>';
    if (aberto && f) h += '<div class="fazer"><b>O que fazer</b>' + (f[0].length > 1 ? '<ol>' + f[0].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' : f[0][0]) + '<div class="ac">' + f[1].map(function (b, k) { return '<button class="bt' + (k === 0 && x.s === 'er' ? ' pri' : '') + '" ' + (b[2] ? 'data-corrigir="' + b[2] + '"' : 'data-ir="etapa:' + b[1] + '"') + '>Ir corrigir: ' + b[0] + '</button>'; }).join('') + '</div></div>';
    if (aberto && x.s === 'al') h += U.botaoConf(x);
    return h + '</div>';
  }
  /* 2.5.4: marca "Conferido" nos itens a conferir. O item continua na lista, com a pílula "Conferido"; a marca vale enquanto a
   * situação e o valor do item forem os da hora da marca (U.vers tira a marca velha). No relatório e no memorial, frase própria nos itens que pedem
   * providência física e "Conferido pelo projetista" nos demais. */
  var FRASE = { V09: 'O sistema conta com escorva e manovacuômetro na sucção (C.2.6 e C.1.17).', V11: 'Pressão a vazão nula da bomba conferida pelo projetista com o limite de pressão dos componentes.',
    V19: 'Altura da válvula do hidrante conferida pelo projetista no desenho.', V27: 'Pressão na ponta do esguicho comprovada pelo projetista no catálogo do fabricante.', V28: 'Alcance do jato comprovado pelo projetista com o fabricante do esguicho.' };
  U.fraseConf = function (id) { return FRASE[id] || 'Conferido pelo projetista.'; };
  U.mapaConf = function () { var m = {}; if (S.sit.k === 'ok') U.vers().forEach(function (x) { if (x.cf) m[x.v.id] = U.fraseConf(x.v.id); }); return m; };
  U.botaoConf = function (x) {
    var id = x.v.id;
    return '<div class="conf-l"><button type="button" class="bt min' + (x.cf ? ' pri' : '') + '" id="conf-' + id + '" data-acao="conferir" data-v="' + id + '" data-s="' + esc(U.assinaConf(x.v)) + '" aria-pressed="' + (x.cf ? 'true' : 'false') + '">' + (x.cf ? U.IC.ok + ' ' : '') + 'Conferido</button>' +
      '<span class="peq">' + (x.cf ? 'No relatório e no memorial: ' + esc(U.fraseConf(id)) : 'Marque depois de ler e resolver. O item continua na lista, como conferido.') + '</span></div>';
  };
  U.telas[U.POS.verif] = function () {
    var sit = S.sit, cab = U.cab(U.POS.verif, 'Verificações', '');
    if (sit.k !== 'ok') {
      var m = sit.k === 'branco' ? ['Ainda não há o que verificar', 'As verificações aparecem depois que a rede tiver hidrante ligado ao reservatório.', 'Ir para a etapa Rede', 'data-ir="etapa:' + U.POS.rede + '"'] :
        sit.k === 'invalido' ? ['Verificações suspensas', 'Há ' + sit.inv.length + ' campo(s) com valor inválido. A ferramenta não mostra resultado calculado com dado errado.', 'Ir corrigir o campo', 'data-corrigir="' + esc(sit.inv[0].c) + '"'] :
        sit.k === 'incompleta' ? ['Verificações suspensas', 'A rede está incompleta: ' + sit.av[0].msg, 'Ir corrigir o trecho', 'data-corrigir="trechos.' + sit.av[0].i + '.' + sit.av[0].campo + '"'] :
        sit.k === 'aguarda' ? ['Faltam dados para calcular', 'Preencha o que falta nas etapas anteriores: ' + sit.falta[0].msg, 'Ir preencher', 'data-corrigir="' + esc(sit.falta[0].c) + '"'] : ['O cálculo não fechou', vir(sit.msg), sit.esgAusente ? 'Ir para a etapa Hidrantes' : 'Ir para a etapa Rede', 'data-ir="etapa:' + (sit.esgAusente ? U.POS.hidr : U.POS.rede) + '"'];
      return cab + '<div class="vazia"><svg class="il" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="34" fill="var(--fc-superficie-2)" stroke="var(--fc-borda-campo)" stroke-width="2"/><path d="M48 30v22" stroke="var(--fc-fogo)" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="64" r="4" fill="var(--fc-fogo)"/></svg><h2>' + m[0] + '</h2><p>' + esc(m[1]) + '</p><div class="acoes"><button class="bt pri" ' + m[3] + '>' + m[2] + '</button></div></div>';
    }
    var g = { er: [], al: [], in: [], ok: [] }; U.vers().forEach(function (x) { g[x.s].push(x); });
    var nAl = g.al.filter(function (x) { return !x.cf; }).length, nCf = g.al.length - nAl, pl = function (q, um, varios) { return q + ' ' + (q === 1 ? um : varios); }, h = cab;
    if (g.er.length) h += '<div class="cartao conc er"><span style="color:var(--fc-erro-texto)">' + U.IC.er.replace('<svg', '<svg width="36" height="36"') + '</span><h2>O sistema ainda não atende a norma: ' + pl(g.er.length, 'item não atende', 'itens não atendem') + (nAl ? ' e ' + pl(nAl, 'pede a sua conferência', 'pedem a sua conferência') : '') + '.' + (nCf ? ' ' + pl(nCf, 'item conferido por você', 'itens conferidos por você') + '.' : '') + '</h2><button class="bt pri" data-rolar="ver-' + g.er[0].v.id + '">Ver o que corrigir</button></div>';
    else h += '<div class="cartao conc ok"><span style="color:var(--fc-sucesso-texto,inherit)">' + U.IC.ok.replace('<svg', '<svg width="36" height="36"') + '</span><h2>' + (nAl ? 'Nenhum item em erro. ' + pl(nAl, 'item pede a sua conferência', 'itens pedem a sua conferência') + '.' : 'O sistema atende todos os itens verificados.') + (nCf ? ' ' + pl(nCf, 'item conferido por você', 'itens conferidos por você') + '.' : '') + '</h2></div>';
    if (sit.R.numeros.jatoUnico) h += U.aviso('in', 'Rede com um só hidrante simples: cálculo com um jato. A IT 22 define os dois jatos para sistemas com mais de um hidrante simples (4.8.3).');
    if (g.er.length) h += '<section class="cartao grupo"><div class="gt">' + U.pilula('er', 'Não atende') + '<h2 class="t3">' + pl(g.er.length, 'item para corrigir', 'itens para corrigir') + '</h2></div>' + g.er.map(function (x) { return item(x, true); }).join('') + '</section>';
    if (g.al.length) h += '<section class="cartao grupo"><div class="gt">' + U.pilula('al', 'Conferir') + '<h2 class="t3">' + pl(g.al.length, 'item que depende de você', 'itens que dependem de você') + (nCf ? ' (' + pl(nCf, 'conferido', 'conferidos') + ')' : '') + '</h2></div>' + g.al.map(function (x) { return item(x, true); }).join('') + '</section>';
    if (g.ok.length) h += '<details class="cartao grupo"' + (g.er.length || g.al.length ? '' : ' open') + '><summary>' + U.pilula('ok', 'Atende') + '<h2 class="t3">' + pl(g.ok.length, 'item atendido', 'itens atendidos') + '</h2></summary>' + g.ok.map(function (x) { return item(x); }).join('') + '</details>';
    return h;
  };

  /* Estatísticas: os números do cálculo para controle do projetista. Não são verificações: nada aqui aprova ou reprova. */
  /** 2.5.2: gráfico de barras horizontais em HTML (lista com rótulo, barra e valor). itens = [{r, v, t, cor}]; o = {lim, limTx, max}. */
  function barras(itens, o) {
    o = o || {}; itens = itens.filter(function (x) { return typeof x.v === 'number' && !isNaN(x.v); }); if (!itens.length) return '';
    var mx = Math.max.apply(null, itens.map(function (x) { return x.v; }).concat(o.lim ? [o.lim] : [], [o.max || 0])) * 1.04 || 1;
    return '<ul class="barras">' + itens.map(function (x) { return '<li><span class="b-r">' + x.r + '</span><span class="b-t">' + '<span class="b-f" style="width:' + Math.max(0.5, Math.min(100, x.v / mx * 100)).toFixed(1) + '%;background:var(--fc-' + (x.cor || 'agua') + ')"></span>' + (o.lim ? '<span class="b-l" style="left:' + (o.lim / mx * 100).toFixed(1) + '%"></span>' : '') + '</span><span class="b-v tec">' + x.t + '</span></li>'; }).join('') + '</ul>' +
      (o.lim ? '<p class="peq b-leg"><span class="b-l-ex"></span>' + o.limTx + '</p>' : '');
  }
  function cartao(t, sub, corpo, id) { return corpo ? '<div class="cartao bloco"' + (id ? ' id="' + id + '"' : '') + '><h2 class="t3">' + t + '</h2>' + (sub ? '<p class="peq">' + sub + '</p>' : '') + corpo + '</div>' : ''; }
  /** 2.5.3: cascata de pressões em barras horizontais, lida de cima para baixo, do hidrante
   *  mais desfavorável até a bomba. Subtotais em azul, cheios desde o início do eixo; parcelas flutuantes, vermelhas quando somam e verdes quando
   *  subtraem. Lista em HTML: o leitor de tela lê o rótulo e o valor de cada barra. agrupada = ramal, tronco e sucção numa barra cada. */
  U.cascataHtml = function (R, agrupada) {
    var c = M.cascata(R, agrupada), e = c.eixo, vao = e.b - e.a, pc = function (x) { return ((x - e.a) / vao * 100).toFixed(2); }, ticks = [];
    for (var t = e.a; t <= e.b + e.passo * 1e-6; t += e.passo) ticks.push(t);
    var grade = ticks.map(function (t) { return '<i style="left:' + pc(t) + '%"></i>'; }).join(''), cas = e.passo < 1 ? 1 : 0;
    var li = c.itens.map(function (x) {
      var sub = x.k === 'sub', x0 = sub ? e.o : x.acc - x.v, x1 = sub ? x.v : x.acc, l = Math.min(x0, x1), w = Math.max(0.4, Math.abs(x1 - x0) / vao * 100);
      var vt = sub ? fmt(x.v, 2) + ' mca' : '<span aria-hidden="true">' + (x.v > 0 ? '+ ' : '− ') + fmt(Math.abs(x.v), 2) + '</span><span class="so-leitor">' + (x.v > 0 ? 'soma ' : 'subtrai ') + fmt(Math.abs(x.v), 2) + ' mca</span>';
      return '<li class="' + (sub ? 'c-sub' : x.v > 0 ? 'c-soma' : 'c-subt') + '"><span class="c-r">' + esc(x.r) + '</span><span class="c-t" aria-hidden="true">' + grade + '<span class="c-b" style="left:' + pc(l) + '%;width:' + w.toFixed(2) + '%"></span></span><span class="c-v tec">' + vt + '</span></li>';
    }).join('');
    return '<ol class="casc" id="casc-lista" aria-label="Cascata de pressões, ' + (agrupada ? 'agrupada' : 'trecho a trecho') + ', do hidrante mais desfavorável até ' + (R.ctx.modo === 'bomba' ? 'a bomba' : 'o reservatório') + '">' + li + '</ol>' +
      '<div class="c-eixo" aria-hidden="true"><span class="c-r"></span><span class="c-t">' + ticks.map(function (t) { return '<span style="left:' + pc(t) + '%">' + fmt(t, cas) + '</span>'; }).join('') + '</span><span class="c-v"></span></div>' +
      '<p class="peq c-un" aria-hidden="true">pressão (mca)</p><ul class="c-leg"><li><span class="cor c-cor-sub"></span>subtotal</li><li><span class="cor c-cor-soma"></span>soma</li><li><span class="cor c-cor-subt"></span>subtrai</li></ul>';
  };
  U.telas.estat = function () {
    var sit = S.sit, h = '<div class="cab"><div class="tx"><h1>Estatísticas</h1></div></div>';
    if (sit.k !== 'ok') return h + '<div class="vazia"><h2>Ainda não há números</h2><p>As estatísticas aparecem quando o projeto tiver resultado calculado.</p><div class="acoes"><button class="bt pri" data-ir="etapa:' + S.etapa + '">Voltar ao projeto</button></div></div>';
    var n = sit.R.numeros, N = U.norma(), F = S.F, b = U.bombaDe(F.bomba.id), vs = sit.R.verificacoes;
    var L = function (r, v, un) { return v === undefined || v === null || (typeof v === 'number' && isNaN(v)) ? '' : '<tr><th scope="row" style="width:55%">' + r + '</th><td class="tec">' + (typeof v === 'number' ? fmt(v, 2) : esc(v)) + (un ? ' ' + un : '') + '</td></tr>'; };
    // números principais
    h += '<dl class="kv kv-topo" id="est-kv" style="--n:' + (3 + (n.vmax !== undefined) + (n.rtiEfetiva !== undefined) + (n.dur !== undefined)) + '">' + U.kv(n.jatoUnico ? 'Vazão do jato' : 'Vazão dos dois jatos', fmt(n.Qt, 1), 'L/min', fmt(n.Qth, 2) + ' m³/h') + (F.fonte.modo === 'gravidade' ? U.kv('Folga por gravidade', fmt(-n.AMT, 2), 'mca') : U.kv('Altura manométrica', fmt(n.AMT, 2), 'mca') + U.kv('Pressão na descarga da bomba', fmt(n.Pd, 2), 'mca')) +
      (n.vmax !== undefined ? U.kv('Maior velocidade na rede', fmt(n.vmax, 2), 'm/s', 'limite de ' + fmt(N.vmaxRede, 1) + ' m/s') : '') + (n.rtiEfetiva !== undefined ? U.kv('Reserva efetiva', fmt(n.rtiEfetiva, 1), 'm³', 'a tabela pede ' + fmt(n.rtiTabela, 0) + ' m³', n.rtiEfetiva >= n.rtiTabela ? 'ok' : 'er') : '') + (n.dur !== undefined ? U.kv('Duração da reserva', fmt(n.dur, 0), 'min') : '') + '</dl>';
    // 2.5.3: gráficos. Cascata de pressões na largura toda e a curva da bomba. Saíram pressões do cálculo, verificações por situação, pressão em cada hidrante e velocidades.
    var ag = S.casc === 'g', gB = F.fonte.modo !== 'gravidade' && b ? U.graficoBomba() : '';
    var tog = '<div class="linha-ac c-tog" role="group" aria-label="Detalhe da cascata"><button class="bt min' + (ag ? ' lig' : ' pri') + '" data-acao="casc" data-v="t" aria-pressed="' + !ag + '">Trecho a trecho</button><button class="bt min' + (ag ? ' pri' : ' lig') + '" data-acao="casc" data-v="g" aria-pressed="' + ag + '">Agrupada: ramal, tronco e sucção</button></div>';
    h += '<div class="cartao bloco" id="est-cascata"><h2 class="t3">Do hidrante mais desfavorável até ' + (F.fonte.modo === 'bomba' ? 'a bomba' : 'o reservatório') + '</h2><p class="peq">Lendo de cima para baixo, anda-se do hidrante até ' + (F.fonte.modo === 'bomba' ? 'a bomba' : 'o reservatório') + '. Barras azuis são a pressão acumulada; barras vermelhas somam; barras verdes subtraem. Em mca, na vazão de projeto.</p>' + tog + U.cascataHtml(sit.R, ag) + '</div>' +
      '';
    // 2.6.0: um cartão só, "Hipótese de cálculo", com a hipótese, as perdas, a bomba e a reserva; a curva da bomba fica ao lado
    var gr = function (linhas) { return linhas ? '<tbody class="grupo">' + linhas + '</tbody>' : ''; };
    var corpo = gr(L(n.jatoUnico ? 'Hidrante calculado' : 'Par mais desfavorável', n.par) + L('Hidrante mais desfavorável', n.critico) + L('Vazão no mais desfavorável', n.Qcrit, 'L/min') + L('Pressão na válvula do mais desfavorável', n.Pvcrit, 'mca') +
      (n.jatoUnico ? '' : L('Vazão no outro jato (' + esc(n.outro) + ')', n.Qout, 'L/min') + L('Pressão na válvula do outro jato', n.Pvout, 'mca') + L('Nó onde o par se divide', n.A) + L('Pressão nesse nó', n.PA, 'mca') + L('Diferença de pressão entre os ramais no nó', n.dif, 'mca')) + L('Vazão total', n.Qt, 'L/min') + L('Vazão total', n.Qth, 'm³/h')) +
      gr(L('Perda de carga no trecho comum', n.hfTr, 'mca') + L('Perda de carga na sucção', n.hfSuc, 'mca') + (F.fonte.modo === 'gravidade' ? L('Folga por gravidade', -n.AMT, 'mca') : L('Pressão na descarga da bomba', n.Pd, 'mca') + L('Altura manométrica total', n.AMT, 'mca')) + L('Maior velocidade na rede', n.vmax, 'm/s') + L('Velocidade na sucção', n.vSuc, 'm/s')) +
      gr(L('Altura da bomba na vazão de projeto', n.Hb, 'mca') + L('Folga sobre a altura manométrica', n.margem, 'mca') + L('Ponto de trabalho, vazão', n.Qw, 'm³/h') + L('Ponto de trabalho, altura', n.Hw, 'mca') + L('NPSH disponível a 1,0 Q', n.NPSHd1, 'mca') + L('NPSH disponível a 1,5 Q', n.NPSHd, 'mca') + L('NPSH requerido da bomba' + (n.Qverif ? ', verificado a ' + (n.Qverif === 1.5 ? '1,5 Q' : '1,0 Q') : ''), n.NPSHr, 'mca') + L('Altura máxima de aspiração', n.hgMax, 'm') + L('Pressão dinâmica máxima numa válvula', n.dinamica100, 'mca') +
        (n.escada ? L('Desliga a bomba de pressurização', n.escada.desligaJockey, 'mca') + L('Liga a bomba de pressurização', n.escada.ligaJockey, 'mca') + L('Liga a bomba principal', n.escada.ligaPrincipal, 'mca') : '') + L('Vazão da bomba de pressurização na partida', n.Qjl, 'L/min')) +
      gr(L('Reserva efetiva', n.rtiEfetiva, 'm³') + L('Reserva pela tabela', n.rtiTabela, 'm³') + L(n.jatoUnico ? 'Duração da reserva com um jato' : 'Duração da reserva com os dois jatos', n.dur, 'min') + (n.retorno && n.retorno.Q !== undefined ? L('Vazão no ramal de retorno', n.retorno.Q, 'L/min') + L('Vazão no retorno, da nominal', n.retorno.pct, '%') : ''));
    var hip = corpo ? '<div class="cartao bloco" id="est-hipotese"><h2 class="t3">Hipótese de cálculo</h2><div class="rolar"><table>' + corpo + '</table></div></div>' : '';
    h += '<div class="grade g-est" id="est-tabelas">' + (gB ? cartao('Curva da bomba e ponto de trabalho', '', gB, 'est-curva') : '') + hip + '</div>';
    // 2.6.0: pressão estática por ponto em linha inteira, dados à esquerda e barras horizontais à direita (só a estática, com o limite da norma)
    var es = n.estatica || [];
    if (es.length) {
      var lim = N.pmax, ba = barras(es.map(function (e) { return { r: esc(e.nome), v: e.P, t: fmt(e.P, 2), cor: e.P > lim ? 'erro' : 'agua' }; }), { lim: lim, limTx: 'limite de ' + fmt(lim, 0) + ' mca', max: lim });
      h += '<div class="cartao bloco" id="est-estatica"><h2 class="t3">Pressão estática por ponto (bomba fechada, reservatório cheio)</h2><div class="est-meio"><div class="rolar" id="est-estatica-dados"><table><tbody>' +
        es.map(function (e) { return L(esc(e.nome) + ' (cota ' + fmt(e.z, 2) + ' m)', e.P, 'mca'); }).join('') + '</tbody></table></div><div id="est-estatica-barras" aria-label="Pressão estática por ponto, em barras">' + ba + '</div></div></div>';
    }
    return h;
  };
  U.telas[U.POS.rel] = function () {
    var F = S.F, sit = S.sit, h = U.cab(U.POS.rel, 'Relatório', '');
    if (sit.k !== 'ok') return h + '<div class="vazia"><h2>Ainda não há relatório</h2><p>O relatório só é gerado com resultado calculado. ' + (sit.esgAusente ? 'O esguicho "' + esc(sit.esgAusente) + '" não está na base nem na biblioteca deste computador: escolha ou cadastre um esguicho na etapa Hidrantes.' : 'Complete as etapas anteriores.') + '</p><div class="acoes"><button class="bt pri" data-ir="etapa:' + (sit.esgAusente ? U.POS.hidr : U.POS.verif) + '">' + (sit.esgAusente ? 'Ir para o esguicho' : 'Ver o que falta') + '</button></div></div>';
    var n = sit.R.numeros, c = U.contaVer(), er = sit.R.verificacoes.filter(function (v) { return v.situacao === 'ERRO'; }), b = U.bombaDe(F.bomba.id), falta = [];
    [['rt', 'responsável técnico'], ['registro', 'CREA ou CAU'], ['art', 'ART ou RRT'], ['escritorio', 'razão social do escritório'], ['cnpj', 'CNPJ']].forEach(function (x) { if (!String(F.ident[x[0]]).trim()) falta.push(x[1]); });
    if (er.length) h += U.aviso('er', '<b>Projeto com verificação não atendida.</b> O relatório sai com esta ressalva: ' + er.map(function (v) { return esc(U.VT[v.id] || v.titulo) + ' (' + esc(vir(v.valor)) + ')'; }).join('; ') + '. <button class="bt lig min" data-ir="etapa:' + U.POS.verif + '">Ver as verificações</button>');
    if (falta.length) h += U.aviso('al', 'Faltam dados para o cabeçalho do relatório: ' + falta.join(', ') + '. <button class="bt lig min" data-corrigir="ident.rt">Preencher na etapa Identificação</button>');
    h += '<div class="cartao bloco"><h2 class="t3">Resumo do projeto</h2><div class="rolar"><table><tbody>' +
      [['Obra', esc(F.ident.obra)], ['Norma', esc(U.norma().nome)], ['Tipo de sistema', esc(n.tipo)], [n.jatoUnico ? 'Hidrante calculado (um jato)' : 'Par mais desfavorável', esc(n.par)], [n.jatoUnico ? 'Vazão de um jato' : 'Vazão dos dois jatos', fmt(n.Qt, 1) + ' L/min (' + fmt(n.Qth, 2) + ' m³/h)'],
        ['Pressão na válvula do mais desfavorável', fmt(n.Pvcrit, 2) + ' mca em ' + esc(n.critico)], ['Altura manométrica total', fmt(n.AMT, 2) + ' mca'], ['Bomba', b ? esc(b.modelo) + ', ' + esc(U.potTxt(b, n.potEixo)) : 'sem bomba lançada'],
        ['Reserva de incêndio', (n.rtiEfetiva !== undefined ? fmt(n.rtiEfetiva, 0) + ' m³ efetivos' : 'não informada') + (n.rtiTabela ? ', ' + fmt(n.rtiTabela, 0) + ' m³ pela tabela' : '')], ['Verificações', c.ok + ' atendem, ' + c.er + ' não atendem, ' + c.al + ' a conferir' + (c.cf ? ', ' + c.cf + (c.cf === 1 ? ' conferido' : ' conferidos') + ' pelo projetista' : '')]]
        .map(function (l) { return '<tr><th scope="row" style="width:40%">' + l[0] + '</th><td>' + l[1] + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    h += '<div class="cartao bloco"><h2 class="t3">Arquivos</h2>';
    h += '<div class="linha-ac"><button class="bt pri" data-acao="xlsx">Baixar o relatório (.xlsx)</button><button class="bt pri" data-acao="docx" id="bt-docx">Baixar o memorial (.docx)</button><button class="bt" data-acao="salvar">Baixar o projeto (.json)</button></div></div>';
    return h;
  };

  U.baixa = function (nome, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; a.hidden = true; document.body.appendChild(a);   /* 2.5.1: o link do download não aparece para o leitor de tela */ a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  U.nomeArq = function () { return String(S.F.ident.obra || 'projeto').normalize('NFD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'projeto'; };
  /** 2.5.1: memorial de cálculo em .docx, montado sobre o mesmo modelo da planilha (os números são os mesmos). */
  U.baixaDocx = function () {
    if (typeof docx === 'undefined' || typeof FireDocx === 'undefined' || typeof FireExporta === 'undefined') { U.avisa('A biblioteca de documento não foi carregada neste arquivo.'); return; }
    try {
      var P = E.paraMotor(S.F, D, M), o = { versao: U.VERSAO, ident: E.clone(S.F.ident), V: U.V, conferidos: U.mapaConf(), cascataAgrupada: S.casc === 'g', autor: S.F.ident.rt || '' }, W = FireExporta.modelo(P, D, S.sit.R, M, { versao: U.VERSAO, ident: o.ident, conferidos: o.conferidos, logo: null }); FireExporta.avalia(W);
      docx.Packer.toBlob(FireDocx.gerar(docx, FireDocx.blocos(P, D, S.sit.R, M, W, o), o)).then(function (blob) { U.baixa(U.nomeArq() + '_memorial_de_calculo.docx', blob); U.avisa('Memorial baixado.'); }).catch(function (e) { U.avisa('Não foi possível gerar o memorial: ' + e.message); });
    } catch (e) { U.avisa('Não foi possível gerar o memorial: ' + e.message); }
  };
  U.baixaXlsx = function () {
    if (typeof ExcelJS === 'undefined' || typeof FireExporta === 'undefined') { U.avisa('A biblioteca de planilha não foi carregada neste arquivo.'); return; }
    try {
      var W = FireExporta.modelo(E.paraMotor(S.F, D, M), D, S.sit.R, M, { versao: U.VERSAO, ident: E.clone(S.F.ident), conferidos: U.mapaConf(), logo: typeof FIRELOGO === 'string' ? FIRELOGO : null }); FireExporta.avalia(W);
      FireExporta.gerar(ExcelJS, W).xlsx.writeBuffer().then(function (buf) { U.baixa(U.nomeArq() + '_memoria_de_calculo.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); U.avisa('Relatório baixado.'); });
    } catch (e) { U.avisa('Não foi possível gerar a planilha: ' + e.message); }
  };
  U.baixaJson = function () { U.baixa(U.nomeArq() + '.firecalc.json', new Blob([JSON.stringify(E.paraArquivo(S.F, D, M), null, 1)], { type: 'application/json' })); S.sujo = false; U.avisa('Projeto baixado.'); };
})();
