/**
 * game.js — Reglas del juego como transiciones puras.
 *
 * Fases: idle → predicting → drawing → revealed → (predicting … | guessing → solved)
 * La composición de la bolsa (bag) es secreta: ninguna vista la muestra hasta `solved`.
 * Cada función devuelve una partida nueva, o la MISMA si la transición no es válida.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});
  const M = isNode ? require('./math.js') : ns.math;

  const PHASES = ['idle', 'predicting', 'drawing', 'revealed', 'guessing', 'solved'];
  const COLORS = ['red', 'blue'];

  function idleGame(config = M.DEFAULTS) {
    return { config: { ...config, total: config.total || config.red + config.blue }, bag: { red: 0, blue: 0 }, history: [], phase: 'idle', pending: null, revealed: null, guess: null };
  }

  /** `config` ya resuelto: { name, red, blue, rounds, replace } (el total es red + blue). */
  function startGame(config) {
    return { ...idleGame(config), config: { ...config, total: config.red + config.blue }, bag: { red: config.red, blue: config.blue }, phase: 'predicting' };
  }

  const bagTotal = (g) => g.bag.red + g.bag.blue;
  const isOver = (g) => g.phase !== 'idle' && (g.history.length >= g.config.rounds || bagTotal(g) === 0);
  const isSolved = (g) => g.phase === 'solved';
  const lastEntry = (g) => g.history[g.history.length - 1] || null;

  /** Ronda que se juega (o cuyo resultado se ve). */
  function currentRound(g) {
    const n = g.phase === 'predicting' || g.phase === 'drawing' ? g.history.length + 1 : g.history.length;
    return Math.min(Math.max(n, 1), g.config.rounds);
  }

  function predict(g, color) {
    if (g.phase !== 'predicting' || !COLORS.includes(color) || isOver(g)) return g;
    return { ...g, phase: 'drawing', pending: color };
  }

  function resolveDraw(g, random = M.defaultRandom) {
    if (g.phase !== 'drawing') return g;
    const color = M.drawColor(g.bag, random());
    if (!color) return g;
    const entry = { round: g.history.length + 1, prediction: g.pending, color, correct: color === g.pending, probability: M.probability(g.bag.red, g.bag.blue) };
    return { ...g, bag: M.removeFromBag(g.bag, color, g.config.replace), history: [...g.history, entry], phase: 'revealed', pending: null, revealed: color };
  }

  function nextRound(g) {
    if (g.phase !== 'revealed' || isOver(g)) return g;
    return { ...g, phase: 'predicting', revealed: null };
  }

  /** Terminadas las rondas, se pasa a adivinar la bolsa. */
  function openGuess(g) {
    if (g.phase !== 'revealed' || !isOver(g)) return g;
    return { ...g, phase: 'guessing', revealed: null };
  }

  /** `guess` = número de rojas que el jugador cree que había al empezar. */
  function solve(g, guess) {
    if (g.phase !== 'guessing' || !Number.isInteger(guess) || guess < 0 || guess > g.config.total) return g;
    return { ...g, phase: 'solved', guess };
  }

  /** Veredicto según lo cerca que estuvo la estimación. */
  function verdict(g) {
    const diff = Math.abs(g.guess - g.config.red);
    if (diff === 0) return { level: 'exact', diff, text: '¡Misterio resuelto! Acertaste la composición exacta.' };
    if (diff <= Math.max(1, Math.round(g.config.total * 0.1))) return { level: 'close', diff, text: 'Muy cerca: casi descifras el secreto.' };
    return { level: 'far', diff, text: 'La bolsa guardaba otro secreto. Revisa las pistas y vuelve a intentarlo.' };
  }

  function isValidGame(g) {
    if (!g || typeof g !== 'object' || !PHASES.includes(g.phase) || g.phase === 'idle') return false;
    if (M.validate(g.config) || g.config.total !== g.config.red + g.config.blue) return false;
    const count = (n) => Number.isSafeInteger(n) && n >= 0;
    if (!g.bag || !count(g.bag.red) || !count(g.bag.blue)) return false;
    if (!Array.isArray(g.history) || g.history.length > g.config.rounds) return false;
    const ok = (h) => h && COLORS.includes(h.color) && COLORS.includes(h.prediction) && typeof h.correct === 'boolean' &&
      h.probability && typeof h.probability.red === 'number' && typeof h.probability.blue === 'number';
    if (!g.history.every(ok)) return false;
    if (g.phase === 'revealed' && !g.history.length) return false;
    if ((g.phase === 'guessing' || g.phase === 'solved') && !isOver(g)) return false;
    if (g.phase === 'solved' && !(Number.isInteger(g.guess) && g.guess >= 0 && g.guess <= g.config.total)) return false;
    return true;
  }

  const api = { idleGame, startGame, isOver, isSolved, currentRound, lastEntry, predict, resolveDraw, nextRound, openGuess, solve, verdict, isValidGame };
  if (isNode) module.exports = api;
  else ns.game = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
