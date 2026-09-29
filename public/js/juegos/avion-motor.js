/* ═════════ AVIÓN · motor de resultados (sin dibujo) ═════════
   El avión despega de un barco a la altura 2 (de 4). En el camino hay entre 4 y 8 objetos:
   · premios: +1, +2, +5, +10 (suman esas veces tu apuesta) y ×2, ×3, ×4, ×5 (multiplican el contador).
     Con cada premio el avión sube un nivel (máximo 4).
   · cohetes: parten el contador a la mitad y el avión baja un nivel. Si llega al nivel 0, cae al mar
     justo ahí y pierdes la apuesta.
   Si pasa todos los objetos, aterriza en el portaaviones y cobras apuesta × contador (máximo ×250).
   El lugar donde cae sale del vuelo real: es el cohete que lo dejó sin altura.
   Todo el vuelo sale del azar justo (o del número secreto) antes de despegar.
   La velocidad elegida solo cambia lo rápido que se ve: el vuelo es el mismo. */
const AV_OBJ = [
  { t: "+1", v: 1, suma: true, peso: 50, color: "#5fd0ff" },
  { t: "+2", v: 2, suma: true, peso: 25, color: "#4fe3a1" },
  { t: "+5", v: 5, suma: true, peso: 5, color: "#b98cff" },
  { t: "+10", v: 10, suma: true, peso: 1.5, color: "#ff8fd0" },
  { t: "×2", v: 2, peso: 10, color: "#ffd84a" },
  { t: "×3", v: 3, peso: 3, color: "#ffb13b" },
  { t: "×4", v: 4, peso: 1.2, color: "#ff7a3b" },
  { t: "×5", v: 5, peso: 0.5, color: "#ff4d6d" },
];
const AV_PESOS = AV_OBJ.map(o => o.peso);
const AV_COHETE = 0.6516;                        // probabilidad de que un objeto sea un cohete (ajustada para devolver el 97 %)
const AV_ALT0 = 2, AV_ALT_MAX = 4, AV_EV_MIN = 4, AV_EV_MAX = 8;
const AV_TOPE = 250, AV_RTP = 0.97;
const AV_NIVELES = [[80, "¡Súper mega premio!"], [40, "¡Mega premio!"], [20, "¡Premio grande!"]];

// Un vuelo completo. rnd = azar justo, o azarDesde(secreto) para poder comprobarlo después.
function avGenerar(rnd = azar){
  const n = AV_EV_MIN + Math.floor(rnd() * (AV_EV_MAX - AV_EV_MIN + 1));
  let c = 1, h = AV_ALT0; const ev = [];
  for (let i = 0; i < n; i++){
    let e;
    if (rnd() < AV_COHETE){ c /= 2; h -= 1; e = { t: "cohete" }; }
    else { const j = elegirPonderado(AV_PESOS, rnd), o = AV_OBJ[j]; c = o.suma ? c + o.v : c * o.v; h = Math.min(AV_ALT_MAX, h + 1); e = { t: o.t, j }; }
    c = Math.min(c, AV_TOPE); e.c = c; e.h = h; ev.push(e);
    if (h <= 0) return { ev, c, exito: false, n };
  }
  return { ev, c, exito: true, n };
}
const avSortear = secreto => avGenerar(azarDesde(secreto));

// Cálculo exacto (recorre todos los vuelos posibles con su probabilidad):
// cuánto devuelve, cuántos aterrizan y qué tan seguido salen los premios grandes.
// Tarda menos de un segundo; su resultado queda guardado en AV_EXACTO y la prueba automática lo recalcula.
function avExacto(pc = AV_COHETE){
  const tot = AV_PESOS.reduce((a, b) => a + b), nN = AV_EV_MAX - AV_EV_MIN + 1;
  let dist = new Map([[AV_ALT0 + "|1", 1]]);
  const r = { devuelve: 0, aterriza: 0, x20: 0, x40: 0, x80: 0, tope: 0, cae: 0 };
  for (let n = 1; n <= AV_EV_MAX; n++){
    const nueva = new Map(), suma = (k, p) => nueva.set(k, (nueva.get(k) || 0) + p);
    for (const [clave, p] of dist){
      const [h, c] = clave.split("|").map(Number);
      if (h > 1) suma(`${h - 1}|${c / 2}`, p * pc); else r.cae += p * pc * Math.min(1, (AV_EV_MAX + 1 - n) / nN);   // cae al mar (si el vuelo tenía este objeto)
      AV_OBJ.forEach((o, j) => suma(`${Math.min(AV_ALT_MAX, h + 1)}|${Math.min(AV_TOPE, Math.round((o.suma ? c + o.v : c * o.v) * 1e9) / 1e9)}`, p * (1 - pc) * AV_PESOS[j] / tot));
    }
    dist = nueva;
    if (n >= AV_EV_MIN) for (const [clave, p] of dist){
      const c = +clave.split("|")[1], q = p / nN;
      r.devuelve += c * q; r.aterriza += q;
      if (c >= 20) r.x20 += q; if (c >= 40) r.x40 += q; if (c >= 80) r.x80 += q; if (c >= AV_TOPE) r.tope += q;
    }
  }
  return r;
}
const AV_EXACTO = { devuelve: 0.969953, aterriza: 0.300501, x20: 0.00217467, x40: 0.000349140, x80: 0.0000480261, tope: 0.00000153184 };
const AV_SIMULADO = { vuelos: 1e6, devuelve: 0.97118, aterriza: 0.30010 };   // pruebas/simular-avion.js con 1 millón de vuelos
