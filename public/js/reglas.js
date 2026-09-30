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
  avion: pct(AV_EXACTO.devuelve, 0), pollo: "≈ " + pct(0.97, 0), plinko: "≈ " + pct(0.99, 0), slots: "≈ " + pct(SL_ESTADISTICAS.devuelve, 0),
  bj: "≈ " + pct(0.996, 1), poker: "Sin comisión", ruleta: pct(36 / 37, 1), fantan: pct(ftPremio(1, 1, 1000) / 4000, 2)
};

const REGLAS = {
  avion: () => {
    const E = AV_EXACTO, tot = AV_PESOS.reduce((a, b) => a + b);
    return devuelve(pct(E.devuelve, 1), `devuelve a largo plazo (cálculo exacto). Simulando ${fmt(AV_SIMULADO.vuelos)} vuelos devolvió ${pct(AV_SIMULADO.devuelve, 1)}`) +
    `<h3>Cómo se juega</h3><ul>
      <li>Eliges tu apuesta y una de las 4 velocidades, y tocas «Jugar». Después no hay que decidir nada más: no hay botón de cobrar.</li>
      <li>El avión despega de un barco a la altura 2 (de 4) y vuela sobre el mar. El <strong>contador</strong> sobre el avión empieza en tu apuesta.</li>
      <li>En el camino hay entre ${AV_EV_MIN} y ${AV_EV_MAX} objetos, todos en su ruta:
        <strong>+1, +2, +5, +10</strong> suman esas veces tu apuesta; <strong>×2, ×3, ×4, ×5</strong> multiplican el contador. Con cada premio el avión sube un nivel (máximo ${AV_ALT_MAX}).
        Los <strong>cohetes</strong> parten el contador a la mitad y el avión baja un nivel.</li>
      <li>Si llega al nivel 0, <strong>cae al mar</strong> justo donde lo golpeó el cohete y pierdes la apuesta. Si pasa todos los objetos, <strong>aterriza en el portaaviones</strong> y cobras apuesta × contador (máximo ×${AV_TOPE}).</li>
      <li>La velocidad solo cambia lo rápido que ves el vuelo; puedes cambiarla mientras vuela. Las probabilidades son las mismas en las 4.</li>
      <li>Si el contador quedó por debajo de ×1 (por los cohetes), al aterrizar recuperas solo una parte de tu apuesta y no se celebra como ganancia.</li></ul>
    <h3>Objetos</h3>` +
    tabla(["Objeto", "Qué hace", "Probabilidad de cada objeto"], [["🚀 Cohete", "÷2 y baja un nivel", pct(AV_COHETE, 2)],
      ...AV_OBJ.map((o, j) => [o.t, o.suma ? `suma ${o.v} ${o.v > 1 ? "veces" : "vez"} tu apuesta y sube un nivel` : `multiplica el contador por ${o.v} y sube un nivel`, pct((1 - AV_COHETE) * AV_PESOS[j] / tot, 2)])]) +
    `<h3>Resultados</h3>` +
    tabla(["Resultado", "Probabilidad"], [["Aterriza en el portaaviones", pct(E.aterriza, 1)], ["Cae al mar", pct(1 - E.aterriza, 1)],
      ["Aterriza con ×20 o más (premio grande)", "1 de cada " + fmt(Math.round(1 / E.x20))], ["Aterriza con ×40 o más (mega)", "1 de cada " + fmt(Math.round(1 / E.x40))],
      ["Aterriza con ×80 o más (súper mega)", "1 de cada " + fmt(Math.round(1 / E.x80))], [`Llega al máximo ×${AV_TOPE}`, "1 de cada " + fmt(Math.round(1 / E.tope))]]) +
    `<h3>Prueba de juego justo</h3><ul>
      <li>Antes de cada vuelo se sortea un <strong>número secreto</strong> de 64 caracteres y se muestra su <strong>huella SHA-256</strong>.</li>
      <li>Todo el vuelo (cuántos objetos hay, cuáles son y dónde termina) se calcula a partir de ese secreto: con el mismo secreto siempre sale el mismo vuelo.</li>
      <li>Al terminar se revela el secreto. El botón «Comprobar» recalcula la huella y el vuelo; también puedes pegar el secreto en cualquier calculadora de SHA-256 de internet.</li>
      <li>Límite honesto: como todo pasa en tu propio navegador, esto prueba que el resultado no se cambió después de mostrarte la huella. El dibujo (nubes, islas, olas) es solo decoración.</li></ul>` + NO_CELEBRA;
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
      <li>La bola cae por ${PL_FILAS} filas de clavos. <strong>Cada vez que toca un clavo</strong> se sortea en ese momento, con el generador aleatorio justo, si sigue por la izquierda o por la derecha: 50 % cada lado.</li>
      <li>Cae en una de ${PL_FILAS + 1} casillas y cobras <strong>apuesta × multiplicador</strong> de esa casilla. Las del centro son las más probables.</li>
      <li>La altura y la fuerza de cada rebote, el giro de la bola y los rebotes dobles cambian en cada caída, pero son solo el dibujo: nunca cambian hacia dónde va.</li></ul>
    <h3>Casillas (de izquierda a derecha)</h3>` +
    tabla(["Casilla", "Probabilidad", `Salió en ${fmt(PL_SIMULADO.bolas)} caídas`, "Riesgo bajo", "Riesgo medio", "Riesgo alto"], PL_TABLAS.bajo.map((_, k) =>
      [k + 1, pct(combin(PL_FILAS, k) / 2 ** PL_FILAS, 3), pct(PL_SIMULADO.casillas[k], 3), ...["bajo", "medio", "alto"].map(r => "×" + num(PL_TABLAS[r][k], 1))])
      .concat([["<strong>Devuelve</strong>", "", "", ...["bajo", "medio", "alto"].map(r => `<strong>${pct(plinkoDevolucion(PL_TABLAS[r]))}</strong>`)]],
        [["En la simulación", "", "", ...["bajo", "medio", "alto"].map(r => pct(PL_SIMULADO.devuelve[r], 1))]])) +
    `<p class="nota-regla">La simulación usa la misma física del juego. En riesgo alto la casilla ×170 sale 1 de cada 4.096 bolas, así que incluso con un millón de caídas la devolución simulada puede quedar un poco arriba o abajo del valor exacto.</p>` + NO_CELEBRA,
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
    <h3>Comprar los giros gratis</h3><ul>
      <li>Con el botón «Comprar ${SL_GIROS} giros gratis» pagas <strong>${SL_PRECIO_COMPRA} veces tu apuesta</strong> en fichas de práctica y entras directo a la ronda de ${SL_GIROS} giros gratis (con las mismas reglas: faroles que se acumulan y +${SL_MAS_GIROS} giros con 3 llaves). Por ejemplo, con apuesta ${fmt(20)} cuesta ${fmt(20 * SL_PRECIO_COMPRA)}.</li>
      <li>Los premios se calculan con tu apuesta, no con el precio. En promedio la ronda paga ${num(SL_COMPRA.promedio)} veces tu apuesta, así que la compra devuelve <strong>${pct(SL_COMPRA.promedio / SL_PRECIO_COMPRA, 1)}</strong> (simulado con ${fmt(SL_COMPRA.rondas / 1e6)} millones de rondas compradas), casi lo mismo que el juego normal.</li>
      <li>Muchas veces la ronda paga menos de lo que costó: solo se celebra si recibes más de lo que pagaste. Son solo fichas de práctica: no se compra nada con dinero real.</li></ul>
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
      <li>Si sale el 0, todas las apuestas exteriores (docenas, columnas, rojo, negro, par, impar, 1 a 18, 19 a 36) pierden.</li>
      <li>El número se sortea al tocar «Girar»; el resultado se anuncia cuando la bola y la rueda se detienen.</li>
      <li>Puedes poner varias fichas en el mismo giro, cada una con el monto elegido en ese momento. Se descuentan al girar y cada apuesta se paga por separado.</li>
      <li>Como todas las apuestas devuelven lo mismo, combinar varias no cambia el porcentaje: sigue siendo ${pct(36 / 37)} de lo apostado.</li></ul>
    <h3>Apuestas</h3>` +
    tabla(["Apuesta", "Números que ganan", "Probabilidad", "Paga", "Devuelve"], [
      ["Pleno (un número)", "1", pct(1 / 37), "35 a 1", pct(ruPremio("17", 17, 1) / 37)],
      ["Docena (1-12, 13-24, 25-36)", "12", pct(12 / 37), "2 a 1", pct(12 * ruPremio("d1", 1, 1) / 37)],
      ["Columna («2 a 1»)", "12", pct(12 / 37), "2 a 1", pct(12 * ruPremio("c1", 1, 1) / 37)],
            ["Rojo o negro", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("r", 1, 1) / 37)],
      ["Par o impar", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("p", 2, 1) / 37)],
      ["1 a 18 o 19 a 36", "18", pct(18 / 37), "1 a 1", pct(18 * ruPremio("b", 1, 1) / 37)]]) +
    `<h3>Cada número</h3><p>Cada número sale con probabilidad 1 de 37 = <strong>${pct(1 / 37, 2)}</strong>. Así salieron en ${fmt(RU_SIMULADO.giros)} giros simulados con el mismo código del juego:</p>
    <div class="ru-numeros">${RU_SIMULADO.porNumero.map((p, n) => `<span><b style="background:${colorN(n)}">${n}</b>${pct(p, 2)}</span>`).join("")}</div>
    <p class="nota-regla">En esos giros, apostando siempre a rojo devolvió ${pct(RU_SIMULADO.devuelve.rojo, 1)}, a la primera docena ${pct(RU_SIMULADO.devuelve["docena 1"], 1)} y a par ${pct(RU_SIMULADO.devuelve.par, 1)} (el valor exacto es ${pct(36 / 37, 1)}).</p>
    <h3>La bola</h3><ul>
      <li>El número se sortea con el generador aleatorio justo al tocar «Girar» (en la ruleta con amigos, antes de las apuestas, con su huella).</li>
      <li>Después la bola hace su recorrido: da de 7 a 10 vueltas, frena distinto en cada giro, a veces choca con los rombos del borde y rebota de 1 a 6 veces entre casillas. Todo eso es solo el dibujo: el recorrido se arma para terminar en el número que ya salió, así que nunca cambia el resultado.</li></ul>`,
  fantan: () => devuelve(pct(ftPremio(1, 1, 1000) / 4000), "devuelve a largo plazo, elijas el número que elijas") +
    `<h3>Cómo se juega</h3><ul>
      <li>Eliges un número del 1 al 4. El crupier tapa entre 20 y 59 fichas con el cuenco (todas las cantidades igual de probables).</li>
      <li>Luego las retira de 4 en 4. Lo que queda al final (1, 2, 3 o 4) es el número ganador: cada uno sale exactamente 1 de cada 4 veces.</li>
      <li>Si aciertas, cobras 3 a 1 menos una comisión del 5 % sobre la ganancia.</li></ul>
    <h3>Pagos</h3>` +
    tabla(["Resultado", "Probabilidad", "Recibes (apuesta 100)"], [["Aciertas", "25 %", fmt(ftPremio(1, 1, 100))], ["Fallas", "75 %", "0"]])
};
