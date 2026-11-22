#!/usr/bin/env bash
# FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia.
# Monta o programa a partir do código: dados.js a partir de dados.json e, depois, firecalc.html, kit/firecalc.html e kit/exemplos.
# Uso: bash montar.sh   (precisa só de Python 3)
set -euo pipefail
cd "$(dirname "$0")"
command -v python3 >/dev/null || { echo "Python 3 não encontrado: instale o Python 3 e rode de novo."; exit 1; }
python3 - <<'PY'
import json
dados = json.load(open('dados.json', encoding='utf8'))
open('dados.js', 'w', encoding='utf8', newline='\n').write('/* FireCalc. Copyright (C) 2026 Mateus Beraldi Nobre. Licença GNU AGPL-3.0-only (SPDX-License-Identifier: AGPL-3.0-only); texto em LICENSE. Nome e logo reservados (MARCA.md). Sem garantia. */\n/* gerado por montar.sh a partir de dados.json; não editar */\n(function(g){g.FIREDADOS=' + json.dumps(dados, ensure_ascii=False) + ';if(typeof module!=="undefined")module.exports=g.FIREDADOS;})(typeof window!=="undefined"?window:globalThis);\n')
PY
python3 v2/build_v2.py
echo "Programa montado: firecalc.html e kit/."
