/* ═════════ FAN-TAN ═════════
   Se tapan entre 20 y 59 fichas (40 cantidades posibles, 10 de cada resto) y se retiran
   de 4 en 4. Lo que queda (1, 2, 3 o 4) tiene exactamente 1 de 4 de probabilidad.
   Acertar paga 3 a 1 menos 5 % de comisión sobre la ganancia. */
const ftSortear = () => 20 + azarEntero(40);
const ftResto = n => (n - 1) % 4 + 1;                             // lo que queda al retirar de 4 en 4
const ftPremio = (sel, resto, bet) => sel === resto ? bet + Math.floor(bet * 3 * 0.95) : 0;
let ftSel = null;
function ftSembrar(n){
  const m = $("#ft-monton"); m.innerHTML = "";
  for (let i = 0; i < n; i++){
    const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 36;
    const b = document.createElement("span"); b.className = "frijol";
    b.style.left = (50 + r * Math.cos(a)) + "%"; b.style.top = (50 + r * Math.sin(a)) + "%";
    b.style.transform = `translate(-50%, -50%) rotate(${azar() * 180}deg)`;
    m.appendChild(b);
  }
}
ftSembrar(34);
grupoOpciones(".ft-lado", b => {
  ftSel = +b.dataset.n;
  $("#ft-jugar").disabled = false; $("#ft-jugar").textContent = `Jugar al ${ftSel}`;
});
// Mueve un elemento desde donde está otro (efecto «volar hasta su lugar»).
function volarDesde(el, origen, retraso = 0){
  const a = origen.getBoundingClientRect(), b = el.getBoundingClientRect();
  el.style.transition = "none"; el.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(1.6)`;
  void el.offsetWidth;
  el.style.transition = `transform .5s cubic-bezier(.3,.7,.3,1) ${retraso}ms`; el.style.transform = "";
}
const filaHTML = (etiqueta, n, clase = "") => `<div class="ft-fila ${clase}"><i>${etiqueta}</i>${'<span class="frijol-f"></span>'.repeat(n)}</div>`;

$("#ft-jugar").onclick = async () => {
  if (ocupado || !ftSel || !apostar("#ft-msg")) return;
  ocupado = true; $("#ft-jugar").disabled = true; $("#ft-grande").textContent = "";
  const bet = apuesta, cuenco = $("#ft-cuenco"), palo = $("#ft-palo"), filas = $("#ft-filas");
  let quedan = ftSortear(), fila = 0;
  filas.innerHTML = ""; $("#ft-cuenta").textContent = "en filas de 4";
  msg("#ft-msg", "El crupier tapa las fichas con el cuenco…", "neutral");
  cuenco.classList.remove("arriba"); await espera(700);
  ftSembrar(quedan); await espera(800);
  cuenco.classList.add("arriba"); msg("#ft-msg", `Hay ${quedan} fichas. Contando de cuatro en cuatro…`, "neutral");
  await espera(800);
  while (quedan > 4){
    const rapido = fila >= 3;                                  // las primeras filas van lento para que se entienda
    const fr = $$("#ft-monton .frijol").sort((a, b) => parseFloat(b.style.left) - parseFloat(a.style.left)).slice(0, 4);
    const y = fr.reduce((s, f) => s + parseFloat(f.style.top), 0) / 4;
    palo.style.top = (24 + y * 0.52) + "%"; palo.classList.add("activo"); palo.style.transform = "translateX(0)"; sonido.carta();
    await espera(rapido ? 140 : 220);
    // las 4 fichas vuelan desde el montón hasta una fila nueva del panel
    fila++;
    filas.insertAdjacentHTML("beforeend", filaHTML(fila, 4));
    filas.lastElementChild.querySelectorAll(".frijol-f").forEach((d, j) => volarDesde(d, fr[j], j * 45));
    fr.forEach(f => f.remove());
    palo.style.transform = "translateX(60%)";
    quedan -= 4;
    $("#ft-cuenta").textContent = `${fila} ${fila === 1 ? "fila" : "filas"} × 4 = ${fila * 4}`;
    sonido.clavo(fila % 6);
    await espera(rapido ? 230 : 420);
  }
  palo.classList.remove("activo");
  // Las que sobran se ordenan en una fila en el centro de la mesa y se marcan en dorado.
  const resto = $$("#ft-monton .frijol");
  resto.forEach((f, j) => { f.style.left = (50 + (j - (resto.length - 1) / 2) * 13) + "%"; f.style.top = "82%"; f.style.transform = "translate(-50%, -50%)"; f.classList.add("queda"); });
  filas.insertAdjacentHTML("beforeend", filaHTML("Sobran", quedan, "sobra"));
  filas.lastElementChild.querySelectorAll(".frijol-f").forEach((d, j) => volarDesde(d, resto[j], j * 60));
  $("#ft-cuenta").textContent = `${fila} × 4 + ${quedan} = ${fila * 4 + quedan}`;
  await espera(500);
  $("#ft-grande").textContent = quedan;
  liquidar("#ft-msg", ftPremio(ftSel, quedan, bet), bet, `Sobraron ${quedan} (${fila} filas de 4 + ${quedan}). `);
  ocupado = false; $("#ft-jugar").disabled = false;
};
