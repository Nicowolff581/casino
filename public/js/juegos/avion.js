/* ═════════ AVIÓN ═════════
   Cada vuelo recoge premios (+ suman, × multiplican) y cohetes (÷2).
   Al final aterriza (cobras apuesta × multiplicador) o cae al mar (pierdes).
   La probabilidad de aterrizar se calcula para devolver el 97 % a largo plazo. */
const AV_OPC = [["+0.2", 0.2, 40], ["+0.5", 0.5, 26], ["+1", 1, 10], ["+2", 2, 3], ["×2", 2, 6], ["×3", 3, 2], ["×5", 5, 0.5]];
const AV_VEL = [0.34, 0.48, 0.66, 0.92];
const AV_NOMBRE = ["Lento", "Normal", "Rápido", "Turbo"];
const AV_TOPE = 250, AV_RTP = 0.97;
const avProbCohete = k => 0.28 - 0.02 * k;
const avPesos = k => AV_OPC.map(o => o[0][0] === "×" ? o[2] * (1 + k * 0.6) : o[2]);
const avEventos = k => 3 + k * 2;                               // cantidad de tamaños posibles de vuelo

function avGenerar(k){
  const n = 4 + azarEntero(avEventos(k)), pesos = avPesos(k);
  let c = 1; const ev = [];
  for (let i = 0; i < n; i++){
    let e;
    if (azar() < avProbCohete(k)) e = { t: "cohete" };
    else { const j = elegirPonderado(pesos); e = { t: AV_OPC[j][0], v: AV_OPC[j][1] }; }
    if (e.t === "cohete") c /= 2; else if (e.t[0] === "+") c += e.v; else c *= e.v;
    c = Math.min(c, AV_TOPE); e.c = c; ev.push(e);
  }
  return { ev, c };
}
// Multiplicador promedio exacto de un vuelo, contando el tope de ×250.
// Recorre todas las combinaciones posibles de eventos con sus probabilidades.
// En Turbo tarda casi medio segundo, por eso su resultado queda guardado en
// AV_MULT_MEDIO; la prueba automática lo recalcula y verifica que coincida.
function avMultEsperado(k){
  const pc = avProbCohete(k), pesos = avPesos(k), tot = pesos.reduce((a, b) => a + b);
  const ops = [[pc, c => c / 2], ...AV_OPC.map((o, j) => [(1 - pc) * pesos[j] / tot, o[0][0] === "×" ? c => c * o[1] : c => c + o[1]])];
  let dist = new Map([[1, 1]]), suma = 0;
  for (let n = 1; n < 4 + avEventos(k); n++){
    const nueva = new Map();
    for (const [c, p] of dist) for (const [q, f] of ops){ const v = Math.round(Math.min(f(c), AV_TOPE) * 1e4) / 1e4; nueva.set(v, (nueva.get(v) || 0) + p * q); }
    dist = nueva;
    if (n >= 4) for (const [c, p] of dist) suma += c * p / avEventos(k);
  }
  return suma;
}
const AV_MULT_MEDIO = [2.208711, 3.037256, 4.462618, 7.022629];
// Probabilidad de aterrizar: así el pago promedio es el 97 % de lo apostado.
const AV_PROB = AV_MULT_MEDIO.map(e => Math.min(0.9, AV_RTP / e));

const av = { estado: "espera", k: 1, bet: 0, vuelo: null, x: 0, c: 1, idx: 0, popups: [], hist: [], last: 0, tFin: 0 };
const avCanvas = $("#av-canvas"), avCtx = avCanvas.getContext("2d");
const ESTRELLAS = Array.from({ length: 70 }, () => ({ x: azar(), y: azar() * 0.6, r: azar() * 1.4 + 0.3, f: azar() * 6 }));
const NUBES = Array.from({ length: 14 }, (_, i) => ({ x: i * 1.3 + azar() * 0.6, y: 0.18 + azar() * 0.5, s: 0.6 + azar() * 0.8, capa: azar() < 0.5 ? 0.3 : 0.6 }));

function avTam(){ if (ajustarCanvas(avCanvas, avCtx)) avDibujar(performance.now()); }
function avPrepararVuelo(g){
  const kp = [[0, 0.42]], ev = g.ev.map(e => ({ ...e }));
  let y = 0.42;
  ev.forEach((e, i) => {
    e.x = 1.5 + i * 1.1;
    y = e.t === "cohete" ? Math.min(0.58, y + 0.1) : 0.14 + azar() * 0.36;
    e.y = y; kp.push([e.x, y]);
  });
  const exito = azar() < AV_PROB[av.k];
  const xL = ev[ev.length - 1].x + 1.6;
  kp.push([xL - 0.5, exito ? 0.62 : 0.66], [xL, exito ? 0.695 : 0.84]);
  return { ev, kp, xL, exito, c: g.c, xBarco: exito ? xL - 0.25 : xL + 0.9 + azar() * 0.8 };
}
function avY(x){
  const kp = av.vuelo ? av.vuelo.kp : [[0, 0.42]];
  if (x <= kp[0][0]) return kp[0][1];
  for (let i = 1; i < kp.length; i++){
    if (x <= kp[i][0]){
      const [x0, y0] = kp[i - 1], [x1, y1] = kp[i], t = (x - x0) / (x1 - x0), s = t * t * (3 - 2 * t);
      return y0 + (y1 - y0) * s;
    }
  }
  return kp[kp.length - 1][1];
}

/* dibujo */
function nube(c, x, y, s, a){
  c.fillStyle = `rgba(210,225,255,${a})`;
  [[0, 0, 26], [24, -10, 22], [48, 0, 24], [22, 8, 24], [-20, 6, 18], [66, 8, 16]].forEach(([dx, dy, r]) => {
    c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
  });
}
function dibujarAvion(c, x, y, ang, u, t){
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(u, u);
  c.fillStyle = "#b5171f"; c.beginPath(); c.roundRect(-14, 6, 36, 7, 3); c.fill();
  c.fillStyle = "#e63946";
  c.beginPath(); c.moveTo(-38, -4); c.quadraticCurveTo(-10, -15, 24, -9); c.lineTo(30, -6); c.lineTo(30, 8); c.lineTo(22, 10); c.quadraticCurveTo(-10, 12, -38, 4); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-30, -3); c.lineTo(-42, -21); c.lineTo(-34, -21); c.lineTo(-22, -4); c.fill();
  c.fillStyle = "#b5171f"; c.fillRect(-46, -1, 18, 4);
  c.fillStyle = "#fff"; c.fillRect(-22, -3, 10, 5);
  c.fillStyle = "#9bd4ff"; c.beginPath(); c.arc(-3, -10, 7, Math.PI, 0); c.fill();
  c.fillStyle = "#6b3e1f"; c.beginPath(); c.arc(-3, -13, 4.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#5a3317"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-9, -18); c.lineTo(-9, 7); c.moveTo(15, -18); c.lineTo(15, 7); c.stroke();
  c.fillStyle = "#ffb703"; c.beginPath(); c.roundRect(-18, -25, 42, 8, 3); c.fill();
  c.fillStyle = "#fb8500"; c.fillRect(28, -7, 5, 14);
  const p = Math.abs(Math.sin(t / 30)) * 17 + 2;
  c.fillStyle = "rgba(235,240,255,.75)"; c.fillRect(33, -p, 3, p * 2);
  c.restore();
}
function dibujarPremio(c, x, y, e, H, t){
  const mult = e.t[0] === "×", r = H * 0.05, bob = Math.sin(t / 300 + e.x * 3) * H * 0.01;
  y += bob;
  const g = c.createRadialGradient(x, y, 0, x, y, r * 1.7);
  g.addColorStop(0, mult ? "rgba(255,210,70,.75)" : "rgba(120,200,255,.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.7, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); c.rotate(t / 1500);
  c.strokeStyle = mult ? "rgba(255,230,140,.55)" : "rgba(190,230,255,.5)"; c.lineWidth = 2;
  for (let i = 0; i < 10; i++){ c.rotate(Math.PI / 5); c.beginPath(); c.moveTo(r * 0.7, 0); c.lineTo(r * 1.35, 0); c.stroke(); }
  c.restore();
  c.font = `800 ${H * (mult ? 0.065 : 0.055)}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = "rgba(0,0,0,.35)"; c.fillText(e.t, x + 2, y + 3);
  c.fillStyle = mult ? "#ffe066" : "#ffffff"; c.fillText(e.t, x, y);
}
function dibujarCohete(c, x, y, H, t){
  const s = H * 0.0014;
  c.save(); c.translate(x, y); c.scale(s, s);
  const f = 14 + Math.sin(t / 40) * 5;
  c.fillStyle = "#ff9f1c"; c.beginPath(); c.moveTo(22, -5); c.lineTo(22 + f, 0); c.lineTo(22, 5); c.fill();
  c.fillStyle = "#ffe066"; c.beginPath(); c.moveTo(22, -3); c.lineTo(22 + f * 0.6, 0); c.lineTo(22, 3); c.fill();
  c.fillStyle = "#dfe6f0"; c.beginPath(); c.roundRect(-18, -6, 40, 12, 4); c.fill();
  c.fillStyle = "#e63946"; c.beginPath(); c.moveTo(-18, -6); c.lineTo(-30, 0); c.lineTo(-18, 6); c.fill();
  c.fillStyle = "#8a96a8"; c.beginPath(); c.moveTo(14, -6); c.lineTo(24, -13); c.lineTo(22, -6); c.fill(); c.beginPath(); c.moveTo(14, 6); c.lineTo(24, 13); c.lineTo(22, 6); c.fill();
  c.restore();
}
function dibujarBarco(c, x, H){
  const y = H * 0.735, L = H * 1.9;
  c.fillStyle = "#56627a"; c.beginPath(); c.moveTo(x - L * 0.12, y); c.lineTo(x + L, y); c.lineTo(x + L * 0.93, H * 0.83); c.lineTo(x - L * 0.02, H * 0.83); c.closePath(); c.fill();
  c.fillStyle = "#3b4558"; c.fillRect(x - L * 0.12, y, L * 1.12, H * 0.018);
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.setLineDash([H * 0.03, H * 0.025]);
  c.beginPath(); c.moveTo(x, y + H * 0.009); c.lineTo(x + L * 0.95, y + H * 0.009); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#6c7891"; c.fillRect(x + L * 0.62, y - H * 0.11, L * 0.12, H * 0.11);
  c.fillStyle = "#4a556b"; c.fillRect(x + L * 0.66, y - H * 0.16, L * 0.03, H * 0.05);
  c.fillStyle = "#ffd166";
  for (let i = 0; i < 3; i++) c.fillRect(x + L * (0.635 + i * 0.035), y - H * 0.085, L * 0.02, H * 0.018);
  c.fillStyle = "#ff4d6d"; c.beginPath(); c.arc(x + L * 0.675, y - H * 0.165, H * 0.008, 0, Math.PI * 2); c.fill();
}
function avDibujar(t){
  const W = avCanvas.clientWidth, H = avCanvas.clientHeight, c = avCtx;
  if (!W) return;
  const camX = av.x - 0.32 * W / H, sx = wx => (wx - camX) * H;
  const cielo = c.createLinearGradient(0, 0, 0, H * 0.8);
  cielo.addColorStop(0, "#081642"); cielo.addColorStop(0.6, "#1b3a86"); cielo.addColorStop(1, "#3a63b8");
  c.fillStyle = cielo; c.fillRect(0, 0, W, H);
  ESTRELLAS.forEach(s => {
    const x = ((s.x * W - camX * H * 0.05) % W + W) % W;
    c.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t / 700 + s.f)})`;
    c.beginPath(); c.arc(x, s.y * H, s.r, 0, Math.PI * 2); c.fill();
  });
  c.fillStyle = "#fff6d5"; c.beginPath(); c.arc(W * 0.85 - camX * H * 0.02 % (W * 0.3), H * 0.14, H * 0.045, 0, Math.PI * 2); c.fill();
  const ciclo = 14 * 1.3;
  NUBES.forEach(n => {
    const base = n.x * H - camX * H * n.capa, per = ciclo * H;
    const x = ((base % per) + per) % per - H * 0.5;
    nube(c, x, n.y * H, n.s * H / 360, n.capa === 0.3 ? 0.12 : 0.22);
  });
  const mar = c.createLinearGradient(0, H * 0.8, 0, H);
  mar.addColorStop(0, "#1a4a9a"); mar.addColorStop(1, "#0a1f4d");
  c.fillStyle = mar; c.fillRect(0, H * 0.8, W, H * 0.2);
  c.strokeStyle = "rgba(170,210,255,.28)"; c.lineWidth = 2;
  for (let fila = 0; fila < 4; fila++){
    const yy = H * (0.82 + fila * 0.045);
    c.beginPath();
    for (let x = 0; x <= W; x += 8){ const w = Math.sin((x + camX * H * (1 + fila * 0.2)) / (18 + fila * 6) + t / 500) * 3; x === 0 ? c.moveTo(x, yy + w) : c.lineTo(x, yy + w); }
    c.stroke();
  }
  const v = av.vuelo;
  if (v) dibujarBarco(c, sx(v.xBarco), H);
  if (v) v.ev.forEach((e, i) => {
    if (i < av.idx) return;
    if (e.t === "cohete"){ if (e.x - av.x < 1.4) dibujarCohete(c, sx(e.x + (e.x - av.x) * 1.2), e.y * H, H, t); }
    else { const x = sx(e.x); if (x > -60 && x < W + 60) dibujarPremio(c, x, e.y * H, e, H, t); }
  });
  let px = sx(av.x), py = avY(av.x) * H;
  const ang = Math.atan2(avY(av.x + 0.05) - avY(av.x - 0.05), 0.1);
  const hundido = av.estado === "final" && !v.exito;
  if (!(hundido && t - av.tFin > 250)) dibujarAvion(c, px, py, av.estado === "final" && v.exito ? 0 : Math.max(-0.5, Math.min(0.6, ang)), H * 0.0024, t);
  if (hundido){
    const e = (t - av.tFin) / 900;
    c.strokeStyle = `rgba(220,240,255,${Math.max(0, 1 - e)})`; c.lineWidth = 3;
    for (let i = 0; i < 3; i++){ c.beginPath(); c.ellipse(px, H * 0.82, (e * 60 + i * 18) * H / 360, (e * 12 + i * 4) * H / 360, 0, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = `rgba(220,240,255,${Math.max(0, 0.9 - e)})`;
    for (let i = 0; i < 7; i++){ const a = -Math.PI * (0.15 + i * 0.1); c.beginPath(); c.arc(px + Math.cos(a) * e * 50, H * 0.82 + Math.sin(a) * e * 70 + e * e * 50, 4, 0, Math.PI * 2); c.fill(); }
  }
  av.popups = av.popups.filter(p => t - p.t0 < 1000);
  av.popups.forEach(p => {
    const e = (t - p.t0) / 1000;
    c.globalAlpha = 1 - e; c.font = `800 ${H * 0.06}px Figtree, sans-serif`; c.textAlign = "center";
    c.fillStyle = p.color; c.fillText(p.txt, px + H * 0.02, py - H * 0.12 - e * H * 0.12);
    c.globalAlpha = 1;
  });
  if (av.estado !== "espera"){
    const txt = fmt(Math.floor(av.bet * av.c)) + "  ×" + av.c.toFixed(2);
    c.font = `800 ${H * 0.04}px Figtree, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    const w = c.measureText(txt).width + H * 0.05, yy = py - H * 0.11;
    c.fillStyle = "rgba(8,22,66,.8)"; c.beginPath(); c.roundRect(px - w / 2, yy - H * 0.03, w, H * 0.06, H * 0.03); c.fill();
    c.fillStyle = "#7dff7a"; c.fillText(txt, px, yy + 1);
  }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  const hud = [["ALTITUD", Math.max(0, Math.round((0.8 - avY(av.x)) * 180)) + " m"], ["DISTANCIA", Math.round(av.x * 45) + " m"], ["MULTIPLICADOR", "×" + av.c.toFixed(2)]];
  const bw = H * 0.26, bh = H * 0.11;
  hud.forEach(([k, val], i) => {
    const x = H * 0.03 + i * (bw + H * 0.02), y = H * 0.03;
    c.fillStyle = "rgba(8,22,66,.65)"; c.beginPath(); c.roundRect(x, y, bw, bh, 8); c.fill();
    c.fillStyle = "#9fb4e6"; c.font = `700 ${H * 0.028}px Figtree, sans-serif`; c.fillText(k, x + H * 0.02, y + H * 0.04);
    c.fillStyle = "#fff"; c.font = `800 ${H * 0.042}px Figtree, sans-serif`; c.fillText(val, x + H * 0.02, y + H * 0.088);
  });
}
function avAplicar(e, t){
  av.c = e.c;
  if (e.t === "cohete") av.popups.push({ txt: "💥 ÷2", color: "#ff6b6b", t0: t });
  else av.popups.push({ txt: e.t, color: e.t[0] === "×" ? "#ffe066" : "#9fe7ff", t0: t });
}
function avFrame(t){
  const dt = Math.min(0.05, (t - av.last) / 1000); av.last = t;
  const v = av.vuelo;
  if (av.estado === "vuelo"){
    av.x += AV_VEL[av.k] * dt;
    while (av.idx < v.ev.length && av.x >= v.ev[av.idx].x){ avAplicar(v.ev[av.idx], t); av.idx++; }
    if (av.x >= v.xL){ av.x = v.xL; av.estado = "final"; av.tFin = t; avResolver(); }
  } else if (av.estado === "final" && v.exito){
    av.x += AV_VEL[av.k] * dt * Math.max(0, 1 - (t - av.tFin) / 1200);
  }
  avDibujar(t);
  if (av.estado === "vuelo" || (av.estado === "final" && t - av.tFin < 1400)) requestAnimationFrame(avFrame);
  else avTerminar();
}
function avResolver(){
  const v = av.vuelo;
  const pagado = v.exito ? Math.floor(av.bet * v.c) : 0;
  v.tipo = liquidar("#av-msg", pagado, av.bet, v.exito ? `Aterrizó en el portaaviones con ×${v.c.toFixed(2)}. ` : "El avión cayó al agua. ");
  // Solo se celebra en verde si recibes más de lo que apostaste.
  const cartel = $("#av-mult");
  if (!v.exito){ cartel.className = "av-mult fin"; cartel.innerHTML = `Cayó al mar<small>Tenía ×${v.c.toFixed(2)}</small>`; }
  else if (v.tipo === "win"){ cartel.className = "av-mult ok"; cartel.innerHTML = `¡Aterrizó! ×${v.c.toFixed(2)}<small>+${fmt(pagado - av.bet)} fichas</small>`; }
  else { cartel.className = "av-mult med"; cartel.innerHTML = `Aterrizó con ×${v.c.toFixed(2)}<small>Recuperas ${fmt(pagado)} de ${fmt(av.bet)}</small>`; }
  av.hist.unshift(v); av.hist = av.hist.slice(0, 10);
  $("#av-hist").innerHTML = av.hist.map(h => `<span class="${h.tipo === "win" ? "si" : h.exito ? "med" : "no"}">${h.exito ? "✓" : "✗"} ×${h.c.toFixed(2)}</span>`).join("");
}
function avTerminar(){
  av.estado = "espera"; ocupado = false;
  $("#av-btn").disabled = false; $("#av-btn").textContent = "Despegar";
  bloquear("#av-vel button", false);
}
function avNota(){
  $("#av-nota").textContent = `${AV_NOMBRE[av.k]}: aterriza en el portaaviones más o menos ${Math.round(AV_PROB[av.k] * 100)} de cada 100 vuelos. Más velocidad trae premios más grandes, pero cae al mar más seguido.`;
}
grupoOpciones("#av-vel button", b => { av.k = +b.dataset.k; avNota(); }, () => av.estado === "espera");
avNota();
$("#av-btn").onclick = () => {
  if (av.estado !== "espera" || ocupado || !apostar("#av-msg")) return;
  ocupado = true; av.bet = apuesta; av.x = 0; av.c = 1; av.idx = 0; av.popups = [];
  av.vuelo = avPrepararVuelo(avGenerar(av.k));
  av.estado = "vuelo"; av.last = performance.now();
  msg("#av-msg", ""); $("#av-mult").innerHTML = "";
  $("#av-btn").disabled = true; $("#av-btn").textContent = "Volando…";
  bloquear("#av-vel button", true);
  requestAnimationFrame(avFrame);
};
registrarJuego("avion", { alMostrar: avTam });
