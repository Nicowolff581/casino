/* ═════════ Casino Nico · núcleo compartido por todos los juegos ═════════
   Aquí vive lo que antes estaba repetido: azar, saldo, apuestas, mensajes,
   pestañas y ajuste de lienzos. Los juegos solo usan estas funciones. */

/* ── atajos ── */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => n.toLocaleString("es-CO");
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ── azar justo ──
   Usa el generador criptográfico del navegador en vez de Math.random.
   Nadie (ni el propio casino) puede predecir ni inclinar los resultados. */
const azar = (() => {
  const buf = new Uint32Array(512); let i = buf.length;
  const u32 = () => { if (i >= buf.length){ crypto.getRandomValues(buf); i = 0; } return buf[i++]; };
  // 53 bits de azar: número entre 0 (incluido) y 1 (excluido)
  return () => (u32() * 2097152 + (u32() >>> 11)) / 9007199254740992;
})();
const azarEntero = n => Math.floor(azar() * n);                // 0 … n-1, todos igual de probables
function elegirPonderado(pesos, rnd = azar){                   // índice según pesos relativos
  let r = rnd() * pesos.reduce((a, b) => a + b, 0), i = 0;
  while ((r -= pesos[i]) > 0 && i < pesos.length - 1) i++;
  return i;
}
function barajar(arr){                                          // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--){ const j = azarEntero(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/* ── huella SHA-256 (para la prueba de juego justo) ──
   Convierte un texto en un código de 64 caracteres. Cambiar una sola letra del texto
   cambia la huella por completo, y no se puede adivinar el texto a partir de la huella. */
const sha256 = (() => {
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  return texto => {
    const datos = new TextEncoder().encode(texto), l = datos.length, largo = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(largo); m.set(datos); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(largo - 8, Math.floor(l / 0x20000000)); dv.setUint32(largo - 4, (l * 8) >>> 0);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
    for (let o = 0; o < largo; o += 64){
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++){
        const x = w[i - 15], y = w[i - 2];
        w[i] = w[i - 16] + (rot(x, 7) ^ rot(x, 18) ^ (x >>> 3)) + w[i - 7] + (rot(y, 17) ^ rot(y, 19) ^ (y >>> 10));
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++){
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return [...H].map(x => x.toString(16).padStart(8, "0")).join("");
  };
})();
// Número secreto al azar en hexadecimal (32 bytes = 64 caracteres).
const secretoAzar = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
// Generador de azar que sale SIEMPRE igual a partir del mismo secreto (para poder comprobarlo después).
function azarDesde(secreto){
  let bloque = 0, palabras = [];
  const u32 = () => { if (!palabras.length){ const h = sha256(secreto + ":" + bloque++); for (let i = 0; i < 64; i += 8) palabras.push(parseInt(h.slice(i, i + 8), 16)); } return palabras.shift(); };
  return () => (u32() * 2097152 + (u32() >>> 11)) / 9007199254740992;
}

/* ── saldo y apuesta ── */
const SALDO_INICIAL = 1000;
let saldo = SALDO_INICIAL, apuesta = 50, ocupado = false;
try { const g = localStorage.getItem("casino-nico-saldo"); if (g !== null && !isNaN(+g)) saldo = +g; } catch (e) {}

// El número del saldo sube o baja con un contador animado; la cifra real cambia al instante.
const saldoVista = { valor: saldo, anim: 0 };
function pintarSaldo(v){ $("#saldo").textContent = fmt(Math.round(v)); }
function setSaldo(v){
  const antes = saldo;
  saldo = v;
  try { localStorage.setItem("casino-nico-saldo", saldo); } catch (e) {}
  const caja = $("#saldo-caja"), dif = v - antes;
  if (!dif) return;
  caja.classList.remove("sube", "baja"); void caja.offsetWidth; caja.classList.add(dif > 0 ? "sube" : "baja");
  if (dif > 0){
    const f = document.createElement("span"); f.className = "flota mas"; f.textContent = "+" + fmt(dif);
    caja.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
  const desde = saldoVista.valor, t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(dif) / Math.max(1, antes) * 600);
  cancelAnimationFrame(saldoVista.anim);
  const paso = t => {
    const e = Math.min(1, (t - t0) / dur);
    saldoVista.valor = desde + (saldo - desde) * (1 - Math.pow(1 - e, 3));
    pintarSaldo(saldoVista.valor);
    if (e < 1) saldoVista.anim = requestAnimationFrame(paso);
  };
  saldoVista.anim = requestAnimationFrame(paso);
}
pintarSaldo(saldo);

function msg(id, texto, tipo = "neutral"){ const el = $(id); el.textContent = texto; el.className = "msg " + tipo; }

/* Descuenta una apuesta. Devuelve false (y avisa) si no alcanzan las fichas. */
function apostar(id, cantidad = apuesta){
  if (cantidad > saldo){
    msg(id, saldo === 0 ? "Te quedaste sin fichas. Usa «Recargar»." : "No tienes fichas suficientes. Elige una apuesta menor.", "lose");
    return false;
  }
  setSaldo(saldo - cantidad); sonido.ficha(); return true;
}

/* Paga y anuncia el resultado de una jugada.
   pagado = fichas que el jugador recibe; apostado = fichas que puso.
   Solo es victoria si recibe MÁS de lo que apostó. */
function tipoResultado(pagado, apostado){
  return pagado > apostado ? "win" : pagado === apostado && pagado > 0 ? "neutral" : pagado > 0 ? "parcial" : "lose";
}
function liquidar(id, pagado, apostado, extra = ""){
  if (pagado) setSaldo(saldo + pagado);
  const tipo = tipoResultado(pagado, apostado);
  const texto =
    apostado === 0 ? "No pusiste fichas en esta jugada." :
    tipo === "win" ? `¡Ganaste ${fmt(pagado - apostado)} fichas!` :
    tipo === "neutral" ? "Empate: recuperas tu apuesta." :
    tipo === "parcial" ? `Recuperas ${fmt(pagado)} de ${fmt(apostado)} fichas.` :
    `Perdiste ${fmt(apostado)} fichas.`;
  msg(id, extra + texto, apostado === 0 ? "neutral" : tipo);
  // Sonido y celebración según el tamaño del premio (nunca si recibes menos de lo apostado).
  if (apostado > 0){ if (tipo === "win") celebrar(pagado, apostado); else if (tipo === "lose") sonido.pierde(); }
  // Aviso para el historial y las estadísticas.
  document.dispatchEvent(new CustomEvent("jugada", { detail: { juego: juegoActivo, pagado, apostado, tipo } }));
  return tipo;
}

/* ── controles del monto ── */
const monto = $("#monto");
function setApuesta(v){ apuesta = Math.max(1, Math.floor(v) || 1); monto.value = apuesta; }
monto.addEventListener("input", () => { const v = Math.floor(+monto.value); if (v >= 1) apuesta = v; });
monto.addEventListener("change", () => setApuesta(+monto.value));
$$(".monto button").forEach(b => b.onclick = () => setApuesta(apuesta * +b.dataset.f));
$$(".rapidas button").forEach(b => b.onclick = () => setApuesta(+b.dataset.v));
$("#reiniciar").onclick = $("#recargar").onclick = () => { if (!ocupado){ setSaldo(SALDO_INICIAL); sonido.ficha(); } };

/* ── utilidades de interfaz ── */
// Grupo de botones donde solo uno queda marcado (dificultad, riesgo, número…).
function grupoOpciones(selector, alElegir, puede = () => !ocupado){
  const botones = $$(selector);
  botones.forEach(b => b.onclick = () => {
    if (!puede()) return;
    botones.forEach(x => x.setAttribute("aria-pressed", x === b));
    alElegir(b);
  });
  return botones;
}
const bloquear = (selector, si) => $$(selector).forEach(b => b.disabled = si);

// Ajusta un <canvas> a su tamaño en pantalla (nítido en pantallas de alta densidad).
function ajustarCanvas(canvas, ctx){
  const r = canvas.getBoundingClientRect(); if (!r.width) return false;
  const d = devicePixelRatio || 1;
  canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  return true;
}

/* ── registro de juegos y navegación ──
   "inicio" es la pantalla principal; los demás ids son juegos (#g-<id>).
   La dirección de la página (#ruleta, #bj…) recuerda dónde estás al recargar. */
const JUEGOS = {};               // id → { alMostrar() } ; cada juego se registra solo
let juegoActivo = "inicio";
function registrarJuego(id, def){ JUEGOS[id] = def; }
function mostrarJuego(id){
  if (id !== "inicio" && !$("#g-" + id)) id = "inicio";
  const cambiaVista = (juegoActivo === "inicio") !== (id === "inicio");
  juegoActivo = id;
  $$("nav button").forEach(x => x.dataset.juego === id ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"));
  $("#v-inicio").classList.toggle("activa", id === "inicio");
  $("#v-juego").classList.toggle("activa", id !== "inicio");
  $$(".game").forEach(g => g.classList.toggle("activo", g.id === "g-" + id));
  if (cambiaVista || id !== "inicio") scrollTo({ top: 0, behavior: "instant" });
  try { history.replaceState(null, "", "#" + id); } catch (e) {}
  JUEGOS[id]?.alMostrar?.();
}
function ir(id){ if (ocupado){ avisar("Termina la jugada en curso antes de cambiar."); return; } sonido.clic(); mostrarJuego(id); }
$$("nav button").forEach(b => b.onclick = () => ir(b.dataset.juego));
$$("[data-ir]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); ir(b.dataset.ir); }));
addEventListener("resize", () => JUEGOS[juegoActivo]?.alMostrar?.());

// Mensaje corto que aparece abajo unos segundos.
function avisar(texto){
  const t = $("#toast"); t.textContent = texto; t.classList.add("ver");
  clearTimeout(avisar.t); avisar.t = setTimeout(() => t.classList.remove("ver"), 2400);
}
