/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */
/* FireCalc 2.0, formatador único de número e unidade: vírgula decimal e ponto de milhar em toda a tela. */
(function (raiz, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else raiz.FireFormato = f(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /** Uma só rotina de arredondamento (2.4): o resto de ponto flutuante sai antes (35,894999... e 35,895 dão 35,90). */
  function limpa(x) { return parseFloat(x.toPrecision(12)); }
  function fmt(x, d) { if (typeof x !== 'number' || isNaN(x)) return 'sem dado'; d = d === undefined ? 2 : d; return limpa(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  /** Texto vindo do motor (ponto decimal) para a tela: 102.0 vira 102,0. Desde a 2.4 ficam como estão: número de item da norma
   *  (mais de um ponto, como 4.8.8 e 5.7.1, ou depois de letra e ponto, como C.2.6), o item logo depois de IT 22, NPT 022, NBR,
   *  Tabela ou item, e todo o trecho de fonte digitada (de "fonte:" até o parêntese que fecha ou o fim). */
  function vir(t) {
    t = String(t); var prot = [], m, re = /fonte:/gi;
    while ((m = re.exec(t))) { var i = m.index, k = re.lastIndex, nv = 0; for (; k < t.length; k++) { if (t[k] === '(') nv++; else if (t[k] === ')') { if (nv === 0) break; nv--; } } prot.push([i, k]); }
    var re2 = /(IT 22|NPT 022|NBR\s*[\d.]+|Tabela|itens|item)\s*,?\s*[A-Z]?\.?[\d.]+/g;
    while ((m = re2.exec(t))) prot.push([m.index, re2.lastIndex]);
    return t.replace(/\d+(?:\.\d+)+/g, function (s, pos) {
      if ((s.match(/\./g) || []).length > 1) return s;
      if (pos > 0 && /[A-Za-z.]/.test(t[pos - 1])) return s;
      for (var j = 0; j < prot.length; j++) if (pos >= prot[j][0] && pos < prot[j][1]) return s;
      return s.replace('.', ',');
    });
  }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  return { fmt: fmt, vir: vir, esc: esc };
});
