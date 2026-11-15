# El misterio de las canicas · v3

Juego de probabilidad con una bolsa sellada: no ves cuántas canicas hay de cada color. Apuestas, sacas, reúnes pistas y al final adivinas qué había dentro. La teoría vive en su propio menú.

## Cómo usarlo
- **Jugar:** abre `index.html` con doble clic (no necesita servidor; solo carga las fuentes de Google).
- **Pruebas:** `npm test` (Node 18 o superior, sin dependencias).

## Cómo se juega
1. **Eliges cuántas canicas rojas y cuántas azules** van en la bolsa (por ejemplo, un profesor o un amigo prepara la bolsa y pasa el turno), y cuántas se sacarán. O marcas "sortear al azar" para jugar solo: entonces solo eliges el total y el reparto queda en secreto para todos.
2. Cada ronda apuestas por roja o azul sin ver ninguna probabilidad; una mano saca la canica.
3. La **libreta** solo anota lo que ha salido. Con devolución la bolsa no cambia; sin devolución, lo que queda sí.
4. Al terminar, adivinas cuántas rojas guardaba la bolsa (exacto, cerca o lejos).
5. Se abre la bolsa: **Resultados** y el menú **Probabilidad** muestran entonces la probabilidad real y las fórmulas aplicadas. Antes de eso, ninguna pantalla revela el reparto ni la teoría de tu bolsa (hay una prueba que lo comprueba).

## Estructura
```
index.html
css/styles.css, css/misterio.css   estilos base + tema nocturno (variables y escena)
js/math.js      funciones puras (probabilidad, validación, secretRed, resumen)
js/game.js      reglas: idle → predicting → drawing → revealed → guessing → solved
js/store.js     único estado mutable, acciones y persistencia (sessionStorage)
js/views/       play.js (juego) · config.js (preparar bolsa) · pages.js (cómo jugar, libreta, probabilidad, resultados)
js/app.js       rutas por hash, render, foco y eventos
tests/          35 pruebas
```
