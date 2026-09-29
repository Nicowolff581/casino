/* ═════════ Casino Nico · jugar con amigos (Texas Hold'em, Ruleta y Blackjack en línea) ═════════
   La página solo muestra lo que manda el servidor (servidor/worker.js + servidor/poker.js).
   El servidor reparte y guarda las cartas; a cada jugador le llegan solo las suyas.
   Se guarda en este navegador: apodo, avatar y el «pase» de cada sala para volver al mismo asiento. */
const AM_AVATARES = AVATARES_ID;
const AM_REACCIONES = ["👍", "😂", "😮", "😢", "🔥", "👏", "🍀", "😎"];
const am = { ws: null, codigo: null, estado: null, desfase: 0, intentos: 0, cerrando: false, reintento: 0, anterior: null, datos: {} };
try { am.datos = JSON.parse(localStorage.getItem("casino-nico-amigos")) || {}; } catch (e) {}
am.datos.pases = am.datos.pases || {};
const amGuardar = () => { try { localStorage.setItem("casino-nico-amigos", JSON.stringify(am.datos)); } catch (e) {} };
const enLinea = location.protocol === "http:" || location.protocol === "https:";

/* ── entrada: apodo, avatar, crear o entrar ── */
$("#am-apodo").value = am.datos.apodo || "";
am.datos.avatar = AM_AVATARES.includes(am.datos.avatar) ? am.datos.avatar : AM_AVATARES[azarEntero(AM_AVATARES.length)];
$("#am-avatares").innerHTML = AM_AVATARES.map(a => `<button role="radio" aria-checked="${a === am.datos.avatar}" data-a="${a}">${avatarHTML(a)}</button>`).join("");
$$("#am-avatares button").forEach(b => b.onclick = () => {
  am.datos.avatar = b.dataset.a; amGuardar(); sonido.clic();
  $$("#am-avatares button").forEach(x => x.setAttribute("aria-checked", x === b));
});
["fichas", "ciega", "tiempo"].forEach(k => { if (am.datos[k]) $("#am-" + k).value = am.datos[k]; });
// juego de la sala nueva: póker, ruleta o blackjack
am.datos.juego = ["ruleta", "blackjack"].includes(am.datos.juego) ? am.datos.juego : "poker";
function amElegirJuego(j){
  am.datos.juego = j; amGuardar();
  $$(".am-juego button").forEach(b => b.setAttribute("aria-pressed", b.dataset.juego === j));
  $("#am-campo-ciega").hidden = j !== "poker";
  $("#am-tiempo-txt").textContent = j === "ruleta" ? "Tiempo para apostar" : j === "blackjack" ? "Tiempo para apostar y por turno" : "Tiempo por turno";
}
$$(".am-juego button").forEach(b => b.onclick = () => { sonido.clic(); amElegirJuego(b.dataset.juego); });
amElegirJuego(am.datos.juego);
if (!enLinea){ $("#am-sin-servidor").hidden = false; }
function amApodo(){
  const a = $("#am-apodo").value.trim();
  if (!a){ msg("#am-msg", "Escribe tu apodo para entrar.", "lose"); $("#am-apodo").focus(); return null; }
  am.datos.apodo = a; amGuardar(); return a;
}
$("#am-crear").onclick = async () => {
  if (!enLinea) return msg("#am-msg", "El modo en línea funciona en tu enlace publicado, no abriendo el archivo.", "lose");
  if (!amApodo()) return;
  const cfg = { juego: am.datos.juego, fichas: +$("#am-fichas").value, ciega: +$("#am-ciega").value, tiempo: +$("#am-tiempo").value };
  Object.assign(am.datos, cfg); amGuardar();
  msg("#am-msg", "Creando la sala…");
  try {
    const r = await fetch("/api/salas", { method: "POST", body: JSON.stringify(cfg) }).then(x => x.json());
    if (!r.codigo) throw new Error(r.error);
    amConectar(r.codigo);
  } catch (e){ msg("#am-msg", "No se pudo crear la sala. Revisa tu conexión e intenta de nuevo.", "lose"); }
};
$("#am-entrar").onclick = () => {
  if (!enLinea) return msg("#am-msg", "El modo en línea funciona en tu enlace publicado, no abriendo el archivo.", "lose");
  const c = $("#am-codigo").value.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(c)) return msg("#am-msg", "El código tiene 6 letras y números (sin O, I, 0 ni 1).", "lose");
  if (amApodo()) amConectar(c);
};
$("#am-codigo").addEventListener("keydown", e => { if (e.key === "Enter") $("#am-entrar").click(); });

/* ── conexión en vivo (con reconexión automática) ── */
function amConectar(codigo){
  am.codigo = codigo; am.cerrando = false; clearTimeout(am.reintento);
  try { history.replaceState(null, "", "#sala=" + codigo); } catch (e) {}
  $("#am-lobby").hidden = true; $("#am-sala").hidden = false; $("#am-cod").textContent = codigo;
  $("#am-compartir").hidden = !navigator.share;
  const ws = am.ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/salas/" + codigo + "/ws");
  amConexion("Conectando…", "espera");
  ws.onopen = () => {
    am.intentos = 0; amConexion("Conectado", "ok");
    ws.send(JSON.stringify({ tipo: "unirse", token: am.datos.pases[codigo], apodo: am.datos.apodo, avatar: am.datos.avatar }));
  };
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (x) { return; }
    if (m.tipo === "bienvenida"){ am.datos.pases[codigo] = m.token; amGuardar(); }
    else if (m.tipo === "estado"){ if (m.ahora) am.desfase = m.ahora - Date.now(); amPintar(m.sala); }
    else if (m.tipo === "reaccion") amBurbuja(m.asiento, m.emoji);
    else if (m.tipo === "error"){
      avisar(m.texto);
      if (!am.estado || am.estado.tuAsiento === null){ amVolverAlLobby(); msg("#am-msg", m.texto, "lose"); }
    }
  };
  ws.onclose = () => {
    if (am.cerrando || am.ws !== ws) return;
    if (!am.estado){ amVolverAlLobby(); msg("#am-msg", "No se pudo entrar a esa sala. Revisa el código.", "lose"); return; }
    // se cortó: reintenta cada vez con un poco más de espera (máximo 8 s)
    const espera = Math.min(8000, 800 * 2 ** am.intentos++);
    amConexion(`Sin conexión · reintentando en ${Math.round(espera / 1000)} s`, "mal");
    am.reintento = setTimeout(() => amConectar(codigo), espera);
  };
}
setInterval(() => { if (am.ws?.readyState === 1) am.ws.send(JSON.stringify({ tipo: "hola" })); }, 25000);
addEventListener("online", () => { if (am.codigo && am.ws?.readyState !== 1){ clearTimeout(am.reintento); amConectar(am.codigo); } });
const amEnviar = m => { if (am.ws?.readyState === 1) am.ws.send(JSON.stringify(m)); else avisar("Sin conexión: espera un momento."); };
function amConexion(texto, clase){ const c = $("#am-conexion"); c.textContent = texto; c.className = "am-conexion " + clase; }
function amVolverAlLobby(){
  am.cerrando = true; clearTimeout(am.reintento); try { am.ws?.close(); } catch (e) {}
  am.ws = null; am.codigo = null; am.estado = null; am.anterior = null; amrReiniciar(); ambReiniciar();
  $("#am-lobby").hidden = false; $("#am-sala").hidden = true;
  try { history.replaceState(null, "", "#amigos"); } catch (e) {}
}
$("#am-salir").onclick = () => {
  if (!confirm("¿Salir de la sala? Si hay una mano en juego, te retiras de ella.")) return;
  amEnviar({ tipo: "salir" }); delete am.datos.pases[am.codigo]; amGuardar(); amVolverAlLobby(); msg("#am-msg", "");
};
const amEnlace = () => location.origin + location.pathname + "#sala=" + am.codigo;
$("#am-copiar").onclick = async () => {
  try { await navigator.clipboard.writeText(amEnlace()); avisar("Enlace copiado. ¡Mándaselo a tus amigos!"); }
  catch (e){ prompt("Copia este enlace:", amEnlace()); }
};
$("#am-compartir").onclick = () => navigator.share?.({ title: "Casino Nico", text: `Juguemos ${{ ruleta: "ruleta", blackjack: "blackjack" }[am.estado?.juego] || "póker"} en Casino Nico. Sala ${am.codigo}`, url: amEnlace() }).catch(() => {});

/* ── la mesa ── */
// Posiciones de los 6 asientos alrededor de la mesa; tu asiento siempre abajo al centro.
const AM_POS = [[50, 92], [9, 70], [9, 24], [50, 6], [91, 24], [91, 70]];
$("#am-reacciones").innerHTML = AM_REACCIONES.map(e => `<button data-e="${e}" aria-label="Reacción ${e}">${e}</button>`).join("");
$$("#am-reacciones button").forEach(b => b.onclick = () => amEnviar({ tipo: "reaccion", emoji: b.dataset.e }));

function amPintar(s){
  const ruleta = s.juego === "ruleta", bj = s.juego === "blackjack", poker = !ruleta && !bj;
  $("#amr").hidden = !ruleta; $("#amb").hidden = !bj; $("#am-mesa").hidden = !poker; $(".am-panel").hidden = !poker; $(".am-registro").hidden = !poker;
  if (ruleta){ am.estado = s; am.anterior = s; return amrPintar(s); }
  if (bj){ am.estado = s; am.anterior = s; return ambPintar(s); }
  const antes = am.anterior; am.estado = s; am.anterior = s;
  const yo = s.jugadores.find(j => j.esYo), m = s.mano, giro = s.tuAsiento ?? 0, mesa = $("#am-mesa");
  // asientos
  mesa.querySelectorAll(".am-asiento").forEach(el => el.remove());
  s.jugadores.forEach(j => {
    const [x, y] = AM_POS[(j.asiento - giro + 6) % 6], el = document.createElement("div"), p = j.mano;
    const gana = m?.resultado?.cobros?.[j.asiento];
    el.className = "am-asiento" + (j.esYo ? " yo" : "") + (m && m.turno === j.asiento ? " turno" : "") + (p?.retirado ? " fuera" : "") + (gana ? " gana" : "") + (!j.conectado ? " desconectado" : "");
    el.style.cssText = `left:${x}%;top:${y}%`; el.dataset.asiento = j.asiento;
    const marcas = m ? [m.boton === j.asiento ? '<i class="am-d" title="Repartidor">D</i>' : "", m.sb === j.asiento ? '<i class="am-c">CP</i>' : "", m.bb === j.asiento ? '<i class="am-c">CG</i>' : ""].join("") : "";
    const estado = !j.conectado ? "Sin conexión" : j.ausente ? "Ausente" : p?.retirado ? "Se retiró" : p?.allin ? "Con todo" : j.fichas === 0 && !p ? "Sin fichas" : "";
    el.innerHTML = `<div class="am-avatar"><span>${avatarHTML(j.avatar)}</span>${marcas}</div>
      <div class="am-nombre">${j.apodo.replace(/[<>&]/g, "")}${j.anfitrion ? ' <small title="Creó la sala">★</small>' : ""}</div>
      <div class="am-fichas"><span class="moneda"></span>${fmt(j.fichas)}</div>
      ${estado ? `<div class="am-estado">${estado}</div>` : ""}
      ${m?.resultado?.manos?.[j.asiento] ? `<div class="am-jugada">${m.resultado.manos[j.asiento]}</div>` : ""}
      ${gana ? `<div class="am-cobra">+${fmt(gana)}</div>` : ""}
      <div class="am-cartas"></div>
      ${p && p.apuesta ? `<div class="am-apuesta"><span class="moneda"></span>${fmt(p.apuesta)}</div>` : ""}`;
    const cs = el.querySelector(".am-cartas");
    if (p) (Array.isArray(p.cartas) ? p.cartas : Array.from({ length: p.cartas }, () => null)).forEach((c, i) => {
      const nueva = !antes?.mano || antes.mano.num !== m.num || (Array.isArray(p.cartas) && !Array.isArray(antes.jugadores.find(x => x.asiento === j.asiento)?.mano?.cartas));
      const carta = c ? cartaEl(c, false, nueva) : cartaEl({ v: "A", p: "♠" }, true, nueva);
      if (nueva) carta.style.animationDelay = i * 0.12 + "s";
      cs.appendChild(carta);
    });
    mesa.appendChild(el);
  });
  // mesa central
  const board = $("#am-board"); board.innerHTML = "";
  for (let i = 0; i < 5; i++){
    const c = m?.board[i];
    if (c) board.appendChild(cartaEl(c, false, !antes?.mano || antes.mano.num !== m.num || !antes.mano.board[i]));
    else { const h = document.createElement("div"); h.className = "hueco"; board.appendChild(h); }
  }
  $("#am-bote").innerHTML = m ? `Bote <b>${fmt(m.bote)}</b> · Mano ${m.num}` : "";
  const aviso = $("#am-aviso-mesa");
  if (s.ganadorPartida) aviso.innerHTML = `🏆 <b>${s.ganadorPartida}</b> ganó la partida`;
  else if (!m) aviso.textContent = `Esperando jugadores (${s.jugadores.length}/6)` + (s.jugadores.length >= 2 ? (s.soyAnfitrion ? " · toca «Empezar partida»" : " · la persona que creó la sala empieza la partida") : " · comparte el enlace");
  else if (m.resultado) aviso.innerHTML = m.resultado.botes.map(b => `<span><b>${b.ganadores.map(a => s.jugadores.find(j => j.asiento === a)?.apodo).join(" y ")}</b> ${b.ganadores.length > 1 ? "reparten" : "gana"} ${fmt(b.monto)}${b.mano ? " con " + b.mano.toLowerCase() : ""}</span>`).join("");
  else aviso.textContent = "";
  $("#am-registro").innerHTML = (m?.registro || []).map(t => `<li>${t.replace(/[<>&]/g, "")}</li>`).join("");
  amPintarAcciones(s, yo);
  amSonidos(antes, s);
}
function amPintarAcciones(s, yo){
  const caja = $("#am-acciones"), control = $("#am-control"), op = s.opciones, m = s.mano;
  caja.innerHTML = ""; control.innerHTML = "";
  if (yo?.ausente) control.innerHTML = `<p>Estás ausente porque se te acabó el tiempo dos veces.</p><button class="btn" id="am-volver">Volver a jugar</button>`;
  else if (s.soyAnfitrion && s.estado === "espera"){
    const listos = s.jugadores.filter(j => j.fichas > 0 && !j.ausente).length;
    control.innerHTML = s.ganadorPartida || s.jugadores.some(j => j.fichas === 0)
      ? `<button class="btn" id="am-nueva">Nueva partida (todos con ${fmt(s.config.fichas)})</button>`
      : `<button class="btn" id="am-empezar" ${listos < 2 ? "disabled" : ""}>Empezar partida</button><span class="am-cfg">Fichas ${fmt(s.config.fichas)} · Ciega ${s.config.ciega} · ${s.config.tiempo} s por turno</span>`;
  }
  $("#am-volver")?.addEventListener("click", () => amEnviar({ tipo: "volver" }));
  $("#am-empezar")?.addEventListener("click", () => amEnviar({ tipo: "empezar" }));
  $("#am-nueva")?.addEventListener("click", () => amEnviar({ tipo: "nuevaPartida" }));
  if (!op){ if (m && m.fase !== "fin" && m.turno !== null && yo){ const t = s.jugadores.find(j => j.asiento === m.turno); caja.innerHTML = `<p class="am-espera">Turno de <b>${t?.apodo.replace(/[<>&]/g, "") || "…"}</b></p>`; } return; }
  const subir = op.puedeSubir ? Math.min(op.maxSubir, Math.max(op.minSubir, am.ultimaSubida || 0)) : 0;
  caja.innerHTML = `<p class="am-tu-turno">¡Tu turno!</p>
    <div class="am-botones">
      <button class="btn sec" data-a="retirarse">Retirarse</button>
      ${op.puedePasar ? `<button class="btn" data-a="pasar">Pasar</button>` : `<button class="btn" data-a="igualar">${op.aIgualar >= (yo.fichas) ? "Igualar con todo " : "Igualar "}${fmt(op.aIgualar)}</button>`}
    </div>
    ${op.puedeSubir ? `<div class="am-subir">
      <div class="am-rapidos"><button data-m="${op.minSubir}">Mín</button><button data-m="${Math.floor(m.apuestaActual + (m.bote + op.aIgualar) / 2)}">½ bote</button><button data-m="${m.apuestaActual + m.bote + op.aIgualar}">Bote</button><button data-m="${op.maxSubir}">Todo</button></div>
      <input type="range" id="am-rango" min="${op.minSubir}" max="${op.maxSubir}" step="1" value="${subir}">
      <button class="btn" data-a="subir" id="am-btn-subir"></button>
    </div>` : ""}`;
  const rango = $("#am-rango"), btn = $("#am-btn-subir");
  const fijar = v => { if (!rango) return; v = Math.max(op.minSubir, Math.min(op.maxSubir, Math.round(v))); rango.value = v; btn.textContent = v >= op.maxSubir ? `Todo (${fmt(v)})` : `Subir a ${fmt(v)}`; };
  if (rango){ fijar(subir); rango.oninput = () => fijar(+rango.value); caja.querySelectorAll(".am-rapidos button").forEach(b => b.onclick = () => fijar(+b.dataset.m)); }
  caja.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const a = b.dataset.a, monto = a === "subir" ? +rango.value : undefined;
    if (a === "subir") am.ultimaSubida = monto;
    caja.querySelectorAll("button").forEach(x => x.disabled = true);
    sonido[a === "retirarse" ? "clic" : "ficha"]();
    amEnviar({ tipo: "accion", accion: a, monto });
  });
}
function amSonidos(antes, s){
  const m = s.mano, a = antes?.mano; if (!m) return;
  if (!a || a.num !== m.num){ sonido.carta(); sonido.carta(0.15); return; }
  if (m.board.length > a.board.length) for (let i = a.board.length; i < m.board.length; i++) sonido.carta((i - a.board.length) * 0.12);
  if (m.bote > a.bote) sonido.ficha();
  if (s.opciones && !antes.opciones){ sonido.clic(); sonido.clavo(8); }
  if (m.resultado && !a.resultado){
    const mio = m.resultado.cobros?.[s.tuAsiento];
    if (mio) sonido.gana(mio >= 10 * s.config.ciega ? 2 : 1);
  }
}
function amBurbuja(asiento, emoji){
  const el = $(`#am-mesa .am-asiento[data-asiento="${asiento}"]`) || $(`#amr-jugadores [data-asiento="${asiento}"]`) || $(`#amb-asientos [data-asiento="${asiento}"]`); if (!el) return;
  const b = document.createElement("span"); b.className = "am-burbuja"; b.textContent = emoji; el.appendChild(b);
  setTimeout(() => b.remove(), 2200);
}
// Reloj del turno: el anillo alrededor del avatar se va vaciando.
(function reloj(){
  const s = am.estado, m = s?.mano;
  if (m && m.turno !== null && m.fase !== "fin"){
    const el = $(`#am-mesa .am-asiento[data-asiento="${m.turno}"] .am-avatar`);
    const resta = Math.max(0, m.limite - (Date.now() + am.desfase)), frac = Math.min(1, resta / (s.config.tiempo * 1000));
    if (el){ el.style.setProperty("--resta", frac); el.dataset.seg = Math.ceil(resta / 1000); }
  }
  requestAnimationFrame(reloj);
})();

// Abrir directo desde un enlace #sala=CÓDIGO
{
  const h = decodeURIComponent(location.hash.slice(1)), c = h.startsWith("sala=") ? h.slice(5).toUpperCase() : "";
  if (/^[A-HJ-NP-Z2-9]{6}$/.test(c)){
    $("#am-codigo").value = c;
    if (enLinea && (am.datos.pases[c] || am.datos.apodo)) setTimeout(() => amConectar(c), 0);
    else setTimeout(() => { msg("#am-msg", "Escribe tu apodo, elige un avatar y toca «Entrar»."); $("#am-apodo").focus(); }, 0);
  }
}
registrarJuego("amigos", { alMostrar(){ if (am.codigo) try { history.replaceState(null, "", "#sala=" + am.codigo); } catch (e) {} } });
