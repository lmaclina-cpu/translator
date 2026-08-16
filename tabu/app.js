/* ══════════════════════════════════════════════════════════
   TABÚ — lógica del juego
   ══════════════════════════════════════════════════════════ */

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;
const STORE_KEY = 'tabu.settings.v1';
const TEAM_COLORS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)'];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ── Ajustes ───────────────────────────────────────────── */
const settings = {
  teamCount: 2,
  teamNames: [],
  seconds: 60,
  target: 20,
  skips: 3,        // -1 = sin límite
  penalty: true,
  sound: true,
  packs: ['cotidiano']
};

/* game:  { scores, hits, taboos, skips, turnIdx, round, deck, di }
   turn:  { team, card, results, skipsLeft, hits, taboos, skipped } */
let game = null;
let turn = null;
let clock = { endAt: 0, id: null, left: 0 };

/* ── Utilidades ────────────────────────────────────────── */
const randInt = (n) => Math.floor(Math.random() * n);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function teamName(i) {
  const n = (settings.teamNames[i] || '').trim();
  return n || `Equipo ${i + 1}`;
}

function teamColor(i) {
  return TEAM_COLORS[i % TEAM_COLORS.length];
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

function show(screen) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + screen).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function saveSettings() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch (e) { /* modo privado: se juega igual */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved !== 'object' || saved === null) return;
    if (Number.isInteger(saved.teamCount)) {
      settings.teamCount = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, saved.teamCount));
    }
    if (Array.isArray(saved.teamNames)) settings.teamNames = saved.teamNames.slice(0, MAX_TEAMS);
    if ([45, 60, 90, 120].includes(saved.seconds)) settings.seconds = saved.seconds;
    if ([10, 15, 20, 30].includes(saved.target)) settings.target = saved.target;
    if ([-1, 0, 1, 3].includes(saved.skips)) settings.skips = saved.skips;
    if (typeof saved.penalty === 'boolean') settings.penalty = saved.penalty;
    if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
    if (Array.isArray(saved.packs)) {
      const valid = saved.packs.filter((p) => PACKS[p]);
      if (valid.length) settings.packs = valid;
    }
  } catch (e) { /* datos corruptos: usamos los de por defecto */ }
}

/* ── Sonido ────────────────────────────────────────────── */
/* Pitidos generados al vuelo: nada de archivos, la app sigue siendo offline. */
let audioCtx = null;

function beep(freq, ms, vol) {
  if (!settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* sin audio: se juega igual */ }
}

/* Safari solo deja crear/reanudar el audio dentro de un gesto del usuario, así
   que se prepara al pulsar «¡EMPEZAR!», antes de que haga falta el primer pitido. */
function primeAudio() {
  if (!settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* sin audio: se juega igual */ }
}

const tickBeep = () => beep(880, 90, 0.06);
const buzzer = () => { beep(180, 700, 0.12); setTimeout(() => beep(140, 700, 0.12), 120); };
const vibrate = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

/* ── Configuración ─────────────────────────────────────── */
function renderNames() {
  const list = $('#names-list');
  list.innerHTML = '';
  for (let i = 0; i < settings.teamCount; i++) {
    const row = document.createElement('div');
    row.className = 'name-row';

    const dot = document.createElement('span');
    dot.className = 'name-dot';
    dot.style.background = teamColor(i);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = `Equipo ${i + 1}`;
    input.value = settings.teamNames[i] || '';
    input.autocomplete = 'off';
    input.addEventListener('input', () => {
      settings.teamNames[i] = input.value;
      saveSettings();
    });

    row.append(dot, input);
    list.appendChild(row);
  }
}

function renderTeams() {
  $('#teams-count').textContent = settings.teamCount;
  $('#teams-minus').disabled = settings.teamCount <= MIN_TEAMS;
  $('#teams-plus').disabled = settings.teamCount >= MAX_TEAMS;
  renderNames();
}

function deckSize() {
  return settings.packs.reduce((n, id) => n + (PACKS[id] ? PACKS[id].cards.length : 0), 0);
}

function renderPacks() {
  const list = $('#packs-list');
  list.innerHTML = '';
  Object.values(PACKS).forEach((pack) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pack' + (settings.packs.includes(pack.id) ? ' on' : '');
    btn.innerHTML = `
      <span class="pack-check" aria-hidden="true"></span>
      <span class="pack-txt">
        <b>${esc(pack.name)}</b>
        <small>${esc(pack.desc)}</small>
      </span>
      <span class="pack-count">${pack.cards.length}</span>`;
    btn.setAttribute('aria-pressed', settings.packs.includes(pack.id) ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const i = settings.packs.indexOf(pack.id);
      if (i >= 0) settings.packs.splice(i, 1);
      else settings.packs.push(pack.id);
      const on = settings.packs.includes(pack.id);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('#packs-warn').hidden = settings.packs.length > 0;
      renderDeckSize();
      saveSettings();
    });
    list.appendChild(btn);
  });
}

function renderDeckSize() {
  const n = deckSize();
  $('#deck-size').textContent = n
    ? `Mazo: ${n} de ${ALL_CARDS} cartas`
    : 'Mazo vacío';
}

function renderChips(sel, attr, value) {
  $$(sel + ' .chip').forEach((chip) => {
    chip.classList.toggle('on', Number(chip.dataset[attr]) === value);
  });
}

function renderSetup() {
  renderTeams();
  renderPacks();
  renderDeckSize();
  renderChips('#time-chips', 'time', settings.seconds);
  renderChips('#target-chips', 'target', settings.target);
  renderChips('#skip-chips', 'skip', settings.skips);
  $('#opt-penalty').checked = settings.penalty;
  $('#opt-sound').checked = settings.sound;
  $('#packs-warn').hidden = settings.packs.length > 0;
}

/* ── Mazo ──────────────────────────────────────────────── */
function buildDeck() {
  const pool = [];
  settings.packs.forEach((id) => {
    const pack = PACKS[id];
    if (!pack) return;
    pack.cards.forEach((card) => pool.push({ w: card.w, t: card.t, pack: pack.name }));
  });
  return shuffle(pool);
}

/* Saca la siguiente carta; si se agota el mazo, se rebaraja y sigue. */
function drawCard() {
  if (game.di >= game.deck.length) {
    game.deck = shuffle(game.deck);
    game.di = 0;
  }
  return game.deck[game.di++];
}

/* ── Partida ───────────────────────────────────────────── */
function newGame() {
  if (!settings.packs.length) {
    $('#packs-warn').hidden = false;
    return;
  }
  game = {
    scores: Array(settings.teamCount).fill(0),
    hits: Array(settings.teamCount).fill(0),
    taboos: Array(settings.teamCount).fill(0),
    skips: Array(settings.teamCount).fill(0),
    turnIdx: 0,
    round: 1,
    deck: buildDeck(),
    di: 0
  };
  saveSettings();
  renderTurnScreen();
  show('turn');
}

function renderScoreboard(el, opts) {
  const best = Math.max(...game.scores);
  el.innerHTML = '';
  game.scores
    .map((pts, i) => ({ pts, i }))
    .sort((a, b) => (opts && opts.sorted ? b.pts - a.pts : a.i - b.i))
    .forEach(({ pts, i }) => {
      const lead = pts === best && best > 0;
      const row = document.createElement('div');
      row.className = 'score-row' + (lead ? ' lead' : '');
      row.innerHTML = `
        <span class="dot" style="background:${teamColor(i)}"></span>
        <span>${esc(teamName(i))}</span>
        ${lead ? '<span class="tag">LÍDER</span>' : ''}
        <span class="pts">${pts}</span>`;
      el.appendChild(row);
    });
}

function renderTurnScreen() {
  const i = game.turnIdx;
  $('#round-tag').textContent = `Ronda ${game.round} · a ${settings.target} puntos`;
  $('#turn-team').innerHTML =
    `<span class="name-dot" style="background:${teamColor(i)}"></span>${esc(teamName(i))}`;
  renderScoreboard($('#turn-scores'));
}

/* ── Turno ─────────────────────────────────────────────── */
function startTurn() {
  primeAudio();
  turn = {
    team: game.turnIdx,
    results: [],
    skipsLeft: settings.skips,
    hits: 0,
    taboos: 0,
    skipped: 0,
    card: null
  };

  $('#play-team').textContent = teamName(turn.team);

  nextCard();
  paintTally();
  show('play');
  startClock();
}

function nextCard() {
  turn.card = drawCard();
  const word = $('#tabu-word');
  word.textContent = turn.card.w;
  word.classList.toggle('long', turn.card.w.length > 14);

  const list = $('#tabu-list');
  list.innerHTML = '';
  turn.card.t.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    list.appendChild(li);
  });

  // Reinicia la animación de entrada para que cada carta "aparezca".
  const card = $('.tabu-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';

  paintSkipButton();
}

function paintSkipButton() {
  const btn = $('#btn-skip');
  const label = $('#skip-label');
  if (settings.skips < 0) {
    btn.disabled = false;
    label.textContent = 'Paso';
  } else {
    btn.disabled = turn.skipsLeft <= 0;
    label.textContent = turn.skipsLeft > 0 ? `Paso (${turn.skipsLeft})` : 'Sin pases';
  }
}

function paintTally() {
  $('#play-tally').innerHTML =
    `<span class="t-ok">${turn.hits} ✓</span><span class="t-no">${turn.taboos} ×</span>`;
}

function resolveCard(kind) {
  if (!turn || !clock.id) return;    // el tiempo ya se acabó
  turn.results.push({ w: turn.card.w, kind });

  if (kind === 'ok') {
    turn.hits++;
    vibrate(20);
    beep(1200, 70, 0.05);
  } else if (kind === 'taboo') {
    turn.taboos++;
    vibrate([50, 40, 50]);
    beep(200, 200, 0.09);
  } else {
    turn.skipped++;
    if (settings.skips >= 0) turn.skipsLeft--;
    vibrate(12);
    // La carta saltada vuelve al final del mazo: puede reaparecer más tarde.
    game.deck.push(turn.card);
  }

  paintTally();
  nextCard();
}

/* ── Reloj ─────────────────────────────────────────────── */
function startClock() {
  stopClock();
  clock.left = settings.seconds;
  clock.endAt = Date.now() + settings.seconds * 1000;
  paintClock();
  clock.id = setInterval(tickClock, 100);
}

function stopClock() {
  clearInterval(clock.id);
  clock.id = null;
}

function tickClock() {
  const msLeft = Math.max(0, clock.endAt - Date.now());
  const secs = Math.ceil(msLeft / 1000);
  if (secs !== clock.left) {
    clock.left = secs;
    if (secs > 0 && secs <= 5) tickBeep();
  }
  paintClock(msLeft);
  if (msLeft <= 0) endTurn();
}

function paintClock(msLeft) {
  const ms = msLeft === undefined ? settings.seconds * 1000 : msLeft;
  const secs = Math.ceil(ms / 1000);
  const el = $('#play-timer');
  el.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  el.classList.toggle('low', secs <= 10);

  const fill = $('#time-bar');
  fill.style.transform = `scaleX(${ms / (settings.seconds * 1000)})`;
  fill.classList.toggle('low', secs <= 10);
}

/* ── Fin de turno ──────────────────────────────────────── */
function endTurn() {
  stopClock();
  buzzer();
  vibrate([300, 120, 300]);

  const points = turn.hits - (settings.penalty ? turn.taboos : 0);
  game.scores[turn.team] += points;
  game.hits[turn.team] += turn.hits;
  game.taboos[turn.team] += turn.taboos;
  game.skips[turn.team] += turn.skipped;

  renderSummary(points);
  show('summary');
}

function renderSummary(points) {
  $('#summary-sub').innerHTML = `Turno de <b>${esc(teamName(turn.team))}</b>`;

  const pts = $('#turn-points');
  pts.textContent = (points >= 0 ? '+' : '') + points;
  pts.classList.toggle('neg', points < 0);

  const parts = [`${turn.hits} acertada${turn.hits === 1 ? '' : 's'}`];
  parts.push(`${turn.taboos} tabú${turn.taboos === 1 ? '' : 's'}${settings.penalty ? ' (−1 cada uno)' : ' (sin penalización)'}`);
  if (turn.skipped) parts.push(`${turn.skipped} pasada${turn.skipped === 1 ? '' : 's'}`);
  $('#turn-breakdown').textContent = parts.join(' · ');

  const recap = $('#recap');
  recap.innerHTML = '';
  $('#recap-count').textContent = turn.results.length
    ? `${turn.results.length} carta${turn.results.length === 1 ? '' : 's'}`
    : '';
  if (!turn.results.length) {
    recap.innerHTML = '<p class="recap-empty">Ni una sola carta resuelta. Turno duro.</p>';
  } else {
    turn.results.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'recap-item ' + r.kind;
      const mark = r.kind === 'ok' ? '✓' : r.kind === 'taboo' ? '×' : '→';
      const tag = r.kind === 'ok' ? '+1' : r.kind === 'taboo' ? (settings.penalty ? '−1' : '0') : 'paso';
      item.innerHTML = `<span class="recap-mark">${mark}</span><span>${esc(r.w)}</span><span class="tag">${tag}</span>`;
      recap.appendChild(item);
    });
  }

  renderScoreboard($('#summary-scores'));

  // El botón cambia de texto si este es el último turno de la ronda.
  const last = game.turnIdx === settings.teamCount - 1;
  $('#btn-next-turn').textContent = last ? 'Cerrar ronda →' : 'Siguiente turno →';
}

/* Solo se gana al cerrar una ronda completa: todos juegan los mismos turnos. */
function nextTurn() {
  const roundOver = game.turnIdx === settings.teamCount - 1;
  if (roundOver) {
    const best = Math.max(...game.scores);
    const winners = game.scores.reduce((acc, p, i) => (p === best ? acc.concat(i) : acc), []);
    if (best >= settings.target && winners.length === 1) {
      endGame(winners[0]);
      return;
    }
    game.round++;
    game.turnIdx = 0;
  } else {
    game.turnIdx++;
  }
  renderTurnScreen();
  show('turn');
}

/* ── Final de partida ──────────────────────────────────── */
function endGame(winner) {
  const head = $('#end-head');
  if (winner === null) {
    head.innerHTML = `
      <p class="eyebrow">Partida terminada</p>
      <h2 class="result-title">Así quedó el marcador</h2>
      <p class="result-sub">La cortasteis en la ronda ${game.round}.</p>`;
  } else {
    head.innerHTML = `
      <p class="eyebrow">Fin de la partida</p>
      <h2 class="result-title win">Gana ${esc(teamName(winner))}</h2>
      <p class="result-sub">${game.scores[winner]} puntos en ${game.round} ronda${game.round === 1 ? '' : 's'}.</p>`;
  }

  renderScoreboard($('#end-scores'), { sorted: true });

  const stats = $('#end-stats');
  stats.innerHTML = '';
  const totalHits = game.hits.reduce((a, b) => a + b, 0);
  const totalTaboos = game.taboos.reduce((a, b) => a + b, 0);
  const totalSkips = game.skips.reduce((a, b) => a + b, 0);
  const rows = [
    ['Rondas jugadas', game.round],
    ['Palabras acertadas', totalHits],
    ['Palabras prohibidas dichas', totalTaboos],
    ['Cartas pasadas', totalSkips]
  ];
  const bestTeam = game.hits.indexOf(Math.max(...game.hits));
  if (totalHits > 0) rows.push(['Equipo más acertado', `${teamName(bestTeam)} (${game.hits[bestTeam]})`]);
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<span>${esc(label)}</span><b>${esc(value)}</b>`;
    stats.appendChild(row);
  });

  show('end');
}

/* ── Eventos ───────────────────────────────────────────── */
function bind() {
  $$('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.go;
      if (target === 'setup') renderSetup();
      show(target);
    });
  });

  $('#teams-minus').addEventListener('click', () => {
    if (settings.teamCount > MIN_TEAMS) {
      settings.teamCount--;
      renderTeams();
      saveSettings();
    }
  });

  $('#teams-plus').addEventListener('click', () => {
    if (settings.teamCount < MAX_TEAMS) {
      settings.teamCount++;
      renderTeams();
      saveSettings();
    }
  });

  const chipGroup = (sel, attr, key) => {
    $$(sel + ' .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        settings[key] = Number(chip.dataset[attr]);
        renderChips(sel, attr, settings[key]);
        saveSettings();
      });
    });
  };
  chipGroup('#time-chips', 'time', 'seconds');
  chipGroup('#target-chips', 'target', 'target');
  chipGroup('#skip-chips', 'skip', 'skips');

  $('#opt-penalty').addEventListener('change', (e) => {
    settings.penalty = e.target.checked;
    saveSettings();
  });
  $('#opt-sound').addEventListener('change', (e) => {
    settings.sound = e.target.checked;
    saveSettings();
  });

  $('#btn-start').addEventListener('click', newGame);
  $('#btn-go').addEventListener('click', startTurn);
  $('#btn-quit').addEventListener('click', () => endGame(null));

  $('#btn-ok').addEventListener('click', () => resolveCard('ok'));
  $('#btn-taboo').addEventListener('click', () => resolveCard('taboo'));
  $('#btn-skip').addEventListener('click', () => resolveCard('skip'));

  $('#btn-next-turn').addEventListener('click', nextTurn);
  $('#btn-rematch').addEventListener('click', newGame);

  // El reloj no para nunca: se calcula sobre la hora de fin, no contando ticks.
  // Si el navegador frena el temporizador con la pantalla apagada, al volver se
  // recalcula y, si ya se había acabado el tiempo, se cierra el turno.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !clock.id) return;
    tickClock();
  });
}

loadSettings();
bind();
renderSetup();
