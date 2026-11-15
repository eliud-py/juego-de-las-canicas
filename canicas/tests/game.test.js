const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/game.js');

const config = (o = {}) => ({ name: 'Ana', red: 6, blue: 4, rounds: 3, replace: true, ...o });
const always = (v) => () => v;
const play = (g, color, r) => G.resolveDraw(G.predict(g, color), always(r));

test('ronda completa: predicting → drawing → revealed', () => {
  let g = G.startGame(config());
  assert.equal(g.phase, 'predicting');
  assert.equal(g.config.total, 10);
  g = G.predict(g, 'red');
  assert.equal(g.phase, 'drawing');
  g = G.resolveDraw(g, always(0.1)); // 0.1 < 0.6 → roja
  assert.equal(g.phase, 'revealed');
  assert.equal(g.revealed, 'red');
  assert.equal(g.history[0].correct, true);
});

test('transiciones inválidas devuelven la misma partida', () => {
  const g0 = G.startGame(config());
  assert.equal(G.predict(g0, 'verde'), g0);
  assert.equal(G.nextRound(g0), g0);
  assert.equal(G.openGuess(g0), g0);
  assert.equal(G.solve(g0, 3), g0);
  const g1 = G.predict(g0, 'red');
  assert.equal(G.predict(g1, 'blue'), g1);
});

test('con devolución la bolsa no cambia; sin devolución sí', () => {
  assert.deepEqual(play(G.startGame(config()), 'red', 0.1).bag, { red: 6, blue: 4 });
  assert.deepEqual(play(G.startGame(config({ replace: false })), 'red', 0.1).bag, { red: 5, blue: 4 });
});

test('la última canica deja ver su resultado y luego se abre la fase de adivinar', () => {
  let g = play(G.startGame(config({ rounds: 1 })), 'blue', 0.1);
  assert.equal(g.phase, 'revealed');
  assert.equal(G.isOver(g), true);
  assert.equal(G.nextRound(g), g);
  g = G.openGuess(g);
  assert.equal(g.phase, 'guessing');
});

test('solve: valida el rango y resuelve; el veredicto depende de la distancia', () => {
  const guessing = () => G.openGuess(play(G.startGame(config({ rounds: 1 })), 'red', 0.1));
  assert.equal(G.solve(guessing(), 11).phase, 'guessing');
  assert.equal(G.solve(guessing(), 2.5).phase, 'guessing');
  const verdictFor = (n) => G.verdict(G.solve(guessing(), n)).level;
  assert.equal(verdictFor(6), 'exact');
  assert.equal(verdictFor(7), 'close');
  assert.equal(verdictFor(1), 'far');
  assert.equal(G.isSolved(G.solve(guessing(), 6)), true);
});

test('sin devolución, si la bolsa se vacía la partida termina antes', () => {
  let g = G.startGame(config({ red: 1, blue: 1, rounds: 5, replace: false }));
  g = play(g, 'red', 0.1);
  g = G.nextRound(g);
  g = play(g, 'blue', 0.9);
  assert.equal(G.isOver(g), true);
});

test('currentRound', () => {
  let g = G.startGame(config());
  assert.equal(G.currentRound(g), 1);
  g = play(g, 'red', 0.1);
  assert.equal(G.currentRound(g), 1);
  assert.equal(G.currentRound(G.nextRound(g)), 2);
});

test('isValidGame acepta partidas reales (también solved) y rechaza basura', () => {
  let g = G.solve(G.openGuess(play(G.startGame(config({ rounds: 1 })), 'red', 0.1)), 5);
  assert.equal(G.isValidGame(JSON.parse(JSON.stringify(g))), true);
  assert.equal(G.isValidGame({ ...g, guess: 99 }), false);
  assert.equal(G.isValidGame({ ...g, phase: 'guessing', history: [] }), false);
  assert.equal(G.isValidGame({ ...g, bag: { red: -1, blue: 0 } }), false);
  assert.equal(G.isValidGame(null), false);
  assert.equal(G.isValidGame(G.idleGame()), false);
});
