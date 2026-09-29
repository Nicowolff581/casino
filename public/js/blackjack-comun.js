/* ═════════ Casino Nico · reglas del blackjack (compartido) ═════════
   Lo usan el blackjack para jugar solo, el blackjack en línea (página) y el servidor,
   así que el valor de las manos y los pagos son exactamente los mismos en todos lados. */
(function(){
  function valorBJ(mano){
    let t = 0, ases = 0;
    for (const c of mano){ if (c.v === "A"){ t += 11; ases++; } else if (c.v === "J" || c.v === "Q" || c.v === "K") t += 10; else t += +c.v; }
    while (t > 21 && ases){ t -= 10; ases--; }
    return t;
  }
  const esBlackjack = mano => mano.length === 2 && valorBJ(mano) === 21;
  // Fichas que recibe el jugador al terminar (incluye su apuesta si la recupera).
  // Blackjack natural 3 a 2 (redondeado hacia abajo) · ganar 1 a 1 · empate devuelve la apuesta.
  function bjPago(p, d, bet){
    const pbj = esBlackjack(p), dbj = esBlackjack(d);
    if (pbj || dbj) return pbj && dbj ? bet : pbj ? bet + Math.floor(bet * 1.5) : 0;
    const tu = valorBJ(p), cr = valorBJ(d);
    if (tu > 21) return 0;
    if (cr > 21 || tu > cr) return bet * 2;
    return tu === cr ? bet : 0;
  }
  // El crupier pide hasta llegar a 17 (se planta también en 17 blando).
  const crupierPide = d => valorBJ(d) < 17;
  const textoCarta = c => c.v + c.p;
  Object.assign(globalThis, { valorBJ, esBlackjack, bjPago, crupierPide, textoCarta });
})();
