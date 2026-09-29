/* ═════════ Casino Nico · blackjack en línea (todos contra el mismo crupier) ═════════
   Solo muestra lo que manda el servidor (servidor/blackjack.js). Los pagos son los de
   blackjack-comun.js. Al final, el crupier destapa su carta y roba de a una; el resultado
   de cada uno se anuncia cuando el crupier termina. */
const AMB_VALORES = [5, 10, 25, 50, 100, 500];
const AMB_POR_CARTA = 900;
const amb = { listo: false, ronda: 0, vistas: {}, animando: false, mostrada: 0, visibles: 2, cartasRonda: [] };

function ambIniciar(){
  if (amb.listo) return;
  amb.listo = true;
  $("#amb-valores").innerHTML = AMB_VALORES.map(v => `<button class="amr-valor" data-v="${v}" aria-label="Agregar ${v} fichas"><span>${v}</span></button>`).join("");
  $$("#amb-valores button").forEach(b => b.onclick = () => {
    const s = am.estado; if (!s || s.bj.fase !== "apuestas") return avisar("Ya se repartió: espera la siguiente ronda.");
    sonido.ficha(); amEnviar({ tipo: "apostar", monto: +b.dataset.v });
  });
  $("#amb-borrar").onclick = () => { sonido.clic(); amEnviar({ tipo: "borrar" }); };
  $("#amb-repetir").onclick = () => { sonido.ficha(); amEnviar({ tipo: "repetir" }); };
  $("#amb-listo").onclick = () => { sonido.clic(); amEnviar({ tipo: "listo" }); };
  $$("#amb-jugar button").forEach(b => b.onclick = () => {
    $$("#amb-jugar button").forEach(x => x.disabled = true);
    sonido[b.dataset.a === "doblar" ? "ficha" : "clic"]();
    amEnviar({ tipo: "accion", accion: b.dataset.a });
  });
}
function ambReiniciar(){ Object.assign(amb, { ronda: 0, vistas: {}, animando: false, mostrada: 0, visibles: 2 }); }
const ambNombre = (s, a) => (s.jugadores.find(j => j.asiento === a)?.apodo || "?").replace(/[<>&]/g, "");

// Dibuja una fila de cartas; las que no se habían mostrado entran con animación y sonido.
function ambCartas(caja, cartas, clave){
  const vistas = amb.vistas[clave] || 0;
  caja.innerHTML = "";
  cartas.forEach((c, i) => {
    const nueva = i >= vistas, el = c ? cartaEl(c, false, nueva) : cartaEl({ v: "A", p: "♠" }, true, nueva);
    if (nueva && vistas === 0) el.style.animationDelay = i * 0.15 + "s";
    caja.appendChild(el);
  });
  const nuevas = Math.max(0, cartas.length - vistas);
  for (let i = 0; i < nuevas; i++) sonido.carta(i * 0.12);
  amb.vistas[clave] = cartas.length;
}

function ambPintar(s){
  ambIniciar();
  const r = s.bj, yo = s.jugadores.find(j => j.esYo);
  if (r.ronda !== amb.ronda){ amb.ronda = r.ronda; amb.vistas = {}; amb.visibles = 2; }
  // al terminar la ronda: el crupier destapa y roba de a una carta; después se anuncian los resultados
  if (r.resultado && amb.mostrada !== r.ronda && !amb.animando){
    amb.animando = true; amb.visibles = 2;
    amb.cartasRonda = [...r.manos.flatMap(m => m.cartas), ...r.crupier].map(textoCarta);
    (async () => {
      await espera(500);
      while (amb.visibles < r.crupier.length && am.estado?.bj.ronda === r.ronda){ await espera(AMB_POR_CARTA); amb.visibles++; if (am.estado) ambPintar(am.estado); }
      await espera(400);
      amb.animando = false;
      if (am.estado?.bj.ronda === r.ronda) ambMostrarResultado();
    })();
  }
  const mostrado = amb.mostrada === r.ronda;
  // crupier
  const crupier = r.fase === "resultado" && !mostrado ? r.crupier.slice(0, amb.visibles) : r.crupier;
  ambCartas($("#amb-d"), crupier, "crupier");
  $("#amb-dv").textContent = crupier.length && crupier.every(Boolean) ? valorBJ(crupier) : crupier[0] ? valorBJ([crupier[0]]) + (r.fase === "juego" ? " + ?" : "") : "";
  // asientos: todos ven las cartas de todos
  const manos = Object.fromEntries(r.manos.map(m => [m.asiento, m]));
  $("#amb-asientos").innerHTML = "";
  s.jugadores.forEach(j => {
    const m = manos[j.asiento], pago = r.resultado?.pagos[j.asiento], ver = pago && mostrado;
    const fichas = pago && !mostrado ? j.fichas - pago.pagado : j.fichas;       // no adelantar el resultado en el saldo
    const el = document.createElement("div");
    el.className = "amb-asiento" + (j.esYo ? " yo" : "") + (r.turno === j.asiento ? " turno" : "") + (j.conectado ? "" : " desconectado");
    el.dataset.asiento = j.asiento;
    const valor = m ? m.valor : 0, bj = m && m.cartas.length === 2 && valor === 21;
    const tag = ver ? `<span class="amb-tag ${pago.pagado > pago.apostado ? "si" : pago.pagado === pago.apostado ? "igual" : "no"}">${pago.texto}${pago.pagado > pago.apostado ? " +" + fmt(pago.pagado - pago.apostado) : ""}</span>`
      : r.fase === "apuestas" && j.listo ? `<span class="amb-tag listo">✓ Listo</span>` : "";
    el.innerHTML = `<span class="amb-av">${avatarHTML(j.avatar)}</span>
      <span class="amb-nom">${j.apodo.replace(/[<>&]/g, "")}${j.anfitrion ? ' <small title="Creó la sala">★</small>' : ""}</span>
      <span class="amb-fi"><span class="moneda"></span>${fmt(fichas)}</span>
      <div class="amb-cartas"></div>
      ${m ? `<span class="amb-val${valor > 21 ? " pasado" : bj ? " bj" : ""}">${bj ? "Blackjack" : valor > 21 ? valor + " · se pasó" : valor}</span>` : ""}
      ${j.apuesta ? `<span class="amb-ficha${m?.doblo ? " doble" : ""}" title="Apuesta">${fmtCorto(j.apuesta)}</span>` : ""}
      ${tag}
      ${r.turno === j.asiento ? `<span class="amb-reloj"><i></i></span>` : ""}`;
    if (m) ambCartas(el.querySelector(".amb-cartas"), m.cartas, j.asiento);
    $("#amb-asientos").appendChild(el);
  });
  // botones
  const apostando = r.fase === "apuestas", mia = manos[s.tuAsiento], miTurno = r.fase === "juego" && r.turno === s.tuAsiento && mia;
  $("#amb-apostar").hidden = !apostando;
  $("#amb-jugar").hidden = !miTurno;
  if (miTurno){
    $$("#amb-jugar button").forEach(b => b.disabled = false);
    $('#amb-jugar [data-a="doblar"]').disabled = !(mia.cartas.length === 2 && yo.fichas >= mia.apuesta);
    if (!ambPintar.avisado || ambPintar.avisado !== `${r.ronda}`){ ambPintar.avisado = `${r.ronda}`; sonido.clavo(8); }
  }
  const tengo = !!yo?.apuesta && apostando;
  $("#amb-borrar").disabled = !tengo;
  $("#amb-repetir").disabled = !apostando || !r.puedeRepetir;
  $("#amb-listo").disabled = !tengo || yo.listo;
  $("#amb-extra").innerHTML = s.soyAnfitrion && apostando && s.jugadores.some(j => j.fichas === 0 && !j.apuesta) ? `<button class="btn sec btn-chico" id="amb-nueva">Nueva partida: todos vuelven a ${fmt(s.config.fichas)}</button>`
    : yo && yo.fichas === 0 && !yo.apuesta && apostando ? `<p class="am-nota">Te quedaste sin fichas de la sala. Quien creó la sala puede empezar una nueva partida.</p>` : "";
  $("#amb-nueva")?.addEventListener("click", () => amEnviar({ tipo: "nuevaPartida" }));
  // juego justo
  $("#amb-huella").textContent = r.huella;
  const rev = r.revelado;
  $("#amb-revelado").innerHTML = rev && amb.mostrada >= rev.ronda ? `<div class="justo-fila"><span>Ronda ${rev.ronda}: se usaron ${rev.usadas} cartas</span><code>secreto ${rev.secreto}</code></div>
    <div class="justo-acciones"><button class="btn sec btn-chico" id="amb-comprobar">Comprobar</button><span id="amb-comprobado"></span></div>` : "";
  $("#amb-comprobar")?.addEventListener("click", () => {
    const bien = sha256(`${rev.secreto}:${rev.zapato}`) === rev.huella;
    const primeras = rev.zapato.split(",").slice(0, rev.usadas).sort().join(), salieron = [...amb.cartasRonda].sort().join();
    $("#amb-comprobado").innerHTML = !bien ? `<b class="no">✘ La huella no coincide.</b>`
      : rev.ronda === amb.mostrada && primeras !== salieron ? `<b class="no">✘ Las cartas repartidas no son las primeras del zapato.</b>`
      : `<b class="si">✔ Coincide.</b> El zapato revelado tiene la huella que se mostró antes de apostar, y las ${rev.usadas} cartas de la ronda son las primeras de ese zapato.`;
  });
  ambEstado();
}
// Muestra cuánto ganó o perdió cada uno (solo cuando el crupier terminó de jugar).
function ambMostrarResultado(){
  const s = am.estado, r = s?.bj;
  if (!r?.resultado || amb.mostrada === r.ronda) return;
  amb.mostrada = r.ronda;
  const mio = r.resultado.pagos[s.tuAsiento];
  if (mio){ if (mio.pagado > mio.apostado) celebrar(mio.pagado, mio.apostado); else if (!mio.pagado) sonido.pierde(); }
  ambPintar(s);
}
function ambEstado(){
  const s = am.estado; if (!s || s.juego !== "blackjack") return;
  const r = s.bj, e = $("#amb-estado"), resta = r.fin ? Math.max(0, (r.fin - Date.now() - am.desfase) / 1000) : null;
  let cls = "amr-estado amb-estado";
  if (r.fase === "apuestas"){
    e.innerHTML = resta === null ? `<b>Hagan sus apuestas</b><small>Toca las fichas para armar tu apuesta. La cuenta empieza con la primera ficha.</small>`
      : `<b>Se reparte en ${Math.ceil(resta)} s</b><small>Si todos los que apostaron tocan «¡Listo!», se reparte antes.</small>`;
    if (resta !== null && resta <= 5) cls += " urgente";
  } else if (r.fase === "juego"){
    const mio = r.turno === s.tuAsiento;
    e.innerHTML = mio ? `<b>¡Tu turno! · ${Math.ceil(resta)} s</b><small>Pide carta, plántate o dobla. Si se acaba el tiempo, te plantas.</small>`
      : `<b>Turno de ${ambNombre(s, r.turno)} · ${Math.ceil(resta)} s</b><small>${r.manos.some(m => m.asiento === s.tuAsiento) ? "Espera tu turno." : "No apostaste en esta ronda: mira cómo juegan."}</small>`;
    if (mio && resta <= 5) cls += " urgente";
    const barra = $("#amb-asientos .amb-asiento.turno .amb-reloj i");
    if (barra) barra.style.setProperty("--resta", Math.min(1, resta / s.config.tiempo));
  } else if (amb.mostrada !== r.ronda){
    e.innerHTML = `<b>Juega el crupier…</b><small>Destapa su carta y pide hasta llegar a 17.</small>`;
  } else {
    const res = r.resultado, mio = res.pagos[s.tuAsiento];
    const txt = !mio ? "No apostaste en esta ronda." : mio.pagado > mio.apostado ? `¡Ganaste ${fmt(mio.pagado - mio.apostado)} fichas!` : mio.pagado === mio.apostado ? "Empate: recuperas tu apuesta." : `Perdiste ${fmt(mio.apostado)} fichas.`;
    e.innerHTML = `<b>${res.blackjack ? "El crupier tiene blackjack" : res.crupier > 21 ? `El crupier se pasó (${res.crupier})` : `El crupier tiene ${res.crupier}`}</b><small class="${mio ? (mio.pagado > mio.apostado ? "si" : mio.pagado < mio.apostado ? "no" : "") : ""}">${txt}</small>`;
  }
  e.className = cls;
}
setInterval(ambEstado, 250);
