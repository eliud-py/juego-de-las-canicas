/** views/config.js — Preparar una bolsa nueva: tú eliges las canicas, o el azar las reparte. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});
  const M = isNode ? require('../math.js') : ns.math;
  const { escapeHtml: esc, heading } = isNode ? require('./shared.js') : ns.views.shared;

  function configView(state) {
    const c = { ...M.DEFAULTS, total: 10, ...state.draft };
    const max = M.LIMITS.maxMarbles;
    const num = (id, label, value, min, maxv, cls) =>
      `<div class="field ${cls}"><label for="${id}">${label}</label><input type="number" inputmode="numeric" name="${id}" id="${id}" min="${min}" max="${maxv}" step="1" value="${value}"></div>`;
    return `${heading('Prepara la bolsa.', 'Elige cuántas canicas de cada color van dentro, o deja que el azar decida y descúbrelo tú.')}
<section class="panel page-content"><h2>Nueva partida</h2>
<form id="config-form" class="${c.secret ? 'mode-random' : 'mode-manual'}" novalidate><div class="form-grid">
<div class="field wide"><label for="name">Nombre del detective</label><input id="name" name="name" maxlength="50" required value="${esc(c.name)}" data-autofocus></div>
${num('red', 'Canicas rojas', c.red, 0, max, 'manual-only')}
${num('blue', 'Canicas azules', c.blue, 0, max, 'manual-only')}
<p class="hint wide manual-only">Total en la bolsa: <b id="total-value">${Number(c.red) + Number(c.blue)}</b> canicas. Quien juega no debería ver estos números: prepara la bolsa y pasa el turno.</p>
${num('total', 'Total de canicas en la bolsa', c.total, 1, max, 'wide random-only')}
<label class="toggle-label wide"><input type="checkbox" name="secret" ${c.secret ? 'checked' : ''}> Sortear el reparto al azar (para jugar solo: ni tú sabrás cuántas hay de cada color)</label>
${num('rounds', 'Canicas que vas a sacar', c.rounds, 1, M.LIMITS.maxRounds, 'wide')}
<label class="toggle-label wide"><input type="checkbox" name="replace" ${c.replace ? 'checked' : ''}> Devolver cada canica a la bolsa después de sacarla</label>
</div><p id="form-error" class="error" role="alert"></p>
<div class="form-actions"><button class="btn primary" type="submit">Sellar la bolsa y jugar</button><button type="button" class="btn" data-action="defaults">Valores por defecto</button><button type="button" class="text-btn" data-view="inicio">Volver</button></div>
</form></section>`;
  }

  const api = { configView };
  if (isNode) module.exports = api;
  else (ns.views = ns.views || {}).config = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
