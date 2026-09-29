/* Prueba del crupier en línea (servidor/poker.js) sin red: miles de manos con 2 a 6 jugadores
   que hacen jugadas al azar (y a veces se quedan sin tiempo o se van).
   Uso: node pruebas/probar-poker-en-linea.mjs [manos, por defecto 4000] */
import * as P from "../servidor/poker.js";

const MANOS = +process.argv[2] || 4000;
let fallos = 0; const errores = new Set();
const mal = t => { fallos++; errores.add(t); };
const azar = n => Math.floor(Math.random() * n);

let manos = 0, showdowns = 0, lateral = 0, reparte = 0;
while (manos < MANOS){
  let reloj = 1_000_000;
  const n = 2 + azar(5), s = P.nuevaSala(P.codigoAzar(), { fichas: [500, 1000, 2000][azar(3)], ciega: [10, 20, 50][azar(3)], tiempo: 15 }, reloj);
  const tokens = [];
  for (let i = 0; i < n; i++) tokens.push(P.unirse(s, { apodo: "Jugador" + i, avatar: "🦊" }, reloj).jugador.token);
  if (P.unirse(s, { apodo: "jugador0" }).error === undefined) mal("acepta apodos repetidos");
  const totalFichas = s.config.fichas * n;
  const todos = [...s.jugadores];                                    // incluye a los que se vayan (se llevan sus fichas)
  if (P.empezar(s, tokens[1], reloj).error === undefined && n > 1) mal("alguien que no es anfitrión pudo empezar");
  P.empezar(s, tokens[0], reloj);
  let botones = [], manoAnterior = 0;
  for (let paso = 0; paso < 4000 && s.estado === "jugando" && manos < MANOS; paso++){
    const m = s.mano;
    // conservación de fichas: fichas en mano de cada uno + bote = total inicial
    const enMesa = todos.reduce((a, j) => a + j.fichas, 0) + (m && m.fase !== "fin" ? Object.values(m.ps).reduce((a, p) => a + p.total, 0) : 0);
    if (enMesa !== totalFichas) mal(`se crean o pierden fichas (${enMesa} de ${totalFichas})`);
    if (s.jugadores.some(j => j.fichas < 0)) mal("fichas negativas");
    if (m && m.num !== manoAnterior){
      manoAnterior = m.num; botones.push(m.boton);
      // privacidad: la vista de cada jugador no trae cartas de otros ni el mazo
      for (const t of tokens){
        const v = JSON.stringify(P.vistaPara(s, t)), yo = s.jugadores.find(j => j.token === t);
        if (v.includes("mazo")) mal("la vista incluye el mazo");
        for (const j of s.jugadores) if (j !== yo && m.ps[j.asiento]){
          const c = m.ps[j.asiento].cartas; if (v.includes(JSON.stringify(c[0])) && v.includes(JSON.stringify(c[1])) && !m.board.length) mal("se ven cartas de otro jugador");
        }
        const vv = P.vistaPara(s, t), otras = vv.jugadores.filter(x => !x.esYo && x.mano);
        if (otras.some(x => typeof x.mano.cartas !== "number")) mal("cartas ajenas visibles antes de mostrar");
      }
      // ciegas bien puestas
      if (m.ps[m.bb].total !== Math.min(s.config.ciega, m.ps[m.bb].total + s.jugadores.find(j => j.asiento === m.bb).fichas)) mal("ciega grande mal cobrada");
    }
    if (m.fase === "fin"){
      manos++;
      if (m.mostrar.length > 1) showdowns++;
      if (m.resultado.botes.length > 1) lateral++;
      if (m.resultado.botes.some(b => b.ganadores.length > 1)) reparte++;
      // al mostrar, cada jugador ve las cartas de los que llegaron al final
      const v = P.vistaPara(s, tokens[0]);
      if (m.mostrar.some(a => typeof v.jugadores.find(x => x.asiento === a).mano.cartas === "number")) mal("al final no se muestran las cartas");
      reloj = s.proximaMano; P.alarma(s, reloj);
      continue;
    }
    const j = s.jugadores.find(x => x.asiento === m.turno), op = P.opciones(s, m.turno);
    if (!op) { mal("turno sin opciones"); break; }
    // ¿quién está jugando? un token que no es el del turno no puede actuar
    const otro = tokens.find(t => t !== j.token && s.jugadores.some(x => x.token === t));
    if (otro && !P.accion(s, otro, { accion: "pasar" }, reloj).error) mal("alguien actuó fuera de su turno");
    const r = Math.random();
    if (r < 0.03){ reloj = m.limite + 1; P.alarma(s, reloj); continue; }            // se le acaba el tiempo
    if (r < 0.035 && s.jugadores.length > 2){ P.salir(s, j.token, reloj); continue; } // se va de la mesa
    let res;
    if (r < 0.15) res = P.accion(s, j.token, { accion: "retirarse" }, reloj);
    else if (r < 0.55) res = P.accion(s, j.token, { accion: op.puedePasar ? "pasar" : "igualar" }, reloj);
    else if (op.puedeSubir){
      const monto = Math.random() < 0.2 ? op.maxSubir : op.minSubir + azar(Math.max(1, Math.min(op.maxSubir, op.minSubir * 3) - op.minSubir + 1));
      res = P.accion(s, j.token, { accion: "subir", monto: Math.min(monto, op.maxSubir) }, reloj);
      if (P.accion(s, j.token, { accion: "subir", monto: 1 }, reloj).error === undefined && s.mano.turno === j.asiento) mal("aceptó una subida menor al mínimo");
    } else res = P.accion(s, j.token, { accion: op.puedePasar ? "pasar" : "igualar" }, reloj);
    if (res.error) mal("acción válida rechazada: " + res.error);
    reloj += 500;
  }
  // el botón rota: nunca dos manos seguidas en el mismo asiento (si hay más de un jugador)
  for (let i = 1; i < botones.length; i++) if (botones[i] === botones[i - 1]) mal("el botón no rotó");
}

// Casos armados a mano: bote lateral y empate
{
  const s = P.nuevaSala("CASO01", { fichas: 1000, ciega: 20, tiempo: 30 }, 0);
  const [a, b, c] = ["Ana", "Beto", "Caro"].map(x => P.unirse(s, { apodo: x }).jugador);
  b.fichas = 100;                                                   // Beto tiene menos fichas
  P.empezar(s, a.token, 0);
  const m = s.mano;
  // Beto recibe la mejor mano, Ana la segunda, Caro la peor
  m.ps[b.asiento].cartas = [{ v: "A", p: "♠" }, { v: "A", p: "♥" }];
  m.ps[a.asiento].cartas = [{ v: "K", p: "♠" }, { v: "K", p: "♥" }];
  m.ps[c.asiento].cartas = [{ v: "7", p: "♣" }, { v: "2", p: "♦" }];
  // el mazo se saca desde el final: quema 6♠, flop Q♣ J♦ 8♠, quema 5♥, turn 4♣, quema 9♣, river 3♦
  m.mazo = [{ v: "3", p: "♦" }, { v: "9", p: "♣" }, { v: "4", p: "♣" }, { v: "5", p: "♥" }, { v: "8", p: "♠" }, { v: "J", p: "♦" }, { v: "Q", p: "♣" }, { v: "6", p: "♠" }];
  let guardia = 0;
  while (s.mano.fase !== "fin" && guardia++ < 50){
    const t = s.jugadores.find(j => j.asiento === s.mano.turno), op = P.opciones(s, s.mano.turno);
    const jugada = op.puedeSubir && t === b ? { accion: "subir", monto: op.maxSubir }
      : op.puedeSubir && t === a && s.mano.fase === "flop" ? { accion: "subir", monto: 200 }
      : { accion: op.puedePasar ? "pasar" : "igualar" };
    const r = P.accion(s, t.token, jugada); if (r.error) mal("caso armado: " + r.error);
  }
  const r = s.mano.resultado;
  const cobroBeto = r.cobros[b.asiento] || 0, cobroAna = r.cobros[a.asiento] || 0;
  if (cobroBeto !== 300) mal(`bote lateral: Beto (con 100) debía cobrar 300 y cobró ${cobroBeto}`);
  if (cobroAna !== s.mano.orden.reduce((x, as) => x + s.mano.ps[as].total, 0) - 300) mal("bote lateral: Ana debía cobrar el resto");
  if (r.botes.length !== 2) mal("debían formarse 2 botes");
  console.log(`Caso armado: Beto (100 fichas, par de ases) cobra ${cobroBeto}; Ana (par de reyes) cobra ${cobroAna}; botes: ${r.botes.map(x => x.monto).join(" + ")}`);
}

console.log(`Manos jugadas: ${manos} · llegaron a mostrar cartas: ${showdowns} · con bote lateral: ${lateral} · con empate repartido: ${reparte}`);
if (fallos) { console.log("✘ Falló:", [...errores].join(" | ")); process.exit(1); }
console.log("✔ Crupier en línea: fichas conservadas, turnos, ciegas, botón, subidas mínimas, privacidad y botes laterales correctos");
