/* Prueba del blackjack en línea (servidor/blackjack.js) sin red.
   Juega miles de rondas con 4 jugadores que usan la estrategia básica y revisa:
   fichas cuadradas, pagos según blackjack-comun.js, turnos, carta tapada, huella del zapato
   y cuánto devuelve la mesa (el valor que se muestra en las reglas).
   Uso: node pruebas/probar-blackjack-en-linea.mjs [rondas, por defecto 50000] */
import * as B from "../servidor/blackjack.js";
import * as P from "../servidor/poker.js";
import { createHash } from "node:crypto";
const { valorBJ, esBlackjack, bjPago } = globalThis;

const RONDAS = +process.argv[2] || 50000;
let fallos = 0; const errores = new Set();
const mal = t => { fallos++; errores.add(t); };
const azar = n => Math.floor(Math.random() * n);
const val = c => c.v === "A" ? 11 : "JQK".includes(c.v) ? 10 : +c.v;
const blanda = m => { let t = 0, a = 0; for (const c of m){ t += val(c); if (c.v === "A") a++; } while (t > 21 && a){ t -= 10; a--; } return a > 0; };
// estrategia básica: 6 barajas, el crupier se planta en 17 blando, doblar con 2 cartas, sin dividir
function decidir(m, arriba, puedeDoblar){
  const t = valorBJ(m), u = val(arriba);
  if (blanda(m)){
    if (t >= 19) return "plantarse";
    if (t === 18) return puedeDoblar && u >= 3 && u <= 6 ? "doblar" : u >= 9 ? "pedir" : "plantarse";
    const dobla = { 17: [3, 6], 16: [4, 6], 15: [4, 6], 14: [5, 6], 13: [5, 6] }[t];
    return puedeDoblar && dobla && u >= dobla[0] && u <= dobla[1] ? "doblar" : "pedir";
  }
  if (t >= 17) return "plantarse";
  if (t >= 13) return u <= 6 ? "plantarse" : "pedir";
  if (t === 12) return u >= 4 && u <= 6 ? "plantarse" : "pedir";
  if (t === 11) return puedeDoblar && u <= 10 ? "doblar" : "pedir";
  if (t === 10) return puedeDoblar && u <= 9 ? "doblar" : "pedir";
  if (t === 9) return puedeDoblar && u >= 3 && u <= 6 ? "doblar" : "pedir";
  return "pedir";
}

let reloj = 1_000_000;
const s = await B.nuevaSalaBlackjack("BLACKJ", { fichas: 1000, tiempo: 15 }, reloj);
const nombres = ["Ana", "Beto", "Caro", "Dani"];
const tokens = nombres.map(n => P.unirse(s, { apodo: n, avatar: "siete" }, reloj).jugador.token);
s.jugadores.forEach(j => j.fichas = 1e9);
const total = () => s.jugadores.reduce((a, j) => a + j.fichas, 0);
let dinero = total(), apostado = 0, pagado = 0, rondas = 0, adelantadas = 0, vencidos = 0, bjCrupier = 0;
if (B.apostar(s, tokens[0], { monto: 5e9 }).error === undefined) mal("aceptó apostar más de lo que tiene");
if (B.apostar(s, tokens[0], { monto: -5 }).error === undefined) mal("aceptó una apuesta negativa");
if (B.listo(s, tokens[1]).error === undefined) mal("aceptó «Listo» sin apuesta");
if (B.accion(s, tokens[0], { accion: "pedir" }).error === undefined) mal("aceptó pedir carta antes de repartir");

while (rondas < RONDAS){
  const r = s.bj, huella = r.huella;
  // apuestas: cada uno pone de 0 a 3 fichas de valores distintos; a veces repite o borra
  for (const tk of tokens){
    const x = Math.random();
    if (x < 0.15 && !B.repetir(s, tk, reloj).error) continue;
    for (let k = x < 0.05 ? 0 : 1 + azar(3); k > 0; k--) B.apostar(s, tk, { monto: [5, 10, 25, 50, 100][azar(5)] }, reloj);
    if (x > 0.97) B.borrar(s, tk);
  }
  const apuestas = { ...r.apuestas }, sumaAp = Object.values(apuestas).reduce((a, b) => a + b, 0);
  if (total() + sumaAp !== dinero) mal("fichas descuadradas en las apuestas");
  if (Math.random() < 0.4){ tokens.forEach(tk => B.listo(s, tk, reloj)); if (r.fase !== "apuestas") adelantadas++; }
  else { reloj = (r.fin ?? reloj) + 1; await B.alarma(s, reloj); }
  if (!sumaAp){ if (r.fase !== "apuestas") mal("repartió sin apuestas"); rondas++; continue; }
  if (r.fase === "apuestas"){ mal("no repartió con apuestas"); break; }
  // lo que ve cada uno mientras se juega: la segunda carta del crupier va tapada
  if (r.fase === "juego"){
    const v = B.vistaPara(s, tokens[0]).bj;
    if (v.crupier[1] !== null || v.resultado) mal("se ve la carta tapada");
    if (JSON.stringify(B.vistaPara(s, tokens[0])).includes('"zapato"') && !v.revelado) mal("se ve el zapato");
  }
  // turnos en orden de asiento; a veces alguien deja vencer su tiempo (se planta solo)
  let guardia = 0;
  while (r.fase === "juego" && guardia++ < 100){
    const tk = r.turno, m = r.manos[tk], quien = tokens.indexOf(tk);
    const otro = tokens.find(t => t !== tk);
    if (!B.accion(s, otro, { accion: "pedir" }).error) mal("otro jugador jugó fuera de turno");
    if (Math.random() < 0.02){ const n = m.cartas.length; reloj = r.fin + 1; await B.alarma(s, reloj); vencidos++; if (m.cartas.length !== n || !m.hecho) mal("al vencer el tiempo no se plantó"); continue; }
    const puede = m.cartas.length === 2 && s.jugadores[quien].fichas >= m.apuesta;
    const a = decidir(m.cartas, r.crupier[0], puede);
    const antes = m.cartas.length, e = B.accion(s, tk, { accion: a }, reloj);
    if (e.error) mal("acción rechazada: " + e.error);
    if (a === "doblar" && (m.cartas.length !== 3 || !m.hecho)) mal("doblar no dio una sola carta");
    if (a === "pedir" && m.cartas.length !== antes + 1) mal("pedir no dio carta");
  }
  if (r.fase !== "resultado"){ mal("la ronda no terminó: " + r.fase); break; }
  // pagos: se recalculan por fuera con blackjack-comun.js
  if (esBlackjack(r.crupier)) bjCrupier++;
  for (const tk of r.orden){
    const m = r.manos[tk], j = s.jugadores.find(x => x.token === tk), p = r.resultado.pagos[j.asiento];
    if (p.pagado !== bjPago(m.cartas, r.crupier, m.apuesta)) mal("pago distinto al de las reglas");
    if (m.apuesta !== apuestas[tk] * (m.doblo ? 2 : 1)) mal("apuesta final incorrecta");
    if (!esBlackjack(r.crupier) && r.orden.some(t => valorBJ(r.manos[t].cartas) <= 21 && !esBlackjack(r.manos[t].cartas)) && valorBJ(r.crupier) < 17) mal("el crupier se plantó antes de 17");
    apostado += m.apuesta; pagado += p.pagado;
  }
  if (valorBJ(r.crupier) >= 17 && r.crupier.length > 2 && valorBJ(r.crupier.slice(0, -1)) >= 17) mal("el crupier pidió con 17 o más");
  dinero += Object.values(r.resultado.pagos).reduce((a, p) => a + p.pagado - p.apostado, 0);
  if (total() !== dinero) mal("fichas descuadradas al pagar");
  // la huella corresponde al zapato revelado, y las cartas repartidas son las primeras del zapato
  const rev = r.revelado;
  if (createHash("sha256").update(`${rev.secreto}:${rev.zapato}`).digest("hex") !== huella) mal("la huella no coincide con el zapato");
  const repartidas = new Set([...r.orden.flatMap(t => r.manos[t].cartas), ...r.crupier]);
  if (repartidas.size !== rev.usadas || r.zapato.slice(0, rev.usadas).some(c => !repartidas.has(c))) mal("las cartas repartidas no son las primeras del zapato");
  reloj = r.fin + 1; await B.alarma(s, reloj);
  if (r.fase !== "apuestas" || r.huella === huella) mal("no empezó una ronda nueva con otro zapato");
  rondas++;
}
// sin fichas: salir durante la ronda y reiniciar la partida
const s2 = await B.nuevaSalaBlackjack("SALIRR", { fichas: 500, tiempo: 15 }, reloj);
const [a, b] = ["Uno", "Dos"].map(n => P.unirse(s2, { apodo: n, avatar: "as" }, reloj).jugador.token);
B.apostar(s2, a, { monto: 100 }, reloj); B.apostar(s2, b, { monto: 50 }, reloj);
B.salir(s2, b, reloj);
if (s2.jugadores.length !== 1) mal("quien sale antes de repartir no se va de la sala");
B.listo(s2, a, reloj);
if (s2.bj.fase === "apuestas") mal("no repartió cuando el único jugador tocó «Listo»");
if (B.nuevaPartida(s2, a).error === undefined) mal("reinició en medio de una ronda");

const rtp = pagado / apostado;
console.log(`${rondas} rondas · ${adelantadas} con «Listo» · ${vencidos} turnos vencidos · crupier con blackjack ${(bjCrupier / rondas * 100).toFixed(2)} %`);
console.log(`Devolución con estrategia básica: ${(rtp * 100).toFixed(2)} %`);
if (RONDAS >= 100000 && (rtp < 0.985 || rtp > 1.005)) mal("devolución fuera de lo esperado");
console.log(fallos ? `✘ ${fallos} fallos:\n  ` + [...errores].join("\n  ") : "✔ Blackjack en línea en orden");
process.exit(fallos ? 1 : 0);
