/* ═════════ Casino Nico · ruleta en línea (todos apuestan al mismo giro) ═════════
   Cada ronda:
   1) Apuestas: el número ya está sorteado y se muestra su huella (SHA-256 de «secreto:número»),
      así el servidor no puede cambiarlo al ver las apuestas. La cuenta regresiva empieza con la
      primera ficha; si todos los que apostaron marcan «Listo», se gira antes.
   2) Giro: todos reciben los mismos datos de animación y ven la bola caer en el mismo número.
   3) Resultado: se paga a cada uno según ruleta-comun.js y se revela el secreto para comprobar.
   Las fichas son las de la sala (iguales para todos al empezar, separadas del saldo personal). */
import "../public/js/ruleta-comun.js";
import * as P from "./poker.js";
const { esApuestaRU, ruPagoTotal, sumaFichas, RU_DURACION, ROJOS } = globalThis;
const PAUSA_RESULTADO = 7000, MAX_FICHAS = 60;

function azarEntero(n){
  const lim = Math.floor(0x100000000 / n) * n, b = new Uint32Array(1);
  do crypto.getRandomValues(b); while (b[0] >= lim);
  return b[0] % n;
}
async function sha256(texto){
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const jugador = (s, token) => s.jugadores.find(j => j.token === token);

export async function nuevaSalaRuleta(codigo, cfg, ahora = Date.now()){
  const s = P.nuevaSala(codigo, cfg, ahora);
  s.juego = "ruleta"; s.estado = "jugando";
  s.ruleta = { ronda: 0, fase: "apuestas", fin: null, apuestas: {}, anteriores: {}, listos: [], rueda: 0, giro: null, historial: [], resultado: null, secreto: null, numero: null, huella: null, revelado: null };
  await nuevaRonda(s, ahora);
  return s;
}
async function nuevaRonda(s, ahora){
  const r = s.ruleta;
  s.jugadores = s.jugadores.filter(j => !j.seFue);
  if (!s.jugadores.some(j => j.token === s.anfitrion)) s.anfitrion = s.jugadores[0]?.token || null;
  // el número de esta ronda se sortea YA y solo se publica su huella
  r.numero = azarEntero(37);
  r.secreto = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  r.huella = await sha256(`${r.secreto}:${r.numero}`);
  Object.assign(r, { ronda: r.ronda + 1, fase: "apuestas", fin: null, apuestas: {}, listos: [], giro: null });
}

/* ── apuestas ── */
export function apostar(s, token, { t, monto }, ahora = Date.now()){
  const r = s.ruleta, j = jugador(s, token);
  if (!j) return { error: "Primero entra a la sala." };
  if (r.fase !== "apuestas") return { error: "No va más: espera la siguiente ronda." };
  monto = Math.floor(+monto);
  if (!esApuestaRU(t) || !(monto >= 1)) return { error: "Apuesta no válida." };
  if (monto > j.fichas) return { error: j.fichas ? `Solo te quedan ${j.fichas} fichas.` : "No te quedan fichas." };
  const mias = r.apuestas[token] = r.apuestas[token] || [];
  if (mias.length >= MAX_FICHAS) return { error: "Ya pusiste muchas fichas en esta ronda." };
  j.fichas -= monto; mias.push({ t, monto });
  r.listos = r.listos.filter(x => x !== token);
  if (r.fin === null) r.fin = ahora + s.config.tiempo * 1000;           // la cuenta regresiva empieza con la primera ficha
  s.actividad = ahora;
  return {};
}
export function deshacer(s, token){
  const r = s.ruleta, j = jugador(s, token), mias = r.apuestas[token];
  if (r.fase !== "apuestas" || !mias?.length) return {};
  j.fichas += mias.pop().monto; r.listos = r.listos.filter(x => x !== token);
  return {};
}
export function borrar(s, token){
  const r = s.ruleta, j = jugador(s, token), mias = r.apuestas[token];
  if (r.fase !== "apuestas" || !mias?.length || !j) return {};
  j.fichas += sumaFichas(mias); delete r.apuestas[token]; r.listos = r.listos.filter(x => x !== token);
  return {};
}
export function repetir(s, token, ahora = Date.now()){
  const r = s.ruleta, ant = r.anteriores[token];
  if (!ant?.length) return { error: "No tienes una apuesta anterior." };
  if (r.fase !== "apuestas") return { error: "No va más: espera la siguiente ronda." };
  borrar(s, token);
  if (sumaFichas(ant) > jugador(s, token).fichas) return { error: "No te alcanzan las fichas para repetir la apuesta anterior." };
  for (const f of ant) apostar(s, token, f, ahora);
  return {};
}
export function listo(s, token, ahora = Date.now()){
  const r = s.ruleta;
  if (r.fase !== "apuestas" || !r.apuestas[token]?.length) return { error: "Primero pon al menos una ficha." };
  if (!r.listos.includes(token)) r.listos.push(token);
  // si todos los que apostaron (y siguen conectados) están listos, se gira ya
  const apostaron = Object.keys(r.apuestas).filter(tk => r.apuestas[tk].length && jugador(s, tk)?.conectado);
  if (apostaron.every(tk => r.listos.includes(tk))) girar(s, ahora);
  return {};
}
export function salir(s, token, ahora = Date.now()){
  if (s.ruleta.fase === "apuestas") borrar(s, token);                  // si todavía no giró, recupera sus fichas
  const j = jugador(s, token); if (j){ j.seFue = true; j.conectado = false; }
  if (s.ruleta.fase === "apuestas" && !s.ruleta.apuestas[token]){
    s.jugadores = s.jugadores.filter(x => x.token !== token);
    if (s.anfitrion === token) s.anfitrion = s.jugadores[0]?.token || null;
  }
}
export function nuevaPartida(s, token){
  const r = s.ruleta;
  if (token !== s.anfitrion) return { error: "Solo quien creó la sala puede reiniciar." };
  if (r.fase !== "apuestas") return { error: "Espera a que termine el giro." };
  Object.keys(r.apuestas).forEach(tk => borrar(s, tk));
  s.jugadores.forEach(j => j.fichas = s.config.fichas);
  r.anteriores = {}; r.fin = null;
  return {};
}

/* ── giro y resultado ── */
function girar(s, ahora){
  const r = s.ruleta, ORDEN = globalThis.ORDEN;
  r.fase = "giro";
  r.giro = { idx: ORDEN.indexOf(r.numero), rueda0: r.rueda, vueltas: 270 + azarEntero(91), bola0: azarEntero(360), inicio: ahora };
  r.fin = ahora + RU_DURACION + 400;
}
function resolver(s, ahora){
  const r = s.ruleta, n = r.numero, pagos = {};
  for (const [tk, fichas] of Object.entries(r.apuestas)){
    const j = jugador(s, tk); if (!j || !fichas.length) continue;
    const pagado = ruPagoTotal(fichas, n);
    j.fichas += pagado;
    pagos[j.asiento] = { apostado: sumaFichas(fichas), pagado };
  }
  r.resultado = { numero: n, color: n === 0 ? "verde" : ROJOS.has(n) ? "rojo" : "negro", pagos };
  r.revelado = { ronda: r.ronda, numero: n, secreto: r.secreto, huella: r.huella };
  r.historial.unshift(n); r.historial.splice(12);
  r.rueda = (r.giro.rueda0 + r.giro.vueltas) % 360;
  r.anteriores = { ...r.anteriores, ...r.apuestas };
  r.fase = "resultado"; r.fin = ahora + PAUSA_RESULTADO;
}
export async function alarma(s, ahora = Date.now()){
  const r = s.ruleta;
  if (r.fin === null || ahora < r.fin) return;
  if (r.fase === "apuestas"){ if (Object.values(r.apuestas).some(a => a.length)) girar(s, ahora); else r.fin = null; }
  else if (r.fase === "giro") resolver(s, ahora);
  else if (r.fase === "resultado") await nuevaRonda(s, ahora);
}
export const proximaAlarma = s => s.ruleta.fin;

/* ── lo que ve cada jugador (en la ruleta todas las apuestas son públicas) ── */
export function vistaPara(s, token){
  const r = s.ruleta, yo = jugador(s, token);
  return {
    juego: "ruleta", codigo: s.codigo, config: s.config, soyAnfitrion: !!yo && yo.token === s.anfitrion, tuAsiento: yo ? yo.asiento : null,
    jugadores: s.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, avatar: j.avatar, fichas: j.fichas, conectado: j.conectado, anfitrion: j.token === s.anfitrion,
      esYo: j === yo, apostado: sumaFichas(r.apuestas[j.token] || []), listo: r.listos.includes(j.token) })),
    ruleta: {
      ronda: r.ronda, fase: r.fase, fin: r.fin, huella: r.huella, historial: r.historial, rueda: r.rueda,
      apuestas: Object.entries(r.apuestas).flatMap(([tk, fs]) => { const j = jugador(s, tk); return j ? fs.map(f => ({ asiento: j.asiento, t: f.t, monto: f.monto })) : []; }),
      puedeRepetir: !!(yo && r.anteriores[yo.token]?.length),
      giro: r.fase === "apuestas" ? null : r.giro,
      resultado: r.fase === "resultado" ? r.resultado : null,
      revelado: r.revelado,
    },
  };
}
