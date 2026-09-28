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
$("#ft-jugar").onclick = async () => {
  if (ocupado || !ftSel || !apostar("#ft-msg")) return;
  ocupado = true; $("#ft-jugar").disabled = true; $("#ft-grande").textContent = "";
  const bet = apuesta, cuenco = $("#ft-cuenco"), palo = $("#ft-palo");
  let quedan = ftSortear();
  msg("#ft-msg", "El crupier tapa las fichas con el cuenco…", "neutral");
  cuenco.classList.remove("arriba"); await espera(700);
  ftSembrar(quedan); await espera(800);
  cuenco.classList.add("arriba"); msg("#ft-msg", `Hay ${quedan} fichas. Contando de cuatro en cuatro…`, "neutral");
  await espera(800);
  while (quedan > 4){
    const fr = $$("#ft-monton .frijol:not(.fuera)").sort((a, b) => parseFloat(b.style.left) - parseFloat(a.style.left)).slice(0, 4);
    const y = fr.reduce((s, f) => s + parseFloat(f.style.top), 0) / 4;
    palo.style.top = (24 + y * 0.52) + "%"; palo.classList.add("activo"); palo.style.transform = "translateX(0)"; sonido.carta();
    await espera(200);
    fr.forEach((f, j) => { f.classList.add("fuera"); f.style.left = (125 + j * 4) + "%"; f.style.opacity = "0"; });
    palo.style.transform = "translateX(60%)";
    await espera(320);
    fr.forEach(f => f.remove());
    quedan -= 4;
  }
  palo.classList.remove("activo");
  $$("#ft-monton .frijol").forEach(f => f.classList.add("queda"));
  $("#ft-grande").textContent = quedan;
  liquidar("#ft-msg", ftPremio(ftSel, quedan, bet), bet, `Quedaron ${quedan}. `);
  ocupado = false; $("#ft-jugar").disabled = false;
};
