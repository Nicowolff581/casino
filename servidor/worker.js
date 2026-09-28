/* ═════════ Casino Nico · servidor en Cloudflare ═════════
   Cloudflare entrega directamente la página (index.html, css, js).
   Este archivo solo atiende lo que empieza por /api/: las salas para jugar con amigos.
   Por ahora es una base mínima; el póker en línea se construye encima. */
import { DurableObject } from "cloudflare:workers";

// Una sala privada. Cloudflare garantiza que cada código de sala tenga una sola instancia.
export class Sala extends DurableObject {
  async fetch(){
    return Response.json({ ok: true, sala: "lista" });
  }
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (url.pathname === "/api/salud") return Response.json({ ok: true, casino: "Casino Nico" });
    if (url.pathname.startsWith("/api/")) return Response.json({ error: "No encontrado" }, { status: 404 });
    return env.ASSETS.fetch(req);
  }
};
