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
const url = process.env.URL || "file://" + path.resolve(__dirname, "..", "public", "index.html");
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
  await pagina.waitForSelector("#carga.fuera", { state: "attached", timeout: 8000 });
  await pagina.evaluate(() => { localStorage.clear(); setSaldo(1e9); setApuesta(10); });

  console.log("\n1) Matemáticas de cada juego");
  const m = await pagina.evaluate(() => {
    const r = {};
    // azar: promedio ~0,5 y todas las caras de un dado igual de frecuentes
    let s = 0; const dado = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 600000; i++){ const x = azar(); s += x; dado[azarEntero(6)]++; if (x < 0 || x >= 1) r.fueraRango = true; }
    r.promedio = s / 600000; r.dado = dado.map(d => d / 100000);
    // tragamonedas: cálculo exacto sobre todas las combinaciones
    // tragamonedas: reglas internas de 20.000 jugadas y devolución de 300.000 (la cifra exacta sale de pruebas/simular-tragamonedas.js)
    { const fallas = []; let s = 0, bonos = 0;
      for (let n = 0; n < 20000; n++){
        const j = slJugada();
        [j.base, ...(j.gratis || [])].forEach(g => {
          g.pasos.forEach((p, k) => {
            if (p.rejilla.length !== 30) fallas.push("tamaño");
            const cuenta = {}; p.rejilla.forEach(c => { if (c.s < SL_SIMBOLOS.length) cuenta[c.s] = (cuenta[c.s] || 0) + 1; });
            const esperado = Object.entries(cuenta).filter(([, c]) => c >= SL_MIN).map(([x]) => +x).sort().join();
            if (p.premios.map(x => x.s).sort().join() !== esperado) fallas.push("premios mal contados");
            if (k === g.pasos.length - 1 && p.premios.length) fallas.push("cascada sin terminar");
            p.premios.forEach(x => { if (x.n !== cuenta[x.s] || x.pago !== SL_SIMBOLOS[x.s].pagos[x.n >= 12 ? 2 : x.n >= 10 ? 1 : 0]) fallas.push("pago"); });
            if (p.premios.length){ const sig = g.pasos[k + 1].rejilla, gan = new Set(p.premios.map(x => x.s));
              for (let col = 0; col < 6; col++){ const q = p.rejilla.slice(col * 5, col * 5 + 5).filter(c => !gan.has(c.s)).map(c => c.s + ":" + c.v).join(); if (sig.slice(col * 5 + 5 - q.split(",").filter(Boolean).length, col * 5 + 5).map(c => c.s + ":" + c.v).join() !== q) fallas.push("cascada"); } }
          });
        });
        if (j.gratis && j.base.llaves < 4) fallas.push("bono sin llaves"); if (!j.gratis && j.base.llaves >= 4) fallas.push("llaves sin bono");
        if (j.total > SL_TOPE || j.total < 0) fallas.push("tope");
      }
      r.slFallas = [...new Set(fallas)];
      for (let n = 0; n < 300000; n++){ const j = slJugada(); s += j.total; if (j.gratis) bonos++; }
      r.slSim = s / 300000; r.slBonos = bonos / 300000;
      const sA = secretoAzar(), a = slJugada(azarDesde(sA)), b = slJugada(azarDesde(sA)); r.slDeterminista = a.total === b.total && JSON.stringify(a.base.pasos) === JSON.stringify(b.base.pasos);
      r.slEst = SL_ESTADISTICAS; }
    // plinko: distribución binomial exacta
    const comb = (n, k) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - k + i) / i; return x; };
    r.plinko = Object.fromEntries(Object.entries(PL_TABLAS).map(([k, t]) => [k, t.reduce((a, mm, i) => a + comb(PL_FILAS, i) / 2 ** PL_FILAS * mm, 0)]));
    // plinko: tablas iguales a las originales y simulación de 400.000 bolas con el sorteo real
    r.plTablasIguales = JSON.stringify(PL_TABLAS) === JSON.stringify({ bajo: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], alto: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170] });
    { const N = 400000, cuenta = new Array(PL_FILAS + 1).fill(0); for (let i = 0; i < N; i++) cuenta[plCasilla(plSortear())]++;
      let chi = 0; cuenta.forEach((o, k) => { const e = N * comb(PL_FILAS, k) / 2 ** PL_FILAS; chi += (o - e) ** 2 / e; });
      r.plChi = chi; r.plSim = Object.fromEntries(Object.entries(PL_TABLAS).map(([k, t]) => [k, cuenta.reduce((a, o, i) => a + o * t[i], 0) / N])); }
    // ruleta: los 37 números para cada tipo de apuesta
    r.ruleta = Object.fromEntries(["17", "0", "r", "n", "p", "i", "b", "a", "d1", "d2", "d3", "c1", "c2", "c3"].map(sel => { let t = 0; for (let n = 0; n <= 36; n++) t += ruPremio(sel, n, 1); return [sel, t / 37]; }));
    // ruleta con varias apuestas: 2.000 combinaciones al azar, revisando los 37 números de cada una
    const tipos = ["r", "n", "p", "i", "b", "a", "d1", "d2", "d3", "c1", "c2", "c3", ...Array.from({ length: 37 }, (_, i) => String(i))];
    let peor = 1, mejor = 0;
    for (let k = 0; k < 2000; k++){
      const fichas = Array.from({ length: 1 + azarEntero(8) }, () => ({ t: tipos[azarEntero(tipos.length)], monto: 1 + azarEntero(500) }));
      let pago = 0; for (let n = 0; n <= 36; n++) pago += ruPagoTotal(fichas, n);
      const d = pago / 37 / sumaFichas(fichas); peor = Math.min(peor, d); mejor = Math.max(mejor, d);
    }
    r.ruletaMulti = [peor, mejor];
    // fan-tan: cada cantidad posible de fichas (20..59)
    const restos = [0, 0, 0, 0, 0]; for (let n = 20; n < 60; n++) restos[ftResto(n)]++;
    r.ftRestos = restos.slice(1); r.ftRtp = [1, 2, 3, 4].map(sel => restos.slice(1).reduce((a, c, i) => a + c / 40 * ftPremio(sel, i + 1, 100), 0) / 100);
    let minS = 99, maxS = 0; for (let i = 0; i < 20000; i++){ const x = ftSortear(); minS = Math.min(minS, x); maxS = Math.max(maxS, x); }
    r.ftRango = [minS, maxS];
    // avión: cálculo exacto (debe coincidir con lo guardado) y simulación de 1 millón de vuelos
    r.avExacto = avExacto(); r.avGuardado = AV_EXACTO;
    { let pago = 0, pago2 = 0, cae = 0, caeUltimo = 0, bienCaido = true; const N = 1e6;
      for (let i = 0; i < N; i++){ const g = avGenerar(); if (g.exito){ pago += g.c; pago2 += g.c * g.c; } else { cae++; if (g.ev.length === g.n) caeUltimo++; if (g.ev[g.ev.length - 1].t !== "cohete" || g.ev[g.ev.length - 1].h !== 0) bienCaido = false; } }
      const media = pago / N; r.avion = { media, error: Math.sqrt(pago2 / N - media * media) / Math.sqrt(N), cae: cae / N, caeUltimo: caeUltimo / cae, bienCaido }; }
    // avión con secreto: siempre igual con el mismo secreto, y aterriza con la frecuencia prometida
    const sA = secretoAzar(), v1 = avSortear(sA), v2 = avSortear(sA);
    r.avDeterminista = v1.c === v2.c && v1.exito === v2.exito && JSON.stringify(v1.ev) === JSON.stringify(v2.ev);
    { let llega = 0; const N = 20000; for (let i = 0; i < N; i++) if (avSortear(secretoAzar()).exito) llega++; r.avSecreto = llega / N; }
    // dibujo: dónde cae el avión sale del cohete que lo dejó sin altura
    { let bien = true; for (let i = 0; i < 2000; i++){ const g = avPrepararVuelo(avGenerar()); if (!g.exito && g.xPA < g.ev[g.ev.length - 1].x + 1) bien = false; if (g.exito && Math.abs(avYDe(g, g.xToque) - Y_CUBIERTA) > 1e-9) bien = false; } r.avDibujo = bien; }
    r.sha = [sha256(""), sha256("abc")];
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
  ok(m.plTablasIguales, "Plinko: las tablas de pago son idénticas a las originales");
  ok(m.plChi < 36, `Plinko: 400.000 bolas siguen la distribución exacta (prueba chi² = ${m.plChi.toFixed(1)}, debe ser menor que 36)`);
  for (const [k, v] of Object.entries(m.plSim)) ok(Math.abs(v - m.plinko[k]) < (k === "alto" ? 0.025 : 0.01), `Plinko ${k}: simulado ${(v * 100).toFixed(2)} % vs exacto ${(m.plinko[k] * 100).toFixed(2)} %`);
  ok(!m.slFallas.length, `Tragamonedas: 20.000 jugadas cumplen las reglas (8+ iguales, pagos de la tabla, cascadas y giros gratis)${m.slFallas.length ? " · " + m.slFallas.join(", ") : ""}`);
  ok(m.slDeterminista, "Tragamonedas: con el mismo azar sale exactamente la misma jugada (la animación no cambia nada)");
  ok(Math.abs(m.slSim - m.slEst.devuelve) < 0.05, `Tragamonedas: 300.000 jugadas devolvieron ${(m.slSim * 100).toFixed(1)} % (cifra de las reglas: ${(m.slEst.devuelve * 100).toFixed(2)} % con ${m.slEst.jugadas / 1e6} millones); giros gratis 1 de cada ${Math.round(1 / m.slBonos)}`);
  for (const [k, v] of Object.entries(m.plinko)) ok(v > 0.98 && v < 1, `Plinko ${k} devuelve ${(v * 100).toFixed(2)} %`);
  for (const [k, v] of Object.entries(m.ruleta)) ok(Math.abs(v - 36 / 37) < 1e-9, `Ruleta «${k}» devuelve ${(v * 100).toFixed(2)} %`);
  ok(Math.abs(m.ruletaMulti[0] - 36 / 37) < 1e-9 && Math.abs(m.ruletaMulti[1] - 36 / 37) < 1e-9, `Ruleta con varias apuestas: 2.000 combinaciones devuelven exactamente ${(m.ruletaMulti[0] * 100).toFixed(2)} %`);
    ok(m.ftRestos.every(c => c === 10), `Fan-Tan: cada resto sale 10 de 40 veces (${m.ftRestos.join(", ")})`);
  ok(m.ftRango[0] === 20 && m.ftRango[1] === 59, `Fan-Tan sortea entre ${m.ftRango[0]} y ${m.ftRango[1]} fichas`);
  ok(m.ftRtp.every(v => Math.abs(v - 0.9625) < 1e-9), `Fan-Tan devuelve ${m.ftRtp.map(v => (v * 100).toFixed(2) + " %").join(" / ")}`);
  ok(Object.keys(m.avGuardado).every(k => Math.abs(m.avGuardado[k] - m.avExacto[k]) <= Math.max(1e-6, m.avExacto[k] * 1e-5)) && Math.abs(m.avExacto.devuelve - 0.97) < 5e-4,
    `Avión devuelve ${(m.avExacto.devuelve * 100).toFixed(2)} % (cálculo exacto, igual en las 4 velocidades) · aterriza ${(m.avExacto.aterriza * 100).toFixed(1)} %`);
  ok(Math.abs(m.avExacto.aterriza + m.avExacto.cae - 1) < 1e-9, "Avión: aterrizan + caen al mar = 100 %");
  ok(Math.abs(m.avion.media - m.avExacto.devuelve) < Math.max(3 * m.avion.error, 0.002), `Avión: 1.000.000 vuelos simulados devuelven ${(m.avion.media * 100).toFixed(2)} % (± ${(m.avion.error * 200).toFixed(2)} %)`);
  ok(m.avion.bienCaido && m.avion.caeUltimo < 0.35, `Avión: siempre cae justo en el cohete que lo deja sin altura; solo ${(m.avion.caeUltimo * 100).toFixed(1)} % de las caídas son en el último objeto antes del portaaviones`);
  ok(m.avDeterminista, "Avión: el mismo número secreto produce siempre el mismo vuelo");
  ok(Math.abs(m.avSecreto - m.avExacto.aterriza) < 4 * Math.sqrt(0.3 * 0.7 / 20000), `Avión con secreto: aterriza ${(m.avSecreto * 100).toFixed(1)} % (prometido ${(m.avExacto.aterriza * 100).toFixed(1)} %) en 20.000 vuelos`);
  ok(m.avDibujo, "Avión: el dibujo lleva el avión justo a la cubierta del portaaviones cuando aterriza");
  ok(m.sha[0] === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" && m.sha[1] === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 da las huellas oficiales de prueba");
  m.pollo.forEach(([a, b], i) => ok(a > 0.95 && b <= 0.97 + 1e-9, `Pollo dificultad ${i}: devuelve entre ${(a * 100).toFixed(2)} % y ${(b * 100).toFixed(2)} %`));
  const bjEsperado = { naturalGana: 25, naturalContraNatural: 10, crupierNatural: 0, gana: 20, empate: 10, pasado: 0, crupierPasado: 20, asBlando: 21 };
  for (const [k, v] of Object.entries(bjEsperado)) ok(m.bj[k] === v, `Blackjack ${k}: ${m.bj[k]} (esperado ${v})`);
  const thEsperado = { lateral: 300, normal: 900, empate: 225, pierde: 0, solo: 120 };
  for (const [k, v] of Object.entries(thEsperado)) ok(m.th[k] === v, `Hold'em ${k}: ${m.th[k]} (esperado ${v})`);
  ok(m.escalera[0][0] === 4 && m.escalera[0][1] === 5, "Hold'em: A-2-3-4-5 es escalera");
  ok(m.tipos.join() === "win,neutral,parcial,lose", `Solo se celebra si recibes más de lo apostado: ${m.tipos.join(", ")}`);

  console.log("\n2) Pantalla de inicio, reglas y celebraciones");
  const tarjetas = await pagina.$$eval("#tarjetas .tarjeta", ts => ts.map(t => [t.dataset.ir, t.querySelector(".rtp").textContent]));
  ok(tarjetas.length === 8 && tarjetas.every(([, r]) => r && !/NaN|undefined/.test(r)), `8 tarjetas en el inicio: ${tarjetas.map(t => t.join(" ")).join(" · ")}`);
  for (const [id] of tarjetas){
    await pagina.click(`nav button[data-juego="inicio"]`);
    await pagina.click(`#tarjetas [data-ir="${id}"]`);
    const visible = await pagina.isVisible(`#g-${id}`);
    await pagina.click(`#g-${id} .btn-reglas`);
    const r = await pagina.$eval("#reglas-cuerpo", el => ({ filas: el.querySelectorAll("tr").length, texto: el.textContent }));
    await pagina.click("#reglas-cerrar");
    ok(visible && r.filas > 2 && !/NaN|undefined|Infinity/.test(r.texto), `Tarjeta y reglas de ${id}: abre el juego, ${r.filas} filas de tabla, sin errores de texto`);
  }
  const fiestas = await pagina.evaluate(async () => {
    const vistos = []; const orig = granPremio; window.granPremio = (...a) => { vistos.push("gran"); return orig(...a); };
    const casos = [[50, 100], [100, 100], [0, 100], [150, 100], [400, 100], [2000, 100]];
    const res = [];
    for (const [p, a] of casos){ const antes = document.querySelectorAll("#fiesta > *").length; celebrar(p, a); await new Promise(r => setTimeout(r, 800)); res.push(document.querySelectorAll("#fiesta > *").length - antes + (document.querySelector("#gran-premio").hidden ? 0 : 1000)); }
    cerrarGranPremio(); return res;
  });
  ok(fiestas[0] === 0 && fiestas[1] === 0 && fiestas[2] === 0, "Sin celebración al recibir menos, lo mismo o nada");
  ok(fiestas[3] === 0 && fiestas[4] > 0 && fiestas[4] < 1000 && fiestas[5] >= 1000, "Celebración proporcional: discreta (×1,5), confeti (×4), gran premio (×20)");
  await pagina.waitForTimeout(300);

  console.log(`\n3) Jugando ${RONDAS} rondas de cada juego`);
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
  await pagina.click('nav button[data-juego="slots"]'); await pagina.check("#sl-rapido", { force: true });
  await jugar("slots", "#s-msg", async () => { await pagina.click("#s-girar"); await esperarLibre(() => !ocupado, 180000); });
  {
    // una jugada con giros gratis forzada (solo en la prueba), para revisar que se muestre completa y pague lo calculado
    const r = await pagina.evaluate(async () => {
      let sj; do { sj = secretoAzar(); } while (!slJugada(azarDesde(sj)).gratis);
      const esperado = slJugada(azarDesde(sj)), original = slJugada;
      window.slJugada = () => original(azarDesde(sj));
      const antes = saldo, bet = apuesta; $("#s-girar").click();
      await new Promise(res => { const t = setInterval(() => { if (!ocupado){ clearInterval(t); res(); } }, 100); });
      window.slJugada = original;
      return { cambio: saldo - antes, esperado: Math.floor(esperado.total * bet + 1e-9) - bet, giros: esperado.gratis.length, texto: $("#s-msg").textContent, marcador: $("#sl-ganancia").textContent };
    });
    ok(r.cambio === r.esperado, `Tragamonedas con ${r.giros} giros gratis: el saldo cambió ${r.cambio} (esperado ${r.esperado}) · «${r.texto}»`);
  }
  await jugar("bj", "#bj-msg", async () => {
    await pagina.click("#bj-repartir");
    if (await pagina.isEnabled("#bj-plantarse")) await pagina.click("#bj-plantarse");
    await esperarLibre(() => !ocupado);
  });
  await jugar("ruleta", "#ru-msg", async () => { await pagina.click('.pano [data-t="r"]'); await pagina.click("#ru-girar"); await esperarLibre(() => !ocupado); });
  // Ruleta: varias fichas con montos distintos, deshacer, borrar y repetir
  {
    const ficha = async (t, monto) => { await pagina.fill("#monto", String(monto)); await pagina.dispatchEvent("#monto", "change"); await pagina.click(`.pano [data-t="${t}"]`); };
    await pagina.click('.pano [data-t="17"]');                         // limpia el resultado anterior
    await pagina.click("#ru-borrar");
    await ficha("33", 10); await ficha("16", 25); await ficha("r", 40); await ficha("r", 5); await ficha("7", 99);
    const conDocena = await pagina.evaluate(() => [$$('.pano [data-t^="d"]').length, $$('.pano [data-t^="c"]').length]);
    ok(conDocena[0] === 3 && conDocena[1] === 3, "Ruleta: el paño tiene las 3 docenas y las 3 columnas «2 a 1»");
    await pagina.click("#ru-deshacer");                                 // quita el 99 al 7
    const antes = await pagina.evaluate(() => ({ saldo, fichas: ru.fichas.map(f => ({ ...f })), texto: $("#ru-sel").textContent, chips: $$(".ficha-ru").map(c => c.textContent) }));
    ok(antes.fichas.length === 4 && antes.texto.includes("80") && antes.chips.sort().join() === "10,25,45", `Paño con 33 (10), 16 (25) y rojo (40+5): «${antes.texto}», fichas visibles ${antes.chips.join(" ")}`);
    await pagina.click("#ru-girar"); await esperarLibre(() => !ocupado);
    // la bola quedó sobre el número que salió: se busca la casilla más cercana a la bola en la rueda girada
    const bolaOk = await pagina.evaluate(() => {
      const bb = $("#ru-bola").getBoundingClientRect(), rb = $("#rueda").getBoundingClientRect();
      const bx = bb.x + bb.width / 2 - (rb.x + rb.width / 2), by = bb.y + bb.height / 2 - (rb.y + rb.height / 2);
      const ang = (Math.atan2(bx, -by) * 180 / Math.PI - giroRueda + 720) % 360, seg = 360 / 37;
      return { casilla: ORDEN[Math.round(ang / seg) % 37], salio: ruUlt[0], cartel: $("#ru-resultado").textContent };
    });
    ok(bolaOk.casilla === bolaOk.salio && bolaOk.cartel === String(bolaOk.salio), `Ruleta: la bola se detuvo en el ${bolaOk.casilla} y el resultado anunciado es ${bolaOk.salio}`);
    const despues = await pagina.evaluate(() => ({ saldo, n: ruUlt[0], msg: $("#ru-msg").textContent, clase: $("#ru-msg").className }));
    const pago = await pagina.evaluate(([f, n]) => ruPagoTotal(f, n), [antes.fichas, despues.n]);
    ok(despues.saldo - antes.saldo === pago - 80, `Salió el ${despues.n}: pagó ${pago} por 80 apostadas; saldo ${despues.saldo - antes.saldo >= 0 ? "+" : ""}${despues.saldo - antes.saldo} · «${despues.msg}»`);
    ok(pago > 80 ? despues.clase.includes("win") : pago === 80 ? despues.clase.includes("neutral") : !despues.clase.includes("win"), "El mensaje solo celebra si el total pagado supera lo apostado");
    await pagina.click("#ru-repetir");
    const rep = await pagina.evaluate(() => sumaFichas(ru.fichas));
    await pagina.click("#ru-borrar");
    const borrado = await pagina.evaluate(() => ru.fichas.length);
    ok(rep === 80 && borrado === 0, "«Repetir apuesta» vuelve a poner las 80 fichas y «Borrar todo» las quita");
    await pagina.fill("#monto", "10"); await pagina.dispatchEvent("#monto", "change");
  }
  await jugar("fantan", "#ft-msg", async () => { await pagina.click('.ft-lado[data-n="2"]'); await pagina.click("#ft-jugar"); await esperarLibre(() => !ocupado); });
  {
    const f = await pagina.evaluate(() => {
      const filas = $$("#ft-filas .ft-fila:not(.sobra)"), sobra = $("#ft-filas .ft-fila.sobra");
      const m = $("#ft-msg").textContent.match(/Sobraron (\d)/), hay = $("#ft-msg").textContent;
      return { filas: filas.length, completas: filas.every(r => r.querySelectorAll(".frijol-f").length === 4), sobran: sobra ? sobra.querySelectorAll(".frijol-f").length : -1,
        dicho: m ? +m[1] : -2, grande: +$("#ft-grande").textContent, enMesa: $$("#ft-monton .frijol.queda").length, cuenta: $("#ft-cuenta").textContent };
    });
    const total = f.filas * 4 + f.sobran;
    ok(f.completas && f.sobran >= 1 && f.sobran <= 4 && f.sobran === f.dicho && f.sobran === f.grande && f.sobran === f.enMesa && total >= 20 && total <= 59,
      `Fan-Tan: ${f.filas} filas de 4 + ${f.sobran} que sobran = ${total} fichas; mesa, panel y mensaje coinciden («${f.cuenta}»)`);
  }
  await jugar("plinko", "#pl-msg", async () => { await pagina.click("#pl-soltar"); await esperarLibre(() => !ocupado); });
  await jugar("avion", "#av-msg", async () => {
    await pagina.click('#av-vel [data-k="3"]'); await pagina.click("#av-btn");
    await pagina.waitForTimeout(600); await pagina.click('#av-vel [data-k="1"]');          // se puede cambiar la velocidad en pleno vuelo
    await pagina.waitForTimeout(300); await pagina.click('#av-vel [data-k="3"]');
    await esperarLibre(() => !ocupado);
  });
  {
    await pagina.click('nav button[data-juego="avion"]');
    const huella = await pagina.textContent("#av-huella");
    await pagina.click("#av-btn"); await esperarLibre(() => !ocupado);
    const j = await pagina.evaluate(() => ({ r: av.hist[0], hist: av.hist.length, codigos: $$("#av-revelado code").map(c => c.textContent), nueva: $("#av-huella").textContent }));
    await pagina.click("#av-comprobar");
    const comprobado = await pagina.textContent("#av-comprobado");
    const shaReal = require("crypto").createHash("sha256").update(j.codigos[1]).digest("hex");
    ok(j.r.huella === huella && j.codigos[0] === huella && shaReal === huella && comprobado.includes("✔") && j.nueva !== huella,
      `Avión: huella mostrada antes = SHA-256 del secreto revelado (verificado con Node), «Comprobar» dice ✔ y hay huella nueva para el siguiente vuelo`);
    const n = await pagina.evaluate(async () => { for (let i = 0; i < 22; i++){ av.actual = { num: 900 + i, secreto: "x", huella: "y", bet: 1 }; av.vuelo = { exito: false, c: 1, ev: [] }; av.bet = 1; saldo += 0; avResolver(); } return [av.hist.length, $$("#av-hist button").length]; });
    ok(n[0] === 20 && n[1] === 20, `Avión: el historial guarda los últimos 20 vuelos (${n[1]} botones)`);
    await pagina.evaluate(() => { av.hist = av.hist.filter(h => h.num < 900); avPintarHistorial(); });
  }
  {
    const r = await pagina.evaluate(() => {
      const lz = document.createElement("canvas"); lz.width = 600; lz.height = 400; const c = lz.getContext("2d"); const errores = [];
      MUERTES.forEach(m => { for (let e = 0; e <= 2.2; e += 0.05){ try { m.dibujar(c, 300, 250, 70, e); } catch (x){ errores.push(m.id + ": " + x.message); } } });
      return { n: new Set(MUERTES.map(m => m.id)).size, ids: MUERTES.map(m => m.id).join(", "), errores, sonidos: MUERTES.every(m => typeof m.sonar === "function") };
    });
    ok(r.n >= 8 && !r.errores.length && r.sonidos, `Pollo: ${r.n} muertes distintas con animación y sonido (${r.ids})${r.errores.length ? " · errores: " + r.errores.join("; ") : ""}`);
  }
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

  console.log("\n4) Consola del navegador");
  ok(errores.length === 0, errores.length ? "errores:\n    " + errores.join("\n    ") : "sin errores");

  if (process.env.CAPTURAS){
    for (const j of ["slots", "bj", "poker", "ruleta"]){ await pagina.click(`nav button[data-juego="${j}"]`); await pagina.screenshot({ path: `${process.env.CAPTURAS}/${j}.png` }); }
  }
  await navegador.close();
  console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : "\n✔ Todo en orden");
  process.exit(fallos ? 1 : 0);
})();
