/* ═════════ PLINKO ═════════
   La bola cruza 12 filas de clavos; en cada una va a la izquierda o a la derecha
   con 50 % de probabilidad. La casilla final es el número de rebotes a la derecha (0 a 12). */
const PL_FILAS = 12, SEG = 120;
const PL_TABLAS = {
  bajo:  [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  medio: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
  alto:  [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
};
const pl = { riesgo: "medio", bolas: [], brillo: {}, flash: {}, animando: false };
const plCanvas = $("#pl-canvas"), plCtx = plCanvas.getContext("2d");
function plTam(){ if (ajustarCanvas(plCanvas, plCtx)) plDibujar(performance.now()); }
function plGeo(){
  const W = plCanvas.clientWidth, H = plCanvas.clientHeight;
  const gap = Math.min(W / (PL_FILAS + 2), (H - 30) / (PL_FILAS + 1.6));
  return { W, H, gap, cx: W / 2, top: gap * 0.9 };
}
function plPuntos(b, g){
  const pts = [[g.cx, 0]]; let k = 0;
  for (let r = 0; r < PL_FILAS; r++){ pts.push([g.cx + (k - r / 2) * g.gap, g.top + r * g.gap - g.gap * 0.32]); k += b.dirs[r]; }
  pts.push([g.cx + (k - PL_FILAS / 2) * g.gap, g.top + PL_FILAS * g.gap + g.gap * 0.1]);
  return pts;
}
function colorCaja(k){
  const t = Math.abs(k - PL_FILAS / 2) / (PL_FILAS / 2);
  const a = [255, 200, 0], b = [255, 0, 63];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}
function plDibujar(ahora){
  const g = plGeo(), c = plCtx, tabla = PL_TABLAS[pl.riesgo];
  c.clearRect(0, 0, g.W, g.H);
  const rp = Math.max(2.5, g.gap * 0.11);
  for (let r = 0; r < PL_FILAS; r++) for (let i = 0; i < r + 3; i++){
    const x = g.cx + (i - (r + 2) / 2) * g.gap, y = g.top + r * g.gap, f = pl.flash[r + "-" + i], on = f && ahora - f < 220;
    if (on){ c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.arc(x, y, rp * 2.6 * (1 - (ahora - f) / 220) + rp, 0, Math.PI * 2); c.fill(); }
    const gr = c.createRadialGradient(x - rp * 0.35, y - rp * 0.35, 0, x, y, rp);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, on ? "#ffe066" : "#9fb0c8");
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, on ? rp * 1.25 : rp, 0, Math.PI * 2); c.fill();
  }
  const yc = g.top + (PL_FILAS - 0.35) * g.gap + g.gap * 0.6, w = g.gap * 0.9, h = g.gap * 0.72;
  tabla.forEach((m, k) => {
    const x = g.cx + (k - PL_FILAS / 2) * g.gap, d = pl.brillo[k] ? ahora - pl.brillo[k] : 999, salto = d < 300 ? Math.sin(d / 300 * Math.PI) * g.gap * 0.18 : 0;
    const col = colorCaja(k);
    c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.roundRect(x - w / 2, yc + g.gap * 0.08, w, h, 5); c.fill();
    const gr = c.createLinearGradient(0, yc + salto, 0, yc + salto + h);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,.25)");
    c.fillStyle = col; c.beginPath(); c.roundRect(x - w / 2, yc + salto, w, h, 5); c.fill();
    c.fillStyle = gr; c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x - w / 2 + 3, yc + salto + 2, w - 6, 2);
    c.fillStyle = "#0f212e"; c.font = `800 ${Math.max(9, g.gap * 0.3)}px Manrope, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(m + (m < 100 ? "×" : ""), x, yc + h / 2 + salto + 1);
  });
  pl.bolas.forEach(b => {
    const pts = plPuntos(b, g), e = ahora - b.t0, s = Math.min(Math.floor(e / SEG), pts.length - 2), t = Math.min(1, (e - s * SEG) / SEG);
    const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t * t - (s > 0 ? g.gap * 0.28 * Math.sin(Math.PI * t) : 0), rb = g.gap * 0.23;
    const gr = c.createRadialGradient(x - rb * 0.4, y - rb * 0.4, 0, x, y, rb);
    gr.addColorStop(0, "#ffd0dc"); gr.addColorStop(0.4, "#ff3b6b"); gr.addColorStop(1, "#a0103a");
    c.fillStyle = "rgba(255,59,107,.25)"; c.beginPath(); c.arc(x, y, rb * 1.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, rb, 0, Math.PI * 2); c.fill();
  });
}
function plLoop(ahora){
  const tabla = PL_TABLAS[pl.riesgo];
  pl.bolas.forEach(b => {
    const s = Math.floor((ahora - b.t0) / SEG);
    if (s >= 1 && s <= PL_FILAS && b.ult !== s){
      b.ult = s; const fila = s - 1, k = b.dirs.slice(0, fila).reduce((a, x) => a + x, 0);
      pl.flash[fila + "-" + (k + 1)] = ahora; sonido.clavo(fila);
    }
  });
  pl.bolas = pl.bolas.filter(b => {
    if (ahora - b.t0 < SEG * (PL_FILAS + 1)) return true;
    const k = b.dirs.reduce((a, x) => a + x, 0), m = tabla[k], gana = Math.floor(b.bet * m);
    pl.brillo[k] = ahora;
    liquidar("#pl-msg", gana, b.bet, `${m}× → ${fmt(gana)} fichas. `);
    const h = $("#pl-hist"), sp = document.createElement("span");
    sp.style.background = colorCaja(k); sp.textContent = m + "×"; h.prepend(sp);
    while (h.children.length > 7) h.lastChild.remove();
    return false;
  });
  plDibujar(ahora);
  const brillando = Object.values(pl.brillo).some(t => ahora - t < 320);
  if (pl.bolas.length || brillando) requestAnimationFrame(plLoop);
  else { pl.animando = false; ocupado = false; bloquear("#pl-riesgo button", false); }
}
$("#pl-soltar").onclick = () => {
  if (!apostar("#pl-msg")) return;
  pl.bolas.push({ dirs: Array.from({ length: PL_FILAS }, () => azar() < 0.5 ? 0 : 1), t0: performance.now(), bet: apuesta });
  ocupado = true; bloquear("#pl-riesgo button", true);
  if (!pl.animando){ pl.animando = true; requestAnimationFrame(plLoop); }
};
grupoOpciones("#pl-riesgo button", b => { pl.riesgo = b.dataset.r; plDibujar(performance.now()); }, () => !pl.bolas.length);
registrarJuego("plinko", { alMostrar: plTam });
