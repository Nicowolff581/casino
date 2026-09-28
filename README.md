# Casino Nico

Casino de práctica con **fichas de mentira**: sin dinero real, pagos, depósitos ni compras.

## Cómo abrirlo
Haz doble clic en `index.html` (o en `casino-nico.html`, que lleva al mismo lugar). No hay que instalar nada.

## Cómo está organizado
- `index.html`: la página.
- `css/base.css`: colores, estructura, botones. `css/juegos.css`: el aspecto de cada juego.
- `js/nucleo.js`: azar justo, saldo, apuestas y mensajes (lo que comparten todos los juegos).
- `js/cartas.js`: baraja y dibujo de cartas.
- `js/juegos/`: un archivo por juego.
- `casino-nico-original.html`: copia intacta de la versión original.
- `pruebas/probar.js`: prueba automática de reglas, pagos y consola (solo para desarrollo).
