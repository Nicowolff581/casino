/* ═════════ Casino Nico · celebraciones proporcionales al premio ═════════
   Solo se llama cuando el jugador recibe MÁS de lo que apostó (ver liquidar en nucleo.js).
   Premio normal (menos de 3 veces la apuesta): sonido corto.
   Premio grande (3 a 15 veces): confeti y monedas.
   Premio enorme (15 veces o más): pantalla de «Gran premio» con contador, confeti y lluvia de monedas. */
const FIESTA_GRANDE = 3, FIESTA_ENORME = 15;
const COLORES_FIESTA = ["#d8b25a", "#efd28e", "#7a1a2a", "#f7f0de", "#7ee29a", "#c8102e"];

function confeti(n = 60, x = innerWidth / 2, y = innerHeight * 0.35){
  const capa = $("#fiesta");
  for (let i = 0; i < n; i++){
    const c = document.createElement("span"), a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, d = 160 + Math.random() * 320;
    c.className = "confeti";
    c.style.cssText = `left:${x}px;top:${y}px;background:${COLORES_FIESTA[i % COLORES_FIESTA.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d + 260 + Math.random() * 200}px;` +
      `--r:${(Math.random() - 0.5) * 1440}deg;--dur:${1.3 + Math.random() * 1}s;width:${6 + Math.random() * 6}px`;
    capa.appendChild(c); setTimeout(() => c.remove(), 2500);
  }
}
function lluviaMonedas(n = 30){
  const capa = $("#fiesta");
  for (let i = 0; i < n; i++){
    const m = document.createElement("span"); m.className = "moneda-lluvia";
    m.style.cssText = `left:${Math.random() * 96}%;animation-delay:${Math.random() * 0.9}s;--dur:${1.8 + Math.random() * 1.2}s;transform:scale(${0.7 + Math.random() * 0.6})`;
    capa.appendChild(m); setTimeout(() => m.remove(), 4200);
  }
}

// Pantalla de «Gran premio»: el número sube desde 0 hasta lo cobrado.
function granPremio(pagado, apostado){
  const caja = $("#gran-premio"); if (!caja.hidden) return;
  const m = pagado / apostado;
  $("#gp-titulo").textContent = m >= 50 ? "¡Premio legendario!" : "¡Gran premio!";
  $("#gp-detalle").textContent = `${fmt(Math.round(m * 100) / 100)} veces tu apuesta · ganancia +${fmt(pagado - apostado)}`;
  caja.hidden = false;
  const num = $("#gp-monto"), t0 = performance.now(), dur = Math.min(3200, 1400 + Math.log10(m) * 900);
  let ultimo = 0;
  const paso = t => {
    if (caja.hidden) return;
    const e = Math.min(1, (t - t0) / dur);
    num.textContent = fmt(Math.round(pagado * (1 - Math.pow(1 - e, 3))));
    if (t - ultimo > 70 && e < 1){ sonido.cuenta(); ultimo = t; }
    if (e < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  clearTimeout(granPremio.t);
  granPremio.t = setTimeout(cerrarGranPremio, dur + 2600);
}
function cerrarGranPremio(){ $("#gran-premio").hidden = true; clearTimeout(granPremio.t); }
$("#gran-premio").addEventListener("click", cerrarGranPremio);

function celebrar(pagado, apostado){
  if (!(pagado > apostado)) return;                     // regla: nunca celebrar si recibes menos o lo mismo
  const m = pagado / apostado;
  if (m >= FIESTA_ENORME){
    sonido.gana(3); sonido.monedas(14, 0.4);
    granPremio(pagado, apostado); lluviaMonedas(50); confeti(120);
    setTimeout(() => confeti(80, innerWidth * 0.25, innerHeight * 0.4), 450);
    setTimeout(() => confeti(80, innerWidth * 0.75, innerHeight * 0.4), 800);
  } else if (m >= FIESTA_GRANDE){
    sonido.gana(2); sonido.monedas(8, 0.3);
    confeti(70); lluviaMonedas(14);
  } else {
    sonido.gana(1);
  }
}
