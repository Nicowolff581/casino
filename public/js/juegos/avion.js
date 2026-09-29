/* ═════════ AVIÓN ═════════
   El avión de Casino Nico despega de un barco y vuela sobre el mar. En el camino recoge
   premios (+ suman veces tu apuesta, × multiplican el contador) y lo golpean cohetes (÷2).
   Si llega al portaaviones, aterriza y cobras el contador; si se queda sin altura, cae al mar.
   Los resultados salen de avion-motor.js; aquí solo se dibuja. La velocidad solo cambia
   lo rápido que se ve (se puede cambiar en pleno vuelo). */
const AV_VEL = [0.34, 0.5, 0.72, 1.02];
const AV_NOMBRE = ["Lento", "Normal", "Rápido", "Turbo"];

/* ── estado y mundo (1 unidad = alto del lienzo) ── */
const av = { estado: "espera", k: 1, nivel: AV_ALT0, anillos: [], terminado: true, explosion: null, bet: 0, vuelo: null, x: -0.35, y: 0, ang: 0, c: 1, idx: 0, popups: [], part: [], humo: [], hist: [], last: 0, tFin: 0,
  camX: -1.3, estela: [], prox: null, num: 0, salto: 0, sacudida: 0, vx: 0, vy: 0, rueda: 0, hundido: 0 };
const avCanvas = $("#av-canvas"), avCtx = avCanvas.getContext("2d");
const MAR = 0.84, CUBIERTA = 0.755, ESCALA = 0.00145, TREN = 21.2;       // TREN: de las ruedas al centro del avión (en unidades del dibujo)
const Y_CUBIERTA = CUBIERTA - TREN * ESCALA;                           // centro del avión apoyado en una cubierta
const nivelY = h => 0.72 - h * 0.105;                                     // altura 1 a 4 → posición en pantalla
const X_SALIDA = -0.35, X_DESPEGUE = 0.9, X_PRIMERO = 2.6, ENTRE = 1.3, LARGO_PA = 1.9;
const NUBES = Array.from({ length: 16 }, (_, i) => ({ x: i * 1.25 + azar() * 0.6, y: 0.08 + azar() * 0.42, s: 0.55 + azar() * 0.8, capa: i % 2 ? 0.2 : 0.5 }));
av.y = Y_CUBIERTA;

function avTam(){ ajustarCanvas(avCanvas, avCtx); }
// Dónde va cada objeto y por dónde pasa el avión. Solo dibujo: el resultado ya está decidido.
function avPrepararVuelo(g){
  const kp = [[X_SALIDA, Y_CUBIERTA], [X_DESPEGUE, Y_CUBIERTA], [X_DESPEGUE + 1.1, nivelY(2)]], ev = g.ev.map(e => ({ ...e }));
  let h = 2;
  ev.forEach((e, i) => {
    e.x = X_PRIMERO + i * ENTRE; e.y = nivelY(h);                        // el objeto está justo en el camino del avión
    kp.push([e.x, e.y]);
    if (e.h > 0) kp.push([e.x + 0.55, nivelY(e.h)]);
    h = e.h;
  });
  const ultimo = ev[ev.length - 1].x;
  const xPA = g.exito ? ultimo + 2 : ultimo + 3.2 + ENTRE * (g.n - ev.length);   // portaaviones al final del recorrido completo
  if (g.exito) kp.push([xPA + 0.3, Y_CUBIERTA]);
  return { ...g, ev, kp, xPA, xToque: xPA + 0.3, xPara: xPA + 1.35 };
}
const avY = x => avYDe(av.vuelo, x);
function avYDe(v, x){
  const kp = v ? v.kp : [[X_SALIDA, Y_CUBIERTA]];
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

/* ── paisaje de caricatura ── */
const pseudo = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };   // «azar» fijo para el decorado
function nube(c, x, y, s, a = 0.95){
  const bolas = [[0, 0, 26], [24, -12, 22], [48, 0, 24], [22, 8, 24], [-20, 6, 18], [66, 8, 16]];
  c.fillStyle = `rgba(170,200,235,${a})`;
  bolas.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s + 5 * s, r * s, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = `rgba(255,255,255,${a})`;
  bolas.forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill(); });
}
function palmera(c, x, y, s, t){
  c.strokeStyle = "#8a5a2b"; c.lineWidth = 4 * s; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6 * s, y - 20 * s, x + 3 * s, y - 38 * s); c.stroke();
  const tx = x + 3 * s, ty = y - 38 * s, vaiven = Math.sin(t / 900 + x) * 0.08;
  c.fillStyle = "#2f9e48";
  [-2.6, -1.9, -1.2, -0.4, 0.3].forEach(a => {
    c.save(); c.translate(tx, ty); c.rotate(a + vaiven);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(12 * s, -8 * s, 26 * s, 2 * s); c.quadraticCurveTo(12 * s, -1 * s, 0, 0); c.fill();
    c.restore();
  });
}
// Islas al fondo (se mueven más lento que el mar: parecen lejanas)
function dibujarIslas(c, W, H, camX, t){
  const par = 0.3, paso = 2.3, desde = Math.floor(camX * par / paso) - 1;
  for (let k = desde; k < desde + Math.ceil(W / H / paso) + 3; k++){
    if (pseudo(k) < 0.25) continue;
    const x = (k * paso + pseudo(k + 7) * 1.2 - camX * par) * H, w = (0.35 + pseudo(k + 3) * 0.5) * H, h = (0.04 + pseudo(k + 5) * 0.07) * H, y = MAR * H;
    c.fillStyle = "#f3d9a0"; c.beginPath(); c.ellipse(x, y, w * 0.55, h * 0.35, 0, Math.PI, 0); c.fill();
    c.fillStyle = "#3fae5a"; c.beginPath(); c.ellipse(x - w * 0.05, y - h * 0.1, w * 0.4, h, 0, Math.PI, 0); c.fill();
    c.fillStyle = "#57c46d"; c.beginPath(); c.ellipse(x - w * 0.15, y - h * 0.25, w * 0.22, h * 0.7, 0, Math.PI, 0); c.fill();
    if (pseudo(k + 9) > 0.35) palmera(c, x + w * 0.28, y - h * 0.05, H / 700, t);
    if (pseudo(k + 11) > 0.6) palmera(c, x - w * 0.36, y - h * 0.02, H / 850, t);
  }
}
function dibujarMar(c, W, H, camX, t){
  const y0 = MAR * H, mar = c.createLinearGradient(0, y0, 0, H);
  mar.addColorStop(0, "#39b6e6"); mar.addColorStop(0.4, "#1f8fcf"); mar.addColorStop(1, "#0f5c9c");
  c.fillStyle = mar; c.fillRect(0, y0, W, H - y0);
  c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(0, y0 - 1, W, 2);
  for (let fila = 0; fila < 5; fila++){
    const yy = y0 + H * (0.018 + fila * 0.032), par = 0.6 + fila * 0.25, largo = H * (0.06 + fila * 0.012), fase = t / (900 - fila * 90);
    c.strokeStyle = `rgba(255,255,255,${0.5 - fila * 0.06})`; c.lineWidth = 1.5 + fila * 0.6; c.lineCap = "round";
    const off = ((camX * H * par) % (largo * 2) + largo * 2) % (largo * 2);
    for (let x = -off + (fila % 2) * largo; x < W + largo; x += largo * 2){
      const dy = Math.sin(fase + x / 60) * H * 0.004;
      c.beginPath(); c.arc(x, yy + dy + largo * 0.25, largo * 0.35, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    }
  }
}
// Sombra en el agua de algo que vuela a la altura y (más chica y clara cuanto más alto)
function sombra(c, x, y, ancho, H){
  const alto = Math.max(0, MAR - y), f = Math.max(0.15, 1 - alto * 1.4);
  c.fillStyle = `rgba(4,40,80,${0.28 * f})`;
  c.beginPath(); c.ellipse(x, MAR * H + H * 0.03, ancho * f * 0.5, H * 0.012 * f + 1, 0, 0, Math.PI * 2); c.fill();
}
// Barco de salida: casco borgoña, cubierta con pista y puente de mando
function dibujarBarco(c, sx, H, t){
  const x0 = sx(-1.25), x1 = sx(1.05), yc = CUBIERTA * H, ym = MAR * H, balanceo = Math.sin(t / 700) * H * 0.003;
  if (x1 < -20) return;
  c.save(); c.translate(0, balanceo);
  c.fillStyle = "rgba(4,40,80,.3)"; c.beginPath(); c.ellipse((x0 + x1) / 2, ym + H * 0.035, (x1 - x0) * 0.55, H * 0.02, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#7a1a2a"; c.beginPath(); c.moveTo(x0, yc); c.lineTo(x1 + H * 0.05, yc); c.lineTo(x1 - H * 0.03, ym + H * 0.035); c.lineTo(x0 + H * 0.04, ym + H * 0.035); c.closePath(); c.fill();
  c.fillStyle = "#5c1320"; c.fillRect(x0 + H * 0.03, ym + H * 0.012, x1 - x0, H * 0.023);
  c.fillStyle = "#d8b25a"; c.fillRect(x0, yc + H * 0.012, x1 - x0 + H * 0.04, H * 0.006);
  for (let x = x0 + H * 0.08; x < x1 - H * 0.04; x += H * 0.07){ c.fillStyle = "#ffe9a8"; c.beginPath(); c.arc(x, yc + H * 0.035, H * 0.008, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = "#4b5563"; c.fillRect(x0, yc - H * 0.006, x1 - x0 + H * 0.04, H * 0.012);
  c.fillStyle = "#fff"; for (let x = sx(-0.6); x < x1; x += H * 0.09) c.fillRect(x, yc - H * 0.001, H * 0.045, H * 0.003);
  const px = sx(-1.15);                                                        // puente de mando con chimenea
  c.fillStyle = "#f4efe2"; c.beginPath(); c.roundRect(px, yc - H * 0.09, H * 0.16, H * 0.085, H * 0.01); c.fill();
  c.fillStyle = "#2d6fa3"; for (let i = 0; i < 4; i++) c.fillRect(px + H * (0.015 + i * 0.036), yc - H * 0.075, H * 0.024, H * 0.02);
  c.fillStyle = "#7a1a2a"; c.fillRect(px + H * 0.1, yc - H * 0.14, H * 0.04, H * 0.055);
  c.fillStyle = "#d8b25a"; c.fillRect(px + H * 0.1, yc - H * 0.125, H * 0.04, H * 0.008);
  for (let i = 0; i < 3; i++){ const e = ((t / 1400 + i / 3) % 1); c.fillStyle = `rgba(230,236,245,${0.6 * (1 - e)})`; c.beginPath(); c.arc(px + H * (0.12 - e * 0.1), yc - H * (0.15 + e * 0.1), H * (0.012 + e * 0.02), 0, Math.PI * 2); c.fill(); }
  c.restore();
}
// Portaaviones de llegada: casco gris, cubierta con franjas y torre con el emblema de Casino Nico
function dibujarPortaaviones(c, sx, H, t){
  const v = av.vuelo; if (!v) return;
  const x0 = sx(v.xPA), x1 = sx(v.xPA + LARGO_PA), yc = CUBIERTA * H, ym = MAR * H, W = avCanvas.clientWidth;
  if (x1 < -40 || x0 > W + 40) return;
  c.fillStyle = "rgba(4,40,80,.3)"; c.beginPath(); c.ellipse((x0 + x1) / 2, ym + H * 0.035, (x1 - x0) * 0.55, H * 0.02, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#6b7788"; c.beginPath(); c.moveTo(x0 - H * 0.05, yc); c.lineTo(x1 + H * 0.06, yc); c.lineTo(x1 - H * 0.02, ym + H * 0.035); c.lineTo(x0, ym + H * 0.035); c.closePath(); c.fill();
  c.fillStyle = "#4d5766"; c.fillRect(x0, ym + H * 0.012, x1 - x0, H * 0.023);
  c.fillStyle = "#3a414c"; c.fillRect(x0 - H * 0.05, yc - H * 0.008, x1 - x0 + H * 0.11, H * 0.014);
  c.fillStyle = "#ffd84a"; for (let x = x0; x < x1; x += H * 0.08) c.fillRect(x, yc - H * 0.003, H * 0.04, H * 0.004);
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 2; c.beginPath(); c.moveTo(sx(v.xToque) - H * 0.02, yc - H * 0.008); c.lineTo(sx(v.xToque) + H * 0.06, yc - H * 0.008); c.stroke();
  const tx = x1 - H * 0.2;                                                      // torre
  c.fillStyle = "#838fa0"; c.beginPath(); c.roundRect(tx, yc - H * 0.13, H * 0.1, H * 0.125, H * 0.008); c.fill();
  c.fillStyle = "#2d3a4a"; c.fillRect(tx + H * 0.012, yc - H * 0.11, H * 0.076, H * 0.018);
  c.fillStyle = "#132820"; c.beginPath(); c.arc(tx + H * 0.05, yc - H * 0.055, H * 0.02, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#d8b25a"; c.lineWidth = 2; c.stroke();
  c.fillStyle = "#f7f0de"; c.font = `800 ${H * 0.024}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("N", tx + H * 0.05, yc - H * 0.054);
  c.strokeStyle = "#5b6574"; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + H * 0.05, yc - H * 0.13); c.lineTo(tx + H * 0.05, yc - H * 0.19); c.stroke();
  c.fillStyle = "#7a1a2a"; c.beginPath(); c.moveTo(tx + H * 0.05, yc - H * 0.19); c.lineTo(tx + H * (0.05 + 0.045 + Math.sin(t / 200) * 0.005), yc - H * 0.175); c.lineTo(tx + H * 0.05, yc - H * 0.16); c.fill();
  c.textBaseline = "alphabetic";
}
// Premio grande y redondo (los × tienen forma de estrella)
function dibujarPremio(c, x, y, e, H, t){
  const o = AV_OBJ[e.j], mult = e.t[0] === "×", r = H * 0.068, bob = Math.sin(t / 320 + e.x * 3) * H * 0.012, pulso = 1 + Math.sin(t / 200 + e.x) * 0.04;
  y += bob;
  const g = c.createRadialGradient(x, y, 0, x, y, r * 2);
  g.addColorStop(0, o.color + "aa"); g.addColorStop(1, o.color + "00");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); c.scale(pulso, pulso); c.rotate(mult ? t / 1200 : 0);
  c.beginPath();
  if (mult){ for (let i = 0; i < 16; i++){ const a = i * Math.PI / 8, rr = i % 2 ? r * 0.78 : r * 1.12; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
  else c.arc(0, 0, r, 0, Math.PI * 2);
  const f = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  f.addColorStop(0, "#ffffff"); f.addColorStop(0.45, o.color); f.addColorStop(1, o.color);
  c.shadowColor = "rgba(0,0,0,.3)"; c.shadowBlur = r * 0.3; c.shadowOffsetY = r * 0.12;
  c.fillStyle = f; c.fill(); c.shadowColor = "transparent"; c.lineWidth = r * 0.13; c.strokeStyle = "#fff"; c.stroke();
  c.restore();
  c.font = `900 ${H * (e.t.length > 2 ? 0.05 : 0.058)}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.lineWidth = H * 0.01; c.strokeStyle = "rgba(20,20,50,.75)"; c.strokeText(e.t, x, y + 2); c.fillStyle = "#fff"; c.fillText(e.t, x, y + 2);
  c.textBaseline = "alphabetic";
}
function dibujarCohete(c, x, y, H, t){
  const s = H * 0.0024;
  c.save(); c.translate(x, y); c.scale(s, s);
  const f = 18 + Math.sin(t / 30) * 7;
  c.fillStyle = "#ff9f1c"; c.beginPath(); c.moveTo(24, -7); c.lineTo(24 + f, 0); c.lineTo(24, 7); c.fill();
  c.fillStyle = "#ffe066"; c.beginPath(); c.moveTo(24, -4); c.lineTo(24 + f * 0.6, 0); c.lineTo(24, 4); c.fill();
  c.fillStyle = "#f4f6fb"; c.beginPath(); c.roundRect(-18, -8, 44, 16, 6); c.fill();
  c.fillStyle = "#e63946"; c.fillRect(-2, -8, 7, 16); c.fillRect(10, -8, 4, 16);
  c.beginPath(); c.moveTo(-18, -8); c.quadraticCurveTo(-36, 0, -18, 8); c.fill();
  c.fillStyle = "#8a96a8"; c.beginPath(); c.moveTo(14, -8); c.lineTo(26, -17); c.lineTo(24, -8); c.fill(); c.beginPath(); c.moveTo(14, 8); c.lineTo(26, 17); c.lineTo(24, 8); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(-6, -2, 3.2, 0, Math.PI * 2); c.fill(); c.fillStyle = "#1a1a2e"; c.beginPath(); c.arc(-7, -2, 1.6, 0, Math.PI * 2); c.fill();   // ojito de caricatura
  c.restore();
}
function particulas(x, y, n, colores, fuerza = 1, gravedad = 0.6, tam = 1){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, v = (0.15 + Math.random() * 0.45) * fuerza;
    av.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.1 * fuerza, g: gravedad, vida: 0.5 + Math.random() * 0.5, edad: 0, color: colores[i % colores.length], r: (0.006 + Math.random() * 0.01) * tam });
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

/* ── dibujo de cada cuadro ── */
const avX = c => "×" + (c >= 100 ? c.toFixed(1) : c.toFixed(2));
function avDibujar(t){
  const W = avCanvas.clientWidth, H = avCanvas.clientHeight, c = avCtx;
  if (!W) return;
  const temblor = av.sacudida > 0 ? (Math.random() - 0.5) * H * 0.025 * av.sacudida : 0;
  c.save(); c.translate(temblor, temblor * 0.6);
  const camX = av.camX, sx = wx => (wx - camX) * H, u = H * ESCALA, v = av.vuelo;
  // cielo, sol y nubes
  const cielo = c.createLinearGradient(0, 0, 0, MAR * H);
  cielo.addColorStop(0, "#3d9df2"); cielo.addColorStop(0.62, "#8fd0ff"); cielo.addColorStop(1, "#ffe7bd");
  c.fillStyle = cielo; c.fillRect(-30, -30, W + 60, MAR * H + 30);
  const solX = W * 0.84, solY = H * 0.17, halo = c.createRadialGradient(solX, solY, 0, solX, solY, H * 0.2);
  halo.addColorStop(0, "rgba(255,246,190,.9)"); halo.addColorStop(1, "rgba(255,246,190,0)");
  c.fillStyle = halo; c.fillRect(solX - H * 0.2, solY - H * 0.2, H * 0.4, H * 0.4);
  c.save(); c.translate(solX, solY); c.rotate(t / 6000); c.fillStyle = "rgba(255,236,150,.45)";
  for (let i = 0; i < 12; i++){ c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(H * 0.05, -H * 0.012); c.lineTo(H * 0.1, 0); c.lineTo(H * 0.05, H * 0.012); c.fill(); }
  c.restore();
  c.fillStyle = "#fff3a8"; c.beginPath(); c.arc(solX, solY, H * 0.045, 0, Math.PI * 2); c.fill();
  NUBES.forEach(n => { const per = 20 * H, x = (((n.x * H - camX * H * n.capa) % per) + per) % per - H * 0.6; nube(c, x, n.y * H, n.s * H / 420, n.capa < 0.3 ? 0.6 : 0.95); });
  dibujarIslas(c, W, H, camX, t);
  dibujarMar(c, W, H, camX, t);
  dibujarBarco(c, sx, H, t);
  dibujarPortaaviones(c, sx, H, t);
  // premios y cohetes (con su sombra en el agua)
  if (v) v.ev.forEach((e, i) => {
    if (i < av.idx) return;
    if (e.t === "cohete"){
      if (e.x - av.x > 1.6) return;
      const x = sx(e.x + (e.x - av.x) * 1.2);
      sombra(c, x, e.y, H * 0.12, H); dibujarCohete(c, x, e.y * H, H, t);
    } else {
      const x = sx(e.x); if (x < -H * 0.2 || x > W + H * 0.2) return;
      sombra(c, x, e.y, H * 0.14, H); dibujarPremio(c, x, e.y * H, e, H, t);
    }
  });
  // avión: sombra, estela, humo y el avión
  const px = sx(av.x), py = av.y * H;
  if (av.x > X_DESPEGUE && av.estado !== "hundido" && av.estado !== "rodando" && av.estado !== "final") sombra(c, px, av.y, H * 0.36, H);
  dibujarEstela(c, sx, H, u);
  av.humo.forEach(h => { c.fillStyle = `rgba(80,80,90,${0.5 * (1 - h.edad / h.vida)})`; c.beginPath(); c.arc(sx(h.x), h.y * H, (0.015 + h.edad * 0.05) * H, 0, Math.PI * 2); c.fill(); });
  const tren = av.estado === "rodando" || av.estado === "final" ? 1 : av.x < X_DESPEGUE + 0.1 ? 1 : v?.exito && av.x > v.xToque - 1.3 ? Math.min(1, (av.x - v.xToque + 1.3) / 0.4) : Math.max(0, 1 - (av.x - X_DESPEGUE - 0.1) / 0.3);
  if (av.estado === "hundido"){ c.save(); c.beginPath(); c.rect(-30, -30, W + 60, MAR * H + 30 + H * 0.01); c.clip(); }
  dibujarA380(c, px, py, av.ang, u, tren);
  if (av.estado === "hundido") c.restore();
  // explosión, anillos de premio y partículas
  if (av.explosion){
    const e = (t - av.explosion.t0) / 450;
    if (e < 1){
      const ex = sx(av.explosion.x), ey = av.explosion.y * H, g = c.createRadialGradient(ex, ey, 0, ex, ey, H * (0.05 + e * 0.16));
      g.addColorStop(0, `rgba(255,255,220,${1 - e})`); g.addColorStop(0.4, `rgba(255,170,40,${0.9 * (1 - e)})`); g.addColorStop(1, "rgba(255,80,40,0)");
      c.fillStyle = g; c.beginPath(); c.arc(ex, ey, H * (0.05 + e * 0.16), 0, Math.PI * 2); c.fill();
      // estallido de caricatura: estrella dentada amarilla y roja
      const tam = H * (0.07 + Math.min(e, 0.4) * 0.2), gira = av.explosion.t0 / 100;
      [["#ff4d3b", 1], ["#ffd84a", 0.68]].forEach(([color, k]) => {
        c.fillStyle = color; c.globalAlpha = Math.max(0, 1 - e * 1.4); c.beginPath();
        for (let i = 0; i < 20; i++){ const a = gira + i * Math.PI / 10, rr = tam * k * (i % 2 ? 0.55 : 1); c.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.globalAlpha = 1;
      });
      if (e < 0.6){ c.font = `900 ${H * 0.05}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.globalAlpha = 1 - e / 0.6; c.fillText("¡PUM!", ex, ey); c.globalAlpha = 1; c.textBaseline = "alphabetic"; }
    }
  }
  av.anillos.forEach(a => { const e = (t - a.t0) / 600; c.strokeStyle = a.color; c.globalAlpha = Math.max(0, 1 - e); c.lineWidth = H * 0.012 * (1 - e) + 1; c.beginPath(); c.arc(sx(a.x), a.y * H, H * (0.06 + e * 0.14), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; });
  av.part.forEach(p => { const f = 1 - p.edad / p.vida; c.globalAlpha = Math.max(0, f); c.fillStyle = p.color; c.beginPath(); c.arc(sx(p.x), p.y * H, p.r * H * (0.4 + 0.6 * f), 0, Math.PI * 2); c.fill(); });
  c.globalAlpha = 1;
  // textos que salen al tocar un objeto
  av.popups.forEach(p => {
    const e = (t - p.t0) / 1100;
    c.globalAlpha = Math.max(0, 1 - e * e); c.font = `900 ${H * (0.08 + (1 - e) * 0.03)}px Manrope, sans-serif`; c.textAlign = "center";
    c.lineWidth = H * 0.012; c.strokeStyle = "rgba(20,20,50,.7)"; c.strokeText(p.txt, px + H * 0.03, py - H * 0.2 - e * H * 0.12);
    c.fillStyle = p.color; c.fillText(p.txt, px + H * 0.03, py - H * 0.2 - e * H * 0.12);
    c.globalAlpha = 1;
  });
  // contador sobre el avión: empieza en tu apuesta
  if (av.estado === "vuelo" || av.estado === "rodando" || av.estado === "cayendo"){
    const fichas = fmt(Math.floor(av.bet * av.c)), yy = py - H * 0.12;
    c.font = `900 ${H * 0.048}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    const w = c.measureText(fichas).width + H * 0.13;
    c.fillStyle = "rgba(10,30,70,.82)"; c.beginPath(); c.roundRect(px - w / 2, yy - H * 0.035, w, H * 0.07, H * 0.035); c.fill();
    c.strokeStyle = av.c >= 1 ? "#ffd84a" : "#ff9f7a"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "#ffe066"; c.beginPath(); c.arc(px - w / 2 + H * 0.038, yy, H * 0.018, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#fff"; c.fillText(fichas, px + H * 0.02, yy + 1);
    c.font = `800 ${H * 0.028}px Manrope, sans-serif`; c.fillStyle = "#bfe3ff"; c.fillText(avX(av.c), px, yy + H * 0.055);
    c.textBaseline = "alphabetic";
  }
  c.restore();
  // indicadores (fijos, sin temblor)
  const bh = H * 0.1, x0 = H * 0.03, y0 = H * 0.03;
  c.fillStyle = "rgba(10,30,70,.6)"; c.beginPath(); c.roundRect(x0, y0, H * 0.25, bh, 10); c.fill();
  c.fillStyle = "#bfe3ff"; c.font = `800 ${H * 0.026}px Manrope, sans-serif`; c.textAlign = "left"; c.fillText("ALTURA", x0 + H * 0.02, y0 + H * 0.036);
  for (let i = 1; i <= AV_ALT_MAX; i++){
    const on = av.estado !== "espera" && av.x > X_DESPEGUE && i <= av.nivel;
    c.fillStyle = on ? (av.nivel <= 1 ? "#ff6b6b" : "#7ee29a") : "rgba(255,255,255,.18)";
    c.beginPath(); c.roundRect(x0 + H * (0.02 + (i - 1) * 0.055), y0 + H * (0.088 - i * 0.011), H * 0.042, H * (0.012 + i * 0.011), 3); c.fill();
  }
  c.fillStyle = "rgba(10,30,70,.6)"; c.beginPath(); c.roundRect(x0 + H * 0.27, y0, H * 0.25, bh, 10); c.fill();
  c.fillStyle = "#bfe3ff"; c.font = `800 ${H * 0.026}px Manrope, sans-serif`; c.fillText("CONTADOR", x0 + H * 0.29, y0 + H * 0.036);
  c.fillStyle = "#fff"; c.font = `900 ${H * 0.042}px Manrope, sans-serif`; c.fillText(avX(av.c), x0 + H * 0.29, y0 + H * 0.083);
}

/* ── animación ── */
function avAplicar(e, t){
  av.c = e.c; av.nivel = e.h;
  if (e.t === "cohete"){
    av.explosion = { x: e.x, y: e.y, t0: t };
    particulas(e.x, e.y, 26, ["#fff3a8", "#ffb13b", "#ff5a3b"], 1.5, 0.15, 1.8);
    for (let i = 0; i < 10; i++) av.humo.push({ x: e.x + (Math.random() - 0.5) * 0.12, y: e.y + (Math.random() - 0.5) * 0.08, edad: 0, vida: 0.9 + Math.random() * 0.6 });
    av.sacudida = 1; av.salto = -0.05; sonido.boom();
    av.popups.push({ txt: "÷2", color: "#ff6b6b", t0: t });
    if (e.h <= 0){ av.estado = "cayendo"; av.vx = AV_VEL[av.k] * 0.7; av.vy = -0.06; sonido.silbido(0.25); }
  } else {
    const o = AV_OBJ[e.j];
    particulas(e.x, e.y, 30, [o.color, "#ffffff", "#fff3a8"], 1, 0.35);
    av.anillos.push({ x: e.x, y: e.y, t0: t, color: o.color });
    av.salto = 0.04; sonido.premio(e.j);
    av.popups.push({ txt: e.t, color: o.color, t0: t });
  }
}
function avPaso(t){
  const dt = Math.min(0.05, (t - av.last) / 1000); av.last = t;
  const v = av.vuelo, W = avCanvas.clientWidth, H = avCanvas.clientHeight || 1, vel = AV_VEL[av.k];
  if (av.estado === "vuelo"){
    const arranque = av.x < X_DESPEGUE ? 0.3 + 0.7 * (av.x - X_SALIDA) / (X_DESPEGUE - X_SALIDA) : 1;   // acelera por la cubierta
    av.x += vel * dt * arranque;
    while (av.estado === "vuelo" && av.idx < v.ev.length && av.x >= v.ev[av.idx].x){ avAplicar(v.ev[av.idx], t); av.idx++; }
    if (av.estado === "vuelo"){
      av.y = avY(av.x) - av.salto;
      av.ang = Math.max(-0.35, Math.min(0.35, Math.atan2(avY(av.x + 0.05) - avY(av.x - 0.05), 0.1)));
      if (v.exito && av.x >= v.xToque){ av.estado = "rodando"; av.rueda = 0; sonido.golpe(); particulas(av.x, CUBIERTA, 14, ["#d9dde3", "#aeb4bd"], 0.5, 0.1); }
    }
  } else if (av.estado === "rodando"){
    // toca la cubierta, rebota y frena hasta detenerse
    av.rueda += dt;
    const falta = v.xPara - av.x, rebote = Math.exp(-av.rueda * 3.2);
    av.x += (vel * Math.max(0, falta / (v.xPara - v.xToque)) + 0.02) * dt;
    av.y = Y_CUBIERTA - Math.abs(Math.sin(av.rueda * 8)) * 0.045 * rebote;
    av.ang = -Math.sin(av.rueda * 8) * 0.06 * rebote;
    if (av.rueda > 0.35 && av.rueda - dt <= 0.35) sonido.boing();
    if (falta < 0.01 || av.rueda > 6){ av.x = Math.min(av.x, v.xPara); av.y = Y_CUBIERTA; av.ang = 0; av.estado = "final"; av.tFin = t; avResolver(); }
  } else if (av.estado === "cayendo"){
    av.vy += 0.9 * dt; av.vx = Math.max(0.06, av.vx - 0.2 * dt);
    av.x += av.vx * dt; av.y += av.vy * dt; av.ang = Math.min(1.05, av.ang + dt * 1.3);
    if (Math.random() < dt * 30) av.humo.push({ x: av.x - 0.06, y: av.y, edad: 0, vida: 1.2 });
    if (av.y >= MAR - 0.02){
      av.estado = "hundido"; av.tFin = t; av.y = MAR - 0.02;
      particulas(av.x, MAR, 60, ["#ffffff", "#bfe9ff", "#7fd3ff"], 1.3, 1.6, 1.2); av.sacudida = 0.6;
      sonido.chapuzon(); avResolver();
    }
  } else if (av.estado === "hundido"){
    const e = Math.min(1, (t - av.tFin) / 2200);
    av.y = MAR - 0.02 + e * 0.14; av.ang = Math.min(1.2, av.ang + dt * 0.2);
    if (Math.random() < dt * 8) particulas(av.x + (Math.random() - 0.5) * 0.1, MAR, 1, ["#e8f7ff"], 0.2, -0.05, 0.6);
  }
  if (av.estado === "vuelo" && av.x > X_DESPEGUE - 0.1){ av.estela.push({ x: av.x, y: av.y, ang: av.ang }); if (av.estela.length > 70) av.estela.shift(); }
  else if (av.estela.length && Math.random() < 0.5) av.estela.shift();
  av.salto *= Math.exp(-dt * 4); av.sacudida = Math.max(0, av.sacudida - dt * 2.2);
  av.part.forEach(p => { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.edad += dt; });
  av.part = av.part.filter(p => p.edad < p.vida);
  av.humo.forEach(h => { h.edad += dt; h.y -= dt * 0.05; }); av.humo = av.humo.filter(h => h.edad < h.vida);
  av.popups = av.popups.filter(p => t - p.t0 < 1100); av.anillos = av.anillos.filter(a => t - a.t0 < 600);
  // la cámara sigue al avión
  const meta = Math.max(-1.3, av.x - 0.32 * W / H);
  av.camX += (meta - av.camX) * Math.min(1, dt * (av.estado === "vuelo" ? 12 : 4));
  if ((av.estado === "final" || av.estado === "hundido") && !av.terminado && t - av.tFin > 1800) avTerminar();
  avDibujar(t);
}
// El escenario se anima siempre que el Avión esté a la vista (olas, nubes, sol).
(function avBucle(t){
  if (juegoActivo === "avion" && !document.hidden) avPaso(t); else av.last = t;
  requestAnimationFrame(avBucle);
})(performance.now());

function avResolver(){
  const v = av.vuelo, r = av.actual;
  const pagado = v.exito ? Math.floor(av.bet * v.c) : 0;
  v.tipo = liquidar("#av-msg", pagado, av.bet, v.exito ? `Aterrizó en el portaaviones con ${avX(v.c)}. ` : "Se quedó sin altura y cayó al mar. ", AV_NIVELES);
  // Solo se celebra en verde si recibes más de lo que apostaste.
  const cartel = $("#av-mult");
  if (!v.exito){ cartel.className = "av-mult fin"; cartel.innerHTML = `¡Al agua!<small>El contador tenía ${avX(v.c)} · pierdes la apuesta</small>`; }
  else if (v.tipo === "win"){ cartel.className = "av-mult ok"; cartel.innerHTML = `¡Aterrizó! ${avX(v.c)}<small>+${fmt(pagado - av.bet)} fichas</small>`; particulas(av.x, av.y - 0.05, 50, ["#ffd84a", "#7ee29a", "#ff8fd0", "#5fd0ff", "#ffffff"], 1.2, 0.5); }
  else { cartel.className = "av-mult med"; cartel.innerHTML = `Aterrizó con ${avX(v.c)}<small>Recuperas ${fmt(pagado)} de ${fmt(av.bet)}</small>`; }
  Object.assign(r, { c: v.c, exito: v.exito, tipo: v.tipo, pagado });
  av.hist.unshift(r); av.hist = av.hist.slice(0, 20);
  avPintarHistorial(); avPintarJusto(r);
}
function avTerminar(){
  av.terminado = true; ocupado = false;
  $("#av-btn").disabled = false; $("#av-btn").textContent = "Jugar";
  avNuevoSecreto();
}

/* ── juego justo: huella antes del vuelo, secreto después ── */
function avNuevoSecreto(){
  const secreto = secretoAzar();
  av.prox = { secreto, huella: sha256(secreto) };
  $("#av-huella").textContent = av.prox.huella;
}
function avComprobar(r){
  const huellaOk = sha256(r.secreto) === r.huella, g = avSortear(r.secreto);
  return { huellaOk, resultadoOk: g.exito === r.exito && Math.abs(g.c - r.c) < 1e-9, g };
}
function avPintarJusto(r){
  const caja = $("#av-revelado");
  if (!r){ caja.innerHTML = ""; return; }
  caja.innerHTML = `<div class="justo-fila"><span>Vuelo #${r.num}</span><b class="${r.tipo === "win" ? "si" : r.exito ? "med" : "no"}">${r.exito ? "Aterrizó" : "Cayó al mar"} ${avX(r.c)}</b></div>
    <div class="justo-fila"><span>Huella mostrada antes</span><code>${r.huella}</code></div>
    <div class="justo-fila"><span>Número secreto</span><code>${r.secreto}</code></div>
    <div class="justo-acciones"><button class="btn sec btn-chico" id="av-comprobar">Comprobar</button><span id="av-comprobado" aria-live="polite"></span></div>`;
  $("#av-comprobar").onclick = () => {
    const k = avComprobar(r);
    $("#av-comprobado").innerHTML = k.huellaOk && k.resultadoOk
      ? `<b class="si">✔ Coincide.</b> La huella del secreto es la que viste antes del vuelo, y recalculando con ese secreto sale otra vez el mismo vuelo: ${k.g.exito ? "aterriza" : "cae al mar"} con ${avX(k.g.c)}.`
      : `<b class="no">✘ No coincide.</b>`;
    sonido.clic();
  };
}
function avPintarHistorial(){
  $("#av-hist").innerHTML = av.hist.map((h, i) =>
    `<button class="${h.tipo === "win" ? "si" : h.exito ? "med" : "no"}" data-i="${i}" title="Vuelo #${h.num}: ver prueba de juego justo">${h.exito ? "✓ " + avX(h.c) : "✗ al mar"}</button>`).join("");
  $$("#av-hist button").forEach(b => b.onclick = () => avPintarJusto(av.hist[+b.dataset.i]));
}


function avNota(){
  $("#av-nota").textContent = `Velocidad: ${AV_NOMBRE[av.k]}. La velocidad solo cambia lo rápido que ves el vuelo (puedes cambiarla mientras vuela): el resultado es el mismo. Aterrizan más o menos ${Math.round(AV_EXACTO.aterriza * 100)} de cada 100 vuelos.`;
}
grupoOpciones("#av-vel button", b => { av.k = +b.dataset.k; avNota(); sonido.clic(); }, () => true);
avNota(); avNuevoSecreto();
$("#av-btn").onclick = () => {
  if (ocupado || !apostar("#av-msg")) return;
  ocupado = true;
  Object.assign(av, { bet: apuesta, x: X_SALIDA, y: Y_CUBIERTA, ang: 0, c: 1, idx: 0, nivel: AV_ALT0, popups: [], part: [], humo: [], anillos: [], estela: [],
    camX: -1.3, salto: 0, sacudida: 0, explosion: null, terminado: false });
  av.actual = { num: ++av.num, secreto: av.prox.secreto, huella: av.prox.huella, bet: apuesta };
  av.vuelo = avPrepararVuelo(avSortear(av.prox.secreto));
  av.estado = "vuelo";
  msg("#av-msg", ""); $("#av-mult").innerHTML = "";
  $("#av-btn").disabled = true; $("#av-btn").textContent = "Volando…";
  sonido.rodillo(1400);
};
registrarJuego("avion", { alMostrar: avTam });
