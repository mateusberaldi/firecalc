/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.5.1, cadastros editáveis. Sem tela.
 * A base oficial continua travada, com a fonte de cada dado. O que o usuário acrescenta fica na biblioteca pessoal ("Minha biblioteca"), com fonte
 * obrigatória, e entra por cima da base antes do cálculo, com a marca "(personalizado)" no nome. Nada daqui altera um valor da base.
 * Grupos: tubos (uma linha por diâmetro), tipos de tubo, fator C, peças e comprimento equivalente, esguichos, ocupações; bombas e mangueiras
 * usam a leitura que já existia (as mesmas regras do cadastro à mão). Inclusão em lote por arquivo .json, com relatório do que entrou e do que foi recusado. */
(function (raiz, f) {
  if (typeof module === 'object' && module.exports) module.exports = f(require('./validacao.js'));
  else raiz.FireCadastros = f(raiz.FireValida);
})(typeof self !== 'undefined' ? self : this, function (V) {
  'use strict';
  var ORDEM = ['tubos', 'tiposTubo', 'C', 'pecas', 'esguichos', 'mangueiras', 'ocupacoes', 'bombas', 'reservatorios'];
  var NOME = { tubos: 'Tubos', tiposTubo: 'Tipos de tubo', C: 'Fator C', pecas: 'Peças e comprimento equivalente', esguichos: 'Esguichos', mangueiras: 'Mangueiras', ocupacoes: 'Ocupações', bombas: 'Bombas', reservatorios: 'Reservatórios' };
  /** 2.7.0 (FC-024): tipos de caixa da biblioteca de reservatórios (os do Abastecimento, menos a piscina) e as medidas internas de cada um, em metros.
   *  Sem dado de catálogo embutido (D-027): o item é sempre do usuário. */
  var TIPOS_RES = [['ret', 'Retangular'], ['cil', 'Cilíndrico'], ['tronco', 'Caixa de polietileno ou fibra'], ['taca', 'Taça'], ['torre', 'Torre'], ['standpipe', 'Standpipe']];
  var MEDIDAS_RES = { comprimento: 'o comprimento interno', largura: 'a largura interna', diametro: 'o diâmetro interno', diametroBase: 'o diâmetro interno da base', diametroTopo: 'o diâmetro interno do topo', altura: 'a altura', diametroColuna: 'o diâmetro interno da coluna' };
  var MARCA = ' (personalizado)';
  function vazia() { var o = {}; ORDEM.forEach(function (g) { if (g !== 'bombas') o[g] = []; }); return o; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function tx(v) { return String(v === undefined || v === null ? '' : v).trim(); }
  function nu(v) { return typeof v === 'number' ? v : V.num(v); }
  function slug(s) { return tx(s).normalize('NFD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function lista(v) { return Array.isArray(v) ? v : tx(v).split(/[;,]/).map(function (x) { return x.trim(); }).filter(function (x) { return x; }); }
  function chaveRes(x) { return tx(x.fabricante).replace(/\s+/g, ' ').toLowerCase() + '|' + tx(x.modelo).replace(/\s+/g, ' ').toLowerCase(); }
  function medidaRes(x, k, obrigatoria) {
    var v = x[k]; if (v === undefined || v === null || tx(v) === '') return obrigatoria ? { erro: 'Informe ' + MEDIDAS_RES[k] + ', em metros.' } : { v: null };
    var n = nu(v); if (typeof n !== 'number' || !isFinite(n) || !(n > 0)) return { erro: 'Medida inválida em ' + k + ': use um número maior que zero, em metros.' };
    return { v: n };
  }
  /** Reservatório da biblioteca. Fabricante e modelo pedem-se sempre; a fonte é opcional (sem fonte o item entra e fica marcado). Medidas em metros, volume nominal em m³. */
  function validaReservatorio(x, lib) {
    var fab = tx(x.fabricante), mod = tx(x.modelo), tipo = tx(x.tipo).toLowerCase(), it = { usuario: true, fabricante: fab, modelo: mod, tipo: tipo }, ms = [], i, r;
    if (!fab) return { erro: 'Informe o fabricante.' };
    if (!mod) return { erro: 'Informe o modelo.' };
    if (!TIPOS_RES.some(function (q) { return q[0] === tipo; })) return { erro: 'Informe o tipo da caixa: ' + TIPOS_RES.map(function (q) { return q[0]; }).join(', ') + '.' };
    var vNom = x.volumeNominal === undefined || x.volumeNominal === null || tx(x.volumeNominal) === '' ? null : nu(x.volumeNominal);
    if (vNom !== null && (typeof vNom !== 'number' || !isFinite(vNom) || !(vNom > 0))) return { erro: 'Volume nominal inválido: use um número maior que zero, em metros cúbicos.' };
    if (tipo === 'ret') { var c = medidaRes(x, 'comprimento', false), l = medidaRes(x, 'largura', false); if (c.erro) return c; if (l.erro) return l; if (c.v === null && l.v === null) { if (vNom === null) return { erro: 'Informe o comprimento e a largura, ou o volume nominal.' }; } else if (c.v === null || l.v === null) return { erro: 'Informe o comprimento e a largura juntos.' }; else { it.comprimento = c.v; it.largura = l.v; } }
    else if (tipo === 'cil') { r = medidaRes(x, 'diametro', false); if (r.erro) return r; if (r.v === null) { if (vNom === null) return { erro: 'Informe o diâmetro, ou o volume nominal.' }; } else it.diametro = r.v; }
    else if (tipo === 'tronco') ms = ['diametroBase', 'diametroTopo', 'altura'];
    else if (tipo === 'taca') {
      var cf = tx(x.cubaForma).toLowerCase() || 'cil'; if (cf !== 'cil' && cf !== 'tronco') return { erro: 'Informe a forma da cuba: cil ou tronco.' };
      it.cubaForma = cf; ms = cf === 'tronco' ? ['diametroBase', 'diametroTopo', 'altura'] : ['diametro'];
    } else ms = ['diametro'];
    for (i = 0; i < ms.length; i++) { r = medidaRes(x, ms[i], true); if (r.erro) return r; it[ms[i]] = r.v; }
    if (tipo === 'taca') { r = medidaRes(x, 'diametroColuna', false); if (r.erro) return r; if (r.v !== null) it.diametroColuna = r.v; }
    if (vNom !== null) it.volumeNominal = vNom;
    if ((lib.reservatorios || []).some(function (q) { return chaveRes(q) === chaveRes(it); })) return { erro: 'Já existe um reservatório com este fabricante e modelo.' };
    it.fonte = tx(x.fonte);
    return { item: it };
  }
  /** Guarda as listas da base, uma vez só, antes de qualquer acréscimo. */
  function guardaBase(D) {
    if (D._base) return D._base;
    var pe = {}; Object.keys(D.leq).forEach(function (k) { pe[k] = Object.assign({}, D.leq[k].pecas); });
    D._base = { tubos: D.tubos.slice(), tiposTubo: (D.tiposTubo || []).slice(), C: D.C.slice(), pecas: pe, esguichos: D.esguichos.slice(), divisoes: D.ocupacao.divisoes.slice(), regras: { SP: D.ocupacao.regras.SP.slice(), PR: D.ocupacao.regras.PR.slice() } };
    return D._base;
  }
  /** Confere e normaliza um item. D = base (com guardaBase feito); lib = biblioteca já aceita (para repetição e referência). Devolve {item} ou {erro}. */
  function valida(g, x, D, lib) {
    var B = guardaBase(D), f = tx(x && x.fonte); lib = lib || vazia();
    if (!x || typeof x !== 'object') return { erro: 'Item sem dados.' };
    if (g === 'reservatorios') return validaReservatorio(x, lib);
    if (!f) return { erro: 'Falta a fonte: norma e item, ou catálogo e página.' };
    if (g === 'tubos') {
      var norma = tx(x.norma), classe = tx(x.classe) || 'única', dn = nu(x.dn), di = nu(x.dint), de = nu(x.dext), pa = nu(x.parede), dnsT = D.leq.A.dns || [];
      if (!norma) return { erro: 'Informe a norma ou a linha do tubo.' };
      if (!(dn > 0) || dn !== Math.round(dn)) return { erro: 'Informe o DN como número inteiro, em milímetros.' };
      if (dnsT.length && dnsT.indexOf(dn) < 0) return { erro: 'DN' + dn + ' não tem comprimento equivalente nas tabelas da base (DN ' + dnsT.join(', ') + ').' };
      if (!(di > 0)) return { erro: 'Informe o diâmetro interno, em milímetros.' };
      if (!isNaN(de) && de <= di) return { erro: 'O diâmetro externo precisa ser maior que o interno.' };
      var mesmo = function (t) { return t.norma === norma && t.classe === classe && +t.dn === dn; };
      if (B.tubos.some(mesmo)) return { erro: 'Este tubo já existe na base oficial (' + norma + ', classe ' + classe + ', DN' + dn + ').' };
      if (lib.tubos.some(mesmo)) return { erro: 'Este tubo já está na biblioteca (' + norma + ', classe ' + classe + ', DN' + dn + ').' };
      return { item: { id: 'usr-' + slug(norma) + '-' + slug(classe) + '-' + dn, usuario: true, norma: norma, classe: classe, dn: dn, pol: tx(x.pol), dext: isNaN(de) ? null : de, parede: isNaN(pa) ? null : pa, dint: di, rosca: tx(x.rosca), c_tabela: tx(x.material), fonte: f } };
    }
    if (g === 'tiposTubo') {
      var id = slug(x.id || x.nome), nome = tx(x.nome), mat = tx(x.material), c = nu(x.C), segs = Array.isArray(x.segmentos) && x.segmentos.length ? x.segmentos : [{ norma: x.norma, classe: x.classe, dns: x.dns }];
      if (!id || !nome) return { erro: 'Informe o identificador e o nome comercial do tipo de tubo.' };
      if (!mat) return { erro: 'Informe o material do tubo.' };
      if (!(c >= 60 && c <= 160)) return { erro: 'Informe o fator C de Hazen-Williams, de 60 a 160.' };
      if (B.tiposTubo.some(function (t) { return t.id === id; })) return { erro: 'Já existe um tipo de tubo com este identificador na base oficial.' };
      if (lib.tiposTubo.some(function (t) { return t.id === id; })) return { erro: 'Já existe um tipo de tubo com este identificador na biblioteca.' };
      var todos = B.tubos.concat(lib.tubos), sn = [], falta = '';
      segs.forEach(function (s) {
        var no = tx(s && s.norma), cl = tx(s && s.classe) || 'única', dns = lista(s && s.dns).map(function (d) { return nu(d); });
        if (!no || !dns.length || dns.some(function (d) { return !(d > 0); })) { falta = falta || 'Cada segmento pede a norma, a classe e a lista de DN.'; return; }
        dns.forEach(function (d) { if (!todos.some(function (t) { return t.norma === no && t.classe === cl && +t.dn === d; })) falta = falta || 'Não há tubo ' + no + ', classe ' + cl + ', DN' + d + ' na base nem na biblioteca. Cadastre o tubo antes do tipo.'; });
        sn.push({ norma: no, classe: cl, dns: dns });
      });
      if (falta) return { erro: falta };
      return { item: { id: id, usuario: true, curto: tx(x.curto) || nome.slice(0, 28), nome: nome, material: mat, junta: tx(x.junta) || 'a informar', template: false, segmentos: sn, nota: tx(x.nota), C: c, fonteC: tx(x.fonteC) || f, fonte: f } };
    }
    if (g === 'C') {
      var m = tx(x.material), cc = nu(x.C);
      if (!m) return { erro: 'Informe o material.' };
      if (!(cc >= 60 && cc <= 160)) return { erro: 'Informe o fator C, de 60 a 160.' };
      if (B.C.concat(lib.C).some(function (q) { return q.material.toLowerCase() === m.toLowerCase(); })) return { erro: 'Este material já tem fator C na base ou na biblioteca.' };
      return { item: { usuario: true, material: m, C: cc, fonte: f } };
    }
    if (g === 'pecas') {
      var tb = tx(x.tabela) || 'A', pid = slug(x.id || x.nome).toLowerCase(), pn = tx(x.nome), dnm = {}, T = D.leq[tb], ok = 0, ruim = '';
      if (!T) return { erro: 'Tabela de comprimento equivalente desconhecida: use ' + Object.keys(D.leq).join(' ou ') + '.' };
      if (!pid || !pn) return { erro: 'Informe o identificador e o nome da peça.' };
      if (B.pecas[tb][pid]) return { erro: 'Já existe uma peça com este identificador na tabela ' + tb + ' da base oficial.' };
      if (lib.pecas.some(function (q) { return q.tabela === tb && q.id === pid; })) return { erro: 'Já existe uma peça com este identificador na biblioteca.' };
      var src = x.dn && typeof x.dn === 'object' ? x.dn : {}; if (typeof x.leq === 'string') x.leq.split(';').forEach(function (par) { var q = par.split('='); if (q.length === 2) src[q[0].trim()] = q[1].trim(); });
      Object.keys(src).forEach(function (k) { var d = nu(String(k).replace(/^DN/i, '')), v = nu(src[k]); if (!(d > 0) || !(v > 0)) ruim = 'Comprimento equivalente inválido em "' + k + '": use DN e metros, os dois maiores que zero.'; else { dnm[String(d)] = v; ok++; } });
      if (ruim) return { erro: ruim }; if (!ok) return { erro: 'Informe o comprimento equivalente de pelo menos um DN, em metros.' };
      return { item: { usuario: true, tabela: tb, id: pid, nome: pn, dn: dnm, fonte: f } };
    }
    if (g === 'esguichos') {
      var mo = tx(x.modelo), q = nu(x.Q), pr = nu(x.P), al = nu(x.alcance);
      if (!mo) return { erro: 'Informe o modelo do esguicho.' };
      if (!(q > 0) || !(pr > 0)) return { erro: 'Informe a vazão (L/min) e a pressão (mca) do ponto do catálogo, maiores que zero.' };
      if (!(al > 0)) return { erro: 'Informe o alcance do jato nesse ponto, em metros.' };
      if (B.esguichos.concat(lib.esguichos).some(function (e) { return e.modelo === mo; })) return { erro: 'Este modelo de esguicho já existe na base ou na biblioteca.' };
      return { item: { usuario: true, modelo: mo, Q: q, P: pr, alcance: al, fonte: f } };
    }
    if (g === 'ocupacoes') {
      var no2 = tx(x.norma).toUpperCase(), dv = tx(x.div).toUpperCase(), ds = tx(x.desc), cols = lista(x.colunas).map(tx), N = D.normas[no2];
      if (!N) return { erro: 'Informe a norma da regra: SP ou PR.' };
      if (!/^[A-Z]-\d+$/.test(dv)) return { erro: 'Informe a divisão no formato da tabela de ocupações. Exemplo: J-4' };
      if (!ds) return { erro: 'Informe a descrição da divisão.' };
      if (!cols.length || cols.some(function (c2) { return !N.rti[c2]; })) return { erro: 'Informe a coluna da tabela de reserva: ' + Object.keys(N.rti).join(', ') + '.' };
      if (B.regras[no2].some(function (r) { return r.div === dv; })) return { erro: 'A divisão ' + dv + ' já tem enquadramento na tabela da norma (' + no2 + '). A base oficial não é alterada.' };
      if (lib.ocupacoes.some(function (r) { return r.norma === no2 && r.div === dv; })) return { erro: 'A divisão ' + dv + ' já está na biblioteca para ' + no2 + '.' };
      var cmin = x.cmin === undefined || x.cmin === null || tx(x.cmin) === '' ? null : nu(x.cmin), cmax = x.cmax === undefined || x.cmax === null || tx(x.cmax) === '' ? null : nu(x.cmax);
      if ((cmin !== null && isNaN(cmin)) || (cmax !== null && isNaN(cmax)) || (cmin !== null && cmax !== null && cmax <= cmin)) return { erro: 'Faixa de carga de incêndio inválida (MJ/m²).' };
      return { item: { usuario: true, norma: no2, div: dv, desc: ds, colunas: cols, cmin: cmin, cmax: cmax, fonte: f } };
    }
    return { erro: 'Grupo desconhecido: ' + g + '.' };
  }
  /** Aplica a biblioteca (e os cadastros que vieram no arquivo do projeto) por cima da base, sem mexer nos valores da base. */
  function aplica(D, lib, proj) {
    var B = guardaBase(D), fontes = [lib || vazia(), proj || vazia()], junta = vazia();
    fontes.forEach(function (o) { Object.keys(junta).forEach(function (g) { (o[g] || []).forEach(function (x) { junta[g].push(x); }); }); });
    var chave = JSON.stringify(junta); if (D._cadChave === chave) return D; D._cadChave = chave;
    var vt = {}; D.tubos = B.tubos.slice(); junta.tubos.forEach(function (t) { if (!vt[t.id] && !B.tubos.some(function (b) { return b.id === t.id; })) { vt[t.id] = 1; D.tubos.push(t); } });
    var vi = {}; D.tiposTubo = B.tiposTubo.slice(); junta.tiposTubo.forEach(function (t) { if (!vi[t.id] && !B.tiposTubo.some(function (b) { return b.id === t.id; })) { vi[t.id] = 1; var c = clone(t); c.nome = t.nome + MARCA; c.curto = t.curto + MARCA; D.tiposTubo.push(c); } });
    var vc = {}; D.C = B.C.slice(); junta.C.forEach(function (c) { if (!vc[c.material]) { vc[c.material] = 1; D.C.push(Object.assign({}, c, { material: c.material + MARCA })); } });
    Object.keys(D.leq).forEach(function (k) { D.leq[k].pecas = Object.assign({}, B.pecas[k]); });
    junta.pecas.forEach(function (p) { if (D.leq[p.tabela] && !D.leq[p.tabela].pecas[p.id]) D.leq[p.tabela].pecas[p.id] = { nome: p.nome + MARCA, dn: p.dn, usuario: true, fonte: p.fonte }; });
    var ve = {}; D.esguichos = B.esguichos.slice(); junta.esguichos.forEach(function (e) { if (!ve[e.modelo] && !B.esguichos.some(function (b) { return b.modelo === e.modelo; })) { ve[e.modelo] = 1; D.esguichos.push(e); } });
    D.ocupacao.divisoes = B.divisoes.slice(); D.ocupacao.regras = { SP: B.regras.SP.slice(), PR: B.regras.PR.slice() };
    junta.ocupacoes.forEach(function (o) {
      if (D.ocupacao.regras[o.norma].some(function (r) { return r.div === o.div; })) return;
      D.ocupacao.regras[o.norma].push({ div: o.div, cmin: o.cmin, cmax: o.cmax, colunas: o.colunas, usuario: true, fonte: o.fonte });
      if (!D.ocupacao.divisoes.some(function (d) { return d.div === o.div; })) D.ocupacao.divisoes.push({ div: o.div, desc: o.desc + MARCA, usuario: true });
    });
    return D;
  }
  /** Inclusão em lote. texto = conteúdo do .json (modelo de modeloLote). opc = { leBomba(item), leMangueira(item) } para os dois grupos que usam a leitura da tela.
   *  Devolve { lib (biblioteca nova), bombas[], entraram: [{grupo, nome}], recusados: [{grupo, nome, motivo}], erro }. Nada é gravado aqui. */
  function importa(texto, D, libAtual, opc) {
    opc = opc || {}; var r = { lib: clone(libAtual || vazia()), bombas: [], entraram: [], recusados: [] }, o;
    Object.keys(vazia()).forEach(function (g) { if (!Array.isArray(r.lib[g])) r.lib[g] = []; });
    try { o = JSON.parse(texto); } catch (e) { r.erro = 'O arquivo não é um .json válido: ' + e.message; return r; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) { r.erro = 'O arquivo precisa ter os grupos do modelo (tubos, tiposTubo, C, pecas, esguichos, mangueiras, ocupacoes, bombas, reservatorios).'; return r; }
    var achou = false;
    ORDEM.forEach(function (g) {
      var l = o[g]; if (l === undefined) return; achou = true;
      if (!Array.isArray(l)) { r.recusados.push({ grupo: g, nome: '(grupo inteiro)', motivo: 'O grupo precisa ser uma lista de itens.' }); return; }
      l.forEach(function (x, i) {
        var nm = x && typeof x === 'object' ? tx(x.nome || x.modelo || x.material || x.id || (x.norma && x.dn ? x.norma + ' DN' + x.dn : '') || x.div) || 'item ' + (i + 1) : 'item ' + (i + 1), v;
        if (g === 'reservatorios' && x && typeof x === 'object' && tx(x.fabricante) && tx(x.modelo)) nm = tx(x.fabricante) + ' ' + tx(x.modelo);
        if (x && typeof x === 'object' && x._exemplo) { r.recusados.push({ grupo: g, nome: nm, motivo: 'Exemplo do modelo: apague a linha "_exemplo" para o item valer.' }); return; }
        if (g === 'bombas') { v = opc.leBomba ? opc.leBomba(x, r.bombas) : { erro: 'Inclusão de bomba indisponível aqui.' }; if (v.erro) r.recusados.push({ grupo: g, nome: nm, motivo: v.erro }); else { r.bombas.push(v.bomba); r.entraram.push({ grupo: g, nome: v.bomba.modelo }); } return; }
        if (g === 'mangueiras') { v = opc.leMangueira ? opc.leMangueira(x) : { erro: 'Inclusão de mangueira indisponível aqui.' }; if (v.erro) r.recusados.push({ grupo: g, nome: nm, motivo: v.erro }); else if (r.lib.mangueiras.some(function (q) { return +q.dn === v.dn && (q.modelo || '') === (v.mangueira.modelo || ''); })) r.recusados.push({ grupo: g, nome: nm, motivo: 'Esta mangueira já está na biblioteca.' }); else { r.lib.mangueiras.push(Object.assign({ dn: v.dn, usuario: true }, v.mangueira)); r.entraram.push({ grupo: g, nome: nm }); } return; }
        v = valida(g, x, D, r.lib);
        if (v.erro) r.recusados.push({ grupo: g, nome: nm, motivo: v.erro }); else { r.lib[g].push(v.item); r.entraram.push({ grupo: g, nome: nm }); }
      });
    });
    if (!achou) r.erro = 'Nenhum grupo do modelo foi encontrado no arquivo (tubos, tiposTubo, C, pecas, esguichos, mangueiras, ocupacoes, bombas, reservatorios).';
    return r;
  }
  /** Modelo comentado para a inclusão em lote: um exemplo de cada grupo. Chave começada por "_" é comentário e é ignorada; item com "_exemplo" não entra. */
  function modeloLote(grupos) {
    var m = {
      _leia: ['Modelo da biblioteca do FireCalc. Preencha os grupos que quiser e apague os demais.', 'Toda chave começada por "_" é comentário. Apague a linha "_exemplo" de cada item que for valer; com ela, o item é recusado na importação.', 'Todo item precisa da "fonte": norma e item, ou catálogo e página. Número decimal com ponto (59.4) ou, entre aspas, com vírgula ("59,4").', 'A base oficial não é alterada: item igual a um da base é recusado, e a importação lista o que entrou e o que foi recusado, com o motivo.'],
      tubos: [{ _exemplo: true, _como: 'Uma linha por diâmetro. O DN precisa existir nas tabelas de comprimento equivalente (25 a 150).', norma: 'NBR 15884 (CPVC)', classe: 'única', dn: 65, dext: 73.0, parede: 6.8, dint: 59.4, material: 'CPVC', fonte: 'Catálogo do fabricante, edição e página' }],
      tiposTubo: [{ _exemplo: true, _como: 'Nome comercial que aparece na lista de tubos. Cada segmento aponta para tubos já cadastrados (na base ou acima). C de 60 a 160.', id: 'HID_CPVC_Soldavel', nome: 'CPVC para incêndio, soldável', material: 'CPVC', junta: 'soldável', C: 150, fonteC: 'IT 22, Tabela 1', segmentos: [{ norma: 'NBR 15884 (CPVC)', classe: 'única', dns: [65] }], fonte: 'Catálogo do fabricante, edição e página' }],
      C: [{ _exemplo: true, _como: 'Só consulta: o C que entra no cálculo é o do tipo de tubo.', material: 'Aço inoxidável', C: 140, fonte: 'Catálogo do fabricante, edição e página' }],
      pecas: [{ _exemplo: true, _como: 'Comprimento equivalente em metros, por DN. Tabela A ou B, as mesmas do projeto.', tabela: 'A', id: 'filtro_y', nome: 'Filtro Y', dn: { 65: 8.2, 80: 10.1 }, fonte: 'Catálogo do fabricante, edição e página' }],
      esguichos: [{ _exemplo: true, _como: 'Ponto do catálogo: vazão em L/min na pressão em mca, com o alcance em metros.', modelo: 'Fabricante modelo 1 1/2"', Q: 300, P: 50, alcance: 18, fonte: 'Catálogo do fabricante, edição e página' }],
      mangueiras: [{ _exemplo: true, _como: 'Pelo menos 3 pontos [vazão em L/min, perda em kPa por metro], crescentes.', dn: 40, modelo: 'Fabricante modelo, tipo 2', pts: [[150, 1.0], [200, 1.8], [300, 4.2]], fonte: 'Catálogo do fabricante, edição e página' }],
      ocupacoes: [{ _exemplo: true, _como: 'Só para divisão que a tabela da norma não enquadra. Colunas da tabela de reserva: 1-t1, 1-t2, 2, 3, 4. cmin e cmax em MJ/m²; vazio vale qualquer carga.', norma: 'SP', div: 'M-9', desc: 'Ocupação especial com parecer do Corpo de Bombeiros', colunas: ['2'], cmin: null, cmax: null, fonte: 'Parecer técnico, número e data' }],
      bombas: [{ _exemplo: true, _como: 'Pelo menos 3 pontos [vazão em m³/h, altura em mca], com vazão crescente e altura decrescente. shutoff é a pressão a vazão nula.', fabricante: 'Fabricante', modelo: 'Modelo 7,5 cv', cv: 7.5, rotor: 150, shutoff: 60, hsucMax: 8, jockey: false, pts: [[10, 55], [20, 48], [30, 38]], fonte: 'Catálogo do fabricante, edição e página' }],
      reservatorios: [{ _exemplo: true, _como: 'Medidas internas em metros e volume nominal em m³. Tipo: ret (comprimento e largura), cil, torre ou standpipe (diametro), tronco (diametroBase, diametroTopo e altura) ou taca (cubaForma cil ou tronco, as medidas da cuba e, opcional, diametroColuna). Em ret e cil o volumeNominal pode ficar no lugar das medidas. A fonte é opcional, mas sem ela o item fica marcado.', fabricante: 'Fabricante', modelo: 'Caixa 5000 L', tipo: 'tronco', diametroBase: 2.1, diametroTopo: 2.4, altura: 1.4, volumeNominal: 5, fonte: 'Catálogo do fabricante, edição e página' }]
    };
    if (!grupos) return m;
    var o = { _leia: m._leia }; grupos.forEach(function (g) { if (m[g]) o[g] = m[g]; }); return o;
  }
  /** 2.6.0: nome do arquivo do modelo e prompt pronto para gerar o JSON com uma IA a partir do PDF de um catálogo. escopo = 'bombas' (só o grupo bombas) ou 'lote' (todos os grupos). */
  function arquivoModelo(escopo) { return escopo === 'bombas' ? 'modelo_bombas.firecalc.json' : escopo === 'reservatorios' ? 'modelo_reservatorios.firecalc.json' : 'modelo_biblioteca.firecalc.json'; }
  function promptIA(escopo) {
    if (escopo === 'reservatorios') return ['Transcreva os dados do catálogo anexo (PDF) para o modelo JSON anexo (' + arquivoModelo(escopo) + ').', '', 'Regras:',
      '1. Use somente números impressos no catálogo. Não estime, não interpole e não complete medida que falta. Se um dado não está no catálogo, deixe o item de fora.',
      '2. Preencha só o grupo reservatorios do modelo. Apague os outros grupos.',
      '3. Apague as chaves que começam com "_" (_leia, _como, _exemplo) do arquivo e de cada item.',
      '4. Em todo item, "fonte" é o nome do arquivo do PDF e a página, no formato "Catalogo.pdf, p. 12".',
      '5. Tipo da caixa: ret, cil, tronco, taca, torre ou standpipe, como no modelo. Medidas internas em metros e decimal com ponto. O volumeNominal vai em m³ (litros divididos por 1000).',
      '6. Use a medida interna. Se o catálogo traz só a medida externa, deixe o item de fora.',
      '7. Responda com o JSON num bloco de código. Depois do bloco, liste em poucas linhas o que não achou no catálogo e o que ficou duvidoso, com a página.'].join('\n');
    var so = escopo === 'bombas';
    return ['Transcreva os dados do catálogo anexo (PDF) para o modelo JSON anexo (' + arquivoModelo(escopo) + ').', '', 'Regras:',
      '1. Use somente números impressos no catálogo. Não estime, não interpole e não complete ponto que falta. Se um dado não está no catálogo, deixe o item de fora.',
      so ? '2. Preencha só o grupo bombas do modelo.' : '2. Preencha só os grupos do modelo que o catálogo traz (' + ORDEM.join(', ') + '). Apague os outros grupos do modelo.',
      '3. Apague as chaves que começam com "_" (_leia, _como, _exemplo) do arquivo e de cada item.',
      '4. Em todo item, "fonte" é o nome do arquivo do PDF e a página, no formato "Catalogo.pdf, p. 12".',
      so ? '5. Decimal com ponto. Mantenha as unidades do modelo: vazão em m³/h e altura em mca.' : '5. Decimal com ponto. Mantenha as unidades do modelo: bomba com vazão em m³/h e altura em mca; esguicho com L/min e mca; mangueira com L/min e kPa por metro.',
      '6. Curva de bomba: no mínimo 3 pontos, vazão crescente e altura decrescente; shutoff é a altura a vazão nula.',
      '7. Responda com o JSON num bloco de código. Depois do bloco, liste em poucas linhas o que não achou no catálogo e o que ficou duvidoso, com a página.'].join('\n');
  }
  /** Itens da biblioteca que o projeto usa: vão no arquivo do projeto, para ele abrir em outro computador. */
  function usados(F, lib, D) {
    var u = vazia(), tipos = {}, pecas = {}, esg = {}, tem = false; lib = lib || vazia();
    [F.tipoTubo].concat(F.trechos.map(function (t) { return t.tipo; })).forEach(function (t) { if (t) tipos[t] = 1; });
    F.trechos.forEach(function (t) { Object.keys(t.pecas || {}).forEach(function (k) { pecas[k] = 1; }); });
    /* FC-014: o esguicho em uso é o do projeto (F.lanc.esg, desde a 2.6.0); o modelo guardado em cada hidrante pode ser de uma escolha antiga e não vai junto */
    if (F.lanc && F.lanc.esg) esg[F.lanc.esg] = 1;
    (lib.tiposTubo || []).forEach(function (t) { if (tipos[t.id]) { u.tiposTubo.push(t); t.segmentos.forEach(function (s) { (lib.tubos || []).forEach(function (b) { if (b.norma === s.norma && b.classe === s.classe && s.dns.indexOf(+b.dn) >= 0 && u.tubos.indexOf(b) < 0) u.tubos.push(b); }); }); } });
    (lib.pecas || []).forEach(function (p) { if (p.tabela === F.tabelaLeq && pecas[p.id]) u.pecas.push(p); });
    (lib.esguichos || []).forEach(function (e) { if (esg[e.modelo]) u.esguichos.push(e); });
    (lib.ocupacoes || []).forEach(function (o) { if (o.norma === F.norma && o.div === F.sistema.divisao) u.ocupacoes.push(o); });
    Object.keys(u).forEach(function (g) { if (u[g].length) tem = true; });
    return tem ? clone(u) : null;
  }
  return { ORDEM: ORDEM, NOME: NOME, TIPOS_RES: TIPOS_RES, MARCA: MARCA, vazia: vazia, valida: valida, aplica: aplica, importa: importa, modeloLote: modeloLote, promptIA: promptIA, arquivoModelo: arquivoModelo, usados: usados, guardaBase: guardaBase };
});
