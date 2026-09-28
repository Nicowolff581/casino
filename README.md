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
- `public/js/cartas.js`: baraja y dibujo de cartas.
- `public/js/juegos/`: un archivo por juego.
- `public/muestras/estilos.html`: muestra de los 3 estilos visuales.
- `servidor/worker.js`: el servidor en Cloudflare (salas para jugar con amigos).
- `casino-nico-original.html`: copia intacta de la versión original.
- `pruebas/probar.js`: prueba automática de reglas, pagos y consola (solo para desarrollo).
