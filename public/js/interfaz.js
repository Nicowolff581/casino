/* ═════════ Casino Nico · pantalla de inicio, reglas, sonido y carga ═════════
   Se carga al final, cuando todos los juegos ya están listos. */

/* ── tarjetas de la pantalla de inicio ── */
const INFO_JUEGOS = [
  { id: "poker",  nombre: "Texas Hold'em", desc: "Contra Valentina y Mateo", fondo: "linear-gradient(165deg, #1c4a36, #0e241a)", brillo: "rgba(216,178,90,.25)" },
  { id: "bj",     nombre: "Blackjack",     desc: "Llega a 21 sin pasarte",   fondo: "linear-gradient(165deg, #1a3d52, #0c1d28)", brillo: "rgba(120,190,255,.2)" },
  { id: "ruleta", nombre: "Ruleta",        desc: "Europea, un solo cero",    fondo: "linear-gradient(165deg, #5c1422, #2a0910)", brillo: "rgba(239,210,142,.25)" },
  { id: "slots",  nombre: "Tragamonedas",  desc: "Frutas de oro",            fondo: "linear-gradient(165deg, #54301a, #26140a)", brillo: "rgba(255,190,90,.25)" },
  { id: "avion",  nombre: "Avión",         desc: "Aterriza y cobra",         fondo: "linear-gradient(165deg, #1d2d5c, #0c142c)", brillo: "rgba(140,170,255,.25)" },
  { id: "plinko", nombre: "Plinko",        desc: "Suelta la bola",           fondo: "linear-gradient(165deg, #3d1d55, #1a0c28)", brillo: "rgba(220,140,255,.22)" },
  { id: "pollo",  nombre: "Pollo",         desc: "Cruza y cobra a tiempo",   fondo: "linear-gradient(165deg, #4a4418, #201d08)", brillo: "rgba(255,230,120,.22)" },
  { id: "fantan", nombre: "Fan-Tan",       desc: "Un clásico chino",         fondo: "linear-gradient(165deg, #5a2a12, #2a1206)", brillo: "rgba(255,170,110,.22)" },
];
$("#tarjetas").innerHTML = INFO_JUEGOS.map((j, i) =>
  `<button class="tarjeta" data-ir="${j.id}" style="--i:${i};--fondo-tarjeta:${j.fondo};--brillo:${j.brillo}">
    <span class="brillo"></span><span class="rtp" title="Cuánto devuelve a largo plazo">${RESUMEN_DEVOLUCION[j.id]}</span>
    <svg class="arte" aria-hidden="true"><use href="#i-${j.id}"/></svg><b>${j.nombre}</b><small>${j.desc}</small></button>`).join("") +
  "";
$("#v-inicio").insertAdjacentHTML("beforeend", `<p class="pie-inicio">El porcentaje de cada tarjeta es cuánto devuelve el juego a largo plazo. Toca «Reglas» dentro de cada juego para ver cómo se calcula.</p>`);
$$("#tarjetas [data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));

/* ── botón «Reglas» en cada juego ── */
const dialogo = $("#reglas-dialogo");
$$(".game").forEach(g => {
  const id = g.id.slice(2), h2 = g.querySelector("h2"), cab = document.createElement("div");
  cab.className = "juego-cab"; h2.replaceWith(cab); cab.appendChild(h2);
  if (!REGLAS[id]) return;
  const b = document.createElement("button");
  b.className = "btn-reglas"; b.innerHTML = `<svg aria-hidden="true"><use href="#i-reglas"/></svg>Reglas<span class="largo"> y probabilidades</span>`;
  b.onclick = () => abrirReglas(id);
  cab.appendChild(b);
});
function abrirReglas(id){
  $("#reglas-titulo").textContent = "Reglas · " + $("#g-" + id + " h2").textContent;
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
mostrarJuego(decodeURIComponent(location.hash.slice(1)) || "inicio");
const inicioCarga = performance.now();
function quitarCarga(){ setTimeout(() => $("#carga").classList.add("fuera"), Math.max(0, 900 - (performance.now() - inicioCarga))); }
if (document.readyState === "complete") quitarCarga(); else addEventListener("load", quitarCarga);
setTimeout(() => $("#carga").classList.add("fuera"), 4000);   // por si una fuente tarda demasiado
