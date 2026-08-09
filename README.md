# El Impostor 🕵️

Juego de fiesta para **un solo móvil**. Todos los jugadores conocen la palabra secreta…
todos menos el impostor. Hay que descubrirlo antes de que él descubra la palabra.

Sin instalación, sin registro y **sin internet**: son tres archivos estáticos.

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
index.html   Pantallas del juego
styles.css   Estilos (tema oscuro, pensado para móvil)
app.js       Lógica: reparto, temporizador, votación y resultado
words.js     Bancos de palabras y pistas
```

## Publicarlo

Al ser estático vale cualquier hosting (GitHub Pages, Netlify, Vercel) o abrirlo
directamente desde el archivo. Para probarlo en red local:

```bash
python3 -m http.server 8000
```
