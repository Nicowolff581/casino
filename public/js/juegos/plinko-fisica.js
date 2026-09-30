/* ═════════ PLINKO · física de la bola ═════════
   Medidas en «pasos»: 1 = distancia entre filas de clavos. x = 0 es el centro; y crece hacia abajo.
   La fila r (0 a 11) tiene r + 3 clavos en x = i − (r + 2) / 2, y = r.

   Cómo cae una bola:
   · Cae con gravedad (acelera) hasta tocar un clavo.
   · EN ESE MOMENTO se sortea con el azar justo: 50 % izquierda, 50 % derecha.
   · Rebota con un tiro parabólico (misma gravedad) hasta el clavo de la fila siguiente que queda
     de ese lado, o hasta la casilla si era la última fila. La altura y la fuerza de cada rebote,
     el punto exacto del choque, el giro y los rebotes dobles cambian cada vez (solo decoración):
     el lado ya está sorteado y ningún detalle del dibujo lo cambia.
   · Cada tiro se revisa para que la bola nunca atraviese un clavo y pierda algo de fuerza al chocar.
   La casilla final es la cantidad de veces que fue a la derecha (0 a 12). */
const PLF = { FILAS: 12, G: 160, RP: 0.1, RB: 0.22, INICIO: -1.25, Y_CASILLA: 12.6, Y_BOCA: 11.72, DOBLE: 0.07, MARGEN: 0.01 };
PLF.D = PLF.RP + PLF.RB;
PLF.ESC = Math.sqrt(80 / PLF.G);                                  // los tiempos de los rebotes se ajustan a la gravedad                                          // distancia entre centros al tocarse
const plfClavoX = (r, i) => i - (r + 2) / 2;

// Distancia mínima del tiro a los clavos cercanos, mirando todo el recorrido salvo el primer y el
// último pedacito (ahí la bola está justo tocando un clavo; eso se revisa aparte con la dirección).
const PLF_MUESTRAS = Array.from({ length: 33 }, (_, i) => 0.02 + i * 0.03);
function plfHolgura(x0, y0, vx, vy, T){
  let min = Infinity;
  for (const f of PLF_MUESTRAS){
    const t = T * f, x = x0 + vx * t, y = y0 + vy * t + 0.5 * PLF.G * t * t;
    for (let r = Math.max(0, Math.floor(y - PLF.D)); r <= Math.min(PLF.FILAS - 1, Math.ceil(y + PLF.D)); r++){
      const i = Math.round(x + (r + 2) / 2);
      for (let j = Math.max(0, i - 1); j <= Math.min(r + 2, i + 1); j++){
        const dx = x - plfClavoX(r, j), dy = y - r, d = Math.sqrt(dx * dx + dy * dy);
        if (d < min) min = d;
      }
    }
  }
  return min;
}
// ¿El tiro sale alejándose del clavo de donde parte y llega acercándose al clavo que va a tocar?
function plfDirecciones(s, desde, hasta){
  const [vxF, vyF] = [s.vx, s.vy + PLF.G * s.T];
  const xF = s.x0 + s.vx * s.T, yF = s.y0 + s.vy * s.T + 0.5 * PLF.G * s.T * s.T;
  const sale = !desde || (s.vx * (s.x0 - desde[0]) + s.vy * (s.y0 - desde[1])) > 0.05;
  const llega = !hasta || (vxF * (xF - hasta[0]) + vyF * (yF - hasta[1])) < -0.05;
  return sale && llega;
}
// Tiro parabólico que va de (x0,y0) a (x1,y1) en T segundos.
const plfTiro = (x0, y0, x1, y1, T) => ({ x0, y0, vx: (x1 - x0) / T, vy: (y1 - y0 - 0.5 * PLF.G * T * T) / T, T });
// Busca un tiro creíble: sin atravesar clavos y, si se puede, con menos fuerza que la que traía
// (pierde energía al chocar). Si ninguno cumple las dos cosas, el más suave de los que no tocan clavos;
// y como último recurso, el que más lejos pasa de los clavos entre muchos tiempos posibles.
function plfBuscarTiro(x0, y0, x1, y1, Tmin, Tmax, vEntrada, desde, hasta, deco){
  const bien = (s, h) => h >= PLF.D + PLF.MARGEN && plfDirecciones(s, desde, hasta);
  const e = 0.55 + deco() * 0.3, seguros = [];                     // e: cuánta fuerza conserva en este choque
  for (let intento = 0; intento < 12; intento++){
    const T = Tmin + deco() * (Tmax - Tmin), s = plfTiro(x0, y0, x1, y1, T);
    if (!bien(s, plfHolgura(s.x0, s.y0, s.vx, s.vy, T))) continue;
    s.fuerza = Math.hypot(s.vx, s.vy);
    if (s.fuerza <= e * vEntrada) return s;
    seguros.push(s);
  }
  if (seguros.length) return seguros.reduce((m, s) => s.fuerza < m.fuerza ? s : m);
  let mejor = null, mejorH = -1;
  for (let T = 0.08 * PLF.ESC; T <= 0.8 * PLF.ESC; T += 0.02 * PLF.ESC){
    const s = plfTiro(x0, y0, x1, y1, T), h = plfHolgura(s.x0, s.y0, s.vx, s.vy, T) - (plfDirecciones(s, desde, hasta) ? 0 : 1);
    if (h > mejorH){ mejorH = h; mejor = s; }
    if (bien(s, h)) break;
  }
  mejor.respaldo = true;
  return mejor;
}
// Punto donde queda el centro de la bola cuando toca el clavo (ángulo a desde arriba; negativo = lado izquierdo).
const plfContacto = (px, py, a) => [px + PLF.D * Math.sin(a), py - PLF.D * Math.cos(a)];

// Bola nueva. azarJusto decide los lados; deco solo cambia cómo se ve.
function plfNueva(azarJusto, deco = Math.random){
  const a = (deco() - 0.5) * 0.7, [cx, cy] = plfContacto(0, 0, a), T = Math.sqrt(2 * (cy - PLF.INICIO) / PLF.G);
  return { azarJusto, deco, t: 0, fila: 0, derechas: 0, dirs: [], lado: 0, fin: false, casilla: null, ang: deco() * 6.28, giro: (deco() - 0.5) * 4,
    seg: { x0: cx, y0: PLF.INICIO, vx: 0, vy: 0, T, t0: 0, evento: "clavo" }, rebotesDobles: 0, forzados: 0 };
}
const plfVel = s => [s.vx, s.vy + PLF.G * s.T];                    // velocidad al final del tiro
function plfPos(b, t){
  const s = b.seg, u = Math.min(Math.max(0, t - s.t0), s.T);
  return [s.x0 + s.vx * u, s.y0 + s.vy * u + 0.5 * PLF.G * u * u];
}
// Avanza la bola hasta el tiempo t (segundos desde que se soltó). Devuelve lo que pasó: choques y llegada.
function plfAvanzar(b, t){
  const pasos = [];
  while (!b.fin && t >= b.seg.t0 + b.seg.T){
    const s = b.seg, tc = s.t0 + s.T, x = s.x0 + s.vx * s.T, y = s.y0 + s.vy * s.T + 0.5 * PLF.G * s.T * s.T;
    const [vxE, vyE] = plfVel(s), vEntrada = Math.hypot(vxE, vyE), d = b.deco;
    const px = plfClavoX(b.fila, b.derechas + 1), py = b.fila;       // clavo que está tocando
    if (s.evento === "clavo" || s.evento === "doble"){
      if (s.evento === "clavo"){
        b.lado = b.azarJusto() < 0.5 ? -1 : 1;                        // el sorteo justo, en el momento del choque
        b.dirs.push(b.lado === 1 ? 1 : 0);
        pasos.push({ tipo: "clavo", fila: b.fila, clavo: b.derechas + 1, fuerza: Math.min(1, vEntrada * PLF.ESC / 9), t: tc });
      }
      b.giro = b.giro * 0.4 + b.lado * (2 + d() * 5);                  // al rebotar empieza a girar hacia su lado
      // a veces: un rebotecito sobre el mismo clavo antes de salir
      if (s.evento === "clavo" && d() < PLF.DOBLE){
        const [hx, hy] = plfContacto(px, py, b.lado * (0.12 + d() * 0.3));
        const tiro = plfBuscarTiro(x, y, hx, hy, 0.08 * PLF.ESC, 0.18 * PLF.ESC, vEntrada, [px, py], [px, py], d);
        if (!tiro.respaldo){
          b.seg = { ...tiro, t0: tc, evento: "doble" }; b.rebotesDobles++; continue;
        }
      }
      if (s.evento === "doble") pasos.push({ tipo: "doble", fila: b.fila, clavo: b.derechas + 1, fuerza: Math.min(1, vEntrada * PLF.ESC / 9) * 0.5, t: tc });
      if (b.lado === 1) b.derechas++;
      if (b.fila === PLF.FILAS - 1){
        // última fila: salta hacia la boca de la casilla de ese lado…
        const xk = b.derechas - PLF.FILAS / 2 + (d() - 0.5) * 0.14;
        const tiro = plfBuscarTiro(x, y, xk, PLF.Y_BOCA, 0.12 * PLF.ESC, 0.42 * PLF.ESC, vEntrada, [px, py], null, d);
        if (tiro.respaldo) b.forzados++;
        b.seg = { ...tiro, t0: tc, evento: "boca" }; b.fila++;
      } else {
        b.fila++;
        const [nx, ny] = plfContacto(plfClavoX(b.fila, b.derechas + 1), b.fila, -b.lado * (0.02 + d() * 0.2));
        const tiro = plfBuscarTiro(x, y, nx, ny, 0.12 * PLF.ESC, 0.42 * PLF.ESC, vEntrada, [px, py], [plfClavoX(b.fila, b.derechas + 1), b.fila], d);
        if (tiro.respaldo) b.forzados++;
        b.seg = { ...tiro, t0: tc, evento: "clavo" };
      }
    } else if (s.evento === "boca"){
      // …y cae adentro de la casilla (ya no hay clavos debajo)
      const T = (-vyE + Math.sqrt(vyE * vyE + 2 * PLF.G * (PLF.Y_CASILLA - y))) / PLF.G;
      b.seg = { x0: x, y0: y, vx: Math.max(-0.35, Math.min(0.35, vxE * 0.25)), vy: vyE, T, t0: tc, evento: "casilla" };
    } else if (s.evento === "casilla"){
      b.casilla = b.derechas;
      pasos.push({ tipo: "casilla", casilla: b.casilla, t: tc });
      // se asienta en la casilla con un par de saltitos (solo decoración)
      const alto = 0.12 + d() * 0.12, T = 2 * Math.sqrt(2 * alto / PLF.G);
      b.seg = { x0: x, y0: y, vx: (d() - 0.5) * 0.3, vy: -PLF.G * T / 2, T, t0: tc, evento: "reposo" }; b.giro *= 0.5;
    } else { b.fin = true; b.tFin = tc; }
  }
  return pasos;
}
// Cae una bola completa sin dibujar (para simular y para las pruebas).
function plfCaidaCompleta(azarJusto, deco = Math.random){
  const b = plfNueva(azarJusto, deco);
  const pasos = plfAvanzar(b, 1e9);
  return { b, pasos };
}
