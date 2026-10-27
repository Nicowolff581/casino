/* ═════════ RULETA EUROPEA ═════════
   37 casillas (0 a 36), todas igual de probables. Las reglas y los pagos están en ruleta-comun.js
   (los comparte la ruleta en línea). Se pueden poner varias fichas en el mismo giro. */
let giroRueda = 0;                                  // ángulo actual de la rueda (grados)
const ruUlt = [];
// Resultado de 1.000.000 de giros con el mismo código (pruebas/simular-ruleta.js): se muestra en las reglas.
const RU_SIMULADO = { giros: 1000000, chi: 33.57, porNumero: [0.027097, 0.027256, 0.026951, 0.027177, 0.026825, 0.026867, 0.026939, 0.027072, 0.027012, 0.026936, 0.027378, 0.026905, 0.027201, 0.02687, 0.026893, 0.027002, 0.02707, 0.026682, 0.027222, 0.02704, 0.027143, 0.026857, 0.027314, 0.026783, 0.027073, 0.027063, 0.027022, 0.026836, 0.027042, 0.027031, 0.027256, 0.026914, 0.026946, 0.02689, 0.027131, 0.027084, 0.02722],
  devuelve: {"pleno (17)":0.96055,"rojo":0.97365,"par":0.97528,"docena 1":0.97356,"columna 1":0.97493,"1 a 18":0.97252} };
/* ── dibujo de la rueda ──
   Como en una ruleta real, el cuenco de madera con la pista de la bola y los rombos NO gira; solo gira la
   cabeza (números, casillas y torreta). Encima va un brillo de luz fijo, así se nota que la cabeza gira.
   Medidas en un cuadro de 300: pista de la bola 114-138, números 92-112, casillas 74-92, cono < 74. */
const RU_COLOR_RUEDA = { r: ["#b0122b", "#6f0a1b"], n: ["#17181d", "#0b0c10"], v: ["#139142", "#0b5a29"] };
const ruTipo = n => n === 0 ? "v" : ROJOS.has(n) ? "r" : "n";
function ruPunto(a, rr, c = 150){ const r = a * Math.PI / 180; return [c + rr * Math.sin(r), c - rr * Math.cos(r)]; }
function ruArco(r1, r2, a0, a1, fill, extra = ""){
  const [x0, y0] = ruPunto(a0, r2), [x1, y1] = ruPunto(a1, r2), [x2, y2] = ruPunto(a1, r1), [x3, y3] = ruPunto(a0, r1);
  return `<path d="M${x0} ${y0} A${r2} ${r2} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r1} ${r1} 0 0 0 ${x3} ${y3} Z" fill="${fill}" ${extra}/>`;
}
// La cabeza que gira. «p» distingue los degradados si hay dos ruedas en la página.
function ruedaSVG(p = "r"){
  const seg = 360 / 37;
  let s = `<defs>
    <linearGradient id="${p}-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="45%" stop-color="#d4a441"/><stop offset="100%" stop-color="#6e4a0c"/></linearGradient>
    <radialGradient id="${p}-cono" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#8a5a2b"/><stop offset="70%" stop-color="#5a3517"/><stop offset="100%" stop-color="#2e1a0b"/></radialGradient>
    <radialGradient id="${p}-hueco" cx="50%" cy="50%" r="50%"><stop offset="78%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,.55)"/></radialGradient>
    <radialGradient id="${p}-domo" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fff6d0"/><stop offset="45%" stop-color="#d4a441"/><stop offset="100%" stop-color="#5a3d0c"/></radialGradient>
  </defs>
  <circle cx="150" cy="150" r="113" fill="#0b0c10"/>`;
  ORDEN.forEach((n, i) => {
    const a0 = (i - .5) * seg, a1 = (i + .5) * seg, [claro, oscuro] = RU_COLOR_RUEDA[ruTipo(n)];
    s += ruArco(92, 112, a0, a1, claro);
    s += ruArco(74, 92, a0, a1, oscuro);
    const [tx, ty] = ruPunto(i * seg, 102);
    s += `<text x="${tx}" y="${ty}" fill="#fff" font-family="Manrope, sans-serif" font-weight="800" font-size="9" text-anchor="middle" dominant-baseline="central" transform="rotate(${i * seg} ${tx} ${ty})">${n}</text>`;
  });
  // fondo de cada casilla más oscuro (profundidad) y separadores metálicos
  s += `<circle cx="150" cy="150" r="92" fill="url(#${p}-hueco)" opacity=".9"/>`;
  ORDEN.forEach((n, i) => {
    const a = (i - .5) * seg, [x0, y0] = ruPunto(a, 74), [x1, y1] = ruPunto(a, 92), [x2, y2] = ruPunto(a, 112);
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="url(#${p}-oro)" stroke-width="1.8" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(243,216,147,.55)" stroke-width=".7"/>`;
  });
  s += `<circle cx="150" cy="150" r="112" fill="none" stroke="url(#${p}-oro)" stroke-width="2.2"/><circle cx="150" cy="150" r="92" fill="none" stroke="url(#${p}-oro)" stroke-width="1.3"/>
    <circle cx="150" cy="150" r="74" fill="url(#${p}-cono)" stroke="url(#${p}-oro)" stroke-width="2.2"/>`;
  // vetas de la madera del cono y torreta con cuatro brazos
  for (let k = 0; k < 16; k++){ const [x, y] = ruPunto(k * 22.5, 70), [x0, y0] = ruPunto(k * 22.5, 18); s += `<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="rgba(0,0,0,.22)" stroke-width="${k % 2 ? .6 : 1.2}"/>`; }
  s += `<circle cx="150" cy="150" r="56" fill="none" stroke="rgba(243,216,147,.25)" stroke-width="1"/>
    <g stroke="url(#${p}-oro)" stroke-width="5" stroke-linecap="round"><line x1="150" y1="114" x2="150" y2="186"/><line x1="114" y1="150" x2="186" y2="150"/></g>
    <g fill="url(#${p}-domo)"><circle cx="150" cy="112" r="5.5"/><circle cx="150" cy="188" r="5.5"/><circle cx="112" cy="150" r="5.5"/><circle cx="188" cy="150" r="5.5"/></g>
    <circle cx="150" cy="150" r="15" fill="url(#${p}-domo)" stroke="#5a3d0c" stroke-width="1"/><circle cx="150" cy="150" r="5" fill="#fff6d0"/>`;
  return s;
}
// El cuenco fijo: borde de madera, pista de la bola (donde rueda) y labio dorado.
function ruCuencoSVG(p = "r"){
  return `<defs>
    <radialGradient id="${p}-madera" cx="40%" cy="30%" r="75%"><stop offset="0%" stop-color="#9a6332"/><stop offset="60%" stop-color="#5a3216"/><stop offset="100%" stop-color="#2a160a"/></radialGradient>
    <radialGradient id="${p}-pista" cx="50%" cy="50%" r="50%"><stop offset="74%" stop-color="#21140b"/><stop offset="84%" stop-color="#3d2614"/><stop offset="90%" stop-color="#4f3219"/><stop offset="100%" stop-color="#2a180b"/></radialGradient>
    <linearGradient id="${p}-oroC" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="50%" stop-color="#d4a441"/><stop offset="100%" stop-color="#6e4a0c"/></linearGradient>
  </defs>
  <circle cx="150" cy="150" r="149" fill="url(#${p}-madera)"/>
  <circle cx="150" cy="150" r="141" fill="none" stroke="url(#${p}-oroC)" stroke-width="2.5"/>
  <circle cx="150" cy="150" r="139" fill="url(#${p}-pista)"/>
  <circle cx="150" cy="150" r="127" fill="none" stroke="rgba(255,240,210,.06)" stroke-width="4"/>
  <circle cx="150" cy="150" r="114.5" fill="none" stroke="url(#${p}-oroC)" stroke-width="1.6"/>`;
}
// Arma la rueda completa dentro de su caja (la usan la ruleta sola y la ruleta en línea).
function ruMontarRueda(caja, p){
  const cabeza = caja.querySelector("svg"); cabeza.innerHTML = ruedaSVG(p); cabeza.classList.add("ru-cabeza");
  if (caja.querySelector(".ru-cuenco")) return;
  cabeza.insertAdjacentHTML("beforebegin", `<svg class="ru-cuenco" viewBox="0 0 300 300" aria-hidden="true">${ruCuencoSVG(p)}</svg>`);
  let rombos = "";
  for (let k = 0; k < RU_ROMBOS; k++){
    const a = (k + 0.5) * 360 / RU_ROMBOS, [x, y] = ruPunto(a, RU_ROMBO * 3), alto = k % 2 ? 7 : 5;     // rombos altos y bajos, alternados
    rombos += `<path d="M0 -${alto} L2.6 0 L0 ${alto} L-2.6 0 Z" transform="translate(${x} ${y}) rotate(${a})" fill="url(#rombo-oro-${p})" stroke="#5a3d0c" stroke-width=".6"/>`;
  }
  cabeza.insertAdjacentHTML("afterend", `<svg class="ru-rombos" viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id="rombo-oro-${p}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff1b8"/><stop offset="60%" stop-color="#d4a441"/><stop offset="100%" stop-color="#7a5510"/></linearGradient></defs>${rombos}</svg><div class="ru-brillo" aria-hidden="true"></div>`);
  const bola = caja.querySelector(".bola");
  for (let i = 0; i < 3; i++) bola.insertAdjacentHTML("beforebegin", `<div class="bola rastro" aria-hidden="true" style="--o:${0.32 - i * 0.09}"></div>`);
}
/* ── el paño ──
   Una sola cuadrícula. Cada casilla sabe dónde va en el paño horizontal (computador) y en el vertical
   (celular, como en las mesas de las aplicaciones); el CSS elige según el ancho de la pantalla. */
function construirPano(raiz){
  const g = document.createElement("div"); g.className = "pano-grid";
  const casilla = (html, t, clase, h, v, etiqueta) => {
    const b = document.createElement("button"); b.className = clase; b.dataset.t = t; b.innerHTML = html;
    b.style.cssText = `--hr:${h[0]};--hc:${h[1]};--hrs:${h[2] || 1};--hcs:${h[3] || 1};--vr:${v[0]};--vc:${v[1]};--vrs:${v[2] || 1};--vcs:${v[3] || 1}`;
    if (etiqueta) b.setAttribute("aria-label", etiqueta);
    g.appendChild(b);
  };
  casilla(`<span class="nro">0</span>`, "0", "num cero v", [1, 1, 3, 1], [1, 3, 1, 3], "Número 0");
  for (let n = 1; n <= 36; n++){
    const k = Math.ceil(n / 3) - 1, m = (n - 1) % 3;
    casilla(`<span class="nro">${n}</span>`, String(n), "num " + (ROJOS.has(n) ? "r" : "n"), [3 - m, k + 2], [k + 2, m + 3], "Número " + n);
  }
  for (let m = 0; m < 3; m++) casilla("2 a 1", "c" + (m + 1), "ext col", [3 - m, 14], [14, m + 3], `Columna ${["del 1 al 34", "del 2 al 35", "del 3 al 36"][m]}`);
  ["1 a 12", "13 a 24", "25 a 36"].forEach((txt, i) => casilla(txt, "d" + (i + 1), "ext doc", [4, 2 + 4 * i, 1, 4], [2 + 4 * i, 2, 4, 1]));
  [["1 a 18", "b"], ["Par", "p"], ["", "r", "rojo", "Rojo"], ["", "n", "negro", "Negro"], ["Impar", "i"], ["19 a 36", "a"]].forEach(([txt, t, extra, etq], i) =>
    casilla(extra ? `<i class="rombo"></i>` : txt, t, "ext " + (extra || ""), [5, 2 + 2 * i, 1, 2], [2 + 2 * i, 1, 2, 1], etq));
  raiz.innerHTML = "";
  raiz.appendChild(g);
  return [...g.querySelectorAll(".num, .ext")];
}
// Color de la ficha según su valor, como en un casino (blanca 1, roja 5, verde 25, negra 100, morada 500, naranja 1.000).
const ruClaseFicha = m => m >= 1000 ? "v1k" : m >= 500 ? "v500" : m >= 100 ? "v100" : m >= 25 ? "v25" : m >= 5 ? "v5" : "v1";
// Marcador de cristal sobre el número ganador (como el que pone el crupier).
function ruMarcador(casillas, n){
  casillas.forEach(b => b.querySelector(".ru-dolly")?.remove());
  const b = casillas.find(x => x.dataset.t === String(n)); if (!b) return;
  b.insertAdjacentHTML("beforeend", `<span class="ru-dolly" aria-hidden="true"></span>`);
}
// Monto corto para que quepa en la ficha: 1.500 → «1,5k», 2.000.000 → «2M».
const corto = (v, sufijo) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + sufijo;
const fmtCorto = n => n >= 1e6 ? corto(n / 1e6, "M") : n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? corto(n / 1e3, "k") : String(n);

/* ── animación de la bola (la usan la ruleta sola y la ruleta en línea) ──
   El recorrido lo arma ruTrayectoria (ruleta-comun.js) a partir de la semilla de cada giro: vueltas, frenado,
   choques con los rombos y rebotes entre casillas cambian en cada giro. Con los mismos datos del giro,
   todos ven exactamente el mismo movimiento, y siempre termina en el número sorteado. */
const ruGiroNuevo = (rnd = azar) => ({ vueltas: 270 + Math.round(rnd() * 90), bola0: rnd() * 360, semilla: Math.floor(rnd() * 2 ** 31) });
function ruPonerBola(bola, ang, radio, giro = 0){
  const a = ang * Math.PI / 180;
  bola.style.left = (50 + radio * Math.sin(a)) + "%"; bola.style.top = (50 - radio * Math.cos(a)) + "%";
  bola.style.setProperty("--g", giro + "deg");
}
function ruAnimar({ svg, bola, idx, rueda0, vueltas, bola0, semilla = 0, transcurrido = 0 }){
  // Siempre se anima completa (aunque el celular tenga «reducir movimiento»): el giro es parte del juego.
  const tr = ruTrayectoria({ idx, rueda0, vueltas, bola0, semilla }), P = tr.plan, T = tr.T;
  const t0 = performance.now() - transcurrido;
  let ev = tr.eventos.findIndex(e => e.t >= transcurrido); if (ev < 0) ev = tr.eventos.length;
  // el rodar de la bola: el tono cambia un poco en cada giro
  if (transcurrido < P.TD - 400) sonido.giro(P.TD - 200 - transcurrido, 0.03 * P.tono, 0.28 * P.tono);
  // estela: copias tenues de la bola en sus posiciones de hace un instante (solo cuando va rápido)
  const rastro = [...bola.parentElement.querySelectorAll(".bola.rastro")];
  return new Promise(listo => {
    const paso = ahora => {
      const t = Math.min(T, ahora - t0), b = tr.bola(t);
      svg.style.transform = `rotate(${tr.rueda(t)}deg)`;
      // la bola gira sobre sí misma según lo que avanza (más rápido cuando corre por el borde)
      ruPonerBola(bola, b.ang, b.radio, b.fase === "quieta" ? tr.rueda(t) * 3 : b.ang * -9);
      rastro.forEach((r, i) => {
        const tt = Math.max(0, t - (i + 1) * 26), bb = tr.bola(tt), vel = Math.abs(b.ang - bb.ang) / (i + 1);
        ruPonerBola(r, bb.ang, bb.radio); r.style.opacity = b.fase === "borde" || b.fase === "cae" ? Math.min(1, vel / 3) : 0;
      });
      while (ev < tr.eventos.length && tr.eventos[ev].t <= t){
        const e = tr.eventos[ev++];
        if (e.tipo === "rombo") sonido.rombo(e.f); else sonido.casillita(e.f);
      }
      if (t < T) requestAnimationFrame(paso);
      else { rastro.forEach(r => r.style.opacity = 0); sonido.clic(); listo(tr.rueda(T) % 360); }
    };
    requestAnimationFrame(paso);
  });
}

ruMontarRueda($("#rueda").parentElement, "r1");
ruPonerBola($("#ru-bola"), 0, RU_BORDE);
const casillas = construirPano($("#ru-pano"));
/* ── fichas sobre el paño ──
   ru.fichas: lista en el orden en que se pusieron (para «Deshacer»).
   ru.anterior: las fichas del último giro (para «Repetir apuesta»). */
const ru = { fichas: [], anterior: [], resultado: false };

function pintarFichas(nueva){
  const porCasilla = {};
  ru.fichas.forEach(f => porCasilla[f.t] = (porCasilla[f.t] || 0) + f.monto);
  casillas.forEach(b => {
    const t = b.dataset.t, monto = porCasilla[t];
    let chip = b.querySelector(".ficha-ru");
    if (!monto){ chip?.remove(); b.setAttribute("aria-label", "Apostar a " + nombreApuesta(t)); return; }
    if (!chip){ chip = document.createElement("span"); b.appendChild(chip); }
    chip.className = "ficha-ru " + ruClaseFicha(monto) + (chip.classList.contains("cae") ? " cae" : "");
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
  casillas.forEach(b => { b.classList.remove("gano", "perdio"); b.querySelector(".ru-dolly")?.remove(); });
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

$("#ru-girar").onclick = async () => {
  const fichas = ru.fichas, total = sumaFichas(fichas);
  if (ocupado || !fichas.length || ru.resultado || !apostar("#ru-msg", total)) return;
  ocupado = true; ruBotones(); msg("#ru-msg", "No va más…", "neutral");
  const n = azarEntero(37);                          // el número se sortea aquí; la animación solo lo muestra
  $("#ru-resultado").className = "ru-resultado"; $("#ru-resultado").textContent = "";
  giroRueda = await ruAnimar({ svg: $("#rueda"), bola: $("#ru-bola"), idx: ORDEN.indexOf(n), rueda0: giroRueda, ...ruGiroNuevo() });
  const r = $("#ru-resultado"); r.textContent = n; r.className = "ru-resultado ver " + (n === 0 ? "v" : ROJOS.has(n) ? "r" : "n");
  ruUlt.unshift(n); ruUlt.splice(10);
  ruPintarTablero();
  ruMarcador(casillas, n);
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
// Tablero de resultados como el de las mesas: rojos a la izquierda, negros a la derecha y el cero al centro.
function ruPintarTablero(){
  $("#ru-ult").innerHTML = ruUlt.length ? ruUlt.map((x, i) => { const t = ruTipo(x); return `<li class="${t}${i === 0 ? " ultimo" : ""}"><span>${t === "r" ? x : ""}</span><span>${t === "v" ? x : ""}</span><span>${t === "n" ? x : ""}</span></li>`; }).join("")
    : `<li class="vacio"><span></span><span>Todavía no hay giros</span><span></span></li>`;
}
ruPintarTablero();
// Fichero: toca una ficha para elegir su valor (es el mismo monto del panel de apuesta).
const RU_FICHERO = [1, 5, 25, 100, 500, 1000];
$("#ru-fichero").innerHTML = RU_FICHERO.map(v => `<button class="ficha-ru ${ruClaseFicha(v)}" data-v="${v}" aria-label="Fichas de ${fmt(v)}">${fmtCorto(v)}</button>`).join("");
$$("#ru-fichero button").forEach(b => b.onclick = () => { if (ocupado) return; setApuesta(+b.dataset.v); sonido.ficha(); ruFicheroActivo(); });
function ruFicheroActivo(){ $$("#ru-fichero button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === apuesta)); }
setInterval(ruFicheroActivo, 400); ruFicheroActivo();
