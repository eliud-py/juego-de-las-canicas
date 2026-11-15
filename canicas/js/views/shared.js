/** views/shared.js — Utilidades comunes a todas las vistas. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});

  const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);

  /** Cabecera de página. `title` y `sub` son HTML de confianza (nunca texto del usuario sin escapar). */
  function heading(title, sub, live = false) {
    return `<section class="intro"><div><h1 tabindex="-1">${title}</h1><p class="subtitle">${sub}</p></div>${live ? '<span class="pill"><i></i> Laboratorio de probabilidad</span>' : ''}</section>`;
  }

  const colorName = (c) => (c === 'red' ? 'Roja' : 'Azul');

  const api = { escapeHtml, heading, colorName };
  if (isNode) module.exports = api;
  else (ns.views = ns.views || {}).shared = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
