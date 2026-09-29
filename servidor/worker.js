/* ═════════ Casino Nico · servidor en Cloudflare ═════════
   Cloudflare entrega directamente la página (carpeta public/).
   Este archivo atiende lo que empieza por /api/: las salas para jugar con amigos.
   Cada sala es un «Durable Object»: un pequeño servidor propio que guarda la partida,
   reparte las cartas y habla con los jugadores por WebSocket (conexión en vivo). */
import { DurableObject } from "cloudflare:workers";
import * as P from "./poker.js";

const CODIGO = /^[A-HJ-NP-Z2-9]{6}$/;
const BORRAR_TRAS = 24 * 3600 * 1000;           // una sala sin actividad se borra al día siguiente
const json = (datos, estado = 200) => Response.json(datos, { status: estado, headers: { "cache-control": "no-store" } });

export class Sala extends DurableObject {
  constructor(ctx, env){
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.sala = (await ctx.storage.get("sala")) || null; });
  }
  async guardar(){
    await this.ctx.storage.put("sala", this.sala);
    const prox = P.proximaAlarma(this.sala);
    await this.ctx.storage.setAlarm(prox ?? this.sala.actividad + BORRAR_TRAS);
  }
  // Manda a cada conexión su propia vista (cada uno solo ve sus cartas).
  difundir(){
    for (const ws of this.ctx.getWebSockets()){
      const { token } = ws.deserializeAttachment() || {};
      if (token) this.enviar(ws, { tipo: "estado", ahora: Date.now(), sala: P.vistaPara(this.sala, token) });
    }
  }
  enviar(ws, m){ try { ws.send(JSON.stringify(m)); } catch (e) {} }

  async fetch(req){
    const url = new URL(req.url);
    if (url.pathname === "/crear"){
      if (this.sala) return json({ error: "existe" }, 409);
      this.sala = P.nuevaSala(url.searchParams.get("codigo"), await req.json().catch(() => ({})));
      await this.guardar();
      return json({ codigo: this.sala.codigo });
    }
    if (url.pathname === "/info"){
      if (!this.sala) return json({ existe: false }, 404);
      return json({ existe: true, jugadores: this.sala.jugadores.length, estado: this.sala.estado, config: this.sala.config });
    }
    if (req.headers.get("Upgrade") !== "websocket") return json({ error: "Se esperaba una conexión en vivo." }, 426);
    if (!this.sala) return json({ error: "Esa sala no existe." }, 404);
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);                  // con «hibernación»: gratis mientras nadie habla
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(ws, datos){
    if (typeof datos !== "string" || datos.length > 2000) return;
    let m; try { m = JSON.parse(datos); } catch (e) { return; }
    const ahora = Date.now(), s = this.sala; if (!s) return;
    const { token } = ws.deserializeAttachment() || {};
    let r = {};
    if (m.tipo === "unirse"){
      r = P.unirse(s, { token: m.token, apodo: m.apodo, avatar: m.avatar }, ahora);
      if (r.jugador){
        ws.serializeAttachment({ token: r.jugador.token });
        this.enviar(ws, { tipo: "bienvenida", token: r.jugador.token, asiento: r.jugador.asiento });
        if (!r.nuevo) P.volver(s, r.jugador.token);
      }
    }
    else if (!token) r = { error: "Primero entra a la sala." };
    else if (m.tipo === "empezar") r = P.empezar(s, token, ahora);
    else if (m.tipo === "nuevaPartida") r = P.nuevaPartida(s, token, ahora);
    else if (m.tipo === "accion") r = P.accion(s, token, m, ahora);
    else if (m.tipo === "volver") P.volver(s, token);
    else if (m.tipo === "salir"){ P.salir(s, token, ahora); ws.serializeAttachment({}); }
    else if (m.tipo === "reaccion"){
      const re = P.reaccion(s, token, m.emoji, ahora);
      if (re) for (const otro of this.ctx.getWebSockets()) this.enviar(otro, { tipo: "reaccion", ...re });
      return;
    }
    else if (m.tipo === "hola") return this.enviar(ws, { tipo: "hola" });   // mantiene viva la conexión
    if (r.error) this.enviar(ws, { tipo: "error", texto: r.error });
    s.actividad = ahora;
    await this.guardar();
    this.difundir();
  }
  async webSocketClose(ws){ await this.cerrado(ws); }
  async webSocketError(ws){ await this.cerrado(ws); }
  async cerrado(ws){
    const { token } = ws.deserializeAttachment() || {};
    if (!token || !this.sala) return;
    // sigue conectado si tiene otra pestaña abierta
    const otra = this.ctx.getWebSockets().some(o => o !== ws && (o.deserializeAttachment() || {}).token === token);
    if (!otra){ P.desconectar(this.sala, token); await this.guardar(); this.difundir(); }
  }
  async alarm(){
    if (!this.sala) return;
    const ahora = Date.now();
    if (!this.ctx.getWebSockets().length && ahora - this.sala.actividad > BORRAR_TRAS){ await this.ctx.storage.deleteAll(); this.sala = null; return; }
    P.alarma(this.sala, ahora);
    await this.guardar();
    this.difundir();
  }
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (url.pathname === "/api/salud") return json({ ok: true, casino: "Casino Nico" });
    // crear una sala nueva con un código al azar
    if (url.pathname === "/api/salas" && req.method === "POST"){
      const cfg = await req.json().catch(() => ({}));
      for (let intento = 0; intento < 5; intento++){
        const codigo = P.codigoAzar(), stub = env.SALAS.get(env.SALAS.idFromName(codigo));
        const r = await stub.fetch(`https://sala/crear?codigo=${codigo}`, { method: "POST", body: JSON.stringify(cfg) });
        if (r.status !== 409) return r;
      }
      return json({ error: "No se pudo crear la sala, intenta otra vez." }, 500);
    }
    const m = url.pathname.match(/^\/api\/salas\/([^/]+)(\/ws)?$/);
    if (m){
      const codigo = m[1].toUpperCase();
      if (!CODIGO.test(codigo)) return json({ error: "Código de sala no válido." }, 400);
      const stub = env.SALAS.get(env.SALAS.idFromName(codigo));
      return m[2] ? stub.fetch(req) : stub.fetch("https://sala/info");
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "No encontrado" }, 404);
    return env.ASSETS.fetch(req);
  }
};
