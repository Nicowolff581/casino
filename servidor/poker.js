/* ═════════ Casino Nico · crupier de Texas Hold'em en línea ═════════
   Reglas puras, sin red: el servidor (worker.js) guarda la sala y llama a estas funciones.
   El mazo y las cartas de cada jugador viven SOLO aquí; vistaPara() arma lo que ve cada uno.
   Fichas de práctica de la sala: todos empiezan con la misma cantidad, no se pueden pasar
   entre jugadores y no tocan el saldo personal de nadie. */
import "../public/js/manos.js";
import "../public/js/avatares.js";
const { mejorMano, nombreMano, repartirBotes, AVATARES_ID } = globalThis;

export const MAX_JUGADORES = 6;
export const AVATARES = AVATARES_ID;
export const REACCIONES = ["👍", "😂", "😮", "😢", "🔥", "👏", "🍀", "😎"];
const OPCIONES = { fichas: [500, 1000, 2000, 5000], ciega: [10, 20, 50, 100], tiempo: [15, 30, 60] };
const PALOS = ["♠", "♥", "♦", "♣"], VALORES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const PAUSA_FIN = 6000, PAUSA_SIN_MOSTRAR = 3500, TIEMPO_DESCONECTADO = 8000;

// Azar justo del servidor (sin sesgo: descarta valores que no reparten parejo).
function azarEntero(n){
  const lim = Math.floor(0x100000000 / n) * n, b = new Uint32Array(1);
  do crypto.getRandomValues(b); while (b[0] >= lim);
  return b[0] % n;
}
function baraja(){
  const b = []; for (const v of VALORES) for (const p of PALOS) b.push({ v, p });
  for (let i = b.length - 1; i > 0; i--){ const j = azarEntero(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
export function codigoAzar(){ const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({ length: 6 }, () => L[azarEntero(L.length)]).join(""); }
export function tokenAzar(){ return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join(""); }
const limpiarApodo = t => String(t || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);

/* ── sala y jugadores ── */
export function nuevaSala(codigo, cfg = {}, ahora = Date.now()){
  const elegir = (k, v) => OPCIONES[k].includes(+v) ? +v : OPCIONES[k][1];
  return { codigo, creada: ahora, actividad: ahora, config: { fichas: elegir("fichas", cfg.fichas), ciega: elegir("ciega", cfg.ciega), tiempo: elegir("tiempo", cfg.tiempo) },
    jugadores: [], anfitrion: null, estado: "espera", mano: null, numMano: 0, boton: -1, proximaMano: 0, ganadorPartida: null };
}
const jugadorPorToken = (s, token) => s.jugadores.find(j => j.token === token);
const jugadorEnAsiento = (s, a) => s.jugadores.find(j => j.asiento === a);

export function unirse(s, { token, apodo, avatar }, ahora = Date.now()){
  const ya = token && jugadorPorToken(s, token);
  if (ya){ ya.conectado = true; ya.seFue = false; return { jugador: ya }; }        // vuelve a su puesto
  if (s.jugadores.length >= MAX_JUGADORES) return { error: "La sala está llena (máximo 6 jugadores)." };
  const nombre = limpiarApodo(apodo);
  if (!nombre) return { error: "Escribe un apodo." };
  if (s.jugadores.some(j => j.apodo.toLowerCase() === nombre.toLowerCase())) return { error: "Ese apodo ya está en la sala. Elige otro." };
  const libres = [0, 1, 2, 3, 4, 5].filter(a => !jugadorEnAsiento(s, a));
  const jugador = { token: tokenAzar(), apodo: nombre, avatar: AVATARES.includes(avatar) ? avatar : AVATARES[0], asiento: libres[0],
    fichas: s.config.fichas, conectado: true, ausente: false, vencidos: 0, seFue: false, ultimaReaccion: 0 };
  s.jugadores.push(jugador);
  if (!s.anfitrion) s.anfitrion = jugador.token;
  s.actividad = ahora;
  return { jugador, nuevo: true };
}
export function desconectar(s, token, ahora = Date.now()){
  const j = jugadorPorToken(s, token); if (!j) return;
  j.conectado = false;
  // si justo era su turno, se le da poco tiempo para volver
  if (s.mano && s.mano.turno === j.asiento && s.mano.fase !== "fin") s.mano.limite = Math.min(s.mano.limite, ahora + TIEMPO_DESCONECTADO);
}
export function salir(s, token, ahora = Date.now()){
  const j = jugadorPorToken(s, token); if (!j) return;
  j.seFue = true; j.conectado = false;
  const ps = s.mano?.ps[j.asiento];
  if (ps && !ps.retirado && s.mano.fase !== "fin"){
    ps.retirado = true; registrar(s, `${j.apodo} se fue de la mesa`);
    s.mano.pendientes = s.mano.pendientes.filter(a => a !== j.asiento);
    if (s.mano.turno === j.asiento || vivos(s).length < 2) avanzar(s, ahora, j.asiento);
  }
  if (!s.mano || s.mano.fase === "fin") quitarIdos(s);
}
function quitarIdos(s){
  s.jugadores = s.jugadores.filter(j => !j.seFue);
  if (!jugadorPorToken(s, s.anfitrion)) s.anfitrion = s.jugadores[0]?.token || null;
}
export function volver(s, token){ const j = jugadorPorToken(s, token); if (j){ j.ausente = false; j.vencidos = 0; } }

/* ── manos ── */
const candidatos = s => s.jugadores.filter(j => j.fichas > 0 && !j.ausente && !j.seFue).sort((a, b) => a.asiento - b.asiento);
const vivos = s => Object.entries(s.mano.ps).filter(([, p]) => !p.retirado).map(([a]) => +a);
// Asientos en orden de juego a partir del que está a la izquierda de «desde».
function ordenDesde(asientos, desde){ const o = [...asientos].sort((a, b) => a - b); const i = o.findIndex(a => a > desde); return i < 0 ? o : [...o.slice(i), ...o.slice(0, i)]; }
function registrar(s, texto){ if (s.mano){ s.mano.registro.push(texto); if (s.mano.registro.length > 12) s.mano.registro.shift(); } }

export function empezar(s, token, ahora = Date.now()){
  if (token !== s.anfitrion) return { error: "Solo quien creó la sala puede empezar." };
  if (s.estado === "jugando") return { error: "La partida ya empezó." };
  if (candidatos(s).length < 2) return { error: "Hacen falta al menos 2 jugadores con fichas." };
  s.estado = "jugando"; s.ganadorPartida = null;
  nuevaMano(s, ahora);
  return {};
}
// Partida nueva: todos vuelven a la misma cantidad de fichas.
export function nuevaPartida(s, token, ahora = Date.now()){
  if (token !== s.anfitrion) return { error: "Solo quien creó la sala puede reiniciar." };
  if (s.estado === "jugando") return { error: "Espera a que termine la partida." };
  quitarIdos(s);
  s.jugadores.forEach(j => { j.fichas = s.config.fichas; j.ausente = false; j.vencidos = 0; });
  s.mano = null; s.boton = -1; s.ganadorPartida = null;
  return empezar(s, token, ahora);
}

export function nuevaMano(s, ahora = Date.now()){
  quitarIdos(s);
  const js = candidatos(s);
  if (js.length < 2){
    s.estado = "espera"; s.mano = null;
    const conFichas = s.jugadores.filter(j => j.fichas > 0);
    s.ganadorPartida = conFichas.length === 1 ? conFichas[0].apodo : null;
    return;
  }
  const asientos = js.map(j => j.asiento);
  s.boton = ordenDesde(asientos, s.boton)[0];
  const orden = ordenDesde(asientos, s.boton);                          // izquierda del botón primero, el botón al final
  const dos = asientos.length === 2;
  const sb = dos ? s.boton : orden[0], bb = dos ? orden[0] : orden[1];
  const mazo = baraja(), ps = {};
  asientos.forEach(a => ps[a] = { cartas: [], apuesta: 0, total: 0, retirado: false, allin: false, puedeSubir: true });
  for (let r = 0; r < 2; r++) orden.forEach(a => ps[a].cartas.push(mazo.pop()));
  s.numMano++;
  s.mano = { num: s.numMano, mazo, board: [], boton: s.boton, sb, bb, orden, ps, fase: "preflop", apuestaActual: 0, minSubida: s.config.ciega,
    pendientes: [], turno: null, limite: 0, registro: [], mostrar: [], resultado: null };
  poner(s, sb, Math.floor(s.config.ciega / 2)); poner(s, bb, s.config.ciega);
  s.mano.apuestaActual = s.config.ciega;
  registrar(s, `Mano ${s.numMano}: ciegas ${Math.floor(s.config.ciega / 2)} y ${s.config.ciega}`);
  const primero = dos ? sb : ordenDesde(asientos, bb)[0];
  s.mano.pendientes = ordenDesde(asientos, primero === orden[0] ? s.boton : asientoAnterior(asientos, primero)).filter(a => !ps[a].allin);
  s.mano.pendientes = rotarHasta(s.mano.pendientes, primero);
  darTurno(s, ahora);
}
const asientoAnterior = (asientos, a) => { const o = [...asientos].sort((x, y) => x - y), i = o.indexOf(a); return o[(i - 1 + o.length) % o.length]; };
const rotarHasta = (lista, a) => { const i = lista.indexOf(a); return i < 0 ? lista : [...lista.slice(i), ...lista.slice(0, i)]; };

function poner(s, asiento, cantidad){
  const j = jugadorEnAsiento(s, asiento), p = s.mano.ps[asiento], c = Math.max(0, Math.min(cantidad, j.fichas));
  j.fichas -= c; p.apuesta += c; p.total += c;
  if (j.fichas === 0) p.allin = true;
  return c;
}
function darTurno(s, ahora){
  const m = s.mano;
  m.pendientes = m.pendientes.filter(a => !m.ps[a].retirado && !m.ps[a].allin);
  if (!m.pendientes.length){ m.turno = null; return; }
  m.turno = m.pendientes[0];
  const j = jugadorEnAsiento(s, m.turno);
  m.limite = ahora + (j.conectado ? s.config.tiempo * 1000 : TIEMPO_DESCONECTADO);
}

// Lo que puede hacer el jugador del turno.
export function opciones(s, asiento){
  const m = s.mano; if (!m || m.turno !== asiento || m.fase === "fin") return null;
  const p = m.ps[asiento], j = jugadorEnAsiento(s, asiento), falta = m.apuestaActual - p.apuesta, maximo = p.apuesta + j.fichas;
  const minSubir = Math.min(maximo, m.apuestaActual + m.minSubida);
  const otrosPueden = Object.entries(m.ps).some(([a, q]) => +a !== asiento && !q.retirado && !q.allin);
  return { puedePasar: falta <= 0, aIgualar: Math.min(Math.max(0, falta), j.fichas), puedeSubir: p.puedeSubir && maximo > m.apuestaActual && otrosPueden, minSubir, maxSubir: maximo };
}

export function accion(s, token, { accion: acc, monto }, ahora = Date.now()){
  const j = jugadorPorToken(s, token), m = s.mano;
  if (!j || !m || m.fase === "fin" || m.turno !== j.asiento) return { error: "No es tu turno." };
  const op = opciones(s, j.asiento), p = m.ps[j.asiento], falta = m.apuestaActual - p.apuesta;
  if (acc === "retirarse"){ p.retirado = true; registrar(s, `${j.apodo} se retira`); }
  else if (acc === "pasar"){ if (!op.puedePasar) return { error: "Hay una apuesta: iguala o retírate." }; registrar(s, `${j.apodo} pasa`); }
  else if (acc === "igualar"){ if (falta <= 0) return { error: "No hay nada que igualar." }; poner(s, j.asiento, falta); registrar(s, p.allin ? `${j.apodo} va con todo (${p.apuesta})` : `${j.apodo} iguala ${p.apuesta}`); }
  else if (acc === "subir"){
    const a = Math.floor(+monto);
    if (!op.puedeSubir) return { error: "Ahora no puedes subir." };
    if (!(a > m.apuestaActual) || a > op.maxSubir) return { error: `La subida debe ser mayor que ${m.apuestaActual} y hasta ${op.maxSubir}.` };
    if (a < op.minSubir) return { error: `La subida mínima es hasta ${op.minSubir}.` };
    const subida = a - m.apuestaActual, completa = subida >= m.minSubida;
    poner(s, j.asiento, a - p.apuesta); m.apuestaActual = a;
    const otros = ordenDesde(Object.keys(m.ps).map(Number), j.asiento).filter(x => x !== j.asiento && !m.ps[x].retirado && !m.ps[x].allin);
    if (completa){ m.minSubida = subida; otros.forEach(x => m.ps[x].puedeSubir = true); }
    else otros.forEach(x => { if (!m.pendientes.includes(x)) m.ps[x].puedeSubir = false; });   // subida corta con todo: no reabre
    m.pendientes = [j.asiento, ...otros];
    registrar(s, p.allin ? `${j.apodo} va con todo (${a})` : `${j.apodo} sube a ${a}`);
  } else return { error: "Acción desconocida." };
  j.vencidos = 0; s.actividad = ahora;
  m.pendientes = m.pendientes.filter(x => x !== j.asiento);
  avanzar(s, ahora, j.asiento);
  return {};
}

// Pasa el turno, cambia de ronda o termina la mano.
function avanzar(s, ahora, ultimo){
  const m = s.mano;
  if (vivos(s).length === 1) return terminarMano(s, ahora);
  if (m.pendientes.length){
    m.pendientes = rotarHasta(m.pendientes, ordenDesde(m.pendientes, ultimo ?? -1)[0]);
    return darTurno(s, ahora);
  }
  // se acabó la ronda de apuestas
  Object.values(m.ps).forEach(p => { p.apuesta = 0; p.puedeSubir = true; });
  m.apuestaActual = 0; m.minSubida = s.config.ciega;
  const activos = vivos(s).filter(a => !m.ps[a].allin);
  const repartir = n => { m.mazo.pop(); for (let i = 0; i < n; i++) m.board.push(m.mazo.pop()); };
  const sig = { preflop: ["flop", 3], flop: ["turn", 1], turn: ["river", 1] }[m.fase];
  if (!sig) return terminarMano(s, ahora);
  if (activos.length <= 1){
    // nadie más puede apostar: se muestran las cartas y se reparte hasta el final
    m.mostrar = vivos(s);
    while (m.board.length < 5) repartir(m.board.length ? 1 : 3);
    m.fase = "river"; registrar(s, "Todos con todo: se reparte la mesa completa");
    return terminarMano(s, ahora);
  }
  m.fase = sig[0]; repartir(sig[1]);
  registrar(s, { flop: "Salen 3 cartas (flop)", turn: "Sale la cuarta carta (turn)", river: "Sale la quinta carta (river)" }[m.fase]);
  m.pendientes = ordenDesde(activos, m.boton);
  darTurno(s, ahora);
}

function terminarMano(s, ahora){
  const m = s.mano, v = vivos(s), asientos = m.orden;
  const puntajes = {};
  if (v.length > 1){ v.forEach(a => puntajes[a] = mejorMano([...m.ps[a].cartas, ...m.board])); m.mostrar = v; }
  const js = asientos.map(a => ({ total: m.ps[a].total, retirado: m.ps[a].retirado, puntaje: puntajes[a] }));
  const { cobros, botes } = repartirBotes(js);
  asientos.forEach((a, i) => { if (cobros[i]) jugadorEnAsiento(s, a).fichas += cobros[i]; });
  m.resultado = {
    cobros: Object.fromEntries(asientos.map((a, i) => [a, cobros[i]]).filter(([, c]) => c > 0)),
    botes: botes.map(b => ({ monto: b.monto, ganadores: b.ganadores.map(i => asientos[i]), mano: v.length > 1 ? nombreMano(puntajes[asientos[b.ganadores[0]]]) : null })),
    manos: Object.fromEntries(v.length > 1 ? v.map(a => [a, nombreMano(puntajes[a])]) : []),
  };
  m.resultado.botes.forEach(b => registrar(s, `${b.ganadores.map(a => jugadorEnAsiento(s, a).apodo).join(" y ")} ${b.ganadores.length > 1 ? "reparten" : "gana"} ${b.monto}${b.mano ? " con " + b.mano.toLowerCase() : ""}`));
  m.fase = "fin"; m.turno = null; m.pendientes = [];
  s.proximaMano = ahora + (v.length > 1 ? PAUSA_FIN : PAUSA_SIN_MOSTRAR);
}

/* ── tiempo: turnos vencidos y siguiente mano ── */
export function alarma(s, ahora = Date.now()){
  const m = s.mano;
  if (m && m.fase !== "fin" && m.turno !== null && ahora >= m.limite){
    const j = jugadorEnAsiento(s, m.turno), op = opciones(s, m.turno);
    j.vencidos++; if (j.vencidos >= 2) j.ausente = true;
    registrar(s, `${j.apodo} se quedó sin tiempo`);
    const tok = j.token, vencidos = j.vencidos;
    accion(s, tok, { accion: op.puedePasar ? "pasar" : "retirarse" }, ahora);
    j.vencidos = vencidos;                                             // accion() lo había reiniciado
  }
  if (s.estado === "jugando" && s.mano?.fase === "fin" && ahora >= s.proximaMano) nuevaMano(s, ahora);
}
export function proximaAlarma(s){
  const m = s.mano;
  if (m && m.fase !== "fin" && m.turno !== null) return m.limite;
  if (s.estado === "jugando" && m?.fase === "fin") return s.proximaMano;
  return null;
}

/* ── reacciones ── */
export function reaccion(s, token, emoji, ahora = Date.now()){
  const j = jugadorPorToken(s, token);
  if (!j || !REACCIONES.includes(emoji) || ahora - j.ultimaReaccion < 1000) return null;
  j.ultimaReaccion = ahora;
  return { asiento: j.asiento, emoji };
}

/* ── lo que ve cada jugador: nunca las cartas privadas de otros (salvo al mostrar al final) ── */
export function vistaPara(s, token){
  const yo = jugadorPorToken(s, token), m = s.mano;
  const jugadores = s.jugadores.map(j => {
    const p = m?.ps[j.asiento], esYo = j === yo, verCartas = p && (esYo || m.mostrar.includes(j.asiento));
    return { asiento: j.asiento, apodo: j.apodo, avatar: j.avatar, fichas: j.fichas, conectado: j.conectado, ausente: j.ausente, anfitrion: j.token === s.anfitrion, esYo,
      mano: p ? { apuesta: p.apuesta, total: p.total, retirado: p.retirado, allin: p.allin, cartas: verCartas ? p.cartas : p.cartas.length } : null };
  });
  return {
    codigo: s.codigo, config: s.config, estado: s.estado, ganadorPartida: s.ganadorPartida, soyAnfitrion: !!yo && yo.token === s.anfitrion,
    tuAsiento: yo ? yo.asiento : null, jugadores,
    mano: m ? { num: m.num, fase: m.fase, board: m.board, boton: m.boton, sb: m.sb, bb: m.bb, turno: m.turno, limite: m.limite, apuestaActual: m.apuestaActual,
      bote: Object.values(m.ps).reduce((a, p) => a + p.total, 0), resultado: m.resultado, registro: m.registro } : null,
    opciones: yo && m ? opciones(s, yo.asiento) : null,
    proximaMano: s.estado === "jugando" && m?.fase === "fin" ? s.proximaMano : null,
  };
}
