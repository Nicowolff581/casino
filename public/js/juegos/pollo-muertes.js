/* ═════════ POLLO · muertes de caricatura ═════════
   Solo son animaciones: el resultado ya está decidido antes de elegir la muerte.
   Cada una dibuja durante ~1,6 s. e = segundos desde que empezó; x, y = centro del pollo;
   S = tamaño del pollo en píxeles. Estilo dibujo animado, sin sangre. */

// Dibuja un emoji (con escala, giro y transparencia).
function emoji(c, ch, x, y, tam, rot = 0, sx = 1, sy = 1, alfa = 1){
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(rot); c.scale(sx, sy);
  c.font = `${tam}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, 0, 0);
  c.restore();
}
const pollo = (c, x, y, S, rot = 0, sx = 1, sy = 1, alfa = 1) => emoji(c, "🐔", x, y, S, rot, -sx, sy, alfa);
// Pollo teñido de un color (chamuscado): se dibuja en un lienzo aparte y se pinta encima.
const _tenidos = {};
function polloTenido(c, x, y, S, color, sy = 1){
  const k = S + color; let lz = _tenidos[k];
  if (!lz){
    lz = _tenidos[k] = document.createElement("canvas"); lz.width = lz.height = Math.ceil(S * 1.4);
    const g = lz.getContext("2d"); pollo(g, lz.width / 2, lz.height / 2, S);
    g.globalCompositeOperation = "source-atop"; g.fillStyle = color; g.fillRect(0, 0, lz.width, lz.height);
  }
  c.save(); c.translate(x, y); c.scale(1, sy); c.drawImage(lz, -lz.width / 2, -lz.height / 2); c.restore();
}
const caida = (e, dur) => Math.min(1, e / dur) ** 2;                     // cae cada vez más rápido
function texto(c, t, x, y, S, color = "#fff6c9", e = 1){
  c.save(); c.font = `900 ${S * 0.42}px Manrope, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.translate(x, y); c.rotate(-0.12); c.scale(0.6 + 0.4 * Math.min(1, e * 4), 0.6 + 0.4 * Math.min(1, e * 4));
  c.lineWidth = S * 0.08; c.strokeStyle = "#2a0f05"; c.strokeText(t, 0, 0); c.fillStyle = color; c.fillText(t, 0, 0); c.restore();
}
function polvo(c, x, y, S, e){
  if (e < 0 || e > 0.9) return;
  c.fillStyle = `rgba(220,215,200,${0.6 * (1 - e / 0.9)})`;
  for (let i = 0; i < 7; i++){ const a = Math.PI * (i / 6); c.beginPath(); c.arc(x + Math.cos(a) * S * (0.4 + e), y - Math.sin(a) * S * 0.25 * e, S * (0.12 + e * 0.15), 0, Math.PI * 2); c.fill(); }
}
function aplastado(c, x, y, S, e){ pollo(c, x, y + S * 0.3, S * 1.1, 0, 1.3, 0.22); polvo(c, x, y + S * 0.35, S, e); }
function yunque(c, x, y, S){
  c.save(); c.translate(x, y); c.scale(S / 60, S / 60); c.fillStyle = "#3c4049";
  c.beginPath(); c.moveTo(-34, -14); c.lineTo(30, -14); c.quadraticCurveTo(44, -14, 46, -6); c.lineTo(16, -4); c.lineTo(12, 8); c.lineTo(22, 16); c.lineTo(-22, 16); c.lineTo(-12, 8); c.lineTo(-16, -4); c.lineTo(-34, -6); c.closePath(); c.fill();
  c.fillStyle = "#6b707c"; c.fillRect(-34, -14, 74, 4); c.restore();
}
function piano(c, x, y, S){
  c.save(); c.translate(x, y); c.scale(S / 60, S / 60);
  c.fillStyle = "#15121a"; c.beginPath(); c.roundRect(-44, -30, 88, 44, 8); c.fill();
  c.fillStyle = "#f4efe1"; c.fillRect(-38, 2, 76, 10);
  c.fillStyle = "#15121a"; for (let i = 0; i < 9; i++) if (i % 7 !== 2 && i % 7 !== 6) c.fillRect(-35 + i * 8.4, 2, 4, 6);
  c.fillRect(-40, 14, 5, 12); c.fillRect(35, 14, 5, 12);
  c.fillStyle = "#d8b25a"; c.fillRect(-10, -24, 20, 3); c.restore();
}
function ovni(c, x, y, S){
  c.save(); c.translate(x, y); c.scale(S / 60, S / 60);
  c.fillStyle = "rgba(170,230,255,.8)"; c.beginPath(); c.ellipse(0, -8, 16, 13, 0, Math.PI, 0); c.fill();
  c.fillStyle = "#9aa3b5"; c.beginPath(); c.ellipse(0, 0, 44, 11, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#636b7d"; c.beginPath(); c.ellipse(0, 3, 44, 7, 0, 0, Math.PI); c.fill();
  for (let i = -2; i <= 2; i++){ c.fillStyle = (performance.now() / 150 + i) % 2 < 1 ? "#ffe066" : "#7ee29a"; c.beginPath(); c.arc(i * 16, 2, 3, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
function rayo(c, x, y0, y1, S){
  c.save(); c.strokeStyle = "#fff6c9"; c.lineWidth = S * 0.09; c.lineJoin = "round"; c.shadowColor = "#ffe066"; c.shadowBlur = S * 0.4;
  c.beginPath(); c.moveTo(x - S * 0.1, y0); const n = 5;
  for (let i = 1; i <= n; i++) c.lineTo(x + (i % 2 ? S * 0.22 : -S * 0.16) * (i < n ? 1 : 0), y0 + (y1 - y0) * i / n);
  c.stroke(); c.restore();
}

const MUERTES = [
  { id: "elefante", frase: "¡Le cayó un elefante", sonar(){ sonido.golpe(0.45); },
    dibujar(c, x, y, S, e){
      const k = caida(e, 0.45), ey = y - 5 * S + (4.55 * S) * k;
      if (e < 0.45){ pollo(c, x, y, S); emoji(c, "🐘", x, ey, S * 1.9); return; }
      aplastado(c, x, y, S, e - 0.45); emoji(c, "🐘", x, y - S * 0.45 - Math.abs(Math.sin((e - 0.45) * 9)) * S * 0.12 * Math.max(0, 1 - (e - 0.45) * 2), S * 1.9);
      texto(c, "¡PLAF!", x + S * 1.2, y - S * 1.3, S, "#fff6c9", e - 0.45);
    } },
  { id: "piano", frase: "¡Le cayó un piano", sonar(){ sonido.piano(0.5); },
    dibujar(c, x, y, S, e){
      const k = caida(e, 0.5), py = y - 5 * S + 4.75 * S * k;
      if (e < 0.5){ pollo(c, x, y, S); piano(c, x, py, S * 1.3); return; }
      aplastado(c, x, y, S, e - 0.5); piano(c, x, y - S * 0.25, S * 1.3);
      for (let i = 0; i < 4; i++){ const f = (e - 0.5 - i * 0.18); if (f > 0) emoji(c, i % 2 ? "♫" : "♪", x - S * 0.6 + i * S * 0.4, y - S * (0.9 + f * 1.2), S * 0.5, 0, 1, 1, Math.max(0, 1 - f)); }
    } },
  { id: "yunque", frase: "¡Le cayó un yunque", sonar(){ sonido.clang(0.4); },
    dibujar(c, x, y, S, e){
      const k = caida(e, 0.4);
      if (e < 0.4){ pollo(c, x, y, S); yunque(c, x, y - 5 * S + 4.9 * S * k, S * 1.2); return; }
      aplastado(c, x, y, S, e - 0.4); yunque(c, x, y + S * 0.02, S * 1.2);
      for (let i = 0; i < 4; i++){ const a = (e * 5) + i * Math.PI / 2; emoji(c, "⭐", x + Math.cos(a) * S * 0.6, y - S * 0.75 + Math.sin(a) * S * 0.15, S * 0.28); }
    } },
  { id: "ovni", frase: "¡Se lo llevó un ovni", sonar(){ sonido.ovni(0.1); sonido.silbido(1.15); },
    dibujar(c, x, y, S, e){
      const oy = e < 0.4 ? y - 5 * S + 3.4 * S * Math.sin(e / 0.4 * Math.PI / 2) : y - 1.6 * S;
      let ox = x, oyf = oy;
      if (e > 1.15){ const f = (e - 1.15) / 0.45; ox = x + f * f * 8 * S; oyf = oy - f * f * 4 * S; }
      const sube = Math.min(1, Math.max(0, (e - 0.45) / 0.7));
      if (e > 0.4 && e < 1.2){
        c.fillStyle = `rgba(126,226,154,${0.28 + 0.1 * Math.sin(e * 30)})`;
        c.beginPath(); c.moveTo(x - S * 0.3, oy + S * 0.2); c.lineTo(x + S * 0.3, oy + S * 0.2); c.lineTo(x + S * 0.7, y + S * 0.4); c.lineTo(x - S * 0.7, y + S * 0.4); c.closePath(); c.fill();
      }
      if (sube < 1) pollo(c, x, y - sube * (y - oy - S * 0.3), S * (1 - sube * 0.6), Math.sin(e * 12) * 0.3 * sube);
      ovni(c, ox, oyf, S * 1.4);
    } },
  { id: "meteorito", frase: "¡Lo aplastó un meteorito", sonar(){ sonido.boom(0.45); },
    dibujar(c, x, y, S, e){
      if (e < 0.45){
        const k = e / 0.45, mx = x + (1 - k) * 6 * S, my = y - (1 - k) * 5 * S;
        pollo(c, x, y, S);
        c.fillStyle = "rgba(255,160,60,.45)"; for (let i = 1; i < 6; i++){ c.beginPath(); c.arc(mx + i * S * 0.3, my - i * S * 0.25, S * (0.35 - i * 0.05), 0, Math.PI * 2); c.fill(); }
        emoji(c, "🪨", mx, my, S * 0.9, e * 8); return;
      }
      const f = e - 0.45;
      polloTenido(c, x, y, S, "#2b2622");
      if (Math.floor(e * 3) % 3) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x + S * 0.08, y - S * 0.12, S * 0.05, 0, Math.PI * 2); c.fill(); }   // ojos parpadeando
      c.fillStyle = `rgba(90,85,80,${Math.max(0, 0.7 - f * 0.6)})`;
      for (let i = 0; i < 6; i++){ const a = i * 1.05; c.beginPath(); c.arc(x + Math.cos(a) * S * f * 1.2, y - S * 0.3 - f * S * 0.8 + Math.sin(a) * S * 0.3, S * (0.3 + f * 0.4), 0, Math.PI * 2); c.fill(); }
      texto(c, "¡BUM!", x - S * 1.1, y - S * 1.3, S, "#ffb35c", f);
    } },
  { id: "cohete", frase: "¡Salió disparado como un cohete", sonar(){ sonido.silbido(0.25); },
    dibujar(c, x, y, S, e){
      const f = Math.max(0, e - 0.25), py = y - f * f * 9 * S, rot = f * 6;
      for (let i = 0; i < 8; i++){ const g = f - i * 0.06; if (g > 0){ c.fillStyle = `rgba(230,230,235,${0.5 - i * 0.05})`; c.beginPath(); c.arc(x + Math.sin(i) * S * 0.15, y - g * g * 9 * S + S * 0.6, S * (0.2 + i * 0.05), 0, Math.PI * 2); c.fill(); } }
      if (f > 0){ c.fillStyle = "#ff9f1c"; c.beginPath(); c.moveTo(x - S * 0.12, py + S * 0.35); c.lineTo(x, py + S * (0.7 + Math.random() * 0.25)); c.lineTo(x + S * 0.12, py + S * 0.35); c.fill(); }
      emoji(c, "🚀", x + S * 0.05, py + S * 0.28, S * 0.55, -Math.PI / 4);
      pollo(c, x, py - (e < 0.25 ? Math.sin(e * 60) * S * 0.03 : 0), S, rot);
    } },
  { id: "asado", frase: "¡Quedó como pollo asado", sonar(){ sonido.fuego(0); },
    dibujar(c, x, y, S, e){
      if (e < 0.85){
        pollo(c, x, y, S);
        for (let i = 0; i < 5; i++) emoji(c, "🔥", x - S * 0.5 + i * S * 0.25, y + S * 0.15 - Math.abs(Math.sin(e * 14 + i)) * S * 0.2, S * (0.5 + 0.2 * Math.sin(e * 20 + i)), 0, 1, 1, Math.min(1, e * 4));
        return;
      }
      const f = e - 0.85;
      c.fillStyle = "#ece6d6"; c.beginPath(); c.ellipse(x, y + S * 0.32, S * 0.7, S * 0.14, 0, 0, Math.PI * 2); c.fill();
      emoji(c, "🍗", x, y, S * 0.95, -0.3, 1, 1, Math.min(1, f * 4));
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = S * 0.04;
      for (let i = 0; i < 3; i++){ const sx = x - S * 0.25 + i * S * 0.25, sy = y - S * 0.5 - (f * S * 0.5) % (S * 0.4); c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + S * 0.1, sy - S * 0.15, sx, sy - S * 0.3); c.stroke(); }
    } },
  { id: "rayo", frase: "¡Le cayó un rayo", sonar(){ sonido.zap(0.3); },
    dibujar(c, x, y, S, e){
      emoji(c, "☁️", x, y - 2.3 * S, S * 1.4, 0, 1, 1, Math.min(1, e * 3));
      if (e < 0.3){ pollo(c, x, y, S); return; }
      if (e < 0.55){ rayo(c, x, y - 2 * S, y - S * 0.2, S); c.fillStyle = "rgba(255,255,220,.25)"; c.fillRect(x - 3 * S, y - 3 * S, 6 * S, 6 * S); }
      polloTenido(c, x, y, S, "#1d1b19");
      c.strokeStyle = "#ffe066"; c.lineWidth = S * 0.05;
      for (let i = 0; i < 7; i++){ const a = -Math.PI * (0.1 + i * 0.13), l = S * (0.55 + 0.1 * Math.sin(e * 40 + i)); c.beginPath(); c.moveTo(x + Math.cos(a) * S * 0.3, y + Math.sin(a) * S * 0.3); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
      c.fillStyle = "#fff"; c.beginPath(); c.arc(x + S * 0.08, y - S * 0.12, S * 0.05, 0, Math.PI * 2); c.fill();
    } },
  { id: "globos", frase: "¡Se lo llevaron unos globos", sonar(){ sonido.globos(0.3); },
    dibujar(c, x, y, S, e){
      const baja = Math.min(1, e / 0.35), f = Math.max(0, e - 0.4), py = y - f * f * 7 * S, px = x + Math.sin(f * 5) * S * 0.3;
      const gy = py - S * 1.5 - (1 - baja) * 4 * S;
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.2;
      [-0.35, 0, 0.35].forEach((dx, i) => { const bx = px + dx * S, by = gy - (i === 1 ? S * 0.3 : 0); c.beginPath(); c.moveTo(px, py - S * 0.35); c.lineTo(bx, by + S * 0.3); c.stroke(); emoji(c, "🎈", bx, by, S * 0.75, dx * 0.5); });
      pollo(c, px, py, S, Math.sin(f * 6) * 0.2);
    } },
  { id: "guante", frase: "¡Lo mandó a volar un guante de boxeo", sonar(){ sonido.boing(0.25); sonido.brillo(1.2); },
    dibujar(c, x, y, S, e){
      const golpe = Math.min(1, e / 0.28), gx = x - 3 * S + golpe * 2.35 * S;
      c.strokeStyle = "#9aa3b5"; c.lineWidth = S * 0.06; c.beginPath();
      for (let i = 0; i <= 12; i++){ const px = x - 3.4 * S + (gx - x + 3.4 * S) * i / 12, py = y + (i % 2 ? -1 : 1) * S * 0.12; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      emoji(c, "🥊", gx, y, S * 0.8, Math.PI / 2 * 0);
      if (e < 0.28){ pollo(c, x, y, S); return; }
      const f = e - 0.28, lejos = Math.min(1, f / 0.9);
      if (lejos < 1) pollo(c, x + lejos * 7 * S, y - Math.sin(lejos * Math.PI * 0.6) * 3.5 * S, S * (1 - lejos * 0.85), f * 18);
      else emoji(c, "✨", x + 7 * S, y - 2.8 * S, S * 0.6 * (1 + 0.3 * Math.sin(e * 20)));
      if (f < 0.4) texto(c, "¡PUM!", x - S * 0.2, y - S * 1.1, S, "#fff6c9", f);
    } },
];
