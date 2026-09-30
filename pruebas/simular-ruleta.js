/* Hace 1 millón de giros de la ruleta con el MISMO código de la página (ruleta-comun.js):
   sortea el número con el azar justo, arma el recorrido de la bola y revisa que siempre termine en
   el número sorteado, que la bola nunca salga de la rueda ni se meta al centro y cuánto devuelve.
   Uso: node pruebas/simular-ruleta.js [giros, por defecto 1000000] */
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs"), path = require("path"), os = require("os"), { randomInt } = require("crypto");
const codigo = fs.readFileSync(path.join(__dirname, "..", "public", "js", "ruleta-comun.js"), "utf8");
const R = new Function(codigo + "; return globalThis;")();

if (isMainThread){
  const N = +process.argv[2] || 1e6, hilos = os.cpus().length, t0 = Date.now();
  const tot = { cuenta: new Array(37).fill(0), n: 0, otraCasilla: 0, fuera: 0, radioMin: 99, radioMax: 0, Tmin: 1e9, Tmax: 0, TDmin: 1e9, rombos: 0, rebotes: 0, rebotesMax: 0 };
  let listos = 0;
  for (let h = 0; h < hilos; h++) new Worker(__filename, { workerData: Math.ceil(N / hilos) }).on("message", r => {
    r.cuenta.forEach((c, k) => tot.cuenta[k] += c);
    for (const k of ["n", "otraCasilla", "fuera", "rombos", "rebotes"]) tot[k] += r[k];
    tot.radioMin = Math.min(tot.radioMin, r.radioMin); tot.radioMax = Math.max(tot.radioMax, r.radioMax);
    tot.Tmin = Math.min(tot.Tmin, r.Tmin); tot.Tmax = Math.max(tot.Tmax, r.Tmax); tot.TDmin = Math.min(tot.TDmin, r.TDmin); tot.rebotesMax = Math.max(tot.rebotesMax, r.rebotesMax);
    if (++listos < hilos) return;
    const n = tot.n; let chi = 0; tot.cuenta.forEach(o => { const e = n / 37; chi += (o - e) ** 2 / e; });
    const apuestas = { "pleno (17)": "17", rojo: "r", par: "p", "docena 1": "d1", "columna 1": "c1", "1 a 18": "b" };
    const devuelve = Object.fromEntries(Object.entries(apuestas).map(([k, t]) => [k, tot.cuenta.reduce((a, o, num) => a + o * R.ruPremio(t, num, 1), 0) / n]));
    const res = { giros: n, chiCuadrado: +chi.toFixed(2), gradosLibertad: 36, porNumero: tot.cuenta.map(c => +(c / n).toFixed(6)), devuelve, exacto: 36 / 37,
      terminaEnOtraCasilla: tot.otraCasilla, bolaFueraDeLaRueda: tot.fuera, radioMin: tot.radioMin, radioMax: tot.radioMax,
      duracionMin: tot.Tmin, duracionMax: tot.Tmax, caidaMasTemprana: tot.TDmin, rombosPorGiro: tot.rombos / n, rebotesPorGiro: tot.rebotes / n, rebotesMax: tot.rebotesMax, segundos: (Date.now() - t0) / 1000 };
    console.log(JSON.stringify(res, null, 1));
    // con 36 grados de libertad, chi² > 67 pasa solo 1 de cada 1000 veces por azar
    const ok = chi < 67 && !tot.otraCasilla && !tot.fuera && Object.values(devuelve).every(d => Math.abs(d - 36 / 37) < 0.02);
    console.log(ok ? "✔ Ruleta: la bola siempre termina en el número sorteado, cada número sale 1 de 37 y devuelve 97,3 %" : "✘ Ruleta: algo falló");
    process.exit(ok ? 0 : 1);
  });
} else {
  const r = { cuenta: new Array(37).fill(0), n: 0, otraCasilla: 0, fuera: 0, radioMin: 99, radioMax: 0, Tmin: 1e9, Tmax: 0, TDmin: 1e9, rombos: 0, rebotes: 0, rebotesMax: 0 };
  const seg = 360 / 37;
  for (let i = 0; i < workerData; i++){
    const n = randomInt(37);                                          // azar justo (crypto), como la página y el servidor
    const idx = R.ORDEN.indexOf(n);
    const tr = R.ruTrayectoria({ idx, rueda0: randomInt(360), vueltas: 270 + randomInt(91), bola0: randomInt(360), semilla: randomInt(2 ** 31) });
    for (let k = 0; k <= 60; k++){                                    // la bola siempre sobre la pista: ni afuera ni en el centro
      const b = tr.bola(tr.T * k / 60);
      if (!(b.radio >= R.RU_CASILLAS - 1e-9 && b.radio <= 48.5) || !isFinite(b.ang)){ r.fuera++; break; }
      if (b.radio < r.radioMin) r.radioMin = b.radio; if (b.radio > r.radioMax) r.radioMax = b.radio;
    }
    const fin = tr.bola(tr.T), rel = ((fin.ang - tr.rueda(tr.T)) % 360 + 360) % 360;
    if (R.ORDEN[Math.round(rel / seg) % 37] !== n) r.otraCasilla++;
    r.cuenta[n]++; r.n++;
    r.Tmin = Math.min(r.Tmin, tr.T); r.Tmax = Math.max(r.Tmax, tr.T); r.TDmin = Math.min(r.TDmin, tr.plan.TD);
    const rom = tr.eventos.filter(e => e.tipo === "rombo").length; r.rombos += rom;
    r.rebotes += tr.plan.saltos.length; r.rebotesMax = Math.max(r.rebotesMax, tr.plan.saltos.length);
  }
  parentPort.postMessage(r);
}
