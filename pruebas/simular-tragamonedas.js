/* Simula millones de jugadas del tragamonedas con el MISMO código que usa la página.
   Uso:  node pruebas/simular-tragamonedas.js [millones de jugadas, por defecto 4]
         MODO=compra node pruebas/simular-tragamonedas.js 1   (simula la compra de giros gratis)
   Reparte el trabajo entre los procesadores y muestra cuánto devuelve con su margen de error. */
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const path = require("path"), fs = require("fs"), vm = require("vm"), os = require("os");

function cargarMotor(){
  const raiz = path.resolve(__dirname, "..", "public", "js");
  const nucleo = fs.readFileSync(path.join(raiz, "nucleo.js"), "utf8").split("/* ── saldo y apuesta ── */")[0];
  const motor = fs.readFileSync(path.join(raiz, "juegos", "tragamonedas-motor.js"), "utf8");
  const ctx = { crypto: require("crypto").webcrypto, TextEncoder, document: { querySelector: () => null } };
  vm.createContext(ctx);
  // AJUSTE (opcional): código para probar otros pesos o pagos sin tocar el juego
  vm.runInContext(nucleo + motor + ";" + (process.env.AJUSTE || "") + "; this.jugada = " + (process.env.MODO === "compra" ? "slCompra" : "slJugada") + "; this.azar = azar;", ctx);
  return ctx;
}

if (isMainThread){
  const total = Math.round((+process.argv[2] || 4) * 1e6), hilos = os.cpus().length, porHilo = Math.ceil(total / hilos);
  const inicio = Date.now(); let listos = 0; const suma = { n: 0, s: 0, s2: 0, gana: 0, bonos: 0, sBono: 0, max: 0, topados: 0, sBase: 0 };
  for (let i = 0; i < hilos; i++){
    new Worker(__filename, { workerData: porHilo }).on("message", r => {
      for (const k in suma) suma[k] = k === "max" ? Math.max(suma[k], r[k]) : suma[k] + r[k];
      if (++listos < hilos) return;
      const media = suma.s / suma.n, desv = Math.sqrt(suma.s2 / suma.n - media * media), err = 1.96 * desv / Math.sqrt(suma.n);
      const res = {
        jugadas: suma.n, devuelve: media, margen95: err, desviacion: desv,
        juegoNormal: suma.sBase / suma.n, girosGratis: suma.sBono / suma.n,
        frecuenciaPremio: suma.gana / suma.n, unBonoCada: suma.n / Math.max(1, suma.bonos), premioMaximo: suma.max, topados: suma.topados,
        segundos: (Date.now() - inicio) / 1000,
      };
      console.log(JSON.stringify(res, null, 2));
    });
  }
} else {
  const { jugada, azar } = cargarMotor(), r = { n: 0, s: 0, s2: 0, gana: 0, bonos: 0, sBono: 0, max: 0, topados: 0, sBase: 0 };
  for (let i = 0; i < workerData; i++){
    const j = jugada(azar);
    r.n++; r.s += j.total; r.s2 += j.total * j.total; if (j.total > 0) r.gana++;
    const baseT = j.base ? j.base.total : 0, bono = j.total - Math.min(baseT, j.total);
    r.sBase += Math.min(baseT, j.total);
    if (j.gratis){ r.bonos++; r.sBono += bono; }
    if (j.total > r.max) r.max = j.total; if (j.topado) r.topados++;
  }
  parentPort.postMessage(r);
}
