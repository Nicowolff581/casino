/* Suelta muchas bolas de Plinko con la MISMA física de la página (public/js/juegos/plinko-fisica.js)
   y revisa: probabilidad de cada casilla, devolución de cada riesgo, que ninguna bola atraviese
   un clavo, que ninguna se trabe y que la casilla sea siempre la del sorteo.
   Uso: node pruebas/simular-plinko.js [bolas, por defecto 1000000] */
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs"), path = require("path"), os = require("os");
const TABLAS = {
  bajo:  [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  alto:  [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
};
const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

if (isMainThread){
  const N = +process.argv[2] || 1e6, hilos = os.cpus().length, t0 = Date.now();
  const total = { cuenta: new Array(13).fill(0), n: 0, atraviesa: 0, holguraMin: Infinity, trabadas: 0, distinta: 0, dobles: 0, forzados: 0, tMax: 0, tSuma: 0, choques: 0 };
  let listos = 0;
  for (let h = 0; h < hilos; h++) new Worker(__filename, { workerData: Math.ceil(N / hilos) }).on("message", r => {
    r.cuenta.forEach((c, k) => total.cuenta[k] += c);
    for (const k of ["n", "atraviesa", "trabadas", "distinta", "dobles", "forzados", "tSuma", "choques"]) total[k] += r[k];
    total.holguraMin = Math.min(total.holguraMin, r.holguraMin); total.tMax = Math.max(total.tMax, r.tMax);
    if (++listos < hilos) return;
    const n = total.n; let chi = 0; const filas = [];
    total.cuenta.forEach((o, k) => { const p = comb(12, k) / 4096, e = n * p; chi += (o - e) ** 2 / e; filas.push({ casilla: k + 1, esperado: p, salio: o / n }); });
    const devuelve = Object.fromEntries(Object.entries(TABLAS).map(([r, t]) => [r, { exacto: t.reduce((a, m, k) => a + m * comb(12, k) / 4096, 0), simulado: total.cuenta.reduce((a, o, k) => a + o * t[k], 0) / n }]));
    const res = { bolas: n, chiCuadrado: chi, gradosLibertad: 12, casillas: filas, devuelve, atraviesanClavo: total.atraviesa, holguraMinima: total.holguraMin, distanciaAlTocar: 0.32,
      trabadas: total.trabadas, casillaDistintaDelSorteo: total.distinta, rebotesDobles: total.dobles / n, tirosDeRespaldo: total.forzados, segundosPorBola: total.tSuma / n, segundosMax: total.tMax, segundos: (Date.now() - t0) / 1000 };
    console.log(JSON.stringify(res, null, 1));
    // con 12 grados de libertad, chi² > 32,9 pasa solo 1 de cada 1000 veces por azar
    const ok = chi < 32.9 && !total.atraviesa && !total.trabadas && !total.distinta && Object.values(devuelve).every(d => Math.abs(d.simulado - d.exacto) < 0.01);
    console.log(ok ? "✔ Plinko: casillas y devolución correctas, ninguna bola atravesó un clavo ni se trabó" : "✘ Plinko: algo falló");
    process.exit(ok ? 0 : 1);
  });
} else {
  // se carga el archivo de la página tal cual (con new Function es mucho más rápido que con vm)
  const codigo = fs.readFileSync(path.join(__dirname, "..", "public", "js", "juegos", "plinko-fisica.js"), "utf8");
  const { PLF, plfNueva, plfAvanzar, plfClavoX } = new Function(codigo + "; return { PLF, plfNueva, plfAvanzar, plfClavoX };")();
  const ctx = { crypto: require("crypto").webcrypto };
  // azar justo: el mismo método que nucleo.js (crypto.getRandomValues)
  const buf = new Uint32Array(4096); let pos = buf.length;
  const azar = () => { if (pos + 2 > buf.length){ ctx.crypto.getRandomValues(buf); pos = 0; } return (buf[pos++] * 2097152 + (buf[pos++] >>> 11)) / 9007199254740992; };
  const r = { cuenta: new Array(13).fill(0), n: 0, atraviesa: 0, holguraMin: Infinity, trabadas: 0, distinta: 0, dobles: 0, forzados: 0, tMax: 0, tSuma: 0, choques: 0 };
  // revisión independiente y más fina de cada tiro (40 puntos): distancia a los clavos más cercanos
  function revisar(s){
    for (let k = 1; k < 40; k++){
      const t = s.T * k / 40, x = s.x0 + s.vx * t, y = s.y0 + s.vy * t + 0.5 * PLF.G * t * t;
      for (let f = Math.max(0, Math.floor(y) - 1); f <= Math.min(11, Math.ceil(y) + 1); f++)
        for (let i = Math.max(0, Math.round(x + (f + 2) / 2) - 1); i <= Math.min(f + 2, Math.round(x + (f + 2) / 2) + 1); i++){ const dx = x - plfClavoX(f, i), dy = y - f, d = Math.sqrt(dx * dx + dy * dy); if (d < r.holguraMin) r.holguraMin = d; if (d < PLF.D - 1e-6){ r.atraviesa++; return; } }
    }
  }
  for (let i = 0; i < workerData; i++){
    const b = plfNueva(azar); let pasos = 0;
    while (!b.fin && pasos++ < 60){ const s = b.seg; if (s.evento !== "reposo") revisar(s); plfAvanzar(b, s.t0 + s.T); }
    if (!b.fin){ r.trabadas++; continue; }
    const suma = b.dirs.reduce((a, x) => a + x, 0);
    if (b.dirs.length !== 12 || b.casilla !== suma) r.distinta++;
    r.cuenta[b.casilla]++; r.n++; r.dobles += b.rebotesDobles; r.forzados += b.forzados;
    r.tSuma += b.tFin; r.tMax = Math.max(r.tMax, b.tFin);
  }
  parentPort.postMessage(r);
}
