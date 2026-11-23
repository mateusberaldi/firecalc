/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, estado. Sem tela. É o único módulo que chama o motor.
 * F (formulário) guarda o TEXTO de cada campo. O projeto do motor só é montado (paraMotor) quando todos os textos são válidos.
 * O arquivo .json continua no formato da 1.0.0; acréscimos opcionais: identificacao, confirmacoes, retorno (a marca origemRede de arquivos antigos é ignorada ao abrir e some ao salvar). */
(function (raiz, f) {
  if (typeof module === 'object' && module.exports) module.exports = f(require('./validacao.js'), require('./cadastros.js'));
  else raiz.FireEstado = f(raiz.FireValida, raiz.FireCadastros);
})(typeof self !== 'undefined' ? self : this, function (V, CAD) {
  'use strict';
  var num = V.num, vazio = V.vazio;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function txt(v) { if (v === undefined || v === null || v === '') return ''; if (typeof v === 'number' && isFinite(v) && Math.abs(v) < 1e15) v = +v.toFixed(10); return String(v).replace('.', ','); }   /* FC-006: 10 casas, sem zeros à direita */
  function txtMapa(m) { var o = {}; Object.keys(m || {}).forEach(function (k) { o[k] = String(m[k]); }); return o; }
  function numMapa(m) { var o = {}; Object.keys(m || {}).forEach(function (k) { var q = parseInt(m[k], 10); if (q > 0) o[k] = q; }); return o; }
  function sem(o, chaves) { var r = {}; Object.keys(o || {}).forEach(function (k) { if (chaves.indexOf(k) < 0) r[k] = o[k]; }); return r; }

  function novo() {
    return { base: {}, ident: { obra: '', endereco: '', municipio: '', uf: '', rt: '', registro: '', art: '', escritorio: '', cnpj: '' },
      norma: '', tabelaLeq: 'A', tubo: { norma: 'NBR 5580', classe: 'leve' }, tipoTubo: 'HID_Galvanizado_Classe_Leve_Roscado_BSP', C: '120', Cfonte: '',
      sistema: { divisao: '', area: '', altura: '', carga: '', coluna: '', tipoManual: '', esg4: '40' }, conf: { coluna: false, tipo: false, lista: false },
      trechos: [], nos: {}, hidrantes: [], cotasExtras: [],
      fonte: fonteNova(), ambiente: { altitude: '', temperatura: '' },
      bomba: { id: '', npshr: '', npshQ: '1' }, conferidos: {}, jockey: { id: '' }, saidas: '', recalque: { ativo: false, no: '', tipo: '', z: '', dn: 65, L: '' },
      retorno: { ativo: false, zDescarga: '', trechos: [{ dn: 65, L: '', C: '', pecas: {} }] }, retornoTeste: false, parForcado: '', bombasUsuario: [], mangueirasUsuario: {}, lanc: lancNovo() };
  }
  /* Dados do esguicho e da mangueira (2.2): texto dos campos, fonte de cada valor alterado (fQ, fP...) e os valores oficiais da última sincronização (of). */
  var LANC = [['Q', 'Q'], ['P', 'P'], ['dn', 'mangueiraDN'], ['L', 'Lmang'], ['alcance', 'alcance']];
  function lancNovo() { return { Q: '', P: '', dn: '', L: '', alcance: '', Pe: '', PeAuto: true, fQ: '', fP: '', fdn: '', fL: '', falcance: '', fPe: '', of: null, PeMin: null, esg: '' }; }
  function lancOficial(F, D, M) { var tf = tipoFinal(F, D, M), N = D.normas[F.norma], to = tf && N ? N.tipos.filter(function (t) { return t.id === tf; })[0] : null; if (!to) return null; var o = M.dadosLancamento({}, N, to).oficial; return { Q: o.Q, P: o.P, dn: o.mangueiraDN, L: o.Lmang, alcance: o.alcance }; }
  /** 2.6.0: esguicho do projeto: o escolhido pelo botão "Selecionar esguicho" ou, sem escolha, o padrão do diâmetro da mangueira. */
  function esguichoDe(F, M) { var l = F.lanc || {}; return l.esg || M.esguichoPadrao(+l.dn || (l.of && l.of.dn) || 40); }
  function lancAlterado(F, k) { var l = F.lanc, v = num(l[k]); return !!(l.of && !vazio(l[k]) && !isNaN(v) && Math.abs(v - l.of[k]) > 1e-9); }
  /** Preenche os campos com a tabela oficial do tipo (IT 22, Tabela 2, ou NPT 022, Tabela 1). Campo vazio ou igual ao oficial anterior acompanha a tabela; campo alterado fica.
   *  No Paraná, calcula a pressão de entrada mínima do esguicho do primeiro hidrante e, enquanto o usuário não digitar outra, mostra essa pressão no campo. */
  function sincLanc(F, D, M) {
    if (!F.lanc) F.lanc = lancNovo(); var l = F.lanc, of = lancOficial(F, D, M); l.PeMin = null;
    if (!of) return;
    LANC.forEach(function (c) { var k = c[0], v = num(l[k]); if (vazio(l[k]) && k !== 'dn' && l.of && l.tocou) return; if (vazio(l[k]) || (l.of && !isNaN(v) && Math.abs(v - l.of[k]) < 1e-9)) l[k] = k === 'dn' ? of[k] : txt(of[k]); });
    l.of = of;
    if (F.norma !== 'PR') { l.Pe = ''; l.PeAuto = true; l.fPe = ''; return; }
    var mod = esguichoDe(F, M), q = num(l.Q), p = num(l.P);
    if (mod && q > 0 && p > 0) { try { l.PeMin = M.pontoParana(D, { id: '', esguicho: mod }, { Q: q, P: p }).PeMin; } catch (e) { l.PeMin = null; } }
    if (l.PeAuto) l.Pe = l.PeMin === null ? '' : txt(Math.round(l.PeMin * 100) / 100);
  }
  /** FC-014: modelo de esguicho escolhido no projeto que não está na base nem na biblioteca (nem na cópia do arquivo); '' quando está, ou quando vale o padrão do diâmetro. */
  function esguichoAusente(F, D) { var m = F && F.lanc && F.lanc.esg; return m && !(D.esguichos || []).some(function (e) { return e.modelo === m; }) ? m : ''; }
  /** FC-014: o projeto guarda a cópia do esguicho da biblioteca que usa (F.cadastrosUsuario), para a retirada do item da biblioteca não mudar o cálculo e para o arquivo salvo levá-la. */
  function guardaEsguicho(F) {
    var m = F.lanc && F.lanc.esg, rows = m && bibCad && bibCad.esguichos ? bibCad.esguichos.filter(function (e) { return e.modelo === m; }) : [];
    if (!rows.length) return; if (!F.cadastrosUsuario) F.cadastrosUsuario = CAD.vazia(); if (!Array.isArray(F.cadastrosUsuario.esguichos)) F.cadastrosUsuario.esguichos = [];
    rows.forEach(function (e) { if (!F.cadastrosUsuario.esguichos.some(function (y) { return JSON.stringify(y) === JSON.stringify(e); })) F.cadastrosUsuario.esguichos.push(clone(e)); });
  }
  function textoEsguichoAusente(m, norma) {
    return 'O esguicho "' + m + '" não está na base nem na biblioteca deste computador. Cadastre-o de novo em Minha biblioteca ou escolha outro em Selecionar esguicho. ' +
      (norma === 'PR' ? 'Sem ele, não há pressão na válvula.' : 'Sem ele, não há pressão no esguicho nem a verificação V28.');
  }
  /** Ordem montante-jusante de cada trecho, a partir de RI (Azevedo Netto, cap. 19). Trecho sem caminho até RI fica como veio. */
  function orienta(nomes) {
    var adj = {}, prof = { RI: 0 }, fila = ['RI'];
    nomes.forEach(function (n) { var p = String(n).split('-'); if (p.length !== 2) return; (adj[p[0]] = adj[p[0]] || []).push(p[1]); (adj[p[1]] = adj[p[1]] || []).push(p[0]); });
    while (fila.length) { var n = fila.shift(); (adj[n] || []).forEach(function (v) { if (!(v in prof)) { prof[v] = prof[n] + 1; fila.push(v); } }); }
    return nomes.map(function (n) { var p = String(n).split('-'); if (p.length !== 2) return [String(n), '']; return (p[0] in prof) && (p[1] in prof) && prof[p[1]] < prof[p[0]] ? [p[1], p[0]] : [p[0], p[1]]; });
  }
  function tipoDe(t, esg4) { return (t === '4' || t === '4-40') ? (esg4 === '65' ? '4-65' : '4-40') : t; }
  /** Tipo de sistema adotado: o escolhido à mão (tipo superior) ou o da tabela da norma para a coluna e a área. */
  function tipoFinal(F, D, M) {
    if (F.sistema.tipoManual) return F.sistema.tipoManual;
    var a = num(F.sistema.area); if (!F.norma || !F.sistema.coluna || isNaN(a) || a <= 0) return null;
    var cl = M.classifica(D, F.norma, F.sistema.coluna, a); return cl ? tipoDe(cl.tipo, F.sistema.esg4) : null;
  }
  /** Abre um projeto (.json da 1.0.0 ou da 2.0): número vira texto, trecho vira montante e jusante. */
  function abrir(proj, D, M) {
    var p = clone(proj), F = novo(), s = p.sistema || {}, id = p.identificacao || {};
    F.base = p;
    if (p.cadastrosUsuario) { F.cadastrosUsuario = clone(p.cadastrosUsuario); CAD.aplica(D, bibCad, F.cadastrosUsuario); }   /* 2.5.1: itens de biblioteca que o projeto usa viajam no arquivo */
    Object.keys(F.ident).forEach(function (k) { if (id[k]) F.ident[k] = String(id[k]); });
    if (!F.ident.obra) F.ident.obra = (p.meta && p.meta.nome) || p.nome || '';
    F.norma = p.norma || ''; F.tabelaLeq = p.tabelaLeq || 'A'; if (p.tubo) F.tubo = { norma: p.tubo.norma, classe: p.tubo.classe }; F.C = txt(p.C === undefined ? 120 : p.C);
    /* 2.5.0: tipo de tubo com nome comercial; arquivo antigo (norma e classe) vira o tipo equivalente */
    var mig = []; F.tipoTubo = p.tipoTubo && tipoTubo(D, p.tipoTubo) ? p.tipoTubo : ((D.tipoTuboAntigo || {})[F.tubo.norma + '|' + F.tubo.classe] || F.tipoTubo); F.Cfonte = p.Cfonte || ''; sincTubo(F, D);
    F.sistema = { divisao: s.divisao || '', area: txt(s.area), altura: txt(s.altura), carga: txt(s.carga), coluna: s.coluna || '', tipoManual: s.tipoManual || '', esg4: s.esg4 || (s.tipo === '4-65' ? '65' : '40') };
    if (s.tipo && !F.sistema.tipoManual) {   // tipo explícito do arquivo: vale como escolha à mão quando difere da tabela (ou quando não há coluna)
      var cl = s.coluna && s.area ? M.classifica(D, F.norma, s.coluna, s.area) : null;
      if (!cl || tipoDe(cl.tipo, F.sistema.esg4) !== s.tipo) F.sistema.tipoManual = s.tipo;
    }
    if (F.sistema.coluna) { var gs = F.norma && s.divisao ? M.sugereColuna(D, F.norma, s.divisao, s.carga) : null; F.sistema.colManual = !(gs && gs.colunas && gs.colunas.indexOf(F.sistema.coluna) >= 0); }
    var cf = p.confirmacoes; F.conf = cf ? { coluna: !!s.coluna, tipo: !!cf.tipo, lista: !!cf.lista } : { coluna: !!s.coluna, tipo: !!(p.trechos && p.trechos.length), lista: false };
    var tr = p.trechos || [], ori = orienta(tr.map(function (t) { return t.nome; }));
    F.trechos = tr.map(function (t, i) { return { de: ori[i][0], para: ori[i][1], dn: t.dn, L: txt(t.L), pecas: txtMapa(t.pecas), C: txt(t.C), tipo: t.tipo && tipoTubo(D, t.tipo) ? t.tipo : '', _o: sem(t, ['nome', 'dn', 'L', 'pecas', 'C', 'tipo', 'tubo', 'junta']) }; });
    Object.keys(p.nos || {}).forEach(function (n) { F.nos[n] = txt(p.nos[n] && p.nos[n].z); });
    /* 2.5.0: a identificação do hidrante é o nome do nó; a de arquivo antigo, quando difere, fica guardada (idPrancha) */
    var idsAntigos = []; (p.hidrantes || []).forEach(function (h) { if (h.id && h.id !== h.no) { idsAntigos.push(h.id + ' para ' + h.no); h.idPrancha = h.idPrancha || h.id; } });
    if (idsAntigos.length) mig.push('Identificação dos hidrantes igual ao nó da rede (' + idsAntigos.join(', ') + '). O nome antigo fica guardado no arquivo.');
    F.hidrantes = (p.hidrantes || []).map(function (h) { return { id: h.no, no: h.no, alturaValvula: txt(h.alturaValvula), caminho: h.caminho || 'A', esguicho: h.esguicho || '', mangueiraDN: h.mangueiraDN || '', Lmang: txt(h.Lmang), red: !!h.redutora, redP: txt(h.redutora && h.redutora.P), redFonte: (h.redutora && h.redutora.fonte) || '', _o: sem(h, ['id', 'no', 'alturaValvula', 'caminho', 'esguicho', 'mangueiraDN', 'Lmang', 'redutora']) }; });
    var lc = p.lancamento || {}, lf = lc.fontes || {}; F.lanc = lancNovo();
    LANC.forEach(function (c) { if (typeof lc[c[1]] === 'number') { F.lanc[c[0]] = c[0] === 'dn' ? lc[c[1]] : txt(lc[c[1]]); F.lanc['f' + c[0]] = lf[c[1]] || ''; } });
    if (typeof lc.Pentrada === 'number') { F.lanc.Pe = txt(lc.Pentrada); F.lanc.PeAuto = false; F.lanc.fPe = lf.Pentrada || ''; }
    /* 2.6.0: um esguicho para o projeto inteiro; o arquivo guarda o modelo em cada hidrante. Sem modelo, vale o padrão do diâmetro. */
    F.lanc.esg = typeof p.esguichoProjeto === 'string' ? p.esguichoProjeto : (p.hidrantes || []).map(function (h) { return h.esguicho || ''; }).filter(Boolean)[0] || '';   /* esguichoProjeto: '' = padrão do diâmetro (arquivo da 2.6.0) */
    /* FC-014: esguicho da biblioteca que o arquivo não traz e este computador não tem: avisa, sem trocar o esguicho */
    CAD.aplica(D, bibCad, F.cadastrosUsuario); var esgAus = esguichoAusente(F, D); if (esgAus) mig.push(textoEsguichoAusente(esgAus, p.norma));
    /* FC-013: arquivo anterior à 2.6.0 com esguichos diferentes por hidrante (só PR usa o esguicho do arquivo): fica o do primeiro, e o aviso diz isso */
    var esgs = (p.hidrantes || []).map(function (h) { return h.esguicho || ''; }).filter(Boolean);
    if (p.norma === 'PR' && typeof p.esguichoProjeto !== 'string' && esgs.some(function (m) { return m !== esgs[0]; })) mig.push('Os hidrantes deste arquivo tinham esguichos diferentes. O projeto fica com um só, o do primeiro hidrante (' + esgs[0] + '), e a pressão na válvula e a de entrada mínima podem mudar.');
    var lms = (p.hidrantes || []).map(function (h) { return h.Lmang; }).filter(function (v) { return typeof v === 'number'; }), lm0 = typeof lc.Lmang === 'number' ? lc.Lmang : 30;
    if (p.norma === 'PR' && lms.some(function (v) { return Math.abs(v - lm0) > 1e-9; })) mig.push('Este arquivo tem comprimento de mangueira por hidrante (' + lms.join(', ') + ' m). Os valores continuam no cálculo; ao mudar o comprimento no cartão Mangueira, todos os hidrantes passam a ter o mesmo.');
    if ((p.cotasExtras || []).length) mig.push('Este arquivo tem pavimentos sem hidrante no cálculo, recurso que saiu na 2.5.0. As cotas continuam valendo, só para leitura, na etapa Hidrantes; lance os hidrantes desses pavimentos na rede e retire a lista.');
    F.cotasExtras = (p.cotasExtras || []).map(function (c) { return { nome: c.nome, z: txt(c.z), red: !!c.redutora, redP: txt(c.redutora && c.redutora.P), redFonte: (c.redutora && c.redutora.fonte) || '' }; });
    var f = p.fonte || {}; F.fonte = Object.assign(fonteNova(), { modo: f.modo || (tr.length ? 'bomba' : ''), zX: txt(f.zX), zCheio: txt(f.zCheio), rtiEfetiva: txt(f.rtiEfetiva), elevado: !!f.elevado });
    abreAbast(F, f, !!(tr.length || f.modo || f.zX !== undefined || f.zCheio !== undefined || f.rtiEfetiva !== undefined || (p.nos && p.nos.RI)));   /* 2.5.1 */
    var a = p.ambiente || {}; F.ambiente = { altitude: txt(a.altitude), temperatura: txt(a.temperatura) };
    if (p.bomba) F.bomba = { id: p.bomba.id || '', npshr: txt(p.bomba.npshr), npshQ: p.bomba.npshQ === 1.5 ? '1.5' : '1' };
    F.conferidos = p.conferidos && typeof p.conferidos === 'object' ? clone(p.conferidos) : {};   /* 2.5.4 */
    if (p.jockey) F.jockey = { id: p.jockey.id || '' };
    F.saidas = txt(p.saidas);
    if (p.recalque) F.recalque = { ativo: p.recalque.ativo !== false, no: p.recalque.no || '', tipo: p.recalque.tipo || '', z: txt(p.recalque.z), dn: p.recalque.dn || 65, L: txt(p.recalque.L) };
    if (p.recalque && !p.recalque.no && (p.recalque.z !== undefined || p.recalque.L !== undefined)) mig.push('O recalque deste arquivo foi lançado à parte (cota, diâmetro e comprimento). Ele continua valendo; para escolher o recalque entre os pontos da rede, lance o ramo dele na etapa Rede.');   /* 2.3: pecas, descontaTronco e C de arquivos antigos são ignorados (o recalque não se calcula) */
    if (p.retorno && p.retorno.trechos) F.retorno = { ativo: true, zDescarga: txt(p.retorno.zDescarga), trechos: p.retorno.trechos.map(function (t) { return { dn: t.dn, L: txt(t.L), C: txt(t.C), pecas: txtMapa(t.pecas) }; }) };
    F.mangueirasUsuario = clone(p.mangueirasUsuario || {}); F.retornoTeste = !!p.retornoTeste; F.parForcado = p.parForcado || ''; F.bombasUsuario = (p.bombasUsuario || []).filter(function (b) { return b && b.id && b.pts; }); if (p.pid) F.pid = p.pid;
    sincroniza(F); if (mig.length) F.migracao = mig;
    return F;
  }
  /** Mantém a lista de hidrantes igual à rede: todo nó que começa com H é um hidrante; hidrante cujo nó saiu da rede sai da lista. */
  function sincroniza(F) {
    var nos = V.nosDaRede(F), tem = {};
    F.hidrantes = F.hidrantes.filter(function (h) { var fica = nos.indexOf(h.no) >= 0; if (fica) tem[h.no] = 1; return fica; });
    nos.forEach(function (n) { if (V.ehHid(n) && !tem[n]) F.hidrantes.push({ id: n, no: n, alturaValvula: '', caminho: F.norma === 'PR' ? 'B' : 'A', esguicho: '', mangueiraDN: '', Lmang: F.norma === 'PR' ? '30' : '', _o: {} }); });
    return F;
  }
  /** Enquadramento automático: a divisão e a carga puxam a coluna da tabela da norma.
   *  Uma coluna só: adotada sem confirmação. Duas colunas: o usuário escolhe uma das duas. colManual = enquadramento trocado à mão. */
  function autoColuna(F, D, M) {
    if (F.sistema.colManual || !F.norma) return;
    if (!F.sistema.divisao) { F.sistema.coluna = ''; F.conf.coluna = false; return; }
    var g = M.sugereColuna(D, F.norma, F.sistema.divisao, vazio(F.sistema.carga) ? undefined : num(F.sistema.carga));
    if (!g || !g.colunas) F.sistema.coluna = '';
    else if (g.colunas.length === 1) F.sistema.coluna = g.colunas[0];
    else if (g.colunas.indexOf(F.sistema.coluna) < 0) F.sistema.coluna = '';
    F.conf.coluna = !!F.sistema.coluna;
  }
  function contexto(F, D, M) {
    var g = F.norma && F.sistema.divisao ? M.sugereColuna(D, F.norma, F.sistema.divisao, vazio(F.sistema.carga) ? undefined : num(F.sistema.carga)) : null;
    var sd = vazio(F.saidas) ? F.hidrantes.length : parseInt(F.saidas, 10);
    return { sugestao: g, precisaCarga: !!(g && g.precisaCarga), jockeyExigida: F.norma === 'SP' && F.fonte.modo === 'bomba' && sd > 6 && !F.fonte.elevado,
      altitudes: D.ambiente.atm.alt, temperaturas: D.ambiente.vapor.T, lancAlt: function (k) { return lancAlterado(F, k); },
      npshCurva: (function () { var b = (D.bombas || []).filter(function (x) { return x.id === F.bomba.id; })[0]; return !!(b && b.npsh && b.npsh.length >= 2); })(),   /* 2.5.4 */
      cTabela: tipoTubo(D, F.tipoTubo) ? tipoTubo(D, F.tipoTubo).C : undefined, dnsDoTipo: function (id) { return dnsDoTipo(D, id); } };
  }
  /** Monta o objeto de projeto. tolerante = false: para o motor (todos os campos já validados). tolerante = true: para o arquivo (campo inválido ou vazio fica de fora). */
  function construir(F, D, M, tolerante) {
    var P = clone(F.base), n = function (s) { var v = num(s); return isNaN(v) ? undefined : v; }, poe = function (o, k, v) { if (v === undefined || v === '') delete o[k]; else o[k] = v; };
    delete P.meta; delete P.pid;
    if (tolerante) {   // o arquivo leva as bombas cadastradas à mão: as do projeto e a da biblioteca pessoal que o projeto usa
      var bu = (F.bombasUsuario || []).slice(); biblioteca.forEach(function (b) { if ((b.id === F.bomba.id || b.id === F.jockey.id) && !bu.some(function (x) { return x.id === b.id; })) bu.push(b); });
      if (bu.length) P.bombasUsuario = bu; else delete P.bombasUsuario;
      if (Object.keys(F.mangueirasUsuario || {}).length) P.mangueirasUsuario = clone(F.mangueirasUsuario); else delete P.mangueirasUsuario;
      var cu = CAD.usados(F, cadastrosDe(F), D); if (cu) P.cadastrosUsuario = cu; else delete P.cadastrosUsuario;   /* 2.5.1 */
    } else { delete P.bombasUsuario; delete P.mangueirasUsuario; delete P.cadastrosUsuario; }
    P.nome = F.ident.obra || P.nome || 'Projeto'; P.norma = F.norma; P.tabelaLeq = F.tabelaLeq; sincTubo(F, D); P.tipoTubo = F.tipoTubo; P.tubo = { norma: F.tubo.norma, classe: F.tubo.classe }; poe(P, 'C', n(F.C)); if (cAlterado(F, D) && !vazio(F.Cfonte)) P.Cfonte = String(F.Cfonte).trim(); else delete P.Cfonte;
    var tf = tipoFinal(F, D, M), s = {};
    if (n(F.sistema.area) > 0) s.area = n(F.sistema.area);   /* 2.7.0 (FC-041): a área vai também sem coluna da tabela (A-1, M-1, M-4...), para o enquadramento pelo decreto */
    if (F.sistema.coluna && n(F.sistema.area) > 0) s.coluna = F.sistema.coluna;
    if (n(F.sistema.altura) !== undefined) s.altura = n(F.sistema.altura);   /* 2.7.0 (FC-041): altura da edificação, opcional, só lida em SP (V35) */
    if (tf) s.tipo = tf;
    if (F.sistema.divisao) { s.divisao = F.sistema.divisao; if (n(F.sistema.carga) !== undefined) s.carga = n(F.sistema.carga); }
    if (tolerante) { if (F.sistema.tipoManual) s.tipoManual = F.sistema.tipoManual; s.esg4 = F.sistema.esg4; }
    P.sistema = s;
    var rr = !tolerante && F.recalque.ativo && F.recalque.no ? V.ramoRecalque(F, F.recalque.no) : null, fora = rr && rr.ok ? rr.idx : [];   // 2.5.0: o ramo do recalque fica fora do cálculo
    P.trechos = F.trechos.filter(function (t, i) { return fora.indexOf(i) < 0; }).map(function (t) { var o = Object.assign({}, t._o, { nome: String(t.de).trim() + '-' + String(t.para).trim(), dn: t.dn, pecas: numMapa(t.pecas) }); poe(o, 'L', n(t.L)); poe(o, 'C', n(t.C));
      if (tolerante) { if (t.tipo) o.tipo = t.tipo; } else { var tt = tipoTubo(D, t.tipo || F.tipoTubo), tp = tipoTubo(D, F.tipoTubo), ft = tuboDoTipo(D, t.tipo || F.tipoTubo, t.dn); if (ft) o.tubo = { norma: ft.norma, classe: ft.classe }; if (tt && tt.junta === 'ranhurada') o.junta = 'ranhurada'; if (t.tipo) o.tipo = t.tipo; if (o.C === undefined && tt && tp && tt.material !== tp.material) o.C = tt.C; }
      return o; });
    var nos = {}; V.nosDaRede(F).forEach(function (k) { var z = n(F.nos[k]); if (z !== undefined) nos[k] = { z: z }; });
    if (tolerante) ['RI', 'BI'].forEach(function (k) { var z = n(F.nos[k]); if (z !== undefined && !nos[k]) nos[k] = { z: z }; });   /* 2.5.1: cotas do Abastecimento digitadas antes da rede vão para o arquivo */
    P.nos = nos;
    var to = tf && D.normas[F.norma] ? D.normas[F.norma].tipos.filter(function (t) { return t.id === tf; })[0] : null;
    /* dados do esguicho e da mangueira: o arquivo e o motor só recebem o que difere da tabela oficial, com a fonte (2.2) */
    var lz = F.lanc || lancNovo(), LZ = {}, LF = {};
    LANC.forEach(function (c) { if (lancAlterado(F, c[0])) { LZ[c[1]] = num(lz[c[0]]); if (!vazio(lz['f' + c[0]])) LF[c[1]] = String(lz['f' + c[0]]).trim(); } });
    if (F.norma === 'PR' && !lz.PeAuto && n(lz.Pe) > 0) { LZ.Pentrada = n(lz.Pe); if (!vazio(lz.fPe)) LF.Pentrada = String(lz.fPe).trim(); }
    if (Object.keys(LZ).length) { if (Object.keys(LF).length) LZ.fontes = LF; P.lancamento = LZ; } else delete P.lancamento;
    /* válvula redutora de pressão no ponto: só entra no projeto com a regulagem válida (a validação segura a etapa enquanto faltar) */
    function poeRed(o, x) { var p = n(x.redP); if (x.red && p !== undefined) o.redutora = { P: p, fonte: String(x.redFonte || '').trim() }; }
    P.hidrantes = F.hidrantes.map(function (h) {
      var o = Object.assign({}, h._o, { id: h.no, no: h.no }); poe(o, 'alturaValvula', n(h.alturaValvula));
      /* 2.6.0: SP sempre pela Tabela 2 na válvula (o caminho B do arquivo antigo não volta ao motor); PR pelo esguicho do projeto */
      if (F.norma === 'PR') { o.caminho = 'B'; o.esguicho = esguichoDe(F, M); o.mangueiraDN = +lz.dn || (to ? to.mangueira : 40); o.Lmang = n(h.Lmang) || n(lz.L) || 30; }   /* o comprimento por hidrante de arquivo antigo continua valendo */
      else if (lz.esg) o.esguicho = lz.esg;
      poeRed(o, h);
      return o;
    });
    if (tolerante) P.esguichoProjeto = lz.esg || ''; else delete P.esguichoProjeto;   /* Só o arquivo guarda se o esguicho foi escolhido ou é o padrão */
    if (F.cotasExtras.length) P.cotasExtras = F.cotasExtras.map(function (c) { var o = { nome: c.nome }; poe(o, 'z', n(c.z)); poeRed(o, c); return o; }); else delete P.cotasExtras;
    var f = Object.assign({}, P.fonte); f.modo = F.fonte.modo; poe(f, 'zX', F.fonte.modo === 'bomba' ? n(F.fonte.zX) : undefined); poe(f, 'zCheio', n(F.fonte.zCheio)); poe(f, 'rtiEfetiva', n(F.fonte.rtiEfetiva));
    if (F.fonte.elevado) f.elevado = true; else delete f.elevado;
    /* 2.5.1: dados do nível X calculado (o único modo desde a 2.7.0, FC-048). */
    var fo = F.fonte; ['xModo', 'saida', 'dnSuc', 'resForma', 'poco', 'anti', 'zXFonte', 'nivelX', 'tipo', 'tipologia', 'elevModo', 'cubaForma', 'hProp', 'topoReserva', 'succao', 'declaracao'].concat(XK).forEach(function (k) { delete f[k]; });
    if (fo.xModo === 'calc') {
      f.xModo = 'calc'; if (fo.saida) f.saida = fo.saida; if (+fo.dnSuc) f.dnSuc = +fo.dnSuc; f.resForma = fo.resForma || 'ret'; XK.forEach(function (k) { poe(f, k, n(fo[k])); }); if (fo.poco) f.poco = true; if (fo.anti) f.anti = true; if (fo.declaracao && fo.tip === 'piscina') f.declaracao = true;   /* 2.7.0 (FC-027): só a piscina grava a declaração, e só marcada */
      if (!(fo.anti && fo.saida === 'cima' && F.norma === 'SP')) delete f.antiBocal;   /* 2.7.0 (FC-029): o diâmetro do bocal só vale (e só é gravado) com antivórtice na tomada por cima em SP */
      if (fo.tipo) { f.tipo = fo.tipo; if (fo.tip) f.tipologia = fo.tip; if (fo.tipo === 'elevado' && fo.elevModo) f.elevModo = fo.elevModo; if (fo.cubaForma === 'tronco') f.cubaForma = 'tronco'; }
      var nx = V.nivelX(F); if (nx.ok) { if (nx.hProp > 0) f.hProp = nx.hProp; if (nx.topoReserva !== null && nx.topoReserva !== undefined) f.topoReserva = nx.topoReserva; if (nx.succao) f.succao = nx.succao.estado; if (!tolerante) { delete nx.ok; delete nx.falta; f.nivelX = nx; } }   /* 2.6.0: o arquivo guarda a carga própria com o nó RI na base */
    }
    P.fonte = f;
    P.ambiente = {}; poe(P.ambiente, 'altitude', n(F.ambiente.altitude)); poe(P.ambiente, 'temperatura', n(F.ambiente.temperatura));
    if (F.bomba.id && F.fonte.modo !== 'gravidade') { P.bomba = Object.assign({}, P.bomba && P.bomba.id === F.bomba.id ? P.bomba : {}, { id: F.bomba.id }); poe(P.bomba, 'npshr', n(F.bomba.npshr) > 0 ? n(F.bomba.npshr) : undefined); if (F.bomba.npshQ === '1.5') P.bomba.npshQ = 1.5; else delete P.bomba.npshQ; }   /* 2.5.4: zero ou negativo não vai para o cálculo (o campo pede conferência); vazão da comparação do NPSH escolhida pelo projetista */ else delete P.bomba;
    if (F.jockey.id) P.jockey = Object.assign({}, P.jockey && P.jockey.id === F.jockey.id ? P.jockey : {}, { id: F.jockey.id }); else delete P.jockey;
    poe(P, 'saidas', vazio(F.saidas) ? undefined : parseInt(F.saidas, 10));
    var rc = F.recalque.ativo && F.recalque.no ? V.ramoRecalque(F, F.recalque.no) : null;   // 2.5.0: dados puxados do ramo escolhido na rede
    if (rc && (tolerante || (rc.ok && rc.L > 0 && n(rc.z) !== undefined))) { P.recalque = { no: F.recalque.no }; if (rc.ok) { P.recalque.dn = rc.dn; poe(P.recalque, 'z', n(rc.z)); poe(P.recalque, 'L', rc.L > 0 ? Math.round(rc.L * 100) / 100 : undefined); } if (F.recalque.tipo) P.recalque.tipo = F.recalque.tipo; }
    else if (F.recalque.ativo && !F.recalque.no && (tolerante || (n(F.recalque.L) > 0 && n(F.recalque.z) !== undefined))) { P.recalque = { dn: F.recalque.dn }; if (F.recalque.tipo) P.recalque.tipo = F.recalque.tipo; poe(P.recalque, 'z', n(F.recalque.z)); poe(P.recalque, 'L', n(F.recalque.L)); } else delete P.recalque;
    if (F.norma === 'PR' && F.retorno.ativo && (tolerante || (n(F.retorno.zDescarga) !== undefined && F.retorno.trechos.every(function (t) { return n(t.L) > 0; })))) { P.retorno = { trechos: F.retorno.trechos.map(function (t) { var o = { dn: t.dn, pecas: numMapa(t.pecas) }, ft = tolerante ? null : tuboDoTipo(D, F.tipoTubo, t.dn); if (ft) o.tubo = { norma: ft.norma, classe: ft.classe }; poe(o, 'L', n(t.L)); poe(o, 'C', n(t.C)); return o; }) }; poe(P.retorno, 'zDescarga', n(F.retorno.zDescarga)); } else delete P.retorno;
    if (F.norma === 'PR' && (F.retornoTeste || P.retorno)) P.retornoTeste = true; else delete P.retornoTeste;
    poe(P, 'parForcado', F.parForcado || undefined);
    if (tolerante) { P.identificacao = clone(F.ident); P.confirmacoes = clone(F.conf); delete P.origemRede; P.versaoFireCalc = '2.7.0'; if (F.conferidos && Object.keys(F.conferidos).length) P.conferidos = clone(F.conferidos); else delete P.conferidos; }
    else { delete P.identificacao; delete P.confirmacoes; delete P.origemRede; delete P.versaoFireCalc; delete P.conferidos; }
    return P;
  }
  /** Bombas cadastradas à mão (modo personalizado): as do projeto e as da biblioteca pessoal entram na lista de bombas da base antes do cálculo.
   *  As mangueiras cadastradas no projeto (F.mangueirasUsuario, mesmo formato da 1.0.0: {dn: {Q, J, fonte}}) valem no caminho B. Nada disso muda a base. */
  var biblioteca = [], bibCad = null;
  /** 2.5.1: biblioteca pessoal dos demais grupos (tubos, tipos de tubo, fator C, peças, esguichos, mangueiras, ocupações). */
  function defineCadastros(l) { bibCad = l || null; }
  function cadastrosDe(F) { var j = CAD.vazia(); [bibCad, F.cadastrosUsuario].forEach(function (o) { if (o) Object.keys(j).forEach(function (g) { (o[g] || []).forEach(function (x) { if (!j[g].some(function (y) { return JSON.stringify(y) === JSON.stringify(x); })) j[g].push(x); }); }); }); return j; }
  function defineBiblioteca(l) { biblioteca = (l || []).filter(function (b) { return b && b.id && b.pts; }); }
  function carregaCadastros(F, D) {
    CAD.aplica(D, bibCad, F.cadastrosUsuario);   /* 2.5.1 */
    if (!D.bombasBase) D.bombasBase = D.bombas.slice();
    var l = D.bombasBase.slice(), tem = {}; l.forEach(function (b) { tem[b.id] = 1; });
    (F.bombasUsuario || []).concat(biblioteca).forEach(function (b) { if (!tem[b.id]) { tem[b.id] = 1; l.push(b); } });
    D.bombas = l; D.mangueirasUsuario = F.mangueirasUsuario || (F.base && F.base.mangueirasUsuario) || {};
  }
  /** Renomear um nó leva a cota junto (e, se for hidrante, os dados dele). Vale quando o nome antigo saiu da rede, o novo está nela
   *  e o novo ainda não tem cota. hidAntes = cópia do hidrante do nó antigo, tirada antes da digitação. Devolve true se levou algo. */
  function renomeiaNo(F, antes, depois, hidAntes) {
    antes = String(antes || '').trim(); depois = String(depois || '').trim(); if (!antes || !depois || antes === depois) return false;
    var nos = V.nosDaRede(F); if (nos.indexOf(antes) >= 0 || nos.indexOf(depois) < 0) return false;
    var levou = false;
    if (!vazio(F.nos[antes]) && vazio(F.nos[depois])) { F.nos[depois] = F.nos[antes]; levou = true; }
    if (levou || vazio(F.nos[antes])) delete F.nos[antes];
    sincroniza(F);
    if (hidAntes && V.ehHid(depois)) {
      var h = F.hidrantes.filter(function (x) { return x.no === depois; })[0];
      if (h) { ['alturaValvula', 'caminho', 'esguicho', 'mangueiraDN', 'Lmang', 'red', 'redP', 'redFonte'].forEach(function (k) { if (hidAntes[k] !== undefined) h[k] = hidAntes[k]; }); h._o = hidAntes._o || {};
        if (hidAntes.id && hidAntes.id !== antes.replace(/^H(?=\d)/i, 'H-')) h.id = hidAntes.id; levou = true; }
    }
    if (F.parForcado && levou) F.parForcado = '';
    return levou;
  }
  /* 2.5.0: tipo de tubo com nome comercial (D.tiposTubo, em dados.json). O diâmetro interno vem do segmento do tipo que tem o DN. */
  function tipoTubo(D, id) { return (D.tiposTubo || []).filter(function (t) { return t.id === id; })[0] || null; }
  function tuboDoTipo(D, id, dn) {
    var tp = tipoTubo(D, id); dn = +dn; if (!tp) return null;
    for (var k = 0; k < tp.segmentos.length; k++) {
      var s = tp.segmentos[k]; if (s.dns && s.dns.indexOf(dn) < 0) continue;
      var ft = D.tubos.filter(function (x) { return x.norma === s.norma && x.classe === s.classe && x.dn === dn; })[0]; if (ft) return ft;
    }
    return null;
  }
  function dnsDoTipo(D, id) { var l = []; D.tubos.forEach(function (x) { if (l.indexOf(x.dn) < 0 && tuboDoTipo(D, id, x.dn)) l.push(x.dn); }); return l.sort(function (a, b) { return a - b; }); }
  /** F.tubo (norma e classe, como até a 2.4.4) acompanha o tipo do projeto: vale o primeiro segmento. */
  function sincTubo(F, D) { var tp = tipoTubo(D, F.tipoTubo); if (tp) F.tubo = { norma: tp.segmentos[0].norma, classe: tp.segmentos[0].classe }; return F; }
  /** O fator C do projeto difere do C da Tabela 1 para o material do tubo escolhido. */
  function cAlterado(F, D) { var tp = tipoTubo(D, F.tipoTubo), c = num(F.C); return !!tp && !vazio(F.C) && !isNaN(c) && Math.abs(c - tp.C) > 1e-9; }
  /* ---- 2.5.1: Abastecimento antes da Rede, nível X calculado ---- */
  var XK = ['zFundo', 'resC', 'resL', 'resD', 'resVol', 'zTomada', 'pocoProf', 'antiH', 'antiBocal', 'zFundoCuba', 'zBase', 'zSaida', 'troncoDb', 'troncoDt', 'troncoH', 'colD', 'pocoLado', 'zConsumo', 'zRaso', 'resArea'];   /* 2.7.0 (FC-027): fundo raso e área do espelho d'água da piscina */
  /** Abastecimento de projeto novo: nível X calculado (xModo 'calc'), o único modo desde a 2.7.0 (FC-048, D-024). */
  function fonteNova() { return { modo: '', zX: '', zCheio: '', rtiEfetiva: '', elevado: false, xModo: 'calc', saida: '', zFundo: '', dnSuc: '', resForma: 'ret', resC: '', resL: '', resD: '', resVol: '', zTomada: '', poco: false, pocoProf: '', anti: false, antiH: '', antiBocal: '',
      tipo: '', tip: '', elevModo: '', zFundoCuba: '', zBase: '', zSaida: '', troncoDb: '', troncoDt: '', troncoH: '', colD: '', cubaForma: 'cil', pocoLado: '', pocoProfAuto: true, pocoLadoAuto: true, zConsumo: '', zRaso: '', resArea: '', declaracao: false }; }
  /** Texto da recusa de arquivo sem a geometria do reservatório (FC-048, D-024); a tela o mostra depois de "Arquivo inválido: ". */
  var SEM_GEOMETRIA = 'o projeto não traz a geometria do reservatório (tipo, cotas e medidas do Abastecimento).';
  /** Lê do arquivo (f = fonte do .json) os dados do Abastecimento. Arquivo com dado e sem xModo calc não tem a geometria do reservatório: é recusado (FC-048, D-024). */
  function abreAbast(F, f, temDado) {
    var fo = F.fonte, modo = fo.modo;
    /* 2.6.0: fonte e tipologia. Arquivo antigo: bomba é inferior; reforço e gravidade são elevado. Bomba com a marca "elevado" (combinação contraditória da 2.5.4) abre como inferior, sem a marca. */
    fo.tipo = f.tipo || (modo === 'bomba' ? 'inferior' : modo ? 'elevado' : ''); fo.tip = f.tipologia || (fo.tipo ? (f.resForma === 'cil' ? 'cil' : 'ret') : '');
    fo.elevModo = f.elevModo || (fo.tipo === 'elevado' ? (modo === 'reforco' ? 'reforco' : modo === 'gravidade' ? 'gravidade' : '') : ''); fo.cubaForma = f.cubaForma || 'cil';
    if (modo === 'bomba' && f.elevado && !f.tipo) F._aviso = F.norma === 'SP' ? 'A marca de reservatório elevado não vale com bomba puxando de reservatório inferior; a dispensa da bomba de pressurização em SP saiu.' : 'A marca de reservatório elevado não vale com bomba puxando de reservatório inferior; ela saiu.';
    if (f.xModo === 'calc') { fo.xModo = 'calc'; fo.saida = f.saida || ''; fo.dnSuc = +f.dnSuc || ''; fo.resForma = f.resForma || 'ret'; XK.forEach(function (k) { fo[k] = txt(f[k]); }); fo.poco = !!f.poco; fo.anti = !!f.anti; fo.declaracao = !!f.declaracao; fo.pocoProfAuto = vazio(fo.pocoProf); fo.pocoLadoAuto = vazio(fo.pocoLado); }
    else if (temDado) throw new Error(SEM_GEOMETRIA);
    return F;
  }
  /** 2.6.0: campos do Abastecimento que valem em cada rota (tipo da fonte e tipologia do reservatório). Serve ao menu e à troca de tipo. */
  var ROT_ROTULOS = { saida: 'saída da água', zFundo: 'cota do fundo', zFundoCuba: 'cota do fundo da cuba', zBase: 'cota da base', zSaida: 'cota da saída na base', zTomada: 'cota real da tomada', resC: 'comprimento', resL: 'largura', resD: 'diâmetro', troncoDb: 'diâmetro da base da caixa', troncoDt: 'diâmetro do topo da caixa', troncoH: 'altura da caixa', colD: 'diâmetro da coluna', resVol: 'volume nominal', poco: 'poço de sucção', pocoProf: 'profundidade do poço', pocoLado: 'lado do poço', anti: 'antivórtice', antiH: 'altura do antivórtice', antiBocal: 'diâmetro do bocal do antivórtice', zConsumo: 'tomada de consumo', zRaso: 'cota do fundo na parte rasa', resArea: 'área do espelho d\'água', declaracao: 'declaração do responsável pelo uso' };
  function chavesDaRota(tipo, tip) {
    var k = ['zCheio', 'dnSuc', 'zConsumo'], poco = ['poco', 'pocoProf', 'pocoLado', 'anti', 'antiH', 'antiBocal'], inf = tipo === 'inferior';
    if (tip === 'ret') k = k.concat(['saida', 'zFundo', 'zTomada', 'resC', 'resL', 'resVol'], poco);
    else if (tip === 'piscina') k = k.concat(['saida', 'zFundo', 'zTomada', 'resC', 'resL', 'resArea', 'zRaso', 'declaracao'], poco);   /* 2.7.0 (FC-027) */
    else if (tip === 'cil') k = k.concat(['saida', 'zFundo', 'zTomada', 'resD', 'resVol'], poco);
    else if (tip === 'tronco') k = k.concat(['saida', 'zFundo', 'zTomada', 'troncoDb', 'troncoDt', 'troncoH', 'resVol'], inf ? ['anti', 'antiH', 'antiBocal'] : []);
    else if (tip === 'taca_seca') k = k.concat(['zFundoCuba', 'zSaida', 'resD', 'troncoDb', 'troncoDt', 'troncoH', 'resVol']);
    else if (tip === 'taca_molhada') k = k.concat(['zBase', 'zFundoCuba', 'zTomada', 'colD', 'resD', 'troncoDb', 'troncoDt', 'troncoH']);
    else if (tip === 'torre') k = k.concat(['zFundo', 'zSaida', 'resD', 'resVol'], poco);
    else if (tip === 'standpipe') k = k.concat(['saida', 'zBase', 'zTomada', 'resD', 'resVol']);
    return k;
  }
  function saidaValida(tipo, tip, v) { var ok = tipo === 'inferior' ? (tip === 'tronco' ? ['lateral', 'cima'] : ['lateral', 'cima', 'fundo']) : tip === 'standpipe' ? ['base', 'acima'] : ['lateral', 'fundo']; return ok.indexOf(v) >= 0; }
  /** O que o usuário já digitou e deixa de valer na rota nova: lista de rótulos (vazia quando nada se perde). */
  function camposPerdidos(F, tipo, tip) {
    var f = F.fonte, novas = chavesDaRota(tipo, tip), perdidos = [];
    if (!f.tip || !f.tipo) return perdidos;
    chavesDaRota(f.tipo, f.tip).forEach(function (k) {
      if (k === 'zCheio' || k === 'dnSuc' || k === 'zConsumo') return;
      var tem = typeof f[k] === 'boolean' ? f[k] : !vazio(f[k]); if (!tem) return;
      var some = novas.indexOf(k) < 0 || (k === 'saida' && !saidaValida(tipo, tip, f[k])); if (some && perdidos.indexOf(ROT_ROTULOS[k]) < 0) perdidos.push(ROT_ROTULOS[k]);
    });
    if (f.tipo === 'inferior' && tipo === 'elevado' && !vazio(F.nos.BI)) perdidos.push('cota do eixo da bomba');
    return perdidos;
  }
  /** Passa para a rota nova e apaga o que ela não usa (o aviso e a confirmação vêm antes, na tela). */
  function trocaRota(F, tipo, tip) {
    var f = F.fonte, novas = chavesDaRota(tipo, tip);
    Object.keys(ROT_ROTULOS).forEach(function (k) { if (novas.indexOf(k) < 0 || (k === 'saida' && !saidaValida(tipo, tip, f[k]))) f[k] = (k === 'poco' || k === 'anti' || k === 'declaracao') ? false : ''; });
    if (tip === 'piscina' && f.resForma === 'vol') f.resForma = 'ret'; else if (tip !== 'piscina' && f.resForma === 'area') f.resForma = 'ret';   /* 2.7.0 (FC-027): a forma de informar as medidas da rota anterior não vale na nova */
    if (f.tipo !== tipo) { if (tipo === 'elevado') { F.nos.BI = ''; f.elevModo = ''; } else f.elevModo = ''; }
    f.pocoProfAuto = f.pocoLadoAuto = true; f.tipo = tipo; f.tip = tip; if (f.cubaForma !== 'tronco') f.cubaForma = 'cil';
    return F;
  }
  /** Trecho que sai do reservatório (sucção da bomba ou saída do reservatório elevado): o primeiro que toca o nó RI. */
  function trechoSuc(F) { for (var i = 0; i < F.trechos.length; i++) { var t = F.trechos[i]; if (String(t.de).trim() === 'RI' || String(t.para).trim() === 'RI') return t; } return null; }
  /** 2.6.0: primeiro trecho da rede, o que sai de RI. Com bomba é RI-BI, com o DN da sucção do Abastecimento (ou o sugerido); na gravidade é RI-A. */
  function primeiroTrecho(F, D, M) {
    var g = F.fonte.modo === 'gravidade', dn = +F.fonte.dnSuc;
    if (!g && !(dn > 0)) { var sg = dnSugerido(F, D, M); dn = sg ? sg.dn : 65; }
    return { de: 'RI', para: g ? 'A' : 'BI', dn: g || !(dn > 0) ? 65 : dn, L: '', pecas: {}, _o: {} };
  }
  /** 2.6.0: ao ir do Abastecimento para a Rede, com rota de bomba e sem trecho que toque RI, cria o RI-BI no começo da lista. Na gravidade não cria nada. Devolve true se criou. */
  function criaSuccao(F, D, M) {
    var f = F.fonte; if (!f || (f.modo !== 'bomba' && f.modo !== 'reforco') || trechoSuc(F)) return false;
    F.trechos.unshift(primeiroTrecho(F, D, M)); return true;
  }
  /** DN sugerido para a sucção: o menor DN do tipo de tubo do projeto, a partir de DN65, com velocidade até o limite da sucção negativa na vazão da tabela (dois jatos). */
  function dnSugerido(F, D, M) {
    var tf = tipoFinal(F, D, M), N = D.normas[F.norma], to = tf && N ? N.tipos.filter(function (t) { return t.id === tf; })[0] : null; if (!to) return null;
    var Q = 2 * to.Q, lim = N.vmaxSucNeg, dns = dnsDoTipo(D, F.tipoTubo).filter(function (d) { return d >= 65; }), ult = null;
    for (var i = 0; i < dns.length; i++) { var tb = tuboDoTipo(D, F.tipoTubo, dns[i]); if (!tb) continue; ult = { dn: dns[i], v: M.vel(Q, tb.dint), Q: Q, lim: lim }; if (ult.v <= lim) return ult; }
    if (ult) ult.acima = true; return ult;
  }
  /** Liga o Abastecimento à Rede (vai e volta): o DN da sucção e o DN do trecho que sai de RI são o mesmo dado.
   *  Quem mudou por último manda: trocado no Abastecimento, vai para o trecho; trocado na Rede (ou rede colada ou importada), volta para o Abastecimento.
   *  O nível X, a cota do nó RI e a reserva efetiva saem daqui e não são digitados. */
  function sincAbast(F, D, M) {
    var f = F.fonte; if (!f) return F;
    /* 2.6.0: fonte.modo e fonte.elevado deixam de ser escolhidos e passam a ser derivados da fonte de pressão e do menu do reservatório elevado. */
    if (!f.tipo && f.modo) { f.tipo = f.modo === 'bomba' ? 'inferior' : 'elevado'; if (f.tipo === 'elevado' && !f.elevModo) f.elevModo = f.modo; if (!f.tip) f.tip = f.resForma === 'cil' ? 'cil' : 'ret'; }   /* quem define só o modo (arquivo antigo, testes) ganha a rota correspondente */
    if (f.tipo === 'inferior') { f.modo = 'bomba'; f.elevado = false; } else if (f.tipo === 'elevado') { f.modo = f.elevModo === 'reforco' ? 'reforco' : f.elevModo === 'gravidade' ? 'gravidade' : ''; f.elevado = true; }
    var ts = trechoSuc(F), dnS = +f.dnSuc || 0;
    if (!ts && (!dnS || f.dnAuto === true)) { var sg = dnSugerido(F, D, M); if (sg && sg.dn !== dnS) { f.dnSuc = sg.dn; f.dnAuto = true; dnS = sg.dn; } }
    if (ts) {
      var dr = +ts.dn;
      if (f._redeManda) f.dnSuc = dr;
      else if (f._dnRede === undefined || f._dnRede === null) { if (dnS) ts.dn = dnS; else f.dnSuc = dr; }
      else if (dr !== f._dnRede) f.dnSuc = dr;
      else if (dnS && dnS !== dr) ts.dn = dnS;
      f._dnRede = +ts.dn; f.dnAuto = false;
    } else f._dnRede = null;
    delete f._redeManda;
    if (f.poco) { var r0 = V.nivelX(F); if (r0.pocoProfMin !== undefined) { if (f.pocoProfAuto !== false) f.pocoProf = txt(r0.pocoProfMin); if (f.pocoLadoAuto !== false) f.pocoLado = txt(r0.pocoLadoMin); } }
    if (f.modo || f.tipo) {
      var r = V.nivelX(F);
      if (f.modo === 'bomba') { f.zX = r.ok ? txt(r.X) : ''; F.nos.RI = f.zFundo; }
      else { f.zX = ''; F.nos.RI = r.ok ? txt(r.zRI) : ''; }   /* 2.6.0: o nó RI fica na saída por onde a água entra na rede (taça seca e torre: na base); a carga própria vai ao motor em fonte.hProp */
      f.rtiEfetiva = r.ok && r.reserva !== undefined ? txt(r.reserva) : '';
    }
    return F;
  }
  /** Reordenar os trechos (item 2): a ordem não muda o cálculo (o motor monta a rede pelos nós), só a ordem do relatório. */
  function move(F, i, j) { if (i === j || i < 0 || j < 0 || i >= F.trechos.length || j >= F.trechos.length) return false; var t = F.trechos.splice(i, 1)[0]; F.trechos.splice(j, 0, t); return true; }
  /** Projeto guardado no navegador por uma versão anterior (2.0 a 2.4.4): completa os campos da 2.5.0 sem perder dado. */
  function migraF(F, D) {
    if (!F.tipoTubo || !tipoTubo(D, F.tipoTubo)) F.tipoTubo = (D.tipoTuboAntigo || {})[F.tubo.norma + '|' + F.tubo.classe] || 'HID_Galvanizado_Classe_Leve_Roscado_BSP';
    if (F.Cfonte === undefined) F.Cfonte = '';
    F.trechos.forEach(function (t) { if (t.tipo === undefined) t.tipo = ''; });
    if (F.recalque && F.recalque.no === undefined) F.recalque.no = '';
    if (F.fonte.xModo !== 'calc') throw new Error(SEM_GEOMETRIA);   /* cópia guardada no navegador por versão anterior, sem a geometria (FC-048) */
    F.hidrantes.forEach(function (h) { if (h.id !== h.no) { h._o = h._o || {}; if (!h._o.idPrancha && h.id) h._o.idPrancha = h.id; h.id = h.no; } });
    return sincTubo(F, D);
  }
  function paraMotor(F, D, M) { return construir(F, D, M, false); }
  function paraArquivo(F, D, M) { return construir(F, D, M, true); }
  /** Situação do projeto: 'branco', 'invalido', 'incompleta', 'aguarda' (faltam dados de outras etapas), 'ok' (calculado) ou 'falha' (o motor recusou).
   *  Só chega ao motor quando não há campo inválido, a rede fecha e nada do que o cálculo precisa está vazio. */
  function avalia(F, D, M) {
    sincroniza(F); carregaCadastros(F, D); guardaEsguicho(F); sincAbast(F, D, M); sincLanc(F, D, M);
    var ctx = contexto(F, D, M), campos = V.validar(F, ctx), r = { campos: campos, ctx: ctx, inv: campos.filter(function (c) { return c.n === 'erro'; }), av: [], falta: [], esgAusente: esguichoAusente(F, D) };
    if (!F.trechos.length) { r.k = 'branco'; return r; }
    var est = V.estrutura(F); r.alc = est.alc;
    if (r.inv.length) { r.k = 'invalido'; return r; }
    if (est.avisos.length) { r.k = 'incompleta'; r.av = est.avisos; return r; }
    if (r.esgAusente && F.norma === 'PR') { r.k = 'falha'; r.msg = 'O esguicho "' + r.esgAusente + '" não está na base nem na biblioteca deste computador. Cadastre-o de novo ou escolha outro esguicho na etapa Hidrantes.'; return r; }   /* FC-014: o PR calcula pelo esguicho */
    r.falta = campos.filter(function (c) { return c.motor; });
    if (!r.falta.length && !tipoFinal(F, D, M)) r.falta.push({ c: 'sistema.coluna', etapa: 2, n: 'vazio', msg: 'Falta definir o tipo de sistema (etapa Edificação e sistema).' });
    if (r.falta.length) { r.k = 'aguarda'; return r; }
    try {
      var R = M.calcular(paraMotor(F, D, M), D);
      if (R.numeros.erros && R.numeros.erros.length) { r.k = 'falha'; r.msg = R.numeros.erros.join('; '); return r; }
      r.k = 'ok'; r.R = R;
    } catch (e) { r.k = 'falha'; r.msg = e.message; }
    return r;
  }
  /** Pilha de desfazer e refazer (50 passos do formulário). */
  function Historico(lim) {
    var pilha = [], pos = -1; lim = lim || 50;
    return {
      guarda: function (F) { var s = JSON.stringify(F); if (pos >= 0 && pilha[pos] === s) return; pilha = pilha.slice(0, pos + 1); pilha.push(s); if (pilha.length > lim + 1) pilha.shift(); pos = pilha.length - 1; },
      desfaz: function () { if (pos <= 0) return null; pos--; return JSON.parse(pilha[pos]); },
      refaz: function () { if (pos >= pilha.length - 1) return null; pos++; return JSON.parse(pilha[pos]); },
      pode: function () { return { desfazer: pos > 0, refazer: pos < pilha.length - 1 }; }
    };
  }
  return { novo: novo, abrir: abrir, autoColuna: autoColuna, sincroniza: sincroniza, contexto: contexto, paraMotor: paraMotor, migraF: migraF, tipoTubo: tipoTubo, tuboDoTipo: tuboDoTipo, dnsDoTipo: dnsDoTipo, sincTubo: sincTubo, cAlterado: cAlterado, move: move, paraArquivo: paraArquivo, avalia: avalia, esguichoAusente: esguichoAusente, textoEsguichoAusente: textoEsguichoAusente, tipoFinal: tipoFinal, tipoDe: tipoDe, orienta: orienta, Historico: Historico, txt: txt, clone: clone, defineBiblioteca: defineBiblioteca, defineCadastros: defineCadastros, carregaCadastros: carregaCadastros, renomeiaNo: renomeiaNo, lancNovo: lancNovo, esguichoDe: esguichoDe, lancAlterado: lancAlterado, lancOficial: lancOficial, fonteNova: fonteNova, chavesDaRota: chavesDaRota, camposPerdidos: camposPerdidos, trocaRota: trocaRota, ROT_ROTULOS: ROT_ROTULOS, sincAbast: sincAbast, trechoSuc: trechoSuc, primeiroTrecho: primeiroTrecho, criaSuccao: criaSuccao, dnSugerido: dnSugerido };
});
