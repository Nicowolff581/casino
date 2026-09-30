/* ═════════ Casino Nico · sonidos generados con Web Audio ═════════
   No hay archivos de audio: cada sonido se "sintetiza" con osciladores y ruido.
   El navegador solo permite sonar después de que la persona toca algo, por eso
   el audio se enciende en el primer toque o tecla. Volumen y silencio se guardan. */
const sonido = (() => {
  let ctx = null, master = null, ruido = null;
  const conf = { vol: 0.7, on: true };
  try { Object.assign(conf, JSON.parse(localStorage.getItem("casino-nico-sonido")) || {}); } catch (e) {}
  const guardar = () => { try { localStorage.setItem("casino-nico-sonido", JSON.stringify(conf)); } catch (e) {} };
  const nivel = () => conf.on ? conf.vol * conf.vol : 0;          // curva más natural al oído

  function iniciar(){
    if (ctx){ if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master = ctx.createGain(); master.gain.value = nivel();
    master.connect(comp); comp.connect(ctx.destination);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  addEventListener("pointerdown", iniciar, true);
  addEventListener("keydown", iniciar, true);
  const listo = () => ctx && ctx.state === "running" && nivel() > 0;

  // Nota con envolvente: sube rápido y se apaga suave. f2 = frecuencia final (deslizamiento).
  function tono({ f = 440, f2 = 0, tipo = "sine", t = 0, dur = 0.15, vol = 0.25, ataque = 0.004 }){
    if (!listo()) return;
    const t0 = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // Golpe de ruido filtrado (fichas, cartas, clics de la ruleta).
  function soplo({ t = 0, dur = 0.06, vol = 0.25, filtro = "bandpass", f = 3000, f2 = 0, q = 1 }){
    if (!listo()) return;
    const t0 = ctx.currentTime + t, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    fl.type = filtro; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }
  const NOTAS = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];   // do mayor

  return {
    clic(){ tono({ f: 1100, tipo: "triangle", dur: 0.035, vol: 0.08 }); },
    ficha(){                                                             // fichas que chocan
      soplo({ f: 4200, q: 9, dur: 0.035, vol: 0.35 }); soplo({ t: 0.055, f: 3300, q: 9, dur: 0.04, vol: 0.28 });
      tono({ f: 2600, tipo: "sine", dur: 0.05, vol: 0.04 });
    },
    carta(t = 0){ soplo({ t, filtro: "highpass", f: 1400, f2: 5000, dur: 0.11, vol: 0.22, q: 0.7 }); },
    salto(){ tono({ f: 380, f2: 760, tipo: "triangle", dur: 0.12, vol: 0.12 }); },
    // Plinko: cada toque suena un poco distinto (tono, timbre y volumen según la fuerza del choque)
    clavito(fila = 0, fuerza = 1){ tono({ f: (880 + fila * 60) * (0.93 + Math.random() * 0.14), tipo: Math.random() < 0.6 ? "sine" : "triangle", dur: 0.035 + Math.random() * 0.045, vol: 0.025 + 0.06 * fuerza }); },
    clavo(k = 0){ tono({ f: 900 + k * 70, tipo: "sine", dur: 0.06, vol: 0.06 }); },
    tope(t = 0){ tono({ t, f: 170, f2: 70, tipo: "square", dur: 0.09, vol: 0.09 }); soplo({ t, filtro: "lowpass", f: 900, dur: 0.07, vol: 0.2 }); },
    // Clics que se van espaciando, como la bola de la ruleta o un rodillo frenando.
    giro(ms = 4000, desde = 0.045, hasta = 0.32){
      if (!listo()) return;
      let t = 0; const fin = ms / 1000;
      while (t < fin){ const e = t / fin; soplo({ t, f: 2600, q: 6, dur: 0.02, vol: 0.12 + 0.08 * e }); t += desde + (hasta - desde) * e * e; }
    },
    rodillo(ms = 1500){ this.giro(ms, 0.05, 0.09); },
    gana(n = 1){                                                         // 1 normal, 2 grande, 3 enorme
      const k = n === 1 ? 3 : n === 2 ? 5 : 7;
      for (let i = 0; i < k; i++) tono({ t: i * 0.075, f: NOTAS[i], tipo: "triangle", dur: 0.28, vol: 0.14 });
      if (n >= 2) for (let i = 0; i < 3; i++) tono({ t: k * 0.075 + 0.05, f: NOTAS[i + 2], tipo: "sine", dur: 0.9, vol: 0.09 });
      if (n >= 3) for (let i = 0; i < 12; i++) tono({ t: 0.7 + i * 0.07, f: 2000 + Math.random() * 1600, tipo: "sine", dur: 0.08, vol: 0.05 });
    },
    monedas(n = 8, t = 0){ for (let i = 0; i < n; i++) tono({ t: t + i * 0.06 + Math.random() * 0.03, f: 2200 + Math.random() * 1400, tipo: "sine", dur: 0.07, vol: 0.06 }); },
    cuenta(){ tono({ f: 1500, tipo: "square", dur: 0.02, vol: 0.025 }); },
    pierde(){ tono({ f: 330, f2: 250, tipo: "triangle", dur: 0.22, vol: 0.1 }); tono({ t: 0.16, f: 250, f2: 190, tipo: "triangle", dur: 0.3, vol: 0.09 }); },
    // bola de Plinko cayendo en una casilla: más brillo cuanto mayor el multiplicador
    caja(m){
      if (m < 1){ tono({ f: 260, f2: 200, tipo: "triangle", dur: 0.18, vol: 0.08 }); return; }
      if (m < 2){ tono({ f: 660, tipo: "sine", dur: 0.2, vol: 0.1 }); return; }
      const n = m >= 10 ? 7 : 4;
      for (let i = 0; i < n; i++) tono({ t: i * 0.06, f: NOTAS[i], tipo: "square", dur: 0.16, vol: 0.05 });
      if (m >= 10){ soplo({ filtro: "lowpass", f: 900, f2: 80, dur: 0.8, vol: 0.4 }); tono({ f: 70, f2: 40, tipo: "sine", dur: 0.7, vol: 0.25 }); }
    },
    // efectos de caricatura (muertes del Pollo)
    golpe(t = 0){ tono({ t, f: 130, f2: 40, tipo: "square", dur: 0.28, vol: 0.18 }); soplo({ t, filtro: "lowpass", f: 700, f2: 120, dur: 0.35, vol: 0.45 }); },
    clang(t = 0){ this.golpe(t); [1250, 1870, 2630].forEach((f, i) => tono({ t, f, tipo: i ? "triangle" : "square", dur: 0.9 - i * 0.15, vol: 0.05 })); },
    boom(t = 0){ soplo({ t, filtro: "lowpass", f: 1400, f2: 60, dur: 1.2, vol: 0.6, q: 0.5 }); tono({ t, f: 80, f2: 28, tipo: "sine", dur: 1, vol: 0.35 }); },
    ovni(t = 0){ for (let i = 0; i < 14; i++) tono({ t: t + i * 0.09, f: 420 + (i % 2) * 260 + i * 25, tipo: "sine", dur: 0.12, vol: 0.07 }); },
    silbido(t = 0){ soplo({ t, f: 300, f2: 4000, q: 4, dur: 1.2, vol: 0.3 }); tono({ t, f: 300, f2: 1600, tipo: "triangle", dur: 1.1, vol: 0.06 }); },
    zap(t = 0){ tono({ t, f: 95, tipo: "sawtooth", dur: 0.55, vol: 0.12 }); soplo({ t, filtro: "highpass", f: 2500, dur: 0.45, vol: 0.35 }); for (let i = 0; i < 6; i++) tono({ t: t + i * 0.05, f: 1800 + Math.random() * 1500, tipo: "square", dur: 0.03, vol: 0.04 }); },
    fuego(t = 0){ soplo({ t, f: 1800, q: 0.6, dur: 1.4, vol: 0.18 }); for (let i = 0; i < 14; i++) soplo({ t: t + Math.random() * 1.2, filtro: "highpass", f: 3500, dur: 0.02, vol: 0.25 }); },
    boing(t = 0){ tono({ t, f: 160, f2: 640, tipo: "triangle", dur: 0.3, vol: 0.2 }); tono({ t: t + 0.25, f: 640, f2: 300, tipo: "triangle", dur: 0.35, vol: 0.12 }); },
    piano(t = 0){ this.golpe(t); [98, 139, 185, 233, 311, 415].forEach(f => tono({ t, f, tipo: "triangle", dur: 1.6, vol: 0.06 })); },
    globos(t = 0){ [523, 659, 784, 988, 1175].forEach((f, i) => tono({ t: t + i * 0.12, f, tipo: "sine", dur: 0.18, vol: 0.08 })); },
    // Avión: cada premio tiene su propio sonido (más notas y más agudo cuanto más vale)
    premio(i = 0){
      const notas = [[659, 880], [587, 784, 988], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319, 1568],
        [440, 880], [392, 587, 880], [349, 523, 784, 1047], [330, 494, 740, 988, 1480]][i] || [880];
      notas.forEach((f, k) => tono({ t: k * 0.06, f, tipo: i >= 4 ? "square" : "triangle", dur: 0.15, vol: i >= 4 ? 0.06 : 0.1 }));
      if (i >= 4) tono({ f: 110 * (i - 2), f2: 440 * (i - 2), tipo: "sawtooth", dur: 0.28, vol: 0.05 });
    },
    cohete(t = 0){ soplo({ t, f: 700, f2: 2600, q: 2, dur: 0.5, vol: 0.18 }); },
    chapuzon(t = 0){
      soplo({ t, filtro: "lowpass", f: 2400, f2: 200, dur: 0.9, vol: 0.55, q: 0.4 }); soplo({ t: t + 0.05, f: 900, f2: 300, dur: 0.6, vol: 0.3 });
      for (let i = 0; i < 8; i++) tono({ t: t + 0.25 + i * 0.07 + Math.random() * 0.05, f: 500 + Math.random() * 700, f2: 1200, tipo: "sine", dur: 0.06, vol: 0.04 });
    },
    brillo(t = 0){ [2093, 2637, 3136].forEach((f, i) => tono({ t: t + i * 0.07, f, tipo: "sine", dur: 0.2, vol: 0.05 })); },
    // ajustes
    get activo(){ return conf.on; }, get volumen(){ return conf.vol; },
    setActivo(on){ conf.on = on; guardar(); if (master) master.gain.value = nivel(); },
    setVolumen(v){ conf.vol = Math.max(0, Math.min(1, v)); guardar(); if (master) master.gain.value = nivel(); },
  };
})();
