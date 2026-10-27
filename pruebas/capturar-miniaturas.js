/* Saca las miniaturas de la portada con capturas reales de cada juego en acción.
   Volver a correrlo si cambia cómo se ve un juego.
   Antes: python3 -m http.server 8799 --directory public
   Uso:   URL=http://localhost:8799 NODE_PATH=$(npm root -g) node pruebas/capturar-miniaturas.js */
const { chromium } = require("playwright");
const path = require("path");
const URL = process.env.URL || "http://localhost:8799";
const SALIDA = path.join(__dirname, "..", "public", "img", "lobby");
const pausa = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch(), p = await nav.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.goto(URL + "/#inicio"); await p.waitForSelector("#carga.fuera", { state: "attached" });
  await p.evaluate(() => { setSaldo(100000); setApuesta(20); sonido.setActivo(false); });
  const foto = async (id, sel) => { await p.locator(sel).first().screenshot({ path: path.join(SALIDA, id + ".jpg"), type: "jpeg", quality: 82 }); console.log("✔", id); };
  const abrir = async id => { await p.evaluate(id => mostrarJuego(id), id); await pausa(700); };
  const libre = () => p.waitForFunction(() => !ocupado, null, { timeout: 120000 });

  await abrir("avion"); await p.click("#av-btn"); await p.waitForFunction(() => av.idx >= 2 || av.estado !== "vuelo", null, { timeout: 60000 }); await pausa(250); await foto("avion", ".av-cielo"); await libre();
  await abrir("pollo"); await p.click("#po-jugar"); for (let i = 0; i < 3; i++){ if (await p.isEnabled("#po-avanzar")){ await p.click("#po-avanzar"); await pausa(900); } } await foto("pollo", ".po-escena");
  if (await p.isEnabled("#po-cobrar")) await p.click("#po-cobrar"); await libre();
  await abrir("plinko"); for (let i = 0; i < 6; i++){ await p.click("#pl-soltar"); await pausa(160); } await pausa(900); await foto("plinko", ".pl-caja"); await libre();
  await abrir("slots"); await p.check("#sl-rapido", { force: true }); await p.click("#s-girar"); await libre(); await pausa(400); await foto("slots", "#sl-maquina");
  await abrir("bj"); await p.click("#bj-repartir"); await pausa(1300); await foto("bj", "#g-bj .felt"); if (await p.isEnabled("#bj-plantarse")) await p.click("#bj-plantarse"); await libre();
  await abrir("poker"); await p.click("#th-nueva"); await pausa(1500);
  for (let i = 0; i < 3 && await p.evaluate(() => ocupado); i++){ if (await p.isEnabled("#th-call")) await p.click("#th-call"); await pausa(1600); }
  await foto("poker", "#g-poker .felt");
  while (await p.evaluate(() => ocupado)){ if (await p.isEnabled("#th-call")) await p.click("#th-call"); await pausa(300); }
  await abrir("ruleta"); for (const t of ["r", "17", "d2", "c3"]) await p.click(`.pano [data-t="${t}"]`); await p.click("#ru-girar"); await pausa(6500); await foto("ruleta", "#g-ruleta .rueda-caja"); await libre();
  await abrir("fantan"); await p.click('.ft-lado[data-n="2"]'); await p.click("#ft-jugar"); await libre(); await pausa(300); await foto("fantan", ".ft-zona");
  await nav.close();
})();
