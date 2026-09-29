/* ═════════ Casino Nico · manos de póker (compartido) ═════════
   Lo usan el póker contra la computadora (en la página) y el crupier en línea (en el servidor).
   Funciona como script normal y también importado desde el servidor: deja todo en globalThis. */
(function(){
  const ORD = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
  const NOMBRES_MANO = ["Carta alta", "Pareja", "Doble pareja", "Trío", "Escalera", "Color", "Full", "Póker", "Escalera de color"];

  // Valor de 5 cartas: [categoría, desempates…]. Mayor es mejor.
  function eval5(cs){
    const nums = cs.map(c => ORD[c.v]).sort((a, b) => b - a);
    const cnt = {}; nums.forEach(n => cnt[n] = (cnt[n] || 0) + 1);
    const grupos = Object.entries(cnt).map(([v, c]) => [+v, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const gv = grupos.map(g => g[0]);
    const flush = new Set(cs.map(c => c.p)).size === 1;
    let esc = 0;
    if (grupos.length === 5){ if (nums[0] - nums[4] === 4) esc = nums[0]; else if (nums.join() === "14,5,4,3,2") esc = 5; }
    if (esc && flush) return [8, esc];
    if (grupos[0][1] === 4) return [7, ...gv];
    if (grupos[0][1] === 3 && grupos[1][1] === 2) return [6, ...gv];
    if (flush) return [5, ...nums];
    if (esc) return [4, esc];
    if (grupos[0][1] === 3) return [3, ...gv];
    if (grupos[0][1] === 2 && grupos[1][1] === 2) return [2, ...gv];
    if (grupos[0][1] === 2) return [1, ...gv];
    return [0, ...nums];
  }
  const cmpMano = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++){ const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
  function combinaciones(arr, k, desde = 0, actual = [], out = []){
    if (actual.length === k){ out.push([...actual]); return out; }
    for (let i = desde; i < arr.length; i++){ actual.push(arr[i]); combinaciones(arr, k, i + 1, actual, out); actual.pop(); }
    return out;
  }
  // Mejor combinación de 5 entre 5, 6 o 7 cartas.
  const mejorMano = cs => combinaciones(cs, 5).map(eval5).reduce((m, s) => cmpMano(s, m) > 0 ? s : m);
  const nombreMano = s => s[0] === 8 && s[1] === 14 ? "Escalera real" : NOMBRES_MANO[s[0]];

  /* Reparte el bote en capas (bote principal y botes laterales).
     js[i] = { total: fichas que puso en la mano, retirado, puntaje: mejorMano(...) }
     orden = índices empezando a la izquierda del botón (para las fichas sueltas de un empate).
     Nadie gana de un rival más de lo que él mismo puso. */
  function repartirBotes(js, orden = js.map((_, i) => i)){
    const vivos = orden.filter(i => !js[i].retirado);
    const niveles = [...new Set(vivos.map(i => js[i].total))].sort((a, b) => a - b);
    const cobros = js.map(() => 0), botes = []; let previo = 0;
    for (const nivel of niveles){
      const capa = js.reduce((s, p) => s + Math.min(p.total, nivel) - Math.min(p.total, previo), 0);
      const eleg = vivos.filter(i => js[i].total >= nivel);
      let ganan = eleg;
      if (eleg.length > 1){
        const mejor = eleg.map(i => js[i].puntaje).reduce((m, s) => cmpMano(s, m) > 0 ? s : m);
        ganan = eleg.filter(i => cmpMano(js[i].puntaje, mejor) === 0);
      }
      const parte = Math.floor(capa / ganan.length); let resto = capa - parte * ganan.length;
      ganan.forEach(i => { cobros[i] += parte + (resto > 0 ? 1 : 0); if (resto > 0) resto--; });
      if (capa) botes.push({ monto: capa, ganadores: ganan });
      previo = nivel;
    }
    return { cobros, botes };
  }
  Object.assign(globalThis, { ORD, NOMBRES_MANO, eval5, cmpMano, combinaciones, mejorMano, nombreMano, repartirBotes });
})();
