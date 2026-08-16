# El Impostor 🕵️

Juego de fiesta para **un solo móvil**. Todos los jugadores conocen la palabra secreta…
todos menos el impostor. Hay que descubrirlo antes de que él descubra la palabra.

Sin instalación, sin registro y **sin internet**: son archivos estáticos.

## Dos versiones

| | Versión | Para quién | Dónde |
|---|---|---|---|
| 🕵️ | **El Impostor** | Adultos. Incluye categoría picante (+18). | `/` → [lmaclina-cpu.github.io/translator/](https://lmaclina-cpu.github.io/translator/) |
| 🦖 | **El Impostor Peques** | Niños desde 8-10 años y familias. Sin contenido adulto. | `/peques/` → [.../peques/](https://lmaclina-cpu.github.io/translator/peques/) |
| 🐺 | **Hombres Lobo** | Grupos de 5 a 20 con un narrador. Otro juego distinto. | `/lobo/` → [.../lobo/](https://lmaclina-cpu.github.io/translator/lobo/) |
| 🤐 | **Tabú** | Dos a cuatro equipos por turnos y a contrarreloj. Otro juego distinto. | `/tabu/` → [.../tabu/](https://lmaclina-cpu.github.io/translator/tabu/) |

Son **apps independientes**: cada una con su propio aspecto (oscura de neón la de
adultos, clara tipo pegatinas la de peques, pizarra y rojo teja la de lobos,
minimalista en blanco y negro la de tabú, que además trae tema claro y oscuro)
y sus propios ajustes guardados. Tocar una no afecta a las demás.

La de Hombres Lobo no es una variante del impostor: reparte los 22 roles del
juego de mesa, guía al narrador por el orden de la noche mostrando solo los
roles en juego, y lleva el registro de vivos y muertos.

La de Tabú tampoco: se juega por equipos, uno explica y los suyos adivinan
contra el reloj, con cinco palabras prohibidas por carta. Sus reglas y su banco
de cartas están más abajo, en su propia sección.

Lo que viene a continuación describe la versión de adultos del Impostor; la de
peques funciona exactamente igual y su banco de palabras está en
`peques/words.js`. El Tabú tiene [su propia sección](#tabú--tabu) más abajo.

## Cómo jugar

1. Abre `index.html` en el navegador (móvil o escritorio).
2. Configura la partida y pulsa **REPARTIR PALABRAS**.
3. Pasa el móvil: cada jugador toca la carta, ve su palabra en secreto y pulsa
   *«Ocultar y pasar»*.
4. Por turnos, cada uno dice **una sola palabra** relacionada con la secreta,
   sin ser demasiado obvio.
5. Debatid y votad. La app revela quién era quién.

## Opciones

| Opción | Detalle |
|---|---|
| **Jugadores** | De 3 a 10, con nombres personalizables (opcionales). |
| **Impostores** | 1, 2 o 3. Siempre quedan al menos 2 inocentes, así que con 3 jugadores el máximo es 1 y con 4 el máximo es 2. |
| **Los impostores se conocen** | Solo con 2+ impostores. Si está activo, cada impostor ve a sus cómplices; si no, sabe que hay más pero no quiénes. |
| **Pista al impostor** | Opcional. El impostor recibe una categoría vaga (ej. «Bebida», «Relación rara») para poder improvisar sin ir totalmente a ciegas. |
| **Categorías** | Se pueden combinar varias; el mazo se mezcla. |
| **Tiempo de debate** | Sin límite, 1, 2, 3 o 5 minutos, con pausa y reinicio. |

Los ajustes se guardan en el navegador, así que la siguiente partida arranca con
la misma configuración.

## Categorías incluidas

| Pack | Palabras | Contenido |
|---|---|---|
| 🎉 Divertidas | 100 | Cosas del día a día con retranca. |
| 🌶️ Picante **(+18)** | 100 | Sin filtros. Para grupos con confianza. |
| ⭐ Famosos y Pop | 100 | Personajes, pelis, series y videojuegos. |
| 🧩 Clásicas | 100 | Fáciles y aptas para todos los públicos. |

**Total: 400 palabras**, cada una con su pista asociada.

Todas son palabras reales de **una o dos palabras** como mucho (las de dos son
casi siempre nombres propios: *Bad Bunny*, *Sexo oral*, *Van Gogh*). Nada de
frases largas: si algo no se puede decir en una palabra, no entra en el banco.

## Añadir tus propias palabras

Edita `words.js`. Cada entrada tiene la palabra secreta (`w`) y la pista del
impostor (`p`):

```js
{ w: 'Karaoke', p: 'Micrófono' }
```

Para crear un pack nuevo, copia la estructura de uno existente dentro de `PACKS`;
aparecerá solo en la pantalla de configuración. Marca `adult: true` si quieres que
salga con la etiqueta **+18**.

## Tabú 🤐 (`/tabu/`)

Juego por equipos, también con un solo móvil. Uno explica una palabra a los
suyos **sin decir ninguna de las cinco palabras prohibidas** que salen en la
carta, y sin mímica ni «empieza por». Cada acierto suma un punto; cada palabra
prohibida que se escape, si el equipo rival la caza, resta uno.

### Cómo se juega

1. Configura equipos, tiempo y puntos, y pulsa **Empezar partida**.
2. Coge el móvil quien vaya a explicar y pulsa **Empezar turno**: arranca el reloj.
3. Con cada carta: **Acertada** si la adivinan, **Tabú** si se le escapa una
   prohibida, **Paso** para saltarla.
4. Si hay que parar (alguien ha visto la carta, suena el teléfono, lo que sea),
   **Cancelar** arriba a la izquierda congela el reloj y pregunta antes de nada.
5. Suena la bocina, se ve el resumen del turno y le toca al siguiente equipo.
6. Gana el primer equipo que llegue a los puntos fijados… pero la ronda se
   termina siempre, así que todos juegan el mismo número de turnos. Si hay
   empate arriba, se juega otra ronda.

### Opciones

| Opción | Detalle |
|---|---|
| **Equipos** | De 2 a 4, con nombres y color propio. |
| **Tiempo por turno** | 45 s, 1 min, 1:30 o 2 min. |
| **Puntos para ganar** | 10, 15, 20 o 30. |
| **Pases por turno** | Ninguno, 1, 3 o sin límite. Las cartas pasadas vuelven al mazo. |
| **Un tabú resta un punto** | Si se apaga, decir una prohibida solo anula la carta. |
| **Sonido** | Pitidos en los últimos 5 segundos y bocina al acabar. |
| **Categorías** | Se combinan varias en un solo mazo mezclado. |
| **Cancelar turno** | Pastilla pequeña arriba a la izquierda, lejos de los tres botones grandes. Pausa el reloj y pide confirmación; el turno no puntúa, sus cartas vuelven al mazo y repite el mismo equipo. |

El reloj se calcula sobre la hora de fin, no contando segundos: si se bloquea la
pantalla en mitad del turno, al volver el tiempo está donde tiene que estar.

La interfaz sigue el tema del sistema: claro y oscuro salen de los mismos
tokens de color, así que para cambiar la paleta basta con tocar las variables
de `:root` en `tabu/styles.css`.

### Cartas incluidas

| Pack | Cartas | Contenido |
|---|---|---|
| 🏠 Día a día | 80 | Casa, trabajo y cosas de todos los días. |
| 🍔 Comida y bebida | 60 | Platos, ingredientes y cosas de beber. |
| 🎬 Cine, música y famosos | 60 | Pelis, series, canciones y caras conocidas. |
| 🐾 Animales y naturaleza | 67 | Bichos, plantas y paisajes. |
| ⚽ Deporte y ocio | 50 | Deportes, juegos de mesa y gimnasio. |
| 🌍 Lugares y viajes | 45 | Ciudades, monumentos y cosas de viajar. |
| 💻 Tecnología | 40 | Cacharros, apps e internet. |
| 🧠 Difíciles | 45 | Palabras abstractas. Aquí se sufre. |
| 👷 Profesiones y oficios | 80 | A qué se dedica la gente. |
| 🔬 Ciencia y cuerpo | 80 | El cuerpo, el laboratorio y el espacio. |
| 🏛️ Historia y cultura | 80 | Personajes, arte, música clásica y letras. |
| 🔧 Motor y taller | 80 | Vehículos, máquinas y herramientas. |
| 🎉 Fiestas y costumbres | 80 | Celebraciones, manías y cosas de la calle. |

**Total: 847 cartas**, cada una con sus cinco palabras prohibidas.

### Añadir tus propias cartas

Edita `tabu/words.js`. Cada carta tiene la palabra (`w`) y las cinco prohibidas
(`t`):

```js
{ w: 'Karaoke', t: ['Cantar', 'Micrófono', 'Letra', 'Pantalla', 'Desafinar'] }
```

Siempre cinco, y sin repetir la palabra de la carta: sus derivados ya están
prohibidos por las reglas. Para crear un pack nuevo, copia la estructura de uno
existente dentro de `PACKS`; aparecerá solo en la pantalla de configuración.

## Estructura

```
index.html        Pantallas del juego (versión adultos)
styles.css        Estilos: tema oscuro de neón
app.js            Lógica: reparto, temporizador, votación y resultado
words.js          Bancos de palabras y pistas

peques/           Versión infantil, independiente
  index.html      Mismas pantallas, textos para peques
  styles.css      Estilos: tema claro tipo pegatinas
  app.js          Misma lógica, con su propio guardado
  words.js        400 palabras aptas para niños

lobo/             Hombres Lobo, juego distinto
  index.html      Portada, jugadores, roles, reparto y mesa
  styles.css      Estilos: pizarra, rojo teja y grano de imprenta
  app.js          Reparto, guía de la noche, día y control de muertos
  roles.js        Los 22 roles con sus reglas y su turno de noche

tabu/             Tabú, juego distinto
  index.html      Portada, ajustes, turno, carta, resumen y final
  styles.css      Estilos: minimalista, claro y oscuro por tokens
  app.js          Equipos, mazo, reloj, puntuación y marcador
  words.js        847 cartas con sus cinco palabras prohibidas
```

## Publicarlo

Al ser estático vale cualquier hosting (GitHub Pages, Netlify, Vercel) o abrirlo
directamente desde el archivo. Para probarlo en red local:

```bash
python3 -m http.server 8000
```
