/* ═════════ BLACKJACK ═════════
   Una baraja nueva en cada mano. El crupier se planta en 17 (también en 17 "blando").
   Si el crupier tiene blackjack se revela enseguida y la mano termina (como en los casinos de EE. UU.).
   Blackjack natural paga 3 a 2; ganar normal paga 1 a 1; empate devuelve la apuesta. */
const bj = { mazo: [], p: [], d: [], bet: 0, primera: true, vistasD: 0, vistasP: 0, ocultaba: false };

function valorBJ(mano){
  let t = 0, ases = 0;
  for (const c of mano){ if (c.v === "A"){ t += 11; ases++; } else if (c.v === "J" || c.v === "Q" || c.v === "K") t += 10; else t += +c.v; }
  while (t > 21 && ases){ t -= 10; ases--; }
  return t;
}
const esBlackjack = mano => mano.length === 2 && valorBJ(mano) === 21;

// Fichas que recibe el jugador al terminar (incluye su apuesta si la recupera).
function bjPago(p, d, bet){
  const pbj = esBlackjack(p), dbj = esBlackjack(d);
  if (pbj || dbj) return pbj && dbj ? bet : pbj ? bet + Math.floor(bet * 1.5) : 0;
  const tu = valorBJ(p), cr = valorBJ(d);
  if (tu > 21) return 0;
  if (cr > 21 || tu > cr) return bet * 2;
  return tu === cr ? bet : 0;
}

function pintarBJ(ocultar){
  const d = $("#bj-d"), p = $("#bj-p"), vd = bj.vistasD, vp = bj.vistasP, revela = !ocultar && bj.ocultaba;
  d.innerHTML = ""; p.innerHTML = "";
  bj.d.forEach((c, i) => { const el = cartaEl(c, ocultar && i === 1, i >= vd || (i === 1 && revela)); if (i >= vd && vd === 0) el.style.animationDelay = (i * 2 + 1) * 0.15 + "s"; d.appendChild(el); });
  bj.p.forEach((c, i) => { const el = cartaEl(c, false, i >= vp); if (i >= vp && vp === 0) el.style.animationDelay = i * 0.3 + "s"; p.appendChild(el); });
  bj.vistasD = bj.d.length; bj.vistasP = bj.p.length; bj.ocultaba = ocultar;
  $("#bj-dv").textContent = bj.d.length ? (ocultar ? "" : valorBJ(bj.d)) : "";
  $("#bj-pv").textContent = bj.p.length ? valorBJ(bj.p) : "";
  $("#bj-fichas").innerHTML = bj.bet && bj.p.length ? `<span class="ficha-mesa">${fmt(bj.bet)}</span>` : "";
}
function botonesBJ(jugando){
  $("#bj-repartir").disabled = jugando;
  $("#bj-pedir").disabled = !jugando; $("#bj-plantarse").disabled = !jugando;
  $("#bj-doblar").disabled = !(jugando && bj.primera && saldo >= bj.bet);
  ocupado = jugando;
}
function bjTerminar(extra){
  pintarBJ(false);
  liquidar("#bj-msg", bjPago(bj.p, bj.d, bj.bet), bj.bet, extra);
  botonesBJ(false);
}

$("#bj-repartir").onclick = () => {
  if (ocupado || !apostar("#bj-msg")) return;
  bj.bet = apuesta; bj.mazo = baraja(); bj.primera = true;
  bj.vistasD = bj.vistasP = 0; bj.p = [bj.mazo.pop(), bj.mazo.pop()]; bj.d = [bj.mazo.pop(), bj.mazo.pop()];
  msg("#bj-msg", "");
  const pbj = esBlackjack(bj.p), dbj = esBlackjack(bj.d);
  if (pbj || dbj){
    bjTerminar(pbj && dbj ? "Los dos tienen blackjack. " : pbj ? "¡Blackjack! " : "El crupier tiene blackjack. ");
    return;
  }
  pintarBJ(true); botonesBJ(true);
};
$("#bj-pedir").onclick = () => {
  bj.p.push(bj.mazo.pop()); bj.primera = false; pintarBJ(true); botonesBJ(true);
  if (valorBJ(bj.p) > 21) bjTerminar("Te pasaste de 21. ");
  else if (valorBJ(bj.p) === 21) turnoCrupier();
};
$("#bj-doblar").onclick = () => {
  if (!apostar("#bj-msg", bj.bet)) return;
  bj.bet *= 2; bj.p.push(bj.mazo.pop()); pintarBJ(true);
  if (valorBJ(bj.p) > 21) bjTerminar("Te pasaste de 21. ");
  else turnoCrupier();
};
$("#bj-plantarse").onclick = () => turnoCrupier();
async function turnoCrupier(){
  $("#bj-pedir").disabled = $("#bj-plantarse").disabled = $("#bj-doblar").disabled = true;
  pintarBJ(false);
  while (valorBJ(bj.d) < 17){ await espera(700); bj.d.push(bj.mazo.pop()); pintarBJ(false); }
  const tu = valorBJ(bj.p), cr = valorBJ(bj.d);
  bjTerminar(cr > 21 ? "El crupier se pasó. " : `${tu} contra ${cr}. `);
}
