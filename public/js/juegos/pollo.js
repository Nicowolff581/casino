/* ═════════ POLLO ═════════
   El pollo cruza 10 carriles. En cada carril hay una probabilidad fija p de que lo atropellen.
   El multiplicador del carril i es 0,97 / (1-p)^i: así el pago esperado es siempre el 97 %. */
const PO_N = 10;
const po = { activo: false, paso: 0, bet: 0, p: 0.2, muerto: -1 };
// Multiplicador del carril i con probabilidad p de choque (se redondea hacia abajo a 2 decimales).
const poMultCon = (p, i) => Math.floor(0.97 / Math.pow(1 - p, i) * 100) / 100;
const poMult = i => poMultCon(po.p, i);
const poCanvas = $("#po-canvas"), poCtx = poCanvas.getContext("2d");
const COLORES_AUTO = ["#e63946", "#1d9bf0", "#ffb703", "#2a9d8f", "#f4f1de", "#8338ec", "#fb5607", "#adb5bd"];
const poVis = { carril: 0, desde: 0, t0: 0, cam: 0, carros: [], golpe: false, corriendo: false, last: 0 };
const PO = { fila: 0.54, lw: 0.2, largo: 0.19, barrera: 0.31 };
function poNuevoAuto(i, y){ return { i, y, v: 0.3 + azar() * 0.45, color: COLORES_AUTO[azarEntero(COLORES_AUTO.length)], asesino: false }; }
for (let i = 1; i <= PO_N; i++){ poVis.carros.push(poNuevoAuto(i, azar() * 1.2 - 0.3), poNuevoAuto(i, azar() * 1.2 - 1.2)); }
function poTam(){
  if (!ajustarCanvas(poCanvas, poCtx)) return;
  if (!poVis.corriendo){ poVis.corriendo = true; poVis.last = performance.now(); requestAnimationFrame(poLoop); }
}
const poCentro = (l, H) => l === 0 ? H * 0.16 : H * 0.32 + (l - 0.5) * PO.lw * H;
function poLoop(t){
  if (!$("#g-pollo").classList.contains("activo")){ poVis.corriendo = false; return; }
  const dt = Math.min(0.05, (t - poVis.last) / 1000); poVis.last = t;
  const carril = po.muerto > 0 ? po.muerto : po.paso;
  if (carril !== poVis.carril){
    if (carril < poVis.carril && po.muerto < 0){ poVis.desde = carril; poVis.t0 = 0; }
    else { poVis.desde = poVis.carril; poVis.t0 = t; }
    poVis.carril = carril; poVis.golpe = false;
    if (po.muerto > 0){
      poVis.carros = poVis.carros.filter(a => a.i !== carril || a.y > PO.fila + 0.1);
      const k = poNuevoAuto(carril, -PO.largo - 0.35); k.v = 2.3; k.asesino = true; poVis.carros.push(k);
    } else if (carril > 0){
      poVis.carros.forEach(a => { if (a.i === carril && a.y + PO.largo > PO.barrera - 0.02 && a.y < PO.fila + 0.12) a.y = -PO.largo - 0.1 - azar() * 0.3; });
    }
  }
  for (let i = 1; i <= PO_N; i++){
    const detenido = i <= po.paso && i !== po.muerto;
    const autos = poVis.carros.filter(a => a.i === i).sort((a, b) => b.y - a.y);
    let limite = PO.barrera - 0.01;
    autos.forEach(a => {
      a.y += a.v * dt;
      if (detenido && a.y < PO.barrera){ a.y = Math.min(a.y, limite - PO.largo); limite = a.y - 0.03; }
      if (a.asesino && !poVis.golpe && a.y + PO.largo >= PO.fila - 0.02) poVis.golpe = true;
      if (a.y > 1.15){ if (a.asesino) a.asesino = false; a.v = 0.3 + azar() * 0.45; a.y = -PO.largo - azar() * 0.6; }
    });
  }
  poDibujar(t, dt);
  requestAnimationFrame(poLoop);
}
function dibujarAuto(c, x, y, w, h, color){
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.roundRect(x - w / 2 + 3, y + 4, w, h, w * 0.25); c.fill();
  c.fillStyle = "#111"; [[-0.56, 0.18], [0.44, 0.18], [-0.56, 0.7], [0.44, 0.7]].forEach(([dx, dy]) => c.fillRect(x + dx * w, y + dy * h, w * 0.12, h * 0.16));
  c.fillStyle = color; c.beginPath(); c.roundRect(x - w / 2, y, w, h, w * 0.25); c.fill();
  c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.roundRect(x - w / 2 + w * 0.12, y + h * 0.08, w * 0.18, h * 0.84, 4); c.fill();
  c.fillStyle = "#1c2a3a"; c.beginPath(); c.roundRect(x - w * 0.36, y + h * 0.62, w * 0.72, h * 0.18, 4); c.fill();
  c.beginPath(); c.roundRect(x - w * 0.34, y + h * 0.14, w * 0.68, h * 0.13, 4); c.fill();
  c.fillStyle = "#fff6c0"; c.fillRect(x - w * 0.42, y + h * 0.93, w * 0.18, h * 0.05); c.fillRect(x + w * 0.24, y + h * 0.93, w * 0.18, h * 0.05);
  c.fillStyle = "#ff3b3b"; c.fillRect(x - w * 0.42, y + h * 0.01, w * 0.16, h * 0.04); c.fillRect(x + w * 0.26, y + h * 0.01, w * 0.16, h * 0.04);
}
function poDibujar(t, dt){
  const W = poCanvas.clientWidth, H = poCanvas.clientHeight, c = poCtx, LW = PO.lw * H;
  const total = H * 0.32 + PO_N * LW + H * 0.32;
  const hop = poVis.t0 ? Math.min(1, (t - poVis.t0) / 300) : 1, e = hop * hop * (3 - 2 * hop);
  const gx = poCentro(poVis.desde, H) + (poCentro(poVis.carril, H) - poCentro(poVis.desde, H)) * e;
  const gy = PO.fila * H - Math.sin(Math.PI * hop) * H * 0.09;
  const objetivo = Math.max(0, Math.min(total - W, gx - W * 0.35));
  poVis.cam += (objetivo - poVis.cam) * Math.min(1, dt * 6);
  const X = x => x - poVis.cam;
  c.fillStyle = "#2c313c"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#6f7a85"; c.fillRect(X(0), 0, H * 0.32, H);
  c.strokeStyle = "#5c6670"; c.lineWidth = 1;
  for (let yy = 0; yy < H; yy += H * 0.08){ c.beginPath(); c.moveTo(X(0), yy); c.lineTo(X(H * 0.32), yy); c.stroke(); }
  c.fillStyle = "#9aa5ae"; c.fillRect(X(H * 0.3), 0, H * 0.03, H);
  const fin = H * 0.32 + PO_N * LW;
  c.fillStyle = "#6f7a85"; c.fillRect(X(fin), 0, H * 0.4, H);
  c.fillStyle = "#9aa5ae"; c.fillRect(X(fin), 0, H * 0.03, H);
  c.font = `${H * 0.16}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🏁", X(fin + H * 0.17), PO.fila * H);
  for (let i = 1; i <= PO_N; i++){
    const x0 = X(H * 0.32 + (i - 1) * LW);
    if (x0 > W || x0 + LW < 0) continue;
    if (i > 1){
      c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 3; c.setLineDash([H * 0.06, H * 0.05]);
      c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, H); c.stroke(); c.setLineDash([]);
    }
    const cx = x0 + LW / 2, pasado = i <= po.paso && i !== po.muerto, muerte = i === po.muerto;
    c.fillStyle = "#3a404b"; c.beginPath(); c.arc(cx, PO.fila * H, LW * 0.36, 0, Math.PI * 2); c.fill();
    c.fillStyle = muerte ? "#7a1f2b" : pasado ? "#1f5a3a" : "#505865"; c.beginPath(); c.arc(cx, PO.fila * H, LW * 0.31, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++){ c.beginPath(); c.moveTo(cx - LW * 0.24, PO.fila * H + k * LW * 0.1); c.lineTo(cx + LW * 0.24, PO.fila * H + k * LW * 0.1); c.stroke(); }
    if (!(i === poVis.carril && !muerte)){
      c.fillStyle = pasado ? "#7dff7a" : "#fff"; c.font = `800 ${LW * 0.2}px Manrope, sans-serif`;
      c.fillText(poMult(i).toFixed(2) + "×", cx, PO.fila * H);
    }
    if (pasado){
      const by = PO.barrera * H, bw = LW * 0.86;
      c.fillStyle = "#222"; c.fillRect(cx - bw / 2 + 4, by - H * 0.035, 4, H * 0.07); c.fillRect(cx + bw / 2 - 8, by - H * 0.035, 4, H * 0.07);
      c.save(); c.beginPath(); c.rect(cx - bw / 2, by - H * 0.02, bw, H * 0.04); c.clip();
      for (let s = -2; s < 10; s++){ c.fillStyle = s % 2 ? "#fff" : "#ff5a1f"; c.beginPath(); const sx0 = cx - bw / 2 + s * bw / 7; c.moveTo(sx0, by + H * 0.02); c.lineTo(sx0 + bw / 7, by + H * 0.02); c.lineTo(sx0 + bw / 7 + H * 0.04, by - H * 0.02); c.lineTo(sx0 + H * 0.04, by - H * 0.02); c.fill(); }
      c.restore();
    }
  }
  poVis.carros.forEach(a => {
    const cx = X(H * 0.32 + (a.i - 0.5) * LW);
    if (cx < -LW || cx > W + LW) return;
    dibujarAuto(c, cx, a.y * H, LW * 0.56, PO.largo * H, a.color);
  });
  c.textAlign = "center"; c.textBaseline = "middle";
  if (poVis.golpe){
    c.font = `${LW * 0.7}px sans-serif`; c.fillText("💥", X(gx), gy);
  } else {
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(X(gx), PO.fila * H + LW * 0.25, LW * 0.22, LW * 0.07, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(X(gx), gy); if (hop < 1) c.rotate(Math.sin(Math.PI * hop) * 0.25); c.scale(-1, 1);
    c.font = `${LW * 0.62}px sans-serif`; c.fillText("🐔", 0, 0); c.restore();
    if (po.paso > 0 && po.muerto < 0){
      const txt = poMult(po.paso).toFixed(2) + "×"; c.font = `800 ${LW * 0.19}px Manrope, sans-serif`;
      const w = c.measureText(txt).width + 16;
      c.fillStyle = "#00e701"; c.beginPath(); c.roundRect(X(gx) - w / 2, gy - LW * 0.62, w, LW * 0.26, LW * 0.13); c.fill();
      c.fillStyle = "#05121b"; c.fillText(txt, X(gx), gy - LW * 0.49);
    }
  }
}
function poBotones(){
  $("#po-jugar").disabled = po.activo;
  $("#po-avanzar").disabled = !po.activo;
  $("#po-cobrar").disabled = !po.activo || po.paso === 0;
  $("#po-cobrar").textContent = po.activo && po.paso ? `Cobrar ${fmt(Math.floor(po.bet * poMult(po.paso)))}` : "Cobrar";
  bloquear("#po-dif button", po.activo);
  ocupado = po.activo;
}
grupoOpciones("#po-dif button", b => { po.p = +b.dataset.p; po.paso = 0; po.muerto = -1; }, () => !po.activo);
$("#po-jugar").onclick = () => {
  if (ocupado || !apostar("#po-msg")) return;
  Object.assign(po, { activo: true, paso: 0, muerto: -1, bet: apuesta });
  msg("#po-msg", "Toca «Avanzar» para cruzar el primer carril.");
  poBotones();
};
$("#po-avanzar").onclick = async () => {
  $("#po-avanzar").disabled = true; $("#po-cobrar").disabled = true;
  const sig = po.paso + 1;
  if (azar() < po.p){
    po.muerto = sig; po.activo = false; poBotones();
    await espera(650);
    liquidar("#po-msg", 0, po.bet, `¡Lo atropellaron en el carril ${sig}! `);
    return;
  }
  po.paso = sig; sonido.salto();
  await espera(320);
  if (po.paso === PO_N){ poCobrar(); return; }
  msg("#po-msg", `Carril ${po.paso} superado. Multiplicador ${poMult(po.paso).toFixed(2)}×.`);
  poBotones();
};
function poCobrar(){
  const m = poMult(po.paso), gana = Math.floor(po.bet * m);
  po.activo = false; poBotones();
  liquidar("#po-msg", gana, po.bet, po.paso === PO_N ? `¡Cruzó toda la carretera! ${m.toFixed(2)}×. ` : `Cobraste a ${m.toFixed(2)}×. `);
}
$("#po-cobrar").onclick = poCobrar;
registrarJuego("pollo", { alMostrar: poTam });
