/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, telas das etapas Hidrantes, Abastecimento e Bomba e automação, com o ramal de retorno do PR. Desde a 2.5.1 o Abastecimento vem antes da Rede; a posição de cada etapa está em U.POS. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, V = U.V, S = U.S, E = U.E, esc = U.esc, fmt = U.fmt;

  U.telas[U.POS.hidr] = function () {
    var F = S.F, PR = F.norma === 'PR', to = U.tipoObj(), h = U.cab(U.POS.hidr, 'Hidrantes', '');
    if (!F.hidrantes.length) return h + '<div class="vazia"><h2>Nenhum hidrante na rede</h2><p>Lance na etapa Rede um trecho que termine num nó começado por H (H1, H2...). Ele aparece aqui sozinho.</p><div class="acoes"><button class="bt pri" data-ir="etapa:' + U.POS.rede + '">Ir para a etapa Rede</button></div></div>';
    /* 2.6.0: saiu o subcartão da escolha da pressão calculada (tabela por hidrante); SP é sempre pela Tabela 2 na válvula e o PR pelo esguicho */
    h += U.cartaoLancamento();
    var gq = U.graficoHidrante() + U.quadroPressoes();   /* Curva à esquerda e pressões à direita, meia largura cada */
    h += (gq ? '<div class="g-hi4">' + gq + '</div>' : '') + U.parForcado();
    return h + U.cartaoPavimentosAntigos();   // 2.5.0 (item 9): o cartão saiu; arquivo antigo mostra a lista só para leitura
  };

  /* 2.6.0: mangueira à esquerda e esguicho à direita, meia largura cada, com desenho. Os valores vêm da tabela oficial do tipo e podem
   * ser alterados (ficam marcados e vão para o relatório; a fonte não é pedida). No esguicho, antes do botão "Selecionar esguicho", só o que o estado exige:
   * SP, o alcance; PR, a vazão e a pressão na ponta. Sem escolha, vale o esguicho padrão do diâmetro. */
  function campoL(k, rot, un, oficial, o) {
    o = o || {}; var a = E.lancAlterado(S.F, k);
    if (k === 'dn') return U.escolha('lanc.dn', rot + (a ? ' ' + U.pilula('al', 'alterado') : ''), [[25, '25 mm'], [40, '40 mm'], [65, '65 mm']], { num: true, aj: 'oficial: ' + oficial });
    return U.campo('lanc.' + k, rot + (a ? ' ' + U.pilula('al', 'alterado') : ''), { un: un, num: true, aj: o.aj || 'oficial: ' + oficial });
  }
  function linhaDl(r, v) { return '<div><dt>' + r + '</dt><dd>' + v + '</dd></div>'; }
  U.cartaoLancamento = function () {
    var F = S.F, PR = F.norma === 'PR', to = U.tipoObj(), l = F.lanc, of = l && l.of;
    if (!to || !of) return '<div class="g-hi1"><section class="cartao bloco hi-card" id="hi-mangueira" aria-labelledby="hi-mang-t"><h2 class="t3" id="hi-mang-t">Mangueira</h2><dl class="hi-l"><div><dt>Valores</dt><dd>a definir com o tipo de sistema</dd></div></dl></section>' +
      '<section class="cartao bloco hi-card" id="hi-esguicho" aria-labelledby="hi-esg-t"><h2 class="t3" id="hi-esg-t">Esguicho</h2><dl class="hi-l"><div><dt>Valores</dt><dd>a definir com o tipo de sistema</dd></div></dl></section></div>';
    var n = S.sit.k === 'ok' ? S.sit.R.numeros : null, dn = +l.dn || of.dn, mod = E.esguichoDe(F, M), padrao = !l.esg;
    var algum = ['Q', 'P', 'dn', 'L', 'alcance'].some(function (k) { return E.lancAlterado(F, k); }) || (PR && !l.PeAuto);
    /* mangueira */
    var hm = '<section class="cartao bloco hi-card" id="hi-mangueira" aria-labelledby="hi-mang-t"><h2 class="t3" id="hi-mang-t">Mangueira</h2><div class="hi-corpo">' + FireSVG.mangueira(dn) + '<div class="form hi-form">';
    if (!PR) hm += campoL('Q', 'Vazão por jato na válvula', 'L/min', fmt(of.Q, 0) + ' L/min') + campoL('P', 'Pressão mínima na válvula', 'mca', fmt(of.P, 0) + ' mca');
    hm += campoL('dn', 'Diâmetro', 'mm', of.dn + ' mm') + campoL('L', 'Comprimento', 'm', 'até ' + fmt(of.L, 0) + ' m');
    hm += '</div></div>';
    var mu = F.mangueirasUsuario || {};
    if (mu[String(dn)]) hm += '<p class="peq" id="mang-proj">Mangueira de ' + dn + ' mm com curva cadastrada neste projeto' + (mu[String(dn)].modelo ? ' (' + esc(mu[String(dn)].modelo) + ')' : '') + '. Fonte: ' + esc(mu[String(dn)].fonte || '') + '. ' + U.pilula('al', 'personalizado') + '</p>';
    else if (S.modo === 'personalizado') hm += '<p class="peq">Mangueira fora da base: <button class="bt lig min" data-ir="tela:cadastros" data-abrir-aba="cadastros:bib">cadastrar a curva do catálogo</button></p>';
    hm += '</section>';
    /* esguicho */
    var he = '<section class="cartao bloco hi-card" id="hi-esguicho" aria-labelledby="hi-esg-t"><h2 class="t3" id="hi-esg-t">Esguicho</h2><div class="hi-corpo">' + FireSVG.esguicho() + '<div class="form hi-form">';
    if (PR) he += campoL('Q', 'Vazão na saída do esguicho', 'L/min', fmt(of.Q, 0) + ' L/min') + campoL('P', 'Pressão mínima na ponta', 'mca', fmt(of.P, 0) + ' mca');
    else he += campoL('alcance', 'Alcance exigido do jato', 'm', fmt(of.alcance, 0) + ' m');
    he += '</div></div><div class="linha-ac hi-sel"><button type="button" class="bt" id="esg-sel" data-hi="esg" aria-haspopup="dialog">Selecionar esguicho</button></div>';
    he += '<dl class="hi-l" id="esg-dados">' + linhaDl('Modelo', esc(mod) + ' ' + U.pilula(padrao ? 'in' : 'ok', padrao ? 'padrão do diâmetro' : 'escolhido'));
    var cat = D.esguichos.filter(function (e) { return e.modelo === mod; });
    if (cat.length) { var ps = cat.map(function (e) { return e.P; }), qs = cat.map(function (e) { return e.Q; }); he += linhaDl('Catálogo', fmt(Math.min.apply(null, ps), 0) + ' a ' + fmt(Math.max.apply(null, ps), 0) + ' mca; ' + fmt(Math.min.apply(null, qs), 0) + ' a ' + fmt(Math.max.apply(null, qs), 0) + ' L/min'); }
    he += '</dl>';
    /* FC-014: esguicho escolhido que não está na base nem na biblioteca: aviso fixo, sem trocar o esguicho; lido uma vez ao entrar na etapa (role alert) */
    var ausente = E.esguichoAusente(F, D);
    if (ausente) { var key = ausente + '|' + F.norma, fala = S.esgFalado !== key; S.esgFalado = key; he += '<div id="esg-ausente"' + (fala ? ' role="alert"' : '') + '>' + U.aviso('al', esc(E.textoEsguichoAusente(ausente, F.norma))) + '</div>'; }
    if (PR) {
      var inf = !l.PeAuto, pp = n && n.pontoProjeto;
      he += '<div class="form hi-form">' + U.campo('lanc.Pe', 'Pressão de projeto na entrada' + (inf ? ' ' + U.pilula('al', 'informada') : ''), { un: 'mca', num: true, aj: l.PeMin === null ? 'mínima calculada depois de escolher o esguicho' : 'mínima calculada: ' + fmt(l.PeMin, 2) + ' mca' }) +
        campoL('alcance', 'Alcance exigido do jato', 'm', fmt(of.alcance, 0) + ' m') + '</div>';
      if (pp) he += '<dl class="hi-l" id="ponto-projeto">' + linhaDl('Hidrante', esc(n.critico)) + linhaDl('Entrada', fmt(pp.Pentrada, 2) + ' mca') + linhaDl('Vazão', fmt(pp.Q, 1) + ' L/min') +
        linhaDl('Ponta', pp.ponta === null ? 'sem dado no catálogo' : fmt(pp.ponta, 2) + ' mca') + linhaDl('Alcance', pp.alcance === null ? 'fora da tabela do fabricante' : fmt(pp.alcance, 1) + ' m') + linhaDl('Perda na mangueira', fmt(pp.mangueira, 2) + ' mca') + '</dl>';
    } else if (n && n.esguicho) {
      var ee = n.esguicho, lin = function (x) { return '<tr><th scope="row">' + esc(x.id) + '</th><td class="r">' + fmt(x.Pv, 2) + '</td><td class="r">' + fmt(x.Pe, 2) + '</td><td class="r">' + fmt(x.Q, 1) + '</td><td class="r">' + (x.alcance === null ? 'fora da tabela' : fmt(x.alcance, 1)) + '</td></tr>'; };
      he += '<div class="rolar" id="ate-esguicho" role="region" tabindex="0" aria-label="O que chega ao esguicho"><table class="tab-res"><caption class="peq" style="text-align:left;caption-side:top;padding-bottom:4px">O que chega ao esguicho</caption><thead><tr><th scope="col">Hidrante</th><th scope="col" class="r">Válvula <small>(mca)</small></th><th scope="col" class="r">Entrada <small>(mca)</small></th><th scope="col" class="r">Vazão <small>(L/min)</small></th><th scope="col" class="r">Alcance <small>(m)</small></th></tr></thead><tbody>' +
        lin(ee.crit) + (ee.out ? lin(ee.out) : '') + '</tbody></table></div>';
    }
    he += '</section>';
    return '<div class="g-hi1">' + hm + he + '</div>' + (algum ? '<div class="linha-ac"><button class="bt" data-acao="lancoficial">Voltar aos valores oficiais</button></div>' : '');
  };
  /* Menu sobreposto com os esguichos cadastrados (base e biblioteca do usuário), um por linha, com a faixa do catálogo; o primeiro é o padrão do diâmetro */
  function corpoEsg() {
    var F = S.F, l = F.lanc, dn = +l.dn || (l.of && l.of.dn) || 40, mods = [];
    D.esguichos.forEach(function (e) { if (mods.indexOf(e.modelo) < 0) mods.push(e.modelo); });
    var faixa = function (m) { var c = D.esguichos.filter(function (e) { return e.modelo === m; }), ps = c.map(function (e) { return e.P; }), qs = c.map(function (e) { return e.Q; }), as = c.map(function (e) { return e.alcance; });
      return fmt(Math.min.apply(null, ps), 0) + ' a ' + fmt(Math.max.apply(null, ps), 0) + ' mca; ' + fmt(Math.min.apply(null, qs), 0) + ' a ' + fmt(Math.max.apply(null, qs), 0) + ' L/min; alcance de ' + fmt(Math.min.apply(null, as), 1) + ' a ' + fmt(Math.max.apply(null, as), 1) + ' m'; };
    var op = function (v, rot, sub) { var on = (l.esg || '') === v; return '<label class="esg-op' + (on ? ' sel' : '') + '"><input type="radio" name="esg" value="' + esc(v) + '"' + (on ? ' checked' : '') + '><span><b>' + rot + '</b><small>' + sub + '</small></span></label>'; };
    var h = '<h2 id="dlg-tit">Selecionar esguicho</h2><fieldset class="esg-lista"><legend class="peq">Esguichos cadastrados</legend>' + op('', 'Padrão do diâmetro: ' + esc(M.esguichoPadrao(dn)), faixa(M.esguichoPadrao(dn)));
    mods.forEach(function (m) { h += op(m, esc(m), faixa(m)); });
    return h + '</fieldset><div class="linha-ac" style="margin-top:16px"><button class="bt pri" data-fechar="1">Fechar</button></div>';
  }
  U.dialogoEsguicho = function () {
    var d = document.getElementById('dlg'); d.dataset.modo = 'esguicho'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoEsg();
    d.onclick = function (ev) { if (ev.target.closest('[data-fechar]') || ev.target === d) d.close(); };
    d.oninput = null;
    d.onchange = function (ev) { var b = ev.target; if (d.dataset.modo !== 'esguicho' || b.name !== 'esg') return; S.F.lanc.esg = b.value; U.mudou(); d.innerHTML = corpoEsg(); var r = d.querySelector('input[name="esg"]:checked'); if (r) r.focus(); };
    d.onclose = function () { if (d.open) return; /* 2.6.4: close atrasado de um fechamento anterior, com o menu já aberto de novo, não zera o modo */ d.dataset.modo = ''; var bt = document.getElementById('esg-sel'); if (bt) bt.focus(); };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('input[name="esg"]:checked') || d.querySelector('input'); if (p1) p1.focus();
  };
  document.addEventListener('click', function (ev) {
    var tr = ev.target.closest && !ev.target.closest('[data-hi],input,select') && ev.target.closest('#quadro-pressoes tr[data-h]');   /* O clique em qualquer lugar da linha mostra a curva */
    if (tr) { var bh = tr.querySelector('[data-hi="curva"]'); if (bh) bh.click(); return; }
    var t = ev.target.closest && ev.target.closest('[data-hi]'); if (!t || t.disabled) return;
    if (t.dataset.hi === 'esg') U.dialogoEsguicho();
    else if (t.dataset.hi === 'red') U.dialogoRedutora();
    else if (t.dataset.hi === 'curva') { S.hidCurva = t.dataset.h; U.desenhar(); var bc = document.querySelector('[data-hi="curva"][data-h="' + t.dataset.h + '"]'); if (bc) bc.focus({ preventScroll: true }); }
  });

  /* 2.6.4 (FC-033): o clique na linha da lista de bombas mostra a curva daquela bomba, sem escolher; só o botão Escolher escolhe. Foco devolvido ao mesmo controle. */
  document.addEventListener('click', function (ev) {
    var al = ev.target.closest && ev.target.closest('#tab-sugeridas tr[data-b], #tab-bombas-15 tr[data-b]');
    if (al && !ev.target.closest('button,input,select,a')) { var bl = al.querySelector('[data-vb]'); if (bl) bl.click(); return; }
    var t = ev.target.closest && ev.target.closest('[data-vb]'); if (!t || t.disabled) return;
    var F = S.F, id = t.dataset.vb, tab = t.closest('table'), tid = tab ? tab.id : '';
    if (id === F.bomba.id) id = '';
    var igual = (S.verBomba || '') === id; S.verBomba = id; S.verBombaBase = F.bomba.id; if (!igual) U.desenhar();
    var gr = document.getElementById('card-curva-bomba'); if (!igual && gr && window.innerWidth < 1100) gr.scrollIntoView({ block: 'nearest' });
    var fl = document.getElementById('fala'); if (fl && !igual) fl.textContent = id ? 'Curva da bomba ' + (U.bombaDe(id) || {}).modelo + ' em visualização no gráfico.' : 'Gráfico com a bomba escolhida.';
    var alvo = tid ? t.dataset.vb : F.bomba.id, bc = Array.prototype.filter.call(document.querySelectorAll((tid ? '#' + tid + ' [data-vb]' : '#tab-sugeridas [data-vb], #tab-bombas-15 [data-vb]')), function (x) { return x.dataset.vb === alvo; })[0];
    if (!bc && !tid && gr) bc = gr;   /* 2.6.4: ao voltar, a escolhida fora das listas deixa o foco no cartão do gráfico */
    if (bc) bc.focus({ preventScroll: true });
  });

  /* Válvula redutora de pressão no ponto: regulagem declarada, com fonte (leitura da ferramenta; a IT 22 só dá o limite de 100 mca) */
  U.pegaObj = function (c) { var m = /^(hidrantes|cotasExtras)\.(\d+)$/.exec(c); return m ? S.F[m[1]][+m[2]] : null; };
  /* 2.6.0: a válvula redutora sai do cartão próprio e vira o botão "V. redutora" no cartão das pressões, com menu sobreposto.
   * Por ponto: a pressão de saída regulada (campo, sem fonte pedida), a estática e a dinâmica antes da válvula e depois dela, e o botão de tirar. */
  function pontosRed() {
    var F = S.F, com = [], sem = [];
    F.hidrantes.forEach(function (x, i) { (x.red ? com : sem).push(['hidrantes.' + i, 'Hidrante ' + (x.id || x.no)]); });
    F.cotasExtras.forEach(function (c, i) { if (String(c.nome || '').trim()) (c.red ? com : sem).push(['cotasExtras.' + i, 'Pavimento ' + c.nome]); });
    return { com: com, sem: sem };
  }
  U.nRedutoras = function () { return pontosRed().com.length; };
  function corpoRed() {
    var pr = pontosRed(), sit = S.sit, n = sit.k === 'ok' ? sit.R.numeros : null, lr = (n && n.redutoras) || [], lp = n && sit.R.par && sit.R.ctx ? M.pressoesHidrantes(sit.R.ctx, sit.R.par) : [];
    var h = '<h2 id="dlg-tit">Válvula redutora de pressão</h2>';
    if (pr.com.length) {
      h += '<div class="rolar" role="region" tabindex="0" aria-label="Válvulas redutoras do projeto"><table class="tab-res" id="red-tab"><thead><tr><th scope="col">Ponto</th><th scope="col" class="r">Saída regulada <small>(mca)</small></th><th scope="col" class="r">Estática antes <small>(mca)</small></th><th scope="col" class="r">Estática depois <small>(mca)</small></th><th scope="col" class="r">Dinâmica antes <small>(mca)</small></th><th scope="col" class="r">Dinâmica depois <small>(mca)</small></th><th scope="col"><span class="so-leitor">Ação</span></th></tr></thead><tbody>';
      pr.com.forEach(function (p) {
        var o = U.pegaObj(p[0]), nome = o.id || o.nome, r = lr.filter(function (x) { return x.nome === nome; })[0], q = lp.filter(function (x) { return x.id === nome; })[0], v = function (x) { return x === null || x === undefined || isNaN(x) ? 'sem dado' : fmt(x, 2); }; var vd = function (x) { return sit.k === 'ok' && /^cotasExtras\./.test(p[0]) ? 'sem hidrante na rede' : v(x); };
        var ea = r ? r.montante : null, ed = r && r.montante !== null ? Math.min(r.montante, r.P) : null, da = q ? (q.dinSem !== undefined ? q.dinSem : q.din) : null, dd = q ? q.din : null;
        h += '<tr><th scope="row" style="padding-top:14px">' + esc(p[1]) + (r && r.situacao === 'ERRO' ? ' ' + U.pilula('er', 'Não atende') : '') + '</th>' + U.celula(p[0] + '.redP', 'Pressão de saída regulada da válvula redutora, ' + p[1] + ', em metros de coluna de água', 'num') +
          '<td class="r">' + v(ea) + '</td><td class="r">' + v(ed) + '</td><td class="r">' + vd(da) + '</td><td class="r">' + vd(dd) + '</td>' +
          '<td class="r"><button class="bt lig min" data-acao="tirared" data-v="' + p[0] + '" aria-label="Tirar a válvula redutora, ' + esc(p[1]) + '">tirar</button></td></tr>';
      });
      h += '</tbody></table></div>';
      var avs = lr.filter(function (r) { return r.avisos.length; }); if (avs.length) h += '<ul class="peq" id="red-avisos">' + avs.map(function (r) { return '<li>' + esc(r.nome) + ': ' + esc(r.avisos.join('; ')) + '</li>'; }).join('') + '</ul>';
    } else h += '<p class="peq">Nenhuma válvula redutora no projeto.</p>';
    if (pr.sem.length) h += '<div class="linha-ac"><select class="campo" id="red-ponto" aria-label="Ponto que recebe a válvula redutora" style="max-width:260px">' + pr.sem.map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>'; }).join('') + '</select><button class="bt" data-acao="maisred">Adicionar válvula redutora</button></div>';
    return h + '<div class="linha-ac" style="margin-top:16px"><button class="bt pri" data-fechar="1">Fechar</button></div>';
  }
  U.dialogoRedutora = function () {
    var d = document.getElementById('dlg'); d.dataset.modo = 'redutora'; d.setAttribute('aria-labelledby', 'dlg-tit'); d.innerHTML = corpoRed();
    var refaz = function (foco, ms) { setTimeout(function () { if (d.dataset.modo !== 'redutora' || !d.open) return; var at = document.activeElement, ini = at && at.selectionStart, fim = at && at.selectionEnd; if (at && d.contains(at) && at.id && !foco) foco = at.id;
      d.innerHTML = corpoRed(); var e = foco && document.getElementById(foco); if (!e) e = d.querySelector('#red-tab input') || d.querySelector('select,button'); if (e) { e.focus(); if (at && e.id === at.id && typeof ini === 'number') try { e.setSelectionRange(ini, fim); } catch (x) { /* sem cursor */ } } }, ms || 0); }, tIn = null;
    d.onclick = function (ev) {
      if (ev.target.closest('[data-fechar]') || ev.target === d) { d.close(); return; }
    };
    /* adicionar e tirar passam pelo app.js (data-acao), que chama U.refazDlg logo depois de mudar o projeto, antes de pôr o foco no campo novo */
    U.refazDlg = function () { if (d.dataset.modo === 'redutora' && d.open) d.innerHTML = corpoRed(); };
    /* digitando: o menu é refeito 250 ms depois da última tecla, com o foco e a seleção de volta, para mostrar as pressões e as mensagens do campo */
    d.oninput = function (ev) { if (d.dataset.modo !== 'redutora' || !ev.target.dataset || !/\.redP$/.test(ev.target.dataset.c || '')) return; clearTimeout(tIn); tIn = setTimeout(function () { refaz(null); }, 250); };
    d.onchange = function (ev) { if (d.dataset.modo === 'redutora' && ev.target.dataset && /\.redP$/.test(ev.target.dataset.c || '')) refaz(null, 120); };
    d.onclose = function () { if (d.open) return; /* 2.6.4: close atrasado de um fechamento anterior, com o menu já aberto de novo, não zera o modo */ d.dataset.modo = ''; var bt = (U.redRodape && document.querySelector('#pe [data-acao="red-rodape"]')) || document.getElementById('red-abrir'); U.redRodape = false; if (bt) bt.focus(); };
    if (!d.open) d.showModal();
    var p1 = d.querySelector('#red-tab input') || d.querySelector('select,button'); if (p1) p1.focus();
  };

  /* 2.6.0: a tela do Abastecimento mudou para abastecimento.js; a figura do modo manual (U.figuraReservatorio) segue abaixo. */
  /* 2.6.0: sem "potência no eixo pela curva" no menu; a potência só aparece quando o catálogo dá o motor (cv) */
  function rotBomba(b) { return b.modelo + (b.rotorTxt ? ', rotor ' + b.rotorTxt + ' mm' : '') + ' (' + (b.cv ? fmt(b.cv, b.cv % 1 ? 1 : 0) + ' cv, ' : '') + b.serie + ')'; }
  /** Bomba KSB: o que foi lido da folha de curvas (potência no eixo, NPSH requerido). */
  function catalogoKsb() {
    var F = S.F, b = U.bombaDe(F.bomba.id), n = S.sit.k === 'ok' ? S.sit.R.numeros : null, h = ''; if (!b || b.fabricante !== 'KSB') return '';
    if (b.npsh && n && n.NPSHrForaDaCurva && U.npshObr()) {
      var qs = b.npsh.map(function (p) { return p[1]; }), fx = fmt(Math.min.apply(null, qs), 1) + ' a ' + fmt(Math.max.apply(null, qs), 1) + ' m³/h';
      h += U.aviso('al', 'A ' + (n.Qverif === 1.5 ? '1,5 vez a vazão de projeto' : 'vazão de projeto') + ' (' + fmt((n.Qverif === 1.5 ? n.Q15 : n.Qt) * 0.06, 2) + ' m³/h)' + ' fica fora da faixa da curva de NPSH do catálogo (' + fx + '): não há leitura. Informe o valor do fabricante no cartão Bomba escolhida.');
    }
    return '<div id="ksb-info" style="margin-top:12px">' + h + '</div>';
  }
  /** 2.5.1: o que o projeto precisa e o que a bomba escolhida entrega, em cartões separados e lado a lado, acima da escolha.
   *  "Necessário" é do projeto; "da bomba" é do catálogo. Nenhum texto diz que atende quando não atende.
   *  2.5.2: cada valor em um quadro próprio (rótulo em cima, número e unidade embaixo), que se rearruma pela largura do cartão. */
  U.kv = function (rot, val, un, extra, cls) { return '<div class="kv-i' + (cls ? ' ' + cls : '') + '"><dt>' + rot + '</dt><dd><b>' + val + '</b>' + (un ? ' <span class="un">' + un + '</span>' : '') + (extra ? '<small>' + extra + '</small>' : '') + '</dd></div>'; };
  /** 2.5.4. Ponto de projeto em duas linhas: em cima, a vazão de projeto (1,0 Q), a altura manométrica e o
   *  NPSH disponível; embaixo, só com sucção negativa, as mesmas três coisas a 1,5 vez a vazão de projeto (a altura manométrica é a mesma). O cartão da
   *  bomba escolhida mostra só a bomba: altura na vazão de projeto, ponto de trabalho, shut-off e, com sucção negativa, o NPSH requerido dela e a
   *  escolha de com qual NPSH disponível ele é comparado (1,0 Q ou 1,5 Q). A escolha comanda a verificação, a planilha e o memorial. */
  U.cartoesBomba = function (n) {
    var F = S.F, b = U.bombaDe(F.bomba.id), neg = n.NPSHd !== undefined, obr = neg && U.npshObr(), v15 = obr && b && n.Qverif === 1.5, v1 = obr && b && n.Qverif === 1, h = '<div class="grade g-bomba" id="bomba-cards">';
    var marca = function (usa) { return usa ? 'usado na verificação da bomba escolhida' : !obr && neg ? U.pilula('in') : ''; };   /* 2.7.0 (FC-021): sucção positiva por tolerância em SP: só informação, sem pedir o requerido */
    h += '<div class="cartao bloco" id="card-nec"><h2 class="t3">Ponto de projeto (necessário)</h2>' +
      (neg ? '<p class="kv-tit">Na vazão de projeto (1,0 Q)</p>' : '') + '<dl class="kv kv-l" id="nec-l1">' +
      U.kv('Vazão de projeto', fmt(n.Qth, 2), 'm³/h', fmt(n.Qt, 1) + ' L/min, ' + (n.jatoUnico ? 'um jato' : 'dois jatos')) +
      U.kv('Altura manométrica necessária', fmt(n.AMT, 2), 'mca') +
      (neg ? U.kv('NPSH disponível a 1,0 Q', fmt(n.NPSHd1, 2), 'mca', marca(v1), v1 ? 'sel' : '') : '') + '</dl>';
    if (neg) h += '<p class="kv-tit">A 1,5 vez a vazão de projeto' + (U.sucNeg() ? ' (sucção negativa)' : '') + '</p><dl class="kv kv-l" id="nec-l2">' +
      U.kv('Vazão de 1,5 Q', fmt(n.Q15 * 0.06, 2), 'm³/h', fmt(n.Q15, 1) + ' L/min') +
      U.kv('Altura manométrica necessária', fmt(n.AMT, 2), 'mca', 'a mesma') +
      U.kv('NPSH disponível a 1,5 Q', fmt(n.NPSHd, 2), 'mca', marca(v15), v15 ? 'sel' : '') + '</dl>';
    h += '</div><div class="cartao bloco" id="card-bomba"><h2 class="t3">Bomba escolhida</h2>';
    if (!b) h += '<p class="peq" id="card-bomba-vazio">Escolha a bomba na lista abaixo.</p>';
    else {
      var folga = n.Hb !== undefined ? n.Hb - n.AMT : null, hb = M.alturaBomba(b.pts, n.Qth);
      h += '<p class="bomba-nome" id="card-bomba-nome"><b>' + esc(b.modelo) + '</b><span>' + (b.rotorTxt ? 'rotor ' + esc(b.rotorTxt) + ' mm, ' : '') + esc(b.serie) + ', ' + esc(U.potTxt(b, n.potEixo)) + '.</span></p>' +
        '<dl class="kv kv-l" id="bomba-l1">' +
        (folga !== null ? U.kv('Altura da bomba na vazão de projeto', fmt(n.Hb, 2), 'mca', (folga >= 0 ? 'folga de ' + fmt(folga, 2) + ' mca sobre a necessária' : fmt(-folga, 2) + ' mca abaixo da necessária'), folga >= 0 ? 'ok' : 'er') : '') +
        (n.Qw !== undefined ? U.kv('Ponto de trabalho nesta rede', fmt(n.Qw, 1) + ' m³/h', '', fmt(n.Hw, 1) + ' mca') : '') +
        U.kv('Pressão a vazão nula (shut-off)', fmt(b.shutoff, b.shutoff % 1 ? 1 : 0), 'mca') + '</dl>';
      if (obr) h += U.npshBomba(n);
      if (folga !== null) h += '<div id="card-bomba-sit">' + (folga < 0 ? U.aviso('er', '<b>A bomba escolhida não entrega a altura necessária:</b> faltam ' + fmt(-folga, 2) + ' mca na vazão de projeto. Escolha outra bomba ou reveja a rede.') :
        hb.extrapolado ? U.aviso('al', 'A altura da bomba nessa vazão foi estimada pelo prolongamento da curva do catálogo. Confira com o fabricante.') : '<p class="peq">' + U.pilula('ok', 'Entrega a altura necessária') + '</p>') + '</div>';
    }
    return h + '</div></div>';
  };
  /** Linha de baixo do cartão da bomba escolhida: o NPSH requerido da bomba (ou o valor da curva KSB), a escolha da vazão de comparação e o resultado. */
  /** 2.7.0 (FC-021): o NPSH é conferido (campo do requerido, escolha de vazão e Atende ou Cavita) só quando o estado da sucção o obriga; na positiva por tolerância em SP é informação. */
  U.npshObr = function () { var s = V.succaoDe(S.F); return !!(s && s.npshObrigatorio); };
  U.npshBomba = function (n) {
    var q15 = n.Qverif === 1.5, h = '<div class="form form-npsh" id="bomba-l2">';
    h += n.NPSHrCurva ? '<dl class="kv kv-1">' + U.kv('NPSH requerido', fmt(n.NPSHr, 2), 'mca', 'da curva do catálogo, a ' + fmt((q15 ? n.Q15 : n.Qt) * 0.06, 2) + ' m³/h') + '</dl>' : U.campo('bomba.npshr', 'NPSH requerido', { un: 'mca', num: true });
    h += U.escolha('bomba.npshQ', 'Comparar com o NPSH disponível a', [['1', '1,0 Q (' + fmt(n.Qth, 2) + ' m³/h)'], ['1.5', '1,5 Q (' + fmt(n.Q15 * 0.06, 2) + ' m³/h)']]);
    h += '</div><div id="npsh-sit">';
    var dv = q15 ? n.NPSHd : n.NPSHd1;
    if (q15 && !n.atende15) h += U.aviso('al', 'A bomba escolhida não entrega a altura manométrica a 1,5 vez a vazão de projeto (' + fmt(n.H15, 2) + ' contra ' + fmt(n.AMT, 2) + ' mca a ' + fmt(n.Q15 * 0.06, 2) + ' m³/h). <button class="bt lig min" data-rolar="bombas-15">Ver as bombas que atendem a 1,5 Q</button>');
    if (n.NPSHr !== undefined) {
      var ok = dv >= n.NPSHr - 1e-9;
      h += '<p class="peq">' + U.pilula(ok ? 'ok' : 'er', ok ? 'Atende' : 'Cavita') + '</p><p class="peq">' +
        'NPSH disponível a ' + (q15 ? '1,5 Q' : '1,0 Q') + ' de ' + fmt(dv, 2) + ' mca, ' + (ok ? 'maior ou igual ao' : 'menor que o') + ' requerido de ' + fmt(n.NPSHr, 2) + ' mca.' +
        (ok ? '' : q15 ? ' Baixe a bomba, suba o nível da água, encurte a sucção, aumente o diâmetro dela ou escolha bomba com requerido menor.' : ' Escolha comparar a 1,5 Q e uma bomba que entregue ' + fmt(n.AMT, 2) + ' mca a ' + fmt(n.Q15 * 0.06, 2) + ' m³/h, e informe o NPSH requerido dela. <button class="bt lig min" data-rolar="bombas-15">Ver as bombas que atendem a 1,5 Q</button>') + '</p>';
    } else if (n.NPSHrForaDaCurva) h += U.aviso('al', 'A curva de NPSH do catálogo não cobre ' + fmt((q15 ? n.Q15 : n.Qt) * 0.06, 2) + ' m³/h: informe o NPSH requerido dado pelo fabricante.');   /* 2.6.4 (FC-008): o pedido do requerido vazio fica só na mensagem do campo */
    return h + '</div>';
  };
  /** 2.6.0: quantas bombas a lista sugerida mostra. */
  var N_SUGERIDAS = 5;
  /** Potência como o catálogo dá, só o valor e a unidade: cv do motor (Schneider) ou hp lido da curva na vazão da lista (KSB). */
  function potLista(b, q) { if (b.cv) return fmt(b.cv, b.cv % 1 ? 1 : 0) + ' cv'; var p = b.potEixo && q !== undefined ? M.leCurva(b.potEixo.pts, q) : null; return p === null || p === undefined ? '' : fmt(p, 1) + ' ' + esc(b.potEixo.unidade); }
  /** Uma linha de lista de bombas: modelo (com o rotor), potência, as colunas do meio e o botão de escolher. col = função que devolve as células do meio; acao = 'bomba' ou 'jockey'. */
  function linhaBomba(b, escolhida, meio, acao) {
    var ver = acao === 'bomba', vendo = ver && !escolhida && S.verBomba === b.id, nome = esc(b.modelo);
    return '<tr' + (ver ? ' data-b="' + esc(b.id) + '"' : '') + ' class="' + (escolhida ? 'sel' : '') + (vendo ? ' vendo' : '') + '"><td>' + (ver ? '<button type="button" class="bt lig min bt-ver" data-vb="' + esc(b.id) + '" aria-pressed="' + vendo + '" aria-label="Mostrar a curva da bomba ' + nome + '"><b>' + nome + '</b></button>' : '<b>' + nome + '</b>') + (b.rotorTxt ? ' <span class="peq">rotor ' + esc(b.rotorTxt) + ' mm</span>' : '') + (vendo ? ' <span class="pilula p-in pil-vendo">em visualização</span>' : '') + '</td>' + meio + '<td class="r"><button class="bt min' + (escolhida ? '' : ' pri') + '" data-acao="' + acao + '" data-v="' + esc(b.id) + '"' + (escolhida ? ' disabled' : '') + '>' + (escolhida ? 'Escolhida' : 'Escolher') + '</button></td></tr>';
  }
  /** 2.6.4 (FC-033): bombas da lista sugerida na vazão de projeto (as mesmas da tabela) e, quando aparece, as da lista a 1,5 Q. */
  function candBombas(n, q) { return D.bombas.filter(function (b) { return !b.jockey; }).map(function (b) { return { b: b, h: M.alturaBomba(b.pts, q) }; }).filter(function (x) { return !x.h.extrapolado && x.h.H >= n.AMT; }).sort(function (x, y) { return (x.h.H - y.h.H) || ((x.b.cv || 0) - (y.b.cv || 0)); }).slice(0, N_SUGERIDAS); }
  function mostra15(n) { return n.NPSHd !== undefined && U.npshObr() && (n.Qverif === 1.5 || (n.NPSHr !== undefined && n.NPSHd1 < n.NPSHr - 1e-9)); }
  /** Bomba em visualização (S.verBomba): só vale na etapa Bomba, sobre a mesma escolha de quando foi pedida, e enquanto estiver numa das listas. Sem isso volta à escolhida. */
  U.verBombaEf = function () {
    var sit = S.sit, id = S.verBomba; if (!id) return null;
    var ok = sit.k === 'ok' && S.verBombaBase === S.F.bomba.id && id !== S.F.bomba.id && S.tela === 'projeto' && S.etapa === U.POS.bomba && S.F.fonte.modo !== 'gravidade';
    if (ok) { var n = sit.R.numeros; ok = candBombas(n, n.Qth).concat(mostra15(n) ? candBombas(n, 1.5 * n.Qth) : []).some(function (x) { return x.b.id === id; }); }
    if (!ok) { S.verBomba = ''; return null; }
    return U.bombaDe(id) || null;
  };
  /** Lista das bombas sugeridas: modelo, potência, altura na vazão, shut-off e botão (sem série e sem folga). q = vazão em m³/h da altura mostrada. */
  function tabSugeridas(l, q, tit, id) {
    var F = S.F;
    return '<div class="rolar"><table class="tab-bomba" id="' + id + '"><thead><tr><th>Modelo</th><th class="r">Potência</th><th class="r">' + tit + ' <small>(mca)</small></th><th class="r">Shut-off <small>(mca)</small></th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' +
      l.map(function (x) { return linhaBomba(x.b, F.bomba.id === x.b.id, '<td class="r tec">' + potLista(x.b, q) + '</td><td class="r tec">' + fmt(x.h.H, 2) + '</td><td class="r tec">' + fmt(x.b.shutoff, 0) + '</td>', 'bomba'); }).join('') + '</tbody></table></div>';
  }
  /** Bombas que entregam a altura manométrica a 1,5 vez a vazão de projeto: aparecem quando a bomba escolhida cavita na vazão de projeto. */
  U.tabBombas15 = function (n) {
    var q = 1.5 * n.Qth, l = candBombas(n, q);
    var h = '<div id="bombas-15" style="margin-top:16px"><h3 class="t3">Bombas que entregam ' + fmt(n.AMT, 2) + ' mca a 1,5 vez a vazão de projeto (' + fmt(q, 2) + ' m³/h)</h3>';
    if (!l.length) return h + U.aviso('al', 'Nenhuma bomba do catálogo entrega essa altura a ' + fmt(q, 2) + ' m³/h dentro da curva. Reveja a sucção ou a rede.') + '</div>';
    return h + tabSugeridas(l, q, 'Altura a 1,5 Q', 'tab-bombas-15') + '</div>';
  };
  /** 2.6.0: bomba de pressurização no mesmo modelo da principal, lista à esquerda e curva à direita, e os pressostatos num cartão à parte.
   *  A lista mostra todas as bombas de pressurização do catálogo, sem filtro e sem indicação; a V15 e a V16 avisam nas Verificações. */
  U.blocoJockey = function (n) {
    var F = S.F, at = F.jockey.id, jb = D.bombas.filter(function (b) { return b.jockey; });
    var lista = '<div class="cartao bloco" id="card-jockey"><h2 class="t3">Bomba de pressurização (jockey)</h2><div class="rolar"><table id="tab-jockey"><thead><tr><th>Modelo</th><th class="r">Potência</th><th class="r">Shut-off <small>(mca)</small></th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' +
      jb.map(function (b) { return linhaBomba(b, at === b.id, '<td class="r tec">' + potLista(b) + '</td><td class="r tec">' + fmt(b.shutoff, 0) + '</td>', 'jockey'); }).join('') + '</tbody></table></div>' +
      (at ? '<div class="linha-ac"><button class="bt lig min" id="jockey-nenhuma" data-acao="jockey" data-v="">Sem bomba de pressurização</button></div>' : '') +
      '<div class="form">' + U.campo('saidas', 'Número de saídas do sistema', { num: true, aj: 'Em branco vale o número de hidrantes da rede (' + F.hidrantes.length + ').' }) + '</div></div>';
    var curva = '<div class="cartao bloco" id="card-curva-jockey"><h2 class="t3">Curva da bomba de pressurização</h2>' + (U.graficoJockey ? U.graficoJockey() : '') + '</div>';
    var pres = n && n.escada ? '<div class="cartao bloco" id="card-pressostatos"><h2 class="t3">Pressostatos</h2><div class="dados"><div><b>' + fmt(n.escada.desligaJockey, 1) + '</b>mca, desliga a bomba de pressurização</div><div><b>' + fmt(n.escada.ligaJockey, 1) + '</b>mca, liga a bomba de pressurização</div><div><b>' + fmt(n.escada.ligaPrincipal, 1) + '</b>mca, liga a bomba principal</div></div>' + (n.escada.cabe ? '' : U.aviso('al', 'A escada não cabe: o teto fica a menos de 10 mca da pressão calculada.')) + '</div>' : '';
    return '<div class="g-hi4" id="grade-jockey">' + lista + curva + '</div>' + pres;
  };
  U.telas[U.POS.bomba] = function () {
    var F = S.F, sit = S.sit, n = sit.k === 'ok' ? sit.R.numeros : null, h = U.cab(U.POS.bomba, 'Bomba e automação', '');
    U.verBombaEf();
    if (F.fonte.modo === 'gravidade') h += U.aviso('in', 'Sistema só por gravidade: não há bomba de incêndio a escolher.');
    else {
      if (n) h += U.cartoesBomba(n);
      /* 2.6.0: lista das sugeridas à esquerda e curva à direita, em meia largura cada (grade .g-hi4, empilha abaixo de 1100 px) */
      var esq = '<div class="cartao bloco" id="card-escolha"><h2 class="t3">Bomba de incêndio: escolha</h2>';
      if (!n) esq += U.aviso('in', 'A seleção assistida aparece quando houver resultado (etapas 1 a 5 completas).');
      else {
        var cand = candBombas(n, n.Qth);
        if (cand.length) esq += tabSugeridas(cand, n.Qth, 'Altura na vazão', 'tab-sugeridas');
        else esq += U.aviso('al', 'Nenhuma bomba do catálogo entrega ' + fmt(n.AMT, 2) + ' mca em ' + fmt(n.Qth, 2) + ' m³/h dentro da curva. Veja todas na lista abaixo ou reveja a rede.');
      }
      if (n && mostra15(n)) esq += U.tabBombas15(n);   // 2.5.4: comparação a 1,5 Q, ou cavita na vazão de projeto: bombas para 1,5 Q
      esq += '<div class="form">' + U.escolha('bomba.id', 'Outra bomba do catálogo (lista completa)', D.bombas.filter(function (b) { return !b.jockey; }).map(function (b) { return [b.id, rotBomba(b)]; }), { vazio: 'Nenhuma', larga: true, aj: U.bombaDe(F.bomba.id) && U.bombaDe(F.bomba.id).usuario ? 'Bomba cadastrada à mão. Fonte informada: ' + esc(U.bombaDe(F.bomba.id).fonte) + '.' : '' }) + '</div>';   // 2.5.4: menu da lista completa logo abaixo da tabela das recomendadas
      if (S.modo === 'personalizado') esq += '<p class="peq" id="lig-bib">Bomba fora do catálogo: <button class="bt lig min" data-ir="tela:cadastros" data-abrir-aba="cadastros:bib">cadastrar na minha biblioteca</button> (modo personalizado). Ela passa a aparecer nesta lista, com a fonte que você informar.</p>';
      esq += U.statusSuc() + catalogoKsb() + '</div>';
      h += n ? '<div class="g-hi4" id="grade-bomba">' + esq + '<div class="cartao bloco" id="card-curva-bomba" tabindex="-1"><h2 class="t3">Curva da bomba</h2>' + U.graficoBomba({ card: true, ver: true }) + '</div></div>' : esq;
      if (F.fonte.modo === 'bomba') {
        h += U.blocoJockey(n);
        // ramal de retorno (PR)
        if (F.norma === 'PR') {
          h += '<div class="cartao bloco"><h2 class="t3">Ramal de retorno para testes</h2><p class="peq">A ferramenta acha a vazão que passa pelo retorno com a bomba escolhida e o registro todo aberto (encontro da curva da bomba com a curva do ramal) e informa a perda que o registro de regulagem precisa dar para o ensaio ficar na vazão nominal. A faixa de 75% a 125% da nominal é a referência do ensaio.</p>' + U.marcar('retorno.ativo', 'Lançar o ramal de retorno.');
          if (F.retorno.ativo) {
            var et = U.pecasEd('retorno.trechos.0'), r = n && n.retorno;
            h += '<div class="form">' + U.campo('retorno.zDescarga', 'Cota da descarga no reservatório', { un: 'm', num: true }) + U.escolha('retorno.trechos.0.dn', 'Diâmetro do ramal', U.dns().map(function (d) { return [d, 'DN' + d]; }), { num: true }) + U.campo('retorno.trechos.0.L', 'Comprimento do tubo', { un: 'm', num: true }) + (S.modo === 'personalizado' ? U.campo('retorno.trechos.0.C', 'Fator C só do ramal de retorno <span class="pilula p-al">modo personalizado</span>', { num: true, aj: 'Em branco vale o fator C do projeto (' + esc(F.C || 'a definir') + ').' }) : '') + '</div>' + (S.modo !== 'personalizado' && String(U.pega('retorno.trechos.0.C') || '').trim() ? '<p class="peq">O ramal de retorno usa fator C próprio: <b>' + esc(U.pega('retorno.trechos.0.C')) + '</b> (o do projeto é ' + esc(F.C) + '). Para mudar, use o modo personalizado.</p>' : '') + '<p class="peq" style="margin-top:12px">Peças do ramal, com o registro todo aberto:</p>' + et.html;
            if (r && r.Q !== undefined) {
              var pc = Math.min(200, r.pct), regula = r.hReg100 >= 0;
              h += '<div class="dados" id="ret-dados"><div><b>' + fmt(r.Q, 1) + '</b>L/min com o registro todo aberto</div><div><b>' + fmt(r.pct, 0) + '%</b>da vazão nominal (' + fmt(r.Qnom, 1) + ' L/min)</div>' +
                (regula ? '<div><b>' + fmt(r.hReg, 1) + '</b>mca, perda do registro para a vazão nominal</div><div><b>' + fmt(Math.max(0, r.hReg125), 1) + ' a ' + fmt(r.hReg75, 1) + '</b>mca, perda do registro na faixa de 125% a 75%</div>' : '') + '</div>' +
                '<div class="faixa-ret" role="img" aria-label="Vazão com o registro todo aberto: ' + fmt(r.pct, 0) + '% da nominal; faixa de referência do ensaio de 75% a 125%"><div class="ok" style="left:37.5%;width:25%"></div><div class="m" style="left:' + (pc / 2) + '%"></div><span class="lb" style="left:37.5%">75%</span><span class="lb" style="left:62.5%">125%</span><span class="lb" style="left:' + (pc / 2) + '%;top:-20px;white-space:nowrap' + (r.pct > 200 ? ';transform:translateX(-100%)' : '') + '">' + fmt(r.pct, 0) + '%' + (r.pct > 200 ? ' (fora da escala)' : '') + '</span></div>' +
                '<p class="peq tec">Todo aberto: H da bomba = desnível + perda na sucção + perda no ramal: ' + fmt(r.H, 2) + ' = ' + fmt(r.dz, 2) + ' + ' + fmt(r.hfSuc, 2) + ' + ' + fmt(r.hfRet, 2) + ' mca' + (r.extrapolado ? ' (fora da curva do catálogo, extrapolado)' : '') + (regula ? '. Na vazão nominal a bomba dá ' + fmt(r.Hnom, 2) + ' mca' + (r.extrapoladoNom ? ' (fora da curva do catálogo, extrapolado)' : '') + '; o que sobra é a perda do registro.' : '') + '</p>' +
                (!r.ok ? U.aviso('er', 'Com o registro todo aberto o ramal só passa ' + fmt(r.pct, 0) + '% da vazão nominal: não chega a 75%. Aumente o diâmetro ou tire peças do ramal.')
                  : regula ? U.aviso('in', 'Atende. Com o registro todo aberto passa mais que a nominal; no ensaio, feche o registro de regulagem até a vazão cair para ' + fmt(r.Qnom, 1) + ' L/min (perda de ' + fmt(r.hReg, 1) + ' mca no registro). Use registro que regule vazão (globo ou equivalente).')
                    : U.aviso('in', 'Atende. Com o registro todo aberto o ramal passa ' + fmt(r.pct, 0) + '% da nominal, dentro da faixa de referência; não há o que regular.'));
            } else if (r && r.semCruzamento) h += U.aviso('er', 'A curva da bomba não encontra a curva do ramal. Confira a cota da descarga e as peças.');
            else if (n && !F.bomba.id) h += U.aviso('in', 'Escolha a bomba para ver a vazão no retorno.');
          }
          h += '</div>';
        }
      }
    }
    return h;
  };

  /* ---------- 2.5.0: hidrantes só de conferência, pavimentos de arquivo antigo, figura do reservatório, sucção pelas cotas, recalque escolhido na rede */
  U.celZHid = function (no) { var z = S.F.nos[no]; return '<td class="r tec" style="padding-top:14px">' + (V.vazio(z) ? '<button class="bt lig min" data-corrigir="nos.' + esc(no) + '">lançar na Rede</button>' : fmt(V.num(z), 2)) + '</td>'; };
  U.cartaoPavimentosAntigos = function () {
    var F = S.F; if (!F.cotasExtras.length) return '';
    return '<div class="cartao bloco" id="pav-antigos"><h2 class="t3">Pavimentos sem hidrante (arquivo de versão anterior)</h2><p class="peq">As cotas abaixo vieram do arquivo e continuam entrando na pressão estática máxima, só para leitura. Lance os hidrantes desses pavimentos na rede, que confere todos os pontos, e retire a lista.</p>' +
      '<div class="rolar"><table><thead><tr><th>Pavimento</th><th class="r">Cota da válvula <small>(m)</small></th></tr></thead><tbody>' + F.cotasExtras.map(function (c) { return '<tr><td>' + esc(c.nome) + '</td><td class="r tec">' + (V.vazio(c.z) ? 'sem cota' : fmt(V.num(c.z), 2)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="linha-ac"><button class="bt" data-acao="tiralista">Retirar a lista</button></div></div>';
  };
  /** Bomba afogada ou sucção negativa, só pelas cotas: true = sucção negativa; false = afogada; null = faltam cotas. */
  /* 2.6.0: três estados pela C.1.12 (afogada, positiva por tolerância, negativa); tomada por cima é sempre negativa. true = sucção negativa; null = faltam cotas. */
  U.sucNeg = function () { var s = V.succaoDe(S.F); return s ? s.estado === 'negativa' : null; };
  U.statusSuc = function () {
    var F = S.F, s = V.succaoDe(F), PR = F.norma === 'PR'; if (F.fonte.modo !== 'bomba') return '';
    if (!s) return '<p class="peq" id="suc-estado">Bomba afogada, sucção positiva ou sucção negativa: a ferramenta decide pelas cotas do nível X e do eixo da bomba, na <button class="bt lig min" data-ir="etapa:' + U.POS.abast + '">etapa Abastecimento</button>.</p>';
    var onde = s.g > 0 ? fmt(s.g, 2) + ' m acima do nível X' : fmt(-s.g, 2) + ' m abaixo do nível X', npsh = s.npshObrigatorio ? ': informe o NPSH requerido no cartão Bomba escolhida.' : ': o NPSH disponível aparece só como informação.';
    if (s.estado === 'negativa') return '<p class="peq" id="suc-estado">' + U.pilula('al', 'Sucção negativa') + ' Pelas cotas, o eixo da bomba fica ' + onde + (F.fonte.saida === 'cima' ? ', com a tomada por cima' : '') + npsh + '</p>';
    if (s.estado === 'positiva') return '<p class="peq" id="suc-estado">' + U.pilula('al', 'Sucção positiva, dentro da tolerância') + ' Pelas cotas, o eixo da bomba fica ' + onde + ', até ' + fmt(s.lim, 2) + ' m' + npsh + '</p>';
    return '<p class="peq" id="suc-estado">' + U.pilula('ok', 'Bomba afogada') + ' Pelas cotas, o eixo da bomba fica ' + onde + (PR ? npsh : ': o NPSH não se aplica e os campos não aparecem.') + '</p>';
  };
  /** Figura dinâmica do reservatório: desenha o que foi digitado na etapa Abastecimento (nível cheio, nível X e
   *  eixo da bomba; no reservatório elevado, a água e a saída). Esquema sem escala horizontal; o fundo do reservatório é só ilustrativo. */
  U.figuraReservatorio = function () {
    var F = S.F, bm = F.fonte.modo === 'bomba', n = V.num, zx = bm ? n(F.fonte.zX) : NaN, zc = n(F.fonte.zCheio), zb = bm ? n(F.nos.BI) : NaN, zr = n(F.nos.RI), falta = [];
    if (isNaN(zc)) falta.push('nível cheio'); if (bm && isNaN(zx)) falta.push('nível X'); if (bm && isNaN(zb)) falta.push('eixo da bomba'); if (!bm && isNaN(zr)) falta.push('nó RI');
    var vs = [zc, zx, zb, bm ? NaN : zr].filter(function (v) { return !isNaN(v); }), lo = vs.length ? Math.min.apply(null, vs) : 0, hi = vs.length ? Math.max.apply(null, vs) : 3;
    if (hi - lo < 2) { var md = (hi + lo) / 2; lo = md - 1; hi = md + 1; } var pd = (hi - lo) * 0.2; lo -= pd; hi += pd;
    var T = 26, B = 196; function Y(z) { return B - (z - lo) / (hi - lo) * (B - T); }
    var c = isNaN(zc) ? hi - pd : zc, x = bm ? (isNaN(zx) ? c - (hi - lo) * 0.4 : zx) : NaN, b = bm ? (isNaN(zb) ? c : zb) : NaN, s = '';
    var yc = Y(c), yx = bm ? Y(x) : NaN, yf = bm ? Math.min(236, yx + 34) : Math.min(236, yc + 70), yt = bm ? yf - 14 : NaN;
    function rot(y, txt, forte, outro) { var yy = y + 4; if (outro !== undefined && Math.abs(yy - outro) < 14) yy = outro + (yy >= outro ? 14 : -14); return '<text x="254" y="' + yy + '"' + (forte ? ' font-weight="700"' : '') + '>' + txt + '</text>'; }
    s += '<path d="M40 ' + (yc - 16) + 'V' + yf + 'H240V' + (yc - 16) + '" fill="none" stroke="var(--fc-texto-2)" stroke-width="2"/>';
    s += '<rect x="41" y="' + yc + '" width="198" height="' + (yf - yc - 1) + '" fill="var(--fc-info-fundo)"/>';
    s += '<line x1="40" x2="250" y1="' + yc + '" y2="' + yc + '" stroke="var(--fc-agua)" stroke-width="2"/>' + rot(yc, 'cheio ' + (isNaN(zc) ? 'a informar' : fmt(zc, 2)));
    if (bm) {
      s += '<rect x="41" y="' + yx + '" width="198" height="' + (yf - yx - 1) + '" fill="var(--fc-superficie-2)"/><text class="s" x="140" y="' + (yf - 4) + '" text-anchor="middle">abaixo do X, fora da reserva</text>';
      s += '<line x1="40" x2="250" y1="' + yx + '" y2="' + yx + '" stroke="var(--fc-fogo)" stroke-width="2" stroke-dasharray="6 4"/>' + rot(yx, 'nível X ' + (isNaN(zx) ? 'a informar' : fmt(zx, 2)), true, yc + 4);
      s += '<rect x="240" y="' + (yt - 6) + '" width="110" height="12" fill="var(--fc-agua)" opacity=".8"/><path d="M350 ' + yt + 'H430V' + Y(b) + '" fill="none" stroke="var(--fc-agua)" stroke-width="5" opacity=".8"/>';
      s += '<line x1="226" x2="226" y1="' + (yt - 6) + '" y2="' + yx + '" stroke="var(--fc-texto-2)" stroke-width="1.5"/><text class="s" x="220" y="' + ((yt - 6 + yx) / 2 + 4) + '" text-anchor="end">A</text>';
      s += '<circle cx="450" cy="' + Y(b) + '" r="15" fill="var(--fc-superficie)" stroke="var(--fc-agua)" stroke-width="2"/><text x="450" y="' + (Y(b) + 4) + '" text-anchor="middle" font-weight="700">BI</text><text x="472" y="' + (Y(b) + 4) + '">eixo ' + (isNaN(zb) ? 'a informar' : fmt(zb, 2)) + '</text>';
    } else s += '<path d="M140 ' + yf + 'V' + (yf + 12) + 'H330" fill="none" stroke="var(--fc-agua)" stroke-width="5" opacity=".8"/><text class="s" x="336" y="' + (yf + 16) + '">saída (nó RI ' + (isNaN(zr) ? 'a informar' : fmt(zr, 2)) + ')</text>';
    var st = '';
    var su = bm ? V.succaoDe(F) : null;   /* 2.6.0: estado pela C.1.12 */
    if (su) st = 'Pelas cotas, o eixo da bomba fica ' + (su.g > 0 ? fmt(su.g, 2) + ' m acima' : fmt(-su.g, 2) + ' m abaixo') + ' do nível X: ' + (su.estado === 'negativa' ? 'sucção negativa.' : su.estado === 'positiva' ? 'sucção positiva, dentro da tolerância.' : 'bomba afogada.');
    var rotA = 'Corte esquemático do reservatório com as cotas digitadas. ' + st + (falta.length ? ' Falta: ' + falta.join(', ') + '.' : '');
    var leg = bm ? 'A reserva de incêndio é a água entre o nível normal e o nível X. O fundo e a tomada estão fora de escala.' : 'Esquema fora de escala.';
    return '<div class="cartao bloco" id="fig-res"><h2 class="t3">Figura do reservatório</h2><svg class="fig-res" viewBox="0 0 560 260" role="img" aria-label="' + esc(rotA) + '">' + s + '</svg><p class="peq">' + (st ? '<b>' + esc(st) + '</b> ' : '') + (falta.length ? 'Posições provisórias: falta informar ' + esc(falta.join(', ')) + '. ' : '') + leg + '</p></div>';
  };
  U.cartaoRecalque = function () {
    var F = S.F, pts = V.pontosRecalque(F), leg = !F.recalque.no && (!V.vazio(F.recalque.z) || !V.vazio(F.recalque.L)), rr = F.recalque.no ? V.ramoRecalque(F, F.recalque.no) : null;
    var ops = pts.map(function (p) { return [p, p + (V.vazio(F.nos[p]) ? '' : ', cota ' + fmt(V.num(F.nos[p]), 2) + ' m')]; });
    if (F.recalque.no && pts.indexOf(F.recalque.no) < 0) ops.unshift([F.recalque.no, F.recalque.no + ' (não é ponta de ramo da rede)']);
    var h = '<div class="form">' + U.escolha('recalque.no', 'Ponto da rede que é o recalque', ops, { vazio: leg ? 'Lançado à parte (arquivo de versão anterior)' : (pts.length ? 'Escolha o ponto' : 'Nenhuma ponta de ramo sem hidrante'), larga: true, aj: 'Lance na tabela acima o ramo até a entrada do recalque (por exemplo, C-REC1). O ramo fica fora do cálculo; a cota, o diâmetro e o comprimento vêm dele.' }) +
      U.escolha('recalque.tipo', 'Tipo e posição', [['fachada', 'Coluna na fachada'], ['muro', 'Coluna em abrigo embutido no muro'], ['passeio', 'No passeio público']], { vazio: 'A definir', aj: F.norma === 'PR' ? 'De preferência do tipo coluna; no passeio é opção.' : 'Coluna na fachada ou em abrigo embutido no muro; no passeio só com impossibilidade técnica comprovada.' }) + '</div>';
    if (rr && rr.ok) h += '<div class="dados" id="rec-dados"><div><b>' + esc(rr.deriva) + '</b>derivação na rede</div><div><b>' + (V.vazio(rr.z) ? 'a informar' : fmt(V.num(rr.z), 2)) + '</b>m, cota da entrada</div><div><b>DN' + esc(rr.dn) + '</b>diâmetro</div><div><b>' + (isNaN(rr.L) ? 'sem dado' : fmt(rr.L, 2)) + '</b>m de tubo até a rede</div></div>';
    else if (leg) h += '<div class="form">' + U.campo('recalque.z', 'Cota da entrada do recalque', { un: 'm', ex: '1,00', num: true }) + U.escolha('recalque.dn', 'Diâmetro', U.dns().map(function (d) { return [d, 'DN' + d]; }), { num: true }) + U.campo('recalque.L', 'Comprimento do tubo até a rede', { un: 'm', ex: '12', num: true }) + '</div>';
    if (!pts.length && !leg) h += U.aviso('in', 'A rede não tem ponta de ramo sem hidrante. Lance na tabela acima o ramo até a entrada do recalque (por exemplo, um trecho C-REC1).');
    return h;
  };
})();
