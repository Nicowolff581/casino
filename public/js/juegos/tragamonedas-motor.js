/* ═════════ TRAGAMONEDAS «Medianoche en el Club» · motor de resultados ═════════
   Aquí solo se decide QUÉ sale; el dibujo está en tragamonedas.js.
   Cada jugada se calcula completa (todas las cascadas y giros gratis) antes de animarla.

   Reglas:
   · Cuadrícula de 6 columnas × 5 filas. Cada casilla se sortea por separado con SL_PESOS.
   · Paga en cualquier parte: 8 o más símbolos iguales en cualquier lugar forman premio.
   · Cascada: los símbolos ganadores desaparecen, los de arriba caen y entran nuevos desde arriba.
     Se repite mientras haya premio.
   · Farol (multiplicador ×2 a ×100): al terminar las cascadas, si hubo premio, se suman los
     faroles que quedan en pantalla y multiplican el premio del giro.
   · 4 o más llaves 🗝️ pagan y dan 10 giros gratis. En los giros gratis los faroles se van
     acumulando y el acumulado multiplica cada premio siguiente. 3 llaves más dan +5 giros.
   · Premio máximo por jugada: ×5.000 la apuesta. */
const SL_COLS = 6, SL_FILAS = 5, SL_MIN = 8, SL_TOPE = 5000, SL_GIROS = 10, SL_MAS_GIROS = 5, SL_MAX_GIROS = 60;
// Símbolos normales de menor a mayor. pagos = veces la apuesta con [8-9, 10-11, 12 o más].
const SL_SIMBOLOS = [
  { id: "trebol",   ico: "♣", nombre: "Trébol",            pagos: [0.15, 0.45, 1.25] },
  { id: "diamante", ico: "♦", nombre: "Diamante",          pagos: [0.25, 0.55, 2.5] },
  { id: "corazon",  ico: "♥", nombre: "Corazón",           pagos: [0.3, 0.6, 3] },
  { id: "pica",     ico: "♠", nombre: "Pica",              pagos: [0.5, 0.75, 5] },
  { id: "dado",     ico: "🎲", nombre: "Dado",              pagos: [0.6, 0.9, 6] },
  { id: "coctel",   ico: "🍸", nombre: "Cóctel",            pagos: [0.9, 1.25, 7.5] },
  { id: "sombrero", ico: "🎩", nombre: "Sombrero de copa",  pagos: [1.25, 3, 9] },
  { id: "saxo",     ico: "🎷", nombre: "Saxofón",           pagos: [1.5, 6, 15] },
  { id: "ficha",    ico: "N",  nombre: "Ficha de oro Nico", pagos: [6, 15, 30] },
];
const SL_LLAVE = SL_SIMBOLOS.length, SL_FAROL = SL_SIMBOLOS.length + 1;       // índices especiales
// Pesos de sorteo de cada casilla: 9 símbolos normales, llave y farol.
const SL_PESOS = {
  base:   [30, 27, 25, 22, 17, 14, 11, 8.5, 5.5, 2.715, 1.9],
  gratis: [38, 34, 30, 23.5, 15.5, 12, 9, 6.7, 4.5, 2.7, 5.5],        // en giros gratis salen más símbolos comunes y faroles
};
const SL_VALORES = [2, 3, 4, 5, 8, 10, 15, 20, 25, 50, 100];
const SL_PESOS_VALOR = [38, 24, 14, 9, 6, 4, 2.2, 1.4, 0.9, 0.35, 0.15];
// Resultado de simular millones de jugadas con este mismo código (pruebas/simular-tragamonedas.js).
// Si se cambian pesos o pagos, hay que volver a simular y actualizar estos números.
const SL_ESTADISTICAS = { jugadas: 80e6, devuelve: 0.9611, margen: 0.0021, normal: 0.6432, gratis: 0.3179, frecuencia: 0.3772, bonoCada: 364 };
const SL_PAGO_LLAVES = n => n >= 6 ? 100 : n === 5 ? 5 : n === 4 ? 3 : 0;

const slTramo = n => n >= 12 ? 2 : n >= 10 ? 1 : 0;
function slCelda(rnd, modo){
  const s = elegirPonderado(SL_PESOS[modo], rnd);
  return s === SL_FAROL ? { s, v: SL_VALORES[elegirPonderado(SL_PESOS_VALOR, rnd)] } : { s };
}
// Un giro con todas sus cascadas. La cuadrícula es una lista de 30 casillas: col * 5 + fila (fila 0 = arriba).
function slGiro(rnd, modo = "base", acumulado = 0){
  let rejilla = Array.from({ length: SL_COLS * SL_FILAS }, () => slCelda(rnd, modo));
  const pasos = []; let ganBase = 0;
  for (let vuelta = 0; vuelta < 60; vuelta++){
    const cuenta = new Array(SL_SIMBOLOS.length).fill(0);
    rejilla.forEach(c => { if (c.s < SL_SIMBOLOS.length) cuenta[c.s]++; });
    const premios = cuenta.map((n, s) => n >= SL_MIN ? { s, n, pago: SL_SIMBOLOS[s].pagos[slTramo(n)] } : null).filter(Boolean);
    if (!premios.length){ pasos.push({ rejilla, premios: [] }); break; }
    const gana = new Set(premios.map(p => p.s));
    pasos.push({ rejilla, premios, celdas: rejilla.map((c, i) => gana.has(c.s) ? i : -1).filter(i => i >= 0) });
    ganBase += premios.reduce((a, p) => a + p.pago, 0);
    // cascada: en cada columna caen los que quedan y entran nuevos por arriba
    const nueva = [];
    for (let col = 0; col < SL_COLS; col++){
      const quedan = rejilla.slice(col * SL_FILAS, col * SL_FILAS + SL_FILAS).filter(c => !gana.has(c.s));
      const nuevos = Array.from({ length: SL_FILAS - quedan.length }, () => ({ ...slCelda(rnd, modo), nuevo: true }));
      nueva.push(...nuevos, ...quedan.map(c => ({ ...c, nuevo: false })));
    }
    rejilla = nueva;
  }
  const final = pasos[pasos.length - 1].rejilla;
  const llaves = final.filter(c => c.s === SL_LLAVE).length;
  const multSuma = final.reduce((a, c) => a + (c.s === SL_FAROL ? c.v : 0), 0);
  let factor = 1;
  if (ganBase > 0 && modo === "gratis"){ acumulado += multSuma; factor = Math.max(1, acumulado); }
  else if (ganBase > 0 && multSuma > 0) factor = multSuma;
  const pagoLlaves = SL_PAGO_LLAVES(llaves);
  return { pasos, ganBase, multSuma, factor, acumulado, llaves, pagoLlaves, total: ganBase * factor + pagoLlaves };
}
// Jugada completa: giro normal y, si salen 4+ llaves, la ronda de giros gratis. Resultado en «veces la apuesta».
function slJugada(rnd = azar){
  const base = slGiro(rnd, "base");
  let total = base.total, gratis = null;
  if (base.llaves >= 4){
    gratis = []; let quedan = SL_GIROS, acumulado = 0;
    while (quedan > 0 && gratis.length < SL_MAX_GIROS){
      const g = slGiro(rnd, "gratis", acumulado);
      acumulado = g.acumulado; quedan--;
      if (g.llaves >= 3){ quedan += SL_MAS_GIROS; g.masGiros = true; }
      gratis.push(g); total += g.total;
    }
  }
  const topado = total > SL_TOPE;
  return { base, gratis, total: Math.min(total, SL_TOPE), topado };
}
