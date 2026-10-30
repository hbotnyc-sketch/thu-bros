// Cloudflare Workers entry: serves /public as static assets, /api from the shared logic,
// /api/* archive routes (notes, transcripts, audio, AI), and the hourly tick from a Cron Trigger.
import { handleRequest, tick } from "../lib/server.mjs";
import { handleArchive } from "../lib/archive-server.mjs";

const kvStore = (kv) => ({
  async load() {
    const data = await kv.get("state", { type: "json" });
    return { data, etag: null };
  },
  async save(data) {
    await kv.put("state", JSON.stringify(data));
    return true;
  },
});

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api") return handleRequest(req, kvStore(env.SOHBET));
    if (url.pathname.startsWith("/api/")) return handleArchive(req, env, kvStore(env.SOHBET));
    return env.ASSETS.fetch(req);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(kvStore(env.SOHBET)));
  },
};
