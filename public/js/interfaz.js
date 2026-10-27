/* ═════════ Casino Nico · pantalla de inicio, reglas, sonido y carga ═════════
   Se carga al final, cuando todos los juegos ya están listos. */

/* ── tarjetas de la pantalla de inicio ── */
const INFO_JUEGOS = [
  { id: "slots",  nombre: "Medianoche en el Club", desc: "Tragamonedas con cascadas y giros gratis" },
  { id: "ruleta", nombre: "Ruleta",        desc: "Europea, un solo cero" },
  { id: "bj",     nombre: "Blackjack",     desc: "Llega a 21 sin pasarte" },
  { id: "poker",  nombre: "Texas Hold'em", desc: "Contra Valentina y Mateo" },
  { id: "avion",  nombre: "Avión",         desc: "Del barco al portaaviones" },
  { id: "plinko", nombre: "Plinko",        desc: "Suelta la bola entre los clavos" },
  { id: "pollo",  nombre: "Pollo",         desc: "Cruza y cobra a tiempo" },
  { id: "fantan", nombre: "Fan-Tan",       desc: "Un clásico chino de fichas" },
];
// Cada tarjeta muestra una captura real del juego (img/lobby, se rehacen con pruebas/capturar-miniaturas.js).
$("#tarjetas").innerHTML = INFO_JUEGOS.map((j, i) =>
  `<button class="tarjeta" data-ir="${j.id}" style="--i:${i}">
    <span class="foto"><img src="img/lobby/${j.id}.jpg" alt="" width="640" height="400" loading="${i < 4 ? "eager" : "lazy"}"></span>
    <span class="tarjeta-texto"><b>${j.nombre}</b><small>${j.desc}</small><span class="rtp" title="Cuánto devuelve a largo plazo">${j.id === "poker" ? "Sin comisión de la casa" : "Devuelve " + RESUMEN_DEVOLUCION[j.id]}</span></span></button>`).join("");
$("#v-inicio").insertAdjacentHTML("beforeend", `<p class="pie-inicio">«Devuelve» es cuánto paga cada juego a la larga por cada 100 fichas apostadas. Toca «Reglas» dentro de cada juego para ver cómo se calcula.</p>`);
$$("#tarjetas [data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));


/* ── botón «Reglas» en cada juego ── */
const dialogo = $("#reglas-dialogo");
$$(".game").forEach(g => {
  const id = g.id.slice(2), h2 = g.querySelector("h1"), cab = document.createElement("div");
  cab.className = "juego-cab"; h2.replaceWith(cab); cab.appendChild(h2);
  if (!REGLAS[id]) return;
  const b = document.createElement("button");
  b.className = "btn-reglas"; b.innerHTML = `<svg aria-hidden="true"><use href="#i-reglas"/></svg>Reglas<span class="largo"> y probabilidades</span>`;
  b.onclick = () => abrirReglas(id);
  cab.appendChild(b);
});
function abrirReglas(id){
  $("#reglas-titulo").textContent = "Reglas · " + $("#g-" + id + " h1").textContent;
  $("#reglas-cuerpo").innerHTML = REGLAS[id]();
  sonido.clic();
  dialogo.showModal();
  $("#reglas-cuerpo").scrollTop = 0;
}
$("#reglas-cerrar").onclick = () => dialogo.close();
dialogo.addEventListener("click", e => { if (e.target === dialogo) dialogo.close(); });   // tocar fuera cierra

/* ── panel de sonido ── */
const sBtn = $("#sonido-btn"), sPanel = $("#sonido-panel"), sOn = $("#sonido-on"), sVol = $("#sonido-vol");
function pintarSonido(){
  sOn.checked = sonido.activo; sVol.value = Math.round(sonido.volumen * 100);
  sBtn.querySelector("use").setAttribute("href", sonido.activo && sonido.volumen > 0 ? "#i-sonido" : "#i-mudo");
  sBtn.setAttribute("aria-label", sonido.activo ? "Sonido activado" : "Sonido silenciado");
}
sBtn.onclick = e => { e.stopPropagation(); sPanel.hidden = !sPanel.hidden; sBtn.setAttribute("aria-expanded", !sPanel.hidden); };
sOn.onchange = () => { sonido.setActivo(sOn.checked); pintarSonido(); sonido.clic(); };
sVol.oninput = () => { sonido.setVolumen(sVol.value / 100); if (!sonido.activo && sVol.value > 0) sonido.setActivo(true); pintarSonido(); };
sVol.onchange = () => sonido.ficha();
document.addEventListener("click", e => { if (!sPanel.hidden && !e.target.closest(".sonido")){ sPanel.hidden = true; sBtn.setAttribute("aria-expanded", "false"); } });
pintarSonido();

/* ── arranque: abrir el juego de la dirección (#ruleta…) y quitar la pantalla de carga ── */
{ const h = decodeURIComponent(location.hash.slice(1)); mostrarJuego(h.startsWith("sala=") ? "amigos" : h || "inicio"); }
const inicioCarga = performance.now();
function quitarCarga(){ setTimeout(() => $("#carga").classList.add("fuera"), Math.max(0, 900 - (performance.now() - inicioCarga))); }
if (document.readyState === "complete") quitarCarga(); else addEventListener("load", quitarCarga);
setTimeout(() => $("#carga").classList.add("fuera"), 4000);   // por si una fuente tarda demasiado
