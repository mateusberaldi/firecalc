/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.5.1, tela dos cadastros editáveis: "Minha biblioteca" com todos os grupos, inclusão em lote por .json com relatório
 * do que entrou e do que foi recusado, inclusão de um item por formulário, e a cópia das configurações e da biblioteca em arquivo (Configurações).
 * A base oficial continua travada. As regras de cada grupo estão em cadastros.js (FireCadastros); bombas e mangueiras usam a leitura do cadastro à mão. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, E = U.E, V = U.V, S = U.S, esc = U.esc, fmt = U.fmt, CAD = FireCadastros, X = U._bib, CH = 'firecalc2_cadastros';
  U.cad = Object.assign(CAD.vazia(), X.le(CH, {})); Object.keys(CAD.vazia()).forEach(function (g) { if (!Array.isArray(U.cad[g])) U.cad[g] = []; });
  E.defineCadastros(U.cad);
  S.cadRel = null; S.cadGrupo = 'tiposTubo'; S.cadRes = { tipo: 'ret', cubaForma: 'cil', v: {} };
  function salva() { E.defineCadastros(U.cad); if (!X.guarda(CH, U.cad)) U.avisa('Este navegador não deixou guardar a biblioteca. Baixe o arquivo para não perder o cadastro.'); }
  function redesenha() { if (S.aberto) U.mudou(); else U.desenhar(); }
  /** 2.6.4: nome completo da bomba (fabricante e modelo). O catálogo da base guarda o modelo sem o fabricante; a biblioteca guarda com ele. */
  function nomeBomba(b) { var m = String(b.modelo || ''), f = String(b.fabricante || ''); return f && m.indexOf(f + ' ') !== 0 ? f + ' ' + m : m; }
  /** Item de bomba do arquivo de lote para a leitura do cadastro à mão (mesmas regras). */
  function leBombaLote(x, aceitas) {
    var pts = Array.isArray(x.pts) ? x.pts.map(function (p) { return Array.isArray(p) && p.length === 2 ? p[0] + ';' + p[1] : ''; }).join('\n') : '';
    var r = U.leBomba({ fab: x.fabricante, mod: x.modelo, cv: x.cv, rotor: x.rotor, so: x.shutoff, hs: x.hsucMax, fonte: x.fonte, jockey: !!x.jockey, pts: pts }); if (r.erro) return r;
    if (X.todas().concat(aceitas).some(function (b) { return nomeBomba(b) === r.bomba.modelo; })) return { erro: 'Já existe uma bomba com este fabricante e modelo.' };
    var n = 1, ids = {}; X.todas().concat(aceitas).forEach(function (b) { ids[b.id] = 1; }); while (ids['usr-' + n]) n++; r.bomba.id = 'usr-' + n;
    return r;
  }
  function leMangueiraLote(x) { return U.leMangueira({ dn: x.dn, modelo: x.modelo, fonte: x.fonte, pts: Array.isArray(x.pts) ? x.pts.map(function (p) { return Array.isArray(p) && p.length === 2 ? p[0] + ';' + p[1] : ''; }).join('\n') : '' }); }
  /** Importa o texto de um arquivo de lote: grava o que entrou e guarda o relatório para a tela. */
  U.importaCadastros = function (texto, origem) {
    var r = CAD.importa(texto, D, U.cad, { leBomba: leBombaLote, leMangueira: leMangueiraLote });
    if (!r.erro) { U.cad = r.lib; salva(); r.bombas.forEach(function (b) { U.bib.push(b); }); if (r.bombas.length) X.salva(); }
    S.cadRel = { origem: origem || 'arquivo', erro: r.erro || '', entraram: r.entraram, recusados: r.recusados };
    redesenha(); U.avisa(r.erro ? r.erro : r.entraram.length + (r.entraram.length === 1 ? ' item entrou' : ' itens entraram') + ' na biblioteca; ' + r.recusados.length + (r.recusados.length === 1 ? ' recusado.' : ' recusados.'));
    return r;
  };
  var FORM = {
    tubos: [['norma', 'Norma ou linha do tubo', 'NBR 15884 (CPVC)'], ['classe', 'Classe', 'única'], ['dn', 'DN (mm)', '65'], ['dext', 'Diâmetro externo (mm)', '73,0'], ['parede', 'Parede (mm)', '6,8'], ['dint', 'Diâmetro interno (mm)', '59,4'], ['material', 'Material', 'CPVC']],
    tiposTubo: [['id', 'Identificador, sem espaço', 'HID_CPVC_Soldavel'], ['nome', 'Nome comercial', 'CPVC para incêndio, soldável'], ['material', 'Material', 'CPVC'], ['junta', 'Junta', 'soldável'], ['C', 'Fator C', '150'], ['fonteC', 'Fonte do fator C', 'IT 22, Tabela 1'], ['norma', 'Norma ou linha dos tubos', 'NBR 15884 (CPVC)'], ['classe', 'Classe dos tubos', 'única'], ['dns', 'Diâmetros (DN), separados por ponto e vírgula', '65; 80; 100']],
    C: [['material', 'Material', 'Cobre'], ['C', 'Fator C', '150']],
    pecas: [['tabela', 'Tabela de comprimento equivalente (A ou B)', 'A'], ['id', 'Identificador, sem espaço', 'filtro_y'], ['nome', 'Nome da peça', 'Filtro Y'], ['leq', 'Comprimento equivalente por DN, em metros', '65=8,2; 80=10,1']],
    esguichos: [['modelo', 'Modelo', 'Fabricante, modelo 1 1/2"'], ['Q', 'Vazão no ponto do catálogo (L/min)', '300'], ['P', 'Pressão nesse ponto (mca)', '50'], ['alcance', 'Alcance do jato (m)', '18']],
    ocupacoes: [['norma', 'Norma (SP ou PR)', 'SP'], ['div', 'Divisão', 'M-9'], ['desc', 'Descrição', 'Ocupação especial, com parecer'], ['colunas', 'Coluna da tabela de reserva', '2'], ['cmin', 'Carga de incêndio acima de (MJ/m², opcional)', ''], ['cmax', 'Carga de incêndio até (MJ/m², opcional)', '']]
  };
  function resumoItem(g, x) {
    if (g === 'tubos') return ['<b>' + esc(x.norma) + '</b>, classe ' + esc(x.classe) + ', DN' + x.dn, 'D interno ' + fmt(x.dint, 1) + ' mm'];
    if (g === 'tiposTubo') return ['<b>' + esc(x.nome) + '</b> <small>(' + esc(x.id) + ')</small>', esc(x.material) + ', C ' + fmt(x.C, 0) + ', DN ' + x.segmentos.map(function (s) { return s.dns.join(', '); }).join(', ')];
    if (g === 'C') return ['<b>' + esc(x.material) + '</b>', 'C ' + fmt(x.C, 0)];
    if (g === 'pecas') return ['<b>' + esc(x.nome) + '</b> <small>(tabela ' + esc(x.tabela) + ')</small>', Object.keys(x.dn).map(function (k) { return 'DN' + k + ': ' + fmt(x.dn[k], 2) + ' m'; }).join('; ')];
    if (g === 'esguichos') return ['<b>' + esc(x.modelo) + '</b>', fmt(x.Q, 0) + ' L/min a ' + fmt(x.P, 1) + ' mca, alcance ' + fmt(x.alcance, 1) + ' m'];
    if (g === 'mangueiras') return ['<b>' + esc(x.modelo || 'Mangueira') + '</b>, ' + x.dn + ' mm', x.Q.length + ' pontos, de ' + fmt(x.Q[0], 0) + ' a ' + fmt(x.Q[x.Q.length - 1], 0) + ' L/min'];
    return ['<b>' + esc(x.div) + '</b> (' + esc(x.norma) + ')', esc(x.desc) + '; coluna ' + esc(x.colunas.join(' ou '))];
  }
  /** 2.7.0 (FC-024): campos do formulário de reservatório pelo tipo da caixa (e pela forma da cuba, na taça). Medidas internas em metros. */
  function camposRes() {
    var t = S.cadRes.tipo, f = [['fabricante', 'Fabricante', ''], ['modelo', 'Modelo', ''], ['tipo', 'Tipo da caixa', '', 'sel', CAD.TIPOS_RES]], dim = function (k, r, ex) { return [k, r + ' <small>(m)</small>', ex]; };
    var tr = function () { return [dim('diametroBase', 'Diâmetro interno da base', '2,10'), dim('diametroTopo', 'Diâmetro interno do topo', '2,40'), dim('altura', 'Altura', '1,40')]; };
    if (t === 'ret') f.push(dim('comprimento', 'Comprimento interno', '4,00'), dim('largura', 'Largura interna', '3,00'));
    else if (t === 'tronco') f = f.concat(tr());
    else if (t === 'taca') { f.push(['cubaForma', 'Forma da cuba', '', 'sel', [['cil', 'Cilíndrica'], ['tronco', 'Tronco de cone']]]); f = f.concat(S.cadRes.cubaForma === 'tronco' ? tr() : [dim('diametro', 'Diâmetro interno da cuba', '6,00')]); f.push(dim('diametroColuna', 'Diâmetro interno da coluna (opcional)', '1,20')); }
    else f.push(dim('diametro', 'Diâmetro interno', '3,00'));
    f.push(['volumeNominal', 'Volume nominal <small>(m³, opcional)</small>', '5,0']);
    return f;
  }
  /** Medidas internas de um item da biblioteca de reservatórios, em texto (valores já em metros). */
  function medidasRes(x) {
    var m = function (v) { return fmt(v, 2); };
    if (x.tipo === 'ret') return x.comprimento ? m(x.comprimento) + ' por ' + m(x.largura) + ' m' : 'só o volume nominal';
    if (x.tipo === 'tronco') return 'base ' + m(x.diametroBase) + ', topo ' + m(x.diametroTopo) + ', altura ' + m(x.altura) + ' m';
    if (x.tipo === 'taca') return (x.cubaForma === 'tronco' ? 'cuba em tronco: base ' + m(x.diametroBase) + ', topo ' + m(x.diametroTopo) + ', altura ' + m(x.altura) : 'cuba de diâmetro ' + m(x.diametro)) + (x.diametroColuna ? ', coluna ' + m(x.diametroColuna) : '') + ' m';
    return x.diametro ? 'diâmetro ' + m(x.diametro) + ' m' : 'só o volume nominal';
  }
  U.medidasRes = medidasRes;
  U.nomeTipoRes = function (t) { var l = CAD.TIPOS_RES.filter(function (q) { return q[0] === t; })[0]; return l ? l[1] : String(t); };
  /** Cartão "Minha biblioteca de reservatórios" (aba Minha biblioteca, depois do de bombas). */
  U.cartaoReservatorios = function () {
    var l = U.cad.reservatorios || [];
    return U.cartaoAbre('Minha biblioteca de reservatórios', { id: 'bib-res', extra: '<button type="button" class="fc-ajuda fc-ajuda--t" id="ia-reservatorios-abrir" data-cad="ia-reservatorios" aria-haspopup="dialog" aria-label="Como gerar o JSON de reservatórios com uma IA">' + U.icone('circle-help', 'fc-ic') + '</button>' }) +
      (l.length ? '<div class="fc-tab-rolar"><table class="fc-tab" aria-label="Reservatórios da biblioteca"><thead><tr><th>Fabricante e modelo</th><th>Tipo</th><th>Medidas internas</th><th class="r">Volume nominal <small>(m³)</small></th><th>Fonte</th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' + l.map(function (x, i) {
        return '<tr><td><b>' + esc(x.fabricante) + ' ' + esc(x.modelo) + '</b></td><td>' + esc(U.nomeTipoRes(x.tipo)) + '</td><td class="tec">' + esc(medidasRes(x)) + '</td><td class="r tec">' + (x.volumeNominal ? fmt(x.volumeNominal, 3) : '') + '</td><td class="peq">' + (x.fonte ? esc(x.fonte) : '<span class="fc-selo fc-selo--al">' + U.icone('triangle-alert', 'fc-ic') + 'sem fonte</span>') + '</td><td class="r"><button type="button" class="fc-bt fc-bt--disc fc-bt--p" data-cad="res-tirar" data-v="' + i + '" aria-label="Remover reservatório: ' + esc(x.fabricante + ' ' + x.modelo) + '">Remover</button></td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="peq" id="res-vazia"><b>Nenhum reservatório cadastrado.</b></p>') +
      '<div class="linha-ac"><button type="button" class="fc-bt" data-cad="res-baixar"' + (l.length ? '' : ' disabled') + '>Baixar a biblioteca (.json)</button><button type="button" class="fc-bt" data-cad="res-abrir">Trazer de um arquivo</button><input type="file" id="res-arq" accept=".json,application/json" hidden></div>' + U.cartaoFim();
  };
  U.abaCadastrosUsuario = function () {
    var rel = S.cadRel, total = 0, h = ''; Object.keys(U.cad).forEach(function (g) { if (g !== 'reservatorios') total += U.cad[g].length; });
    h += U.cartaoAbre('Minha biblioteca: inclusão em lote', { id: 'cad-lote', extra: '<button type="button" class="fc-ajuda fc-ajuda--t" id="ia-lote-abrir" data-cad="ia-lote" aria-haspopup="dialog" aria-label="Como gerar o JSON com uma IA">' + U.icone('circle-help', 'fc-ic') + '</button>' }) + '<p class="peq">Tubos e tipos de tubo, fator C, peças e comprimento equivalente, esguichos, mangueiras, ocupações, bombas e reservatórios que não estão na base oficial. Baixe o modelo, preencha os grupos que quiser e importe o arquivo: a ferramenta mostra o que entrou e o que foi recusado, com o motivo. Todo item pede a fonte. A base oficial não é alterada, e o item da biblioteca aparece com a marca "(personalizado)" nas listas e no relatório.</p>' +
      '<div class="linha-ac"><button type="button" class="fc-bt" data-cad="modelo">Baixar o modelo (.json)</button><button type="button" class="fc-bt" data-cad="abrir">Importar arquivo (.json)</button><button type="button" class="fc-bt" data-cad="baixar"' + (total || U.cad.reservatorios.length ? '' : ' disabled') + '>Baixar a minha biblioteca (.json)</button><input type="file" id="cad-arq" accept=".json,application/json" hidden></div>';
    if (rel) {
      h += '<div id="cad-rel" role="status" style="margin-top:12px">';
      if (rel.erro) h += U.aviso('er', '<b>Nada foi importado.</b> ' + esc(rel.erro));
      else {
        h += U.aviso(rel.recusados.length ? 'al' : 'in', '<b>' + rel.entraram.length + (rel.entraram.length === 1 ? ' item entrou' : ' itens entraram') + ' na biblioteca e ' + rel.recusados.length + (rel.recusados.length === 1 ? ' foi recusado' : ' foram recusados') + '.</b>' + (rel.entraram.length ? ' Entraram: ' + esc(rel.entraram.map(function (x) { return x.nome + ' (' + CAD.NOME[x.grupo] + ')'; }).join('; ')) + '.' : ''));
        if (rel.recusados.length) h += '<div class="fc-tab-rolar" style="margin-top:8px"><table class="fc-tab" aria-label="Itens recusados na importação"><thead><tr><th>Grupo</th><th>Item</th><th>Motivo da recusa</th></tr></thead><tbody>' + rel.recusados.map(function (x) { return '<tr><td>' + esc(CAD.NOME[x.grupo] || x.grupo) + '</td><td>' + esc(x.nome) + '</td><td>' + esc(x.motivo) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      h += '</div>';
    }
    h += U.cartaoFim();
    h += U.cartaoAbre('Itens da minha biblioteca', { id: 'cad-itens' });
    if (!total) h += '<p class="peq" id="cad-vazia"><b>Nenhum item cadastrado além das bombas e dos reservatórios.</b> Eles ficam nos cartões seguintes.</p>';
    else Object.keys(U.cad).forEach(function (g) {
      if (!U.cad[g].length || g === 'reservatorios') return;
      h += '<h3 class="t3" style="margin-top:12px">' + esc(CAD.NOME[g]) + '</h3><div class="fc-tab-rolar"><table class="fc-tab" aria-label="' + esc(CAD.NOME[g]) + ' da biblioteca"><thead><tr><th>Item</th><th>Dados</th><th>Fonte</th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' +
        U.cad[g].map(function (x, i) { var r = resumoItem(g, x); return '<tr><td>' + r[0] + ' <span class="fc-selo fc-selo--al">' + U.icone('triangle-alert', 'fc-ic') + 'personalizado</span></td><td>' + r[1] + '</td><td>' + esc(x.fonte) + '</td><td class="r">' + (g === 'mangueiras' && S.aberto ? '<button type="button" class="fc-bt fc-bt--p" data-cad="usar-mang" data-v="' + i + '">Usar no projeto aberto</button> ' : '') + '<button type="button" class="fc-bt fc-bt--p" data-cad="tirar" data-g="' + g + '" data-v="' + i + '" aria-label="Retirar da biblioteca: ' + esc(String(x.nome || x.modelo || x.material || x.div || x.norma)) + '">Retirar</button></td></tr>'; }).join('') + '</tbody></table></div>';
    });
    h += U.cartaoFim();
    var g0 = S.cadGrupo, res = g0 === 'reservatorios', campos = res ? camposRes() : FORM[g0];
    h += U.cartaoAbre('Incluir um item', { id: 'cad-um' }) + '<div class="fc-form"><label class="fc-campo"><span class="fc-campo__rot">Grupo</span><span class="fc-sel"><span class="fc-entrada"><select id="cad-grupo">' + Object.keys(FORM).concat('reservatorios').map(function (g) { return '<option value="' + g + '"' + (g === g0 ? ' selected' : '') + '>' + esc(CAD.NOME[g]) + '</option>'; }).join('') + '</select></span>' + U.icone('chevron-down', 'fc-ic') + '</span><span class="fc-campo__ref">Bomba e mangueira têm formulário próprio, abaixo, no modo personalizado.</span></label>' +
      campos.map(function (c) {
        if (c[3] === 'sel') return '<label class="fc-campo"><span class="fc-campo__rot">' + c[1] + '</span><span class="fc-sel"><span class="fc-entrada"><select id="ci-' + c[0] + '" data-ci="' + c[0] + '" data-res="1">' + c[4].map(function (o) { return '<option value="' + esc(o[0]) + '"' + (S.cadRes[c[0]] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></span>' + U.icone('chevron-down', 'fc-ic') + '</span></label>';
        return '<label class="fc-campo"><span class="fc-campo__rot">' + c[1] + '</span><span class="fc-entrada"><input id="ci-' + c[0] + '" data-ci="' + c[0] + '"' + (c[2] ? ' placeholder="' + esc(c[2]) + '"' : '') + (res ? ' value="' + esc(S.cadRes.v[c[0]] || '') + '"' : '') + ' autocomplete="off"></span></label>'; }).join('') +
      '<label class="fc-campo larga"><span class="fc-campo__rot">' + (res ? 'Fonte: catálogo e página (opcional)' : 'Fonte: norma e item, ou catálogo e página') + '</span><span class="fc-entrada"><input id="ci-fonte" data-ci="fonte" placeholder="Catálogo do fabricante, edição e página"' + (res ? ' value="' + esc(S.cadRes.v.fonte || '') + '"' : '') + ' autocomplete="off"></span></label></div>' +
      '<div id="ci-msg" role="alert"></div><div class="linha-ac"><button type="button" class="fc-bt" data-cad="incluir">Incluir na biblioteca</button></div>' + U.cartaoFim();
    return h;
  };
  /** 2.6.0: menu sobreposto com o passo a passo para gerar o JSON com uma IA (PDF do catálogo mais o modelo), o prompt pronto e o botão do modelo. */
  var PASSOS_IA = ['Baixe o modelo (.json) pelo botão abaixo.', 'Separe o PDF do catálogo do fabricante, com a tabela ou a curva que você quer cadastrar.', 'Abra uma IA que leia PDF (Claude, ChatGPT ou Gemini) e anexe o PDF e o modelo.', 'Copie o prompt pelo botão abaixo e cole na conversa.', 'Confira cada número da resposta contra a página do catálogo. A IA pode errar um dígito ou trocar a coluna.', 'Copie só o bloco de código da resposta e salve como arquivo .json (bloco de notas, UTF-8).', 'Em "Importar arquivo (.json)", escolha o arquivo. A ferramenta mostra o que entrou e o que foi recusado, com o motivo.'];
  function copiaTexto(txt, certo, falhou) {
    function alt() { var t = document.getElementById('ia-prompt'), r = false; if (t) { t.focus(); t.select(); try { r = document.execCommand('copy'); } catch (e) { r = false; } } r ? certo() : falhou(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(certo, alt); else alt();
  }
  U.dialogoIA = function (escopo) {
    var d = document.getElementById('dlg'), bombas = escopo === 'bombas', resv = escopo === 'reservatorios', passos = PASSOS_IA.slice(), estado = function (t) { var e = document.getElementById('ia-estado'); if (e) e.textContent = t; };
    if (bombas) passos[6] = 'Em "Importar arquivo (.json)", no cartão "Minha biblioteca: inclusão em lote", escolha o arquivo. Em "Minha biblioteca de bombas", o botão "Trazer de um arquivo" faz o mesmo. As duas rotas mostram o que entrou e o que foi recusado, com o motivo.';
    if (resv) passos[6] = 'Em "Trazer de um arquivo", no cartão "Minha biblioteca de reservatórios", escolha o arquivo. Em "Importar arquivo (.json)", no cartão "Minha biblioteca: inclusão em lote", o resultado é o mesmo. As duas rotas mostram o que entrou e o que foi recusado, com o motivo.';
    /** O toque na margem interna do menu também tem o diálogo como alvo; só o toque fora do retângulo do menu (no fundo) fecha (FC-010). */
    function foraDoMenu(ev, d) { var r = d.getBoundingClientRect(); return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom; }
    d.dataset.modo = 'ia'; d.setAttribute('aria-labelledby', 'dlg-tit');
    d.innerHTML = '<h2 id="dlg-tit">Gerar o JSON com uma IA</h2><ol class="ia-passos">' + passos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' +
      '<label class="fc-campo larga"><span class="fc-campo__rot">Prompt</span><span class="fc-entrada fc-entrada--area"><textarea class="ia-prompt" id="ia-prompt" readonly rows="11">' + esc(CAD.promptIA(escopo)) + '</textarea></span></label>' +
      '<div class="linha-ac" style="margin-top:16px"><button type="button" class="fc-bt" data-ia="modelo">Baixar o modelo (.json)</button><button type="button" class="fc-bt" data-ia="copiar">Copiar o prompt</button><button type="button" class="fc-bt fc-bt--pri" data-fechar="1">Fechar</button><span class="peq" id="ia-estado" role="status"></span></div>';
    d.onclick = function (ev) {
      var b = ev.target.closest('[data-ia]');
      if (b) {
        if (b.dataset.ia === 'modelo') U.baixa(CAD.arquivoModelo(escopo), new Blob([JSON.stringify(CAD.modeloLote(bombas ? ['bombas'] : resv ? ['reservatorios'] : undefined), null, 1)], { type: 'application/json' }));
        else copiaTexto(CAD.promptIA(escopo), function () { estado('Prompt copiado.'); }, function () { estado('Não foi possível copiar. Selecione o texto do prompt e copie.'); });
        return;
      }
      if (ev.target.closest('[data-fechar]') || (U.veu(ev, d) && foraDoMenu(ev, d))) d.close();
    };
    d.oninput = null; d.onchange = null;
    d.onclose = function () { d.dataset.modo = ''; var b = document.getElementById('ia-' + escopo + '-abrir'); if (b) b.focus(); };
    if (!d.open) d.showModal();
    var b1 = d.querySelector('[data-ia="modelo"]'); if (b1) b1.focus();
  };
  /** Cartão das Configurações: cópia das configurações e da biblioteca em um arquivo, para levar a outro computador. */
  U.cartaoCopia = function () {
    return U.cartao('Cópia das configurações e da biblioteca', '<div class="fc-bts"><button type="button" class="fc-bt" data-cad="copia-baixar">Baixar a cópia (.json)</button><button type="button" class="fc-bt" data-cad="copia-abrir">Restaurar de um arquivo</button><input type="file" id="copia-arq" accept=".json,application/json" hidden></div>', { id: 'cfg-copia' });
  };
  function loteDe(lib, bombas) {
    var o = {}; Object.keys(lib).forEach(function (g) { if (lib[g].length) o[g] = lib[g].map(function (x) { var c = E.clone(x); delete c.usuario; if (g === 'mangueiras') { c.pts = x.Q.map(function (q, i) { return [q, Math.round(x.J[i] * 9.80665 * 1e6) / 1e6]; }); delete c.Q; delete c.J; } return c; }); });
    if (bombas && bombas.length) o.bombas = bombas.map(function (b) { return { fabricante: b.fabricante, modelo: b.modelo.indexOf(b.fabricante + ' ') === 0 ? b.modelo.slice(b.fabricante.length + 1) : b.modelo, cv: b.cv || undefined, rotor: b.rotor || undefined, shutoff: b.shutoff, hsucMax: b.hsucMax === null ? undefined : b.hsucMax, jockey: !!b.jockey, pts: b.pts.map(function (p) { return [p[1], p[0]]; }), fonte: b.fonte }; });
    return o;
  }
  U.restauraCopia = function (texto) {
    var o; try { o = JSON.parse(texto); } catch (e) { U.avisa('Arquivo inválido: não é uma cópia do FireCalc.'); return null; }
    if (!o || o.firecalc !== 'copia') { U.avisa('Arquivo inválido: não é uma cópia das configurações e da biblioteca do FireCalc.'); return null; }
    if (o.configuracoes && typeof o.configuracoes === 'object') { Object.keys(X.CFG0).forEach(function (k) { if (typeof o.configuracoes[k] === 'string') U.cfg[k] = o.configuracoes[k]; }); X.guarda(X.CH.cfg, U.cfg); }
    return U.importaCadastros(JSON.stringify(o.biblioteca || {}), 'cópia');
  };
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-cad]'); if (!t || t.disabled) return; var m = t.dataset.cad;
    if (m === 'modelo') U.baixa('modelo_biblioteca.firecalc.json', new Blob([JSON.stringify(CAD.modeloLote(), null, 1)], { type: 'application/json' }));
    else if (m === 'ia-lote') U.dialogoIA('lote');
    else if (m === 'ia-bombas') U.dialogoIA('bombas');
    else if (m === 'ia-reservatorios') U.dialogoIA('reservatorios');
    else if (m === 'res-abrir') document.getElementById('res-arq').click();
    else if (m === 'res-baixar') U.baixa('meus_reservatorios.firecalc.json', new Blob([JSON.stringify({ reservatorios: loteDe(U.cad).reservatorios || [] }, null, 1)], { type: 'application/json' }));
    else if (m === 'res-tirar') { var rx = U.cad.reservatorios[+t.dataset.v]; if (!rx) return; U.cad.reservatorios.splice(+t.dataset.v, 1); salva(); S.cadRel = null; redesenha(); U.avisa('Reservatório removido da biblioteca.'); }
    else if (m === 'abrir') document.getElementById('cad-arq').click();
    else if (m === 'baixar') U.baixa('minha_biblioteca.firecalc.json', new Blob([JSON.stringify(loteDe(U.cad, U.bib), null, 1)], { type: 'application/json' }));
    else if (m === 'tirar') { var g = t.dataset.g, x = U.cad[g][+t.dataset.v]; if (!x) return; U.cad[g].splice(+t.dataset.v, 1); salva(); S.cadRel = null; redesenha(); U.avisa(g === 'esguichos' ? 'Esguicho retirado da biblioteca. O projeto aberto que o usa guarda a cópia e segue igual.' : 'Item retirado da biblioteca. Projeto que usava o item volta a pedir a escolha.'); }
    else if (m === 'usar-mang') { var mg = U.cad.mangueiras[+t.dataset.v]; if (!mg || !S.aberto) return; var c = { Q: mg.Q.slice(), J: mg.J.slice(), fonte: mg.fonte }; if (mg.modelo) c.modelo = mg.modelo; S.F.mangueirasUsuario = S.F.mangueirasUsuario || {}; S.F.mangueirasUsuario[mg.dn] = c; U.mudou(); U.avisa('Mangueira de ' + mg.dn + ' mm da biblioteca em uso no projeto aberto.'); }
    else if (m === 'incluir') {
      var it = {}; document.querySelectorAll('#cad-um [data-ci]').forEach(function (e) { it[e.dataset.ci] = e.value; });
      var v = CAD.valida(S.cadGrupo, it, D, U.cad), msg = document.getElementById('ci-msg');
      if (S.cadGrupo === 'reservatorios') { S.cadRes.v = it; S.cadRes.tipo = it.tipo || S.cadRes.tipo; }
      if (v.erro) { msg.innerHTML = '<div class="fc-campo__erro" role="alert">' + U.icone('circle-x', 'fc-ic') + esc(v.erro) + '</div>'; return; }
      U.cad[S.cadGrupo].push(v.item); salva(); S.cadRel = null; if (S.cadGrupo === 'reservatorios') S.cadRes.v = {}; redesenha(); U.avisa(S.cadGrupo === 'reservatorios' ? 'Reservatório incluído na biblioteca.' : 'Item incluído na biblioteca, com a marca de personalizado.');
    }
    else if (m === 'copia-baixar') U.baixa('copia_firecalc.json', new Blob([JSON.stringify({ firecalc: 'copia', versao: U.VERSAO, configuracoes: U.cfg, biblioteca: loteDe(U.cad, U.bib) }, null, 1)], { type: 'application/json' }));
    else if (m === 'copia-abrir') document.getElementById('copia-arq').click();
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.res && t.dataset.ci) { var vv = {}; document.querySelectorAll('#cad-um [data-ci]').forEach(function (e) { vv[e.dataset.ci] = e.value; }); S.cadRes.v = Object.assign(S.cadRes.v, vv); S.cadRes[t.dataset.ci] = t.value; U.desenhar(); var e2 = document.getElementById(t.id); if (e2) e2.focus(); return; }
    if (t.id === 'cad-grupo') { S.cadGrupo = t.value; U.desenhar(); var e = document.getElementById('cad-grupo'); if (e) e.focus(); return; }
    if ((t.id === 'cad-arq' || t.id === 'copia-arq' || t.id === 'res-arq') && t.files[0]) { var copia = t.id === 'copia-arq', r = new FileReader(); r.onload = function () { if (copia) { if (U.restauraCopia(String(r.result))) U.avisa('Cópia restaurada. Confira o relatório em Cadastros, Minha biblioteca.'); } else U.importaCadastros(String(r.result)); }; r.readAsText(t.files[0]); t.value = ''; }
  });
})();
