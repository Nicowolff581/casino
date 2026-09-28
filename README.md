# Casino Nico

Casino de práctica con **fichas de mentira**: sin dinero real, pagos, depósitos ni compras.

## Cómo abrirlo
Haz doble clic en `index.html` (te lleva a `publico/index.html`, que es el casino). No hay que instalar nada.
En internet se publica con Cloudflare (gratis): ver `wrangler.jsonc`.

## Cómo está organizado
- `publico/`: todo lo que se publica en internet.
- `publico/index.html`: la página.
- `publico/css/base.css`: colores, estructura, botones. `css/juegos.css`: el aspecto de cada juego.
- `publico/js/nucleo.js`: azar justo, saldo, apuestas y mensajes (lo que comparten todos los juegos).
- `publico/js/cartas.js`: baraja y dibujo de cartas.
- `publico/js/juegos/`: un archivo por juego.
- `publico/muestras/estilos.html`: muestra de los 3 estilos visuales.
- `servidor/worker.js`: el servidor en Cloudflare (salas para jugar con amigos).
- `casino-nico-original.html`: copia intacta de la versión original.
- `pruebas/probar.js`: prueba automática de reglas, pagos y consola (solo para desarrollo).
