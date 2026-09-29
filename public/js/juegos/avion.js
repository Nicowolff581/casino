/* ═════════ AVIÓN ═════════
   Un avión de doble piso despega y en el camino recoge premios (+ suman, × multiplican)
   y cohetes (÷2). Al final llega a destino (cobras apuesta × multiplicador) o entra
   en una tormenta (pierdes). La probabilidad de llegar se calcula para devolver el 97 %.
   Juego justo: todo el vuelo sale de un número secreto cuya huella se muestra antes. */
const AV_OPC = [["+0.2", 0.2, 40], ["+0.5", 0.5, 26], ["+1", 1, 10], ["+2", 2, 3], ["×2", 2, 6], ["×3", 3, 2], ["×5", 5, 0.5]];
const AV_VEL = [0.34, 0.48, 0.66, 0.92];
const AV_NOMBRE = ["Lento", "Normal", "Rápido", "Turbo"];
const AV_TOPE = 250, AV_RTP = 0.97;
const avProbCohete = k => 0.28 - 0.02 * k;
const avPesos = k => AV_OPC.map(o => o[0][0] === "×" ? o[2] * (1 + k * 0.6) : o[2]);
const avEventos = k => 3 + k * 2;                               // cantidad de tamaños posibles de vuelo

function avGenerar(k, rnd = azar){
  const n = 4 + Math.floor(rnd() * avEventos(k)), pesos = avPesos(k);
  let c = 1; const ev = [];
  for (let i = 0; i < n; i++){
    let e;
    if (rnd() < avProbCohete(k)) e = { t: "cohete" };
    else { const j = elegirPonderado(pesos, rnd); e = { t: AV_OPC[j][0], v: AV_OPC[j][1] }; }
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

// Sorteo completo de un vuelo a partir del número secreto (siempre da lo mismo con el mismo secreto).
function avSortear(k, secreto){
  const rnd = azarDesde(secreto), g = avGenerar(k, rnd);
  g.exito = rnd() < AV_PROB[k];
  return g;
}

/* ── estado y escena ── */
const av = { estado: "espera", k: 1, bet: 0, vuelo: null, x: 0, y: 0, ang: 0, c: 1, idx: 0, popups: [], hist: [], last: 0, tFin: 0, camX: -0.25, estela: [], prox: null, num: 0 };
const avCanvas = $("#av-canvas"), avCtx = avCanvas.getContext("2d");
const SUELO = 0.8, Y_PISTA = 0.756, ESCALA = 0.0019, FIN_PISTA = 1.15;   // 1 unidad del mundo = alto del lienzo
const ESTRELLAS = Array.from({ length: 70 }, () => ({ x: azar(), y: azar() * 0.6, r: azar() * 1.4 + 0.3, f: azar() * 6 }));
const NUBES = Array.from({ length: 14 }, (_, i) => ({ x: i * 1.3 + azar() * 0.6, y: 0.18 + azar() * 0.5, s: 0.6 + azar() * 0.8, capa: azar() < 0.5 ? 0.3 : 0.6 }));
av.y = Y_PISTA;

function avTam(){ if (ajustarCanvas(avCanvas, avCtx)) avDibujar(performance.now()); }
// Posiciones en pantalla de premios y cohetes (solo decoración: no cambian el resultado).
function avPrepararVuelo(g){
  const kp = [[0, Y_PISTA], [0.6, Y_PISTA], [1.3, 0.5]], ev = g.ev.map(e => ({ ...e }));
  let y = 0.42;
  ev.forEach((e, i) => {
    e.x = 1.9 + i * 1.1;
    y = e.t === "cohete" ? Math.min(0.58, y + 0.1) : 0.16 + azar() * 0.34;
    e.y = y; kp.push([e.x, y]);
  });
  const xL = ev[ev.length - 1].x + 1.5;
  kp.push([xL, 0.36]);
  return { ...g, ev, kp, xL };
}
function avY(x){
  const kp = av.vuelo ? av.vuelo.kp : [[0, Y_PISTA]];
  if (x <= kp[0][0]) return kp[0][1];
  for (let i = 1; i < kp.length; i++){
    if (x <= kp[i][0]){
      const [x0, y0] = kp[i - 1], [x1, y1] = kp[i], t = (x - x0) / (x1 - x0), s = t * t * (3 - 2 * t);
      return y0 + (y1 - y0) * s;
    }
  }
  return kp[kp.length - 1][1];
}

/* ── dibujo del avión de doble piso (vista lateral, mirando a la derecha) ──
   Medidas en unidades propias: 210 de largo. Colores de Casino Nico, sin logos de marcas. */
const A_MOTORES = [[-11, 21], [-34, 32], [-31, -21]];       // salida de 3 motores visibles (para la estela)
function motor(c, x, y, lejos){
  c.save(); c.translate(x, y);
  c.fillStyle = lejos ? "#8d8779" : "#e9e2d0";
  c.beginPath(); c.roundRect(-12, -5, 25, 10, 5); c.fill();
  c.fillStyle = lejos ? "#6b1422" : "#7a1a2a"; c.fillRect(-4, -5, 7, 10);           // franja borgoña
  c.fillStyle = "#1a1510"; c.beginPath(); c.ellipse(12, 0, 2.6, 4.6, 0, 0, Math.PI * 2); c.fill();   // entrada de aire
  c.strokeStyle = "#d8b25a"; c.lineWidth = 1; c.beginPath(); c.ellipse(12, 0, 2.6, 4.6, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#4a4438"; c.beginPath(); c.moveTo(-12, -3); c.lineTo(-17, -1.5); c.lineTo(-17, 1.5); c.lineTo(-12, 3); c.fill();   // tobera
  c.restore();
}
function dibujarA380(c, x, y, ang, u, tren){
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(u, u);
  // ala lejana y sus motores (detrás del fuselaje)
  c.fillStyle = "#a59d8a";
  c.beginPath(); c.moveTo(16, -8); c.lineTo(-26, -6); c.lineTo(-58, -34); c.lineTo(-46, -35); c.closePath(); c.fill();
  motor(c, 1, -12, true); motor(c, -19, -22, true);
  // estabilizador horizontal lejano
  c.fillStyle = "#a59d8a"; c.beginPath(); c.moveTo(-80, -9); c.lineTo(-102, -24); c.lineTo(-108, -23); c.lineTo(-100, -8); c.fill();
  // tren de aterrizaje (se recoge después de despegar)
  if (tren > 0){
    c.strokeStyle = "#5c574b"; c.lineWidth = 2.2; c.fillStyle = "#15120e";
    [[70, 1], [8, 1], [-8, 1]].forEach(([gx]) => {
      c.beginPath(); c.moveTo(gx, 8); c.lineTo(gx, 8 + 9 * tren); c.stroke();
      c.beginPath(); c.arc(gx - 2.5, 8 + 10 * tren, 3.2 * tren, 0, Math.PI * 2); c.arc(gx + 3, 8 + 10 * tren, 3.2 * tren, 0, Math.PI * 2); c.fill();
    });
  }
  // fuselaje de doble piso
  const cuerpo = new Path2D();
  cuerpo.moveTo(-100, -7); cuerpo.quadraticCurveTo(-82, -15, -60, -15); cuerpo.lineTo(68, -15);
  cuerpo.bezierCurveTo(88, -15, 100, -8, 102, 0); cuerpo.bezierCurveTo(102, 6, 96, 9, 84, 9);
  cuerpo.lineTo(-40, 9); cuerpo.quadraticCurveTo(-76, 9, -100, -3); cuerpo.closePath();
  const g = c.createLinearGradient(0, -15, 0, 9);
  g.addColorStop(0, "#fbf6e9"); g.addColorStop(0.55, "#efe7d4"); g.addColorStop(1, "#c9c0aa");
  c.fillStyle = g; c.fill(cuerpo);
  c.save(); c.clip(cuerpo);
  c.fillStyle = "#7a1a2a"; c.fillRect(-110, 4, 220, 8);                  // panza borgoña
  c.fillStyle = "#d8b25a"; c.fillRect(-110, 3, 220, 1.2);                // línea dorada
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-110, -13.5, 220, 2); // brillo del techo
  c.restore();
  // ventanas: piso de arriba y piso de abajo, con puertas
  c.fillStyle = "#23303d";
  for (let wx = -60; wx <= 72; wx += 4.4) c.fillRect(wx, -9.5, 2.2, 2.4);
  for (let wx = -70; wx <= 82; wx += 4.4) c.fillRect(wx, -2, 2.2, 2.4);
  c.strokeStyle = "rgba(90,80,60,.55)"; c.lineWidth = 0.8;
  [-52, -14, 26, 62].forEach(dx => { c.strokeRect(dx, -11, 3.4, 6); c.strokeRect(dx - 6, -3.5, 3.4, 6.5); });
  // cabina
  c.fillStyle = "#1c2733"; c.beginPath(); c.moveTo(88, -7.5); c.lineTo(96, -5.5); c.lineTo(95, -3.2); c.lineTo(87, -4.6); c.closePath(); c.fill();
  // timón vertical con el logo propio de Casino Nico
  c.fillStyle = "#7a1a2a";
  c.beginPath(); c.moveTo(-64, -14); c.lineTo(-92, -58); c.lineTo(-104, -58); c.lineTo(-101, -8); c.closePath(); c.fill();
  c.fillStyle = "#d8b25a"; c.fillRect(-103.5, -58, 11.5, 2);
  c.beginPath(); c.arc(-91, -34, 7.5, 0, Math.PI * 2); c.fillStyle = "#132820"; c.fill();
  c.strokeStyle = "#d8b25a"; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = "#f7f0de"; c.lineWidth = 1.8; c.lineJoin = "round"; c.lineCap = "round";
  c.beginPath(); c.moveTo(-94, -30.5); c.lineTo(-94, -37.5); c.lineTo(-88, -30.5); c.lineTo(-88, -37.5); c.stroke();
  // estabilizador horizontal cercano
  c.fillStyle = "#d9d1bd"; c.beginPath(); c.moveTo(-78, -3); c.lineTo(-104, 10); c.lineTo(-110, 9); c.lineTo(-98, -4); c.fill();
  // ala cercana (grande) con winglet y sus 2 motores
  const ala = c.createLinearGradient(0, 6, 0, 42); ala.addColorStop(0, "#e2dac6"); ala.addColorStop(1, "#b7ae98");
  c.fillStyle = ala; c.beginPath(); c.moveTo(24, 6); c.lineTo(-30, 7); c.lineTo(-70, 40); c.lineTo(-54, 41); c.closePath(); c.fill();
  c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-8, 8); c.lineTo(-58, 39); c.stroke();
  c.fillStyle = "#7a1a2a"; c.beginPath(); c.moveTo(-54, 41); c.lineTo(-70, 40); c.lineTo(-72, 46); c.lineTo(-60, 46); c.closePath(); c.fill();
  motor(c, 7, 21, false); motor(c, -16, 32, false);
  c.restore();
}

/* ── otros elementos del paisaje ── */
function nube(c, x, y, s, a, color = "210,225,255"){
  c.fillStyle = `rgba(${color},${a})`;
  [[0, 0, 26], [24, -10, 22], [48, 0, 24], [22, 8, 24], [-20, 6, 18], [66, 8, 16]].forEach(([dx, dy, r]) => {
    c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
  });
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
  c.font = `800 ${H * (mult ? 0.065 : 0.055)}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
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
// Aeropuerto de salida: tierra, pista con marcas y luces, y torre de control.
function dibujarAeropuerto(c, sx, H, t){
  const x0 = sx(-3), x1 = sx(FIN_PISTA), y = SUELO * H;
  if (x1 < 0) return;
  c.fillStyle = "#16241c"; c.fillRect(x0, y - H * 0.004, x1 - x0, H);
  c.fillStyle = "#2b2f33"; c.fillRect(x0, y - H * 0.004, x1 - x0, H * 0.035);
  c.fillStyle = "rgba(255,255,255,.75)";
  for (let wx = -2.9; wx < FIN_PISTA - 0.1; wx += 0.18) c.fillRect(sx(wx), y + H * 0.012, H * 0.07, H * 0.006);
  for (let wx = -2.95; wx < FIN_PISTA; wx += 0.12){
    const on = 0.55 + 0.45 * Math.sin(t / 250 - wx * 6);
    c.fillStyle = `rgba(255,214,120,${on})`; c.beginPath(); c.arc(sx(wx), y - H * 0.002, H * 0.004, 0, Math.PI * 2); c.fill();
  }
  const tx = sx(-0.55);
  c.fillStyle = "#39443d"; c.fillRect(tx, y - H * 0.2, H * 0.028, H * 0.2);
  c.fillStyle = "#4e5b52"; c.beginPath(); c.moveTo(tx - H * 0.02, y - H * 0.2); c.lineTo(tx + H * 0.048, y - H * 0.2); c.lineTo(tx + H * 0.04, y - H * 0.25); c.lineTo(tx - H * 0.012, y - H * 0.25); c.fill();
  c.fillStyle = "rgba(160,220,255,.55)"; c.fillRect(tx - H * 0.008, y - H * 0.24, H * 0.044, H * 0.025);
  c.fillStyle = Math.sin(t / 300) > 0 ? "#ff5a6e" : "#5a1f28"; c.beginPath(); c.arc(tx + H * 0.014, y - H * 0.26, H * 0.006, 0, Math.PI * 2); c.fill();
}
// Final del vuelo: banco de nubes que se abre (destino dorado) o se oscurece (tormenta).
function dibujarFinal(c, x, H, t){
  const v = av.vuelo; if (!v) return;
  const resuelto = av.estado === "final", e = resuelto ? Math.min(1, (t - av.tFin) / 600) : 0, y = 0.36 * H;
  if (resuelto && v.exito){
    const g = c.createRadialGradient(x, y, 0, x, y, H * 0.5 * (0.4 + e));
    g.addColorStop(0, `rgba(255,220,130,${0.55 * e})`); g.addColorStop(1, "rgba(255,220,130,0)");
    c.fillStyle = g; c.fillRect(x - H, 0, H * 2, H);
    c.strokeStyle = `rgba(239,210,142,${e})`; c.lineWidth = H * 0.012;
    c.beginPath(); c.ellipse(x, y, H * 0.11, H * 0.2, 0, 0, Math.PI * 2); c.stroke();
    c.font = `800 ${H * 0.05}px "Playfair Display", Georgia, serif`; c.textAlign = "center"; c.fillStyle = `rgba(255,236,190,${e})`;
    c.fillText("DESTINO", x, y + H * 0.27);
  }
  const oscuro = resuelto && !v.exito ? e : 0, a = resuelto && v.exito ? 0.35 * (1 - e) : 0.55;
  const color = oscuro ? `${Math.round(120 - 80 * oscuro)},${Math.round(130 - 90 * oscuro)},${Math.round(160 - 100 * oscuro)}` : "150,165,200";
  for (let i = 0; i < 5; i++) nube(c, x - H * 0.12 + (i % 3) * H * 0.07, y - H * 0.14 + i * H * 0.07, H / 300, oscuro ? 0.9 : a, color);
  if (oscuro && Math.sin(t / 45) > 0.55){                                     // rayos
    c.strokeStyle = "#fff6c9"; c.lineWidth = H * 0.008; c.lineJoin = "round";
    c.beginPath(); let rx = x + H * 0.02, ry = y - H * 0.02; c.moveTo(rx, ry);
    for (let i = 0; i < 5; i++){ rx += (i % 2 ? 1 : -1) * H * 0.03; ry += H * 0.05; c.lineTo(rx, ry); }
    c.stroke();
    c.fillStyle = "rgba(255,255,230,.12)"; c.fillRect(0, 0, avCanvas.clientWidth, H);
  }
}
// Estela blanca de los motores (se desvanece con el tiempo).
function dibujarEstela(c, sx, H, u){
  const n = av.estela.length; if (n < 2) return;
  A_MOTORES.forEach(([lx, ly], m) => {
    let prev = null;
    av.estela.forEach((p, i) => {
      const cs = Math.cos(p.ang), sn = Math.sin(p.ang);
      const px = sx(p.x) + (lx * cs - ly * sn) * u, py = p.y * H + (lx * sn + ly * cs) * u;
      if (prev){
        const edad = 1 - i / n;
        c.strokeStyle = `rgba(245,245,255,${(m === 2 ? 0.22 : 0.4) * (1 - edad)})`;
        c.lineWidth = (1.5 + edad * 5) * u / 0.9;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(px, py); c.stroke();
      }
      prev = [px, py];
    });
  });
}

function avDibujar(t){
  const W = avCanvas.clientWidth, H = avCanvas.clientHeight, c = avCtx;
  if (!W) return;
  const camX = av.camX, sx = wx => (wx - camX) * H, u = H * ESCALA;
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
  const mar = c.createLinearGradient(0, H * SUELO, 0, H);
  mar.addColorStop(0, "#1a4a9a"); mar.addColorStop(1, "#0a1f4d");
  c.fillStyle = mar; c.fillRect(0, H * SUELO, W, H * (1 - SUELO));
  c.strokeStyle = "rgba(170,210,255,.28)"; c.lineWidth = 2;
  for (let fila = 0; fila < 4; fila++){
    const yy = H * (SUELO + 0.02 + fila * 0.045);
    c.beginPath();
    for (let x = 0; x <= W; x += 8){ const w = Math.sin((x + camX * H * (1 + fila * 0.2)) / (18 + fila * 6) + t / 500) * 3; x === 0 ? c.moveTo(x, yy + w) : c.lineTo(x, yy + w); }
    c.stroke();
  }
  dibujarAeropuerto(c, sx, H, t);
  const v = av.vuelo;
  if (v){
    const xf = sx(v.xL); if (xf > -H && xf < W + H) dibujarFinal(c, xf, H, t);
    v.ev.forEach((e, i) => {
      if (i < av.idx) return;
      if (e.t === "cohete"){ if (e.x - av.x < 1.4) dibujarCohete(c, sx(e.x + (e.x - av.x) * 1.2), e.y * H, H, t); }
      else { const x = sx(e.x); if (x > -60 && x < W + 60) dibujarPremio(c, x, e.y * H, e, H, t); }
    });
  }
  dibujarEstela(c, sx, H, u);
  const px = sx(av.x), py = av.y * H;
  const tren = av.x < 0.95 ? 1 : Math.max(0, 1 - (av.x - 0.95) / 0.25);
  const temblor = av.estado === "final" && v && !v.exito && t - av.tFin < 900 ? Math.sin(t / 25) * H * 0.006 : 0;
  dibujarA380(c, px, py + temblor, av.ang, u, tren);
  av.popups = av.popups.filter(p => t - p.t0 < 1000);
  av.popups.forEach(p => {
    const e = (t - p.t0) / 1000;
    c.globalAlpha = 1 - e; c.font = `800 ${H * 0.06}px Manrope, sans-serif`; c.textAlign = "center";
    c.fillStyle = p.color; c.fillText(p.txt, px + H * 0.02, py - H * 0.14 - e * H * 0.12);
    c.globalAlpha = 1;
  });
  if (av.estado === "vuelo"){
    const txt = fmt(Math.floor(av.bet * av.c)) + "  ×" + av.c.toFixed(2);
    c.font = `800 ${H * 0.04}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    const w = c.measureText(txt).width + H * 0.05, yy = py - H * 0.13;
    c.fillStyle = "rgba(8,22,66,.8)"; c.beginPath(); c.roundRect(px - w / 2, yy - H * 0.03, w, H * 0.06, H * 0.03); c.fill();
    c.fillStyle = "#7ee29a"; c.fillText(txt, px, yy + 1);
  }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  const hud = [["ALTITUD", Math.max(0, Math.round((Y_PISTA - av.y) * 30000)) + " pies"], ["DISTANCIA", Math.max(0, Math.round(av.x * 80)) + " km"], ["MULTIPLICADOR", "×" + av.c.toFixed(2)]];
  const bw = H * 0.26, bh = H * 0.11;
  hud.forEach(([k, val], i) => {
    const x = H * 0.03 + i * (bw + H * 0.02), y = H * 0.03;
    c.fillStyle = "rgba(8,22,66,.65)"; c.beginPath(); c.roundRect(x, y, bw, bh, 8); c.fill();
    c.fillStyle = "#9fb4e6"; c.font = `700 ${H * 0.028}px Manrope, sans-serif`; c.fillText(k, x + H * 0.02, y + H * 0.04);
    c.fillStyle = "#fff"; c.font = `800 ${H * 0.042}px Manrope, sans-serif`; c.fillText(val, x + H * 0.02, y + H * 0.088);
  });
}

/* ── animación ── */
function avAplicar(e, t){
  av.c = e.c;
  if (e.t === "cohete"){ av.popups.push({ txt: "💥 ÷2", color: "#ff6b6b", t0: t }); sonido.pierde(); }
  else { av.popups.push({ txt: e.t, color: e.t[0] === "×" ? "#ffe066" : "#9fe7ff", t0: t }); sonido.clavo(e.t[0] === "×" ? 8 : 4); }
}
function avFrame(t){
  const dt = Math.min(0.05, (t - av.last) / 1000); av.last = t;
  const v = av.vuelo, W = avCanvas.clientWidth, H = avCanvas.clientHeight || 1;
  if (av.estado === "vuelo"){
    const arranque = Math.min(1, 0.35 + av.x / 0.9);                   // acelera por la pista
    av.x += AV_VEL[av.k] * dt * arranque;
    while (av.idx < v.ev.length && av.x >= v.ev[av.idx].x){ avAplicar(v.ev[av.idx], t); av.idx++; }
    av.y = avY(av.x);
    av.ang = Math.max(-0.35, Math.min(0.35, Math.atan2(avY(av.x + 0.05) - avY(av.x - 0.05), 0.1)));
    av.camX = Math.max(-0.25, av.x - 0.32 * W / H);
    if (av.x >= v.xL){ av.x = v.xL; av.estado = "final"; av.tFin = t; avResolver(); }
  } else if (av.estado === "final"){
    // se va volando fuera de la pantalla (la cámara ya no lo sigue)
    const e = (t - av.tFin) / 1000;
    av.x += AV_VEL[av.k] * dt * (1.2 + e * 2.2);
    if (v.exito){ av.y -= dt * (0.08 + e * 0.35); av.ang = Math.max(-0.4, av.ang - dt * 0.5); }
    else if (e > 0.9){ av.y += dt * 0.05 * Math.sin(e * 3); av.ang = Math.min(0.12, av.ang + dt * 0.2); }
  }
  if (av.estado !== "espera" && av.x > 0.62){ av.estela.push({ x: av.x, y: av.y, ang: av.ang }); if (av.estela.length > 70) av.estela.shift(); }
  avDibujar(t);
  const fuera = (av.x - av.camX) * H - 0.2 * H > W || av.y < -0.25;
  if (av.estado === "vuelo" || (av.estado === "final" && !fuera && t - av.tFin < 6000)) requestAnimationFrame(avFrame);
  else avTerminar();
}
function avResolver(){
  const v = av.vuelo, r = av.actual;
  const pagado = v.exito ? Math.floor(av.bet * v.c) : 0;
  v.tipo = liquidar("#av-msg", pagado, av.bet, v.exito ? `Llegó a destino con ×${v.c.toFixed(2)}. ` : "Entró en una tormenta y se desvió. ");
  if (!v.exito) sonido.tope();
  // Solo se celebra en verde si recibes más de lo que apostaste.
  const cartel = $("#av-mult");
  if (!v.exito){ cartel.className = "av-mult fin"; cartel.innerHTML = `Tormenta<small>Tenía ×${v.c.toFixed(2)} · pierdes la apuesta</small>`; }
  else if (v.tipo === "win"){ cartel.className = "av-mult ok"; cartel.innerHTML = `¡Destino! ×${v.c.toFixed(2)}<small>+${fmt(pagado - av.bet)} fichas</small>`; }
  else { cartel.className = "av-mult med"; cartel.innerHTML = `Llegó con ×${v.c.toFixed(2)}<small>Recuperas ${fmt(pagado)} de ${fmt(av.bet)}</small>`; }
  Object.assign(r, { c: v.c, exito: v.exito, tipo: v.tipo, pagado });
  av.hist.unshift(r); av.hist = av.hist.slice(0, 20);
  avPintarHistorial(); avPintarJusto(r);
}
function avTerminar(){
  av.estado = "espera"; ocupado = false;
  $("#av-btn").disabled = false; $("#av-btn").textContent = "Despegar";
  bloquear("#av-vel button", false);
  avNuevoSecreto();
}

/* ── juego justo: huella antes del vuelo, secreto después ── */
function avNuevoSecreto(){
  const secreto = secretoAzar();
  av.prox = { secreto, huella: sha256(secreto) };
  $("#av-huella").textContent = av.prox.huella;
}
function avComprobar(r){
  const huellaOk = sha256(r.secreto) === r.huella, g = avSortear(r.k, r.secreto);
  return { huellaOk, resultadoOk: g.exito === r.exito && Math.abs(g.c - r.c) < 1e-9, g };
}
function avPintarJusto(r){
  const caja = $("#av-revelado");
  if (!r){ caja.innerHTML = ""; return; }
  caja.innerHTML = `<div class="justo-fila"><span>Vuelo #${r.num} · ${AV_NOMBRE[r.k]}</span><b class="${r.tipo === "win" ? "si" : r.exito ? "med" : "no"}">${r.exito ? "Destino" : "Tormenta"} ×${r.c.toFixed(2)}</b></div>
    <div class="justo-fila"><span>Huella mostrada antes</span><code>${r.huella}</code></div>
    <div class="justo-fila"><span>Número secreto</span><code>${r.secreto}</code></div>
    <div class="justo-acciones"><button class="btn sec btn-chico" id="av-comprobar">Comprobar</button><span id="av-comprobado" aria-live="polite"></span></div>`;
  $("#av-comprobar").onclick = () => {
    const k = avComprobar(r);
    $("#av-comprobado").innerHTML = k.huellaOk && k.resultadoOk
      ? `<b class="si">✔ Coincide.</b> La huella del secreto es la que viste antes del vuelo, y recalculando con ese secreto sale otra vez ${k.g.exito ? "destino" : "tormenta"} ×${k.g.c.toFixed(2)}.`
      : `<b class="no">✘ No coincide.</b>`;
    sonido.clic();
  };
}
function avPintarHistorial(){
  $("#av-hist").innerHTML = av.hist.map((h, i) =>
    `<button class="${h.tipo === "win" ? "si" : h.exito ? "med" : "no"}" data-i="${i}" title="Vuelo #${h.num}: ver prueba de juego justo">${h.exito ? "✓" : "✗"} ×${h.c.toFixed(2)}</button>`).join("");
  $$("#av-hist button").forEach(b => b.onclick = () => avPintarJusto(av.hist[+b.dataset.i]));
}

function avNota(){
  $("#av-nota").textContent = `${AV_NOMBRE[av.k]}: llega a destino más o menos ${Math.round(AV_PROB[av.k] * 100)} de cada 100 vuelos. Más velocidad trae premios más grandes, pero la tormenta sale más seguido.`;
}
grupoOpciones("#av-vel button", b => { av.k = +b.dataset.k; avNota(); }, () => av.estado === "espera");
avNota(); avNuevoSecreto();
$("#av-btn").onclick = () => {
  if (av.estado !== "espera" || ocupado || !apostar("#av-msg")) return;
  ocupado = true; av.bet = apuesta; av.x = 0; av.y = Y_PISTA; av.ang = 0; av.c = 1; av.idx = 0; av.popups = []; av.estela = []; av.camX = -0.25;
  av.actual = { num: ++av.num, k: av.k, secreto: av.prox.secreto, huella: av.prox.huella, bet: apuesta };
  av.vuelo = avPrepararVuelo(avSortear(av.k, av.prox.secreto));
  av.estado = "vuelo"; av.last = performance.now();
  msg("#av-msg", ""); $("#av-mult").innerHTML = "";
  $("#av-btn").disabled = true; $("#av-btn").textContent = "Volando…";
  bloquear("#av-vel button", true);
  sonido.rodillo(1200);
  requestAnimationFrame(avFrame);
};
registrarJuego("avion", { alMostrar: avTam });
