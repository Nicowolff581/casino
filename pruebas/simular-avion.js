/* Simula muchos vuelos del Avión con el mismo motor de la página (public/js/juegos/avion-motor.js)
   y lo compara con el cálculo exacto. Uso: node pruebas/simular-avion.js [vuelos, por defecto 1000000] */
const fs = require("fs"), vm = require("vm"), { randomBytes } = require("crypto");
let buf = Buffer.alloc(0), pos = 0;
const azar = () => { if (pos + 8 > buf.length){ buf = randomBytes(1 << 16); pos = 0; } const a = buf.readUInt32LE(pos), b = buf.readUInt32LE(pos + 4); pos += 8; return (a * 2097152 + (b >>> 11)) / 9007199254740992; };
const ctx = { azar, Math, Map, Number, elegirPonderado(pesos, rnd = azar){ let r = rnd() * pesos.reduce((a, b) => a + b, 0), i = 0; while ((r -= pesos[i]) > 0 && i < pesos.length - 1) i++; return i; } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../public/js/juegos/avion-motor.js", "utf8") + "\nthis.M = { avGenerar, avExacto, AV_EXACTO, AV_OBJ, AV_COHETE, AV_TOPE };", ctx);
const { avGenerar, avExacto, AV_EXACTO } = ctx.M;
const N = +process.argv[2] || 1e6, pct = x => (x * 100).toFixed(3) + " %";
const t0 = Date.now(), ex = avExacto();
console.log(`Cálculo exacto (${Date.now() - t0} ms): devuelve ${pct(ex.devuelve)} · aterriza ${pct(ex.aterriza)} · cae ${pct(ex.cae)} · ×20+ ${pct(ex.x20)} · ×40+ ${pct(ex.x40)} · ×80+ ${pct(ex.x80)} · ×250 ${pct(ex.tope)}`);
let fallos = 0; const ok = (c, t) => { console.log((c ? "✔ " : "✘ ") + t); if (!c) fallos++; };
ok(Math.abs(ex.aterriza + ex.cae - 1) < 1e-9, "aterrizan + caen = 100 %");
ok(Object.keys(AV_EXACTO).every(k => Math.abs(AV_EXACTO[k] - ex[k]) <= Math.max(1e-6, ex[k] * 1e-5)), "los números guardados en AV_EXACTO coinciden con el cálculo");
ok(Math.abs(ex.devuelve - 0.97) < 0.0005, "el cálculo exacto devuelve 97 %");
let pago = 0, pago2 = 0, aterriza = 0, grandes = [0, 0, 0], donde = {}, mayor = 0;
for (let i = 0; i < N; i++){
  const g = avGenerar();
  if (g.exito){ aterriza++; pago += g.c; pago2 += g.c * g.c; if (g.c >= 20) grandes[0]++; if (g.c >= 40) grandes[1]++; if (g.c >= 80) grandes[2]++; mayor = Math.max(mayor, g.c); }
  else { const clave = `${g.ev.length} de ${g.n}`; donde[clave] = (donde[clave] || 0) + 1; }
}
const media = pago / N, de = Math.sqrt(pago2 / N - media * media) / Math.sqrt(N);
console.log(`Simulación de ${N.toLocaleString("es")} vuelos: devuelve ${pct(media)} (± ${pct(2 * de)}) · aterrizan ${pct(aterriza / N)} · ×20+ ${grandes[0]} · ×40+ ${grandes[1]} · ×80+ ${grandes[2]} · mayor ×${mayor}`);
ok(Math.abs(media - ex.devuelve) < Math.max(3 * de, 0.002), "la simulación coincide con el cálculo exacto");
// dónde cae: tiene que repartirse por todo el vuelo, no siempre justo antes del portaaviones
const antesDelFinal = Object.entries(donde).filter(([k]) => { const [a, b] = k.split(" de ").map(Number); return a === b; }).reduce((s, [, v]) => s + v, 0);
const caidas = N - aterriza;
console.log(`Caídas en el último objeto antes del portaaviones: ${pct(antesDelFinal / caidas)} de las caídas`);
ok(antesDelFinal / caidas < 0.35, "las caídas no se concentran justo antes del portaaviones");
process.exit(fallos ? 1 : 0);
