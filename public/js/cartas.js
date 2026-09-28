/* ═════════ Casino Nico · baraja y dibujo de cartas (Blackjack y Texas Hold'em) ═════════ */
const PALOS = ["♠", "♥", "♦", "♣"];
const VALORES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

// Baraja nueva de 52 cartas, mezclada con el azar justo.
function baraja(){
  const b = [];
  for (const v of VALORES) for (const p of PALOS) b.push({ v, p });
  return barajar(b);
}

// Posición (en %) de cada símbolo en el centro de las cartas numéricas.
const PIPS = {
  2: [[50,0],[50,100]], 3: [[50,0],[50,50],[50,100]], 4: [[0,0],[100,0],[0,100],[100,100]],
  5: [[0,0],[100,0],[50,50],[0,100],[100,100]], 6: [[0,0],[100,0],[0,50],[100,50],[0,100],[100,100]],
  7: [[0,0],[100,0],[50,25],[0,50],[100,50],[0,100],[100,100]], 8: [[0,0],[100,0],[50,25],[0,50],[100,50],[50,75],[0,100],[100,100]],
  9: [[0,0],[100,0],[0,33],[100,33],[50,50],[0,67],[100,67],[0,100],[100,100]],
  10: [[0,0],[100,0],[50,17],[0,33],[100,33],[0,67],[100,67],[50,83],[0,100],[100,100]]
};

// Crea el elemento HTML de una carta (boca arriba u oculta).
function cartaEl(c, oculta = false, nueva = false){
  const el = document.createElement("div");
  el.className = "carta" + (c.p === "♥" || c.p === "♦" ? " roja" : "") + (oculta ? " oculta" : "") + (nueva ? " nueva" : "");
  let centro;
  if (c.v === "A") centro = `<span class="as">${c.p}</span>`;
  else if (c.v === "J" || c.v === "Q" || c.v === "K") centro = `<span class="figura"><b>${c.v}</b><span>${c.p}</span></span>`;
  else centro = `<span class="pips">${PIPS[+c.v].map(([x, y]) => `<span class="pip${y > 50 ? " inv" : ""}" style="left:${x}%;top:${y}%">${c.p}</span>`).join("")}</span>`;
  el.innerHTML = `<span class="esq">${c.v}<i>${c.p}</i></span>${centro}<span class="esq abajo">${c.v}<i>${c.p}</i></span>`;
  el.setAttribute("aria-label", oculta ? "carta oculta" : `${c.v} de ${c.p}`);
  return el;
}
