/* ═════════ TRAGAMONEDAS «Medianoche en el Club» · dibujo y animación ═════════
   El resultado completo ya viene decidido por slJugada() (tragamonedas-motor.js):
   aquí solo se muestra, paso a paso, lo que salió. */
const slRejilla = $("#sl-rejilla");
const sl = { celdas: new Array(SL_COLS * SL_FILAS).fill(null) };
const slVel = () => $("#sl-rapido").checked ? 0.45 : 1;
const slEspera = ms => espera(ms * slVel());
const slFichas = (veces, bet) => Math.floor(veces * bet + 1e-9);
const slNum = v => v.toLocaleString("es-CO", { maximumFractionDigits: 2 });

// HTML de un símbolo.
function slSimboloHTML(c){
  if (c.s === SL_LLAVE) return `<div class="sl-s sl-llave"><span>🗝️</span></div>`;
  if (c.s === SL_FAROL) return `<div class="sl-s sl-farol n${c.v >= 50 ? 3 : c.v >= 10 ? 2 : 1}"><span>×${c.v}</span></div>`;
  const S = SL_SIMBOLOS[c.s];
  if (S.id === "ficha") return `<div class="sl-s sl-ficha"><b>N</b></div>`;
  return `<div class="sl-s sl-${S.id}"><span>${S.ico}</span></div>`;
}
function slNombre(c){ return c.s === SL_LLAVE ? "llave" : c.s === SL_FAROL ? `farol ×${c.v}` : SL_SIMBOLOS[c.s].nombre.toLowerCase(); }
// Crea una casilla arriba de la cuadrícula y la deja caer hasta su fila.
function slCrear(c, i, filaInicio, retraso){
  const col = Math.floor(i / SL_FILAS), fila = i % SL_FILAS, el = document.createElement("div");
  el.className = "sl-c"; el.style.setProperty("--c", col); el.style.setProperty("--f", filaInicio);
  el.innerHTML = slSimboloHTML(c); el.setAttribute("aria-label", slNombre(c));
  slRejilla.appendChild(el);
  void el.offsetWidth;
  el.style.transitionDelay = retraso * slVel() + "ms"; el.style.setProperty("--f", fila);
  return el;
}
function slCartel(html, clase = ""){
  const c = $("#sl-cartel"); c.className = "sl-cartel " + clase; c.innerHTML = html;
  c.classList.remove("ver"); void c.offsetWidth; if (html) c.classList.add("ver");
}

// Muestra un giro completo (caída inicial, premios, cascadas y multiplicadores). Devuelve lo ganado en fichas.
async function slMostrarGiro(g, modo, bet, previo){
  // 1) los símbolos anteriores se van hacia abajo
  sl.celdas.forEach((el, i) => { if (el){ el.style.transitionDelay = Math.floor(i / SL_FILAS) * 40 * slVel() + "ms"; el.classList.add("sale"); } });
  const viejos = sl.celdas.filter(Boolean); setTimeout(() => viejos.forEach(el => el.remove()), 700);
  await slEspera(260);
  // 2) cae la cuadrícula nueva, columna por columna
  const primera = g.pasos[0].rejilla;
  sl.celdas = primera.map((c, i) => slCrear(c, i, (i % SL_FILAS) - 6, Math.floor(i / SL_FILAS) * 90 + (SL_FILAS - 1 - i % SL_FILAS) * 25));
  sonido.rodillo(700 * slVel());
  for (let col = 0; col < SL_COLS; col++) setTimeout(() => sonido.tope(), (380 + col * 90) * slVel());
  await slEspera(950);
  // 3) premios y cascadas
  let ganado = 0;
  for (let k = 0; k < g.pasos.length; k++){
    const p = g.pasos[k]; if (!p.premios.length) break;
    const ganPaso = p.premios.reduce((a, x) => a + x.pago, 0);
    ganado += ganPaso;
    p.celdas.forEach(i => sl.celdas[i].classList.add("gana"));
    slCartel(p.premios.map(x => `<span>${x.n} × ${SL_SIMBOLOS[x.s].ico} <b>+${fmt(slFichas(x.pago, bet))}</b></span>`).join(""));
    $("#sl-ganancia").textContent = fmt(previo + slFichas(ganado, bet));
    sonido.gana(1);
    await slEspera(850);
    p.celdas.forEach(i => sl.celdas[i].classList.replace("gana", "explota"));
    sonido.carta(); sonido.monedas(4);
    await slEspera(300);
    p.celdas.forEach(i => sl.celdas[i].remove());
    // cascada: los que quedan bajan y entran nuevos por arriba
    const sig = g.pasos[k + 1].rejilla, ganadoras = new Set(p.celdas), nuevas = [];
    for (let col = 0; col < SL_COLS; col++){
      const base = col * SL_FILAS, quedan = [];
      for (let f = 0; f < SL_FILAS; f++) if (!ganadoras.has(base + f)) quedan.push(sl.celdas[base + f]);
      const n = SL_FILAS - quedan.length;
      for (let f = 0; f < n; f++) nuevas[base + f] = slCrear(sig[base + f], base + f, f - n - 0.6, col * 50 + (n - f) * 30);
      quedan.forEach((el, j) => { el.style.transitionDelay = col * 50 * slVel() + "ms"; el.style.setProperty("--f", n + j); nuevas[base + n + j] = el; });
    }
    sl.celdas = nuevas;
    await slEspera(700);
  }
  slCartel("");
  // 4) faroles: multiplican el premio del giro
  const faroles = sl.celdas.filter(el => el.querySelector(".sl-farol"));
  if (ganado > 0 && g.multSuma > 0){
    faroles.forEach(el => el.classList.add("brilla")); sonido.brillo();
    slCartel(modo === "gratis"
      ? `<span>Faroles <b>+${g.multSuma}</b> → multiplicador <b>×${g.acumulado}</b></span>`
      : `<span>Premio × <b>${g.multSuma}</b> = <b>${fmt(slFichas(ganado * g.factor, bet))}</b></span>`, "mult");
    await slEspera(1200);
  } else if (ganado > 0 && modo === "gratis" && g.factor > 1){
    slCartel(`<span>Premio × <b>${g.factor}</b> = <b>${fmt(slFichas(ganado * g.factor, bet))}</b></span>`, "mult");
    await slEspera(1000);
  }
  if (modo === "gratis") $("#sl-acum").textContent = "×" + g.acumulado;
  // 5) llaves
  if (g.pagoLlaves > 0 || g.llaves >= (modo === "base" ? 4 : 3)){
    sl.celdas.forEach(el => { if (el.querySelector(".sl-llave")) el.classList.add("brilla"); });
    sonido.gana(2);
    if (g.pagoLlaves) slCartel(`<span>${g.llaves} llaves <b>+${fmt(slFichas(g.pagoLlaves, bet))}</b></span>`, "mult");
    await slEspera(1000);
  }
  const total = slFichas(g.total, bet);
  $("#sl-ganancia").textContent = fmt(previo + total);
  return total;
}

$("#s-girar").onclick = async () => {
  if (ocupado || !apostar("#s-msg")) return;
  ocupado = true; $("#s-girar").disabled = true; msg("#s-msg", ""); $("#sl-ganancia").textContent = "0";
  const bet = apuesta, j = slJugada();
  let mostrado = await slMostrarGiro(j.base, "base", bet, 0);
  if (j.gratis){
    let quedan = SL_GIROS;
    $("#sl-bono").hidden = false; $("#sl-giros").textContent = quedan; $("#sl-acum").textContent = "×0";
    slCartel(`<strong>¡${SL_GIROS} giros gratis!</strong><span>Los faroles se acumulan</span>`, "bono"); sonido.gana(3);
    await slEspera(2000);
    for (const g of j.gratis){
      $("#sl-giros").textContent = --quedan;
      mostrado += await slMostrarGiro(g, "gratis", bet, mostrado);
      if (g.masGiros){ quedan += SL_MAS_GIROS; $("#sl-giros").textContent = quedan; slCartel(`<strong>+${SL_MAS_GIROS} giros gratis</strong>`, "bono"); sonido.gana(2); await slEspera(1400); }
    }
    slCartel(""); $("#sl-bono").hidden = true;
  }
  const pagado = slFichas(j.total, bet);
  $("#sl-ganancia").textContent = fmt(pagado);
  const detalle = j.topado ? `¡Premio máximo de ×${fmt(SL_TOPE)}! ` : j.gratis ? `Giros gratis: ${j.gratis.length}. ` : "";
  liquidar("#s-msg", pagado, bet, detalle);
  ocupado = false; $("#s-girar").disabled = false;
};

// Tabla de pagos corta debajo de la máquina.
$("#sl-pagos").innerHTML = SL_SIMBOLOS.slice().reverse().map(S =>
  `<div>${slSimboloHTML({ s: SL_SIMBOLOS.indexOf(S) })}<span><b>8-9</b> ×${slNum(S.pagos[0])}</span><span><b>10-11</b> ×${slNum(S.pagos[1])}</span><span><b>12+</b> ×${slNum(S.pagos[2])}</span></div>`).join("") +
  `<div>${slSimboloHTML({ s: SL_LLAVE })}<span><b>4</b> ×3</span><span><b>5</b> ×5</span><span><b>6+</b> ×100</span></div>`;
// Cuadrícula inicial (decorativa) para que la máquina no se vea vacía.
sl.celdas = Array.from({ length: SL_COLS * SL_FILAS }, (_, i) => slCrear(slCelda(azar, "base"), i, i % SL_FILAS, 0));
