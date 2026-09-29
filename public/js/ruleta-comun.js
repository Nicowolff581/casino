/* ═════════ Casino Nico · reglas de la ruleta europea (compartido) ═════════
   Lo usan la ruleta para jugar solo, la ruleta en línea (página) y el servidor,
   así que los pagos son exactamente los mismos en todos lados. */
(function(){
  // Orden de los números alrededor de la rueda, empezando por el 0.
  const ORDEN = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const ROJOS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const colorN = n => n === 0 ? "#1fa84a" : ROJOS.has(n) ? "#d10f35" : "#10141c";
  const nombresRU = { r: "rojo", n: "negro", p: "par", i: "impar", b: "1 a 18", a: "19 a 36", d1: "1 a 12", d2: "13 a 24", d3: "25 a 36",
    c1: "la columna del 1 al 34", c2: "la columna del 2 al 35", c3: "la columna del 3 al 36" };
  const nombreApuesta = t => nombresRU[t] || "el " + t;
  const esApuestaRU = t => typeof t === "string" && (/^([0-9]|[12][0-9]|3[0-6])$/.test(t) || t in nombresRU);
  // Fichas que paga una apuesta (incluye la ficha devuelta si gana).
  // Pleno 35 a 1 · docena y columna 2 a 1 · rojo, negro, par, impar, 1-18 y 19-36 pagan 1 a 1. Con el 0 solo gana el pleno al 0.
  function ruPremio(sel, n, bet){
    if (/^\d+$/.test(sel)) return +sel === n ? bet * 36 : 0;
    if (n === 0) return 0;
    if (sel[0] === "d") return Math.ceil(n / 12) === +sel[1] ? bet * 3 : 0;
    if (sel[0] === "c") return (n - 1) % 3 + 1 === +sel[1] ? bet * 3 : 0;
    return ({ r: ROJOS.has(n), n: !ROJOS.has(n), p: n % 2 === 0, i: n % 2 === 1, b: n <= 18, a: n >= 19 })[sel] ? bet * 2 : 0;
  }
  const RU_DURACION = 13000;                             // duración del giro con la bola (ms), como una ruleta real
  const ruPagoTotal = (fichas, n) => fichas.reduce((s, f) => s + ruPremio(f.t, n, f.monto), 0);
  const sumaFichas = fichas => fichas.reduce((s, f) => s + f.monto, 0);
  Object.assign(globalThis, { ORDEN, ROJOS, colorN, nombresRU, nombreApuesta, esApuestaRU, ruPremio, ruPagoTotal, sumaFichas, RU_DURACION });
})();
