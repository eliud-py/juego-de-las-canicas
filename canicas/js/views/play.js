/** views/play.js — Pantalla de juego. La composición de la bolsa NO aparece aquí. */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const ns = isNode ? null : (root.Marbles = root.Marbles || {});
  const M = isNode ? require('../math.js') : ns.math;
  const G = isNode ? require('../game.js') : ns.game;
  const { escapeHtml: esc, heading } = isNode ? require('./shared.js') : ns.views.shared;

  const dots = 10;

  /** Libreta: solo lo observado (pistas), nunca la teoría. */
  function notebook(game) {
    const s = M.summarize(game.history);
    const recent = game.history.slice(-dots).map((x) => {
      const n = x.color === 'red' ? 'Roja' : 'Azul';
      return `<i class="marble ${x.color}" title="${n}" aria-label="${n}"></i>`;
    }).join('');
    const empty = Array.from({ length: Math.max(0, Math.min(game.config.rounds, dots) - game.history.length) }, () => '<i class="empty-round"></i>').join('');
    return `<section class="panel side-panel"><div class="section-label"><h2>Libreta de pistas</h2></div>
<div class="metrics"><div class="metric"><strong class="red-text">${s.red}</strong><span>Rojas vistas</span></div><div class="metric"><strong class="blue-text">${s.blue}</strong><span>Azules vistas</span></div><div class="metric"><strong class="success">${s.correct}</strong><span>Aciertos</span></div><div class="metric"><strong>${s.rounds}</strong><span>Canicas sacadas</span></div></div>
<div class="history-line"><p>Últimas canicas</p><div class="history-dots">${recent}${empty}</div></div>
<p class="math-note">Observa, sospecha y deduce. La bolsa no dice cuántas hay de cada color.</p></section>`;
  }

  function scene(game) {
    const drawing = game.phase === 'drawing';
    const shown = game.phase === 'revealed' ? game.revealed : null;
    const left = game.phase === 'idle' ? game.config.total : game.bag.red + game.bag.blue;
    return `<div class="scene ${drawing ? 'drawing' : ''}"><span class="scene-tag">${game.config.replace ? 'La canica vuelve a la bolsa' : 'La canica no vuelve'}</span><div class="scene-floor"></div>
<div class="bag" role="img" aria-label="Bolsa sellada"><span class="bag-label">?</span></div>${shown ? `<i class="marble ${shown} floating" role="img" aria-label="Canica ${shown === 'red' ? 'roja' : 'azul'}"></i>` : ''}
<span class="bag-count">${left} canicas dentro, colores desconocidos</span></div>`;
  }

  function predictBody(game) {
    const busy = game.phase === 'drawing';
    return `<div class="question"><div class="question-label">Ronda ${G.currentRound(game)}</div><h3>La mano baja a la oscuridad de la bolsa.</h3><p>Sin ver nada, ¿qué color crees que sacará?</p></div>
<div class="choices"><button class="btn red-choice" data-draw="red" ${busy ? 'disabled' : 'data-autofocus'}><i class="marble red"></i><span class="choice-label">Apuesto por roja<small>una corazonada</small></span></button>
<button class="btn blue-choice" data-draw="blue" ${busy ? 'disabled' : ''}><i class="marble blue"></i><span class="choice-label">Apuesto por azul<small>una corazonada</small></span></button></div>
<p class="help">${busy ? 'La mano se mueve entre las canicas…' : 'Elige y la mano sacará una canica.'}</p>`;
  }

  function revealedBody(game) {
    const last = G.lastEntry(game);
    const name = last.color === 'red' ? 'roja' : 'azul';
    const result = `<div class="banner ${last.correct ? '' : 'loss'}"><b>${last.correct ? 'Tu instinto acertó.' : 'La bolsa te engañó.'}</b> Salió una canica ${name}.<br>Anótalo: cada canica es una pista sobre lo que hay dentro.</div>`;
    if (!G.isOver(game)) return `${result}<button class="btn primary" data-action="next" data-autofocus>Sacar otra canica</button>`;
    return `${result}<div class="banner"><b>Se acabaron las extracciones, ${esc(game.config.name)}.</b><br>Con las pistas de tu libreta, es hora de abrir la bolsa.</div><button class="btn primary" data-action="open-guess" data-autofocus>Resolver el misterio</button>`;
  }

  function guessBody(game) {
    const t = game.config.total;
    const s = M.summarize(game.history);
    const start = Math.round((s.redFrequency || 0.5) * t);
    return `<div class="question"><div class="question-label">Veredicto</div><h3>¿Cuántas canicas rojas guarda la bolsa?</h3><p>Sacaste ${s.red} rojas y ${s.blue} azules. En total hay ${t} canicas: tú decides cuántas son rojas.</p></div>
<div class="guess"><input type="range" id="guess" min="0" max="${t}" step="1" value="${start}" aria-label="Número de canicas rojas" data-autofocus><output id="guess-out"><b>${start}</b> rojas · <b>${t - start}</b> azules</output></div>
<button class="btn primary" data-action="solve">Abrir la bolsa</button>`;
  }

  function solvedBody(game) {
    const v = G.verdict(game);
    return `<div class="banner ${v.level === 'far' ? 'loss' : ''}"><b>${v.text}</b><br>Dijiste ${game.guess} rojas; la bolsa tenía ${game.config.red} rojas y ${game.config.blue} azules.</div>
<div class="choices"><button class="btn primary" data-view="results" data-autofocus>Ver el secreto explicado</button><button class="btn" data-action="restart">Otra bolsa</button></div>`;
  }

  function idleBody(game) {
    return `<div class="question"><div class="question-label">El misterio</div><h3>Una bolsa sellada, dos colores y ningún dato.</h3><p>Hay ${game.config.total} canicas dentro, pero no sabes cuántas son rojas. Predice cada canica, reúne pistas y descubre el secreto.</p></div>
<div class="choices"><button class="btn primary" data-action="quick" data-autofocus>Abrir la partida</button><button class="btn" data-view="config">Preparar otra bolsa</button></div>`;
  }

  function gameView(state) {
    const g = state.game || G.idleGame();
    const body = { idle: idleBody, predicting: predictBody, drawing: predictBody, revealed: revealedBody, guessing: guessBody, solved: solvedBody }[g.phase](g);
    const rounds = g.config.rounds;
    return `${heading('¿Qué esconde la <span class="red-text">bolsa</span>?', 'Saca canicas, sigue las pistas y descubre lo que no se ve.', true)}
<div class="layout"><section class="panel arena"><div class="arena-header"><h2>La bolsa sellada</h2><span class="round">Canica <strong>${g.phase === 'idle' ? 0 : G.currentRound(g)}</strong> de ${rounds}</span></div>
<div class="progress" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="${rounds}" aria-valuenow="${g.history.length}"><span style="width:${(g.history.length / rounds) * 100}%"></span></div>
<div class="arena-body">${scene(g)}${body}</div>
<div class="arena-footer"><button class="text-btn" data-action="restart">Empezar con otra bolsa</button><button class="text-btn" data-view="stats">Ver la libreta</button><button class="text-btn" data-view="formulas">Probabilidad y fórmulas</button></div></section>
<aside class="side">${notebook(g)}<div class="tip"><b>Un consejo</b>Las probabilidades y las fórmulas están en su propio menú. Pero no te dirán qué hay en esta bolsa hasta que la abras.</div></aside></div>`;
  }

  const api = { gameView };
  if (isNode) module.exports = api;
  else (ns.views = ns.views || {}).play = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
