/* ═════════ PLINKO (salón de neón) ═════════
   La bola cruza 12 filas de clavos. Cada vez que toca un clavo se sortea en ese momento, con el
   azar justo, si sigue por la izquierda o por la derecha (50 % cada lado). La casilla final es el
   número de veces que fue a la derecha (0 a 12). La física del rebote está en plinko-fisica.js:
   altura, fuerza, giro y rebotes dobles cambian en cada caída, pero son solo el dibujo. */
const PL_FILAS = PLF.FILAS;
const PL_TABLAS = {
  bajo:  [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  alto:  [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
};
// Resultado de soltar 1.000.000 de bolas con esta misma física (pruebas/simular-plinko.js).
const PL_SIMULADO = { bolas: 1000000, chi: 20.1, casillas: [0.000276, 0.002862, 0.016215, 0.053898, 0.120816, 0.193436, 0.225317, 0.192878, 0.120625, 0.053971, 0.016507, 0.002954, 0.000245],
  devuelve: { bajo: 0.99059, medio: 0.99276, alto: 1.00028 } };
const pl = { riesgo: "medio", bolas: [], brillo: {}, flash: {}, golpe: {}, particulas: [], textos: [], ondas: [], sacudida: null, animando: false };
const plCanvas = $("#pl-canvas"), plCtx = plCanvas.getContext("2d");
function plTam(){ if (ajustarCanvas(plCanvas, plCtx)) plDibujar(performance.now()); }
function plGeo(){
  const W = plCanvas.clientWidth, H = plCanvas.clientHeight;
  const gap = Math.min(W / (PL_FILAS + 2), (H - 30) / (PL_FILAS + 1.6));
  return { W, H, gap, cx: W / 2, top: gap * 0.9 };
}
// De medidas de la física (1 = distancia entre filas) a píxeles del lienzo.
const plPx = (g, x, y) => [g.cx + x * g.gap, g.top + y * g.gap];
// Color de neón de cada casilla: turquesa al centro, fucsia hacia afuera y dorado en los bordes.
function colorCaja(k, luz = 60){
  const t = Math.abs(k - PL_FILAS / 2) / (PL_FILAS / 2);
  return t === 1 ? `hsl(46,100%,${luz}%)` : `hsl(${Math.round(185 + 135 * t)},100%,${luz}%)`;
}

function plDibujar(ahora){
  const g = plGeo(), c = plCtx, tabla = PL_TABLAS[pl.riesgo];
  if (!g.W) return;
  c.save();
  if (pl.sacudida){                                            // temblor en los premios grandes
    const d = ahora - pl.sacudida.t0, f = pl.sacudida.fuerza * Math.max(0, 1 - d / 450);
    if (f > 0) c.translate((Math.random() - 0.5) * f, (Math.random() - 0.5) * f); else pl.sacudida = null;
  }
  // fondo: salón oscuro con cuadrícula de neón
  const fondo = c.createRadialGradient(g.cx, g.H * 0.35, 0, g.cx, g.H * 0.35, g.H * 0.9);
  fondo.addColorStop(0, "#1c0a33"); fondo.addColorStop(1, "#05020d");
  c.fillStyle = fondo; c.fillRect(-20, -20, g.W + 40, g.H + 40);
  c.strokeStyle = "rgba(160,90,255,.07)"; c.lineWidth = 1;
  for (let x = (g.cx % 28); x < g.W; x += 28){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, g.H); c.stroke(); }
  for (let y = 0; y < g.H; y += 28){ c.beginPath(); c.moveTo(0, y); c.lineTo(g.W, y); c.stroke(); }

  c.globalCompositeOperation = "lighter";
  // clavos: brillan y vibran cuando la bola los toca
  const rp = Math.max(2.5, g.gap * 0.1);
  for (let r = 0; r < PL_FILAS; r++) for (let i = 0; i < r + 3; i++){
    let x = g.cx + (i - (r + 2) / 2) * g.gap, y = g.top + r * g.gap;
    const f = pl.flash[r + "-" + i], d = f ? ahora - f : 1e9, k = Math.max(0, 1 - d / 420) * (0.55 + 0.45 * (pl.golpe[r + "-" + i] ?? 1));
    if (k > 0){ x += Math.sin(d / 11) * rp * 0.7 * k; y += Math.cos(d / 13) * rp * 0.4 * k; }
    const halo = c.createRadialGradient(x, y, 0, x, y, rp * (3 + k * 4));
    halo.addColorStop(0, k ? `rgba(255,90,220,${0.35 + 0.5 * k})` : "rgba(62,231,255,.28)"); halo.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = halo; c.beginPath(); c.arc(x, y, rp * (3 + k * 4), 0, Math.PI * 2); c.fill();
    if (k > 0){ c.strokeStyle = `rgba(255,150,240,${k * 0.8})`; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, rp * (1.2 + (1 - k) * 4), 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = k > 0.3 ? "#fff" : "#bff7ff"; c.beginPath(); c.arc(x, y, rp * (1 + k * 0.35), 0, Math.PI * 2); c.fill();
  }
  // casillas de premio: saltan y se encienden al recibir una bola
  const yc = g.top + (PL_FILAS - 0.35) * g.gap + g.gap * 0.6, w = g.gap * 0.88, h = g.gap * 0.72;
  tabla.forEach((m, k) => {
    const x = g.cx + (k - PL_FILAS / 2) * g.gap, d = pl.brillo[k] ? ahora - pl.brillo[k] : 1e9, on = Math.max(0, 1 - d / 700);
    const salto = d < 380 ? Math.sin(d / 380 * Math.PI) * g.gap * 0.28 : 0, y = yc + salto, col = colorCaja(k);
    if (on){ const halo = c.createRadialGradient(x, y + h / 2, 0, x, y + h / 2, g.gap * (1 + on)); halo.addColorStop(0, colorCaja(k, 55).replace("hsl", "hsla").replace("%)", `%,${0.5 * on})`)); halo.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = halo; c.fillRect(x - g.gap * 2, y - g.gap * 1.5, g.gap * 4, g.gap * 3.5); }
    c.fillStyle = colorCaja(k, 50).replace("hsl", "hsla").replace("%)", `%,${0.16 + 0.5 * on})`);
    c.beginPath(); c.roundRect(x - w / 2, y, w, h, 6); c.fill();
    c.strokeStyle = col; c.lineWidth = 1.6 + on * 1.5; c.stroke();
  });
  c.globalCompositeOperation = "source-over";
  c.textAlign = "center"; c.textBaseline = "middle";
  tabla.forEach((m, k) => {
    const x = g.cx + (k - PL_FILAS / 2) * g.gap, d = pl.brillo[k] ? ahora - pl.brillo[k] : 1e9;
    const salto = d < 380 ? Math.sin(d / 380 * Math.PI) * g.gap * 0.28 : 0;
    c.font = `800 ${Math.max(6, g.gap * (m >= 100 ? 0.26 : 0.29))}px Manrope, sans-serif`;
    c.fillStyle = d < 700 ? "#fff" : colorCaja(k, 78);
    c.fillText(m + (m < 100 ? "×" : ""), x, yc + h / 2 + salto + 1);
  });

  c.globalCompositeOperation = "lighter";
  // ondas expansivas
  pl.ondas = pl.ondas.filter(o => ahora - o.t0 < 700);
  pl.ondas.forEach(o => { const k = (ahora - o.t0) / 700; c.strokeStyle = o.color.replace("hsl", "hsla").replace("%)", `%,${1 - k})`); c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.arc(o.x, o.y, g.gap * (0.5 + k * o.tam), 0, Math.PI * 2); c.stroke(); });
  // bolas con estela (cada una con su propio recorrido y su propio giro)
  const rb = g.gap * PLF.RB;
  pl.bolas.forEach(b => {
    b.rastro.forEach(([tx, ty], i) => {
      const a = 0.3 * (i + 1) / b.rastro.length, [px, py] = plPx(g, tx, ty);
      c.fillStyle = `rgba(255,${200 - i * 8},60,${a})`; c.beginPath(); c.arc(px, py, rb * (0.45 + 0.5 * (i + 1) / b.rastro.length), 0, Math.PI * 2); c.fill();
    });
    const [x, y] = plPx(g, ...plfPos(b.f, (ahora - b.t0) / 1000));
    const halo = c.createRadialGradient(x, y, 0, x, y, rb * 3.2); halo.addColorStop(0, "rgba(255,210,90,.55)"); halo.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = halo; c.beginPath(); c.arc(x, y, rb * 3.2, 0, Math.PI * 2); c.fill();
    const core = c.createRadialGradient(x - rb * 0.35, y - rb * 0.35, 0, x, y, rb);
    core.addColorStop(0, "#ffffff"); core.addColorStop(0.45, "#ffe45e"); core.addColorStop(1, "#ff7a1a");
    c.fillStyle = core; c.beginPath(); c.arc(x, y, rb, 0, Math.PI * 2); c.fill();
    // franja que gira: así se ve que la bola rueda
    c.save(); c.translate(x, y); c.rotate(b.f.ang);
    c.strokeStyle = "rgba(160,50,0,.55)"; c.lineWidth = Math.max(1, rb * 0.22); c.lineCap = "round";
    c.beginPath(); c.arc(0, 0, rb * 0.62, -0.9, 0.9); c.stroke();
    c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(-rb * 0.55, 0, rb * 0.13, 0, Math.PI * 2); c.fill();
    c.restore();
  });
  // partículas
  pl.particulas.forEach(p => { const k = p.vida / p.max; c.fillStyle = p.color.replace("hsl", "hsla").replace("%)", `%,${k})`); c.beginPath(); c.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2); c.fill(); });
  c.globalCompositeOperation = "source-over";
  // textos que suben
  pl.textos = pl.textos.filter(tx => ahora - tx.t0 < 1200);
  pl.textos.forEach(tx => {
    const k = (ahora - tx.t0) / 1200;
    c.globalAlpha = 1 - k * k; c.font = `900 ${tx.tam * (1 + 0.2 * Math.sin(Math.min(1, k * 4) * Math.PI))}px Manrope, sans-serif`;
    c.lineWidth = 4; c.strokeStyle = "rgba(10,0,20,.8)"; c.strokeText(tx.txt, tx.x, tx.y - k * g.gap * 2);
    c.fillStyle = tx.color; c.fillText(tx.txt, tx.x, tx.y - k * g.gap * 2); c.globalAlpha = 1;
  });
  c.restore();
}

// Efecto al caer en una casilla, más grande cuanto mayor el multiplicador.
function plEfecto(k, m, ahora){
  const g = plGeo(), x = g.cx + (k - PL_FILAS / 2) * g.gap, y = g.top + (PL_FILAS - 0.35) * g.gap + g.gap * 0.6, color = colorCaja(k);
  const nivel = m >= 10 ? 3 : m >= 2 ? 2 : m >= 1 ? 1 : 0;
  const n = [6, 12, 26, 70][nivel];
  for (let i = 0; i < n; i++){
    const a = -Math.PI / 2 + (Math.random() - 0.5) * (nivel === 3 ? 2.6 : 1.4), v = g.gap * (2 + Math.random() * (nivel + 2) * 2);
    pl.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.6 + Math.random() * 0.6 * (nivel + 1) / 2, max: 1.2, r: 1.5 + Math.random() * 2.5, color: i % 3 ? color : "hsl(50,100%,75%)" });
  }
  pl.ondas.push({ x, y: y + g.gap * 0.35, t0: ahora, color, tam: [1, 1.5, 2.5, 6][nivel] });
  if (nivel >= 2) pl.textos.push({ txt: m + "×", x, y: y - g.gap * 0.6, t0: ahora, color: "#fff", tam: g.gap * (nivel === 3 ? 0.95 : 0.55) });
  if (nivel === 3){ pl.sacudida = { t0: ahora, fuerza: g.gap * 0.5 }; pl.ondas.push({ x, y: y + g.gap * 0.35, t0: ahora + 120, color: "hsl(50,100%,70%)", tam: 9 }); }
  sonido.caja(m);
}
function plLoop(ahora){
  const tabla = PL_TABLAS[pl.riesgo], dt = Math.min(0.05, (ahora - (pl.ultimo || ahora)) / 1000); pl.ultimo = ahora;
  pl.bolas.forEach(b => {
    const t = (ahora - b.t0) / 1000;
    for (const p of plfAvanzar(b.f, t)){
      if (p.tipo === "clavo" || p.tipo === "doble"){
        const clave = p.fila + "-" + p.clavo;
        pl.flash[clave] = ahora; pl.golpe[clave] = p.fuerza;
        sonido.clavito(p.fila, p.fuerza);
      } else if (p.tipo === "casilla"){
        const k = p.casilla, m = tabla[k], gana = Math.floor(b.bet * m);
        pl.brillo[k] = ahora; plEfecto(k, m, ahora);
        liquidar("#pl-msg", gana, b.bet, `${m}× → ${fmt(gana)} fichas. `);
        const h = $("#pl-hist"), sp = document.createElement("span");
        sp.style.cssText = `--c:${colorCaja(k)}`; sp.textContent = m + "×"; h.prepend(sp);
        while (h.children.length > 8) h.lastChild.remove();
      }
    }
    b.f.ang += b.f.giro * dt;
    b.rastro.push(plfPos(b.f, t)); if (b.rastro.length > 9) b.rastro.shift();
  });
  pl.bolas = pl.bolas.filter(b => !b.f.fin || ahora - b.t0 < b.f.tFin * 1000 + 250);
  const g = plGeo();
  pl.particulas = pl.particulas.filter(p => (p.vida -= dt) > 0);
  pl.particulas.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g.gap * 9 * dt; p.vx *= 0.99; });
  plDibujar(ahora);
  const vivo = pl.bolas.length || pl.particulas.length || pl.textos.length || pl.ondas.length || pl.sacudida ||
    Object.values(pl.brillo).some(t => ahora - t < 700) || Object.values(pl.flash).some(t => ahora - t < 420);
  if (vivo) requestAnimationFrame(plLoop);
  else { pl.animando = false; pl.ultimo = 0; ocupado = false; bloquear("#pl-riesgo button", false); }
}
$("#pl-soltar").onclick = () => {
  if (!apostar("#pl-msg")) return;
  pl.bolas.push({ f: plfNueva(azar), t0: performance.now(), bet: apuesta, rastro: [] });   // azar = generador justo (nucleo.js)
  ocupado = true; bloquear("#pl-riesgo button", true);
  if (!pl.animando){ pl.animando = true; requestAnimationFrame(plLoop); }
};
grupoOpciones("#pl-riesgo button", b => { pl.riesgo = b.dataset.r; plDibujar(performance.now()); }, () => !pl.bolas.length);
registrarJuego("plinko", { alMostrar: plTam });
