/* ═════════ TRAGAMONEDAS ═════════
   Cada rodillo elige su símbolo por separado según PESOS (de cada 100 giros de un rodillo,
   30 son 🍒, 25 🍋…). Todos los símbolos que ves, incluso los del giro, siguen esas mismas
   probabilidades: no se muestran premios "casi ganados" que no existen. */
const SIMB = ["🍒","🍋","🍇","🔔","⭐","💎"], PESOS = [30,25,20,12,8,5];
const PAGO_S = { "🍒":5, "🍋":8, "🍇":10, "🔔":20, "⭐":50, "💎":100 };
const simboloAzar = () => SIMB[elegirPonderado(PESOS)];
// Fichas que paga una tirada (incluye la apuesta devuelta).
function slotsPremio(final, bet){
  if (final[0] === final[1] && final[1] === final[2]) return bet * PAGO_S[final[0]];
  if (final.filter(s => s === "🍒").length === 2) return bet * 2;
  return 0;
}
const rodEstado = [0, 1, 2].map(() => [simboloAzar(), simboloAzar(), simboloAzar()]);
const tiraHTML = sims => sims.map(s => `<div class="sim">${s}</div>`).join("");
$$(".gabinete .tira").forEach((t, i) => t.innerHTML = tiraHTML(rodEstado[i]));
function slotsMonedas(n){
  const g = $(".gabinete");
  for (let i = 0; i < n; i++){
    const m = document.createElement("span");
    m.className = "moneda-cae"; m.textContent = "🪙";
    m.style.left = azar() * 92 + "%"; m.style.animationDelay = azar() * 0.7 + "s";
    g.appendChild(m); setTimeout(() => m.remove(), 2300);
  }
}
$("#s-girar").onclick = async () => {
  if (ocupado || !apostar("#s-msg")) return;
  ocupado = true; $("#s-girar").disabled = true; msg("#s-msg", ""); $("#s-ventana").classList.remove("gana");
  const bet = apuesta, final = [simboloAzar(), simboloAzar(), simboloAzar()];
  const tiras = $$(".gabinete .tira"), alto = tiras[0].firstElementChild.offsetHeight;
  const promesas = tiras.map((t, i) => new Promise(res => {
    const relleno = Array.from({ length: 20 + i * 7 }, () => simboloAzar());
    const nuevo = [simboloAzar(), final[i], simboloAzar()];
    const sims = [...rodEstado[i], ...relleno, ...nuevo];
    t.style.transition = "none"; t.style.transform = "translateY(0)"; t.innerHTML = tiraHTML(sims);
    void t.offsetHeight;
    const dur = 1.3 + i * 0.45;
    t.classList.add("gira"); if (i === 0) sonido.rodillo(dur * 1000 + 900);
    t.style.transition = `transform ${dur}s cubic-bezier(.25,.1,.3,1.06)`;
    t.style.transform = `translateY(${-(sims.length - 3) * alto}px)`;
    setTimeout(() => t.classList.remove("gira"), dur * 700);
    setTimeout(() => {
      sonido.tope(); rodEstado[i] = nuevo; t.style.transition = "none"; t.style.transform = "translateY(0)"; t.innerHTML = tiraHTML(nuevo); res();
    }, dur * 1000 + 60);
  }));
  await Promise.all(promesas);
  const premio = slotsPremio(final, bet);
  if (premio){ $("#s-ventana").classList.add("gana"); slotsMonedas(premio >= bet * 20 ? 40 : premio > bet ? 16 : 6); }
  liquidar("#s-msg", premio, bet, premio >= bet * 20 ? "💰 ¡PREMIO MAYOR! " : "");
  ocupado = false; $("#s-girar").disabled = false;
};
