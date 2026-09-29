/* ═════════ Casino Nico · avatares de casino (compartido) ═════════
   Fichas de casino dibujadas con CSS, cada una con su color y un símbolo.
   Lo usan la página (para dibujarlos) y el servidor (para aceptar solo estos). */
(function(){
  const AVATARES = [
    { id: "pica",     simbolo: "♠", nombre: "Pica",              c1: "#2b2f3a", c2: "#c9ced8" },
    { id: "corazon",  simbolo: "♥", nombre: "Corazón",           c1: "#b3122f", c2: "#ffd9df" },
    { id: "diamante", simbolo: "♦", nombre: "Diamante",          c1: "#1b58b8", c2: "#d6e6ff" },
    { id: "trebol",   simbolo: "♣", nombre: "Trébol",            c1: "#17784a", c2: "#d4f7e3" },
    { id: "as",       simbolo: "A", nombre: "As",                c1: "#f4efe1", c2: "#7a1a2a" },
    { id: "siete",    simbolo: "7", nombre: "Siete de la suerte", c1: "#7a1a2a", c2: "#ffd66b" },
    { id: "dado",     simbolo: "🎲", nombre: "Dado",              c1: "#5a1f8c", c2: "#e6d4ff" },
    { id: "sombrero", simbolo: "🎩", nombre: "Sombrero de copa",  c1: "#1a1d24", c2: "#d8b25a" },
    { id: "coctel",   simbolo: "🍸", nombre: "Cóctel",            c1: "#0f6a70", c2: "#c9fbff" },
    { id: "corona",   simbolo: "👑", nombre: "Corona",            c1: "#8a6420", c2: "#fff1c4" },
    { id: "gema",     simbolo: "💎", nombre: "Gema",              c1: "#274b8f", c2: "#bfe6ff" },
    { id: "suerte",   simbolo: "🍀", nombre: "Trébol de la suerte", c1: "#2c6b22", c2: "#e2ffd6" },
  ];
  const AVATARES_ID = AVATARES.map(a => a.id);
  // HTML de un avatar (una ficha con el símbolo al centro).
  const avatarHTML = (id, clase = "") => {
    const a = AVATARES.find(x => x.id === id) || AVATARES[0];
    return `<span class="avatar-ficha ${clase}" style="--a1:${a.c1};--a2:${a.c2}" title="${a.nombre}" role="img" aria-label="Avatar ${a.nombre}"><i>${a.simbolo}</i></span>`;
  };
  Object.assign(globalThis, { AVATARES, AVATARES_ID, avatarHTML });
})();
