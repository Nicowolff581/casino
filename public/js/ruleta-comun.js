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
  /* ── recorrido de la bola ──
     El número ya está sorteado (con el azar justo) antes de girar. El recorrido de la bola es solo el dibujo:
     sale de una «semilla» al azar de cada giro, así cada giro se ve distinto (vueltas, frenado, rombos,
     rebotes) y en la ruleta en línea todos ven exactamente el mismo. Se arma desde el final hacia atrás,
     por eso siempre termina en el número sorteado. Ángulos en grados; radios en % del tamaño de la rueda
     (borde 45, casillas 34,7). */
  const RU_BORDE = 45, RU_CASILLAS = 34.7, RU_ROMBO = 43.2, RU_ROMBOS = 8;
  // Azar simple a partir de un número (mulberry32): solo decoración, no decide nada del resultado.
  function ruRnd(semilla){
    let a = semilla >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Tiempos y rebotes de un giro (dependen solo de la semilla). Tiempos en ms desde que empieza.
  function ruPlan(semilla = 0){
    const r = ruRnd(semilla);
    const T = 18000 + r() * 4000;                         // duración total: entre 18 y 22 s
    const asentar = 1500 + r() * 1500;                    // al final la bola descansa en su casilla girando con la rueda
    const nSaltos = 1 + Math.floor(r() * 6);              // 1 a 6 rebotes entre casillas
    // posiciones (en casillas, respecto de la ganadora) desde la última hacia la primera
    const pos = [0];
    for (let i = 0; i < nSaltos; i++){
      let paso = 1 + Math.floor(r() * (i === 0 ? 2 : 3));  // el último rebote es cortito
      if (r() < 0.5) paso = -paso;
      pos.unshift(pos[0] + paso);
    }
    const saltos = []; let t = 0;
    for (let i = 0; i < nSaltos; i++){
      const lejos = nSaltos - 1 - i, dist = Math.abs(pos[i + 1] - pos[i]);
      const h = Math.min(7, (0.7 + r() * 1.4) * (1 + lejos * 0.55) + dist * 0.35);   // altura del rebote (% del radio)
      const d = 150 + 75 * Math.sqrt(h) + dist * 35 + r() * 60, pausa = 30 + r() * 150;
      saltos.push({ desde: pos[i], hasta: pos[i + 1], h, d, t0: t }); t += d + pausa;
    }
    const TC = T - asentar, TR = TC - t, TD = TR - (2200 + r() * 1500);
    saltos.forEach(x => x.t0 += TR);
    return { T, TC, TR, TD, saltos, vueltasBola: 7 + Math.floor(r() * 4), frenado: 1.7 + r() * 0.8, nRombos: Math.floor(r() * 4),
      elegir: [r(), r(), r()], fuerzas: [0.5 + r() * 0.5, 0.5 + r() * 0.5, 0.5 + r() * 0.5], fase: r() * 100, tono: 0.85 + r() * 0.3 };
  }
  const RU_DURACION_MAX = 22000;
  const mod360 = a => ((a % 360) + 360) % 360;
  const suave = u => u * u * (3 - 2 * u);
  // Recorrido completo de un giro: dónde está la rueda y la bola en cada momento, y los choques (para sonidos).
  // giro = { idx (posición del número en ORDEN), rueda0, vueltas, bola0, semilla }
  function ruTrayectoria({ idx, rueda0, vueltas, bola0, semilla = 0 }){
    const P = ruPlan(semilla), seg = 360 / 37, lim = u => Math.max(0, Math.min(1, u));
    const rueda = t => rueda0 + vueltas * (1 - Math.pow(1 - lim(t / P.T), 3));             // la rueda frena suave
    const casilla = t => rueda(t) + idx * seg;                                             // dónde está la casilla ganadora
    // 1) por el borde, al revés que la rueda, frenando; llega a la zona de casillas justo sobre la casilla del primer rebote
    const llegada = casilla(P.TR) + P.saltos[0].desde * seg;
    const recorrido = mod360(bola0 - llegada) + 360 * P.vueltasBola;
    const libre = t => bola0 - recorrido * (1 - Math.pow(1 - lim(t / P.TR), P.frenado));
    // 2) al caer puede chocar con los rombos fijos del borde (0 a 3 choques)
    const cruces = [];
    for (let t = P.TD, antes = Math.floor((libre(P.TD) - 360 / RU_ROMBOS / 2) / (360 / RU_ROMBOS)); t < P.TD + (P.TR - P.TD) * 0.5; t += 10){
      const k = Math.floor((libre(t) - 360 / RU_ROMBOS / 2) / (360 / RU_ROMBOS));
      if (k !== antes){ cruces.push(t); antes = k; }
    }
    const golpes = [];
    for (let i = 0; i < P.nRombos && cruces.length; i++){
      const t = cruces.splice(Math.floor(P.elegir[i] * cruces.length), 1)[0];
      if (golpes.every(g => Math.abs(g.t - t) > 300)) golpes.push({ t, f: P.fuerzas[i], d: 240 + P.fuerzas[i] * 120 });
    }
    golpes.sort((a, b) => a.t - b.t);
    const pulso = t => golpes.reduce((a, g) => { const s = (t - g.t) / g.d; return s > 0 && s < 1 ? a + g.f * Math.sin(Math.PI * s) : a; }, 0);
    function bola(t){
      if (t < P.TD){                                                        // rodando por el borde (tiembla un poquito)
        const vel = 1 - lim(t / P.TD);
        return { ang: libre(t), radio: RU_BORDE + 0.3 * vel * Math.sin(t / 37 + P.fase), fase: "borde" };
      }
      if (t < P.TR){                                                        // cae hacia las casillas
        const u = (t - P.TD) / (P.TR - P.TD), p = pulso(t);
        return { ang: libre(t) + 2.5 * p, radio: RU_BORDE - (RU_BORDE - RU_CASILLAS) * suave(u) + 2.2 * p, fase: "cae" };
      }
      for (const x of P.saltos){                                            // rebota entre casillas
        if (t < x.t0 + x.d){
          const s = lim((t - x.t0) / x.d);
          return { ang: casilla(t) + (x.desde + (x.hasta - x.desde) * suave(s)) * seg, radio: RU_CASILLAS + x.h * Math.sin(Math.PI * s), fase: "rebota" };
        }
        if (t < (P.saltos[P.saltos.indexOf(x) + 1]?.t0 ?? P.TC)) return { ang: casilla(t) + x.hasta * seg, radio: RU_CASILLAS, fase: "rebota" };
      }
      return { ang: casilla(t), radio: RU_CASILLAS, fase: "quieta" };      // en su casilla hasta que la rueda para
    }
    const eventos = [...golpes.map(g => ({ t: g.t, tipo: "rombo", f: g.f })), { t: P.TR, tipo: "casilla", f: 0.8 },
      ...P.saltos.map(x => ({ t: x.t0 + x.d, tipo: "casilla", f: Math.min(1, x.h / 5) }))].sort((a, b) => a.t - b.t);
    return { plan: P, rueda, bola, eventos, T: P.T };
  }
  const ruPagoTotal = (fichas, n) => fichas.reduce((s, f) => s + ruPremio(f.t, n, f.monto), 0);
  const sumaFichas = fichas => fichas.reduce((s, f) => s + f.monto, 0);
  Object.assign(globalThis, { ORDEN, ROJOS, colorN, nombresRU, nombreApuesta, esApuestaRU, ruPremio, ruPagoTotal, sumaFichas, ruPlan, ruTrayectoria, RU_DURACION_MAX, RU_BORDE, RU_CASILLAS, RU_ROMBO, RU_ROMBOS });
})();
