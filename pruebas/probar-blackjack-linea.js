/* Blackjack en línea con 3 jugadores en 3 ventanas. Antes: npx wrangler dev --port 8793
   Uso: URL=http://localhost:8793 NODE_PATH=$(npm root -g) node pruebas/probar-blackjack-linea.js */
const { chromium } = require("playwright");
const URL = process.env.URL || "http://localhost:8793";
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) fallos++; };
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch(), J = [];
  for (const n of ["Ana", "Beto", "Caro"]){
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 1000 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    const p = await ctx.newPage(), j = { n, p, errores: [] };
    p.on("pageerror", e => j.errores.push(e.message)); p.on("console", m => { if (m.type() === "error") j.errores.push(m.text()); });
    J.push(j);
  }
  const [ana, beto, caro] = J;
  console.log("\n1) Crear sala de blackjack y entrar");
  await ana.p.goto(URL + "/#amigos"); await ana.p.waitForSelector("#carga.fuera", { state: "attached" });
  await ana.p.fill("#am-apodo", "Ana"); await ana.p.click('.am-juego [data-juego="blackjack"]'); await ana.p.selectOption("#am-tiempo", "15");
  ok(await ana.p.isHidden("#am-campo-ciega"), "Al elegir Blackjack se oculta la ciega del póker");
  await ana.p.click("#am-crear"); await ana.p.waitForFunction(() => am.estado?.juego === "blackjack");
  const cod = await ana.p.textContent("#am-cod");
  for (const j of [beto, caro]){ await j.p.goto(`${URL}/#sala=${cod}`); await j.p.fill("#am-apodo", j.n); await j.p.click("#am-entrar"); await j.p.waitForFunction(() => am.estado?.tuAsiento !== null && am.estado?.juego === "blackjack"); }
  ok(await ana.p.isVisible("#amb") && await ana.p.isHidden("#am-mesa") && await ana.p.isHidden("#amr"), `Sala ${cod} con la mesa de blackjack (sin póker ni ruleta)`);
  await ana.p.waitForFunction(() => $$("#amb-asientos .amb-asiento").length === 3);
  ok(true, "Ana ve los 3 asientos");

  const misFichas = j => j.p.evaluate(() => am.estado.jugadores.find(x => x.esYo).fichas);
  // juega por la interfaz: pide con menos de 17 y se planta con 17 o más
  async function jugarTurnos(dejarVencer){
    for (let vueltas = 0; vueltas < 60; vueltas++){
      const fase = await ana.p.evaluate(() => am.estado.bj.fase);
      if (fase !== "juego") return;
      for (const j of J){
        const mio = await j.p.evaluate(() => am.estado.bj.turno === am.estado.tuAsiento && !$("#amb-jugar").hidden && !$('#amb-jugar [data-a="pedir"]').disabled);
        if (!mio) continue;
        if (dejarVencer === j){ await j.p.waitForFunction(() => am.estado.bj.turno !== am.estado.tuAsiento, null, { timeout: 25000 }); continue; }
        const v = await j.p.evaluate(() => am.estado.bj.manos.find(m => m.asiento === am.estado.tuAsiento).valor);
        await j.p.click(`#amb-jugar [data-a="${v < 17 ? "pedir" : "plantarse"}"]`);
        await pausa(400);
      }
      await pausa(300);
    }
  }
  async function revisarRonda(apuestas, antes){
    const ronda = await ana.p.evaluate(() => am.estado.bj.ronda);
    await ana.p.waitForFunction(() => am.estado.bj.fase === "resultado", null, { timeout: 30000 });
    const temprano = await Promise.all(J.map(j => j.p.evaluate(() => ({ est: $("#amb-estado").textContent, tags: $$("#amb-asientos .amb-tag:not(.listo)").length }))));
    ok(temprano.every(x => x.est.includes("Juega el crupier") && x.tags === 0), "Mientras juega el crupier nadie ve todavía quién ganó");
    await Promise.all(J.map(j => j.p.waitForFunction(r => amb.mostrada === r, ronda, { timeout: 30000 })));
    const fin = await Promise.all(J.map(j => j.p.evaluate(() => { const r = am.estado.bj, m = r.manos.find(x => x.asiento === am.estado.tuAsiento);
      return { fichas: am.estado.jugadores.find(x => x.esYo).fichas, pagoEsperado: m ? bjPago(m.cartas, r.crupier, m.apuesta) : 0, apuesta: m?.apuesta || 0, crupier: r.crupier.map(textoCarta).join(" "), visibles: $$("#amb-d .carta:not(.oculta)").length, total: r.crupier.length }; })));
    ok(fin.every(x => x.crupier === fin[0].crupier && x.visibles === x.total), `Los 3 ven al crupier igual y con todas sus cartas: ${fin[0].crupier}`);
    ok(J.every((j, k) => fin[k].fichas === antes[k] - fin[k].apuesta + fin[k].pagoEsperado), `Fichas según los pagos: ${J.map((j, k) => `${j.n} ${antes[k]} → ${fin[k].fichas}`).join(", ")}`);
    ok(J.every((j, k) => !apuestas[k] || fin[k].apuesta >= apuestas[k]), "Cada apuesta llegó completa a la mano");
    await ana.p.click("#amb-comprobar"); ok((await ana.p.textContent("#amb-comprobado")).includes("✔"), "«Comprobar» confirma la huella del zapato y que las cartas son las primeras");
    await ana.p.waitForFunction(r => am.estado.bj.fase === "apuestas" && am.estado.bj.ronda > r, ronda, { timeout: 20000 });
  }

  console.log("\n2) Ronda 1: Ana y Beto apuestan y tocan «¡Listo!»; Caro mira");
  let antes = await Promise.all(J.map(misFichas));
  await ana.p.click('#amb-valores [data-v="10"]'); await ana.p.click('#amb-valores [data-v="25"]');
  await beto.p.click('#amb-valores [data-v="50"]');
  await pausa(700);
  const vistas = await caro.p.evaluate(() => am.estado.jugadores.map(j => j.apuesta).join(","));
  ok(vistas === "35,50,0", `Caro ve las apuestas de los demás (${vistas})`);
  await ana.p.click("#amb-listo"); await beto.p.click("#amb-listo");
  await ana.p.waitForFunction(() => am.estado.bj.fase !== "apuestas", null, { timeout: 5000 });
  if (await ana.p.evaluate(() => am.estado.bj.fase === "juego")){
    await Promise.all(J.map(j => j.p.waitForFunction(() => am.estado.bj.fase !== "apuestas")));
    const tapada = await Promise.all(J.map(j => j.p.evaluate(() => am.estado.bj.crupier[1] === null && $$("#amb-d .carta.oculta").length === 1)));
    ok(tapada.every(Boolean), "La segunda carta del crupier está tapada para todos (el servidor no la manda)");
    ok(await caro.p.isHidden("#amb-jugar") && await caro.p.isHidden("#amb-apostar"), "Caro, que no apostó, no tiene botones de juego");
    if (process.env.CAPTURAS){ await pausa(900); await ana.p.screenshot({ path: `${process.env.CAPTURAS}/blackjack-linea-juego.png` }); await caro.p.setViewportSize({ width: 390, height: 844 }); await caro.p.screenshot({ path: `${process.env.CAPTURAS}/blackjack-linea-celular.png`, fullPage: true }); await caro.p.setViewportSize({ width: 1280, height: 1000 }); }
  } else ok(true, "El crupier tuvo blackjack: la ronda terminó al repartir");
  await jugarTurnos();
  await revisarRonda([35, 50, 0], antes);

  console.log("\n3) Ronda 2: nadie toca «Listo» y a Caro se le acaba el tiempo");
  antes = await Promise.all(J.map(misFichas));
  await caro.p.click('#amb-valores [data-v="100"]');
  await beto.p.click("#amb-repetir");
  const t0 = Date.now();
  await ana.p.waitForFunction(() => am.estado.bj.fase !== "apuestas", null, { timeout: 25000 });
  ok(Date.now() - t0 < 20000, "Se repartió sola al terminar los 15 s");
  const cartasCaro = await caro.p.evaluate(() => am.estado.bj.manos.find(m => m.asiento === am.estado.tuAsiento)?.cartas.length);
  await jugarTurnos(caro);
  const cartasDespues = await caro.p.evaluate(() => am.estado.bj.manos.find(m => m.asiento === am.estado.tuAsiento)?.cartas.length);
  ok(cartasCaro === cartasDespues, "A Caro se le acabó el tiempo y se plantó sola (sin cartas nuevas)");
  await revisarRonda([0, 50, 100], antes);

  if (process.env.CAPTURAS) for (const j of J) await j.p.screenshot({ path: `${process.env.CAPTURAS}/blackjack-linea-${j.n}.png`, fullPage: true });
  console.log("\n4) Consola");
  const errores = J.flatMap(j => j.errores.map(e => j.n + ": " + e));
  ok(!errores.length, errores.length ? errores.join("\n    ") : "sin errores en las 3 ventanas");
  await nav.close();
  console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : "\n✔ Blackjack en línea en orden");
  process.exit(fallos ? 1 : 0);
})();
