/**
 * store.js — Único lugar con estado mutable.
 *
 * Estado: { game: partida|null, draft: configuración del formulario, explaining: bool }
 * Las acciones llaman a game.js (puro), guardan el resultado y avisan a los suscriptores.
 * La vista actual NO vive aquí: se deriva de location.hash (ver app.js).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});
  const M = isNode ? require('./math.js') : ns.math;
  const G = isNode ? require('./game.js') : ns.game;

  const STORAGE_KEY = 'el-reto-de-las-canicas:v4';
  const VERSION = 4;
  const colorName = (c) => (c === 'red' ? 'roja' : 'azul');

  function browserStorage() {
    try { return root.sessionStorage || null; } catch (_) { return null; }
  }

  /**
   * @param {object} [options]
   * @param {() => number} [options.random]  fuente de azar (inyectable para tests)
   * @param {number} [options.drawDelay]     ms de "suspense" antes de revelar la canica
   * @param {Storage|null} [options.storage] por defecto sessionStorage; null desactiva la persistencia
   */
  function createStore(options = {}) {
    const random = options.random || M.defaultRandom;
    const drawDelay = options.drawDelay === undefined ? 900 : options.drawDelay;
    const storage = 'storage' in options ? options.storage : browserStorage();
    const listeners = new Set();
    let timer = null;

    function restore() {
      try {
        const raw = storage && storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== VERSION) return null;
        let game = G.isValidGame(data.game) ? data.game : null;
        // Si se recargó en mitad de una extracción, se vuelve a la predicción.
        if (game && game.phase === 'drawing') game = { ...game, phase: 'predicting', pending: null };
        const draft = data.draft && typeof data.draft.name === 'string' ? data.draft : { ...M.DEFAULTS };
        return { game, draft, explaining: false };
      } catch (_) {
        return null;
      }
    }

    function persist() {
      try {
        if (storage) storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, game: state.game, draft: state.draft }));
      } catch (_) { /* almacenamiento lleno o bloqueado: el juego sigue funcionando */ }
    }

    let state = restore() || { game: null, draft: { ...M.DEFAULTS }, explaining: false };

    function update(patch, announce, extra) {
      state = { ...state, ...patch };
      persist();
      listeners.forEach((fn) => fn(state, { announce, ...extra }));
    }

    function clearTimer() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    const actions = {
      /** Empieza una partida nueva. Devuelve un mensaje de error o ''. */
      start(config) {
        const secret = Boolean(config.secret);
        const total = secret ? Number(config.total) : Number(config.red) + Number(config.blue);
        const red = secret ? M.secretRed(total, random) : Number(config.red);
        const clean = {
          name: String(config.name || '').trim(),
          red,
          blue: total - red,
          rounds: Number(config.rounds),
          replace: Boolean(config.replace),
        };
        const error = M.validate(clean);
        if (error) return error;
        clearTimer();
        const draft = { name: clean.name, rounds: clean.rounds, replace: clean.replace, secret, total: secret ? total : (Number(config.total) || total), red: secret ? (Number(config.red) || M.DEFAULTS.red) : red, blue: secret ? (Number(config.blue) || M.DEFAULTS.blue) : clean.blue };
        update({ game: G.startGame(clean), draft, explaining: false }, 'La bolsa está sellada. Predice el color de la primera canica.');
        return '';
      },

      /** Partida rápida con la configuración predeterminada (conserva el nombre escrito). */
      quickStart() {
        return actions.start({ ...M.DEFAULTS, secret: true, total: 10, name: state.draft.name || M.DEFAULTS.name });
      },

      /** Nueva bolsa con los mismos ajustes (si la composición era secreta, vuelve a sortearse). */
      restart() {
        if (state.game) actions.start(state.draft);
      },

      /** Restablece SOLO el formulario; nunca toca la partida en curso. */
      useDefaults() {
        update({ draft: { ...M.DEFAULTS, total: 10, name: state.draft.name } }, 'Valores predeterminados restablecidos.', { refreshForm: true });
      },

      openGuess() {
        if (!state.game) return;
        const next = G.openGuess(state.game);
        if (next !== state.game) update({ game: next }, 'Es hora de abrir la bolsa. ¿Cuántas rojas crees que guarda?');
      },

      solve(guess) {
        if (!state.game) return;
        const next = G.solve(state.game, guess);
        if (next !== state.game) update({ game: next }, G.verdict(next).text);
      },

      predict(color) {
        if (!state.game) return;
        const next = G.predict(state.game, color);
        if (next === state.game) return;
        clearTimer();
        update({ game: next }, 'La mano entra en la bolsa…');
        timer = setTimeout(() => {
          timer = null;
          const resolved = G.resolveDraw(state.game, random);
          if (resolved === state.game) return;
          const last = G.lastEntry(resolved);
          update({ game: resolved },
            `La canica es ${colorName(last.color)}. ${last.correct ? '¡Acertaste!' : 'Esta vez salió otro color.'}`);
        }, drawDelay);
      },

      next() {
        if (!state.game) return;
        const next = G.nextRound(state.game);
        if (next === state.game) return;
        update({ game: next }, `Ronda ${G.currentRound(next)}. Predice el color de la canica.`);
      },

      toggleExplain() {
        update({ explaining: !state.explaining });
      },
    };

    return {
      getState: () => state,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      actions,
    };
  }

  const api = { createStore, STORAGE_KEY };
  if (isNode) module.exports = api;
  else ns.store = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
