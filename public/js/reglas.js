/* ═════════ Casino Nico · reglas, probabilidades y tablas de pagos ═════════
   Las tablas se calculan con los mismos números que usa cada juego,
   así que si un juego cambia, sus reglas se actualizan solas. */
const pct = (x, dec = 2) => (x * 100).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + " %";
const num = (x, dec = 2) => x.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const tabla = (cab, filas) => `<div class="tabla-scroll"><table class="tabla"><thead><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead>` +
  `<tbody>${filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const devuelve = (valor, texto) => `<div class="rtp-grande"><b>${valor}</b><span>${texto}</span></div>`;
const combin = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - k + i) / i; return x; };
const NO_CELEBRA = `<p class="nota-regla">Solo se celebra como victoria cuando recibes más de lo que apostaste. Si recibes menos, se muestra en naranja como devolución parcial.</p>`;

const plinkoDevolucion = t => t.reduce((a, m, k) => a + combin(PL_FILAS, k) / 2 ** PL_FILAS * m, 0);

/* Resumen corto que muestran las tarjetas de inicio. */
const RESUMEN_DEVOLUCION = {
  avion: pct(AV_RTP, 0), pollo: "≈ " + pct(0.97, 0), plinko: "≈ " + pct(0.99, 0), slots: "≈ " + pct(SL_ESTADISTICAS.devuelve, 0),
  bj: "≈ " + pct(0.996, 1), poker: "Sin comisión", ruleta: pct(36 / 37, 1), fantan: pct(ftPremio(1, 1, 1000) / 4000, 2)
};

const REGLAS = {
  avion: () => {
    const nombres = ["Cohete (÷2)", ...AV_OPC.map(o => o[0])];
    const probEvento = k => { const pc = avProbCohete(k), p = avPesos(k), t = p.reduce((a, b) => a + b); return [pc, ...p.map(w => (1 - pc) * w / t)]; };
    return devuelve(pct(AV_RTP, 0), "devuelve a largo plazo en las 4 velocidades (cálculo exacto)") +
    `<h3>Cómo se juega</h3><ul>
      <li>Apuestas y el avión despega. En el camino recoge premios: los <strong>+</strong> suman al multiplicador y los <strong>×</strong> lo multiplican. Los <strong>cohetes</strong> lo parten a la mitad.</li>
      <li>Al final, o <strong>llega a destino</strong> y cobras <strong>apuesta × multiplicador</strong> (máximo ×${AV_TOPE}), o <strong>entra en una tormenta</strong> y pierdes la apuesta.</li>
      <li>Todo el vuelo se decide al despegar. Lo que ves durante el vuelo no cambia el resultado.</li></ul>
    <h3>Probabilidad de llegar a destino</h3>` +
    tabla(["Velocidad", "Llega", "Multiplicador promedio", "Devuelve"], AV_NOMBRE.map((n, k) => [n, pct(AV_PROB[k], 1), "×" + num(AV_MULT_MEDIO[k]), pct(AV_PROB[k] * AV_MULT_MEDIO[k], 1)])) +
    `<h3>Qué aparece en el camino</h3><p>Cada vuelo tiene entre 4 y ${3 + avEventos(3)} eventos (más en velocidades altas). Probabilidad de cada evento:</p>` +
    tabla(["Evento", ...AV_NOMBRE], nombres.map((n, i) => [n, ...[0, 1, 2, 3].map(k => pct(probEvento(k)[i], 1))])) +
    `<h3>Prueba de juego justo</h3><ul>
      <li>Antes de cada vuelo se sortea un <strong>número secreto</strong> de 64 caracteres y se muestra su <strong>huella SHA-256</strong>.</li>
      <li>Todos los eventos y el final del vuelo se calculan a partir de ese secreto: con el mismo secreto y la misma velocidad, siempre sale el mismo vuelo.</li>
      <li>Al terminar se revela el secreto. El botón «Comprobar» recalcula la huella y el vuelo; también puedes pegar el secreto en cualquier calculadora de SHA-256 de internet.</li>
      <li>Límite honesto: como todo pasa en tu propio navegador, esto prueba que el resultado no se cambió después de mostrarte la huella. La posición de los premios en el cielo es solo decoración.</li></ul>` + NO_CELEBRA;
  },
  pollo: () => {
    const difs = $$("#po-dif button").map(b => [b.textContent, +b.dataset.p]);
    return devuelve("≈ " + pct(0.97, 0), "devuelve a largo plazo, cobres en el carril que cobres") +
    `<h3>Cómo se juega</h3><ul>
      <li>Apuestas y el pollo cruza la carretera carril por carril. Tras cada carril puedes <strong>cobrar</strong> o <strong>avanzar</strong>.</li>
      <li>En cada carril hay una probabilidad fija de perder: ${difs.map(([n, p]) => `${n} ${pct(p, 0)}`).join(", ")}.</li>
      <li>Si pierdes, se elige al azar una de 10 escenas de caricatura (elefante, piano, yunque, ovni…). Es solo el dibujo: no cambia nada del resultado.</li>
      <li>El multiplicador se calcula para que el pago esperado sea el 97 % (se redondea hacia abajo, por eso puede quedar un poco menos).</li></ul>
    <h3>Multiplicador y probabilidad de llegar a cada carril</h3>` +
    tabla(["Carril", ...difs.map(d => d[0])], Array.from({ length: PO_N }, (_, i) => [i + 1, ...difs.map(([, p]) => `×${num(poMultCon(p, i + 1))} · ${pct(Math.pow(1 - p, i + 1), 1)}`)])) + NO_CELEBRA;
  },
  plinko: () => devuelve("≈ " + pct(0.99, 0), "devuelve a largo plazo (cálculo exacto por riesgo, abajo)") +
    `<h3>Cómo se juega</h3><ul>
      <li>La bola cae por ${PL_FILAS} filas de clavos. En cada clavo va a la izquierda o a la derecha con 50 % de probabilidad.</li>
      <li>Cae en una de ${PL_FILAS + 1} casillas y cobras <strong>apuesta × multiplicador</strong> de esa casilla. Las del centro son las más probables.</li></ul>
    <h3>Casillas (de izquierda a derecha)</h3>` +
    tabla(["Casilla", "Probabilidad", "Riesgo bajo", "Riesgo medio", "Riesgo alto"], PL_TABLAS.bajo.map((_, k) =>
      [k + 1, pct(combin(PL_FILAS, k) / 2 ** PL_FILAS, 3), ...["bajo", "medio", "alto"].map(r => "×" + num(PL_TABLAS[r][k], 1))]).concat([["<strong>Devuelve</strong>", "", ...["bajo", "medio", "alto"].map(r => `<strong>${pct(plinkoDevolucion(PL_TABLAS[r]))}</strong>`)]])) + NO_CELEBRA,
  slots: () => {
    const E = SL_ESTADISTICAS, totB = SL_PESOS.base.reduce((a, b) => a + b), totG = SL_PESOS.gratis.reduce((a, b) => a + b), totV = SL_PESOS_VALOR.reduce((a, b) => a + b);
    return devuelve(pct(E.devuelve, 1), `devuelve a largo plazo (simulado con ${fmt(E.jugadas / 1e6)} millones de jugadas, margen ±${pct(E.margen, 1)})`) +
    `<h3>Cómo se juega</h3><ul>
      <li>Cuadrícula de 6 columnas × 5 filas. Cada casilla se sortea por separado.</li>
      <li><strong>Paga en cualquier parte:</strong> 8 o más símbolos iguales en cualquier lugar de la pantalla forman premio. No hay líneas.</li>
      <li><strong>Cascada:</strong> los símbolos ganadores explotan, los de arriba caen y entran nuevos. Se repite mientras haya premio.</li>
      <li><strong>Farol</strong> (×2 a ×100): al terminar las cascadas, si hubo premio, se suman los faroles en pantalla y multiplican el premio del giro.</li>
      <li><strong>4 o más llaves 🗝️</strong> pagan y dan ${SL_GIROS} giros gratis. En los giros gratis los faroles se acumulan y el total multiplica cada premio siguiente. 3 llaves durante los giros gratis dan +${SL_MAS_GIROS}.</li>
      <li>Premio máximo por jugada: ×${fmt(SL_TOPE)} tu apuesta. El total de cada jugada se redondea hacia abajo a fichas enteras.</li>
      <li>Toda la jugada (cascadas y giros gratis incluidos) se sortea al tocar «Girar»; la animación solo la muestra.</li></ul>
    <h3>Números de la simulación</h3>` +
    tabla(["Dato", "Valor"], [["Devuelve en total", pct(E.devuelve, 2) + " ± " + pct(E.margen, 2)], ["…del juego normal", pct(E.normal, 1)], ["…de los giros gratis", pct(E.gratis, 1)],
      ["Jugadas con algún premio", pct(E.frecuencia, 1)], ["Giros gratis", `1 de cada ${fmt(Math.round(E.bonoCada))} jugadas`]]) +
    `<p class="nota-regla">Este juego es de volatilidad alta: la mayoría de las jugadas pagan poco o nada y, de vez en cuando, paga mucho. Por eso el porcentaje solo se nota después de muchísimas jugadas.</p>
    <h3>Tabla de pagos (veces tu apuesta)</h3>` +
    tabla(["Símbolo", "Sale", "8-9", "10-11", "12 o más"], SL_SIMBOLOS.map((S, i) => [`${S.ico} ${S.nombre}`, pct(SL_PESOS.base[i] / totB, 1), "×" + num(S.pagos[0]), "×" + num(S.pagos[1]), "×" + num(S.pagos[2])]).reverse()
      .concat([["🗝️ Llave (4 / 5 / 6+)", pct(SL_PESOS.base[SL_LLAVE] / totB, 1), "×" + SL_PAGO_LLAVES(4), "×" + SL_PAGO_LLAVES(5), "×" + SL_PAGO_LLAVES(6)]])) +
    `<h3>Faroles</h3><p>Salen en ${pct(SL_PESOS.base[SL_FAROL] / totB, 1)} de las casillas del juego normal y en ${pct(SL_PESOS.gratis[SL_FAROL] / totG, 1)} en los giros gratis. En los giros gratis también salen más seguido los símbolos comunes.</p>` +
    tabla(["Valor", "Probabilidad"], SL_VALORES.map((v, i) => ["×" + v, pct(SL_PESOS_VALOR[i] / totV, 1)])) + NO_CELEBRA;
  },
  bj: () => devuelve("≈ " + pct(0.996, 1), "devuelve jugando con estrategia básica (3 millones de manos simuladas); jugando al azar devuelve bastante menos") +
    `<h3>Cómo se juega</h3><ul>
      <li>Objetivo: sumar más que el crupier sin pasarte de 21. Las figuras valen 10 y el As vale 1 u 11.</li>
      <li>Se usa una baraja nueva de 52 cartas, mezclada en cada mano.</li>
      <li>El crupier pide carta hasta llegar a 17 y se planta en 17 (también en 17 «blando», con As).</li>
      <li>Si el crupier tiene blackjack, se revela al repartir y la mano termina.</li>
      <li>Puedes <strong>doblar</strong> con tus dos primeras cartas: doblas la apuesta y recibes una sola carta más. No hay dividir ni seguro.</li></ul>
    <h3>Pagos</h3>` +
    tabla(["Resultado", "Paga", "Recibes (apuesta 100)"], [["Blackjack (As + 10 en 2 cartas)", "3 a 2", "250"], ["Ganas", "1 a 1", "200"], ["Empate", "Devuelve", "100"], ["Pierdes o te pasas", "—", "0"]]) +
    `<p class="nota-regla">Con apuestas impares, el pago 3 a 2 se redondea hacia abajo a fichas enteras.</p>`,
  poker: () => devuelve("Sin comisión", "el casino no se queda con nada: todo el bote va al ganador") +
    `<h3>Cómo se juega</h3><ul>
      <li>Juegas contra Valentina y Mateo. Cada uno recibe 2 cartas privadas; en la mesa salen 5 comunitarias (3, luego 1 y luego 1).</li>
      <li>Gana la mejor combinación de 5 cartas entre tus 2 y las 5 de la mesa. Si empatan, se reparte el bote.</li>
      <li>Ciegas: la pequeña es la mitad del monto y la grande es el monto. El botón del repartidor rota cada mano.</li>
      <li>Cada subida es del tamaño de la ciega grande, máximo 3 subidas por ronda.</li>
      <li>Si vas con todo, solo puedes ganar de cada rival lo mismo que pusiste tú (bote lateral).</li>
      <li>Los rivales deciden solo con sus cartas y la mesa: nunca ven las tuyas ni el mazo.</li></ul>
    <h3>Jugadas, de mejor a peor</h3>` +
    tabla(["Jugada", "Ejemplo", "Probabilidad (7 cartas)"], [
      ["Escalera real", "A K Q J 10 del mismo palo", "0,003 %"], ["Escalera de color", "9 8 7 6 5 del mismo palo", "0,028 %"], ["Póker", "Cuatro iguales", "0,17 %"],
      ["Full", "Trío + pareja", "2,60 %"], ["Color", "5 del mismo palo", "3,03 %"], ["Escalera", "5 seguidas (A-2-3-4-5 vale)", "4,62 %"], ["Trío", "Tres iguales", "4,83 %"],
      ["Doble pareja", "Dos parejas", "23,5 %"], ["Pareja", "Dos iguales", "43,8 %"], ["Carta alta", "Ninguna de las anteriores", "17,4 %"]]),
  ruleta: () => devuelve(pct(36 / 37), "devuelve a largo plazo en todas las apuestas") +
    `<h3>Cómo se juega</h3><ul>
      <li>Ruleta europea con 37 casillas (0 a 36), todas igual de probables.</li>
      <li>Si sale el 0, las apuestas exteriores (rojo, negro, par, impar, 1 a 18, 19 a 36) pierden.</li>
      <li>Puedes poner varias fichas en el mismo giro, cada una con el monto elegido en ese momento. Se descuentan al girar y cada apuesta se paga por separado.</li>
      <li>Como todas las apuestas devuelven lo mismo, combinar varias no cambia el porcentaje: sigue siendo ${pct(36 / 37)} de lo apostado.</li></ul>
    <h3>Apuestas</h3>` +
    tabla(["Apuesta", "Números que ganan", "Probabilidad", "Paga", "Devuelve"], [
      ["Pleno (un número)", "1", pct(1 / 37), "35 a 1", pct(ruPremio("17", 17, 1) / 37)],
      ["Rojo o negro", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("r", 1, 1) / 37)],
      ["Par o impar", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("p", 2, 1) / 37)],
      ["1 a 18 o 19 a 36", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("b", 1, 1) / 37)]]),
  fantan: () => devuelve(pct(ftPremio(1, 1, 1000) / 4000), "devuelve a largo plazo, elijas el número que elijas") +
    `<h3>Cómo se juega</h3><ul>
      <li>Eliges un número del 1 al 4. El crupier tapa entre 20 y 59 fichas con el cuenco (todas las cantidades igual de probables).</li>
      <li>Luego las retira de 4 en 4. Lo que queda al final (1, 2, 3 o 4) es el número ganador: cada uno sale exactamente 1 de cada 4 veces.</li>
      <li>Si aciertas, cobras 3 a 1 menos una comisión del 5 % sobre la ganancia.</li></ul>
    <h3>Pagos</h3>` +
    tabla(["Resultado", "Probabilidad", "Recibes (apuesta 100)"], [["Aciertas", "25 %", fmt(ftPremio(1, 1, 100))], ["Fallas", "75 %", "0"]])
};
