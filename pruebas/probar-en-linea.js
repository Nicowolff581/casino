/* Prueba del modo en línea con 4 jugadores en 4 ventanas separadas.
   Antes hay que encender el servidor:  npx wrangler dev --port 8790
   Uso:  URL=http://localhost:8790 NODE_PATH=$(npm root -g) node pruebas/probar-en-linea.js */
const { chromium } = require("playwright");
const URL = process.env.URL || "http://localhost:8790";
const MANOS = +process.env.MANOS || 6;
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) fallos++; };
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch();
  const nombres = ["Ana", "Beto", "Caro", "Dani"], J = [];
  for (const n of nombres){
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    const j = { n, p, estados: [], errores: [] };
    p.on("pageerror", e => j.errores.push(e.message));
    p.on("console", m => { if (m.type() === "error") j.errores.push(m.text()); });
    p.on("websocket", ws => ws.on("framereceived", f => { try { const m = JSON.parse(f.payload); if (m.tipo === "estado") j.estados.push(m.sala); } catch (e) {} }));
    J.push(j);
  }
  console.log("\n1) Crear sala y entrar con el enlace");
  const [ana] = J;
  await ana.p.goto(URL + "/#amigos"); await ana.p.waitForSelector("#carga.fuera", { state: "attached" });
  await ana.p.fill("#am-apodo", "Ana"); await ana.p.selectOption("#am-tiempo", "15"); await ana.p.click("#am-crear");
  await ana.p.waitForSelector("#am-sala:not([hidden])"); await ana.p.waitForFunction(() => am.estado);
  const codigo = await ana.p.textContent("#am-cod");
  ok(/^[A-HJ-NP-Z2-9]{6}$/.test(codigo), `Ana creó la sala ${codigo}`);
  for (const j of J.slice(1)){
    await j.p.goto(`${URL}/#sala=${codigo}`); await j.p.waitForSelector("#carga.fuera", { state: "attached" });
    await j.p.fill("#am-apodo", j.n); await j.p.click("#am-entrar");
    await j.p.waitForFunction(() => am.estado && am.estado.tuAsiento !== null);
  }
  await pausa(500);
  const vista = await ana.p.evaluate(() => am.estado);
  ok(vista.jugadores.length === 4 && vista.soyAnfitrion, `Hay 4 jugadores en la mesa: ${vista.jugadores.map(x => x.avatar + " " + x.apodo).join(", ")}`);
  const intruso = (await fetch(URL + "/api/salas/ZZZZZ9")).status;
  ok(intruso === 404, `Un código que no existe no deja entrar (respuesta ${intruso})`);

  console.log("\n2) Jugar manos (jugadas al azar)");
  await ana.p.click("#am-empezar");
  let manosVistas = 0, recargado = false, reaccion = false, vencido = false, guardia = 0;
  while (manosVistas < MANOS && guardia++ < 2000){
    const e = await ana.p.evaluate(() => am.estado);
    if (e.mano && e.mano.num > manosVistas && e.mano.fase === "fin") manosVistas = e.mano.num;
    // a mitad de la mano 2, Beto recarga la página
    if (!recargado && e.mano?.num === 2 && e.mano.fase !== "fin"){
      const antes = await J[1].p.evaluate(() => ({ asiento: am.estado.tuAsiento, cartas: JSON.stringify(am.estado.jugadores.find(x => x.esYo).mano?.cartas) }));
      await J[1].p.reload(); await J[1].p.waitForFunction(() => am.estado && am.estado.tuAsiento !== null, null, { timeout: 15000 });
      const despues = await J[1].p.evaluate(() => ({ asiento: am.estado.tuAsiento, cartas: JSON.stringify(am.estado.jugadores.find(x => x.esYo).mano?.cartas), num: am.estado.mano?.num }));
      ok(despues.asiento === antes.asiento && (despues.num !== 2 || despues.cartas === antes.cartas), `Beto recargó la página y volvió a su asiento ${despues.asiento + 1} con sus mismas cartas`);
      recargado = true; continue;
    }
    if (!reaccion && e.mano?.num === 1){
      await J[2].p.click('#am-reacciones [data-e="😂"]');
      const vio = await ana.p.waitForSelector(".am-burbuja", { timeout: 3000 }).then(() => true).catch(() => false);
      ok(vio, "Caro mandó 😂 y Ana lo vio en la mesa"); reaccion = true;
    }
    // en la mano 3 a quien le toque no hace nada: se le debe acabar el tiempo
    if (!vencido && e.mano?.num === 3 && e.mano.fase !== "fin" && e.mano.turno !== null){
      const turno = e.mano.turno, quien = e.jugadores.find(x => x.asiento === turno).apodo;
      await pausa(16500);
      const reg = await ana.p.evaluate(() => am.estado.mano.registro.join(" | "));
      ok(reg.includes(`${quien} se quedó sin tiempo`), `A ${quien} se le acabó el tiempo (15 s) y el juego siguió solo`);
      vencido = true; continue;
    }
    let actuo = false;
    for (const j of J){
      const hay = await j.p.$("#am-acciones [data-a]:not([disabled])");
      if (!hay) continue;
      const r = Math.random(), btns = await j.p.$$eval("#am-acciones [data-a]", bs => bs.map(b => b.dataset.a));
      const a = r < 0.12 ? "retirarse" : r < 0.3 && btns.includes("subir") ? "subir" : btns.find(x => x === "pasar" || x === "igualar");
      if (a === "subir" && Math.random() < 0.3) await j.p.click('.am-rapidos button:nth-child(2)');
      await j.p.click(`#am-acciones [data-a="${a}"]`); actuo = true; break;
    }
    if (!actuo) await pausa(250);
  }
  ok(manosVistas >= MANOS, `Se jugaron ${manosVistas} manos completas`);

  console.log("\n3) Privacidad y fichas (revisando cada mensaje recibido)");
  let fugas = 0, sinCartas = 0, descuadres = 0, revisados = 0;
  for (const j of J) for (const s of j.estados){
    revisados++;
    const total = s.jugadores.reduce((a, x) => a + x.fichas + (s.mano && s.mano.fase !== "fin" && x.mano ? x.mano.total : 0), 0);
    if (total !== s.jugadores.length * s.config.fichas){ descuadres++; if (process.env.DEPURAR) console.log("    descuadre", total, s.mano?.num, s.mano?.fase, JSON.stringify(s.jugadores.map(x => [x.apodo, x.fichas, x.mano?.total, x.mano?.apuesta])), s.mano?.registro.slice(-3).join(" | ")); }
    if (!s.mano) continue;
    for (const x of s.jugadores){
      if (!x.mano) continue;
      if (x.esYo && !Array.isArray(x.mano.cartas)) sinCartas++;
      if (!x.esYo && Array.isArray(x.mano.cartas) && !(s.mano.fase === "fin" || s.mano.registro.some(t => t.includes("Todos con todo")))) fugas++;
    }
  }
  ok(fugas === 0, `${revisados} mensajes revisados: nadie recibió cartas de otro antes de mostrarlas (${fugas} fugas)`);
  ok(sinCartas === 0, "Cada jugador siempre recibió sus propias 2 cartas");
  ok(descuadres === 0, `Las fichas de la sala siempre suman 1.000 por jugador sentado (${descuadres} descuadres)`);
  const saldos = await Promise.all(J.map(j => j.p.evaluate(() => saldo)));
  ok(saldos.every(x => x === saldos[0]), `El saldo personal de cada uno no cambió al jugar en la sala (${saldos.join(", ")})`);

  console.log("\n4) Consola");
  const errores = J.flatMap(j => j.errores.map(e => j.n + ": " + e));
  ok(!errores.length, errores.length ? errores.join("\n    ") : "sin errores en las 4 ventanas");
  if (process.env.CAPTURAS) for (const j of J) await j.p.screenshot({ path: `${process.env.CAPTURAS}/linea-${j.n}.png` });
  await nav.close();
  console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : "\n✔ Modo en línea en orden");
  process.exit(fallos ? 1 : 0);
})();
