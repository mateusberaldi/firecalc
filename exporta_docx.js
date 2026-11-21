/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.5.1: memorial de cálculo em .docx. Desde a 2.5.3, com a cascata de pressões.
 * O memorial sai do mesmo modelo da planilha (FireExporta.modelo, já avaliado): os 13 itens da aba Memorial, a tabela de trechos,
 * o passo a passo com as fórmulas em texto e as verificações com o item da norma. Nenhum número é recalculado aqui.
 * Duas partes: blocos(), que monta o conteúdo como lista simples (título, parágrafo, tabela), e gerar(), que entrega o documento
 * pela biblioteca docx 9.8.1 (licença MIT), embutida no arquivo único. Sem data: o memorial é do projetista. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.FireDocx = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var SIT = { OK: 'Atende', ERRO: 'Não atende', ALERTA: 'Conferir', INFO: 'Informação' };
  function n2(v, c) { return v.toFixed(c).replace('.', ','); }
  /** Número para texto, com casas pelo tamanho do valor (o memorial é lido, não recalculado). */
  function numTx(v, est) {
    if (typeof v !== 'number' || !isFinite(v)) return String(v === null || v === undefined ? '' : v);
    if (Math.abs(v - Math.round(v)) < 1e-9 || est === 'f0') return String(Math.round(v));
    var a = Math.abs(v);
    if (a >= 100) return n2(v, 1); if (a >= 0.1) return n2(v, 2); if (a >= 0.001) return n2(v, 4);
    return v.toExponential(3).replace('.', ',');
  }
  /** Texto da planilha levado ao memorial: sem recado de redação. */
  function limpa(s) { return String(s).replace(/^a redigir$/, 'A completar pelo projetista').replace(/\ba redigir\b/g, 'a completar pelo projetista').replace(/^ver aba Trechos$/, 'ver a tabela de cálculo por trecho, abaixo').replace(/ \(lido por script[^)]*\)/g, '').replace(/\b(adotado|leitura|regra) (pelo|do) módulo\b/g, function (m, a) { return a + (a === 'adotado' ? ' pela ferramenta' : ' da ferramenta'); }).replace(/didático, sem item da (IT|NPT)/, 'sem item da $1'); }
  function celTx(c) { if (!c) return ''; var v = c.f !== undefined ? c.r : c.v; if (v === null || v === undefined) return ''; if (typeof v === 'number') return numTx(v, c.est); if (typeof v === 'boolean') return v ? 'sim' : 'não'; return limpa(v); }
  function folha(W, nome) { return W.folhas.filter(function (f) { return f.nome === nome; })[0] || null; }
  /** Linhas de uma aba: [{r, cs: [célula por coluna, a partir de 1]}], em ordem. */
  function linhas(f) { var m = {}; Object.keys(f.c).forEach(function (k) { var c = f.c[k]; (m[c.ro] = m[c.ro] || [])[c.co] = c; }); return Object.keys(m).map(Number).sort(function (a, b) { return a - b; }).map(function (r) { return { r: r, cs: m[r] }; }); }
  function tab(cab, lins, larg, o) { return Object.assign({ t: 'tab', cab: cab, lins: lins, larg: larg }, o || {}); }
  function h(n, tx) { return { t: 'h' + n, tx: tx }; }
  function p(tx, o) { return Object.assign({ t: 'p', tx: tx }, o || {}); }

  /** Conteúdo do memorial. P = projeto para o motor, R = resultado do motor, W = modelo da planilha já avaliado. opc = { versao, ident, V (FireValida) }. */
  function blocos(P, D, R, M, W, opc) {
    opc = opc || {}; var CF = opc.conferidos && Object.keys(opc.conferidos).length ? opc.conferidos : null, B = [], n = R.numeros, id = opc.ident || {}, PR = P.norma === 'PR', N = D.normas[P.norma], sigla = PR ? 'NPT 022' : 'IT 22';
    var tipo = N.tipos.filter(function (t) { return t.id === n.tipo; })[0] || {}, mang = tipo.mangueira && tipo.mangueira <= 25;
    B.push({ t: 'titulo', tx: 'Memorial de cálculo do sistema de ' + (mang ? 'mangotinhos' : 'hidrantes'), sub: id.obra || P.nome || '' });
    var er = R.verificacoes.filter(function (v) { return v.situacao === 'ERRO'; });
    if (er.length) B.push(p('Ressalva: este projeto tem ' + (er.length === 1 ? '1 verificação não atendida' : er.length + ' verificações não atendidas') + ' (' + er.map(function (v) { return v.id; }).join(', ') + '). Os itens estão no quadro de verificações deste memorial.', { forte: true }));
    B.push(h(1, 'Identificação'));
    var idl = [['Obra', id.obra || P.nome], ['Endereço', id.endereco], ['Município e estado', [id.municipio, id.uf].filter(function (x) { return x; }).join(', ')], ['Responsável técnico', id.rt], ['Registro profissional', id.registro], ['ART ou RRT', id.art], ['Escritório', id.escritorio], ['CNPJ', id.cnpj], ['Norma', N.nome]];
    B.push(tab(['Dado', 'Valor'], idl.map(function (x) { return [x[0], x[1] ? String(x[1]) : 'A completar pelo projetista']; }), [30, 70]));
    // os 13 itens da aba Memorial
    var ME = folha(W, 'Memorial'), secs = [], at = null;
    if (ME) linhas(ME).forEach(function (l) {
      var c1 = l.cs[1]; if (!c1 || c1.est === 'tit') return;
      if (c1.est === 'cab') { at = { tit: celTx(c1), lins: [] }; secs.push(at); return; }
      if (!at || !l.cs[2]) return;
      at.lins.push([celTx(c1), celTx(l.cs[2]), celTx(l.cs[3]), celTx(l.cs[4])]);
    });
    var CAB4 = ['Item', 'Valor', 'Unidade', 'Fonte ou aba da planilha'], L4 = [36, 28, 10, 26];
    function extra(numero) {
      if (numero === 2) {   // dados do esguicho e da mangueira, com o que foi alterado e a fonte
        var lz = n.lancamento; if (!lz) return;
        var ROT = { Q: ['Vazão por jato', 'L/min'], P: ['Pressão mínima (' + lz.onde + ')', 'mca'], mangueiraDN: ['Diâmetro da mangueira', 'mm'], Lmang: ['Comprimento da mangueira', 'm'], alcance: ['Alcance exigido do jato', 'm'] }, alt = {};
        (lz.alterados || []).forEach(function (a) { alt[a.campo] = a; });
        var ls = Object.keys(ROT).filter(function (k) { return lz[k] !== undefined; }).map(function (k) { var a = alt[k]; return [ROT[k][0], numTx(lz[k]) + ' ' + ROT[k][1], numTx(lz.oficial[k]) + ' ' + ROT[k][1], a ? 'alterado' : 'tabela oficial', a ? (a.fonte || '') : sigla + (PR ? ', Tabela 1' : ', Tabela 2')]; });
        if (lz.Pentrada !== undefined) ls.push(['Pressão de projeto na entrada do esguicho', numTx(lz.Pentrada) + ' mca', '', 'informada', (P.lancamento && P.lancamento.fontes && P.lancamento.fontes.Pentrada) || '']);
        B.push(h(3, 'Dados do esguicho e da mangueira')); B.push(tab(['Dado', 'Valor adotado', 'Tabela oficial', 'Situação', 'Fonte'], ls, [30, 16, 16, 14, 24]));
      }
      if (numero === 4) {   // tubo de cada trecho pelo nome comercial; fator C com a fonte quando alterado
        var tp = function (idt) { return (D.tiposTubo || []).filter(function (x) { return x.id === idt; })[0] || null; }, pad = tp(P.tipoTubo);
        var ls4 = P.trechos.map(function (t) { var x = tp(t.tipo || P.tipoTubo); return [t.nome, x ? x.nome : (t.tubo ? t.tubo.norma + ', classe ' + t.tubo.classe : ''), 'DN' + t.dn, numTx(t.C !== undefined ? t.C : P.C)]; });
        B.push(h(3, 'Tubo de cada trecho')); B.push(tab(['Trecho', 'Tipo de tubo', 'Diâmetro', 'Fator C'], ls4, [16, 56, 14, 14]));
        if (pad && Math.abs(P.C - pad.C) > 1e-9) B.push(p('Fator C do projeto: ' + numTx(P.C) + ', diferente do valor da Tabela 1 para o tubo escolhido (' + numTx(pad.C) + '). Valor alterado pelo projetista.' + (P.Cfonte ? ' Fonte informada: ' + P.Cfonte + '.' : '')));
        else if (pad) B.push(p('Fator C do projeto: ' + numTx(P.C) + ' (' + (pad.fonteC || sigla + ', Tabela 1') + ').'));
      }
      if (numero === 5) {   // pressões em cada hidrante
        var lp = M.pressoesHidrantes(R.ctx, R.par);
        B.push(h(3, 'Pressões em cada hidrante')); B.push(tab(['Hidrante', 'Cota da válvula (m)', 'No par de cálculo', 'Pressão dinâmica (mca)', 'Pressão estática (mca)'], lp.map(function (x) { return [x.id, n2(x.z, 2), x.noPar ? 'sim' : 'não', typeof x.din === 'number' ? n2(x.din, 2) : '', typeof x.est === 'number' ? n2(x.est, 2) : '']; }), [18, 20, 18, 22, 22]));
        B.push(p('A pressão dinâmica dos hidrantes fora do par é a que resulta com os jatos do par em funcionamento. A estática é com a bomba fechada e o reservatório cheio.', { peq: true }));
        if (M.cascata) {   // 2.5.3: cascata de pressões, como na tela Estatísticas: figura feita de tabela, sem imagem
          var cz = M.cascata(R, !!(opc && opc.cascataAgrupada));
          B.push(h(3, 'Cascata de pressões, do hidrante mais desfavorável até ' + (R.ctx.modo === 'bomba' ? 'a bomba' : 'o reservatório')));
          B.push({ t: 'casc', itens: cz.itens, eixo: cz.eixo });
          B.push(p('Figura: lendo de cima para baixo, anda-se do hidrante até ' + (R.ctx.modo === 'bomba' ? 'a bomba' : 'o reservatório') + (opc && opc.cascataAgrupada ? ', com o ramal, o tronco e a sucção agrupados' : ', trecho a trecho') + '. Barras azuis são a pressão acumulada; barras vermelhas somam; barras verdes subtraem. Valores em mca. Eixo de ' + numTx(cz.eixo.a) + ' a ' + numTx(cz.eixo.b) + ' mca.', { peq: true }));
        }
      }
      if (numero === 6) {   // tabela de cálculo por trecho
        var TR = folha(W, 'Trechos'); if (!TR) return;
        var ll = linhas(TR), ic = -1; ll.forEach(function (l, i) { if (ic < 0 && l.cs[1] && l.cs[1].est === 'cab') ic = i; }); if (ic < 0) return;
        var cab = ll[ic].cs, col = {}, pecasQ = [], visto = {}, tabL = D.leq[P.tabelaLeq];
        cab.forEach(function (c, i) { if (!c) return; var v = String(c.v); if (tabL.pecas[v]) { if (!visto[v]) { visto[v] = 1; pecasQ.push([i, v]); } } else if (col[v] === undefined) col[v] = i; });
        var lt = ll.slice(ic + 1).filter(function (l) { return l.cs[1] && l.cs[1].est !== 'cab' && l.cs[col.DN]; }).map(function (l) {
          var pc = pecasQ.map(function (q) { var x = l.cs[q[0]], v = x ? (x.f !== undefined ? x.r : x.v) : 0; return v > 0 ? v + ' ' + tabL.pecas[q[1]].nome.toLowerCase() : ''; }).filter(function (x) { return x; }).join('; ');
          var g = function (k) { return celTx(l.cs[col[k]]); };
          return [g('Trecho'), g('DN'), g('D interno (mm)'), g('L real (m)'), pc || 'sem peças', g('L virtual (m)'), g('L total (m)'), g('Q (L/min)'), g('J (m/m)'), g('hf (mca)'), g('v (m/s)')];
        });
        B.push(h(3, 'Tabela de cálculo por trecho'));
        B.push(tab(['Trecho', 'DN', 'D interno (mm)', 'Tubo (m)', 'Peças', 'Leq (m)', 'L total (m)', 'Q (L/min)', 'J (m/m)', 'Perda (mca)', 'v (m/s)'], lt, [8, 5, 7, 7, 27, 7, 7, 8, 8, 8, 8], { peq: true, id: 'trechos' }));
        B.push(p('Comprimentos equivalentes pela tabela ' + tabL.titulo + '. Perda unitária J por Hazen-Williams, na forma da norma (' + sigla + (PR ? ', 5.7.8' : ', 4.8.10.2') + '), com o diâmetro interno do tubo. Trecho com vazão zero não participa do par de cálculo.', { peq: true }));
      }
      if (numero === 7) {   // nível X: a conta, ou a fonte do valor informado
        var nx = P.fonte && P.fonte.nivelX;
        if (nx && opc.V) {
          B.push(p((nx.bomba ? 'Nível X calculado pela Tabela B.1 do Anexo B (' + sigla + ', B.3.3 a B.3.8). ' : 'Referência da altura do reservatório elevado (' + sigla + ', B.2.1). ') + opc.V.contaX(nx)));
          (nx.notas || []).forEach(function (t) { B.push(p('Nota: ' + t)); });
          if (nx.reserva !== undefined) B.push(p('Reserva efetiva = área × (nível normal − ' + (!nx.bomba ? 'nível de referência' : nx.nivelReserva > nx.X ? 'piso do reservatório' : 'nível X') + ') = ' + n2(nx.area, 2) + ' m² × ' + n2(nx.altura, 3) + ' m = ' + n2(nx.reserva, 2) + ' m³.' + (n.rtiTabela !== undefined ? ' A tabela pede ' + numTx(n.rtiTabela) + ' m³.' : '')));
        } else if (P.fonte && P.fonte.modo === 'bomba') B.push(p('Nível X informado pelo projetista' + (P.fonte.zXFonte ? '. Fonte: ' + P.fonte.zXFonte + '.' : ', sem fonte registrada no projeto.')));
      }
      if (numero === 11) {   // todas as verificações, com o item da norma
        B.push(h(3, 'Quadro de verificações'));
        B.push(tab(['Código', 'Verificação', 'Valor', 'Situação', 'Item (' + sigla + ')'], R.verificacoes.map(function (v) { return [v.id, limpa(v.titulo), limpa(String(v.valor).replace(/(\d)\.(\d)/g, '$1,$2')), (CF && CF[v.id] && v.situacao === 'ALERTA' ? 'Conferido' : SIT[v.situacao] || v.situacao), limpa(v.item || '')]; }), [8, 36, 28, 11, 17], { peq: true, id: 'verificacoes' }));
        if (CF) { var lcf = R.verificacoes.filter(function (v) { return CF[v.id] && v.situacao === 'ALERTA'; }); if (lcf.length) { B.push(p('Itens conferidos pelo projetista:')); lcf.forEach(function (v) { B.push(p(v.id + ': ' + CF[v.id])); }); } }   // 2.5.4
      }
    }
    secs.forEach(function (s) {
      var m = /^(\d+)\./.exec(s.tit), numero = m ? +m[1] : 0;
      B.push(h(1, s.tit));
      if (numero === 8) {   // bomba: o que o projeto precisa separado do que a bomba escolhida entrega (mesma separação da tela)
        var eNec = function (l) { return /^AMT|^Vazão nominal/.test(l[0]); }, nec = s.lins.filter(eNec), eNovo = function (l) { return /^NPSH disponível \(1,0 Q\)|^Altura máxima de aspiração/.test(l[0]); }, esc = s.lins.filter(function (l) { return !eNec(l) && !eNovo(l); });
        nec = nec.map(function (l) { return [l[0].replace(/^AMT.*/, 'Altura manométrica necessária').replace(/^Vazão nominal.*/, 'Vazão de projeto'), l[1], l[2], l[3]]; }).reverse();
        if (!nec.some(function (l) { return l[0] === 'Vazão de projeto'; })) nec.unshift(['Vazão de projeto', n2(n.Qth, 2), 'm³/h', 'Hipótese de cálculo']);
        if (n.NPSHd1 !== undefined) nec.push(['NPSH disponível na vazão de projeto (1,0 Q)', n2(n.NPSHd1, 2), 'mca', 'perda na sucção a 1,0 Q']);   // 2.5.4
        if (n.NPSHd !== undefined) nec.push(['NPSH disponível em 1,5 vez a vazão de projeto', n2(n.NPSHd, 2), 'mca', sigla + (PR ? ', 5.7.13' : ', 4.8.15')]);
        if (n.Hb !== undefined) esc.push([n.Hb >= n.AMT ? 'Folga da bomba sobre a altura necessária' : 'Falta da bomba para a altura necessária', n2(Math.abs(n.Hb - n.AMT), 2), 'mca', 'altura da bomba menos a altura necessária']);
        B.push(h(3, 'Ponto de projeto (necessário)')); if (nec.length) B.push(tab(CAB4, nec, L4, { id: 'necessario' }));
        B.push(h(3, P.bomba && P.bomba.id ? 'Bomba escolhida (valores do catálogo)' : 'Bomba')); if (esc.length) B.push(tab(CAB4, esc, L4, { id: 'bomba' }));
        if (n.Hb !== undefined && n.Hb < n.AMT) B.push(p('A bomba escolhida não entrega a altura manométrica necessária na vazão de projeto.', { forte: true }));
        if (n.NPSHd !== undefined && P.bomba && P.bomba.id) { var a15 = n.Qverif === 1.5, dv = a15 ? n.NPSHd : n.NPSHd1;   // 2.5.4: vazão da comparação escolhida pelo projetista
          B.push(p(n.NPSHr !== undefined ? 'Verificação do NPSH da bomba escolhida, comparada ' + (a15 ? 'a 1,5 vez a vazão de projeto (' + n2(n.Q15 * 0.06, 2) + ' m³/h)' : 'na vazão de projeto (' + n2(n.Qth, 2) + ' m³/h)') + ', por escolha do projetista: o requerido de ' + n2(n.NPSHr, 2) + ' mca é comparado com o disponível a ' + (a15 ? '1,5 Q' : '1,0 Q') + ', de ' + n2(dv, 2) + ' mca: ' + (dv >= n.NPSHr - 1e-9 ? 'atende.' : 'não atende (cavita).') + (a15 && !n.atende15 ? ' A bomba escolhida não entrega a altura manométrica a 1,5 Q.' : '') +
            (n.hgMax !== undefined ? ' Altura máxima de aspiração acima do nível X: ' + n2(n.hgMax, 2) + ' m; neste projeto, ' + n2(n.hAsp, 2) + ' m.' : '') : 'NPSH requerido da bomba escolhida não informado: a verificação fica pendente.')); }
      } else if (s.lins.length) B.push(tab(CAB4, s.lins, L4));
      extra(numero);
    });
    // passo a passo: fórmulas em texto, valores substituídos e resultado
    var PP = folha(W, 'Passo a passo');
    if (PP) {
      B.push(h(1, 'Passo a passo do cálculo'));
      B.push(p('Cada passo traz a fonte, a fórmula em texto e a conta com os valores do projeto.', { peq: true }));
      linhas(PP).forEach(function (l) {
        var cs = l.cs.filter(function (c) { return c; }), c1 = l.cs[1]; if (!c1 || c1.est === 'tit') return;
        if (c1.est === 'sec') { B.push(h(3, celTx(c1))); return; }
        if (cs.length === 1) { if (l.r > 2) B.push(p(celTx(c1).replace(/\babas? ([A-Z])/g, function (m0) { return m0; }), { peq: true })); return; }
        var fx = cs.filter(function (c) { return c.est === 'fx'; })[0];
        if (fx) { B.push(p(celTx(c1) + ': ' + celTx(fx), { ital: true })); return; }
        B.push(p(celTx(c1) + ': ' + cs.slice(1).map(celTx).filter(function (x) { return x !== ''; }).join(' '), { conta: cs.some(function (c) { return c.est === 'res'; }) }));
      });
    }
    return B;
  }

  /** Documento docx (biblioteca docx 9.8.1). Leiaute sóbrio: A4, tabelas com cabeçalho cinza, cabeçalho com a obra e rodapé discreto. */
  function gerar(docx, B, opc) {
    opc = opc || {}; var FONTE = 'Arial', LARG = 9638, BORDA = { style: docx.BorderStyle.SINGLE, size: 4, color: '999999' }, BORDAS = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA };
    function run(tx, o) { o = o || {}; return new docx.TextRun({ text: String(tx), font: FONTE, size: o.size || 20, bold: !!o.bold, italics: !!o.ital, color: o.cor }); }
    function par(tx, o) { o = o || {}; return new docx.Paragraph({ children: [run(tx, o)], spacing: { before: o.antes === undefined ? 60 : o.antes, after: o.depois === undefined ? 60 : o.depois } }); }
    function tabela(b) {
      var tot = b.larg.reduce(function (a, x) { return a + x; }, 0), ws = b.larg.map(function (x) { return Math.round(LARG * x / tot); }), sz = b.peq ? 15 : 18;
      function cel(tx, i, cab) { return new docx.TableCell({ width: { size: ws[i], type: docx.WidthType.DXA }, borders: BORDAS, margins: { top: 40, bottom: 40, left: 70, right: 70 }, shading: cab ? { type: docx.ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined, children: [new docx.Paragraph({ children: [run(tx, { size: sz, bold: cab })] })] }); }
      var rows = [new docx.TableRow({ tableHeader: true, cantSplit: true, children: b.cab.map(function (c, i) { return cel(c, i, true); }) })].concat(b.lins.map(function (l) { return new docx.TableRow({ cantSplit: true, children: b.cab.map(function (c, i) { return cel(l[i] === undefined ? '' : l[i], i, false); }) }); }));
      return new docx.Table({ width: { size: LARG, type: docx.WidthType.DXA }, columnWidths: ws, rows: rows });
    }
    /** 2.5.3: cascata como figura feita de tabela: rótulo, 40 células de barra (pintadas no trecho da barra) e o valor. */
    function cascata(b) {
      var NC = 40, e = b.eixo, vao = e.b - e.a, wR = Math.round(LARG * 0.36), wV = Math.round(LARG * 0.12), wC = Math.floor((LARG - wR - wV) / NC), SEM = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, NADA = { top: SEM, bottom: SEM, left: SEM, right: SEM };
      var cor = { sub: '2E6DB4', soma: 'C0392B', subt: '2E8B57' }, ws = [wR].concat(Array(NC).fill(wC), [wV]);
      function cel(w, tx, o) { o = o || {}; return new docx.TableCell({ width: { size: w, type: docx.WidthType.DXA }, borders: NADA, margins: { top: 20, bottom: 20, left: o.pad === 0 ? 0 : 60, right: o.pad === 0 ? 0 : 60 }, shading: o.fill ? { type: docx.ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined, children: [new docx.Paragraph({ alignment: o.al, children: tx ? [run(tx, { size: 15, bold: o.bold, cor: o.cor })] : [] })] }); }
      var rows = b.itens.map(function (x) {
        var sub = x.k === 'sub', x0 = sub ? e.o : x.acc - x.v, x1 = sub ? x.v : x.acc, i0 = Math.floor((Math.min(x0, x1) - e.a) / vao * NC + 1e-9), i1 = Math.max(i0 + 1, Math.ceil((Math.max(x0, x1) - e.a) / vao * NC - 1e-9));
        var k = sub ? 'sub' : x.v > 0 ? 'soma' : 'subt', cs = [cel(wR, x.r, { al: docx.AlignmentType.RIGHT })];
        for (var i = 0; i < NC; i++) cs.push(cel(wC, '', { pad: 0, fill: i >= i0 && i < i1 ? cor[k] : null }));
        cs.push(cel(wV, sub ? n2(x.v, 2) + ' mca' : (x.v > 0 ? '+ ' : '− ') + n2(Math.abs(x.v), 2), { bold: sub, cor: sub ? undefined : cor[k] }));
        return new docx.TableRow({ cantSplit: true, children: cs });
      });
      return new docx.Table({ width: { size: LARG, type: docx.WidthType.DXA }, columnWidths: ws, rows: rows });
    }
    var filhos = [], titulo = '', sub = '';
    B.forEach(function (b) {
      if (b.t === 'titulo') { titulo = b.tx; sub = b.sub; filhos.push(new docx.Paragraph({ heading: docx.HeadingLevel.TITLE, children: [run(b.tx, { size: 34, bold: true })], spacing: { after: 60 } })); if (b.sub) filhos.push(par(b.sub, { size: 24, depois: 200 })); }
      else if (b.t === 'h1') filhos.push(new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_1, children: [run(b.tx, { size: 26, bold: true })], spacing: { before: 280, after: 100 }, keepNext: true }));
      else if (b.t === 'h3') filhos.push(new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_2, children: [run(b.tx, { size: 21, bold: true })], spacing: { before: 180, after: 80 }, keepNext: true }));
      else if (b.t === 'p') filhos.push(par(b.tx, { size: b.peq ? 17 : 20, bold: b.forte || b.conta, ital: b.ital, cor: b.peq ? '555555' : undefined }));
      else if (b.t === 'casc') { filhos.push(cascata(b)); filhos.push(par('', { antes: 0, depois: 40, size: 8 })); }
      else if (b.t === 'tab') { filhos.push(tabela(b)); filhos.push(par('', { antes: 0, depois: 40, size: 8 })); }
    });
    var cz = { size: 16, cor: '555555' };
    var cabec = new docx.Header({ children: [new docx.Paragraph({ children: [run(titulo + (sub ? '. ' + sub : ''), cz)] })] });
    var rodape = new docx.Footer({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [run('Gerado pelo ' + (opc.versao || 'FireCalc') + '. © 2026 Mateus Beraldi Nobre. Software livre sob a AGPL-3.0, sem garantia. Página ', cz), new docx.TextRun({ children: [docx.PageNumber.CURRENT], font: FONTE, size: 16, color: '555555' }), run(' de ', cz), new docx.TextRun({ children: [docx.PageNumber.TOTAL_PAGES], font: FONTE, size: 16, color: '555555' })] })] });
    return new docx.Document({
      creator: opc.autor || '', title: titulo, description: sub, styles: { default: { document: { run: { font: FONTE, size: 20 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1134, left: 1134, right: 1134 } } }, headers: { default: cabec }, footers: { default: rodape }, children: filhos }]
    });
  }
  return { blocos: blocos, gerar: gerar, numTx: numTx, limpa: limpa, VERSAO: '2.5.3' };
});
