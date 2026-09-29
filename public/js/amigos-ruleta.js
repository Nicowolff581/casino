/* ═════════ Casino Nico · ruleta en línea (todos apuestan al mismo giro) ═════════
   Solo muestra lo que manda el servidor (servidor/ruleta.js). Usa la misma rueda, paño y
   animación de la ruleta para jugar solo (juegos/ruleta.js). El resultado se anuncia
   cuando la bola y la rueda se detienen. */
const AMR_COLORES = ["#d8b25a", "#e8385b", "#3f8ef0", "#2fae62", "#a47cff", "#ff9f1c"];   // color de ficha por asiento
const AMR_VALORES = [5, 10, 25, 50, 100, 500];
const amr = { listo: false, casillas: [], valor: 10, animada: 0, mostrada: 0, animando: false };

function amrIniciar(){
  if (amr.listo) return;
  amr.listo = true;
  $("#amr-rueda").innerHTML = ruedaSVG("r2");
  ruPonerBola($("#amr-bola"), 0, 45);
  amr.casillas = construirPano($("#amr-pano"));
  amr.casillas.forEach(b => b.onclick = () => {
    const s = am.estado; if (!s || s.ruleta.fase !== "apuestas") return avisar("No va más: espera la siguiente ronda.");
    sonido.ficha(); amEnviar({ tipo: "apostar", t: b.dataset.t, monto: amr.valor });
  });
  amr.valor = AMR_VALORES.includes(am.datos.valorFicha) ? am.datos.valorFicha : 10;
  $("#amr-valores").innerHTML = AMR_VALORES.map(v => `<button class="amr-valor" data-v="${v}" aria-pressed="${v === amr.valor}"><span>${v}</span></button>`).join("");
  $$("#amr-valores button").forEach(b => b.onclick = () => {
    amr.valor = +b.dataset.v; am.datos.valorFicha = amr.valor; amGuardar(); sonido.clic();
    $$("#amr-valores button").forEach(x => x.setAttribute("aria-pressed", x === b));
  });
  $("#amr-deshacer").onclick = () => { sonido.clic(); amEnviar({ tipo: "deshacer" }); };
  $("#amr-borrar").onclick = () => { sonido.clic(); amEnviar({ tipo: "borrar" }); };
  $("#amr-repetir").onclick = () => { sonido.ficha(); amEnviar({ tipo: "repetir" }); };
  $("#amr-listo").onclick = () => { sonido.clic(); amEnviar({ tipo: "listo" }); };
}
function amrReiniciar(){ amr.animada = 0; amr.mostrada = 0; amr.animando = false; }
const amrNombre = (s, a) => (s.jugadores.find(j => j.asiento === a)?.apodo || "?").replace(/[<>&]/g, "");

function amrPintar(s){
  amrIniciar();
  const r = s.ruleta, yo = s.jugadores.find(j => j.esYo);
  // fichas en el paño: las mías en dorado con el monto; las de los demás en su color
  const mias = {}, otras = {};
  r.apuestas.forEach(f => {
    if (f.asiento === s.tuAsiento) mias[f.t] = (mias[f.t] || 0) + f.monto;
    else { const o = otras[f.t] = otras[f.t] || {}; o[f.asiento] = (o[f.asiento] || 0) + f.monto; }
  });
  amr.casillas.forEach(b => {
    b.querySelectorAll(".ficha-ru, .ficha-otro").forEach(x => x.remove());
    const t = b.dataset.t;
    if (mias[t]){ const c = document.createElement("span"); c.className = "ficha-ru"; c.textContent = fmtCorto(mias[t]); b.appendChild(c); }
    Object.entries(otras[t] || {}).slice(0, 4).forEach(([a, m], i) => {
      const c = document.createElement("span"); c.className = "ficha-otro"; c.style.cssText = `--c:${AMR_COLORES[a]};--i:${i}`; c.title = `${amrNombre(s, +a)}: ${fmt(m)}`;
      b.appendChild(c);
    });
    if (r.fase !== "resultado" || amr.mostrada !== r.ronda) b.classList.remove("gano", "perdio");
  });
  // jugadores
  $("#amr-jugadores").innerHTML = s.jugadores.map(j => {
    const pago = r.resultado && amr.mostrada === r.ronda ? r.resultado.pagos[j.asiento] : null;
    const neto = pago ? pago.pagado - pago.apostado : null;
    return `<div class="amr-jugador${j.esYo ? " yo" : ""}${j.conectado ? "" : " desconectado"}" data-asiento="${j.asiento}" style="--c:${AMR_COLORES[j.asiento]}">
      <span class="amr-av">${avatarHTML(j.avatar)}</span><span class="amr-nom">${j.apodo.replace(/[<>&]/g, "")}${j.anfitrion ? " <small>★</small>" : ""}</span>
      <span class="amr-fi"><span class="moneda"></span>${fmt(j.fichas)}</span>
      <span class="amr-ap">${neto !== null ? `<b class="${neto > 0 ? "si" : neto < 0 ? "no" : ""}">${neto > 0 ? "+" : ""}${fmt(neto)}</b>` : j.apostado ? `apuesta ${fmt(j.apostado)}${j.listo ? " ✓" : ""}` : ""}</span></div>`;
  }).join("");
  $("#amr-hist").innerHTML = r.historial.slice(amr.mostrada === r.ronda || r.fase === "apuestas" ? 0 : 1).map(x => `<span style="background:${colorN(x)}">${x}</span>`).join("");
  // botones
  const apostando = r.fase === "apuestas", tengo = r.apuestas.some(f => f.asiento === s.tuAsiento);
  $("#amr-deshacer").disabled = $("#amr-borrar").disabled = !apostando || !tengo;
  $("#amr-repetir").disabled = !apostando || !r.puedeRepetir;
  $("#amr-listo").disabled = !apostando || !tengo || s.jugadores.find(j => j.esYo)?.listo;
  $("#amr-extra").innerHTML = s.soyAnfitrion && apostando && s.jugadores.some(j => j.fichas === 0) ? `<button class="btn sec btn-chico" id="amr-nueva">Nueva partida: todos vuelven a ${fmt(s.config.fichas)}</button>` : yo && yo.fichas === 0 && !tengo ? `<p class="am-nota">Te quedaste sin fichas de la sala. Quien creó la sala puede empezar una nueva partida.</p>` : "";
  $("#amr-nueva")?.addEventListener("click", () => amEnviar({ tipo: "nuevaPartida" }));
  // juego justo
  $("#amr-huella").textContent = r.huella;
  const rev = r.revelado;
  $("#amr-revelado").innerHTML = rev && amr.mostrada >= rev.ronda ? `<div class="justo-fila"><span>Ronda ${rev.ronda}: salió el ${rev.numero}</span><code>secreto ${rev.secreto}</code></div>
    <div class="justo-acciones"><button class="btn sec btn-chico" id="amr-comprobar">Comprobar</button><span id="amr-comprobado"></span></div>` : "";
  $("#amr-comprobar")?.addEventListener("click", () => {
    const bien = sha256(`${rev.secreto}:${rev.numero}`) === rev.huella;
    $("#amr-comprobado").innerHTML = bien ? `<b class="si">✔ Coincide.</b> La huella de «secreto:${rev.numero}» es la que se mostró antes de apostar.` : `<b class="no">✘ No coincide.</b>`;
  });
  // giro: todos ven la misma animación; el resultado se anuncia al detenerse
  if (r.giro && amr.animada !== r.ronda && !amr.animando){
    amr.animando = true; amr.animada = r.ronda;
    $("#amr-resultado").className = "ru-resultado"; $("#amr-resultado").textContent = "";
    const transcurrido = Math.max(0, Date.now() + am.desfase - r.giro.inicio);
    ruAnimar({ svg: $("#amr-rueda"), bola: $("#amr-bola"), idx: r.giro.idx, rueda0: r.giro.rueda0, vueltas: r.giro.vueltas, bola0: r.giro.bola0, transcurrido })
      .then(() => { amr.animando = false; amrMostrarResultado(); });
  } else if (!r.giro && !amr.animando){
    $("#amr-rueda").style.transform = `rotate(${r.rueda}deg)`;
    if (amr.mostrada && amr.mostrada < r.ronda){ $("#amr-resultado").className = "ru-resultado"; }
  }
  if (r.resultado && !amr.animando && amr.mostrada !== r.ronda && amr.animada === r.ronda) amrMostrarResultado();
  amrEstado();
}
// Muestra el número y cuánto ganó o perdió cada uno (solo cuando la bola ya se detuvo).
function amrMostrarResultado(){
  const s = am.estado, r = s?.ruleta;
  if (!r?.resultado || amr.mostrada === r.ronda) return;
  amr.mostrada = r.ronda;
  const n = r.resultado.numero, disco = $("#amr-resultado");
  disco.textContent = n; disco.className = "ru-resultado ver " + (n === 0 ? "v" : ROJOS.has(n) ? "r" : "n");
  amr.casillas.forEach(b => { if (b.querySelector(".ficha-ru")) b.classList.add(ruPremio(b.dataset.t, n, 1) ? "gano" : "perdio"); });
  const mio = r.resultado.pagos[s.tuAsiento];
  if (mio){ if (mio.pagado > mio.apostado) celebrar(mio.pagado, mio.apostado); else if (!mio.pagado) sonido.pierde(); }
  amrPintar(s);
}
function amrEstado(){
  const s = am.estado; if (!s || s.juego !== "ruleta") return;
  const r = s.ruleta, e = $("#amr-estado"), yo = s.jugadores.find(j => j.esYo);
  if (r.fase === "apuestas"){
    const resta = r.fin ? Math.max(0, Math.ceil((r.fin - Date.now() - am.desfase) / 1000)) : null;
    e.innerHTML = resta === null ? `<b>Hagan sus apuestas</b><small>Elige el valor de la ficha y toca el paño. La cuenta empieza con la primera ficha.</small>`
      : `<b>Apuestas cierran en ${resta} s</b><small>Si todos los que apostaron tocan «¡Listo!», se gira antes.</small>`;
    e.className = "amr-estado" + (resta !== null && resta <= 5 ? " urgente" : "");
  } else if (amr.animando || amr.mostrada !== r.ronda){ e.innerHTML = `<b>No va más…</b><small>La bola está girando.</small>`; e.className = "amr-estado"; }
  else {
    const res = r.resultado, mio = res?.pagos[s.tuAsiento];
    const txt = !mio ? "No apostaste en esta ronda." : mio.pagado > mio.apostado ? `¡Ganaste ${fmt(mio.pagado - mio.apostado)} fichas!` : mio.pagado === mio.apostado ? "Recuperas tu apuesta." : mio.pagado ? `Recuperas ${fmt(mio.pagado)} de ${fmt(mio.apostado)}.` : `Perdiste ${fmt(mio.apostado)} fichas.`;
    e.innerHTML = `<b>Salió el ${res.numero} ${res.color}</b><small class="${mio ? (mio.pagado > mio.apostado ? "si" : mio.pagado < mio.apostado ? "no" : "") : ""}">${txt}</small>`;
    e.className = "amr-estado";
  }
}
setInterval(amrEstado, 250);
