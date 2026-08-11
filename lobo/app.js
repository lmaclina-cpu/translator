/* ══════════════════════════════════════════════════════════
   HOMBRES LOBO — lógica de la partida
   La app hace de ayudante del narrador: reparte, canta la
   noche, registra lo que decide cada rol y calcula quién
   muere al amanecer.
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
  counts: {},
  timer: 180
};

let game = null;
let dealIdx = 0;
let cardState = 'down';
let steps = [];
let stepIdx = 0;
let timer = { left: 0, id: null, running: false };

/* ── Guardado de ajustes ───────────────────────────────── */
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

function has(roleId) { return (settings.counts[roleId] || 0) > 0; }

/* ¿Este jugador cuenta como lobo ahora mismo? Tiene en cuenta a los
   infectados, al perro-lobo y al niño salvaje transformado. */
function isWolfSide(i) {
  const p = game.players[i];
  const role = ROLE_BY_ID[p.roleId];
  if (game.infected.includes(i)) return true;
  if (p.roleId === 'perro-lobo') return game.dogChoice === 'lobo';
  if (p.roleId === 'nino-salvaje') return game.wildTurned;
  return role.team === 'lobos' || role.id === 'lobo-blanco';
}

function aliveIdx() {
  return game.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
}

/* Índices de un rol concreto (por ejemplo, para el lobo blanco) */
function aliveWolves() {
  return aliveIdx().filter((i) => isWolfSide(i));
}

/* ── Recuentos de la configuración ─────────────────────── */
function assignedCount() {
  return Object.entries(settings.counts)
    .filter(([id]) => id !== 'aldeano')
    .reduce((sum, [, n]) => sum + n, 0);
}

function wolfCount() {
  return Object.entries(settings.counts).reduce((sum, [id, n]) => {
    const role = ROLE_BY_ID[id];
    if (!role) return sum;
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
  if (role.step && next % role.step !== 0) next = next > cur ? role.step : 0;
  if (next === 0) delete settings.counts[role.id];
  else settings.counts[role.id] = next;
  saveSettings();
  renderRoles();
}

function applyPreset() {
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

/* ── Empezar partida ───────────────────────────────────── */
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
    day: 1,
    lovers: null,
    model: null,
    wildTurned: false,
    dogChoice: null,
    infected: [],
    charmed: [],
    witch: { life: true, death: true },
    ancianoSurvived: false,
    idiotaRevealed: false,
    lastProtected: null,
    tonight: {},
    log: []
  };

  dealIdx = 0;
  saveSettings();
  renderDeal();
  show('deal');
}

/* ── Reparto de cartas ─────────────────────────────────── */
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
    renderLynch();
    if (settings.timer > 0 && timer.left === 0) { resetTimer(); startTimer(); }
  }
  if (tab === 'players') renderTable();
}

/* ── Pasos de la noche ─────────────────────────────────── */
/* Cada paso puede pedir al narrador que registre una decisión.
   input.kind dice qué control se pinta debajo del texto. */
function buildSteps() {
  const n = game.night;
  game.tonight = {};

  const inputs = {
    ladron:       { kind: 'none' },
    cupido:       { kind: 'players', key: 'cupid', max: 2, label: 'Los dos enamorados' },
    hermanas:     { kind: 'none' },
    hermanos:     { kind: 'none' },
    'perro-lobo': { kind: 'choice', key: 'dog', label: '¿Qué elige?',
                    options: [{ v: 'aldeano', t: '🏡 Aldeano' }, { v: 'lobo', t: '🐺 Hombre lobo' }] },
    'nino-salvaje': { kind: 'players', key: 'wild', max: 1, label: 'Su modelo' },
    juez:         { kind: 'none' },
    salvador:     { kind: 'players', key: 'guard', max: 1, label: 'A quién protege',
                    exclude: () => (game.lastProtected != null ? [game.lastProtected] : []) },
    vidente:      { kind: 'seer', key: 'seer', label: 'A quién mira' },
    zorro:        { kind: 'fox', key: 'fox', max: 3, label: 'Los tres que señala' },
    lobo:         { kind: 'players', key: 'wolves', max: 1, label: 'A quién devoran' },
    'padre-lobos':{ kind: 'toggle', key: 'infect', label: 'Infectar a la víctima en vez de devorarla' },
    'lobo-blanco':{ kind: 'players', key: 'whitewolf', max: 1, label: 'A qué lobo devora',
                    only: () => aliveWolves() },
    bruja:        { kind: 'witch' },
    flautista:    { kind: 'players', key: 'piper', max: 2, label: 'A quiénes encanta' }
  };

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
      note: r.night.first ? 'Solo la primera noche.' : (r.night.alt ? 'Solo las noches pares.' : null),
      input: inputs[r.id] || { kind: 'none' }
    }));

  if (n === 1 && has('cupido')) {
    roleSteps.push({
      order: 11.5, emoji: '💞', title: 'Los enamorados',
      text: 'Los dos enamorados abren los ojos, se reconocen y vuelven a dormirse.',
      note: 'Solo la primera noche.', input: { kind: 'lovers' }
    });
  }
  if (has('nina')) {
    roleSteps.push({
      order: 59, emoji: '👧', title: 'Ojo con la niña',
      text: 'Recuerda: la niña puede estar espiando durante el turno de los lobos. Si la pillan, muere.',
      note: 'Aviso para el narrador, no digas nada en voz alta.', input: { kind: 'none' }
    });
  }

  steps = [
    { ...NIGHT_OPEN, input: { kind: 'none' } },
    ...roleSteps.sort((a, b) => a.order - b.order),
    { ...NIGHT_CLOSE, input: { kind: 'dawn' } }
  ];
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
  $('#btn-step-next').textContent = stepIdx === steps.length - 1 ? 'Confirmar y amanecer ▸' : 'Siguiente ▸';
  renderStepInput(s);
}

/* ── Controles para registrar decisiones ───────────────── */
function pickerHTML(label) {
  return `<p class="pick-label">${label}</p><div class="pick-grid"></div>`;
}

/* Rejilla de nombres seleccionables */
function buildPicker(box, { candidates, selected, max, onChange }) {
  const grid = box.querySelector('.pick-grid');
  grid.innerHTML = '';
  candidates.forEach((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick-chip' + (selected.includes(i) ? ' on' : '');
    b.textContent = game.players[i].name;
    b.addEventListener('click', () => {
      const at = selected.indexOf(i);
      if (at >= 0) selected.splice(at, 1);
      else {
        if (selected.length >= max) selected.shift();
        selected.push(i);
      }
      onChange(selected.slice());
    });
    grid.appendChild(b);
  });
}

function renderStepInput(step) {
  const box = $('#step-input');
  box.innerHTML = '';
  const inp = step.input || { kind: 'none' };
  const t = game.tonight;

  if (inp.kind === 'none') return;

  /* Recordatorio de los enamorados ya elegidos */
  if (inp.kind === 'lovers') {
    const pair = t.cupid || [];
    box.innerHTML = pair.length === 2
      ? `<div class="answer ok">💞 ${game.players[pair[0]].name} y ${game.players[pair[1]].name}</div>`
      : `<div class="answer">Elige la pareja en el paso de Cupido.</div>`;
    return;
  }

  /* Al amanecer, el resumen calculado */
  if (inp.kind === 'dawn') { renderDawn(box); return; }

  /* La bruja tiene su propio panel */
  if (inp.kind === 'witch') { renderWitch(box); return; }

  /* Sí / no */
  if (inp.kind === 'toggle') {
    const on = !!t[inp.key];
    box.innerHTML = `<div class="opt-row">
      <button type="button" class="pick-chip wide${on ? ' on' : ''}">${on ? '☑' : '☐'} ${inp.label}</button>
    </div>`;
    box.querySelector('button').addEventListener('click', () => {
      t[inp.key] = !on;
      renderStepInput(step);
    });
    return;
  }

  /* Dos opciones fijas */
  if (inp.kind === 'choice') {
    box.innerHTML = `<p class="pick-label">${inp.label}</p><div class="opt-row"></div>`;
    const row = box.querySelector('.opt-row');
    inp.options.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick-chip' + (t[inp.key] === o.v ? ' on' : '');
      b.textContent = o.t;
      b.addEventListener('click', () => { t[inp.key] = o.v; renderStepInput(step); });
      row.appendChild(b);
    });
    return;
  }

  /* Vidente: al señalar, la app le enseña la carta */
  if (inp.kind === 'seer') {
    box.innerHTML = pickerHTML(inp.label) + '<div class="answer-slot"></div>';
    const sel = t.seer != null ? [t.seer] : [];
    buildPicker(box, {
      candidates: aliveIdx(), selected: sel, max: 1,
      onChange: (s) => { t.seer = s[0] ?? null; renderStepInput(step); }
    });
    const slot = box.querySelector('.answer-slot');
    if (t.seer != null) {
      const role = ROLE_BY_ID[game.players[t.seer].roleId];
      const wolf = isWolfSide(t.seer);
      slot.innerHTML = `<div class="answer ${wolf ? 'bad' : 'ok'}">
        ${role.emoji} ${game.players[t.seer].name} es <b>${role.name}</b>
        <small>Enséñale la carta en silencio.</small></div>`;
    }
    return;
  }

  /* Zorro: la app responde si hay lobo entre los tres */
  if (inp.kind === 'fox') {
    box.innerHTML = pickerHTML(inp.label) + '<div class="answer-slot"></div>';
    const sel = t.fox ? t.fox.slice() : [];
    buildPicker(box, {
      candidates: aliveIdx(), selected: sel, max: 3,
      onChange: (s) => { t.fox = s; renderStepInput(step); }
    });
    const slot = box.querySelector('.answer-slot');
    if (t.fox && t.fox.length) {
      const hit = t.fox.some((i) => isWolfSide(i));
      slot.innerHTML = `<div class="answer ${hit ? 'bad' : 'ok'}">
        ${hit ? '👍 Sí, hay al menos un lobo entre los tres.' : '👎 No hay ningún lobo. El zorro pierde su poder.'}</div>`;
    }
    return;
  }

  /* Rejilla normal de jugadores */
  if (inp.kind === 'players') {
    const candidates = inp.only ? inp.only() : aliveIdx();
    const excluded = inp.exclude ? inp.exclude() : [];
    const usable = candidates.filter((i) => !excluded.includes(i));
    box.innerHTML = pickerHTML(inp.label);
    const cur = t[inp.key];
    const sel = Array.isArray(cur) ? cur.slice() : (cur != null ? [cur] : []);
    if (!usable.length) {
      box.querySelector('.pick-grid').innerHTML = '<p class="hint">No hay a quién señalar.</p>';
      return;
    }
    buildPicker(box, {
      candidates: usable, selected: sel, max: inp.max,
      onChange: (s) => {
        t[inp.key] = inp.max > 1 ? s : (s[0] ?? null);
        renderStepInput(step);
      }
    });
    if (excluded.length) {
      const names = excluded.map((i) => game.players[i].name).join(', ');
      box.insertAdjacentHTML('beforeend', `<p class="pick-note">No puede repetir: ${names}</p>`);
    }
    return;
  }
}

/* Panel de la bruja: ve a la víctima y decide pociones */
function renderWitch(box) {
  const t = game.tonight;
  const victim = t.wolves;
  const victimName = victim != null ? game.players[victim].name : null;

  box.innerHTML = `
    <div class="answer">${victimName
      ? `🩸 Los lobos han elegido a <b>${victimName}</b>`
      : 'Los lobos todavía no han señalado a nadie.'}</div>
    <div class="witch-block" id="witch-life"></div>
    <div class="witch-block" id="witch-death"></div>`;

  /* Poción de vida */
  const life = $('#witch-life');
  if (!game.witch.life) {
    life.innerHTML = '<p class="pick-note">🧪 Poción de vida: ya la usó.</p>';
  } else if (victim == null) {
    life.innerHTML = '<p class="pick-note">🧪 Poción de vida: no hay víctima que salvar.</p>';
  } else {
    life.innerHTML = `<div class="opt-row">
      <button type="button" class="pick-chip wide${t.witchSave ? ' on' : ''}">
        ${t.witchSave ? '☑' : '☐'} 🧪 Salvar a ${victimName}</button></div>`;
    life.querySelector('button').addEventListener('click', () => {
      t.witchSave = !t.witchSave;
      renderWitch(box);
    });
  }

  /* Poción de muerte */
  const death = $('#witch-death');
  if (!game.witch.death) {
    death.innerHTML = '<p class="pick-note">☠️ Poción de muerte: ya la usó.</p>';
    return;
  }
  death.innerHTML = pickerHTML('☠️ Poción de muerte (opcional)');
  const sel = t.witchKill != null ? [t.witchKill] : [];
  buildPicker(death, {
    candidates: aliveIdx(), selected: sel, max: 1,
    onChange: (s) => { t.witchKill = s[0] ?? null; renderWitch(box); }
  });
}

/* ── Resolución del amanecer ───────────────────────────── */
/* Encadena las muertes: los enamorados caen juntos. Función pura:
   no toca el estado, solo calcula. */
function resolveCascade(seeds) {
  const dead = new Map();
  const queue = seeds.slice();
  while (queue.length) {
    const { i, cause } = queue.shift();
    if (i == null || dead.has(i) || !game.players[i].alive) continue;
    dead.set(i, cause);
    if (game.lovers && game.lovers.includes(i)) {
      const other = game.lovers.find((x) => x !== i);
      if (other != null && !dead.has(other) && game.players[other].alive) {
        queue.push({ i: other, cause: 'muere de pena por su enamorado' });
      }
    }
  }
  return dead;
}

/* Qué pasa esta noche, según lo registrado */
function computeDawn() {
  const t = game.tonight;
  const seeds = [];
  const notes = [];
  let infectedNow = null;

  const victim = t.wolves;
  if (victim == null) {
    notes.push('Los lobos no han señalado a nadie.');
  } else {
    const name = game.players[victim].name;
    const role = game.players[victim].roleId;
    if (t.infect) {
      infectedNow = victim;
      notes.push(`🩸 ${name} es infectado: sobrevive y pasa a ser hombre lobo.`);
    } else if (t.guard === victim) {
      notes.push(`🛡️ ${name} se salva: el salvador lo protegía.`);
    } else if (t.witchSave) {
      notes.push(`🧪 ${name} se salva: la bruja gastó la poción de vida.`);
    } else if (role === 'anciano' && !game.ancianoSurvived) {
      notes.push(`🪵 ${name} es el anciano y aguanta el primer ataque.`);
    } else {
      seeds.push({ i: victim, cause: 'devorado por los lobos' });
    }
  }

  if (t.witchKill != null) seeds.push({ i: t.witchKill, cause: 'envenenado por la bruja' });
  if (t.whitewolf != null) seeds.push({ i: t.whitewolf, cause: 'devorado por el lobo blanco' });
  if (t.hunterShot != null) seeds.push({ i: t.hunterShot, cause: 'abatido por el cazador' });

  const deaths = resolveCascade(seeds);

  /* ¿Muere el modelo del niño salvaje? */
  const model = game.model;
  if (model != null && deaths.has(model) && !game.wildTurned) {
    notes.push('🧒 Muere el modelo del niño salvaje: se convierte en hombre lobo.');
  }

  /* ¿Hay que preguntar por el disparo del cazador? */
  const hunterDead = [...deaths.keys()].find(
    (i) => game.players[i].roleId === 'cazador'
  );
  const needsHunter = hunterDead != null && t.hunterShot == null;

  return { deaths, notes, needsHunter, hunterDead, infectedNow };
}

function renderDawn(box) {
  const { deaths, notes, needsHunter, hunterDead } = computeDawn();

  const lines = [...deaths.entries()]
    .map(([i, cause]) => `<div class="death-row">💀 <b>${game.players[i].name}</b><span>${cause}</span></div>`)
    .join('');

  box.innerHTML = `
    <div class="dawn-box">
      <p class="pick-label">Esta noche</p>
      ${lines || '<div class="answer ok">🌤️ No ha muerto nadie.</div>'}
      ${notes.map((n) => `<p class="pick-note">${n}</p>`).join('')}
      <div class="hunter-slot"></div>
    </div>`;

  if (needsHunter) {
    const slot = box.querySelector('.hunter-slot');
    slot.innerHTML = `<div class="answer bad">🎯 Ha muerto el cazador (${game.players[hunterDead].name}): dispara antes de irse.</div>`
      + pickerHTML('A quién se lleva');
    const candidates = aliveIdx().filter((i) => !deaths.has(i));
    buildPicker(slot, {
      candidates, selected: [], max: 1,
      onChange: (s) => { game.tonight.hunterShot = s[0] ?? null; renderDawn(box); }
    });
  }

  $('#btn-step-next').disabled = false;
}

/* Aplica de verdad lo calculado y pasa al día */
function confirmDawn() {
  const t = game.tonight;
  const { deaths, infectedNow } = computeDawn();

  deaths.forEach((cause, i) => { game.players[i].alive = false; });

  if (infectedNow != null && !game.infected.includes(infectedNow)) game.infected.push(infectedNow);
  if (t.witchSave) game.witch.life = false;
  if (t.witchKill != null) game.witch.death = false;
  if (t.guard != null) game.lastProtected = t.guard;
  if (t.cupid && t.cupid.length === 2) game.lovers = t.cupid.slice();
  if (t.wild != null) game.model = t.wild;
  if (t.dog) game.dogChoice = t.dog;
  if (t.piper) t.piper.forEach((i) => { if (!game.charmed.includes(i)) game.charmed.push(i); });
  if (game.players.some((p, i) => p.roleId === 'anciano' && i === t.wolves) && !game.ancianoSurvived
      && !deaths.has(t.wolves)) {
    game.ancianoSurvived = true;
  }
  if (game.model != null && !game.players[game.model].alive) game.wildTurned = true;

  const lines = [...deaths.entries()].map(([i, cause]) => `${game.players[i].name} — ${cause}`);
  game.log.push({
    title: `Noche ${game.night}`,
    lines: lines.length ? lines : ['Nadie murió.']
  });

  game.tonight = {};
  $('#day-num').textContent = game.day;
  renderTable();
  switchTab('day');
}

function stepNext() {
  if (stepIdx < steps.length - 1) {
    stepIdx++;
    renderStep();
  } else {
    confirmDawn();
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

/* ── Día: votación ─────────────────────────────────────── */
let lynchPick = null;

function renderLynch() {
  const list = $('#lynch-list');
  const result = $('#lynch-result');
  list.innerHTML = '';
  result.innerHTML = '';

  const alive = aliveIdx();
  if (!alive.length) {
    list.innerHTML = '<p class="hint">No queda nadie vivo.</p>';
    return;
  }

  alive.forEach((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'p-row' + (lynchPick === i ? ' picked' : '');
    b.innerHTML = `<span class="p-state">${lynchPick === i ? '🗳️' : '🕯️'}</span><span class="p-name">${game.players[i].name}</span>`;
    b.addEventListener('click', () => { lynchPick = lynchPick === i ? null : i; renderLynch(); });
    list.appendChild(b);
  });

  if (lynchPick == null) return;

  const p = game.players[lynchPick];
  /* El idiota se salva del linchamiento, pero pierde el voto */
  if (p.roleId === 'idiota' && !game.idiotaRevealed) {
    result.innerHTML = `<div class="answer ok">🤪 <b>${p.name}</b> era el idiota del pueblo: revela su carta y se salva. A partir de ahora no puede votar.</div>`;
    result.insertAdjacentHTML('beforeend', '<button class="btn btn-main" id="btn-lynch-ok">Confirmar</button>');
    $('#btn-lynch-ok').addEventListener('click', () => {
      game.idiotaRevealed = true;
      game.log.push({ title: `Día ${game.day}`, lines: [`${p.name} se salvó: era el idiota del pueblo.`] });
      lynchPick = null;
      renderLynch();
      renderTable();
    });
    return;
  }

  const seeds = [{ i: lynchPick, cause: 'linchado por el pueblo' }];
  if (game.dayHunterShot != null) seeds.push({ i: game.dayHunterShot, cause: 'abatido por el cazador' });
  const deaths = resolveCascade(seeds);

  const rows = [...deaths.entries()]
    .map(([i, cause]) => `<div class="death-row">💀 <b>${game.players[i].name}</b><span>${cause}</span></div>`)
    .join('');
  result.innerHTML = `<div class="dawn-box"><p class="pick-label">Se llevará por delante</p>${rows}</div>`;

  if (p.roleId === 'anciano') {
    result.insertAdjacentHTML('beforeend',
      '<p class="pick-note">🪵 Era el anciano: por matarlo, todos los aldeanos pierden sus poderes.</p>');
  }

  const hunterDead = [...deaths.keys()].find((i) => game.players[i].roleId === 'cazador');
  if (hunterDead != null && game.dayHunterShot == null) {
    result.insertAdjacentHTML('beforeend',
      `<div class="answer bad">🎯 Muere el cazador (${game.players[hunterDead].name}): dispara antes de irse.</div>` + pickerHTML('A quién se lleva'));
    buildPicker(result, {
      candidates: aliveIdx().filter((i) => !deaths.has(i)), selected: [], max: 1,
      onChange: (s) => { game.dayHunterShot = s[0] ?? null; renderLynch(); }
    });
    return;
  }

  result.insertAdjacentHTML('beforeend', '<button class="btn btn-main" id="btn-lynch-ok">Confirmar muertes</button>');
  $('#btn-lynch-ok').addEventListener('click', () => {
    deaths.forEach((cause, i) => { game.players[i].alive = false; });
    if (game.model != null && !game.players[game.model].alive) game.wildTurned = true;
    game.log.push({
      title: `Día ${game.day}`,
      lines: [...deaths.entries()].map(([i, cause]) => `${game.players[i].name} — ${cause}`)
    });
    lynchPick = null;
    game.dayHunterShot = null;
    renderLynch();
    renderTable();
  });
}

/* ── Vivos y muertos ───────────────────────────────────── */
function renderTable() {
  const showRole = $('#opt-show-roles').checked;
  const list = $('#player-list');
  list.innerHTML = '';

  game.players.forEach((p, i) => {
    const role = ROLE_BY_ID[p.roleId];
    const team = TEAMS[role.team];
    const marks = [];
    if (game.lovers && game.lovers.includes(i)) marks.push('💞');
    if (game.charmed.includes(i)) marks.push('🎶');
    if (game.infected.includes(i)) marks.push('🩸');
    if (game.model === i) marks.push('🧒');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `p-row ${showRole ? team.color : ''}${p.alive ? '' : ' dead'}`;
    btn.innerHTML = `
      <span class="p-state">${p.alive ? '🕯️' : '💀'}</span>
      <span class="p-name">${p.name}${marks.length ? ` <span class="p-marks">${marks.join('')}</span>` : ''}</span>
      ${showRole ? `<span class="p-role">${role.emoji} ${role.name}</span>` : ''}`;
    btn.addEventListener('click', () => {
      game.players[i].alive = !game.players[i].alive;
      renderTable();
    });
    list.appendChild(btn);
  });

  const alive = aliveIdx();
  const wolves = alive.filter((i) => isWolfSide(i)).length;
  $('#counters').innerHTML = `
    <div class="counter"><b>${alive.length}</b><span>vivos</span></div>
    <div class="counter wolf"><b>${wolves}</b><span>lobos</span></div>
    <div class="counter town"><b>${alive.length - wolves}</b><span>resto</span></div>`;

  renderLog();
  renderWin();
}

function renderLog() {
  const box = $('#log-list');
  if (!game.log.length) {
    box.innerHTML = '<p class="hint">Todavía no ha pasado nada.</p>';
    return;
  }
  box.innerHTML = game.log.map((e) => `
    <div class="log-entry">
      <b>${e.title}</b>
      ${e.lines.map((l) => `<span>${l}</span>`).join('')}
    </div>`).join('');
}

function renderWin() {
  const alive = aliveIdx();
  const wolves = alive.filter((i) => isWolfSide(i)).length;
  const rest = alive.length - wolves;
  const banner = $('#win-banner');

  let text = null;
  const charmedAlive = alive.length > 0 && alive.every((i) => game.charmed.includes(i));

  if (alive.length === 0) text = '☠️ No queda nadie vivo. Nadie gana.';
  else if (has('flautista') && charmedAlive) text = '🎶 Todos los supervivientes están encantados: gana el flautista.';
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
    lynchPick = null;
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
