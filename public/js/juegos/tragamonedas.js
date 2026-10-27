/* ═════════ TRAGAMONEDAS «Medianoche en el Club» · dibujo y animación ═════════
   El resultado completo ya viene decidido por slJugada() o slCompra() (tragamonedas-motor.js):
   aquí solo se muestra, paso a paso, lo que salió. Nada de lo que se ve cambia el resultado.
   Honestidad: no hay «casi ganas» de mentira, y los sonidos y luces de fiesta solo aparecen
   cuando lo cobrado ya supera lo que costó la jugada. */
const slRejilla = $("#sl-rejilla"), slMaquina = $("#sl-maquina");
const sl = { celdas: new Array(SL_COLS * SL_FILAS).fill(null), mostrado: 0 };
const slVel = () => $("#sl-rapido").checked ? 0.45 : 1;
const slEspera = ms => espera(ms * slVel());
const slFichas = (veces, bet) => Math.floor(veces * bet + 1e-9);
const slNum = v => v.toLocaleString("es-CO", { maximumFractionDigits: 2 });
// Niveles de la pantalla de premio grande (veces lo que costó la jugada).
const SL_NIVELES = [[200, "¡Premio épico!"], [50, "¡Mega premio!"], [15, "¡Gran premio!"]];
const SL_PASOS_APUESTA = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/* ── símbolos dibujados (SVG), iguales en todos los aparatos ── */
document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="sl-desenfoque" x="0" y="-20%" width="100%" height="140%"><feGaussianBlur stdDeviation="0 6"/></filter>
  <symbol id="sl-p-trebol" viewBox="0 0 100 100"><circle cx="50" cy="31" r="15"/><circle cx="31" cy="54" r="15"/><circle cx="69" cy="54" r="15"/><path d="M45 50C45 70 41 80 32 88h36c-9-8-13-18-13-38z"/></symbol>
  <symbol id="sl-p-diamante" viewBox="0 0 100 100"><path d="M50 8 81 50 50 92 19 50z"/></symbol>
  <symbol id="sl-p-corazon" viewBox="0 0 100 100"><path d="M50 87C24 67 11 53 11 36c0-13 10-22 22-22 8 0 14 5 17 12 3-7 9-12 17-12 12 0 22 9 22 22 0 17-13 31-39 51z"/></symbol>
  <symbol id="sl-p-pica" viewBox="0 0 100 100"><path d="M50 9C42 26 13 40 13 59c0 11 9 18 19 18 6 0 11-3 14-8-1 9-5 15-13 20h34c-8-5-12-11-13-20 3 5 8 8 14 8 10 0 19-7 19-18C87 40 58 26 50 9z"/></symbol>
  <symbol id="sl-o-dado" viewBox="0 0 100 100"><g stroke-linejoin="round" stroke-width="5"><path d="M18 33 50 17l32 16-32 16z" fill="#fffaf0" stroke="#fffaf0"/><path d="M18 33l32 16v39L18 72z" fill="#ece2cb" stroke="#ece2cb"/><path d="M50 49l32-16v39L50 88z" fill="#cfc2a4" stroke="#cfc2a4"/></g>
    <g fill="#b3122c"><ellipse cx="50" cy="33" rx="6.5" ry="3.4"/><ellipse cx="27" cy="47" rx="3.8" ry="4.8"/><ellipse cx="41" cy="73" rx="3.8" ry="4.8"/><ellipse cx="58" cy="74" rx="3.6" ry="4.6"/><ellipse cx="66" cy="61" rx="3.6" ry="4.6"/><ellipse cx="74" cy="48" rx="3.6" ry="4.6"/></g></symbol>
  <symbol id="sl-o-coctel" viewBox="0 0 100 100"><path d="M14 20h72L50 57z" fill="rgba(225,248,255,.28)" stroke="#e8fbff" stroke-width="3" stroke-linejoin="round"/><path d="M23 28h54L50 52z" fill="#36cfc0"/><path d="M27 29h20L37 38z" fill="#9ff3ea" opacity=".7"/>
    <path d="M63 9 43 45" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/><circle cx="51" cy="31" r="7" fill="#7cb342"/><circle cx="53" cy="29.5" r="2.4" fill="#d84315"/><path d="M48.5 57h3v24h-3z" fill="#e8fbff"/><ellipse cx="50" cy="83" rx="17" ry="4.5" fill="#e8fbff"/></symbol>
  <symbol id="sl-o-sombrero" viewBox="0 0 100 100"><ellipse cx="50" cy="75" rx="40" ry="11" fill="#14121b"/><ellipse cx="50" cy="73" rx="36" ry="8" fill="#2c2838"/><path d="M27 25c0-6 46-6 46 0l-3 47c-13 6-27 6-40 0z" fill="#25212f"/>
    <ellipse cx="50" cy="25" rx="23" ry="6" fill="#3d384c"/><path d="M29.5 56c13 5 28 5 41 0l-.6 11c-13 5-27 5-39.8 0z" fill="#c8102e"/><path d="M36 30l-1.4 24" stroke="rgba(255,255,255,.2)" stroke-width="4" stroke-linecap="round"/></symbol>
  <symbol id="sl-o-saxo" viewBox="0 0 100 100"><path d="M62 14v44c0 19-10 29-22 29-11 0-17-7-17-15 0-6 4-10 10-10" fill="none" stroke="#e0b64f" stroke-width="12" stroke-linecap="round"/>
    <path d="M58 16v40" stroke="#fff2bf" stroke-width="2.5" stroke-linecap="round" opacity=".7"/><ellipse cx="30" cy="62" rx="14" ry="7.5" fill="#f3d893" stroke="#9c6c12" stroke-width="2"/><ellipse cx="30" cy="62" rx="9" ry="4.2" fill="#6b4a0c"/>
    <path d="M62 15l12-8" stroke="#e0b64f" stroke-width="6" stroke-linecap="round"/><path d="M74 7l8-3" stroke="#22202a" stroke-width="5" stroke-linecap="round"/>
    <g fill="#fff4c9" stroke="#9c6c12" stroke-width="1.6"><circle cx="62" cy="26" r="4"/><circle cx="62" cy="38" r="4"/><circle cx="62" cy="50" r="4"/><circle cx="56" cy="72" r="3.4"/></g></symbol>
  <symbol id="sl-o-llave" viewBox="0 0 100 100"><circle cx="33" cy="33" r="19" fill="none" stroke="#e0b64f" stroke-width="10"/><circle cx="33" cy="33" r="7" fill="none" stroke="#9c6c12" stroke-width="3"/>
    <path d="M47 47l38 38" stroke="#e0b64f" stroke-width="10" stroke-linecap="round"/><path d="M69 69l9-9M79 79l9-9" stroke="#e0b64f" stroke-width="8" stroke-linecap="round"/><path d="M49 45l33 33M22 24a14 14 0 0 1 16-6" stroke="#fff4c9" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".8"/></symbol>
</svg>`);
const SL_DIBUJO = { trebol: "sl-p-trebol", diamante: "sl-p-diamante", corazon: "sl-p-corazon", pica: "sl-p-pica", dado: "sl-o-dado", coctel: "sl-o-coctel", sombrero: "sl-o-sombrero", saxo: "sl-o-saxo" };

// HTML de un símbolo.
function slSimboloHTML(c){
  if (c.s === SL_LLAVE) return `<div class="sl-s sl-llave"><svg aria-hidden="true"><use href="#sl-o-llave"/></svg></div>`;
  if (c.s === SL_FAROL) return `<div class="sl-s sl-farol n${c.v >= 50 ? 3 : c.v >= 10 ? 2 : 1}"><span>×${c.v}</span></div>`;
  const S = SL_SIMBOLOS[c.s];
  if (S.id === "ficha") return `<div class="sl-s sl-ficha"><b>N</b></div>`;
  return `<div class="sl-s sl-${S.id}"><svg aria-hidden="true"><use href="#${SL_DIBUJO[S.id]}"/></svg></div>`;
}
function slNombre(c){ return c.s === SL_LLAVE ? "llave" : c.s === SL_FAROL ? `farol ×${c.v}` : SL_SIMBOLOS[c.s].nombre.toLowerCase(); }
// Crea una casilla arriba de la cuadrícula y la deja caer hasta su fila; al llegar se aplasta un poco (peso).
function slCrear(c, i, filaInicio, retraso, conGolpe = true){
  const col = Math.floor(i / SL_FILAS), fila = i % SL_FILAS, el = document.createElement("div");
  el.className = "sl-c"; el.style.setProperty("--c", col); el.style.setProperty("--f", filaInicio);
  el.innerHTML = slSimboloHTML(c); el.setAttribute("aria-label", slNombre(c));
  slRejilla.appendChild(el);
  void el.offsetWidth;
  el.style.transitionDelay = retraso * slVel() + "ms"; el.style.setProperty("--f", fila);
  if (conGolpe) setTimeout(() => el.classList.add("aterriza"), retraso * slVel() + 330);
  return el;
}
function slCartel(html, clase = ""){
  const c = $("#sl-cartel"); c.className = "sl-cartel " + clase; c.innerHTML = html;
  c.classList.remove("ver"); void c.offsetWidth; if (html) c.classList.add("ver");
}
// El marcador «Premio» sube contando hasta el valor nuevo.
function slContar(hasta){
  const el = $("#sl-ganancia"), desde = sl.mostrado, t0 = performance.now(), dur = Math.min(900, 250 + (hasta - desde) * 4) * slVel();
  sl.mostrado = hasta;
  if (hasta <= desde || dur < 30){ el.textContent = fmt(hasta); return; }
  let ultimo = 0;
  const paso = t => {
    if (sl.mostrado !== hasta) return;
    const e = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - e, 3))));
    if (t - ultimo > 60 && e < 1){ sonido.cuenta(); ultimo = t; }
    if (e < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
function slMarcador(v){ sl.mostrado = v; $("#sl-ganancia").textContent = fmt(v); }
// Cifra que sube desde el centro de un grupo ganador.
function slFlotante(celdas, texto, fuerte){
  const cs = celdas.map(i => [Math.floor(i / SL_FILAS), i % SL_FILAS]);
  const x = (cs.reduce((a, [c]) => a + c, 0) / cs.length + 0.5) / SL_COLS * 100, y = (cs.reduce((a, [, f]) => a + f, 0) / cs.length + 0.5) / SL_FILAS * 100;
  const el = document.createElement("span");
  el.className = "sl-flota" + (fuerte ? " fuerte" : ""); el.textContent = texto; el.style.cssText = `left:${x}%;top:${y}%`;
  slRejilla.appendChild(el); setTimeout(() => el.remove(), 1400);
}

/* ── rodillos como en una máquina real ──
   Cada columna se arma como una tira: arriba los 5 símbolos que salieron, en el medio símbolos de relleno
   (al azar, con la misma frecuencia del juego: no se eligen para «casi ganar») y abajo los que estaban.
   La tira baja hasta mostrar los nuevos. Solo es el dibujo: el resultado ya estaba decidido. */
async function slRodillos(nueva, modo){
  slMaquina.classList.add("girando");
  const fila = slRejilla.clientWidth / SL_COLS, vel = slVel(), promesas = [];
  sonido.rodillo((900 + 210 * (SL_COLS - 1)) * vel);
  for (let col = 0; col < SL_COLS; col++){
    const relleno = 10 + col * 3, base = col * SL_FILAS;
    const viejos = sl.celdas.slice(base, base + SL_FILAS);
    const simbolos = [...nueva.slice(base, base + SL_FILAS), ...Array.from({ length: relleno }, () => slCelda(Math.random, modo))];
    const tira = document.createElement("div");
    tira.className = "sl-tira"; tira.style.setProperty("--c", col);
    tira.innerHTML = simbolos.map(c => `<div class="sl-c-tira">${slSimboloHTML(c)}</div>`).join("");
    viejos.forEach(el => { if (el){ el.classList.remove("aterriza", "gana", "explota", "brilla"); el.style.cssText = ""; el.className = "sl-c-tira"; tira.appendChild(el); } });
    slRejilla.appendChild(tira);
    const recorrido = (relleno + SL_FILAS) * fila, dur = (900 + col * 210) * vel;
    const anim = tira.animate([
      { transform: `translateY(${-recorrido}px)`, offset: 0, easing: "ease-out" },
      { transform: `translateY(${-recorrido - fila * 0.25}px)`, offset: 0.07, easing: "cubic-bezier(.35,0,.2,1)" },   // impulso hacia arriba
      { transform: `translateY(${fila * 0.22}px)`, offset: 0.9, easing: "ease-in-out" },                               // se pasa un poquito…
      { transform: "translateY(0)", offset: 1 },                                                                        // …y vuelve: frenazo
    ], { duration: dur, fill: "forwards" });
    tira.classList.add("borroso");
    setTimeout(() => tira.classList.remove("borroso"), dur * 0.72);
    promesas.push(anim.finished.then(() => {
      // la columna quedó quieta: se cambia la tira por las casillas normales (para las cascadas)
      for (let f = 0; f < SL_FILAS; f++){
        const i = base + f, el = document.createElement("div");
        el.className = "sl-c"; el.style.setProperty("--c", col); el.style.setProperty("--f", f);
        el.innerHTML = slSimboloHTML(nueva[i]); el.setAttribute("aria-label", slNombre(nueva[i]));
        slRejilla.appendChild(el); sl.celdas[i] = el;
      }
      tira.remove();
      sonido.tope();
    }));
  }
  await Promise.all(promesas);
  slMaquina.classList.remove("girando");
  await slEspera(120);
}
// Monedas que caen a la bandeja de la máquina (solo cuando lo cobrado supera lo que costó la jugada).
function slMonedas(veces){
  const bandeja = $("#sl-bandeja"), n = Math.max(6, Math.min(40, Math.round(veces * 4)));
  for (let i = 0; i < n; i++){
    const m = document.createElement("i");
    m.className = "sl-moneda"; m.style.cssText = `--x:${8 + Math.random() * 84}%;--r:${Math.round(Math.random() * 720 - 360)}deg;--d:${(i * 45 + Math.random() * 60) | 0}ms;--y:${(Math.random() * 6) | 0}px`;
    bandeja.appendChild(m); setTimeout(() => m.remove(), 4200 + i * 45);
  }
  sonido.monedas(Math.min(14, n), 0.15);
}

// Muestra un giro completo (caída, premios, cascadas y multiplicadores). Devuelve lo ganado en fichas.
// costo = lo que costó la jugada: hasta que lo cobrado no lo supera, los avisos son tranquilos (sin fiesta).
async function slMostrarGiro(g, modo, bet, previo, costo){
  // 1) y 2) los rodillos: cada columna baja rápido (borrosa), frena y rebota; se detienen una por una
  await slRodillos(g.pasos[0].rejilla, modo);
  // 3) premios y cascadas
  let ganado = 0;
  for (let k = 0; k < g.pasos.length; k++){
    const p = g.pasos[k]; if (!p.premios.length) break;
    const ganPaso = p.premios.reduce((a, x) => a + x.pago, 0);
    ganado += ganPaso;
    const fuerte = previo + slFichas(ganado, bet) > costo;              // ¿ya cobró más de lo que costó?
    slRejilla.classList.add("con-premio");
    p.celdas.forEach(i => sl.celdas[i].classList.add("gana"));
    p.premios.forEach(x => slFlotante(p.celdas.filter(i => p.rejilla[i].s === x.s), "+" + fmt(slFichas(x.pago, bet)), fuerte));
    $("#sl-combo").textContent = k > 0 ? `Cascada ${k + 1}` : "";
    $("#sl-combo").classList.toggle("ver", k > 0);
    slCartel(p.premios.map(x => `<span>${x.n} × ${SL_SIMBOLOS[x.s].nombre.toLowerCase()} <b>+${fmt(slFichas(x.pago, bet))}</b></span>`).join(""));
    slContar(previo + slFichas(ganado, bet));
    if (fuerte) sonido.gana(1); else sonido.clavo(6);
    await slEspera(900);
    p.celdas.forEach(i => sl.celdas[i].classList.replace("gana", "explota"));
    sonido.carta(); if (fuerte) sonido.monedas(4);
    await slEspera(300);
    slRejilla.classList.remove("con-premio");
    p.celdas.forEach(i => sl.celdas[i].remove());
    // cascada: los que quedan bajan y entran nuevos por arriba
    const sig = g.pasos[k + 1].rejilla, ganadoras = new Set(p.celdas), nuevas = [];
    for (let col = 0; col < SL_COLS; col++){
      const base = col * SL_FILAS, quedan = [];
      for (let f = 0; f < SL_FILAS; f++) if (!ganadoras.has(base + f)) quedan.push(sl.celdas[base + f]);
      const n = SL_FILAS - quedan.length;
      for (let f = 0; f < n; f++) nuevas[base + f] = slCrear(sig[base + f], base + f, f - n - 0.6, col * 50 + (n - f) * 30);
      quedan.forEach((el, j) => { el.classList.remove("aterriza"); el.style.transitionDelay = col * 50 * slVel() + "ms"; el.style.setProperty("--f", n + j); nuevas[base + n + j] = el; });
    }
    sl.celdas = nuevas;
    setTimeout(() => sonido.tope(), 380 * slVel());
    await slEspera(720);
  }
  $("#sl-combo").classList.remove("ver");
  slCartel("");
  // 4) faroles: multiplican el premio del giro
  const faroles = sl.celdas.filter(el => el.querySelector(".sl-farol"));
  if (ganado > 0 && g.multSuma > 0){
    faroles.forEach(el => el.classList.add("brilla")); sonido.brillo();
    slCartel(modo === "gratis"
      ? `<span>Faroles <b>+${g.multSuma}</b> → multiplicador <b>×${g.acumulado}</b></span>`
      : `<span>Premio × <b>${g.multSuma}</b> = <b>${fmt(slFichas(ganado * g.factor, bet))}</b></span>`, "mult");
    slContar(previo + slFichas(ganado * g.factor, bet));
    await slEspera(1200);
  } else if (ganado > 0 && modo === "gratis" && g.factor > 1){
    slCartel(`<span>Premio × <b>${g.factor}</b> = <b>${fmt(slFichas(ganado * g.factor, bet))}</b></span>`, "mult");
    slContar(previo + slFichas(ganado * g.factor, bet));
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
  slContar(previo + total);
  return total;
}

// Presentación de los giros gratis: la máquina cambia de luz y aparece el cartel grande.
async function slIntroBono(compra){
  const intro = $("#sl-intro");
  slMaquina.classList.add("bono");
  intro.innerHTML = `<div><small>${compra ? "Compraste" : "¡4 llaves!"}</small><strong>${SL_GIROS} giros gratis</strong><span>Los faroles se acumulan en cada giro</span></div>`;
  intro.hidden = false; intro.classList.remove("ver"); void intro.offsetWidth; intro.classList.add("ver");
  sonido.gana(compra ? 2 : 3);
  await slEspera(2200);
  intro.classList.remove("ver"); await slEspera(300); intro.hidden = true;
}

// Una jugada: normal (cuesta la apuesta) o comprando los giros gratis (cuesta SL_PRECIO_COMPRA veces la apuesta).
async function slJugar(compra){
  const bet = apuesta, costo = compra ? bet * SL_PRECIO_COMPRA : bet;
  if (ocupado || !apostar("#s-msg", costo)) return;
  ocupado = true; slBotones(); msg("#s-msg", ""); slMarcador(0);
  slMaquina.classList.remove("gana");
  const demo = !compra && sl.demo;
  const j = compra ? slCompra() : demo ? slJugada(slAzarSemilla(SL_DEMO.semilla)) : slJugada();
  if (demo) slTerminarDemo();
  let mostrado = j.base ? await slMostrarGiro(j.base, "base", bet, 0, costo) : 0;
  if (j.gratis){
    let quedan = SL_GIROS;
    $("#sl-bono").hidden = false; $("#sl-giros").textContent = quedan; $("#sl-acum").textContent = "×0";
    await slIntroBono(compra);
    for (const g of j.gratis){
      $("#sl-giros").textContent = --quedan;
      mostrado += await slMostrarGiro(g, "gratis", bet, mostrado, costo);
      if (g.masGiros){ quedan += SL_MAS_GIROS; $("#sl-giros").textContent = quedan; slCartel(`<strong>+${SL_MAS_GIROS} giros gratis</strong>`, "bono"); sonido.gana(2); await slEspera(1400); }
    }
    slCartel(""); $("#sl-bono").hidden = true; slMaquina.classList.remove("bono");
  }
  const pagado = slFichas(j.total, bet);
  slMarcador(pagado);
  const detalle = demo ? "Jugada de demostración (elegida a propósito, no al azar). " : j.topado ? `¡Premio máximo de ×${fmt(SL_TOPE)}! ` : compra ? `Compraste ${SL_GIROS} giros gratis por ${fmt(costo)} y jugaste ${j.gratis.length}. ` : j.gratis ? `Giros gratis: ${j.gratis.length}. ` : "";
  // Se compara con lo que costó: solo se celebra (luces y fiesta) si recibes más de lo que pagaste.
  if (pagado > costo){ slMaquina.classList.add("gana"); setTimeout(() => slMaquina.classList.remove("gana"), 2600); slMonedas(pagado / costo); }
  liquidar("#s-msg", pagado, costo, detalle, SL_NIVELES);
  ocupado = false; slBotones(); slConsola();
}
$("#s-girar").onclick = () => slJugar(false);
// Barra espaciadora o Enter sobre la máquina = girar (solo con el tragamonedas a la vista y sin escribir en un campo).
document.addEventListener("keydown", e => {
  if (juegoActivo !== "slots" || e.repeat || (e.key !== " " && e.code !== "Space")) return;
  if (e.target.closest("input, textarea, select, button, dialog, [contenteditable]")) return;
  e.preventDefault(); slJugar(false);
});
// Apuesta desde la consola de la máquina (es la misma apuesta del panel).
function slCambiarApuesta(dir){
  if (ocupado) return;
  const i = SL_PASOS_APUESTA.findIndex(v => v >= apuesta), actual = i < 0 ? SL_PASOS_APUESTA.length - 1 : i;
  const sig = dir > 0 ? (SL_PASOS_APUESTA[actual] > apuesta ? actual : actual + 1) : actual - 1;
  setApuesta(SL_PASOS_APUESTA[Math.max(0, Math.min(SL_PASOS_APUESTA.length - 1, sig))]);
  sonido.ficha(); slConsola();
}
$("#sl-menos").onclick = () => slCambiarApuesta(-1);
$("#sl-mas").onclick = () => slCambiarApuesta(1);
function slBotones(){ $("#s-girar").disabled = $("#sl-comprar").disabled = $("#sl-menos").disabled = $("#sl-mas").disabled = ocupado; }
// Comprar pide confirmar con un segundo toque (es una jugada cara).
function slConsola(){
  $("#sl-apuesta").textContent = fmt(apuesta);
  const b = $("#sl-comprar"); if (!b.classList.contains("confirmar")) $("#sl-precio").textContent = "· " + fmt(apuesta * SL_PRECIO_COMPRA);
}
const slPrecio = slConsola;
$("#sl-comprar").onclick = () => {
  const b = $("#sl-comprar");
  if (ocupado) return;
  if (!b.classList.contains("confirmar")){
    if (apuesta * SL_PRECIO_COMPRA > saldo) return msg("#s-msg", `La compra cuesta ${fmt(apuesta * SL_PRECIO_COMPRA)} fichas (${SL_PRECIO_COMPRA} veces tu apuesta de ${fmt(apuesta)}). Baja la apuesta o usa «Recargar».`, "lose");
    b.classList.add("confirmar"); b.firstChild.textContent = "¿Confirmas? Toca otra vez ";
    msg("#s-msg", `Cuesta ${fmt(apuesta * SL_PRECIO_COMPRA)} fichas de práctica (${SL_PRECIO_COMPRA} × tu apuesta de ${fmt(apuesta)}). Los premios se pagan con tu apuesta de ${fmt(apuesta)}.`);
    sonido.clic();
    clearTimeout(b.t); b.t = setTimeout(() => { b.classList.remove("confirmar"); b.firstChild.textContent = "Comprar 10 giros gratis "; slConsola(); }, 5000);
    return;
  }
  clearTimeout(b.t); b.classList.remove("confirmar"); b.firstChild.textContent = "Comprar 10 giros gratis ";
  slJugar(true);
};
setInterval(slConsola, 300); slConsola();

// Focos del letrero: corren despacio en espera, rápido al girar y parpadean en oro cuando se gana.
["#sl-focos-arriba", "#sl-focos-abajo"].forEach(id => { $(id).innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join(""); });

// Tabla de pagos corta debajo de la máquina.
$("#sl-pagos").innerHTML = SL_SIMBOLOS.slice().reverse().map(S =>
  `<div>${slSimboloHTML({ s: SL_SIMBOLOS.indexOf(S) })}<span><b>8-9</b> ×${slNum(S.pagos[0])}</span><span><b>10-11</b> ×${slNum(S.pagos[1])}</span><span><b>12+</b> ×${slNum(S.pagos[2])}</span></div>`).join("") +
  `<div>${slSimboloHTML({ s: SL_LLAVE })}<span><b>4</b> ×3</span><span><b>5</b> ×5</span><span><b>6+</b> ×100</span></div>`;
// Cuadrícula inicial (decorativa) para que la máquina no se vea vacía.
sl.celdas = Array.from({ length: SL_COLS * SL_FILAS }, (_, i) => slCrear(slCelda(azar, "base"), i, i % SL_FILAS, 0, false));
// Modo demostración: solo con el enlace …/?demo=slots#slots. La siguiente jugada normal es la jugada real elegida (SL_DEMO).
sl.demo = new URLSearchParams(location.search).get("demo") === "slots";
function slTerminarDemo(){
  sl.demo = false; $("#sl-demo")?.remove();
  try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
}
if (sl.demo) slMaquina.insertAdjacentHTML("beforebegin", `<p class="sl-demo" id="sl-demo"><b>Modo demostración.</b> Tu próxima jugada es una jugada real de esta máquina elegida a propósito (paga ${fmt(Math.floor(SL_DEMO.veces))} veces la apuesta), no al azar. Después todo vuelve a ser al azar.</p>`);
