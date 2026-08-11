/**
 * HOMBRES LOBO — catálogo de roles.
 *
 * team:   'lobos' | 'pueblo' | 'solitario' | 'ambiguo'
 * max:    cuántas copias se pueden meter en la partida
 * fixed:  número obligatorio (las hermanas van de 2 en 2, los hermanos de 3)
 * short:  una línea para la lista de configuración
 * desc:   qué hace, tal como se lo lee el jugador en su carta
 * night:  turno nocturno, si tiene
 *   order  posición en el orden de la noche
 *   text   lo que canta el narrador
 *   first  solo actúa la primera noche
 *   alt    actúa en noches alternas (pares)
 */

const TEAMS = {
  lobos:     { name: 'Hombres lobo', color: 'wolf',  emoji: '🐺' },
  pueblo:    { name: 'Pueblo',       color: 'town',  emoji: '🏡' },
  solitario: { name: 'En solitario', color: 'solo',  emoji: '🎯' },
  ambiguo:   { name: 'Sin bando fijo', color: 'amb', emoji: '❓' }
};

const ROLES = [
  /* ─────────────── LOBOS ─────────────── */
  {
    id: 'lobo', name: 'Hombre lobo', emoji: '🐺', team: 'lobos', max: 6, default: 2,
    short: 'Devora a un aldeano cada noche.',
    desc: 'Cada noche, junto a los demás lobos, elegís a un aldeano y lo devoráis. De día finges ser uno más del pueblo.',
    night: { order: 60, text: 'Los hombres lobo se despiertan, se reconocen y me señalan a su víctima de esta noche.' }
  },
  {
    id: 'lobo-blanco', name: 'Lobo blanco', emoji: '🌙', team: 'solitario', max: 1,
    short: 'Lobo traidor. Gana solo.',
    desc: 'Devoras con los lobos, pero solo ganas si acabas siendo el único supervivente. Cada dos noches puedes matar a un lobo.',
    night: { order: 70, alt: true, text: 'El lobo blanco se despierta. Puede señalar a un hombre lobo para devorarlo. (Solo las noches pares.)' }
  },
  {
    id: 'padre-lobos', name: 'Padre de los lobos', emoji: '🩸', team: 'lobos', max: 1,
    short: 'Una vez, infecta en vez de devorar.',
    desc: 'Una única vez en la partida, en lugar de devorar a la víctima, puedes infectarla: sobrevive y pasa a ser un hombre lobo.',
    night: { order: 65, text: 'El padre de los lobos puede infectar a la víctima en lugar de devorarla. Solo una vez por partida.' }
  },
  {
    id: 'perro-lobo', name: 'Perro-lobo', emoji: '🐕', team: 'ambiguo', max: 1,
    short: 'La primera noche elige bando.',
    desc: 'La primera noche decides si juegas como simple aldeano o como hombre lobo. Nadie más lo sabrá.',
    night: { order: 14, first: true, text: 'El perro-lobo se despierta y me indica con el pulgar si quiere ser aldeano o hombre lobo.' }
  },

  /* ─────────────── PUEBLO ─────────────── */
  {
    id: 'aldeano', name: 'Aldeano', emoji: '🏡', team: 'pueblo', max: 20, filler: true,
    short: 'Sin poderes. Su arma es la palabra.',
    desc: 'No tienes ningún poder especial. Tu fuerza está en debatir, deducir y votar bien.',
    night: null
  },
  {
    id: 'vidente', name: 'Vidente', emoji: '🔮', team: 'pueblo', max: 1, default: 1,
    short: 'Cada noche descubre una carta.',
    desc: 'Cada noche señalas a un jugador y el narrador te muestra en silencio su carta. Guarda el secreto: si te delatas, los lobos irán a por ti.',
    night: { order: 40, text: 'La vidente se despierta y me señala al jugador cuya carta quiere descubrir.' }
  },
  {
    id: 'bruja', name: 'Bruja', emoji: '🧪', team: 'pueblo', max: 1,
    short: 'Dos pociones: una salva, otra mata.',
    desc: 'Tienes una poción de vida para salvar a la víctima de los lobos y una de muerte para eliminar a alguien. Cada una se usa una sola vez, y puedes usar las dos la misma noche.',
    night: { order: 80, text: 'La bruja se despierta. Le muestro la víctima de los lobos. ¿Quiere usar la poción de vida? ¿Y la de muerte?' }
  },
  {
    id: 'cazador', name: 'Cazador', emoji: '🎯', team: 'pueblo', max: 1,
    short: 'Al morir, se lleva a alguien.',
    desc: 'Cuando mueras, por los lobos o por el pueblo, disparas tu último cartucho y te llevas contigo al jugador que elijas.',
    night: null
  },
  {
    id: 'cupido', name: 'Cupido', emoji: '💘', team: 'pueblo', max: 1,
    short: 'La primera noche crea una pareja.',
    desc: 'La primera noche eliges a dos jugadores y los enamoras. Si uno de los dos muere, el otro muere de pena. Puedes enamorarte a ti mismo.',
    night: { order: 11, first: true, text: 'Cupido se despierta y señala a los dos jugadores que quedan enamorados.' }
  },
  {
    id: 'nina', name: 'Niña', emoji: '👧', team: 'pueblo', max: 1,
    short: 'Puede espiar a los lobos.',
    desc: 'Mientras los lobos actúan puedes entreabrir los ojos y espiarlos. Cuidado: si te pillan mirando, los lobos te devoran en el acto.',
    night: null
  },
  {
    id: 'ladron', name: 'Ladrón', emoji: '🎭', team: 'pueblo', max: 1,
    short: 'Roba una de dos cartas sobrantes.',
    desc: 'La primera noche te enseñan dos cartas sobrantes y te quedas con una de ellas: ese será tu papel el resto de la partida. Si las dos son de lobo, estás obligado a elegir una.',
    night: { order: 10, first: true, text: 'El ladrón se despierta. Le muestro las dos cartas sobrantes y elige con cuál se queda.' },
    note: 'Necesita 2 cartas de más en el mazo: mete 2 jugadores «fantasma» o retira 2 aldeanos del reparto.'
  },
  {
    id: 'salvador', name: 'Salvador', emoji: '🛡️', team: 'pueblo', max: 1,
    short: 'Protege a alguien cada noche.',
    desc: 'Cada noche proteges a un jugador (puedes ser tú) del ataque de los lobos. No puedes proteger al mismo dos noches seguidas.',
    night: { order: 30, text: 'El salvador se despierta y señala al jugador que protege esta noche. No puede repetir.' }
  },
  {
    id: 'anciano', name: 'Anciano', emoji: '🪵', team: 'pueblo', max: 1,
    short: 'Aguanta el primer ataque de los lobos.',
    desc: 'Sobrevives al primer ataque de los lobos; hace falta un segundo para matarte. Pero si el pueblo te lincha, todos los aldeanos pierden sus poderes.',
    night: null
  },
  {
    id: 'chivo', name: 'Chivo expiatorio', emoji: '🐐', team: 'pueblo', max: 1,
    short: 'Muere en los empates.',
    desc: 'Si la votación del pueblo acaba en empate, mueres tú en lugar de los empatados. A cambio, al morir decides quién tiene derecho a votar al día siguiente.',
    night: null
  },
  {
    id: 'idiota', name: 'Idiota del pueblo', emoji: '🤪', team: 'pueblo', max: 1,
    short: 'Si lo linchan, se salva sin voto.',
    desc: 'Si el pueblo te vota, revelas tu carta y te salvas: no mueres. Pero pierdes el derecho a votar el resto de la partida.',
    night: null
  },
  {
    id: 'juez', name: 'Juez venerable', emoji: '⚖️', team: 'pueblo', max: 1,
    short: 'Puede forzar una segunda votación.',
    desc: 'Una vez en la partida puedes provocar una segunda votación inmediata. La primera noche acuerdas con el narrador una señal secreta para pedirla.',
    night: { order: 16, first: true, text: 'El juez venerable se despierta y acordamos la señal secreta para pedir una segunda votación.' }
  },
  {
    id: 'caballero', name: 'Caballero de la espada oxidada', emoji: '⚔️', team: 'pueblo', max: 1,
    short: 'Su muerte infecta a un lobo.',
    desc: 'Si mueres devorado por los lobos, el primer hombre lobo a tu izquierda muere la noche siguiente por la infección de tu espada oxidada.',
    night: null
  },
  {
    id: 'zorro', name: 'Zorro', emoji: '🦊', team: 'pueblo', max: 1,
    short: 'Olfatea grupos de tres.',
    desc: 'Cada noche señalas a tres jugadores vecinos y el narrador te dice si hay al menos un lobo entre ellos. Si no hay ninguno, pierdes el poder.',
    night: { order: 50, text: 'El zorro se despierta y señala a tres jugadores contiguos. Le indico con el pulgar si hay algún lobo entre ellos.' }
  },
  {
    id: 'hermanas', name: 'Dos hermanas', emoji: '👯', team: 'pueblo', max: 2, step: 2,
    short: 'Se reconocen la primera noche.',
    desc: 'Sabéis quién es la otra hermana desde la primera noche. Sois aldeanas, pero con una aliada de confianza absoluta.',
    night: { order: 12, first: true, text: 'Las dos hermanas se despiertan, se reconocen en silencio y vuelven a dormirse.' }
  },
  {
    id: 'hermanos', name: 'Tres hermanos', emoji: '👬', team: 'pueblo', max: 3, step: 3,
    short: 'Se reconocen la primera noche.',
    desc: 'Sabéis quiénes son vuestros hermanos desde la primera noche. Sois aldeanos, pero vais de tres en tres.',
    night: { order: 13, first: true, text: 'Los tres hermanos se despiertan, se reconocen en silencio y vuelven a dormirse.' }
  },

  /* ─────────────── EN SOLITARIO ─────────────── */
  {
    id: 'flautista', name: 'Flautista', emoji: '🎶', team: 'solitario', max: 1,
    short: 'Encanta al pueblo. Gana solo.',
    desc: 'Cada noche encantas a dos jugadores. Ganas tú solo, sin lobos ni pueblo, si todos los supervivientes están encantados.',
    night: { order: 90, text: 'El flautista se despierta y señala a dos jugadores, que quedan encantados. Después les aviso de que lo están.' }
  },
  {
    id: 'angel', name: 'Ángel', emoji: '😇', team: 'solitario', max: 1,
    short: 'Gana si muere el primero.',
    desc: 'Ganas la partida si mueres en la primera votación del pueblo o en la primera noche. Si sobrevives, sigues jugando como simple aldeano.',
    night: null
  },
  {
    id: 'nino-salvaje', name: 'Niño salvaje', emoji: '🧒', team: 'ambiguo', max: 1,
    short: 'Si su modelo muere, se vuelve lobo.',
    desc: 'La primera noche eliges a un jugador como modelo. Mientras viva, eres aldeano. Si muere, te conviertes en hombre lobo.',
    night: { order: 15, first: true, text: 'El niño salvaje se despierta y señala al jugador que será su modelo.' }
  }
];

/* Frases fijas del narrador, al abrir y cerrar la noche */
const NIGHT_OPEN = {
  order: 0,
  title: 'Cae la noche',
  emoji: '🌑',
  text: 'El pueblo se duerme. Todos cerráis los ojos y bajáis la cabeza. No hagáis ruido.'
};

const NIGHT_CLOSE = {
  order: 999,
  title: 'Amanece',
  emoji: '🌅',
  text: 'El pueblo se despierta. Contad lo que ha pasado esta noche y que empiece el debate.'
};

const ROLE_BY_ID = ROLES.reduce((acc, r) => { acc[r.id] = r; return acc; }, {});
