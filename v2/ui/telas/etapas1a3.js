/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, telas das etapas 1 (Identificação) e 2 (Edificação e sistema; até a 2.5.2 eram as etapas 2 e 3). */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, E = U.E, S = U.S, esc = U.esc, fmt = U.fmt;
  var COLS = {
    SP: { '1-t1': 'Coluna 1, subcoluna tipo 1', '1-t2': 'Coluna 1, subcoluna tipo 2', '2': 'Coluna 2', '3': 'Coluna 3', '4': 'Coluna 4' },
    PR: { '1': 'Coluna 1', '2': 'Coluna 2', '3': 'Coluna 3', '4': 'Coluna 4', '5': 'Coluna 5' } };
  U.COLS = COLS;

  U.telas[U.POS.ident] = function () {
    return U.cab(U.POS.ident, 'Identificação', '') +
      '<div class="cartao bloco"><h2 class="t3">Obra</h2><div class="form">' + U.campo('ident.obra', 'Nome da obra', { ex: 'Edifício Aurora', larga: true }) +
      U.escolha('norma', 'Norma do projeto', [['SP', 'São Paulo, IT 22/2025'], ['PR', 'Paraná, NPT 022']], { vazio: 'Escolha a norma', aj: 'Define a tabela de tipos, as pressões e as verificações.' }) +
      U.campo('ident.endereco', 'Endereço', { ex: 'Rua das Flores, 100' }) + U.campo('ident.municipio', 'Município', { ex: 'Pato Branco' }) + U.campo('ident.uf', 'UF', { ex: 'PR' }) + '</div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Condições do local</h2><div class="form">' + U.campoAjuda('ambiente.altitude', 'Altitude do município', { un: 'm', num: true, ex: '700' }, 'altitude') + U.campoAjuda('ambiente.temperatura', 'Temperatura da água', { un: '°C', num: true, ex: '20' }, 'temperatura') + '</div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Responsável técnico e escritório</h2><p class="peq">Não bloqueiam o cálculo. Se ficarem em branco, a etapa Relatório avisa.</p><div class="form">' +
      U.campo('ident.rt', 'Responsável técnico', { ex: 'Nome completo' }) + U.campo('ident.registro', 'CREA ou CAU', { ex: 'CREA-PR 000000/D' }) + U.campo('ident.art', 'ART ou RRT', { ex: 'número do documento' }) +
      U.campo('ident.escritorio', 'Razão social do escritório', { ex: 'Estúdio BIM Engenharia' }) + U.campo('ident.cnpj', 'CNPJ', { ex: '00.000.000/0001-00' }) + '</div></div>';
  };

  /* Uma solução da tabela da norma (uma coluna), com os parâmetros que ela traz para a área informada. */
  function solucao(k, area) {
    var F = S.F, cl = area > 0 ? M.classifica(D, F.norma, k, area) : null, id = cl ? E.tipoDe(cl.tipo, F.sistema.esg4) : null, t = id ? U.norma().tipos.filter(function (x) { return x.id === id; })[0] : null;
    return { k: k, cl: cl, t: t };
  }
  /** Posição do tipo na lista da norma (1, 2, 3, 4 com esguicho de 40, 4 com esguicho de 65, 5): serve para dizer se um tipo é superior ou inferior a outro. */
  /** 2.6.0: divisão, carga, coluna e área no formato do motor. */
  U.sistemaMotor = function () { var F = S.F, a = U.V.num(F.sistema.area), c = U.V.num(F.sistema.carga); return { coluna: F.sistema.coluna, area: a, divisao: F.sistema.divisao, carga: isNaN(c) ? undefined : c }; };
  /** Reserva pedida para o tipo t (ou nulo). */
  function rtiDe(t) { return t ? M.reservaPedida(D, S.F.norma, U.sistemaMotor(), t.id) : null; }
  function posTipo(id) { var ids = U.norma().tipos.map(function (t) { return t.id; }); return ids.indexOf(id === '4' ? '4-40' : id); }
  /** 2.6.0: botão de escolha do sistema: SVG à esquerda e uma linha por parâmetro à direita. tag 'button' escolhe; 'div' só mostra.
   *  o = {tag, atual, attr (atributos de dados), selo (texto curto ao lado do nome)} */
  function botaoSist(t, cl, o) {
    var N = U.norma(), tag = o.tag || 'button', nome = (t.mangueira <= 25 ? 'Mangotinho' : 'Hidrante') + ', sistema tipo ' + t.id;
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="opcao sbt' + (o.atual ? ' at' : '') + '"' + (tag === 'button' ? ' aria-pressed="' + !!o.atual + '"' : '') + (o.attr || '') + '>' + FireSVG.sistema(t) +
      '<span class="sb-tx"><span class="ot">' + (o.atual ? U.IC.ok : '') + esc(nome) + (o.selo ? '<span class="selo">' + esc(o.selo) + '</span>' : '') + '</span>' +
      '<span class="opl"><span>Vazão por jato</span> <b>' + fmt(t.Q, 0) + ' L/min</b></span>' +
      '<span class="opl"><span>Pressão mínima ' + (N.pressaoNo === 'valvula' ? 'na válvula' : 'no esguicho') + '</span> <b>' + fmt(t.P, 0) + ' mca</b></span>' +
      '<span class="opl"><span>Mangueira</span> <b>' + t.mangueira + ' mm</b></span>' +
      '<span class="opl"><span>Reserva de incêndio</span> <b>' + (cl ? fmt((rtiDe(t) || cl).rti, 0) + ' m³' : 'informe a área') + '</b></span></span></' + tag + '>';
  }
  /** Tipo da tabela para a coluna e a área do projeto (ou nulo). */
  function tipoTabela() {
    var F = S.F, area = U.V.num(F.sistema.area), cl = F.sistema.coluna && area > 0 ? M.classifica(D, F.norma, F.sistema.coluna, area) : null;
    return { cl: cl, id: cl ? E.tipoDe(cl.tipo, F.sistema.esg4) : null, area: area };
  }
  /** 2.6.0: só falta confirmar o tipo? Então o "Próximo" abre o aviso em vez de apontar um campo. */
  U.soTipo = function () { var cs = S.sit.campos.filter(function (x) { return x.etapa === U.POS.edif && x.n !== 'alerta'; }); return cs.length > 0 && cs.every(function (x) { return x.c === 'conf.tipo'; }); };
  /** Corpo do aviso de confirmação do tipo. */
  U.corpoConfirmaTipo = function () {
    var to = U.tipoObj(), tt = tipoTabela(); if (!to) return '';
    return '<div class="opcoes sist">' + botaoSist(to, tt.cl, { tag: 'div', atual: true }) + '</div><p style="margin-top:12px">Confirma este sistema para o projeto?</p>';
  };
  /** 2.6.0: menu "Alterar sistema": qualquer tipo da norma, mesmo fora do que a divisão prevê. O tipo inferior ao da tabela é aceito e
   *  não atende na verificação V30. */
  function corpoSistema() {
    var F = S.F, N = U.norma(), tt = tipoTabela(), to = U.tipoObj(), h = '<h2 id="dlg-tit" style="margin-bottom:12px">Alterar sistema</h2><div class="opcoes sist">';
    N.tipos.forEach(function (t) {
      var rpt = rtiDe(t), selo = tt.id ? (t.id === tt.id || (rpt && rpt.admitido) ? 'Tabela' : posTipo(t.id) > posTipo(tt.id) ? 'Superior' : 'Inferior') : '';
      h += botaoSist(t, tt.cl, { atual: !!to && to.id === t.id, selo: selo, attr: ' data-sistipo="' + esc(t.id) + '"' });
    });
    return h + '</div><div class="linha-ac" style="margin-top:16px">' + (F.sistema.tipoManual ? '<button type="button" class="bt" data-sistabela="1">Voltar ao que a tabela indica</button>' : '') + '<button type="button" class="bt pri" data-fechar="1">Fechar</button></div>';
  }
  U.dialogoSistema = function () {
    var d = document.getElementById('dlg'), F = S.F; if (!U.norma()) return;
    d.dataset.modo = 'sistema'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoSistema(); d.oninput = null; d.onchange = null;
    d.onclick = function (ev) {
      var b = ev.target.closest('[data-sistipo]'), tt = tipoTabela();
      if (b) { F.sistema.tipoManual = tt.id && b.dataset.sistipo === tt.id ? '' : b.dataset.sistipo; F.conf.tipo = false; U.mudou(); d.close(); return; }
      if (ev.target.closest('[data-sistabela]')) { F.sistema.tipoManual = ''; F.conf.tipo = false; U.mudou(); d.close(); return; }
      if (ev.target.closest('[data-fechar]') || ev.target === d) d.close();
    };
    d.onclose = function () { d.dataset.modo = ''; var bt = document.querySelector('[data-acao="alterar"]'); if (bt) bt.focus(); };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('.opcao[aria-pressed="true"]') || d.querySelector('.opcao'); if (p1) p1.focus();
  };
  /* 2.5.3: Edificação e sistema numa etapa só. 2.6.0: sem "Tipo adotado" e sem "Por que isso?"; os botões de escolha do sistema levam o SVG e os
   * quatro parâmetros; "Alterar sistema" substitui o enquadramento manual; a confirmação do tipo sai do cartão e vem como aviso no "Próximo". */
  U.telas[U.POS.edif] = function () {
    var F = S.F, N = U.norma(), h = U.cab(U.POS.edif, 'Edificação e sistema', '');
    if (!N) return h + U.aviso('in', 'Escolha a norma na etapa Identificação para ver a classificação. <button class="bt lig min" data-corrigir="norma">Ir para a norma</button>');
    var g = S.sit.ctx.sugestao, cols = COLS[F.norma], tab = F.norma === 'SP' ? 'IT 22, Tabela 3' : 'NPT 022, Tabela 4', pedeCarga = S.sit.ctx.precisaCarga || !U.V.vazio(F.sistema.carga);
    var tt = tipoTabela(), area = tt.area, cl = tt.cl, tabT = tt.id, to = U.tipoObj(), man = !!F.sistema.tipoManual, rel = man && tabT ? posTipo(F.sistema.tipoManual) - posTipo(tabT) : 0, rpm = man && to ? rtiDe(to) : null; if (rel < 0 && rpm && rpm.admitido) rel = 0;
    h += '<div class="cartao bloco"><h2 class="t3">Dados da edificação</h2><div class="form dados-ed' + (pedeCarga ? ' c3' : '') + '">' +
      U.escolha('sistema.divisao', 'Divisão de ocupação', D.ocupacao.divisoes.map(function (d) { return [d.div, d.div + ', ' + d.desc]; }), { vazio: 'Escolha a divisão', cls: 'destaque' }) +
      U.campo('sistema.area', 'Área da edificação', { un: 'm²', ex: '1000', num: true, cls: 'destaque' }) +
      (pedeCarga ? U.campo('sistema.carga', 'Carga de incêndio', { un: 'MJ/m²', ex: '700', num: true, cls: 'destaque' }) : '') + '</div></div>';
    h += '<div class="cartao bloco" id="cartao-sistema"><div class="cab-ac"><h2 class="t3">Sistema</h2><button type="button" class="bt alt" data-acao="alterar" aria-haspopup="dialog">Alterar sistema</button></div>';
    if (F.sistema.colManual && F.sistema.coluna) {   // projeto de versão anterior com o enquadramento trocado à mão
      h += U.aviso('al', 'Enquadramento trocado à mão: <b>' + esc(cols[F.sistema.coluna] || F.sistema.coluna) + '</b> da ' + tab + (g && g.colunas ? ', no lugar de ' + g.colunas.map(function (k) { return cols[k] || k; }).join(' ou ') + ', que é o que a tabela indica para ' + esc(F.sistema.divisao) : '') + '. Justifique no memorial. <button class="bt lig min" data-acao="colauto">Voltar ao que a tabela indica</button>');
    } else if (!F.sistema.divisao) h += '<p class="peq">Escolha a divisão de ocupação. O sistema exigido aparece aqui.</p>';
    else if (!g || !g.colunas) h += U.aviso('al', esc(g ? g.msg : 'A tabela não traz esta divisão.') + (g && g.fonte ? ' <span class="peq">Fonte: ' + esc(g.fonte) + '.</span>' : ''));
    else if (!(area > 0)) h += '<p class="peq">Informe a área da edificação para ver o tipo de sistema e a reserva de incêndio.</p>';
    else if (g.colunas.length === 1) {
      var s1 = solucao(g.colunas[0], area);
      h += '<p>Para <b>' + esc(F.sistema.divisao) + '</b>' + (g.precisaCarga ? ', com carga de incêndio ' + esc(g.faixa) + ',' : '') + ' a norma pede:</p>' + (s1.t ? '<div class="opcoes sist">' + botaoSist(s1.t, s1.cl, { tag: 'div', atual: true }) + '</div>' : '');
    } else {
      h += '<p>Para <b>' + esc(F.sistema.divisao) + '</b> a norma aceita duas soluções. Escolha a que o projeto vai usar:</p><div class="opcoes sist">' + g.colunas.map(function (k) {
        var s = solucao(k, area); return s.t ? botaoSist(s.t, s.cl, { atual: F.sistema.coluna === k && !man, attr: ' data-acao="coluna" data-v="' + esc(k) + '"' }) : ''; }).join('') + '</div>' +
        (F.sistema.coluna ? '' : (U.msg('sistema.coluna') ? '<div class="msg-er" id="' + U.idDe('sistema.coluna') + '-m">' + esc(U.msg('sistema.coluna').msg) + '</div>' : ''));
    }
    if (man && to) {
      h += U.aviso(rel < 0 ? 'er' : 'al', 'Tipo alterado: adotado o tipo ' + esc(F.sistema.tipoManual) + (tabT ? (rel === 0 ? ', que a tabela também admite para a divisão' : ', ' + (rel < 0 ? 'inferior' : 'superior') + ' ao tipo ' + esc(tabT) + ' da tabela') : '') + '.' + (rel < 0 ? ' A verificação do tipo de sistema não atende.' : '') + ' <button type="button" class="bt lig min" data-acao="tipotabela">Voltar ao que a tabela indica</button>');
      h += '<div class="opcoes sist">' + botaoSist(to, cl, { tag: 'div', atual: true }) + '</div>';
    }
    if (F.norma === 'SP' && cl && (cl.tipo === '4' || cl.tipo === '4-40') && !man) h += '<div class="form">' + U.escolha('sistema.esg4', 'Esguicho do tipo 4', [['40', '40 mm (300 L/min, 65 mca)'], ['65', '65 mm (300 L/min, 30 mca)']], {}) + '</div>';
    return h + '</div>';
  };
})();
