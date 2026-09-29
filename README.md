# Casino Nico

Casino de práctica con **fichas de mentira**: sin dinero real, pagos, depósitos ni compras.

## Cómo abrirlo
Haz doble clic en `index.html` (te lleva a `public/index.html`, que es el casino). No hay que instalar nada.
En internet se publica con Cloudflare (gratis): ver `wrangler.jsonc`.

## Cómo está organizado
- `public/`: todo lo que se publica en internet.
- `public/index.html`: la página.
- `public/css/base.css`: colores, estructura, botones. `css/juegos.css`: el aspecto de cada juego.
- `public/js/nucleo.js`: azar justo, saldo, apuestas y mensajes (lo que comparten todos los juegos).
- `public/js/sonido.js`: sonidos generados con Web Audio. `public/js/fiesta.js`: celebraciones.
- `public/js/reglas.js`: reglas y tablas de probabilidades (se calculan con los números de cada juego).
- `public/js/interfaz.js`: pantalla de inicio, ventana de reglas, panel de sonido y pantalla de carga.
- `public/js/cartas.js`: baraja y dibujo de cartas.
- `public/js/juegos/`: un archivo por juego (el tragamonedas separa su motor de resultados en `tragamonedas-motor.js`).
- `public/muestras/estilos.html`: muestra de los 3 estilos visuales.
- `servidor/worker.js`: el servidor en Cloudflare (salas para jugar con amigos).
- `casino-nico-original.html`: copia intacta de la versión original.
- `pruebas/probar.js`: prueba automática de reglas, pagos y consola (solo para desarrollo).
- `pruebas/simular-tragamonedas.js`: simula millones de jugadas del tragamonedas para medir cuánto devuelve.
