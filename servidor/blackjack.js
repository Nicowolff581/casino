/* ═════════ Casino Nico · blackjack en línea (todos contra el mismo crupier) ═════════
   Cada ronda:
   1) Apuestas: el zapato (6 barajas) ya está mezclado y se muestra su huella (SHA-256 de
      «secreto:cartas en orden»), así el servidor no puede cambiar las cartas después.
      La cuenta regresiva empieza con la primera ficha; si todos los que apostaron marcan
      «¡Listo!», se reparte antes.
   2) Juego: cada uno, por turno y en orden de asiento, pide, se planta o dobla. Todos ven
      las cartas de todos; la segunda carta del crupier queda tapada hasta el final.
   3) Crupier y pagos: el crupier pide hasta 17 y se paga a cada uno según blackjack-comun.js.
   Las fichas son las de la sala (iguales para todos al empezar, separadas del saldo personal). */
import "../public/js/blackjack-comun.js";
import * as P from "./poker.js";
import { azarEntero, sha256 } from "./ruleta.js";
const { valorBJ, esBlackjack, bjPago, crupierPide, textoCarta } = globalThis;
const PALOS = ["♠", "♥", "♦", "♣"], VALORES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
export const BARAJAS = 6;
const PAUSA_RESULTADO = 7000, POR_CARTA = 900, TIEMPO_DESCONECTADO = 8000;

const jugador = (s, token) => s.jugadores.find(j => j.token === token);
function zapatoNuevo(){
  const z = [];
  for (let b = 0; b < BARAJAS; b++) for (const v of VALORES) for (const p of PALOS) z.push({ v, p });
  for (let i = z.length - 1; i > 0; i--){ const k = azarEntero(i + 1); [z[i], z[k]] = [z[k], z[i]]; }
  return z;
}
const textoZapato = z => z.map(textoCarta).join(",");

export async function nuevaSalaBlackjack(codigo, cfg, ahora = Date.now()){
  const s = P.nuevaSala(codigo, cfg, ahora);
  s.juego = "blackjack"; s.estado = "jugando";
  s.bj = { ronda: 0, fase: "apuestas", fin: null, apuestas: {}, anteriores: {}, listos: [], orden: [], manos: {}, turno: null, crupier: [], zapato: [], usadas: 0,
    secreto: null, huella: null, revelado: null, resultado: null };
  await nuevaRonda(s, ahora);
  return s;
}
async function nuevaRonda(s, ahora){
  const r = s.bj;
  s.jugadores = s.jugadores.filter(j => !j.seFue);
  if (!s.jugadores.some(j => j.token === s.anfitrion)) s.anfitrion = s.jugadores[0]?.token || null;
  // las cartas de esta ronda se mezclan YA y solo se publica su huella
  r.zapato = zapatoNuevo(); r.usadas = 0;
  r.secreto = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  r.huella = await sha256(`${r.secreto}:${textoZapato(r.zapato)}`);
  Object.assign(r, { ronda: r.ronda + 1, fase: "apuestas", fin: null, apuestas: {}, listos: [], orden: [], manos: {}, turno: null, crupier: [], resultado: null });
}
const sacar = r => r.zapato[r.usadas++];

/* ── apuestas ── */
export function apostar(s, token, { monto }, ahora = Date.now()){
  const r = s.bj, j = jugador(s, token);
  if (!j) return { error: "Primero entra a la sala." };
  if (r.fase !== "apuestas") return { error: "Ya se repartió: espera la siguiente ronda." };
  monto = Math.floor(+monto);
  if (!(monto >= 1)) return { error: "Apuesta no válida." };
  if (monto > j.fichas) return { error: j.fichas ? `Solo te quedan ${j.fichas} fichas.` : "No te quedan fichas." };
  j.fichas -= monto; r.apuestas[token] = (r.apuestas[token] || 0) + monto;
  r.listos = r.listos.filter(x => x !== token);
  if (r.fin === null) r.fin = ahora + s.config.tiempo * 1000;           // la cuenta regresiva empieza con la primera ficha
  return {};
}
export function borrar(s, token){
  const r = s.bj, j = jugador(s, token);
  if (r.fase !== "apuestas" || !r.apuestas[token] || !j) return {};
  j.fichas += r.apuestas[token]; delete r.apuestas[token]; r.listos = r.listos.filter(x => x !== token);
  return {};
}
export function repetir(s, token, ahora = Date.now()){
  const r = s.bj, ant = r.anteriores[token];
  if (!ant) return { error: "No tienes una apuesta anterior." };
  if (r.fase !== "apuestas") return { error: "Ya se repartió: espera la siguiente ronda." };
  borrar(s, token);
  if (ant > jugador(s, token).fichas) return { error: "No te alcanzan las fichas para repetir la apuesta anterior." };
  return apostar(s, token, { monto: ant }, ahora);
}
export function listo(s, token, ahora = Date.now()){
  const r = s.bj;
  if (r.fase !== "apuestas" || !r.apuestas[token]) return { error: "Primero pon tu apuesta." };
  if (!r.listos.includes(token)) r.listos.push(token);
  // si todos los que apostaron (y siguen conectados) están listos, se reparte ya
  const apostaron = Object.keys(r.apuestas).filter(tk => jugador(s, tk)?.conectado);
  if (apostaron.every(tk => r.listos.includes(tk))) repartir(s, ahora);
  return {};
}
export function nuevaPartida(s, token){
  const r = s.bj;
  if (token !== s.anfitrion) return { error: "Solo quien creó la sala puede reiniciar." };
  if (r.fase !== "apuestas") return { error: "Espera a que termine la ronda." };
  Object.keys(r.apuestas).forEach(tk => borrar(s, tk));
  s.jugadores.forEach(j => j.fichas = s.config.fichas);
  r.anteriores = {}; r.fin = null;
  return {};
}

/* ── reparto y turnos ── */
function repartir(s, ahora){
  const r = s.bj;
  r.orden = Object.keys(r.apuestas).filter(tk => jugador(s, tk)).sort((a, b) => jugador(s, a).asiento - jugador(s, b).asiento);
  r.manos = Object.fromEntries(r.orden.map(tk => [tk, { cartas: [], apuesta: r.apuestas[tk], doblo: false, hecho: false }]));
  r.anteriores = { ...r.anteriores, ...r.apuestas };
  // como en la mesa: una carta a cada uno, una al crupier, la segunda a cada uno y la segunda (tapada) al crupier
  for (let vuelta = 0; vuelta < 2; vuelta++){ for (const tk of r.orden) r.manos[tk].cartas.push(sacar(r)); r.crupier.push(sacar(r)); }
  r.fase = "juego";
  // el crupier mira si tiene blackjack: si lo tiene, la ronda termina enseguida
  if (esBlackjack(r.crupier)) return terminar(s, ahora);
  for (const tk of r.orden) if (esBlackjack(r.manos[tk].cartas)) r.manos[tk].hecho = true;
  siguiente(s, ahora);
}
function siguiente(s, ahora){
  const r = s.bj, tk = r.orden.find(t => !r.manos[t].hecho);
  if (!tk) return terminar(s, ahora);
  r.turno = tk;
  r.fin = ahora + s.config.tiempo * 1000;
  if (!jugador(s, tk)?.conectado) r.fin = Math.min(r.fin, ahora + TIEMPO_DESCONECTADO);
}
export function accion(s, token, { accion: a }, ahora = Date.now()){
  const r = s.bj, j = jugador(s, token), m = r.manos[token];
  if (r.fase !== "juego" || r.turno !== token || !m) return { error: "No es tu turno." };
  if (a === "pedir"){
    m.cartas.push(sacar(r));
    if (valorBJ(m.cartas) >= 21) m.hecho = true;                        // se pasó o llegó a 21
  } else if (a === "plantarse") m.hecho = true;
  else if (a === "doblar"){
    if (m.cartas.length !== 2 || m.doblo) return { error: "Solo puedes doblar con tus dos primeras cartas." };
    if (j.fichas < m.apuesta) return { error: "No te alcanzan las fichas para doblar." };
    j.fichas -= m.apuesta; m.apuesta *= 2; m.doblo = true;
    m.cartas.push(sacar(r)); m.hecho = true;                            // al doblar recibe una sola carta
  } else return { error: "Acción no válida." };
  if (m.hecho) siguiente(s, ahora);
  else r.fin = ahora + s.config.tiempo * 1000;                          // el reloj vuelve a empezar tras cada carta
  return {};
}
function terminar(s, ahora){
  const r = s.bj, antes = r.crupier.length;
  // el crupier solo roba si queda alguna mano que no se pasó y no es blackjack (no cambia ningún pago)
  const vivas = r.orden.some(tk => { const c = r.manos[tk].cartas; return valorBJ(c) <= 21 && !esBlackjack(c); });
  if (vivas && !esBlackjack(r.crupier)) while (crupierPide(r.crupier)) r.crupier.push(sacar(r));
  const pagos = {};
  for (const tk of r.orden){
    const j = jugador(s, tk), m = r.manos[tk]; if (!j) continue;
    const pagado = bjPago(m.cartas, r.crupier, m.apuesta);
    j.fichas += pagado;
    const tu = valorBJ(m.cartas), texto = esBlackjack(m.cartas) && pagado > m.apuesta ? "¡Blackjack!" : tu > 21 ? "Se pasó" : pagado > m.apuesta ? "Gana" : pagado === m.apuesta ? "Empate" : "Pierde";
    pagos[j.asiento] = { apostado: m.apuesta, pagado, texto };
  }
  r.resultado = { pagos, crupier: valorBJ(r.crupier), blackjack: esBlackjack(r.crupier), nuevas: r.crupier.length - antes };
  r.revelado = { ronda: r.ronda, secreto: r.secreto, huella: r.huella, zapato: textoZapato(r.zapato), usadas: r.usadas };
  r.fase = "resultado"; r.turno = null;
  r.fin = ahora + PAUSA_RESULTADO + POR_CARTA * (r.crupier.length - 1);
}
export function salir(s, token, ahora = Date.now()){
  const r = s.bj, j = jugador(s, token);
  if (r.fase === "apuestas") borrar(s, token);                          // si todavía no se repartió, recupera sus fichas
  if (j){ j.seFue = true; j.conectado = false; }
  if (r.fase === "juego" && r.manos[token] && !r.manos[token].hecho){ r.manos[token].hecho = true; if (r.turno === token) siguiente(s, ahora); }
  if (r.fase === "apuestas" || !r.manos[token]){
    s.jugadores = s.jugadores.filter(x => x.token !== token);
    if (s.anfitrion === token) s.anfitrion = s.jugadores[0]?.token || null;
  }
}
export function desconectar(s, token, ahora = Date.now()){
  P.desconectar(s, token, ahora);
  const r = s.bj;
  if (r.fase === "juego" && r.turno === token) r.fin = Math.min(r.fin, ahora + TIEMPO_DESCONECTADO);
}
export async function alarma(s, ahora = Date.now()){
  const r = s.bj;
  if (r.fin === null || ahora < r.fin) return;
  if (r.fase === "apuestas"){ if (Object.keys(r.apuestas).length) repartir(s, ahora); else r.fin = null; }
  else if (r.fase === "juego"){ const m = r.manos[r.turno]; if (m) m.hecho = true; siguiente(s, ahora); }    // se acabó su tiempo: se planta
  else if (r.fase === "resultado") await nuevaRonda(s, ahora);
}
export const proximaAlarma = s => s.bj.fin;

/* ── lo que ve cada jugador: todas las manos son públicas; la carta tapada del crupier, no ── */
export function vistaPara(s, token){
  const r = s.bj, yo = jugador(s, token), tapada = r.fase === "juego";
  return {
    juego: "blackjack", codigo: s.codigo, config: s.config, soyAnfitrion: !!yo && yo.token === s.anfitrion, tuAsiento: yo ? yo.asiento : null,
    jugadores: s.jugadores.map(j => ({ asiento: j.asiento, apodo: j.apodo, avatar: j.avatar, fichas: j.fichas, conectado: j.conectado, anfitrion: j.token === s.anfitrion,
      esYo: j === yo, apuesta: r.fase === "apuestas" ? r.apuestas[j.token] || 0 : r.manos[j.token]?.apuesta || 0, listo: r.listos.includes(j.token) })),
    bj: {
      ronda: r.ronda, fase: r.fase, fin: r.fin, huella: r.huella, barajas: BARAJAS,
      turno: r.turno ? jugador(s, r.turno)?.asiento ?? null : null,
      crupier: tapada ? [r.crupier[0], null] : r.crupier,
      manos: r.orden.map(tk => { const j = jugador(s, tk), m = r.manos[tk]; return j ? { asiento: j.asiento, cartas: m.cartas, apuesta: m.apuesta, doblo: m.doblo, hecho: m.hecho, valor: valorBJ(m.cartas) } : null; }).filter(Boolean),
      puedeRepetir: !!(yo && r.anteriores[yo.token]), anterior: yo ? r.anteriores[yo.token] || 0 : 0,
      resultado: r.fase === "resultado" ? r.resultado : null,
      revelado: r.revelado,
    },
  };
}
