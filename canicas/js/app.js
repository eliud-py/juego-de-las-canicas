/**
 * app.js — Arranque: enrutado por hash, render y eventos (delegación única).
 * Solo este archivo toca el DOM y `location`.
 */
(function (root) {
  'use strict';
  const { store: Store, views } = root.Marbles;
  const { gameView } = views.play;
  const { configView } = views.config;
  const { howView, formulasView, statsView, resultsView } = views.pages;
  const G = root.Marbles.game;

  const ROUTES = {
    inicio: { render: gameView, title: 'Inicio' },
    como: { render: howView, title: 'Cómo jugar' },
    config: { render: configView, title: 'Preparar bolsa' },
    stats: { render: statsView, title: 'Libreta' },
    formulas: { render: formulasView, title: 'Probabilidad' },
    results: { render: resultsView, title: 'Resultados' },
  };
  const SITE = 'El misterio de las canicas';

  const store = Store.createStore();
  const app = document.getElementById('app');
  const live = document.getElementById('live');
  const reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastView = null;

  const currentView = () => {
    const name = root.location.hash.slice(1);
    return Object.prototype.hasOwnProperty.call(ROUTES, name) ? name : 'inicio';
  };

  function announce(message) {
    if (!message) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = message; }, 50);
  }

  function render(meta = {}) {
    const view = currentView();
    const route = ROUTES[view];
    document.querySelectorAll('.nav-btn').forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    app.innerHTML = route.render(store.getState());
    document.title = `${route.title} · ${SITE}`;

    // Foco: al cambiar de página, al título; dentro de la misma página, al elemento principal del paso.
    const changed = lastView !== null && view !== lastView;
    if (changed) {
      const h1 = app.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
      root.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    } else if (lastView !== null) {
      const target = app.querySelector('[data-autofocus]');
      if (target) target.focus({ preventScroll: true });
    }
    lastView = view;
    announce(meta.announce);
  }

  function goTo(view) {
    if (currentView() === view && root.location.hash.slice(1) === view) render();
    else root.location.hash = view;
  }

  const ACTIONS = {
    quick() { store.actions.quickStart(); goTo('inicio'); },
    defaults() { store.actions.useDefaults(); },
    next() { store.actions.next(); },
    explain() { store.actions.toggleExplain(); },
    'open-guess'() { store.actions.openGuess(); },
    solve() { store.actions.solve(Number(document.getElementById('guess').value)); },
    restart() {
      const { game } = store.getState();
      if (!game) return;
      const inProgress = game.history.length > 0 && !G.isSolved(game);
      if (inProgress && !root.confirm('¿Abandonar esta bolsa? Se perderán tus pistas.')) return;
      store.actions.restart();
      goTo('inicio');
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-view],[data-action],[data-draw]');
    if (!el) return;
    if (el.dataset.view) { e.preventDefault(); goTo(el.dataset.view); return; }
    if (el.dataset.draw) { store.actions.predict(el.dataset.draw); return; }
    const action = ACTIONS[el.dataset.action];
    if (action) action();
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'config-form') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const error = store.actions.start({
      name: f.get('name'), red: f.get('red'), blue: f.get('blue'), rounds: f.get('rounds'),
      replace: f.get('replace') === 'on', secret: f.get('secret') === 'on', total: f.get('total'),
    });
    if (error) document.getElementById('form-error').textContent = error;
    else goTo('inicio');
  });

  // Formulario: el modo (elegir / sortear) muestra unos campos u otros, y el total se recalcula.
  document.addEventListener('change', (e) => {
    if (e.target.name === 'secret') e.target.form.className = e.target.checked ? 'mode-random' : 'mode-manual';
  });
  document.addEventListener('input', (e) => {
    const form = e.target.form;
    if (!form || form.id !== 'config-form' || (e.target.name !== 'red' && e.target.name !== 'blue')) return;
    const total = Number(form.elements.red.value) + Number(form.elements.blue.value);
    document.getElementById('total-value').textContent = Number.isFinite(total) ? String(total) : '—';
  });

  // Control deslizante de la estimación final.
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'guess') return;
    const t = Number(e.target.max), v = Number(e.target.value);
    document.getElementById('guess-out').innerHTML = `<b>${v}</b> rojas · <b>${t - v}</b> azules`;
  });

  root.addEventListener('hashchange', () => render());
  store.subscribe((_state, meta) => {
    // No se vuelve a pintar el formulario por cambios ajenos (p. ej. una extracción pendiente):
    // así nunca se pierde lo que la persona está escribiendo.
    if (currentView() === 'config' && !meta.refreshForm) announce(meta.announce);
    else render(meta);
  });
  render();
})(globalThis);
