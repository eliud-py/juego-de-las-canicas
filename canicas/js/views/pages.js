/** views/pages.js — Páginas informativas y de resultados: Cómo jugar, Fórmulas, Estadísticas, Resultados. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});
  const M = isNode ? require('../math.js') : ns.math;
  const G = isNode ? require('../game.js') : ns.game;
  const { escapeHtml: esc, heading, colorName } = isNode ? require('./shared.js') : ns.views.shared;

  const num = (n, digits = 1) => n.toLocaleString('es', { maximumFractionDigits: digits });

  function howView() {
    const steps = [
      ['Prepara la bolsa.', 'Elige cuántas canicas rojas y azules van dentro (o deja que el azar las reparta) y cuántas sacarás. Quien juega no ve el reparto.'],
      ['Apuesta por un color.', 'Antes de cada extracción eliges roja o azul. No ves ninguna probabilidad: solo tu instinto.'],
      ['Mira lo que sale.', 'Una mano saca una canica de la bolsa sellada. Acertar o fallar suma a tu libreta.'],
      ['Reúne pistas.', 'La libreta cuenta cuántas rojas y azules han salido. Con devolución la bolsa no cambia; sin devolución, cada canica sacada cambia lo que queda.'],
      ['Resuelve el misterio.', 'Al terminar, adivina cuántas rojas guardaba la bolsa. Cuanto más cerca, mejor veredicto.'],
      ['Descubre la teoría.', 'Al abrir la bolsa se revela su probabilidad real. Las fórmulas están siempre en el menú Probabilidad.'],
    ];
    return `${heading('Un reto. Dos colores.', 'Una bolsa sellada, tu instinto y las pistas que dejan las canicas.')}
<section class="panel page-content"><h2>Cómo jugar</h2><ol class="steps">${steps.map(([t, d]) => `<li><div><b>${t}</b><br>${d}</div></li>`).join('')}</ol>
<div class="form-actions"><button class="btn primary" data-view="config">Comenzar a jugar →</button><button class="btn" data-view="inicio">Volver al menú</button></div></section>`;
  }

  const FORMULAS = [
    ['Probabilidad clásica', 'P(A) = casos favorables / casos posibles', 'Cuenta cuántas canicas te sirven y divide entre todas las canicas de la bolsa.', 'P(roja) = 6 / 10 = 0,60 = 60%'],
    ['Probabilidad de azul', 'P(azul) = canicas azules / total', 'El mismo cálculo, ahora contando las canicas azules.', 'P(azul) = 4 / 10 = 0,40 = 40%'],
    ['Probabilidad complementaria', 'P(azul) = 1 − P(roja)', 'Solo hay dos colores. Sus probabilidades suman 1.', 'P(azul) = 1 − 0,60 = 0,40 = 40%'],
    ['Frecuencia relativa (probabilidad experimental)', 'f(A) = apariciones de A / experimentos', 'Mide qué parte de las extracciones tuvo un color concreto y estima la probabilidad con resultados observados. Puede diferir de la teoría por el azar.', 'Si salió roja 7 de 10 veces: f(roja) = 7 / 10 = 0,70 = 70%'],
    ['Porcentaje de aciertos', 'Aciertos (%) = (aciertos / rondas) × 100', 'Divide tus predicciones correctas entre las rondas jugadas.', '8 aciertos en 10 rondas: (8 / 10) × 100 = 80%'],
    ['Sucesos independientes (con devolución)', 'P(A y B) = P(A) × P(B)', 'Si la canica vuelve a la bolsa, cada extracción no depende de la anterior: se multiplican las probabilidades.', 'P(roja y roja) = 0,60 × 0,60 = 0,36 = 36%'],
  ];

  function bagSecret(game) {
    if (!game || game.phase === 'idle') return '<div class="tip"><b>La bolsa de tu partida</b>Empieza una partida: su probabilidad real se desbloquea cuando abras la bolsa.</div>';
    if (!G.isSolved(game)) return '<div class="tip locked"><b>La bolsa de tu partida está sellada</b>Su probabilidad real se desbloquea cuando resuelvas el misterio. Mientras tanto, deduce a partir de tus pistas.</div>';
    const { red, blue, total } = game.config;
    const p = M.probability(red, blue);
    return `<div class="tip"><b>La bolsa de tu partida, ya abierta</b>P(roja) = ${red}/${total} = ${M.pct(p.red)}<br>P(azul) = ${blue}/${total} = ${M.pct(p.blue)}</div>`;
  }

  function formulasView(state) {
    return `${heading('Probabilidad y fórmulas.', 'La teoría detrás de cada canica. Los ejemplos usan otra bolsa, no la tuya.')}${bagSecret(state && state.game)}
<div class="formula-list">${FORMULAS.map((e, i) => `<article class="formula"><h3>${e[0]}</h3><code>${e[1]}</code><p>${e[2]}</p><p class="example">${e[3]}</p></article>`).join('')}</div>
<div class="tip" style="margin:20px 0"><b>Sin devolución, las probabilidades cambian.</b>Si extraes una roja de una bolsa con 6 rojas y 4 azules, quedan 5 rojas de 9: P(roja en la próxima ronda) = 5/9 ≈ 55,6%. Con devolución, sigue siendo 6/10 = 60%.</div>
<div class="form-actions" style="margin-bottom:30px"><button class="btn primary" data-view="inicio">Volver al juego →</button></div>`;
  }

  function comparison(game) {
    const s = M.summarize(game.history);
    const p = M.probability(game.config.red, game.config.blue);
    const solved = G.isSolved(game);
    const rows = solved
      ? [['Roja · teórica', p.red, 'red'], ['Roja · real', s.redFrequency, 'red'], ['Azul · teórica', p.blue, 'blue'], ['Azul · real', s.blueFrequency, 'blue']]
      : [['Roja · vista', s.redFrequency, 'red'], ['Azul · vista', s.blueFrequency, 'blue']];
    const key = solved
      ? `Teórica: composición de la bolsa. Real: lo que salió.${game.config.replace ? '' : ' Sin devolución, la probabilidad cambia en cada ronda.'}`
      : 'Solo lo que has visto salir. La composición real sigue sellada.';
    return `<div class="chart"><h3>${solved ? 'Probabilidad teórica vs. experimental' : 'Lo que ha salido hasta ahora'}</h3>${rows.map(([label, value, color]) =>
      `<div class="chart-row"><span>${label}</span><div class="track"><div class="fill ${color}" style="width:${value * 100}%"></div></div><b>${M.pct(value)}</b></div>`).join('')}
<p class="chart-key">${key}</p></div>`;
  }

  function statsView(state) {
    const game = state.game || G.idleGame();
    const s = M.summarize(game.history);
    const cards = [[s.rounds, 'Rondas jugadas'], [s.correct, 'Aciertos'], [s.incorrect, 'Fallos'], [M.pct(s.accuracy), 'Porcentaje de aciertos'],
      [s.red, 'Canicas rojas'], [s.blue, 'Canicas azules'], [M.pct(s.redFrequency), 'Frecuencia roja'], [M.pct(s.blueFrequency), 'Frecuencia azul']];
    const solved = G.isSolved(game);
    const rows = game.history.map((x, i) => `<tr><td>${i + 1}</td><td>${colorName(x.prediction)}</td><td>${colorName(x.color)}</td><td class="${x.correct ? 'success' : 'red-text'}">${x.correct ? 'Acierto' : 'Fallo'}</td>${solved ? `<td>${M.pct(x.probability.red)}</td>` : ''}</tr>`).join('');
    return `${heading('Tu libreta de pistas.', 'Todo lo que has visto salir de la bolsa.')}
<section class="panel page-content"><h2>Libreta de ${esc(game.config.name)}</h2>
<div class="stats-grid">${cards.map(([n, l]) => `<div class="metric"><strong>${n}</strong><span>${l}</span></div>`).join('')}</div>
${game.history.length ? '' : '<p class="subtitle">Aún no has sacado ninguna canica. Empieza a jugar para llenar la libreta.</p>'}
${comparison(game)}
<div class="table-scroll"><table><thead><tr><th>Ronda</th><th>Predicción</th><th>Extracción</th><th>Resultado</th>${solved ? '<th>P(roja) antes</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
<div class="form-actions"><button class="btn primary" data-view="inicio">Volver al juego →</button><button class="btn" data-view="results">Ver resultados</button></div></section>`;
  }

  function resultsView(state) {
    const game = state.game || G.idleGame();
    const started = game.phase !== 'idle';
    const s = M.summarize(game.history);
    if (!G.isSolved(game)) {
      return `${heading('El misterio sigue sellado.', 'Resuelve la bolsa para ver sus resultados y su probabilidad.')}
<section class="panel page-content"><h2>${started ? `${s.rounds} de ${game.config.rounds} canicas sacadas` : 'Tu primera bolsa te espera'}</h2>
<button class="btn primary" data-view="${started ? 'inicio' : 'config'}">${started ? 'Continuar partida' : 'Comenzar juego'} →</button></section>`;
    }
    const { red, blue, replace, name } = game.config;
    const total = red + blue;
    const p = M.probability(red, blue);
    const diff = num(Math.abs(p.red - s.redFrequency) * 100);
    const explanation = state.explaining
      ? `<div class="tip" style="margin-top:15px"><b>¿Qué nos dicen los resultados?</b>La probabilidad teórica inicial de roja era ${M.pct(p.red)}, mientras que apareció ${M.pct(s.redFrequency)} de las veces (${s.red} de ${s.rounds}). La diferencia de ${diff} puntos porcentuales puede deberse al azar y al número limitado de experimentos. ${replace ? 'Con muchas repeticiones, la frecuencia tiende a acercarse a la probabilidad teórica.' : 'Sin devolución, las extracciones dependen de las anteriores: consulta la probabilidad de cada ronda en Estadísticas.'} Acertar no significa que el próximo resultado esté garantizado.</div>`
      : '';
    const cards = [[s.correct, 'Respuestas correctas'], [s.incorrect, 'Respuestas incorrectas'], [M.pct(s.accuracy), 'Porcentaje final'], [`${s.red} / ${s.blue}`, 'Rojas / azules extraídas']];
    return `${heading('La bolsa se abrió.', 'Tu veredicto, tus pistas y las matemáticas que las explican.')}
<section class="panel page-content"><div class="results-title"><div class="trophy">♜</div><h2>${esc(name)}, esto es lo que había dentro</h2>
<p class="subtitle">${s.rounds} rondas · ${replace ? 'Con devolución' : 'Sin devolución'} · ${total} canicas iniciales</p></div>
<div class="banner ${G.verdict(game).level === 'far' ? 'loss' : ''}"><b>${G.verdict(game).text}</b><br>Dijiste ${game.guess} rojas; había ${red} rojas y ${blue} azules.</div>
<div class="stats-grid">${cards.map(([n, l]) => `<div class="metric"><strong>${n}</strong><span>${l}</span></div>`).join('')}</div>
${comparison(game)}
<button class="btn" data-action="explain" aria-expanded="${state.explaining}">${state.explaining ? 'Ocultar' : 'Mostrar'} explicación de resultados ${state.explaining ? '−' : '+'}</button>${explanation}
<h2 style="font-size:18px;margin-top:28px">Fórmulas utilizadas en esta partida</h2>
<div class="formula"><code>P(roja inicial) = ${red}/${total} = ${M.pct(p.red)}<br>P(azul inicial) = 1 − ${num(p.red, 4)} = ${M.pct(p.blue)}<br>Frecuencia roja = ${s.red}/${s.rounds} = ${M.pct(s.redFrequency)}<br>Frecuencia azul = ${s.blue}/${s.rounds} = ${M.pct(s.blueFrequency)}<br>Aciertos = (${s.correct}/${s.rounds}) × 100 = ${M.pct(s.accuracy)}</code></div>
<div class="form-actions"><button class="btn primary" data-view="config">Preparar otra bolsa</button><button class="btn" data-action="restart">Otra bolsa</button><button class="text-btn" data-view="inicio">Volver al menú</button></div></section>`;
  }

  const api = { howView, formulasView, statsView, resultsView };
  if (isNode) module.exports = api;
  else (ns.views = ns.views || {}).pages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
