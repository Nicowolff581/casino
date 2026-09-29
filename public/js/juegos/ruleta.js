/* ═════════ RULETA EUROPEA ═════════
   37 casillas (0 a 36), todas igual de probables. Un número paga 35 a 1;
   las apuestas exteriores (rojo, par, 1-18…) pagan 1 a 1 y pierden si sale el 0.
   Se pueden poner varias fichas en el mismo giro; cada una se paga por separado. */
const ORDEN = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const ROJOS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorN = n => n === 0 ? "#1fa84a" : ROJOS.has(n) ? "#d10f35" : "#10141c";
let giroRueda = 0;                                  // ángulo actual de la rueda (grados)
const ruUlt = [];
(function dibujarRueda(){
  const seg = 360 / 37, c = 150, rad = a => a * Math.PI / 180;
  const pt = (a, rr) => [c + rr * Math.sin(rad(a)), c - rr * Math.cos(rad(a))];
  const arco = (r1, r2, a0, a1, fill, extra = "") => {
    const [x0, y0] = pt(a0, r2), [x1, y1] = pt(a1, r2), [x2, y2] = pt(a1, r1), [x3, y3] = pt(a0, r1);
    return `<path d="M${x0} ${y0} A${r2} ${r2} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r1} ${r1} 0 0 0 ${x3} ${y3} Z" fill="${fill}" ${extra}/>`;
  };
  let s = `<defs>
    <radialGradient id="madera" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#8a5a2b"/><stop offset="80%" stop-color="#4a2a12"/><stop offset="100%" stop-color="#2a160a"/></radialGradient>
    <radialGradient id="cono" cx="45%" cy="40%" r="60%"><stop offset="0%" stop-color="#7a4f28"/><stop offset="100%" stop-color="#2e1a0b"/></radialGradient>
    <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="50%" stop-color="#d4a441"/><stop offset="100%" stop-color="#7a5510"/></linearGradient>
    <radialGradient id="sombra" cx="50%" cy="50%" r="50%"><stop offset="80%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,.45)"/></radialGradient>
  </defs>
  <circle cx="150" cy="150" r="149" fill="url(#madera)"/><circle cx="150" cy="150" r="141" fill="none" stroke="url(#oro)" stroke-width="3"/>
  <circle cx="150" cy="150" r="139" fill="#1a1008"/>`;
  ORDEN.forEach((n, i) => {
    const a0 = (i - .5) * seg, a1 = (i + .5) * seg;
    s += arco(112, 136, a0, a1, colorN(n));
    s += arco(96, 112, a0, a1, colorN(n), 'opacity=".75"');
    const [tx, ty] = pt(i * seg, 124);
    s += `<text x="${tx}" y="${ty}" fill="#fff" font-family="Manrope, sans-serif" font-weight="800" font-size="10.5" text-anchor="middle" dominant-baseline="middle" transform="rotate(${i * seg} ${tx} ${ty})">${n}</text>`;
    const [fx0, fy0] = pt(a0, 96), [fx1, fy1] = pt(a0, 136);
    s += `<line x1="${fx0}" y1="${fy0}" x2="${fx1}" y2="${fy1}" stroke="url(#oro)" stroke-width="1.2"/>`;
  });
  s += `<circle cx="150" cy="150" r="112" fill="none" stroke="url(#oro)" stroke-width="1.5"/><circle cx="150" cy="150" r="96" fill="url(#cono)" stroke="url(#oro)" stroke-width="2"/>
    <circle cx="150" cy="150" r="136" fill="url(#sombra)"/>`;
  for (let k = 0; k < 8; k++){ const [x, y] = pt(k * 45, 70); s += `<line x1="150" y1="150" x2="${x}" y2="${y}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`; }
  s += `<g stroke="url(#oro)" stroke-width="5" stroke-linecap="round"><line x1="150" y1="118" x2="150" y2="182"/><line x1="118" y1="150" x2="182" y2="150"/></g>
    <circle cx="150" cy="118" r="5" fill="url(#oro)"/><circle cx="150" cy="182" r="5" fill="url(#oro)"/><circle cx="118" cy="150" r="5" fill="url(#oro)"/><circle cx="182" cy="150" r="5" fill="url(#oro)"/>
    <circle cx="150" cy="150" r="13" fill="url(#oro)"/><circle cx="150" cy="150" r="5" fill="#fff6d0"/>`;
  $("#rueda").innerHTML = s;
})();
(function pano(){
  const g = $("#ru-nums");
  const cero = document.createElement("button"); cero.className = "num cero"; cero.dataset.t = "0"; cero.textContent = "0"; g.appendChild(cero);
  for (let fila = 0; fila < 3; fila++) for (let col = 0; col < 12; col++){
    const n = col * 3 + (3 - fila), b = document.createElement("button");
    b.className = "num " + (ROJOS.has(n) ? "r" : "n"); b.dataset.t = String(n);
    b.style.gridRow = fila + 1; b.style.gridColumn = col + 2;
    b.innerHTML = `<span class="nro">${n}</span>`; b.setAttribute("aria-label", "Número " + n);
    g.appendChild(b);
  }
  // columnas «2 a 1» a la derecha de cada fila (la fila de arriba es la columna del 3 al 36)
  for (let fila = 0; fila < 3; fila++){
    const b = document.createElement("button"); b.className = "ext col"; b.dataset.t = "c" + (3 - fila);
    b.style.gridRow = fila + 1; b.style.gridColumn = 14; b.textContent = "2 a 1";
    g.appendChild(b);
  }
})();
const nombresRU = { r: "rojo", n: "negro", p: "par", i: "impar", b: "1 a 18", a: "19 a 36", d1: "1 a 12", d2: "13 a 24", d3: "25 a 36",
  c1: "la columna del 1 al 34", c2: "la columna del 2 al 35", c3: "la columna del 3 al 36" };
const nombreApuesta = t => nombresRU[t] || "el " + t;
// Fichas que paga una apuesta (incluye la ficha devuelta si gana).
// Pleno 35 a 1 · docena y columna 2 a 1 · rojo, negro, par, impar, 1-18 y 19-36 pagan 1 a 1. Con el 0 solo gana el pleno al 0.
function ruPremio(sel, n, bet){
  if (/^\d+$/.test(sel)) return +sel === n ? bet * 36 : 0;
  if (n === 0) return 0;
  if (sel[0] === "d") return Math.ceil(n / 12) === +sel[1] ? bet * 3 : 0;
  if (sel[0] === "c") return (n - 1) % 3 + 1 === +sel[1] ? bet * 3 : 0;
  return ({ r: ROJOS.has(n), n: !ROJOS.has(n), p: n % 2 === 0, i: n % 2 === 1, b: n <= 18, a: n >= 19 })[sel] ? bet * 2 : 0;
}
// Suma de todas las fichas del paño para el número n.
const ruPagoTotal = (fichas, n) => fichas.reduce((s, f) => s + ruPremio(f.t, n, f.monto), 0);
const sumaFichas = fichas => fichas.reduce((s, f) => s + f.monto, 0);

/* ── fichas sobre el paño ──
   ru.fichas: lista en el orden en que se pusieron (para «Deshacer»).
   ru.anterior: las fichas del último giro (para «Repetir apuesta»). */
const ru = { fichas: [], anterior: [], resultado: false };
const casillas = $$(".pano .num, .pano .ext");
// Monto corto para que quepa en la ficha: 1.500 → «1,5k», 2.000.000 → «2M».
const corto = (v, sufijo) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + sufijo;
const fmtCorto = n => n >= 1e6 ? corto(n / 1e6, "M") : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? corto(n / 1e3, "k") : String(n);

function pintarFichas(nueva){
  const porCasilla = {};
  ru.fichas.forEach(f => porCasilla[f.t] = (porCasilla[f.t] || 0) + f.monto);
  casillas.forEach(b => {
    const t = b.dataset.t, monto = porCasilla[t];
    let chip = b.querySelector(".ficha-ru");
    if (!monto){ chip?.remove(); b.setAttribute("aria-label", "Apostar a " + nombreApuesta(t)); return; }
    if (!chip){ chip = document.createElement("span"); chip.className = "ficha-ru"; b.appendChild(chip); }
    chip.textContent = fmtCorto(monto);
    if (t === nueva){ chip.classList.remove("cae"); void chip.offsetWidth; chip.classList.add("cae"); }
    b.setAttribute("aria-label", `${nombreApuesta(t)}: ${fmt(monto)} fichas`);
  });
  const total = sumaFichas(ru.fichas), n = Object.keys(porCasilla).length;
  $("#ru-sel").innerHTML = total ? `${ru.resultado ? "Última apuesta" : "Apuesta total"}: <b>${fmt(total)}</b> fichas en ${n} ${n === 1 ? "apuesta" : "apuestas"}.` : "Toca el paño para poner fichas.";
  ruBotones();
}
function ruBotones(){
  const hay = ru.fichas.length > 0 && !ru.resultado;
  $("#ru-girar").disabled = ocupado || !hay;
  $("#ru-deshacer").disabled = ocupado || !hay;
  $("#ru-borrar").disabled = ocupado || !hay;
  $("#ru-repetir").disabled = ocupado || !ru.anterior.length;
}
// Después de un giro, la siguiente acción limpia el paño.
function limpiarResultado(){
  if (!ru.resultado) return;
  ru.resultado = false; ru.fichas = [];
  casillas.forEach(b => b.classList.remove("gano", "perdio"));
  $("#ru-msg").textContent = "";
}
casillas.forEach(b => b.onclick = () => {
  if (ocupado) return;
  limpiarResultado();
  const total = sumaFichas(ru.fichas);
  if (total + apuesta > saldo){ avisar(saldo - total > 0 ? `Solo te alcanza para ${fmt(saldo - total)} fichas más.` : "No te quedan fichas para otra apuesta."); return; }
  ru.fichas.push({ t: b.dataset.t, monto: apuesta });
  sonido.ficha(); pintarFichas(b.dataset.t);
});
$("#ru-deshacer").onclick = () => { if (ocupado) return; const f = ru.fichas.pop(); sonido.clic(); pintarFichas(); if (f) avisar(`Quitaste ${fmt(f.monto)} de ${nombreApuesta(f.t)}.`); };
$("#ru-borrar").onclick = () => { if (ocupado) return; ru.fichas = []; sonido.clic(); pintarFichas(); };
$("#ru-repetir").onclick = () => {
  if (ocupado || !ru.anterior.length) return;
  limpiarResultado();
  const total = sumaFichas(ru.anterior);
  if (total > saldo){ avisar(`La apuesta anterior (${fmt(total)}) es mayor que tu saldo.`); return; }
  ru.fichas = ru.anterior.map(f => ({ ...f })); sonido.ficha(); pintarFichas();
  casillas.forEach(b => b.querySelector(".ficha-ru")?.classList.add("cae"));
};

/* ── animación de la bola ──
   La rueda gira en un sentido y la bola en el otro por el borde, frenando. Luego cae hacia las
   casillas, rebota sobre las vecinas y se queda en la suya, girando con la rueda hasta que ésta se detiene.
   Radios en % del tamaño de la rueda: borde 45 %, casillas 34,7 %. */
function ruPonerBola(ang, radio){
  const b = $("#ru-bola"), a = ang * Math.PI / 180;
  b.style.left = (50 + radio * Math.sin(a)) + "%"; b.style.top = (50 - radio * Math.cos(a)) + "%";
}
function ruAnimarBola(idx){
  const seg = 360 / 37, rapido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = rapido ? 400 : 7200, TD = rapido ? 250 : 4700, TC = rapido ? 350 : 5700;   // total, caída, encaje (ms)
  const W0 = giroRueda, VUELTAS = 360 * 3 + Math.round(azar() * 180);
  const rueda = t => W0 + VUELTAS * (1 - Math.pow(1 - Math.min(1, t / T), 3));        // frena suave
  const casilla = t => rueda(t) + idx * seg;                                          // dónde está la casilla ganadora
  const B0 = azar() * 360, fin = casilla(TD) % 360;
  const recorrido = ((B0 - fin) % 360 + 360) % 360 + 360 * (rapido ? 1 : 7);          // vueltas de la bola (al revés), termina sobre la casilla
  const bola = t => B0 - recorrido * (1 - Math.pow(1 - Math.min(1, t / TD), 2));
  let rebotes = 0; const t0 = performance.now();
  if (!rapido) sonido.giro(TD - 200, 0.03, 0.2);
  return new Promise(listo => {
    const paso = ahora => {
      const t = ahora - t0;
      $("#rueda").style.transform = `rotate(${rueda(t)}deg)`;
      if (t < TD) ruPonerBola(bola(t), 45);
      else if (t < TC){
        const u = (t - TD) / (TC - TD);
        const salto = Math.abs(Math.cos(u * Math.PI * 2.5)) * Math.pow(1 - u, 2);        // rebota contra los separadores
        ruPonerBola(casilla(t) + seg * 1.4 * (1 - u) * Math.sin(u * Math.PI * 3), 34.7 + 10.3 * salto);
        const r = Math.floor(u * 3); if (r > rebotes && !rapido){ rebotes = r; sonido.tope(); }
      } else ruPonerBola(casilla(t), 34.7);
      if (t < T) requestAnimationFrame(paso);
      else { giroRueda = rueda(T) % 360; sonido.clic(); listo(); }
    };
    requestAnimationFrame(paso);
  });
}
ruPonerBola(0, 45);

$("#ru-girar").onclick = async () => {
  const fichas = ru.fichas, total = sumaFichas(fichas);
  if (ocupado || !fichas.length || ru.resultado || !apostar("#ru-msg", total)) return;
  ocupado = true; ruBotones(); msg("#ru-msg", "No va más…", "neutral");
  const n = azarEntero(37);                          // el número se sortea aquí; la animación solo lo muestra
  $("#ru-resultado").className = "ru-resultado"; $("#ru-resultado").textContent = "";
  await ruAnimarBola(ORDEN.indexOf(n));
  const r = $("#ru-resultado"); r.textContent = n; r.className = "ru-resultado ver " + (n === 0 ? "v" : ROJOS.has(n) ? "r" : "n");
  ruUlt.unshift(n); ruUlt.splice(8);
  $("#ru-ult").innerHTML = ruUlt.map(x => `<span style="background:${colorN(x)}">${x}</span>`).join("");
  // Marca en el paño qué apuestas ganaron y cuáles perdieron.
  const ganadoras = new Set(fichas.filter(f => ruPremio(f.t, n, 1)).map(f => f.t));
  casillas.forEach(b => { if (b.querySelector(".ficha-ru")) b.classList.add(ganadoras.has(b.dataset.t) ? "gano" : "perdio"); });
  ru.anterior = fichas.map(f => ({ ...f })); ru.resultado = true;
  pintarFichas();
  const detalle = ganadoras.size ? `Ganaron: ${[...ganadoras].map(nombreApuesta).join(", ")}. ` : "";
  liquidar("#ru-msg", ruPagoTotal(fichas, n), total, `Salió el ${n} ${n === 0 ? "verde" : ROJOS.has(n) ? "rojo" : "negro"}. ${detalle}`);
  ocupado = false; ruBotones();
};
pintarFichas();
