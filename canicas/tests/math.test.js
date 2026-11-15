const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/math.js');

test('probability: bolsa normal y vacía', () => {
  assert.deepEqual(M.probability(6, 4), { red: 0.6, blue: 0.4 });
  assert.deepEqual(M.probability(0, 0), { red: 0, blue: 0 });
});

test('drawColor: respeta el umbral y la bolsa vacía', () => {
  assert.equal(M.drawColor({ red: 6, blue: 4 }, 0.59), 'red');
  assert.equal(M.drawColor({ red: 6, blue: 4 }, 0.6), 'blue');
  assert.equal(M.drawColor({ red: 0, blue: 0 }, 0.1), null);
  assert.equal(M.drawColor({ red: 0, blue: 3 }, 0), 'blue');
});

test('removeFromBag: con y sin devolución', () => {
  assert.deepEqual(M.removeFromBag({ red: 2, blue: 1 }, 'red', true), { red: 2, blue: 1 });
  assert.deepEqual(M.removeFromBag({ red: 2, blue: 1 }, 'red', false), { red: 1, blue: 1 });
  assert.deepEqual(M.removeFromBag({ red: 2, blue: 1 }, 'blue', false), { red: 2, blue: 0 });
});

test('validate: acepta lo válido y explica lo inválido', () => {
  const ok = { name: 'Ana', red: 6, blue: 4, rounds: 10, replace: true };
  assert.equal(M.validate(ok), '');
  assert.match(M.validate({ ...ok, name: '  ' }), /nombre/);
  assert.match(M.validate({ ...ok, red: 2.5 }), /enteras/);
  assert.match(M.validate({ ...ok, red: NaN }), /enteras/);
  assert.match(M.validate({ ...ok, red: -1 }), /negativas/);
  assert.match(M.validate({ ...ok, red: 0, blue: 0 }), /entre 1 y 10 000/);
  assert.match(M.validate({ ...ok, red: 10000, blue: 1 }), /entre 1 y 10 000/);
  assert.match(M.validate({ ...ok, rounds: 0 }), /rondas/);
  assert.match(M.validate({ ...ok, rounds: 1001 }), /rondas/);
  assert.match(M.validate({ ...ok, replace: false, rounds: 11 }), /Sin devolución/);
  assert.equal(M.validate({ ...ok, replace: false, rounds: 10 }), '');
});

test('summarize: cuenta aciertos y frecuencias', () => {
  const h = [
    { color: 'red', correct: true }, { color: 'red', correct: false },
    { color: 'blue', correct: true }, { color: 'red', correct: true },
  ];
  const s = M.summarize(h);
  assert.equal(s.rounds, 4);
  assert.equal(s.correct, 3);
  assert.equal(s.incorrect, 1);
  assert.equal(s.red, 3);
  assert.equal(s.blue, 1);
  assert.equal(s.accuracy, 0.75);
  assert.equal(s.redFrequency, 0.75);
  assert.deepEqual(M.summarize([]).accuracy, 0);
});

test('pct: formato en español', () => {
  assert.equal(M.pct(0.6), '60%');
  assert.equal(M.pct(5 / 9), '55,6%');
});

test('shuffle: conserva elementos y no muta el original', () => {
  const src = [1, 2, 3, 4, 5];
  const out = M.shuffle(src, Math.random);
  assert.deepEqual([...out].sort(), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});

test('secretRed: siempre deja al menos una canica de cada color', () => {
  for (let total = 2; total <= 12; total++) {
    for (const r of [0, 0.3, 0.999999]) {
      const red = M.secretRed(total, () => r);
      assert.ok(red >= 1 && red <= total - 1, `total=${total} r=${r} red=${red}`);
    }
  }
  assert.ok([0, 1].includes(M.secretRed(1, () => 0.5)));
});
