/**
 * math.js — Funciones puras de probabilidad y estadística.
 * No toca el DOM, ni el almacenamiento, ni el estado del juego.
 * Funciona en el navegador (globalThis.Marbles.math) y en Node (require).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;

  const DEFAULTS = Object.freeze({
    name: 'Detective',
    red: 6,
    blue: 4,
    rounds: 10,
    replace: true,
    secret: false, // true = el reparto se sortea al azar y nadie lo conoce
  });

  const LIMITS = Object.freeze({ maxMarbles: 10000, maxRounds: 1000 });

  /** Probabilidad de cada color. Una bolsa vacía devuelve 0 y 0. */
  function probability(red, blue) {
    const total = red + blue;
    return total ? { red: red / total, blue: blue / total } : { red: 0, blue: 0 };
  }

  /** Extrae un color según `random` (número en [0, 1)). null si la bolsa está vacía. */
  function drawColor(bag, random) {
    const total = bag.red + bag.blue;
    if (total <= 0) return null;
    return random < bag.red / total ? 'red' : 'blue';
  }

  /** Bolsa resultante tras extraer `color`. Con devolución no cambia. */
  function removeFromBag(bag, color, replace) {
    if (replace) return { ...bag };
    return {
      red: bag.red - (color === 'red' ? 1 : 0),
      blue: bag.blue - (color === 'blue' ? 1 : 0),
    };
  }

  /** Rojas secretas: al menos una de cada color cuando hay 2 o más canicas. */
  function secretRed(total, random) {
    if (total < 2) return Math.floor(random() * (total + 1));
    return 1 + Math.floor(random() * (total - 1));
  }

  /** Devuelve un mensaje de error en español, o '' si la configuración es válida. */
  function validate(c) {
    if (!c || typeof c.name !== 'string' || !c.name.trim()) return 'Introduce tu nombre.';
    if (![c.red, c.blue, c.rounds].every(Number.isSafeInteger)) return 'Introduce cantidades enteras.';
    if (c.red < 0 || c.blue < 0) return 'No puede haber cantidades negativas.';
    const total = c.red + c.blue;
    if (total < 1 || total > LIMITS.maxMarbles) return 'La bolsa debe contener entre 1 y 10 000 canicas.';
    if (c.rounds < 1 || c.rounds > LIMITS.maxRounds) return 'Elige entre 1 y 1 000 rondas.';
    if (!c.replace && c.rounds > total) return 'Sin devolución, las rondas no pueden superar el total de canicas.';
    return '';
  }

  /** Resumen estadístico del historial de rondas. */
  function summarize(history) {
    const rounds = history.length;
    const correct = history.filter((x) => x.correct).length;
    const red = history.filter((x) => x.color === 'red').length;
    return {
      rounds,
      correct,
      incorrect: rounds - correct,
      red,
      blue: rounds - red,
      accuracy: rounds ? correct / rounds : 0,
      redFrequency: rounds ? red / rounds : 0,
      blueFrequency: rounds ? (rounds - red) / rounds : 0,
    };
  }

  /** 0.6 → "60%" (formato español, 1 decimal como máximo). */
  function pct(n) {
    return `${(n * 100).toLocaleString('es', { maximumFractionDigits: 1 })}%`;
  }

  /** Número aleatorio en [0, 1). Usa crypto si existe. */
  function defaultRandom() {
    const c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const v = new Uint32Array(1);
      c.getRandomValues(v);
      return v[0] / 4294967296;
    }
    return Math.random();
  }

  /** Fisher-Yates sin modificar el original. */
  function shuffle(items, random) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const api = {
    DEFAULTS, LIMITS, probability, drawColor, removeFromBag,
    validate, summarize, secretRed, pct, defaultRandom, shuffle,
  };
  if (isNode) module.exports = api;
  else (root.Marbles = root.Marbles || {}).math = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
