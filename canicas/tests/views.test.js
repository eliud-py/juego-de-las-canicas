const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../js/store.js');
const { gameView } = require('../js/views/play.js');
const { configView } = require('../js/views/config.js');
const { howView, formulasView, statsView, resultsView } = require('../js/views/pages.js');
const { escapeHtml } = require('../js/views/shared.js');

const form = (o = {}) => ({ name: 'Ana', red: '6', blue: '4', rounds: '1', replace: true, secret: false, ...o });
const wait = () => new Promise((r) => setTimeout(r, 15));
const ALL = [gameView, configView, howView, formulasView, statsView, resultsView];
const newStore = () => createStore({ storage: null, drawDelay: 0, random: () => 0.1 });

test('todas las vistas se generan sin errores en cada fase', async () => {
  const s = newStore();
  const render = () => ALL.forEach((v) => { const h = v(s.getState()); assert.ok(h.length > 100); assert.ok(!h.includes('undefined') && !h.includes('NaN') && !h.includes('null')); });
  render();
  s.actions.start(form()); render();
  s.actions.predict('red'); render();
  await wait(); render();
  s.actions.openGuess(); render();
  s.actions.solve(5); render();
  s.actions.toggleExplain(); render();
});

test('MISTERIO: antes de abrir la bolsa ninguna vista revela probabilidad ni composición', async () => {
  const s = newStore();
  s.actions.start(form({ red: '9', blue: '5', rounds: '2' })); // 9 rojas, 5 azules: 64,3% / 35,7%
  s.actions.predict('red');
  await wait();
  s.actions.next();
  for (const v of [gameView, statsView, formulasView, resultsView]) {
    const h = v(s.getState());
    assert.ok(!/64,3|35,7|9\/14|5\/14|9 rojas|5 azules|teórica/.test(h), `${v.name} filtra el secreto`);
  }
  assert.match(formulasView(s.getState()), /está sellada/);
  assert.ok(!/<th>P\(roja\) antes/.test(statsView(s.getState())));
});

test('al resolver, la bolsa se revela en resultados y en el menú de probabilidad', async () => {
  const s = newStore();
  s.actions.start(form({ red: '7', blue: '3' }));
  s.actions.predict('red'); await wait();
  s.actions.openGuess(); s.actions.solve(7);
  assert.match(formulasView(s.getState()), /P\(roja\) = 7\/10 = 70%/);
  const r = resultsView(s.getState());
  assert.match(r, /Misterio resuelto/);
  assert.match(r, /teórica/);
});

test('la fase de adivinar muestra el control y no el reparto', async () => {
  const s = newStore();
  s.actions.start(form({ red: '7', blue: '3' }));
  s.actions.predict('red'); await wait();
  s.actions.openGuess();
  const h = gameView(s.getState());
  assert.match(h, /type="range"/);
  assert.match(h, /data-action="solve"/);
  assert.ok(!/7 rojas/.test(h.replace(/Sacaste[^<]*/, '')));
});

test('el nombre se escapa en todas partes', async () => {
  const s = newStore();
  s.actions.start(form({ name: '<img src=x onerror=alert(1)>' }));
  s.actions.predict('red'); await wait(); s.actions.openGuess(); s.actions.solve(6);
  for (const v of [gameView, configView, statsView, resultsView]) assert.ok(!v(s.getState()).includes('<img src=x'), v.name);
  assert.equal(escapeHtml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('el formulario deja elegir rojas y azules, o sortear al azar', () => {
  const manual = configView({ draft: { name: 'Ana', red: 6, blue: 4, total: 10, rounds: 10, replace: true, secret: false } });
  assert.match(manual, /name="red"[^>]*value="6"/);
  assert.match(manual, /name="blue"[^>]*value="4"/);
  assert.match(manual, /class="mode-manual"/);
  assert.match(manual, /<b id="total-value">10<\/b>/);
  const random = configView({ draft: { name: 'Ana', red: 6, blue: 4, total: 12, rounds: 10, replace: true, secret: true } });
  assert.match(random, /class="mode-random"/);
  assert.match(random, /name="secret" checked/);
});

test('la pantalla inicial no muestra el reparto', () => {
  const idle = gameView({ game: null });
  assert.match(idle, /10 canicas/);
  assert.ok(!/class="counts"/.test(idle));
});
