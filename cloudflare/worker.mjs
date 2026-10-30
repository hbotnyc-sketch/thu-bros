// Cloudflare Workers entry: serves /public as static assets, /api from the shared logic,
// /api/* archive routes (notes, transcripts, audio, AI), and the hourly tick from a Cron Trigger.
import { handleRequest, tick } from "../lib/server.mjs";
import { handleArchive } from "../lib/archive-server.mjs";
import { d1Store } from "../lib/d1-store.mjs";
import { weeklyBackup } from "../lib/backup.mjs";

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

// Group state lives in D1 (safe under simultaneous taps); falls back to KV if D1 isn't bound.
const stateStore = (env) => (env.DB ? d1Store(env.DB, env.SOHBET) : kvStore(env.SOHBET));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api") return handleRequest(req, stateStore(env));
    if (url.pathname.startsWith("/api/")) return handleArchive(req, env, stateStore(env));
    return env.ASSETS.fetch(req);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(stateStore(env)));
    ctx.waitUntil(weeklyBackup(env).catch((e) => console.error("backup failed", e)));
  },
};
