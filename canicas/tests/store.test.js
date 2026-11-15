const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, STORAGE_KEY } = require('../js/store.js');
const M = require('../js/math.js');

const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const memoryStorage = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, data: d }; };
const form = (o = {}) => ({ name: 'Ana', red: '6', blue: '4', rounds: '2', replace: true, secret: false, ...o });

test('start valida y devuelve el error sin cambiar el estado', () => {
  const s = createStore({ storage: null });
  assert.match(s.actions.start(form({ name: '' })), /nombre/);
  assert.equal(s.getState().game, null);
  assert.equal(s.actions.start(form()), '');
  assert.equal(s.getState().game.phase, 'predicting');
  assert.equal(s.getState().game.config.blue, 4);
  assert.equal(s.getState().game.config.red, 6);
});

test('una partida completa con extracción temporizada', async () => {
  const s = createStore({ storage: null, drawDelay: 0, random: () => 0.1 });
  const messages = [];
  s.subscribe((_st, meta) => messages.push(meta.announce));
  s.actions.start(form({ rounds: '1' }));
    s.actions.predict('red');
  assert.equal(s.getState().game.phase, 'drawing');
  await wait();
  const g = s.getState().game;
  assert.equal(g.phase, 'revealed');
  assert.equal(g.history.length, 1);
  assert.match(messages.at(-1), /La canica es roja\. ¡Acertaste!/);
});

test('reiniciar mientras se extrae cancela la extracción pendiente', async () => {
  const s = createStore({ storage: null, drawDelay: 5, random: () => 0.1 });
  s.actions.start(form());
    s.actions.predict('red');
  s.actions.restart();
  await wait(30);
  const g = s.getState().game;
  assert.equal(g.phase, 'predicting');
  assert.equal(g.history.length, 0);
});

test('useDefaults solo cambia el formulario, nunca la partida en curso', () => {
  const s = createStore({ storage: null });
  s.actions.start(form({ red: '3', blue: '7', rounds: '5', replace: false }));
  const before = s.getState().game;
  s.actions.useDefaults();
  assert.equal(s.getState().game, before);
  assert.equal(s.getState().draft.red, M.DEFAULTS.red);
  assert.equal(s.getState().draft.name, 'Ana');
});

test('quickStart usa los valores predeterminados y conserva el nombre', () => {
  const s = createStore({ storage: null });
  s.actions.start(form({ name: 'Luis', red: '1', blue: '1', rounds: '1' }));
  s.actions.quickStart();
  const { config } = s.getState().game;
  assert.equal(config.name, 'Luis');
  assert.equal(config.total, 10);
  assert.equal(config.rounds, 10);
});

test('persistencia: se restaura la partida; "drawing" vuelve a "predicting"', () => {
  const storage = memoryStorage();
  const a = createStore({ storage, drawDelay: 10000, random: () => 0.1 });
  a.actions.start(form());
  a.actions.predict('red');
  assert.equal(a.getState().game.phase, 'drawing');
  const b = createStore({ storage, drawDelay: 10000 });
  assert.equal(b.getState().game.phase, 'predicting');
  assert.equal(b.getState().game.pending, null);
  assert.equal(b.getState().game.config.name, 'Ana');
  a.actions.restart(); // limpia el temporizador pendiente
});

test('persistencia: datos corruptos o de otra versión se ignoran', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{no es json');
  assert.equal(createStore({ storage }).getState().game, null);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, game: {} }));
  assert.equal(createStore({ storage }).getState().game, null);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, game: { phase: 'predicting', config: { red: -5 } } }));
  assert.equal(createStore({ storage }).getState().game, null);
});

test('un almacenamiento que lanza errores no rompe el juego', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = createStore({ storage: broken });
  assert.equal(s.actions.start(form()), '');
});

test('modo secreto: el reparto se sortea y nunca falta un color', () => {
  const s = createStore({ storage: null, random: () => 0.5 });
  assert.equal(s.actions.start(form({ secret: true, total: '10', rounds: '3' })), '');
  const { red, blue } = s.getState().game.config;
  assert.equal(red + blue, 10);
  assert.ok(red >= 1 && blue >= 1);
  assert.equal(s.getState().draft.secret, true);
});

test('adivinar: openGuess y solve recorren las fases hasta solved', async () => {
  const s = createStore({ storage: null, drawDelay: 0, random: () => 0.1 });
  s.actions.start(form({ rounds: '1' }));
  s.actions.predict('red');
  await wait();
  s.actions.openGuess();
  assert.equal(s.getState().game.phase, 'guessing');
  s.actions.solve(6);
  assert.equal(s.getState().game.phase, 'solved');
});

test('modo manual: el total es rojas + azules y se valida', () => {
  const s = createStore({ storage: null });
  assert.match(s.actions.start(form({ red: '0', blue: '0' })), /entre 1 y 10 000/);
  assert.match(s.actions.start(form({ red: '-2', blue: '5' })), /negativas/);
  assert.equal(s.actions.start(form({ red: '3', blue: '9' })), '');
  assert.deepEqual([s.getState().game.config.red, s.getState().game.config.blue, s.getState().game.config.total], [3, 9, 12]);
});

test('reiniciar en modo manual repite la misma bolsa', () => {
  const s = createStore({ storage: null });
  s.actions.start(form({ red: '2', blue: '8' }));
  s.actions.restart();
  assert.equal(s.getState().game.config.red, 2);
  assert.equal(s.getState().game.config.blue, 8);
});
