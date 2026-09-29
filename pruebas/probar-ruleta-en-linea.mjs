/* Prueba de la ruleta en línea (servidor/ruleta.js) sin red.
   Uso: node pruebas/probar-ruleta-en-linea.mjs [rondas, por defecto 3000] */
import * as R from "../servidor/ruleta.js";
import * as P from "../servidor/poker.js";
import { createHash } from "node:crypto";

const RONDAS = +process.argv[2] || 3000;
let fallos = 0; const errores = new Set();
const mal = t => { fallos++; errores.add(t); };
const azar = n => Math.floor(Math.random() * n);
const TIPOS = ["r", "n", "p", "i", "b", "a", "d1", "d2", "d3", "c1", "c2", "c3", ...Array.from({ length: 37 }, (_, i) => String(i))];
const nums = {}; let apostadoTotal = 0, pagadoTotal = 0, rondas = 0, adelantadas = 0;

let reloj = 1_000_000;
let s = await R.nuevaSalaRuleta("RULETA", { fichas: 1_000_000, tiempo: 15 }, reloj);
const tokens = ["Ana", "Beto", "Caro", "Dani"].map(n => P.unirse(s, { apodo: n, avatar: "siete" }, reloj).jugador.token);
s.jugadores.forEach(j => j.fichas = 1_000_000);                  // mucho margen para que nadie se quede sin fichas en la prueba
const inicial = 4 * 1_000_000;
if (R.apostar(s, tokens[0], { t: "99", monto: 10 }).error === undefined) mal("aceptó una apuesta inventada");
if (R.apostar(s, tokens[0], { t: "r", monto: 5_000_000 }).error === undefined) mal("aceptó apostar más fichas de las que tiene");
if (R.listo(s, tokens[1]).error === undefined) mal("aceptó «Listo» sin fichas");

while (rondas < RONDAS){
  const r = s.ruleta, huellaAntes = r.huella, rondaAntes = r.ronda;
  // cada jugador pone de 0 a 5 fichas al azar; a veces deshace, borra o repite
  for (const tk of tokens){
    const x = Math.random();
    if (x < 0.1 && R.repetir(s, tk, reloj).error === undefined) continue;
    for (let k = azar(6); k > 0; k--) R.apostar(s, tk, { t: TIPOS[azar(TIPOS.length)], monto: 1 + azar(200) }, reloj);
    if (x > 0.9) R.deshacer(s, tk); if (x > 0.97) R.borrar(s, tk);
  }
  const enJuego = Object.values(s.ruleta.apuestas).flat().reduce((a, f) => a + f.monto, 0);
  if (s.jugadores.reduce((a, j) => a + j.fichas, 0) + enJuego !== inicial - apostadoTotal + pagadoTotal) mal("fichas descuadradas durante las apuestas");
  const apuestas = JSON.parse(JSON.stringify(s.ruleta.apuestas));
  const fichasAntes = Object.fromEntries(s.jugadores.map(j => [j.token, j.fichas]));
  // a veces todos marcan «Listo» (gira antes); si no, se acaba el tiempo
  if (Math.random() < 0.3){ tokens.forEach(tk => R.listo(s, tk, reloj)); if (s.ruleta.fase === "giro") adelantadas++; }
  else { reloj = (s.ruleta.fin ?? reloj) + 1; await R.alarma(s, reloj); }
  if (!enJuego){ if (s.ruleta.fase !== "apuestas") mal("giró sin apuestas"); rondas++; continue; }
  if (s.ruleta.fase !== "giro") { mal("no giró con apuestas: " + s.ruleta.fase); break; }
  const vistaGiro = R.vistaPara(s, tokens[0]);
  if (vistaGiro.ruleta.resultado) mal("el resultado se mostró antes de que se detenga la bola");
  if (R.apostar(s, tokens[0], { t: "r", monto: 1 }, reloj).error === undefined) mal("aceptó apuestas con la bola girando");
  reloj = s.ruleta.fin + 1; await R.alarma(s, reloj);
  const res = s.ruleta.resultado, n = res.numero;
  nums[n] = (nums[n] || 0) + 1;
  // cada jugador cobra exactamente lo que dicen las reglas
  for (const tk of tokens){
    const fs = apuestas[tk] || [], pago = globalThis.ruPagoTotal(fs, n), ap = globalThis.sumaFichas(fs), j = s.jugadores.find(x => x.token === tk);
    if (j.fichas !== fichasAntes[tk] + pago) mal("pago incorrecto");
    apostadoTotal += ap; pagadoTotal += pago;
  }
  // la huella publicada antes corresponde al secreto y al número
  const rev = s.ruleta.revelado;
  if (rev.huella !== huellaAntes || createHash("sha256").update(`${rev.secreto}:${rev.numero}`).digest("hex") !== huellaAntes || rev.numero !== n) mal("la huella no corresponde al número");
  if (s.jugadores.reduce((a, j) => a + j.fichas, 0) !== inicial - apostadoTotal + pagadoTotal) mal("fichas descuadradas después de pagar");
  reloj = s.ruleta.fin + 1; await R.alarma(s, reloj);
  if (s.ruleta.ronda !== rondaAntes + 1 || s.ruleta.fase !== "apuestas" || s.ruleta.huella === huellaAntes) mal("no empezó una ronda nueva con huella nueva");
  rondas++;
}
const devol = pagadoTotal / apostadoTotal, distintos = Object.keys(nums).length;
console.log(`Rondas: ${rondas} (giradas antes por «Listo»: ${adelantadas}) · números distintos que salieron: ${distintos}/37 · devolvió ${(devol * 100).toFixed(2)} % (teórico 97,30 %)`);
if (distintos < 37) mal("no salieron todos los números");
if (Math.abs(devol - 36 / 37) > 0.03) mal("devolución lejos de 97,3 %");
if (fallos){ console.log("✘ Falló:", [...errores].join(" | ")); process.exit(1); }
console.log("✔ Ruleta en línea: fichas cuadradas, pagos exactos, huellas correctas, sin apuestas después de «No va más»");
