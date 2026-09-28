/* Prueba automática de Casino Nico.
   Uso (necesita Node y Playwright, solo para quien desarrolla; el casino no los necesita):
     NODE_PATH=$(npm root -g) node pruebas/probar.js
   1) Revisa las probabilidades y pagos de cada juego con cálculos exactos o simulaciones.
   2) Juega rondas reales de los 8 juegos haciendo clic, y comprueba que el mensaje
      (ganaste / empate / perdiste) coincide con el cambio real del saldo.
   3) Falla si aparece cualquier error en la consola. */
const { chromium } = require("playwright");
const path = require("path");

const RONDAS = +process.env.RONDAS || 4;
const url = process.env.URL || "file://" + path.resolve(__dirname, "..", "publico", "index.html");
let fallos = 0;
const ok = (cond, texto) => { console.log((cond ? "  ✔ " : "  ✘ ") + texto); if (!cond) fallos++; };

(async () => {
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  // Google Fonts no está disponible en todos los entornos de prueba: se simula vacía.
  await pagina.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  pagina.on("console", m => { if (m.type() === "error") errores.push(m.text()); });
  pagina.on("pageerror", e => errores.push(e.message));
  await pagina.goto(url);
  await pagina.evaluate(() => { localStorage.clear(); setSaldo(1e9); setApuesta(10); });

  console.log("\n1) Matemáticas de cada juego");
  const m = await pagina.evaluate(() => {
    const r = {};
    // azar: promedio ~0,5 y todas las caras de un dado igual de frecuentes
    let s = 0; const dado = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 600000; i++){ const x = azar(); s += x; dado[azarEntero(6)]++; if (x < 0 || x >= 1) r.fueraRango = true; }
    r.promedio = s / 600000; r.dado = dado.map(d => d / 100000);
    // tragamonedas: cálculo exacto sobre todas las combinaciones
    const tot = PESOS.reduce((a, b) => a + b); let rtp = 0;
    SIMB.forEach((a, i) => SIMB.forEach((b, j) => SIMB.forEach((c, k) => { rtp += PESOS[i] * PESOS[j] * PESOS[k] / tot ** 3 * slotsPremio([a, b, c], 1); })));
    r.slots = rtp;
    // plinko: distribución binomial exacta
    const comb = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - k + i) / i; return x; };
    r.plinko = Object.fromEntries(Object.entries(PL_TABLAS).map(([k, t]) => [k, t.reduce((a, mm, i) => a + comb(PL_FILAS, i) / 2 ** PL_FILAS * mm, 0)]));
    // ruleta: los 37 números para cada tipo de apuesta
    r.ruleta = Object.fromEntries(["17", "0", "r", "n", "p", "i", "b", "a"].map(sel => { let t = 0; for (let n = 0; n <= 36; n++) t += ruPremio(sel, n, 1); return [sel, t / 37]; }));
    // fan-tan: cada cantidad posible de fichas (20..59)
    const restos = [0, 0, 0, 0, 0]; for (let n = 20; n < 60; n++) restos[ftResto(n)]++;
    r.ftRestos = restos.slice(1); r.ftRtp = [1, 2, 3, 4].map(sel => restos.slice(1).reduce((a, c, i) => a + c / 40 * ftPremio(sel, i + 1, 100), 0) / 100);
    let minS = 99, maxS = 0; for (let i = 0; i < 20000; i++){ const x = ftSortear(); minS = Math.min(minS, x); maxS = Math.max(maxS, x); }
    r.ftRango = [minS, maxS];
    // avión: cálculo exacto (debe coincidir con lo guardado) y simulación de 400.000 vuelos
    r.avionExacto = [0, 1, 2, 3].map(k => [avMultEsperado(k), AV_MULT_MEDIO[k], avMultEsperado(k) * AV_PROB[k]]);
    r.avion = [0, 1, 2, 3].map(k => { let pago = 0; const N = 400000; for (let i = 0; i < N; i++){ const g = avGenerar(k); if (azar() < AV_PROB[k]) pago += g.c; } return pago / N; });
    // pollo: pago esperado al cobrar en cada carril y dificultad
    r.pollo = [0.1, 0.2, 0.3, 0.45].map(p => { po.p = p; let peor = 1, mejor = 0; for (let i = 1; i <= PO_N; i++){ const e = poMult(i) * (1 - p) ** i; peor = Math.min(peor, e); mejor = Math.max(mejor, e); } return [peor, mejor]; });
    po.p = 0.2;
    // blackjack: casos conocidos
    const C = t => t.split(" ").map(x => ({ v: x.slice(0, -1), p: x.slice(-1) }));
    r.bj = {
      naturalGana: bjPago(C("A♠ K♥"), C("9♣ 9♦"), 10),        // 3 a 2 → 25
      naturalContraNatural: bjPago(C("A♠ K♥"), C("A♣ Q♦"), 10), // empate → 10
      crupierNatural: bjPago(C("7♠ 7♥ 7♦"), C("A♣ Q♦"), 10),   // 21 de 3 cartas pierde contra blackjack → 0
      gana: bjPago(C("10♠ 9♥"), C("10♣ 8♦"), 10),               // 20
      empate: bjPago(C("10♠ 8♥"), C("10♣ 8♦"), 10),             // 10
      pasado: bjPago(C("10♠ 8♥ 5♦"), C("10♣ 6♦ 9♣"), 10),       // te pasas primero → 0
      crupierPasado: bjPago(C("10♠ 2♥"), C("10♣ 6♦ 9♣"), 10),   // 20
      asBlando: valorBJ(C("A♠ A♥ 9♦")),                          // 21
    };
    // hold'em: bote lateral. Tú pones 100 (todo), Valentina y Mateo 300 cada uno, tú tienes la mejor mano.
    const J = (total, retirado = false) => ({ total, retirado });
    const P = { 0: [8, 14], 1: [1, 5], 2: [0, 13] };
    r.th = {
      lateral: thCobroHumano([J(100), J(300), J(300)], P),              // solo 300 (100 de cada uno), no 700
      normal: thCobroHumano([J(300), J(300), J(300)], P),               // 900
      empate: thCobroHumano([J(200), J(200), J(50, true)], { 0: [1, 9], 1: [1, 9] }), // (200+200+50)/2 = 225
      pierde: thCobroHumano([J(200), J(200), J(200)], { 0: [0, 9], 1: [1, 9], 2: [0, 8] }),
      solo: thCobroHumano([J(60), J(40, true), J(20, true)], {}),        // todos se retiraron → 120
    };
    r.escalera = [eval5([{ v: "A", p: "♠" }, { v: "2", p: "♥" }, { v: "3", p: "♦" }, { v: "4", p: "♣" }, { v: "5", p: "♠" }])];
    r.tipos = [tipoResultado(20, 10), tipoResultado(10, 10), tipoResultado(5, 10), tipoResultado(0, 10)];
    return r;
  });
  ok(!m.fueraRango && Math.abs(m.promedio - 0.5) < 0.005, `azar entre 0 y 1, promedio ${m.promedio.toFixed(4)}`);
  ok(m.dado.every(d => Math.abs(d - 1) < 0.02), `dado justo: ${m.dado.map(d => d.toFixed(3)).join(" ")}`);
  ok(Math.abs(m.slots - 0.79066) < 1e-6, `Tragamonedas devuelve ${(m.slots * 100).toFixed(2)} %`);
  for (const [k, v] of Object.entries(m.plinko)) ok(v > 0.98 && v < 1, `Plinko ${k} devuelve ${(v * 100).toFixed(2)} %`);
  for (const [k, v] of Object.entries(m.ruleta)) ok(Math.abs(v - 36 / 37) < 1e-9, `Ruleta «${k}» devuelve ${(v * 100).toFixed(2)} %`);
  ok(m.ftRestos.every(c => c === 10), `Fan-Tan: cada resto sale 10 de 40 veces (${m.ftRestos.join(", ")})`);
  ok(m.ftRango[0] === 20 && m.ftRango[1] === 59, `Fan-Tan sortea entre ${m.ftRango[0]} y ${m.ftRango[1]} fichas`);
  ok(m.ftRtp.every(v => Math.abs(v - 0.9625) < 1e-9), `Fan-Tan devuelve ${m.ftRtp.map(v => (v * 100).toFixed(2) + " %").join(" / ")}`);
  m.avionExacto.forEach(([calc, guardado, rtp], k) => ok(Math.abs(calc - guardado) < 1e-5 && Math.abs(rtp - 0.97) < 1e-4, `Avión velocidad ${k} devuelve ${(rtp * 100).toFixed(2)} % (exacto)`));
  // El Turbo tiene premios raros muy grandes, así que la simulación varía más: margen amplio.
  m.avion.forEach((v, k) => ok(Math.abs(v - 0.97) < (k === 3 ? 0.04 : 0.02), `Avión velocidad ${k} devuelve ${(v * 100).toFixed(2)} % (simulado)`));
  m.pollo.forEach(([a, b], i) => ok(a > 0.95 && b <= 0.97 + 1e-9, `Pollo dificultad ${i}: devuelve entre ${(a * 100).toFixed(2)} % y ${(b * 100).toFixed(2)} %`));
  const bjEsperado = { naturalGana: 25, naturalContraNatural: 10, crupierNatural: 0, gana: 20, empate: 10, pasado: 0, crupierPasado: 20, asBlando: 21 };
  for (const [k, v] of Object.entries(bjEsperado)) ok(m.bj[k] === v, `Blackjack ${k}: ${m.bj[k]} (esperado ${v})`);
  const thEsperado = { lateral: 300, normal: 900, empate: 225, pierde: 0, solo: 120 };
  for (const [k, v] of Object.entries(thEsperado)) ok(m.th[k] === v, `Hold'em ${k}: ${m.th[k]} (esperado ${v})`);
  ok(m.escalera[0][0] === 4 && m.escalera[0][1] === 5, "Hold'em: A-2-3-4-5 es escalera");
  ok(m.tipos.join() === "win,neutral,parcial,lose", `Solo se celebra si recibes más de lo apostado: ${m.tipos.join(", ")}`);

  console.log(`\n2) Jugando ${RONDAS} rondas de cada juego`);
  const estado = () => pagina.evaluate(() => saldo);
  const esperarLibre = (cond, max = 30000) => pagina.waitForFunction(cond, null, { timeout: max, polling: 100 });
  async function jugar(juego, idMsg, accion){
    await pagina.click(`nav button[data-juego="${juego}"]`);
    let bien = 0;
    for (let r = 0; r < RONDAS; r++){
      const antes = await estado();
      await accion();
      const despues = await estado(), clase = await pagina.getAttribute(idMsg, "class"), texto = await pagina.textContent(idMsg);
      const d = despues - antes;
      const coherente = d > 0 ? clase.includes("win") : d === 0 ? clase.includes("neutral") : (clase.includes("lose") || clase.includes("parcial"));
      if (coherente) bien++; else console.log(`    ronda ${r + 1}: saldo ${d >= 0 ? "+" : ""}${d}, mensaje [${clase}] «${texto}»`);
    }
    ok(bien === RONDAS, `${juego}: ${bien}/${RONDAS} rondas con mensaje coherente con el saldo`);
  }
  await jugar("slots", "#s-msg", async () => { await pagina.click("#s-girar"); await esperarLibre(() => !ocupado); });
  await jugar("bj", "#bj-msg", async () => {
    await pagina.click("#bj-repartir");
    if (await pagina.isEnabled("#bj-plantarse")) await pagina.click("#bj-plantarse");
    await esperarLibre(() => !ocupado);
  });
  await jugar("ruleta", "#ru-msg", async () => { await pagina.click('.pano [data-t="r"]'); await pagina.click("#ru-girar"); await esperarLibre(() => !ocupado); });
  await jugar("fantan", "#ft-msg", async () => { await pagina.click('.ft-lado[data-n="2"]'); await pagina.click("#ft-jugar"); await esperarLibre(() => !ocupado); });
  await jugar("plinko", "#pl-msg", async () => { await pagina.click("#pl-soltar"); await esperarLibre(() => !ocupado); });
  await jugar("avion", "#av-msg", async () => { await pagina.click('#av-vel [data-k="3"]'); await pagina.click("#av-btn"); await esperarLibre(() => !ocupado); });
  await jugar("pollo", "#po-msg", async () => {
    await pagina.click("#po-jugar");
    for (let i = 0; i < 2; i++){ if (await pagina.isEnabled("#po-avanzar")){ await pagina.click("#po-avanzar"); await pagina.waitForTimeout(800); } }
    if (await pagina.isEnabled("#po-cobrar")) await pagina.click("#po-cobrar");
    await esperarLibre(() => !ocupado);
  });
  await jugar("poker", "#th-msg", async () => {
    await pagina.click("#th-nueva");
    while (await pagina.evaluate(() => ocupado)){
      if (await pagina.isEnabled("#th-call")) await pagina.click("#th-call");
      await pagina.waitForTimeout(150);
    }
  });

  console.log("\n3) Consola del navegador");
  ok(errores.length === 0, errores.length ? "errores:\n    " + errores.join("\n    ") : "sin errores");

  if (process.env.CAPTURAS){
    for (const j of ["slots", "bj", "poker", "ruleta"]){ await pagina.click(`nav button[data-juego="${j}"]`); await pagina.screenshot({ path: `${process.env.CAPTURAS}/${j}.png` }); }
  }
  await navegador.close();
  console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : "\n✔ Todo en orden");
  process.exit(fallos ? 1 : 0);
})();
