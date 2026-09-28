/* ═════════ TEXAS HOLD'EM ═════════
   Tú contra dos rivales controlados por el programa. Los rivales no ven tus cartas ni las
   del mazo: deciden solo con sus propias cartas y la mesa. Se reparte con una baraja justa. */
const ORD = Object.fromEntries(VALORES.map((v, i) => [v, i + 2]));
const NOMBRES_MANO = ["Carta alta","Pareja","Doble pareja","Trío","Escalera","Color","Full","Póker","Escalera de color"];
const th = { jugadores: [], board: [], mazo: [], bote: 0, apuestaActual: 0, dealer: 2, ciega: 0, subidas: 0 };
let thResolver = null;

function eval5(cs){
  const nums = cs.map(c => ORD[c.v]).sort((a, b) => b - a);
  const cnt = {}; nums.forEach(n => cnt[n] = (cnt[n] || 0) + 1);
  const grupos = Object.entries(cnt).map(([v, c]) => [+v, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const gv = grupos.map(g => g[0]);
  const flush = new Set(cs.map(c => c.p)).size === 1;
  let esc = 0;
  if (grupos.length === 5){ if (nums[0] - nums[4] === 4) esc = nums[0]; else if (nums.join() === "14,5,4,3,2") esc = 5; }
  if (esc && flush) return [8, esc];
  if (grupos[0][1] === 4) return [7, ...gv];
  if (grupos[0][1] === 3 && grupos[1][1] === 2) return [6, ...gv];
  if (flush) return [5, ...nums];
  if (esc) return [4, esc];
  if (grupos[0][1] === 3) return [3, ...gv];
  if (grupos[0][1] === 2 && grupos[1][1] === 2) return [2, ...gv];
  if (grupos[0][1] === 2) return [1, ...gv];
  return [0, ...nums];
}
// Reparte el bote en capas (bote principal y botes laterales).
// Cada jugador solo puede ganar, de cada rival, hasta lo mismo que él puso.
// Devuelve las fichas que le tocan al jugador humano (índice 0).
function thCobroHumano(jugadores, puntajes){
  const vivosK = [0, 1, 2].filter(k => !jugadores[k].retirado);
  const niveles = [...new Set(vivosK.map(k => jugadores[k].total))].sort((a, b) => a - b);
  let previo = 0, cobro = 0;
  for (const nivel of niveles){
    const capa = jugadores.reduce((s, p) => s + Math.min(p.total, nivel) - Math.min(p.total, previo), 0);
    const elegibles = vivosK.filter(k => jugadores[k].total >= nivel);
    let ganan = elegibles;
    if (elegibles.length > 1){
      const mejor = elegibles.map(k => puntajes[k]).reduce((m, s) => cmpMano(s, m) > 0 ? s : m);
      ganan = elegibles.filter(k => cmpMano(puntajes[k], mejor) === 0);
    }
    if (ganan.includes(0)) cobro += Math.floor(capa / ganan.length);
    previo = nivel;
  }
  return cobro;
}
const cmpMano = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++){ const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function combinaciones(arr, k, desde = 0, actual = [], out = []){
  if (actual.length === k){ out.push([...actual]); return out; }
  for (let i = desde; i < arr.length; i++){ actual.push(arr[i]); combinaciones(arr, k, i + 1, actual, out); actual.pop(); }
  return out;
}
function mejorMano(cs){ return combinaciones(cs, 5).map(eval5).reduce((m, s) => cmpMano(s, m) > 0 ? s : m); }
function nombreMano(s){ return s[0] === 8 && s[1] === 14 ? "Escalera real" : NOMBRES_MANO[s[0]]; }
function categoriaMesa(cs){
  const cnt = {}; cs.forEach(c => cnt[c.v] = (cnt[c.v] || 0) + 1);
  const v = Object.values(cnt).sort((a, b) => b - a);
  if (v[0] === 4) return 7; if (v[0] === 3 && v[1] === 2) return 6; if (v[0] === 3) return 3;
  if (v[0] === 2 && v[1] === 2) return 2; if (v[0] === 2) return 1; return 0;
}

/* inteligencia de los rivales */
function fuerzaBot(p){
  if (!th.board.length){
    const [a, b] = p.cartas.map(c => ORD[c.v]).sort((x, y) => y - x);
    let s = a === b ? 0.5 + a / 28 : (a + b) / 30;
    if (p.cartas[0].p === p.cartas[1].p) s += 0.06;
    if (a - b === 1) s += 0.04;
    return Math.min(s, 1);
  }
  const mano = mejorMano([...p.cartas, ...th.board]);
  let s = [0.15, 0.45, 0.62, 0.75, 0.82, 0.86, 0.93, 0.97, 1][mano[0]];
  if (mano[0] > 0 && mano[0] === categoriaMesa(th.board) && mano[0] !== 4 && mano[0] !== 5) s = 0.25;
  if (mano[0] === 0 && Math.max(...p.cartas.map(c => ORD[c.v])) >= 13) s = 0.3;
  return s;
}
function decisionBot(p){
  const falta = th.apuestaActual - p.apuesta, s = fuerzaBot(p), r = azar();
  if (th.jugadores[0].allin && !th.jugadores[0].retirado) return falta > 0 ? "igualar" : "pasar";
  const puedeSubir = th.subidas < 3;
  if (falta === 0) return puedeSubir && ((s > 0.7 && r < 0.65) || r < 0.07) ? "subir" : "pasar";
  if (s < 0.3 && r > 0.15) return "retirarse";
  if (puedeSubir && s > 0.75 && r < 0.45) return "subir";
  if (s < 0.45 && falta > th.ciega * 2 && r > 0.4) return "retirarse";
  return "igualar";
}

/* motor del juego */
const vivos = () => th.jugadores.filter(p => !p.retirado);
function poner(p, cantidad){
  if (p.humano){ cantidad = Math.min(cantidad, saldo); setSaldo(saldo - cantidad); if (saldo === 0) p.allin = true; }
  p.apuesta += cantidad; p.total += cantidad; th.bote += cantidad;
}
function pintarTH(revelar = false, turno = -1, ganadores = []){
  $("#th-rivales").innerHTML = ""; $("#th-yo").innerHTML = "";
  [1, 2, 0].forEach(k => {
    const p = th.jugadores[k] || { nombre: ["Tú", "Valentina", "Mateo"][k], cartas: [], estado: "" };
    const el = document.createElement("div");
    el.className = "asiento" + (k === 0 ? " tu" : "") + (p.retirado ? " fuera" : "") + (k === turno ? " turno" : "") + (ganadores.includes(k) ? " gana" : "");
    el.innerHTML = `<div class="nombre">${p.nombre}${th.dealer === k && th.jugadores.length ? '<span class="boton-d" title="Repartidor">D</span>' : ""}</div><div class="fila-cartas ${k ? "mini" : ""}"></div><div class="estado">${p.estado || ""}</div>`;
    p.cartas.forEach(c => el.querySelector(".fila-cartas").appendChild(cartaEl(c, k !== 0 && !(revelar && !p.retirado))));
    (k === 0 ? $("#th-yo") : $("#th-rivales")).appendChild(el);
  });
  const b = $("#th-board"); b.innerHTML = "";
  for (let i = 0; i < 5; i++){
    if (th.board[i]) b.appendChild(cartaEl(th.board[i]));
    else { const h = document.createElement("div"); h.className = "hueco"; b.appendChild(h); }
  }
  $("#th-bote").textContent = fmt(th.bote);
}
pintarTH();

function accionHumana(){
  const yo = th.jugadores[0], falta = th.apuestaActual - yo.apuesta;
  const subirA = th.apuestaActual + th.ciega, costoSubir = subirA - yo.apuesta;
  $("#th-fold").disabled = false;
  $("#th-call").disabled = false;
  $("#th-call").textContent = falta === 0 ? "Pasar" : falta >= saldo ? `Igualar con todo (${fmt(saldo)})` : `Igualar ${fmt(falta)}`;
  $("#th-raise").disabled = th.subidas >= 3 || saldo < costoSubir;
  $("#th-raise").textContent = `Subir a ${fmt(subirA)}`;
  return new Promise(res => thResolver = res);
}
function responder(acc){
  if (!thResolver) return;
  const r = thResolver; thResolver = null;
  ["#th-fold", "#th-call", "#th-raise"].forEach(s => $(s).disabled = true);
  r(acc);
}
$("#th-fold").onclick = () => responder("retirarse");
$("#th-call").onclick = () => responder(th.apuestaActual - th.jugadores[0].apuesta > 0 ? "igualar" : "pasar");
$("#th-raise").onclick = () => responder("subir");

async function rondaApuestas(inicio){
  th.subidas = 0;
  let pendientes = new Set([0, 1, 2].filter(k => !th.jugadores[k].retirado && !th.jugadores[k].allin));
  let i = inicio;
  while (pendientes.size && vivos().length > 1){
    const p = th.jugadores[i];
    if (pendientes.has(i)){
      if (p.retirado || p.allin){ pendientes.delete(i); }
      else {
        pintarTH(false, i);
        let acc;
        if (p.humano) acc = await accionHumana();
        else { await espera(800); acc = decisionBot(p); }
        const falta = th.apuestaActual - p.apuesta;
        if (acc === "retirarse"){ p.retirado = true; p.estado = "Se retira"; }
        else if (acc === "subir"){
          th.apuestaActual += th.ciega; th.subidas++;
          poner(p, th.apuestaActual - p.apuesta);
          p.estado = `Sube a ${fmt(th.apuestaActual)}`;
          pendientes = new Set([0, 1, 2].filter(k => k !== i && !th.jugadores[k].retirado && !th.jugadores[k].allin));
        } else if (falta > 0){ poner(p, falta); p.estado = p.allin ? "Va con todo" : "Iguala"; }
        else p.estado = "Pasa";
        pendientes.delete(i);
      }
    }
    i = (i + 1) % 3;
  }
  pintarTH(false);
}

$("#th-nueva").onclick = async () => {
  if (ocupado) return;
  const ciega = apuesta;
  if (saldo < ciega){ msg("#th-msg", saldo === 0 ? "Te quedaste sin fichas. Usa «Recargar»." : "No te alcanza para esa ciega. Elige una ficha menor.", "lose"); return; }
  ocupado = true; $("#th-nueva").disabled = true; msg("#th-msg", "");
  th.ciega = ciega; th.mazo = baraja(); th.board = []; th.bote = 0; th.dealer = (th.dealer + 1) % 3;
  th.jugadores = ["Tú", "Valentina", "Mateo"].map((nombre, k) => ({
    nombre, humano: k === 0, cartas: [th.mazo.pop(), th.mazo.pop()], apuesta: 0, total: 0, retirado: false, allin: false, estado: ""
  }));
  const sb = (th.dealer + 1) % 3, bb = (th.dealer + 2) % 3;
  poner(th.jugadores[sb], Math.floor(ciega / 2)); th.jugadores[sb].estado = "Ciega pequeña";
  poner(th.jugadores[bb], ciega); th.jugadores[bb].estado = "Ciega grande";
  th.apuestaActual = ciega;
  pintarTH(false);
  await espera(500);

  const nuevas = [0, 3, 1, 1];
  for (let f = 0; f < 4; f++){
    if (f > 0){
      th.mazo.pop();
      for (let k = 0; k < nuevas[f]; k++) th.board.push(th.mazo.pop());
      th.jugadores.forEach(p => { p.apuesta = 0; if (!p.retirado && !p.allin) p.estado = ""; });
      th.apuestaActual = 0;
      pintarTH(false);
      await espera(700);
    }
    await rondaApuestas(f === 0 ? (bb + 1) % 3 : (th.dealer + 1) % 3);
    if (vivos().length === 1) break;
  }

  const yo = th.jugadores[0];
  const quedan = [0, 1, 2].filter(k => !th.jugadores[k].retirado);
  let ganadores, texto, puntajes = {};
  if (quedan.length === 1){
    ganadores = quedan;
    texto = ganadores[0] === 0 ? "Todos se retiraron. " : `${th.jugadores[ganadores[0]].nombre} se lleva el bote. `;
    pintarTH(false, -1, ganadores);
  } else {
    quedan.forEach(k => { puntajes[k] = mejorMano([...th.jugadores[k].cartas, ...th.board]); th.jugadores[k].estado = nombreMano(puntajes[k]); });
    const mejor = quedan.map(k => puntajes[k]).reduce((m, s) => cmpMano(s, m) > 0 ? s : m);
    ganadores = quedan.filter(k => cmpMano(puntajes[k], mejor) === 0);
    const nombres = ganadores.map(k => th.jugadores[k].nombre).join(" y ");
    texto = ganadores.length > 1 ? `Empate entre ${nombres} con ${nombreMano(mejor).toLowerCase()}. `
          : ganadores[0] === 0 ? `Ganas con ${nombreMano(mejor).toLowerCase()}. ` : `${nombres} gana con ${nombreMano(mejor).toLowerCase()}. `;
    pintarTH(true, -1, ganadores);
  }
  liquidar("#th-msg", thCobroHumano(th.jugadores, puntajes), yo.total, texto);
  ocupado = false; $("#th-nueva").disabled = false;
};
