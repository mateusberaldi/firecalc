/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, módulos fora do assistente: Cadastros (consulta com fonte e cadeado, mais a biblioteca pessoal),
 * Configurações (padrões do usuário, que preenchem o projeto novo) e Ajuda (glossário com fonte, como a ferramenta calcula, teste do computador).
 * Também ficam aqui o quadro de pressão em cada hidrante e as peças do modo personalizado (forçar o par, bomba cadastrada à mão).
 * Nada aqui muda o cálculo: as bases do catálogo são só lidas; a bomba cadastrada entra na lista de bombas como na 1.0.0. */
(function () {
  'use strict';
  var U = window.FireUI, D = U.D, M = U.M, E = U.E, V = U.V, S = U.S, esc = U.esc, fmt = U.fmt;
  var CH = { cfg: 'firecalc2_config', bib: 'firecalc2_biblioteca' };
  function guarda(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function le(k, padrao) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? padrao : v; } catch (e) { return padrao; } }
  S.aba = { cadastros: 'tubos', ajuda: 'glossario' }; S.filtro = ''; S.teste = null;

  // ---------------------------------------------------------------- configurações (padrões do usuário)
  var CFG0 = { norma: '', tabelaLeq: '', C: '', tubo: '', tipoTubo: '', saida: '', escritorio: '', cnpj: '', rt: '', registro: '', municipio: '', uf: '' };   /* 2.5.1: tipo de tubo pelo nome comercial e saída do reservatório */
  U.cfg = Object.assign({}, CFG0, le(CH.cfg, {}));
  /** Preenche um projeto com os padrões das Configurações. soVazios = true: só os campos de identificação que estão em branco (projeto já aberto). */
  U.aplicaCfg = function (F, soVazios) {
    var c = U.cfg, n = 0;
    ['escritorio', 'cnpj', 'rt', 'registro', 'municipio', 'uf'].forEach(function (k) { if (c[k] && (!soVazios || !String(F.ident[k] || '').trim())) { if (F.ident[k] !== c[k]) n++; F.ident[k] = c[k]; } });
    if (soVazios) return n;
    if (c.norma && D.normas[c.norma]) F.norma = c.norma;
    if (c.tabelaLeq && D.leq[c.tabelaLeq]) F.tabelaLeq = c.tabelaLeq;
    if (c.C && !isNaN(V.num(c.C)) && V.num(c.C) > 0) F.C = c.C;
    if (c.tubo) { var p = c.tubo.split('|'); if (D.tubos.some(function (t) { return t.norma === p[0] && t.classe === p[1]; })) F.tubo = { norma: p[0], classe: p[1] }; }
    var tpc = c.tipoTubo ? E.tipoTubo(D, c.tipoTubo) : null; if (tpc) { F.tipoTubo = tpc.id; if (!(c.C && !isNaN(V.num(c.C)) && V.num(c.C) > 0)) { F.C = String(tpc.C); F.Cfonte = ''; } E.sincTubo(F, D); }
    if (c.saida && F.fonte && F.fonte.xModo === 'calc') F.fonte.saida = c.saida;
    return n;
  };
  function classesTubo() { var l = []; D.tubos.forEach(function (t) { var k = t.norma + '|' + t.classe; if (l.indexOf(k) < 0) l.push(k); }); return l; }
  function cCampo(k, rot, o) { o = o || {}; return '<label class="cmp' + (o.larga ? ' larga' : '') + '"><span class="rt">' + rot + '</span><input class="campo" id="cfg-' + k + '" data-cfg="' + k + '" value="' + esc(U.cfg[k]) + '"' + (o.ex ? ' placeholder="' + esc(o.ex) + '"' : '') + ' autocomplete="off">' + (o.aj ? '<span class="aj">' + o.aj + '</span>' : '') + '</label>'; }
  function cEscolha(k, rot, ops, aj) { return '<label class="cmp"><span class="rt">' + rot + '</span><select class="campo" id="cfg-' + k + '" data-cfg="' + k + '"><option value="">Sem padrão (escolher em cada projeto)</option>' + ops.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (U.cfg[k] === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' + (aj ? '<span class="aj">' + aj + '</span>' : '') + '</label>'; }
  U.telas.config = function () {
    var cInv = U.cfg.C && (isNaN(V.num(U.cfg.C)) || V.num(U.cfg.C) <= 0);
    return '<div class="cab"><div class="tx"><h1>Configurações</h1></div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Escritório e responsável técnico</h2><div class="form">' +
      cCampo('escritorio', 'Razão social do escritório', { larga: true }) + cCampo('cnpj', 'CNPJ', { ex: '00.000.000/0000-00' }) + cCampo('rt', 'Responsável técnico') + cCampo('registro', 'CREA ou CAU', { ex: 'CREA-PR 000000/D' }) + cCampo('municipio', 'Município habitual das obras') + cCampo('uf', 'Estado', { ex: 'SP' }) + '</div>' +
      '<div class="linha-ac"><button class="bt" data-mod="cfg-aplicar"' + (S.aberto ? '' : ' disabled') + '>Preencher o projeto aberto com estes dados</button>' + (S.aberto ? '' : '<span class="peq">Nenhum projeto aberto.</span>') + '</div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Padrões de projeto</h2><div class="form">' +
      cEscolha('norma', 'Norma', Object.keys(D.normas).map(function (k) { return [k, D.normas[k].nome]; })) +
      cEscolha('tabelaLeq', 'Tabela de comprimento equivalente', Object.keys(D.leq).map(function (k) { return [k, D.leq[k].titulo]; })) +
      cEscolha('tipoTubo', 'Tipo de tubo', (D.tiposTubo || []).map(function (t) { return [t.id, t.nome]; })) +
      cEscolha('saida', 'Saída do reservatório (bomba de incêndio)', [['lateral', 'Saída lateral, junto ao fundo'], ['fundo', 'Saída pelo fundo'], ['cima', 'Tubo que entra por cima']]) +
      cCampo('C', 'Fator C de Hazen-Williams', { ex: '120', aj: cInv ? '<span class="msg-er">Use só número maior que zero. Este padrão não será aplicado.</span>' : '' }) + '</div></div>' +
      '<div class="cartao bloco"><h2 class="t3">Aparência e modo de uso</h2><div class="linha-ac"><span><b>Tema:</b> ' + (S.tema === 'escuro' ? 'escuro' : 'claro') + '</span><button class="bt min" data-acao="tema">' + (S.tema === 'escuro' ? 'Usar o tema claro' : 'Usar o tema escuro') + '</button></div>' +
      '<div class="linha-ac"><span><b>Modo:</b> ' + (S.modo === 'padrao' ? 'padrão' : 'personalizado') + '</span><button class="bt min" data-acao="modo">' + (S.modo === 'padrao' ? 'Usar o modo personalizado' : 'Voltar ao modo padrão') + '</button></div>' +
      '</div>' +
      U.cartaoCopia() +
      '<div class="cartao bloco"><h2 class="t3">Dados guardados neste navegador</h2><p class="peq">Configurações, biblioteca pessoal e a lista de projetos ficam só neste navegador deste computador. Limpar os dados do navegador apaga tudo; o que importa deve estar em arquivo (.json).</p><div class="linha-ac"><button class="bt" data-mod="cfg-limpar">Apagar as configurações</button></div></div>';
  };

  // ---------------------------------------------------------------- biblioteca pessoal (bombas cadastradas à mão)
  U.bib = le(CH.bib, []).filter(function (b) { return b && b.id && b.pts; });
  E.defineBiblioteca(U.bib);
  function salvaBib() { E.defineBiblioteca(U.bib); if (!guarda(CH.bib, U.bib)) U.avisa('Este navegador não deixou guardar a biblioteca. Baixe o arquivo para não perder o cadastro.'); }
  function todasBombas() { return D.bombasBase.concat(S.F.bombasUsuario || [], U.bib); }
  /** Lê o formulário de cadastro de bomba. Mesmas regras da 1.0.0: fonte obrigatória, pelo menos 3 pontos, vazão crescente, altura decrescente. Devolve {erro} ou {bomba}. */
  U.leBomba = function (f) {
    var q = [], h = [], pts = [], pn = function (s) { var v = V.num(s); return isNaN(v) ? null : v; };
    String(f.pts || '').split(/\r?\n/).forEach(function (l) { var p = l.split(';'); if (p.length === 2) { var a = pn(p[0]), c = pn(p[1]); if (a !== null && c !== null) { q.push(a); h.push(c); } } });
    var so = pn(f.so), fab = String(f.fab || '').trim(), mod = String(f.mod || '').trim(), fonte = String(f.fonte || '').trim();
    if (!fab || !mod) return { erro: 'Informe o fabricante e o modelo.' };
    if (!fonte) return { erro: 'Informe a fonte: catálogo e página.' };
    if (so === null || so <= 0) return { erro: 'Informe a pressão a vazão nula, em mca.' };
    if (q.length < 3) return { erro: 'Informe pelo menos 3 pontos da curva, um por linha, no formato "vazão; altura".' };
    if (!q.every(function (x, k) { return x >= 0 && (k === 0 || x > q[k - 1]); })) return { erro: 'A vazão precisa crescer de um ponto para o seguinte.' };
    if (!h.every(function (x, k) { return x > 0 && (k === 0 || x < h[k - 1]); })) return { erro: 'A altura precisa cair quando a vazão cresce.' };
    if (so < h[0] - 1e-9) return { erro: 'A pressão a vazão nula não pode ser menor que a altura do primeiro ponto.' };
    q.forEach(function (x, k) { if (x > 0) pts.push([h[k], x]); });
    if (pts.length < 3) return { erro: 'Informe pelo menos 3 pontos com vazão maior que zero.' };
    var n = 1, id = 'usr-' + n, ids = {}; todasBombas().forEach(function (b) { ids[b.id] = 1; }); while (ids[id]) { n++; id = 'usr-' + n; }
    var rotor = pn(f.rotor);
    return { bomba: { id: id, usuario: true, fabricante: fab, serie: 'cadastrada pelo usuário', modelo: fab + ' ' + mod, pagina: '-', cv: pn(f.cv) || 0, rotor: rotor || 0, rotorTxt: rotor ? String(rotor).replace('.', ',') : '', succaoPol: null, recalquePol: null, polos: null, shutoff: so, hsucMax: pn(f.hs), jockey: !!f.jockey, pts: pts, fonte: fonte } };
  };
  /** Lê o formulário de cadastro de mangueira (caminho B). Mesmas regras da 1.0.0: DN, fonte obrigatória e pelo menos 3 pontos "vazão em L/min; perda em kPa por metro",
   *  com vazão e perda crescentes. A perda é guardada em m/m (kPa/m dividido por 9,80665). Devolve {erro} ou {dn, mangueira: {Q, J, fonte, modelo}}. */
  U.leMangueira = function (f) {
    var q = [], j = [], pn = function (s) { var v = V.num(s); return isNaN(v) ? null : v; };
    String(f.pts || '').split(/\r?\n/).forEach(function (l) { var p = l.split(';'); if (p.length === 2) { var a = pn(p[0]), c = pn(p[1]); if (a !== null && c !== null) { q.push(a); j.push(c / 9.80665); } } });
    var dn = /^\d+$/.test(String(f.dn || '').trim()) ? parseInt(f.dn, 10) : 0, fonte = String(f.fonte || '').trim(), modelo = String(f.modelo || '').trim();
    if (!(dn > 0)) return { erro: 'Informe o diâmetro nominal da mangueira em milímetros (25, 40 ou 65).' };
    if (!fonte) return { erro: 'Informe a fonte: catálogo e página.' };
    if (q.length < 3) return { erro: 'Informe pelo menos 3 pontos da curva, um por linha, no formato "vazão; perda".' };
    if (!q.every(function (x, k) { return x > 0 && j[k] > 0 && (k === 0 || (x > q[k - 1] && j[k] > j[k - 1])); })) return { erro: 'A vazão e a perda precisam ser positivas e crescer de um ponto para o seguinte.' };
    var m = { Q: q, J: j, fonte: fonte }; if (modelo) m.modelo = modelo;
    return { dn: dn, mangueira: m };
  };
  function blocoMangueiras(pers) {
    var mu = S.aberto ? S.F.mangueirasUsuario || {} : {}, ks = Object.keys(mu);
    var h = '<div class="cartao bloco" id="bib-mang"><h2 class="t3">Mangueiras cadastradas no projeto aberto</h2><p class="peq">Curva de perda de carga de mangueira fora da base, para o cálculo pelo esguicho do catálogo. Vale só neste projeto e vai no arquivo dele. Substitui a curva da base para o mesmo diâmetro.</p>';
    if (!S.aberto) return h + '<p class="peq"><b>Nenhum projeto aberto.</b></p></div>';
    h += ks.length ? '<div class="rolar"><table><thead><tr><th>Diâmetro</th><th>Modelo</th><th class="r">Pontos</th><th class="r">Faixa de vazão <small>(L/min)</small></th><th>Fonte</th><th><span class="so-leitor">Ação</span></th></tr></thead><tbody>' + ks.map(function (k) { var m = mu[k]; return '<tr><td class="tec">' + esc(k) + ' mm</td><td>' + esc(m.modelo || '') + '</td><td class="r tec">' + m.Q.length + '</td><td class="r tec">' + fmt(m.Q[0], 0) + ' a ' + fmt(m.Q[m.Q.length - 1], 0) + '</td><td class="peq">' + esc(m.fonte || '') + '</td><td class="r">' + (pers ? '<button class="bt lig min" data-mod="mang-tirar" data-v="' + esc(k) + '">Excluir</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="peq" id="mang-vazia"><b>Nenhuma mangueira cadastrada.</b></p>';
    if (!pers) return h + (ks.length ? '<p class="peq">Para mudar, use o modo personalizado.</p>' : '') + '</div>';
    return h + '<div class="form" style="margin-top:12px"><label class="cmp"><span class="rt">Diâmetro <small>(mm)</small></span><input class="campo" id="nm-dn" placeholder="40" inputmode="numeric" autocomplete="off"></label><label class="cmp"><span class="rt">Modelo</span><input class="campo" id="nm-modelo" autocomplete="off"></label><label class="cmp larga"><span class="rt">Fonte: catálogo e página</span><input class="campo" id="nm-fonte" placeholder="Catálogo do fabricante, edição e página" autocomplete="off"></label>' +
      '<label class="cmp larga"><span class="rt">Pontos da curva, um por linha: vazão em L/min; perda em kPa por metro</span><textarea class="campo" id="nm-pts" rows="5" style="height:auto;padding:8px" placeholder="300; 0,33&#10;600; 1,33&#10;1000; 3,00"></textarea><span class="aj">Vazão e perda crescentes, no mínimo 3 pontos. Dado do catálogo, nunca estimado.</span></label></div><div id="nm-msg" role="alert"></div><div class="linha-ac"><button class="bt pri" data-mod="mang-cadastrar">Cadastrar no projeto</button></div></div>';
  }
  function linhaBomba(b, onde) {
    var qs = b.pts.map(function (p) { return p[1]; });
    return '<tr><td><b>' + esc(b.modelo) + '</b>' + (b.jockey ? ' <span class="peq">bomba de pressurização</span>' : '') + '</td><td class="r tec">' + (b.cv ? fmt(b.cv, b.cv % 1 ? 1 : 0) : '') + '</td><td class="r tec">' + fmt(b.shutoff, 1) + '</td><td class="r tec">' + fmt(Math.min.apply(null, qs), 1) + ' a ' + fmt(Math.max.apply(null, qs), 1) + '</td><td class="r tec">' + (b.hsucMax === null || b.hsucMax === undefined ? '' : fmt(b.hsucMax, 1)) + '</td><td class="peq">' + esc(b.fonte) + '</td><td class="r" style="white-space:nowrap">' +
      (onde === 'proj' ? '<button class="bt min" data-mod="bib-guardar" data-v="' + esc(b.id) + '">Guardar na biblioteca</button>' : (S.aberto && !b.jockey ? '<button class="bt min" data-mod="bib-usar" data-v="' + esc(b.id) + '">Usar no projeto</button> ' : '') + '<button class="bt lig min" data-mod="bib-tirar" data-v="' + esc(b.id) + '">Excluir</button>') + '</td></tr>';
  }
  var CAB_B = '<thead><tr><th>Modelo</th><th class="r">Potência <small>(cv)</small></th><th class="r">Vazão nula <small>(mca)</small></th><th class="r">Faixa de vazão <small>(m³/h)</small></th><th class="r">Sucção máxima <small>(mca)</small></th><th>Fonte</th><th><span class="so-leitor">Ação</span></th></tr></thead>';
  function abaBiblioteca() {
    var pers = S.modo === 'personalizado', doProj = (S.aberto ? S.F.bombasUsuario || [] : []).filter(function (b) { return !U.bib.some(function (x) { return x.id === b.id; }); });
    var h = '<div class="cartao bloco"><div class="cab-ia"><h2 class="t3">Minha biblioteca de bombas</h2><button type="button" class="bt-aj bt-aj-t" id="ia-bombas-abrir" data-cad="ia-bombas" aria-haspopup="dialog" aria-label="Como gerar o JSON de bombas com uma IA">?</button></div><p class="peq">Bombas fora do catálogo da base, cadastradas por você com a fonte. Ficam neste navegador e aparecem na etapa Bomba de qualquer projeto. O arquivo do projeto leva junto a bomba que ele usa.</p>' +
      (U.bib.length ? '<div class="rolar"><table>' + CAB_B + '<tbody>' + U.bib.map(function (b) { return linhaBomba(b, 'bib'); }).join('') + '</tbody></table></div>' : '<p class="peq" id="bib-vazia"><b>Nenhuma bomba cadastrada.</b></p>') +
      '<div class="linha-ac"><button class="bt" data-mod="bib-baixar"' + (U.bib.length ? '' : ' disabled') + '>Baixar a biblioteca (.json)</button><button class="bt" data-mod="bib-abrir">Trazer de um arquivo</button><input type="file" id="bib-arq" accept=".json,application/json" hidden></div></div>';
    if (doProj.length) h += '<div class="cartao bloco"><h2 class="t3">Bombas cadastradas no projeto aberto</h2><p class="peq">Vieram no arquivo do projeto. Valem só nele, até você guardar na biblioteca.</p><div class="rolar"><table>' + CAB_B + '<tbody>' + doProj.map(function (b) { return linhaBomba(b, 'proj'); }).join('') + '</tbody></table></div></div>';
    h += '<div class="cartao bloco"><h2 class="t3">Cadastrar bomba</h2>';
    if (!pers) return h + U.aviso('in', 'O cadastro de bomba ou de mangueira fora do catálogo faz parte do modo personalizado. <button class="bt lig min" data-acao="modo">Usar o modo personalizado</button>') + '</div>' + blocoMangueiras(false);
    var c = function (k, rot, ex, larga) { return '<label class="cmp' + (larga ? ' larga' : '') + '"><span class="rt">' + rot + '</span><input class="campo" id="nb-' + k + '"' + (ex ? ' placeholder="' + esc(ex) + '"' : '') + ' autocomplete="off"></label>'; };
    return h + '<p class="peq">Dados do catálogo do fabricante, nunca estimados. A fonte (catálogo e página) é obrigatória e aparece ao lado da bomba em todas as telas.</p><div class="form">' +
      c('fab', 'Fabricante') + c('mod', 'Modelo') + c('cv', 'Potência <small>(cv)</small>', '7,5') + c('rotor', 'Rotor <small>(mm)</small>', '150') + c('so', 'Pressão a vazão nula <small>(mca)</small>', '60') + c('hs', 'Altura máxima de sucção <small>(mca)</small>', '8') + c('fonte', 'Fonte: catálogo e página', 'Catálogo do fabricante, edição e página', true) +
      '<label class="cmp larga"><span class="rt">Pontos da curva, um por linha: vazão em m³/h; altura em mca</span><textarea class="campo" id="nb-pts" rows="6" style="height:auto;padding:8px" placeholder="10; 55&#10;20; 48&#10;30; 38"></textarea><span class="aj">Vazão crescente e altura decrescente, no mínimo 3 pontos.</span></label></div>' +
      '<label class="marcar"><input type="checkbox" id="nb-jockey"><span>É bomba de pressurização (jockey).</span></label><div id="nb-msg" role="alert"></div><div class="linha-ac"><button class="bt pri" data-mod="bib-cadastrar">Cadastrar na biblioteca</button></div></div>' + blocoMangueiras(true);
  }

  // ---------------------------------------------------------------- cadastros (consulta)
  var ABAS_C = [['tubos', 'Tubos'], ['pecas', 'Peças e fator C'], ['hid', 'Esguichos e mangueiras'], ['bombas', 'Bombas'], ['ocup', 'Ocupações e tipos'], ['amb', 'Atmosfera e vapor'], ['bib', 'Minha biblioteca']];
  function abas(mod, lista) { return '<div class="abas" role="tablist" aria-label="Seções">' + lista.map(function (a) { return '<button role="tab" class="aba" id="aba-' + mod + '-' + a[0] + '" data-aba="' + mod + ':' + a[0] + '" aria-selected="' + (S.aba[mod] === a[0]) + '" tabindex="' + (S.aba[mod] === a[0] ? 0 : -1) + '">' + a[1] + '</button>'; }).join('') + '</div>'; }
  function tab(cab, linhas, id) { return '<div class="rolar"' + (id ? ' id="' + id + '"' : '') + ' tabindex="0" role="region" aria-label="Tabela da base, só consulta"><table><thead><tr>' + cab.map(function (c) { return '<th' + (c[1] ? ' class="r"' : '') + '>' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + linhas.join('') + '</tbody></table></div>'; }
  function tr(cs) { return '<tr>' + cs.map(function (c) { return Array.isArray(c) ? '<td class="r tec">' + c[0] + '</td>' : '<td>' + c + '</td>'; }).join('') + '</tr>'; }
  function arquivos(l) { var v = []; l.forEach(function (x) { var a = String(x || '').split(', p')[0]; if (a && v.indexOf(a) < 0) v.push(a); }); return v.join('; '); }
  function travado(titulo, fonte, corpo) { return '<div class="cartao bloco"><div class="gt-cad"><h2 class="t3">' + titulo + '</h2><span class="pilula p-in" title="Base travada: só consulta">' + U.IC.cad + 'só consulta</span></div><p class="peq">Fonte: ' + esc(fonte) + '</p>' + corpo.replace('aria-label="Tabela da base, só consulta"', 'aria-label="Tabela só de consulta: ' + String(titulo).replace(/<[^>]*>/g, '').replace(/"/g, '') + '"') + '</div>'; }
  function nf(v, c) { return v === null || v === undefined ? '' : fmt(v, c); }
  function linhasBombas() {
    var q = S.filtro.toLowerCase().trim();
    return D.bombasBase.filter(function (b) { return !q || (b.modelo + ' ' + b.serie).toLowerCase().indexOf(q) >= 0; }).map(function (b) {
      var qs = b.pts.map(function (p) { return p[1]; });
      return tr(['<b>' + esc(b.modelo) + '</b>' + (b.rotorTxt ? ' <span class="peq">rotor ' + esc(b.rotorTxt) + ' mm</span>' : ''), esc(b.serie), [nf(b.cv, b.cv % 1 ? 1 : 0)], [nf(b.shutoff, 0)], [fmt(Math.min.apply(null, qs), 1) + ' a ' + fmt(Math.max.apply(null, qs), 1)], [nf(b.hsucMax, 0)], [b.npsh ? 'curva' : ''], '<span class="peq">' + esc(b.fonte) + '</span>']);
    });
  }
  U.telas.cadastros = function () {
    var a = S.aba.cadastros, h = '<div class="cab"><div class="tx"><h1>Cadastros</h1></div></div>' + abas('cadastros', ABAS_C) + '<div role="tabpanel" aria-labelledby="aba-cadastros-' + a + '">';
    if (a === 'tubos') {
      var grupos = {}; D.tubos.forEach(function (t) { var k = t.norma + ', classe ' + t.classe; (grupos[k] = grupos[k] || []).push(t); });
      Object.keys(grupos).forEach(function (k) { var g = grupos[k], fts = []; g.forEach(function (t) { if (fts.indexOf(t.fonte) < 0) fts.push(t.fonte); }); h += travado('Tubos ' + esc(k), fts.join('; '), tab([['DN'], ['Polegada'], ['Externo (mm)', 1], ['Parede (mm)', 1], ['Interno (mm)', 1], ['Rosca']], g.map(function (t) { return tr(['DN' + t.dn, esc(t.pol || ''), [nf(t.dext, 1)], [nf(t.parede, 2)], [nf(t.dint, 1)], esc(t.rosca || '')]); }))); });
    } else if (a === 'pecas') {
      Object.keys(D.leq).forEach(function (k) { var T = D.leq[k]; h += travado('Comprimento equivalente, tabela ' + esc(T.titulo), T.fonte, '<p class="peq">Metros de tubo reto que dão a mesma perda de carga de cada peça.</p>' + tab([['Peça']].concat(T.dns.map(function (d) { return ['DN' + d, 1]; })), Object.keys(T.pecas).map(function (id) { var p = T.pecas[id]; return tr([esc(p.nome)].concat(T.dns.map(function (d) { return [nf(p.dn[String(d)], 1)]; }))); }))); });
      h += travado('Fator C de Hazen-Williams', 'IT 22, Tabela 1', tab([['Material'], ['C', 1], ['Fonte']], D.C.map(function (c) { return tr([esc(c.material), [c.C], '<span class="peq">' + esc(c.fonte) + '</span>']); })));
    } else if (a === 'hid') {
      h += travado('Esguichos reguláveis', arquivos(D.esguichos.map(function (e) { return e.fonte; })), tab([['Modelo'], ['Vazão (L/min)', 1], ['Pressão (mca)', 1], ['Alcance (m)', 1], ['Fonte']], D.esguichos.map(function (e) { return tr([esc(e.modelo), [nf(e.Q, 0)], [nf(e.P, 0)], [nf(e.alcance, 1)], '<span class="peq">' + esc(e.fonte) + '</span>']); })));
      var EP = D.esguichoPonta || {};
      if (Object.keys(EP).length) h += travado('Pressão na ponta do esguicho', arquivos(Object.keys(EP).map(function (m) { return EP[m].fonte; })), tab([['Modelo'], ['Ponta / entrada', 1], ['Ponto do catálogo'], ['Fonte']], Object.keys(EP).map(function (m) { var e = EP[m]; return tr([esc(m), [nf(e.razao, 2)], (e.pontos || []).map(function (p) { return nf(p.Q, 0) + ' L/min a ' + nf(p.P, 0) + ' mca'; }).join('; '), '<span class="peq">' + esc(e.fonte) + '</span>']); })));
      [D.mangueira, D.mangueira65].forEach(function (m) { if (!m) return; var L = m.leitura_kpa_m; h += travado('Mangueira ' + esc(m.modelo), m.fonte, tab([['Vazão (L/min)', 1], ['Perda (kPa/m)', 1]], L.Q.map(function (q, i) { return tr([[nf(q, 0)], [nf(L.kPa_m[i], 3)]]); }))); });
    } else if (a === 'bombas') {
      h += travado('Bombas de incêndio e de pressurização (' + D.bombasBase.length + ')', arquivos(D.bombasBase.map(function (b) { return b.fonte; })),
        '<label class="cmp" style="max-width:360px;margin:8px 0"><span class="rt">Filtrar por modelo ou série</span><input class="campo" id="cad-filtro" value="' + esc(S.filtro) + '" placeholder="BPI-21" autocomplete="off"></label>' +
        tab([['Modelo'], ['Série'], ['Potência (cv)', 1], ['Vazão nula (mca)', 1], ['Faixa de vazão (m³/h)', 1], ['Sucção máxima (mca)', 1], ['NPSH requerido', 1], ['Fonte']], linhasBombas(), 'cad-bombas'));
    } else if (a === 'ocup') {
      Object.keys(D.normas).forEach(function (k) { var N = D.normas[k]; h += travado('Tipos de sistema, ' + esc(N.nome), N.fonte, tab([['Tipo'], ['Esguicho (mm)', 1], ['Mangueira (mm)', 1], ['Expedições', 1], ['Vazão (L/min)', 1], ['Pressão (mca)', 1]], N.tipos.map(function (t) { return tr([esc(t.id), [t.esguicho], [t.mangueira], [t.exp], [nf(t.Q, 0)], [nf(t.P, 0)]]); }))); });
      h += travado('Divisões de ocupação', D.ocupacao.fonte.SP + '. Paraná: ' + D.ocupacao.fonte.PR, tab([['Divisão'], ['Descrição']], D.ocupacao.divisoes.map(function (d) { return tr(['<b>' + esc(d.div) + '</b>', esc(d.desc)]); })));
    } else if (a === 'amb') {
      h += travado('Pressão atmosférica pela altitude', D.ambiente.atm.fonte, tab([['Altitude (m)', 1], ['Pressão (mca)', 1]], D.ambiente.atm.alt.map(function (x, i) { return tr([[nf(x, 0)], [nf(D.ambiente.atm.mca[i], 2)]]); })));
      h += travado('Pressão de vapor da água pela temperatura', D.ambiente.vapor.fonte, tab([['Temperatura (°C)', 1], ['Pressão de vapor (mca)', 1]], D.ambiente.vapor.T.map(function (x, i) { return tr([[nf(x, 0)], [nf(D.ambiente.vapor.mca[i], 3)]]); })));
    } else h += U.abaCadastrosUsuario() + abaBiblioteca();
    return h + '</div>';
  };

  // ---------------------------------------------------------------- ajuda
  var ABAS_A = [['glossario', 'Glossário'], ['calculo', 'Como a ferramenta calcula'], ['teste', 'Testar meu computador']];
  var CALC = [
    ['1. Tipo de sistema, vazão e pressão', 'A divisão de ocupação e a área levam à coluna da tabela de enquadramento; a coluna dá o tipo de sistema e a reserva de incêndio. O tipo dá a vazão e a pressão mínimas na válvula, o esguicho e a mangueira.', 'IT 22, Tabelas 2 e 3; NPT 022, Tabelas 1 e 2'],
    ['2. Perda de carga nos tubos', 'Fórmula de Hazen-Williams na forma da norma: J = 605 x Q^1,85 x C^-1,85 x D^-4,87 x 10^4, com J em m/m, Q em L/min e D (diâmetro interno) em mm. A perda de cada trecho é J vezes o comprimento total: tubo mais o comprimento equivalente das peças.', 'IT 22, 4.8.10.2; Azevedo Netto, Manual de Hidráulica, Tabela 7.6 (comprimentos equivalentes)'],
    ['3. Pressão e vazão em cada hidrante', 'Os dados do esguicho e da mangueira (vazão por jato, pressão mínima, mangueira e alcance) vêm da tabela oficial do tipo e podem ser alterados na etapa Hidrantes; o valor alterado fica marcado e vai para o relatório, com a fonte. São Paulo: a pressão é contada na válvula e a vazão segue Q = K x raiz de P, com o K da vazão e da pressão adotadas; a etapa Hidrantes mostra também o que chega ao esguicho (pressão, vazão e alcance). Paraná: a vazão sai do esguicho e a pressão mínima vale na ponta do esguicho. A pressão de entrada mínima é a maior entre a que a curva do fabricante pede para a vazão e a que deixa a pressão mínima na ponta (quando a base tem a leitura da ponta); a pressão na válvula é a de entrada mais a perda na mangueira. Você pode informar uma pressão de projeto maior na entrada do esguicho. O alcance não muda o ponto de projeto: é conferido na etapa Verificações.', 'IT 22, 4.6.1.2, 4.8.9 e Tabela 2; NPT 022, 5.7.1, 5.7.8, 5.7.8.1 e Tabela 1, notas 3 e 4'],
    ['4. Hipótese de cálculo: os dois jatos mais desfavoráveis', 'A ferramenta monta todos os pares de hidrantes, calcula cada um com os dois jatos abertos e fica com o par que pede a maior altura manométrica. No nó onde o par se divide, as vazões dos dois ramais são ajustadas até a pressão ser a mesma pelos dois caminhos. Com um só hidrante simples em SP, um jato (leitura da ferramenta a partir do 4.8.3). Hidrante duplo: as duas expedições.', 'IT 22, 4.8.3, 4.8.3.1, 4.8.4 e 4.8.14'],
    ['5. Altura manométrica', 'Pressão na descarga da bomba = pressão no nó do par + perda no trecho comum + desnível até a bomba. Altura manométrica = pressão na descarga menos a carga disponível na sucção (desnível do nível X até a bomba, menos a perda na sucção). O nível X é o nível da água quando só resta a reserva de incêndio.', 'Azevedo Netto, Manual de Hidráulica'],
    ['6. Bomba e ponto de trabalho', 'A curva da bomba é a tabela do catálogo, com interpolação linear entre os pontos. A bomba atende quando entrega, na vazão de projeto, altura igual ou maior que a altura manométrica. O ponto de trabalho é o encontro da curva da bomba com a curva do sistema. A pressão estática usa a pressão a vazão nula e o reservatório cheio, com o limite de 100 mca na válvula.', 'IT 22, 4.8.8, C.1.13 e C.1.14'],
    ['7. NPSH (só com a bomba acima do nível da água)', 'NPSH disponível = pressão atmosférica pela altitude, menos a pressão de vapor pela temperatura, menos a altura da bomba acima do nível X, menos a perda na sucção. Calculado na vazão de projeto (1,0 Q) e a 1,5 vez ela (perda na sucção em cada vazão). O requerido da bomba escolhida, que você lê no catálogo, é comparado com o disponível que você escolher no cartão da bomba (1,0 Q ou 1,5 Q). Se cavita na vazão de projeto, compare a 1,5 Q e escolha uma bomba que entregue a altura manométrica nessa vazão.', 'IT 22, 4.8.15; Azevedo Netto, Tabela 11-1 e Quadro 1.7'],
    ['8. Reserva, velocidade e recalque', 'A reserva efetiva é comparada com a da tabela e gera a duração com a vazão de projeto. A velocidade é conferida em cada trecho e na sucção. O recalque recebe água da viatura do Corpo de Bombeiros e não é dimensionado: a ferramenta só registra o dispositivo (tipo, cota, diâmetro e comprimento do tubo).', 'IT 22, Tabela 3, 4.8.11, 4.8.12 e 4.3'],
    ['9. Ramal de retorno para testes (Paraná)', 'Encontro da curva da bomba com a curva do ramal, com o registro todo aberto. A ferramenta informa a perda que o registro de regulagem precisa dar para a vazão nominal; a faixa de 75% a 125% da nominal é a referência do ensaio. Só reprova quando o ramal todo aberto não chega a 75%.', 'NPT 022, 5.10.6.3 e 5.7.2.1'],
    ['10. Válvula redutora de pressão', 'Usada no ponto em que a pressão passa de 100 mca, o limite da norma (IT 22, 4.8.8; no Paraná, NPT 022, 5.7.7). A norma não descreve o dispositivo; o Brentano (capítulo 15) indica dispositivos redutores quando o limite é excedido. Critério da ferramenta: você declara a pressão de saída regulada, com a fonte do catálogo, e ela vale como pressão estática e dinâmica daquele ponto quando é menor que a pressão que chega. A ferramenta reprova regulagem abaixo da pressão mínima do tipo de sistema, regulagem acima de 100 mca e válvula redutora em hidrante do par de cálculo. Vazão, par e altura manométrica não mudam.', 'IT 22, 4.8.8; Brentano, capítulo 15; a regulagem declarada é critério da ferramenta'],
  ];
  function abaTeste() {
    var t = S.teste, h = '<div class="cartao bloco"><h2 class="t3">Testar meu computador</h2>' +
      '<div class="linha-ac"><button class="bt pri" data-mod="teste-rodar"' + (t && t.pendente ? ' disabled' : '') + '>' + (t ? 'Rodar de novo' : 'Rodar as conferências') + '</button></div>';
    if (!t) return h + '</div>';
    h += '<div id="teste-res" role="status" style="margin-top:12px">' + (t.pendente ? U.aviso('in', 'Gerando a planilha de teste na memória...') : t.falha ? U.aviso('er', '<b>' + (t.ok + t.falha) + ' conferidas, ' + t.falha + (t.falha > 1 ? ' falhas' : ' falha') + '.</b> Não use este arquivo para projeto: baixe o FireCalc de novo e repita o teste. Se a falha continuar, mande a lista abaixo ao suporte.') : U.aviso('in', '<b>' + (t.ok + t.falha) + ' conferidas, 0 falhas.</b> Este navegador calcula igual ao gabarito.')) + '</div>';
    var ruins = t.linhas.filter(function (l) { return !l.ok; }), lin = function (l) { return '<tr><td>' + esc(l.nome) + '</td><td class="r tec">' + (l.obt === null ? '' : fmt(l.obt, 3)) + '</td><td class="r tec">' + (l.esp === null ? '' : fmt(l.esp, 3)) + '</td><td class="r tec">' + (l.tol === null ? '' : String(l.tol).replace('.', ',')) + '</td><td>' + U.pilula(l.ok ? 'ok' : 'er', l.ok ? 'Confere' : 'Não confere') + '</td></tr>'; };
    var cab = '<thead><tr><th>Conferência</th><th class="r">Obtido</th><th class="r">Esperado</th><th class="r">Tolerância</th><th>Situação</th></tr></thead>';
    if (ruins.length) h += '<div class="rolar" style="margin-top:12px"><table>' + cab + '<tbody>' + ruins.map(lin).join('') + '</tbody></table></div>';
    return h + '<details style="margin-top:12px"><summary class="peq" style="cursor:pointer">Ver as ' + t.linhas.length + ' conferências</summary><div class="rolar"><table>' + cab + '<tbody>' + t.linhas.map(lin).join('') + '</tbody></table></div></details></div>';
  }
  U.telas.ajuda = function () {
    var a = S.aba.ajuda, h = '<div class="cab"><div class="tx"><h1>Ajuda</h1></div></div>' + abas('ajuda', ABAS_A) + '<div role="tabpanel" aria-labelledby="aba-ajuda-' + a + '">';
    if (a === 'glossario') h += '<div class="cartao bloco"><h2 class="t3">Glossário</h2><dl class="gloss">' + U.GLOSS.slice().sort(function (x, y) { return x[0].localeCompare(y[0], 'pt-BR'); }).map(function (g) { var p = g[1].split(/\s*Fonte(?: da convenção)?:\s*/); return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(p[0]) + (p[1] ? ' <span class="peq">Fonte: ' + esc(p[1]) + '</span>' : '') + '</dd>'; }).join('') + '</dl></div>';
    else if (a === 'calculo') h += '<div class="cartao bloco"><h2 class="t3">Como a ferramenta calcula</h2>' + CALC.map(function (c) { return '<div class="passo-calc"><h3>' + esc(c[0]) + '</h3><p>' + esc(c[1]) + '</p><p class="peq">Fonte: ' + esc(c[2]) + '</p></div>'; }).join('') +
      '</div>';
    else h += abaTeste();
    return h + '</div>';
  };

  // ---------------------------------------------------------------- quadro de pressão em cada hidrante (etapa Hidrantes)
  /* 2.6.0: nome, pressão dinâmica, estática e o limite do estado; o clique na linha (ou no nome) mostra a curva daquele hidrante.
   * O botão da válvula redutora fica no cabeçalho deste cartão e abre o menu sobreposto. */
  U.quadroPressoes = function () {
    var sit = S.sit, cab = '<div class="cartao bloco" id="quadro-pressoes"><div class="cab-pres"><h2 class="t3" id="qp-tit">Pressão em cada hidrante</h2><button type="button" class="bt lig min red-bt" id="red-abrir" data-hi="red" aria-haspopup="dialog" aria-label="Válvula redutora de pressão' + (U.nRedutoras() ? ', ' + U.nRedutoras() + ' no projeto' : '') + '">' + FireSVG.redutora() + 'V. redutora' + (U.nRedutoras() ? ' (' + U.nRedutoras() + ')' : '') + '</button></div>';
    if (sit.k !== 'ok' || !sit.R.par || !sit.R.ctx) return U.nRedutoras() ? cab + '<dl class="hi-l"><div><dt>Pressões</dt><dd>a calcular</dd></div></dl></div>' : '';   /* o botão continua ao alcance enquanto falta a regulagem */
    var lp = M.pressoesHidrantes(sit.R.ctx, sit.R.par), n = sit.R.numeros, pmax = U.norma().pmax, atual = lp.some(function (x) { return x.id === S.hidCurva; }) ? S.hidCurva : sit.R.par.crit.hid.id;
    var h = cab +
      '<div class="rolar" role="region" tabindex="0" aria-labelledby="qp-tit"><table class="tab-res tab-pres"><thead><tr><th scope="col">Hidrante</th><th scope="col" class="r">Dinâmica <small>(mca)</small></th><th scope="col" class="r">Estática <small>(mca)</small></th><th scope="col">Limite de ' + fmt(pmax, 0) + ' mca</th></tr></thead><tbody>';
    lp.forEach(function (x) {
      var acima = x.din > pmax || (x.est !== null && x.est > pmax), sel = x.id === atual;
      h += '<tr data-h="' + esc(x.id) + '"' + (sel ? ' class="sel"' : '') + '><th scope="row"><button type="button" class="bt lig min" data-hi="curva" data-h="' + esc(x.id) + '" aria-pressed="' + sel + '" aria-label="Mostrar a curva do hidrante ' + esc(x.id) + '">' + esc(x.id) + '</button>' + (x.redutora !== undefined ? ' ' + U.pilula('in', 'redutora a ' + fmt(x.redutora, 1) + ' mca') : '') + '</th>' +
        '<td class="r">' + fmt(x.din, 2) + '</td><td class="r">' + (x.est === null ? (x.semBomba ? 'a calcular' : 'sem dado') : fmt(x.est, 2)) + '</td><td>' + (acima ? U.pilula('er', 'Acima') : x.est === null ? U.pilula('in', 'a calcular') : U.pilula('ok', 'Dentro')) + '</td></tr>';
    });
    return h + '</tbody></table></div>' + (lp.some(function (x) { return x.est === null; }) ? '<p class="peq">' + (lp.some(function (x) { return x.semBomba; }) ? 'A estática aparece quando a bomba for escolhida na etapa Bomba e automação.' : 'A estática aparece quando a cota do reservatório cheio estiver preenchida na etapa Abastecimento.') + '</p>' : '') + '</div>';
  };

  // ---------------------------------------------------------------- modo personalizado: par usado no cálculo (etapa Hidrantes)
  U.parForcado = function () {
    var sit = S.sit, F = S.F;
    if (S.modo !== 'personalizado') return F.parForcado ? U.aviso('al', 'Este projeto usa um par de hidrantes escolhido à mão (' + esc(F.parForcado) + '), e não o mais desfavorável. Para trocar, use o modo personalizado.') : '';
    if (sit.k !== 'ok' || !sit.R.pares || sit.R.pares.length < 2) return F.parForcado ? U.aviso('al', 'Par escolhido à mão: ' + esc(F.parForcado) + '. <button class="bt lig min" data-mod="par-auto">Voltar ao par mais desfavorável</button>') : '';
    var n = sit.R.numeros, ops = sit.R.pares.slice().sort(function (a, b) { return b.AMT - a.AMT; }).map(function (p) { return [p.par, p.par + ': ' + fmt(p.AMT, 2) + ' mca, ' + fmt(p.Qt, 1) + ' L/min' + (p.par === n.parMaisDesfavoravel ? ' (o mais desfavorável)' : '')]; });
    return '<div class="cartao bloco" id="par-forcado"><h2 class="t3">Par usado no cálculo <span class="pilula p-al">modo personalizado</span></h2><p class="peq">A norma pede o par mais desfavorável (IT 22, 4.8.3 e 4.8.4). Escolher outro par serve só para estudo: a verificação da hipótese passa a pedir conferência e o resultado deixa de ser o da norma.</p><div class="form">' +
      U.escolha('parForcado', 'Par de hidrantes', ops, { vazio: 'O mais desfavorável (' + n.parMaisDesfavoravel + '), como a norma pede', larga: true }) + '</div></div>';
  };

  // ---------------------------------------------------------------- eventos destes módulos
  function redesenha() { U.desenhar(); }
  U._bib = { salva: salvaBib, todas: todasBombas, guarda: guarda, le: le, CFG0: CFG0, CH: CH };   /* 2.5.1: usados pela tela dos cadastros editáveis */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-aba]');
    if (a) { var p = a.dataset.aba.split(':'); S.aba[p[0]] = p[1]; redesenha(); var el = document.getElementById('aba-' + p[0] + '-' + p[1]); if (el) el.focus(); return; }
    var t = ev.target.closest('[data-mod]'); if (!t || t.disabled) return; var m = t.dataset.mod, v = t.dataset.v;
    if (m === 'cfg-aplicar') { var n = U.aplicaCfg(S.F, true); if (n) U.mudou(); U.avisa(n ? n + ' campo(s) da etapa Identificação preenchido(s).' : 'Nada a preencher: os campos da Identificação já têm valor ou as Configurações estão em branco.'); }
    else if (m === 'cfg-limpar') { U.cfg = Object.assign({}, CFG0); guarda(CH.cfg, U.cfg); redesenha(); U.avisa('Configurações apagadas.'); }
    else if (m === 'teste-rodar') {
      if (typeof FireAutoteste === 'undefined') { U.avisa('O teste não foi embutido neste arquivo.'); return; }
      var bb = D.bombas; S.teste = FireAutoteste.autoteste(); D.bombas = bb; redesenha();
      FireAutoteste.autotesteXlsx(S.teste).then(function () { U.recalc(); if (S.tela === 'ajuda') redesenha(); });
    }
    else if (m === 'bib-cadastrar') {
      var g = function (k) { var e = document.getElementById('nb-' + k); return e ? e.value : ''; };
      var r = U.leBomba({ fab: g('fab'), mod: g('mod'), cv: g('cv'), rotor: g('rotor'), so: g('so'), hs: g('hs'), fonte: g('fonte'), pts: g('pts'), jockey: document.getElementById('nb-jockey').checked });
      if (r.erro) { document.getElementById('nb-msg').innerHTML = '<div class="msg-er" style="margin-top:10px">' + esc(r.erro) + '</div>'; return; }
      U.bib.push(r.bomba); salvaBib(); redesenha(); U.avisa('Bomba cadastrada na biblioteca: ' + r.bomba.modelo + '.');
    }
    else if (m === 'mang-cadastrar') {
      var gm = function (k) { var e = document.getElementById('nm-' + k); return e ? e.value : ''; }, rm = U.leMangueira({ dn: gm('dn'), modelo: gm('modelo'), fonte: gm('fonte'), pts: gm('pts') });
      if (rm.erro) { document.getElementById('nm-msg').innerHTML = '<div class="msg-er" style="margin-top:10px">' + esc(rm.erro) + '</div>'; return; }
      S.F.mangueirasUsuario = S.F.mangueirasUsuario || {}; S.F.mangueirasUsuario[String(rm.dn)] = rm.mangueira; U.mudou(); U.avisa('Mangueira de ' + rm.dn + ' mm cadastrada no projeto aberto.');
    }
    else if (m === 'mang-tirar') { if (S.F.mangueirasUsuario) delete S.F.mangueirasUsuario[v]; U.mudou(); }
    else if (m === 'bib-tirar') {
      var usada = S.aberto && (S.F.bomba.id === v || S.F.jockey.id === v);
      if (usada && !(S.F.bombasUsuario || []).some(function (b) { return b.id === v; })) { S.F.bombasUsuario = (S.F.bombasUsuario || []).concat(U.bib.filter(function (b) { return b.id === v; })); }
      U.bib = U.bib.filter(function (b) { return b.id !== v; }); salvaBib(); if (usada) U.mudou(); else redesenha();
      U.avisa(usada ? 'Bomba excluída da biblioteca. O projeto aberto continua com ela.' : 'Bomba excluída da biblioteca.');
    }
    else if (m === 'bib-guardar') { var b = (S.F.bombasUsuario || []).filter(function (x) { return x.id === v; })[0]; if (b) { U.bib.push(E.clone(b)); salvaBib(); redesenha(); U.avisa('Bomba guardada na biblioteca.'); } }
    else if (m === 'bib-usar') { S.F.bomba.id = v; U.mudou(); U.avisa('Bomba escolhida no projeto aberto. Confira na etapa Bomba e automação.'); }
    else if (m === 'bib-baixar') U.baixa('minhas_bombas.firecalc.json', new Blob([JSON.stringify({ bombasUsuario: U.bib }, null, 1)], { type: 'application/json' }));
    else if (m === 'bib-abrir') document.getElementById('bib-arq').click();
    else if (m === 'par-auto') { S.F.parForcado = ''; U.mudou(); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'bib-arq' && t.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result), l = (o.bombasUsuario || []).filter(function (b) { return b && b.id && b.pts && b.pts.length >= 3 && b.fonte; }), n = 0;
          l.forEach(function (b) { if (!todasBombas().some(function (x) { return x.id === b.id; })) { b.usuario = true; U.bib.push(b); n++; } });
          salvaBib(); redesenha(); U.avisa(n ? n + ' bomba(s) trazida(s) para a biblioteca.' : 'Nenhuma bomba nova no arquivo.');
        } catch (e) { U.avisa('Arquivo inválido: não é uma biblioteca de bombas do FireCalc.'); }
      };
      r.readAsText(t.files[0]); t.value = ''; return;
    }
    if (t.dataset && t.dataset.cfg && t.tagName === 'SELECT') { U.cfg[t.dataset.cfg] = t.value; guarda(CH.cfg, U.cfg); }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.cfg && t.tagName === 'INPUT') { U.cfg[t.dataset.cfg] = t.value; guarda(CH.cfg, U.cfg); return; }
    if (t.id === 'cad-filtro') { S.filtro = t.value; var tb = document.querySelector('#cad-bombas tbody'); if (tb) tb.innerHTML = linhasBombas().join('') || '<tr><td colspan="8" class="peq">Nenhuma bomba com esse texto.</td></tr>'; }
  });
  // setas esquerda e direita trocam de aba (padrão de abas)
  document.addEventListener('keydown', function (ev) {
    var t = ev.target; if (!t.dataset || !t.dataset.aba || (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft')) return;
    var l = Array.prototype.slice.call(t.parentNode.querySelectorAll('[data-aba]')), i = l.indexOf(t), j = (i + (ev.key === 'ArrowRight' ? 1 : l.length - 1)) % l.length;
    ev.preventDefault(); l[j].click();
  });
})();
