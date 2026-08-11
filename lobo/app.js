/* ══════════════════════════════════════════════════════════
   HOMBRES LOBO — lógica de la partida
   La app hace de guía del narrador: reparte, canta la noche y
   lleva la cuenta de vivos y muertos.
   ══════════════════════════════════════════════════════════ */

const MIN_PLAYERS = 6;
const MAX_PLAYERS = 20;
const STORE_KEY = 'lobo.v1';
const FLIP_MS = 650;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const randInt = (n) => Math.floor(Math.random() * n);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Estado ────────────────────────────────────────────── */
const settings = {
  playerCount: 8,
  names: [],
  counts: {},       // { idRol: cuántos }
  timer: 180
};

let game = null;    // { players: [{name, roleId, alive}], night, day }
let dealIdx = 0;
let cardState = 'down';
let steps = [];
let stepIdx = 0;
let timer = { left: 0, id: null, running: false };

/* ── Guardado ──────────────────────────────────────────── */
function saveSettings() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch (e) { /* modo privado: se juega igual */ }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return;
    if (Number.isInteger(saved.playerCount)) {
      settings.playerCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, saved.playerCount));
    }
    if (Array.isArray(saved.names)) settings.names = saved.names.slice(0, MAX_PLAYERS);
    if (saved.counts && typeof saved.counts === 'object') {
      Object.entries(saved.counts).forEach(([id, n]) => {
        const role = ROLE_BY_ID[id];
        if (role && Number.isInteger(n) && n > 0) settings.counts[id] = Math.min(n, role.max);
      });
    }
    if (Number.isInteger(saved.timer)) settings.timer = saved.timer;
  } catch (e) { /* datos corruptos: valores por defecto */ }
}

/* ── Utilidades ────────────────────────────────────────── */
function playerName(i) {
  const n = (settings.names[i] || '').trim();
  return n || `Jugador ${i + 1}`;
}

function show(screen) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + screen).classList.add('active');
  window.scrollTo({ top: 0 });
}

/* Cuántas cartas especiales hay puestas (sin contar aldeanos de relleno) */
function assignedCount() {
  return Object.entries(settings.counts)
    .filter(([id]) => id !== 'aldeano')
    .reduce((sum, [, n]) => sum + n, 0);
}

function wolfCount() {
  return Object.entries(settings.counts).reduce((sum, [id, n]) => {
    const role = ROLE_BY_ID[id];
    if (!role) return sum;
    // El lobo blanco duerme con los lobos aunque gane solo
    if (role.team === 'lobos' || role.id === 'lobo-blanco') return sum + n;
    return sum;
  }, 0);
}

function ambiguousCount() {
  return Object.entries(settings.counts).reduce((sum, [id, n]) => {
    const role = ROLE_BY_ID[id];
    return role && role.team === 'ambiguo' ? sum + n : sum;
  }, 0);
}

/* ── Pantalla de jugadores ─────────────────────────────── */
function renderNames() {
  const list = $('#names-list');
  list.innerHTML = '';
  for (let i = 0; i < settings.playerCount; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 14;
    input.placeholder = `Jugador ${i + 1}`;
    input.value = settings.names[i] || '';
    input.autocomplete = 'off';
    input.addEventListener('input', () => {
      settings.names[i] = input.value;
      saveSettings();
    });
    list.appendChild(input);
  }
}

function renderPlayers() {
  $('#players-count').textContent = settings.playerCount;
  $('#players-minus').disabled = settings.playerCount <= MIN_PLAYERS;
  $('#players-plus').disabled = settings.playerCount >= MAX_PLAYERS;
  renderNames();
}

/* ── Pantalla de roles ─────────────────────────────────── */
const GROUP_ORDER = ['lobos', 'pueblo', 'solitario', 'ambiguo'];

function renderRoles() {
  const wrap = $('#roles-groups');
  wrap.innerHTML = '';

  GROUP_ORDER.forEach((teamId) => {
    const team = TEAMS[teamId];
    const roles = ROLES.filter((r) => r.team === teamId && !r.filler);
    if (!roles.length) return;

    const head = document.createElement('div');
    head.className = 'group-head';
    head.innerHTML = `<h3>${team.emoji} ${team.name}</h3><span>${
      teamId === 'lobos' ? 'ganan si igualan al pueblo'
      : teamId === 'pueblo' ? 'ganan si caen todos los lobos'
      : teamId === 'solitario' ? 'gana por su cuenta'
      : 'eligen bando al jugar'
    }</span>`;
    wrap.appendChild(head);

    roles.forEach((role) => {
      const n = settings.counts[role.id] || 0;
      const step = role.step || 1;
      const row = document.createElement('div');
      row.className = `role-row ${team.color}` + (n > 0 ? ' active' : '');
      row.innerHTML = `
        <span class="role-emoji">${role.emoji}</span>
        <span class="role-info">
          <b>${role.name}</b>
          <small>${role.short}</small>
          ${role.note && n > 0 ? `<span class="role-note">⚠ ${role.note}</span>` : ''}
        </span>
        <span class="role-count">
          <button data-act="minus" aria-label="Quitar ${role.name}"${n === 0 ? ' disabled' : ''}>−</button>
          <b class="${n === 0 ? 'zero' : ''}">${n}</b>
          <button data-act="plus" aria-label="Añadir ${role.name}"${n >= role.max ? ' disabled' : ''}>+</button>
        </span>`;

      row.querySelector('[data-act="minus"]').addEventListener('click', () => bumpRole(role, -step));
      row.querySelector('[data-act="plus"]').addEventListener('click', () => bumpRole(role, +step));
      wrap.appendChild(row);
    });
  });

  renderTally();
}

function bumpRole(role, delta) {
  const cur = settings.counts[role.id] || 0;
  let next = Math.max(0, Math.min(role.max, cur + delta));
  // Hermanas y hermanos van en bloque
  if (role.step && next % role.step !== 0) next = next > cur ? role.step : 0;
  if (next === 0) delete settings.counts[role.id];
  else settings.counts[role.id] = next;
  saveSettings();
  renderRoles();
}

function applyPreset() {
  // Reparto clásico: ~1 lobo por cada 4 jugadores, vidente, bruja y cazador
  const p = settings.playerCount;
  const wolves = Math.max(1, Math.round(p / 4));
  settings.counts = { lobo: wolves, vidente: 1 };
  if (p >= 8) settings.counts.bruja = 1;
  if (p >= 9) settings.counts.cazador = 1;
  if (p >= 11) settings.counts.cupido = 1;
  if (p >= 13) settings.counts.salvador = 1;
  saveSettings();
  renderRoles();
}

function renderTally() {
  const total = settings.playerCount;
  const assigned = assignedCount();
  const wolves = wolfCount();
  const amb = ambiguousCount();
  const filler = total - assigned;

  $('#tally-total').textContent = total;
  $('#tally-assigned').textContent = assigned;
  $('#tally-wolves').textContent = wolves;
  $('#tally-town').textContent = Math.max(0, total - wolves - amb);

  const msg = $('#tally-msg');
  const btn = $('#btn-deal');
  msg.classList.remove('bad');
  let problem = null;

  if (assigned > total) {
    problem = `Sobran ${assigned - total} cartas para ${total} jugadores.`;
  } else if (wolves === 0) {
    problem = 'Hace falta al menos un hombre lobo.';
  } else if (wolves >= total - wolves) {
    problem = 'Hay tantos lobos como aldeanos: el pueblo no tiene nada que hacer.';
  }

  if (problem) {
    msg.textContent = problem;
    msg.classList.add('bad');
    btn.disabled = true;
  } else {
    msg.textContent = filler > 0
      ? `Se rellenará con ${filler} aldeano${filler > 1 ? 's' : ''} sin poderes.`
      : 'Todas las plazas tienen carta especial.';
    btn.disabled = false;
  }
}

/* ── Reparto ───────────────────────────────────────────── */
function startGame() {
  const deck = [];
  Object.entries(settings.counts).forEach(([id, n]) => {
    for (let i = 0; i < n; i++) deck.push(id);
  });
  while (deck.length < settings.playerCount) deck.push('aldeano');

  const shuffled = shuffle(deck).slice(0, settings.playerCount);
  game = {
    players: shuffled.map((roleId, i) => ({ name: playerName(i), roleId, alive: true })),
    night: 1,
    day: 1
  };

  dealIdx = 0;
  saveSettings();
  renderDeal();
  show('deal');
}

function renderDeal() {
  const prog = $('#deal-progress');
  prog.innerHTML = '';
  game.players.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < dealIdx ? ' done' : i === dealIdx ? ' now' : '');
    prog.appendChild(dot);
  });

  $('#deal-name').textContent = game.players[dealIdx].name;
  $('#deal-pass').textContent = dealIdx === 0 ? 'Empieza mirando…' : 'Pásale el móvil a…';

  const card = $('#reveal-card');
  card.classList.remove('flipped', 'done', 'spinning', 'nudge');
  $('#reveal-back').innerHTML = '';
  cardState = 'down';
  $('#btn-deal-next').hidden = true;
}

function spin(card) {
  card.classList.remove('spinning');
  void card.offsetWidth;
  card.classList.add('spinning');
  setTimeout(() => card.classList.remove('spinning'), FLIP_MS);
  if (navigator.vibrate) navigator.vibrate(15);
}

function onCardClick() {
  if (cardState === 'down') revealCard();
  else if (cardState === 'up') coverCard();
  else nudgeCard();
}

function nudgeCard() {
  const card = $('#reveal-card');
  card.classList.remove('nudge');
  void card.offsetWidth;
  card.classList.add('nudge');
  setTimeout(() => card.classList.remove('nudge'), 400);
}

function revealCard() {
  const card = $('#reveal-card');
  const role = ROLE_BY_ID[game.players[dealIdx].roleId];
  const team = TEAMS[role.team];

  $('#reveal-back').innerHTML = `
    <div class="role-card-band ${team.color}">${team.name}</div>
    <div class="role-card-body">
      <div class="role-card-emoji">${role.emoji}</div>
      <div class="role-card-name">${role.name}</div>
      <div class="role-card-rule"></div>
      <p class="role-card-desc">${role.desc}</p>
      ${role.note ? `<p class="role-card-note">${role.note}</p>` : ''}
    </div>`;

  cardState = 'up';
  card.classList.add('flipped');
  spin(card);

  const btn = $('#btn-deal-next');
  btn.hidden = false;
  btn.textContent = 'Girar la carta';
}

function coverCard() {
  const card = $('#reveal-card');
  cardState = 'done';
  card.classList.remove('flipped');
  card.classList.add('done');
  spin(card);
  setTimeout(() => {
    if (cardState === 'done') $('#reveal-back').innerHTML = '';
  }, FLIP_MS);

  const btn = $('#btn-deal-next');
  btn.textContent = dealIdx === game.players.length - 1
    ? 'Todos listos · empezar la noche'
    : `Pasar a ${game.players[dealIdx + 1].name}`;
}

function nextDeal() {
  if (dealIdx < game.players.length - 1) {
    dealIdx++;
    renderDeal();
  } else {
    openTable('night');
    buildSteps();
  }
}

/* ── Mesa ──────────────────────────────────────────────── */
function openTable(tab) {
  show('table');
  switchTab(tab || 'night');
  renderTable();
}

function switchTab(tab) {
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
  $$('.tab-panel').forEach((p) => p.classList.toggle('on', p.id === 'panel-' + tab));
  if (tab === 'day') {
    renderLynchList();
    // Al empezar el día el reloj se pone en marcha solo; si ya corría, se respeta
    if (settings.timer > 0 && timer.left === 0) { resetTimer(); startTimer(); }
  }
  if (tab === 'players') renderTable();
}

/* Los pasos de esta noche, solo con los roles que están en juego */
function buildSteps() {
  const n = game.night;
  const inPlay = Object.keys(settings.counts).filter((id) => (settings.counts[id] || 0) > 0);

  const roleSteps = inPlay
    .map((id) => ROLE_BY_ID[id])
    .filter((r) => r && r.night)
    .filter((r) => (r.night.first ? n === 1 : true))
    .filter((r) => (r.night.alt ? n % 2 === 0 : true))
    .map((r) => ({
      order: r.night.order,
      emoji: r.emoji,
      title: r.name,
      text: r.night.text,
      note: r.night.first ? 'Solo la primera noche.' : (r.night.alt ? 'Solo las noches pares.' : null)
    }));

  // Los enamorados se reconocen después de que Cupido actúe
  if (n === 1 && (settings.counts.cupido || 0) > 0) {
    roleSteps.push({
      order: 11.5, emoji: '💞', title: 'Los enamorados',
      text: 'Los dos enamorados abren los ojos, se reconocen y vuelven a dormirse.',
      note: 'Solo la primera noche.'
    });
  }
  // Aviso de la niña justo antes del turno de los lobos
  if ((settings.counts.nina || 0) > 0) {
    roleSteps.push({
      order: 59, emoji: '👧', title: 'Ojo con la niña',
      text: 'Recuerda: la niña puede estar espiando durante el turno de los lobos. Si la pillan, muere.',
      note: 'Aviso para el narrador, no digas nada en voz alta.'
    });
  }

  steps = [NIGHT_OPEN, ...roleSteps.sort((a, b) => a.order - b.order), NIGHT_CLOSE];
  stepIdx = 0;
  renderStep();
}

function renderStep() {
  const s = steps[stepIdx];
  $('#night-num').textContent = game.night;
  $('#step-emoji').textContent = s.emoji;
  $('#step-title').textContent = s.title;
  $('#step-text').textContent = s.text;
  const note = $('#step-note');
  note.hidden = !s.note;
  note.textContent = s.note || '';
  $('#step-count').textContent = `Paso ${stepIdx + 1} de ${steps.length}`;
  $('#btn-step-prev').disabled = stepIdx === 0;
  $('#btn-step-next').textContent = stepIdx === steps.length - 1 ? 'Ir al día ▸' : 'Siguiente ▸';
}

function stepNext() {
  if (stepIdx < steps.length - 1) {
    stepIdx++;
    renderStep();
  } else {
    $('#day-num').textContent = game.day;
    switchTab('day');
  }
}

function stepPrev() {
  if (stepIdx > 0) { stepIdx--; renderStep(); }
}

function newNight() {
  game.night++;
  game.day++;
  stopTimer();
  timer.left = 0;
  buildSteps();
  switchTab('night');
}

/* ── Vivos y muertos ───────────────────────────────────── */
function playerRow(p, i, { showRole, onClick }) {
  const role = ROLE_BY_ID[p.roleId];
  const team = TEAMS[role.team];
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `p-row ${showRole ? team.color : ''}${p.alive ? '' : ' dead'}`;
  btn.innerHTML = `
    <span class="p-state">${p.alive ? '🕯️' : '💀'}</span>
    <span class="p-name">${p.name}</span>
    ${showRole ? `<span class="p-role">${role.emoji} ${role.name}</span>` : ''}`;
  btn.addEventListener('click', () => onClick(i));
  return btn;
}

function renderTable() {
  const showRole = $('#opt-show-roles').checked;
  const list = $('#player-list');
  list.innerHTML = '';
  game.players.forEach((p, i) => {
    list.appendChild(playerRow(p, i, {
      showRole,
      onClick: (idx) => { game.players[idx].alive = !game.players[idx].alive; renderTable(); renderWin(); }
    }));
  });

  const alive = game.players.filter((p) => p.alive);
  const wolves = alive.filter((p) => {
    const r = ROLE_BY_ID[p.roleId];
    return r.team === 'lobos' || r.id === 'lobo-blanco';
  }).length;

  $('#counters').innerHTML = `
    <div class="counter"><b>${alive.length}</b><span>vivos</span></div>
    <div class="counter wolf"><b>${wolves}</b><span>lobos</span></div>
    <div class="counter town"><b>${alive.length - wolves}</b><span>resto</span></div>`;

  renderWin();
}

function renderLynchList() {
  const list = $('#lynch-list');
  list.innerHTML = '';
  const alive = game.players.filter((p) => p.alive);
  if (!alive.length) {
    list.innerHTML = '<p class="hint">No queda nadie vivo.</p>';
    return;
  }
  game.players.forEach((p, i) => {
    if (!p.alive) return;
    list.appendChild(playerRow(p, i, {
      showRole: false,
      onClick: (idx) => {
        game.players[idx].alive = false;
        renderLynchList();
        renderTable();
      }
    }));
  });
}

function renderWin() {
  const alive = game.players.filter((p) => p.alive);
  const wolves = alive.filter((p) => {
    const r = ROLE_BY_ID[p.roleId];
    return r.team === 'lobos' || r.id === 'lobo-blanco';
  }).length;
  const rest = alive.length - wolves;
  const banner = $('#win-banner');

  let text = null;
  if (alive.length === 0) text = '☠️ No queda nadie vivo. Nadie gana.';
  else if (wolves === 0) text = '🏡 ¡No queda ningún lobo! Gana el pueblo.';
  else if (rest === 0) text = '🐺 Solo quedan lobos. Ganan los hombres lobo.';
  else if (wolves >= rest) text = '⚠️ Los lobos igualan o superan al resto: la próxima noche está decidida.';

  banner.hidden = !text;
  if (text) banner.textContent = text;
}

/* ── Reloj del día ─────────────────────────────────────── */
function renderTimerChips() {
  $$('#timer-chips .chip').forEach((c) => {
    c.classList.toggle('on', Number(c.dataset.timer) === settings.timer);
  });
  $('#timer-card').classList.toggle('hidden', settings.timer === 0);
}

function paintTimer() {
  const m = Math.floor(timer.left / 60);
  const s = timer.left % 60;
  const el = $('#timer-display');
  el.textContent = timer.left <= 0 ? '¡TIEMPO!' : `${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', timer.left <= 10 && timer.left > 0);
}

function tick() {
  timer.left--;
  paintTimer();
  if (timer.left <= 0) {
    stopTimer();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }
}

function startTimer() {
  if (timer.running || timer.left <= 0) return;
  timer.running = true;
  timer.id = setInterval(tick, 1000);
  $('#btn-timer-toggle').textContent = 'Pausar';
}

function stopTimer() {
  timer.running = false;
  clearInterval(timer.id);
  timer.id = null;
  $('#btn-timer-toggle').textContent = 'Seguir';
}

function resetTimer() {
  stopTimer();
  timer.left = settings.timer;
  paintTimer();
}

/* ── Eventos ───────────────────────────────────────────── */
function bind() {
  $$('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.go;
      if (target === 'setup') renderPlayers();
      if (target === 'roles') renderRoles();
      show(target);
    });
  });

  $('#players-minus').addEventListener('click', () => {
    if (settings.playerCount > MIN_PLAYERS) {
      settings.playerCount--;
      renderPlayers();
      saveSettings();
    }
  });
  $('#players-plus').addEventListener('click', () => {
    if (settings.playerCount < MAX_PLAYERS) {
      settings.playerCount++;
      renderPlayers();
      saveSettings();
    }
  });

  $('#btn-preset').addEventListener('click', applyPreset);
  $('#btn-clear').addEventListener('click', () => {
    settings.counts = {};
    saveSettings();
    renderRoles();
  });
  $('#btn-deal').addEventListener('click', startGame);

  $('#reveal-card').addEventListener('click', onCardClick);
  $('#btn-deal-next').addEventListener('click', () => {
    if (cardState === 'up') coverCard();
    else if (cardState === 'done') nextDeal();
  });

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#btn-step-next').addEventListener('click', stepNext);
  $('#btn-step-prev').addEventListener('click', stepPrev);
  $('#btn-new-night').addEventListener('click', newNight);
  $('#opt-show-roles').addEventListener('change', renderTable);
  $('#btn-restart').addEventListener('click', () => {
    stopTimer();
    game = null;
    renderPlayers();
    show('setup');
  });

  $$('#timer-chips .chip').forEach((c) => {
    c.addEventListener('click', () => {
      settings.timer = Number(c.dataset.timer);
      saveSettings();
      renderTimerChips();
      resetTimer();
      if (settings.timer > 0) startTimer();
    });
  });
  $('#btn-timer-toggle').addEventListener('click', () => {
    if (timer.running) stopTimer();
    else if (timer.left > 0) startTimer();
    else { resetTimer(); startTimer(); }
  });
  $('#btn-timer-reset').addEventListener('click', () => { resetTimer(); startTimer(); });
}

loadSettings();
if (!Object.keys(settings.counts).length) {
  settings.counts = { lobo: 2, vidente: 1, bruja: 1 };
}
bind();
renderPlayers();
renderTimerChips();
