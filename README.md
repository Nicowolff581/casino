# Casino Nico

Casino de práctica con **fichas de mentira**: sin dinero real, pagos, depósitos ni compras.

## Cómo abrirlo
Haz doble clic en `index.html` (te lleva a `public/index.html`, que es el casino). No hay que instalar nada.
En internet se publica con Cloudflare (gratis): ver `wrangler.jsonc`.

Para probarlo con el servidor (necesario para «Jugar con amigos»), en una terminal con Node:

```
npm install
npm run dev -- --ip 0.0.0.0
```

y abre `http://localhost:8787`.

## Jugar con amigos (Texas Hold'em, Ruleta y Blackjack en línea)
- Salas privadas de 2 a 6 jugadores con un código de 6 letras o un enlace `…/#sala=CÓDIGO`.
- Cada jugador entra solo con apodo y avatar: no se pide ningún dato personal.
- El servidor (un «Durable Object» de Cloudflare por sala) baraja y reparte; a cada jugador le manda solo sus cartas.
- Todos empiezan con las mismas fichas de la sala, separadas del saldo personal; no se pueden pasar entre jugadores.
- Si alguien recarga o pierde la conexión, vuelve a su asiento (el navegador guarda un «pase» de la sala).
- Tiempo límite por turno (15, 30 o 60 s); con 2 turnos vencidos seguidos el jugador queda «ausente».
- Ruleta en línea: todos apuestan al mismo giro con fichas de su color; el número se sortea antes de las apuestas y se muestra su huella (SHA-256), que se comprueba al final.
- Blackjack en línea: todos contra el mismo crupier, por turnos; zapato de 6 barajas mezclado antes de apostar con su huella (SHA-256), que se comprueba al final. Devuelve ≈99 % con estrategia básica.

## Cómo está organizado
- `public/`: todo lo que se publica en internet.
- `public/index.html`: la página.
- `public/css/base.css`: colores, estructura, botones. `css/juegos.css`: el aspecto de cada juego.
- `public/js/nucleo.js`: azar justo, saldo, apuestas y mensajes (lo que comparten todos los juegos).
- `public/js/sonido.js`: sonidos generados con Web Audio. `public/js/fiesta.js`: celebraciones.
- `public/js/reglas.js`: reglas y tablas de probabilidades (se calculan con los números de cada juego).
- `public/js/interfaz.js`: pantalla de inicio, ventana de reglas, panel de sonido y pantalla de carga.
- `public/js/cartas.js`: baraja y dibujo de cartas.
- `public/js/juegos/`: un archivo por juego (el tragamonedas y el avión separan su motor de resultados en `tragamonedas-motor.js` y `avion-motor.js`; el Plinko, su física en `plinko-fisica.js`).
- `public/muestras/estilos.html`: muestra de los 3 estilos visuales.
- `public/js/manos.js`: valor de las manos de póker y botes laterales (lo usan la página y el servidor).
- `public/js/amigos.js`: pantalla de «Jugar con amigos» (entrada, mesa, botones y reacciones).
- `servidor/worker.js`: el servidor en Cloudflare (salas para jugar con amigos).
- `servidor/poker.js`: el crupier del póker en línea (reglas, turnos, ciegas y botes laterales).
- `servidor/ruleta.js`: la ruleta en línea (rondas, apuestas, giro y pagos).
- `servidor/blackjack.js`: el blackjack en línea (apuestas, turnos, crupier y pagos).
- `public/js/ruleta-comun.js` y `public/js/avatares.js`: reglas de la ruleta y avatares (los usan la página y el servidor).
- `public/js/amigos-ruleta.js`: pantalla de la ruleta en línea. `public/js/amigos-blackjack.js`: pantalla del blackjack en línea.
- `public/js/blackjack-comun.js`: valor de las manos y pagos del blackjack (lo usan la página y el servidor).
- `casino-nico-original.html`: copia intacta de la versión original.
- `pruebas/probar.js`: prueba automática de reglas, pagos y consola (solo para desarrollo).
- `pruebas/simular-tragamonedas.js`: simula millones de jugadas del tragamonedas para medir cuánto devuelve.
- `pruebas/simular-plinko.js`: suelta 1 millón de bolas de Plinko con la misma física de la página y revisa casillas, devolución y choques.
- `pruebas/simular-avion.js`: simula 1 millón de vuelos del avión y los compara con el cálculo exacto (97 %).
- `pruebas/probar-poker-en-linea.mjs`: miles de manos del crupier en línea (fichas, turnos, privacidad, botes laterales).
- `pruebas/probar-en-linea.js`: 4 jugadores en 4 ventanas contra el servidor local (`npx wrangler dev --port 8790`).
- `pruebas/probar-ruleta-en-linea.mjs` y `pruebas/probar-ruleta-linea.js`: la ruleta en línea sin red y con 3 ventanas.
- `pruebas/probar-blackjack-en-linea.mjs` y `pruebas/probar-blackjack-linea.js`: el blackjack en línea sin red y con 3 ventanas.
