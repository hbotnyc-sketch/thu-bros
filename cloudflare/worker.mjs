// Cloudflare Workers entry: serves /public as static assets, /api from the shared logic,
// and runs the hourly tick from a Cron Trigger. Data lives in one Workers KV key.
import { handleRequest, tick } from "../lib/server.mjs";

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
    return env.ASSETS.fetch(req);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(kvStore(env.SOHBET)));
  },
};
