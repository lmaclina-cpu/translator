/* ══════════════════════════════════════════════════════════
   EL IMPOSTOR · PEQUES — lógica del juego
   Misma mecánica que la versión adulta, con textos para peques
   y su propio guardado (no comparte ajustes con la otra app).
   ══════════════════════════════════════════════════════════ */

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const MAX_IMPOSTORS = 3;
const STORE_KEY = 'impostor.peques.v1';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ── Estado ────────────────────────────────────────────── */
const settings = {
  playerCount: 5,
  names: [],
  impostors: 1,
  hint: true,
  knowEachOther: false,
  packs: ['animales'],
  timer: 120
};

let round = null;
let dealIdx = 0;
let timer = { left: 0, id: null, running: false };

/* Estado de la carta del jugador actual:
   'down'  boca abajo, se puede girar
   'up'    girada, mostrando el resultado
   'done'  tapada otra vez y bloqueada: ya no se puede mirar */
let cardState = 'down';
const FLIP_MS = 650;

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

function playerName(i) {
  const n = (settings.names[i] || '').trim();
  return n || `Jugador ${i + 1}`;
}

function maxImpostorsFor(players) {
  // Siempre deben quedar al menos 2 jugadores que sí saben la palabra.
  return Math.max(1, Math.min(MAX_IMPOSTORS, players - 2));
}

function show(screen) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#screen-' + screen).classList.add('active');
  window.scrollTo({ top: 0 });
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
    if (Number.isInteger(saved.playerCount)) {
      settings.playerCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, saved.playerCount));
    }
    if (Array.isArray(saved.names)) settings.names = saved.names.slice(0, MAX_PLAYERS);
    if (Number.isInteger(saved.impostors)) settings.impostors = saved.impostors;
    if (typeof saved.hint === 'boolean') settings.hint = saved.hint;
    if (typeof saved.knowEachOther === 'boolean') settings.knowEachOther = saved.knowEachOther;
    if (Array.isArray(saved.packs)) {
      const valid = saved.packs.filter((p) => PACKS[p]);
      if (valid.length) settings.packs = valid;
    }
    if (Number.isInteger(saved.timer)) settings.timer = saved.timer;
  } catch (e) { /* datos corruptos: usamos los de por defecto */ }
  settings.impostors = Math.min(settings.impostors, maxImpostorsFor(settings.playerCount));
}

/* ── Configuración ─────────────────────────────────────── */
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
  renderImpostors();
}

function renderImpostors() {
  const max = maxImpostorsFor(settings.playerCount);
  if (settings.impostors > max) settings.impostors = max;
  $$('#impostors-chips .chip').forEach((chip) => {
    const n = Number(chip.dataset.imp);
    chip.disabled = n > max;
    chip.classList.toggle('on', n === settings.impostors);
  });
  const row = $('#know-row');
  const solo = settings.impostors < 2;
  row.classList.toggle('disabled', solo);
  $('#opt-know').checked = !solo && settings.knowEachOther;
}

function renderPacks() {
  const list = $('#packs-list');
  list.innerHTML = '';
  Object.values(PACKS).forEach((pack) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pack' + (settings.packs.includes(pack.id) ? ' on' : '');
    btn.innerHTML = `
      <span class="pack-emoji">${pack.emoji}</span>
      <span>
        <b>${pack.name}</b>
        <small>${pack.desc} · ${pack.words.length} palabras</small>
      </span>
      <span class="tick">✅</span>`;
    btn.addEventListener('click', () => {
      const i = settings.packs.indexOf(pack.id);
      if (i >= 0) settings.packs.splice(i, 1);
      else settings.packs.push(pack.id);
      btn.classList.toggle('on', settings.packs.includes(pack.id));
      $('#packs-warn').hidden = settings.packs.length > 0;
      saveSettings();
    });
    list.appendChild(btn);
  });
}

function renderTimer() {
  $$('#timer-chips .chip').forEach((chip) => {
    chip.classList.toggle('on', Number(chip.dataset.timer) === settings.timer);
  });
}

function renderSetup() {
  renderPlayers();
  renderPacks();
  renderTimer();
  $('#opt-hint').checked = settings.hint;
  $('#packs-warn').hidden = settings.packs.length > 0;
}

/* ── Ronda ─────────────────────────────────────────────── */
function pickWord() {
  const pool = [];
  settings.packs.forEach((id) => {
    const pack = PACKS[id];
    if (!pack) return;
    pack.words.forEach((entry) => pool.push({ ...entry, pack: pack.name, emoji: pack.emoji }));
  });
  return pool[randInt(pool.length)];
}

function startRound() {
  if (!settings.packs.length) {
    $('#packs-warn').hidden = false;
    return;
  }
  const entry = pickWord();
  const ids = shuffle([...Array(settings.playerCount).keys()]);

  round = {
    word: entry.w,
    hint: entry.p,
    packName: `${entry.emoji} ${entry.pack}`,
    impostorIdx: new Set(ids.slice(0, settings.impostors)),
    startIdx: randInt(settings.playerCount)
  };

  dealIdx = 0;
  saveSettings();
  renderDeal();
  show('deal');
}

/* ── Reparto ───────────────────────────────────────────── */
function renderDeal() {
  const prog = $('#deal-progress');
  prog.innerHTML = '';
  for (let i = 0; i < settings.playerCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < dealIdx ? ' done' : i === dealIdx ? ' now' : '');
    prog.appendChild(dot);
  }

  $('#deal-name').textContent = playerName(dealIdx);
  $('#deal-pass').textContent = dealIdx === 0 ? 'Empieza mirando…' : 'Ahora le toca a…';

  const card = $('#reveal-card');
  card.classList.remove('flipped', 'done', 'spinning', 'nudge');
  const back = $('#reveal-back');
  back.classList.remove('is-impostor');
  back.innerHTML = '';
  cardState = 'down';
  $('#btn-deal-next').hidden = true;
}

/* Anima el giro de la carta */
function spin(card) {
  card.classList.remove('spinning');
  void card.offsetWidth;          // reinicia la animación
  card.classList.add('spinning');
  setTimeout(() => card.classList.remove('spinning'), FLIP_MS);
  if (navigator.vibrate) navigator.vibrate(15);
}

/* Un toque en la carta: girar → tapar → bloqueada */
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
  const isImpostor = round.impostorIdx.has(dealIdx);
  const back = $('#reveal-back');
  back.classList.toggle('is-impostor', isImpostor);

  if (isImpostor) {
    let html = `
      <div class="impostor-mark">🦖</div>
      <div class="impostor-title">¡ERES EL IMPOSTOR!</div>`;
    if (settings.hint) {
      html += `<div class="hint-box">Pista: ${round.hint}</div>`;
    }
    if (settings.impostors > 1 && settings.knowEachOther) {
      const mates = [...round.impostorIdx]
        .filter((i) => i !== dealIdx)
        .map((i) => playerName(i));
      html += `<div class="mates">Contigo van: ${mates.join(', ')}</div>`;
    } else if (settings.impostors > 1) {
      html += `<div class="mates">Hay ${settings.impostors} impostores, ¡pero no sabes quiénes!</div>`;
    }
    html += `<div class="face-note">Disimula muy bien 😄</div>`;
    back.innerHTML = html;
  } else {
    back.innerHTML = `
      <div class="role-tag">Tu palabra secreta</div>
      <div class="secret-word">${round.word}</div>
      <div class="face-note">Di algo que tenga que ver, ¡pero sin chivarte!</div>`;
  }

  cardState = 'up';
  card.classList.add('flipped');
  spin(card);

  const btn = $('#btn-deal-next');
  btn.hidden = false;
  btn.textContent = 'Girar la carta 🔄';
}

/* La tapa otra vez. Ya no se puede volver a mirar. */
function coverCard() {
  const card = $('#reveal-card');
  cardState = 'done';
  card.classList.remove('flipped');
  card.classList.add('done');
  spin(card);

  // Se borra lo que ponía cuando la carta ya está de espaldas
  setTimeout(() => {
    if (cardState === 'done') $('#reveal-back').innerHTML = '';
  }, FLIP_MS);

  const btn = $('#btn-deal-next');
  btn.textContent = dealIdx === settings.playerCount - 1
    ? '¡Ya está! A hablar ▸'
    : `Pasar a ${playerName(dealIdx + 1)} ▸`;
}

function nextDeal() {
  if (dealIdx < settings.playerCount - 1) {
    dealIdx++;
    renderDeal();
  } else {
    startPlay();
  }
}

/* ── Debate ────────────────────────────────────────────── */
function startPlay() {
  $('#starter-name').textContent = playerName(round.startIdx);
  const orderNames = [];
  for (let k = 0; k < settings.playerCount; k++) {
    orderNames.push(playerName((round.startIdx + k) % settings.playerCount));
  }
  $('#turn-order').textContent = 'Turnos: ' + orderNames.join(' → ');

  const box = $('#timer-box');
  if (settings.timer > 0) {
    box.classList.remove('hidden');
    resetTimer();
    startTimer();
  } else {
    box.classList.add('hidden');
    stopTimer();
  }
  show('play');
}

function paintTimer() {
  const m = Math.floor(timer.left / 60);
  const s = timer.left % 60;
  const el = $('#timer-display');
  el.textContent = timer.left <= 0 ? '¡TIEMPO!' : `${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', timer.left <= 10);
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
  $('#btn-timer-toggle').textContent = 'Pausa';
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

/* ── Votación ──────────────────────────────────────────── */
function renderVote() {
  stopTimer();
  const list = $('#vote-list');
  list.innerHTML = '';
  for (let i = 0; i < settings.playerCount; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vote-btn';
    btn.textContent = `👉 ${playerName(i)}`;
    btn.addEventListener('click', () => showResult(i));
    list.appendChild(btn);
  }
  show('vote');
}

/* ── Resultado ─────────────────────────────────────────── */
function showResult(accused) {
  const head = $('#result-head');
  const total = round.impostorIdx.size;

  if (accused === null) {
    head.innerHTML = `
      <div class="result-emoji">🤷</div>
      <div class="result-title">NADIE FUERA</div>
      <div class="result-sub">${total > 1 ? '¡Los impostores se han salvado!' : '¡El impostor se ha salvado!'}</div>`;
  } else if (round.impostorIdx.has(accused)) {
    const restantes = total - 1;
    head.innerHTML = `
      <div class="result-emoji">🎯</div>
      <div class="result-title${restantes === 0 ? ' win' : ''}">¡PILLADO!</div>
      <div class="result-sub">${playerName(accused)} era impostor.${
        restantes > 0
          ? ` ¡Pero todavía quedan ${restantes} escondidos! 😱`
          : ' ¡Habéis ganado! 🎉'
      }</div>`;
  } else {
    head.innerHTML = `
      <div class="result-emoji">🙈</div>
      <div class="result-title lose">¡UPS!</div>
      <div class="result-sub">${playerName(accused)} no era. ${
        total > 1 ? 'Ganan los impostores.' : 'Gana el impostor.'
      }</div>`;
  }

  $('#result-word').textContent = round.word;
  $('#result-pack').textContent = `${round.packName}${settings.hint ? ` · pista: «${round.hint}»` : ''}`;
  $('#result-imp-title').textContent = total > 1 ? `Los ${total} impostores eran…` : 'El impostor era…';

  const box = $('#result-impostors');
  box.innerHTML = '';
  [...round.impostorIdx].sort((a, b) => a - b).forEach((i) => {
    const el = document.createElement('div');
    el.className = 'imp-item';
    el.innerHTML = `<span>🦖</span><span>${playerName(i)}</span>${
      i === accused ? '<span class="tagx">FUERA</span>' : ''
    }`;
    box.appendChild(el);
  });

  show('result');
}

/* ── Eventos ───────────────────────────────────────────── */
function bind() {
  $$('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.go;
      if (target === 'setup') renderSetup();
      if (target === 'vote') { renderVote(); return; }
      if (target === 'play' && settings.timer > 0) startTimer();
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

  $$('#impostors-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      settings.impostors = Number(chip.dataset.imp);
      renderImpostors();
      saveSettings();
    });
  });

  $$('#timer-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      settings.timer = Number(chip.dataset.timer);
      renderTimer();
      saveSettings();
    });
  });

  $('#opt-hint').addEventListener('change', (e) => {
    settings.hint = e.target.checked;
    saveSettings();
  });

  $('#opt-know').addEventListener('change', (e) => {
    settings.knowEachOther = e.target.checked;
    saveSettings();
  });

  $('#btn-start').addEventListener('click', startRound);
  $('#reveal-card').addEventListener('click', onCardClick);
  // El botón hace lo mismo que tocar la carta: primero taparla, luego pasar
  $('#btn-deal-next').addEventListener('click', () => {
    if (cardState === 'up') coverCard();
    else if (cardState === 'done') nextDeal();
  });
  $('#btn-no-vote').addEventListener('click', () => showResult(null));
  $('#btn-again').addEventListener('click', startRound);

  $('#btn-timer-toggle').addEventListener('click', () => {
    if (timer.running) stopTimer();
    else if (timer.left > 0) startTimer();
  });
  $('#btn-timer-reset').addEventListener('click', () => {
    resetTimer();
    startTimer();
  });
}

loadSettings();
bind();
renderSetup();
