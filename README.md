# El Impostor 🕵️

Juego de fiesta para **un solo móvil**. Todos los jugadores conocen la palabra secreta…
todos menos el impostor. Hay que descubrirlo antes de que él descubra la palabra.

Sin instalación, sin registro y **sin internet**: son archivos estáticos.

## Dos versiones

| | Versión | Para quién | Dónde |
|---|---|---|---|
| 🕵️ | **El Impostor** | Adultos. Incluye categoría picante (+18). | `/` → [lmaclina-cpu.github.io/translator/](https://lmaclina-cpu.github.io/translator/) |
| 🦖 | **El Impostor Peques** | Niños desde 8-10 años y familias. Sin contenido adulto. | `/peques/` → [.../peques/](https://lmaclina-cpu.github.io/translator/peques/) |
| 🐺 | **Hombres Lobo** | Grupos de 6 a 20 con un narrador. Otro juego distinto. | `/lobo/` → [.../lobo/](https://lmaclina-cpu.github.io/translator/lobo/) |

Son **apps independientes**: cada una con su propio aspecto (oscura de neón la de
adultos, clara tipo pegatinas la de peques, pizarra y rojo teja la de lobos) y
sus propios ajustes guardados. Tocar una no afecta a las demás.

La de Hombres Lobo no es una variante del impostor: reparte los 22 roles del
juego de mesa, guía al narrador por el orden de la noche mostrando solo los
roles en juego, y lleva el registro de vivos y muertos.

El resto de este README describe la versión de adultos; la de peques funciona
exactamente igual y su banco de palabras está en `peques/words.js`.

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
```

## Publicarlo

Al ser estático vale cualquier hosting (GitHub Pages, Netlify, Vercel) o abrirlo
directamente desde el archivo. Para probarlo en red local:

```bash
python3 -m http.server 8000
```
