/* Ruleta en línea con 3 jugadores en 3 ventanas. Antes: npx wrangler dev --port 8790
   Uso: URL=http://localhost:8790 NODE_PATH=$(npm root -g) node pruebas/probar-ruleta-linea.js */
const { chromium } = require("playwright");
const URL = process.env.URL || "http://localhost:8790";
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
  console.log("\n1) Crear sala de ruleta y entrar");
  await ana.p.goto(URL + "/#amigos"); await ana.p.waitForSelector("#carga.fuera", { state: "attached" });
  await ana.p.fill("#am-apodo", "Ana"); await ana.p.click('.am-juego [data-juego="ruleta"]'); await ana.p.selectOption("#am-tiempo", "15");
  await ana.p.click("#am-crear"); await ana.p.waitForFunction(() => am.estado?.juego === "ruleta");
  const cod = await ana.p.textContent("#am-cod");
  for (const j of [beto, caro]){ await j.p.goto(`${URL}/#sala=${cod}`); await j.p.fill("#am-apodo", j.n); await j.p.click("#am-entrar"); await j.p.waitForFunction(() => am.estado?.tuAsiento !== null && am.estado?.juego === "ruleta"); }
  ok(await ana.p.isVisible("#amr") && !(await ana.p.isVisible("#am-mesa")), `Sala de ruleta ${cod} con la mesa de ruleta (sin la de póker)`);

  const ronda = async (listo) => {
    const antes = await Promise.all(J.map(j => j.p.evaluate(() => am.estado.jugadores.find(x => x.esYo).fichas)));
    // cada uno apuesta distinto
    await ana.p.click('#amr-valores [data-v="10"]'); await ana.p.click('#amr-pano [data-t="r"]'); await ana.p.click('#amr-pano [data-t="17"]');
    await beto.p.click('#amr-valores [data-v="25"]'); await beto.p.click('#amr-pano [data-t="d2"]');
    await caro.p.click('#amr-valores [data-v="50"]'); await caro.p.click('#amr-pano [data-t="n"]'); await caro.p.click('#amr-pano [data-t="c3"]');
    await pausa(700);
    const vista = await ana.p.evaluate(() => ({ otras: $$("#amr-pano .ficha-otro").length, mias: $$("#amr-pano .ficha-ru").map(x => x.textContent).join(","), fase: am.estado.ruleta.fase }));
    const apuestas = await ana.p.evaluate(() => am.estado.ruleta.apuestas);
    ok(vista.otras === 3 && vista.mias.split(",").sort().join() === "10,10", `Ana ve sus fichas (10 y 10) y 3 fichas de colores de Beto y Caro`);
    if (listo){ for (const j of J) await j.p.click("#amr-listo"); }
    else { const t0 = Date.now(); await ana.p.waitForFunction(() => am.estado.ruleta.fase === "giro", null, { timeout: 25000 }); ok(Date.now() - t0 < 20000, `Nadie tocó «Listo» y giró sola al terminar los 15 s`); }
    await ana.p.waitForFunction(() => am.estado.ruleta.fase !== "apuestas", null, { timeout: 5000 });
    await pausa(3000);
    const aMitad = await Promise.all(J.map(j => j.p.evaluate(() => ({ disco: $("#amr-resultado").textContent, estado: $("#amr-estado").textContent }))));
    ok(aMitad.every(x => x.disco === "" && x.estado.includes("No va más")), "Mientras la bola gira nadie ve el número (dice «No va más…»)");
    await Promise.all(J.map(j => j.p.waitForFunction(() => amr.mostrada === am.estado.ruleta.ronda && am.estado.ruleta.resultado, null, { timeout: 25000 })));
    const fin = await Promise.all(J.map(j => j.p.evaluate(() => ({ n: am.estado.ruleta.resultado.numero, disco: $("#amr-resultado").textContent, fichas: am.estado.jugadores.find(x => x.esYo).fichas, asiento: am.estado.tuAsiento }))));
    ok(fin.every(x => x.disco === String(fin[0].n)), `Los 3 ven el mismo número al detenerse la bola: ${fin[0].n}`);
    const bolaOk = await ana.p.evaluate(() => { const bb = $("#amr-bola").getBoundingClientRect(), rb = $("#amr-rueda").getBoundingClientRect(); const ang = (Math.atan2(bb.x + bb.width / 2 - rb.x - rb.width / 2, -(bb.y + bb.height / 2 - rb.y - rb.height / 2)) * 180 / Math.PI - am.estado.ruleta.rueda + 720) % 360; return ORDEN[Math.round(ang / (360 / 37)) % 37]; });
    ok(bolaOk === fin[0].n, `La bola quedó sobre el ${bolaOk}`);
    const cuadran = J.every((j, k) => { const mias = apuestas.filter(f => f.asiento === fin[k].asiento); return fin[k].fichas === antes[k] - mias.reduce((a, f) => a + f.monto, 0) + mias.reduce((a, f) => a + ruPremioN(f.t, fin[0].n, f.monto), 0); });
    ok(cuadran, `Fichas de cada uno según su apuesta: ${J.map((j, k) => `${j.n} ${antes[k]} → ${fin[k].fichas}`).join(", ")}`);
    await ana.p.click("#amr-comprobar"); ok((await ana.p.textContent("#amr-comprobado")).includes("✔"), "«Comprobar» confirma que la huella corresponde al número");
    await ana.p.waitForFunction(() => am.estado.ruleta.fase === "apuestas", null, { timeout: 12000 });
  };
  // mismo cálculo de pagos que ruleta-comun.js, para revisar desde afuera
  const ROJOS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  global.ruPremioN = (sel, n, bet) => { if (/^\d+$/.test(sel)) return +sel === n ? bet * 36 : 0; if (n === 0) return 0; if (sel[0] === "d") return Math.ceil(n / 12) === +sel[1] ? bet * 3 : 0; if (sel[0] === "c") return (n - 1) % 3 + 1 === +sel[1] ? bet * 3 : 0; return ({ r: ROJOS.has(n), n: !ROJOS.has(n), p: n % 2 === 0, i: n % 2 === 1, b: n <= 18, a: n >= 19 })[sel] ? bet * 2 : 0; };

  console.log("\n2) Ronda 1: todos tocan «¡Listo!»"); await ronda(true);
  console.log("\n3) Ronda 2: se acaba el tiempo"); await ronda(false);
  if (process.env.CAPTURAS) for (const j of J) await j.p.screenshot({ path: `${process.env.CAPTURAS}/ruleta-linea-${j.n}.png`, fullPage: true });
  console.log("\n4) Consola");
  const errores = J.flatMap(j => j.errores.map(e => j.n + ": " + e));
  ok(!errores.length, errores.length ? errores.join("\n    ") : "sin errores en las 3 ventanas");
  await nav.close();
  console.log(fallos ? `\n✘ ${fallos} comprobaciones fallaron` : "\n✔ Ruleta en línea en orden");
  process.exit(fallos ? 1 : 0);
})();
