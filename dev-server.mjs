// Local preview without Netlify: `npm run dev` → http://localhost:8888
// Stores data in .data/state.json. Set NOW_OFFSET_DAYS=3 to pretend it's 3 days later.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleRequest } from "./lib/server.mjs";
import { handleArchive } from "./lib/archive-server.mjs";

const PORT = +process.env.PORT || 8888;
const FILE = path.resolve(".data/state.json");
const offset = (+process.env.NOW_OFFSET_DAYS || 0) * 86400000;

const fileStore = {
  async load() {
    try { return { data: JSON.parse(await fs.readFile(FILE, "utf8")), etag: null }; }
    catch { return { data: null, etag: null }; }
  },
  async save(data) {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2));
    return true;
  },
};

// Local stand-ins for Cloudflare KV / R2 / AI (AI returns canned text).
const KVFILE = path.resolve(".data/kv.json");
const kvData = async () => { try { return JSON.parse(await fs.readFile(KVFILE, "utf8")); } catch { return {}; } };
const kvSave = async (d) => { await fs.mkdir(path.dirname(KVFILE), { recursive: true }); await fs.writeFile(KVFILE, JSON.stringify(d)); };
const media = new Map();
// D1 stand-in on Node's built-in SQLite
import { DatabaseSync } from "node:sqlite";
await fs.mkdir(".data", { recursive: true });
const sqlite = new DatabaseSync(path.resolve(".data/chat.db"));
const toPos = (sql) => sql.replace(/\?(\d+)/g, "?$1");
const d1 = {
  prepare(sql) {
    const st = { sql, args: [] };
    const exec = () => sqlite.prepare(toPos(st.sql));
    return Object.assign(st, {
      bind(...a) { st.args = a; return st; },
      async all() { return { results: exec().all(...st.args) }; },
      async first() { return exec().get(...st.args) ?? null; },
      async run() { const r = exec().run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    });
  },
  async batch(stmts) { return Promise.all(stmts.map((x) => x.run())); },
};

const devEnv = {
  DB: d1,
  FAKE_AI: true,
  SOHBET: {
    async get(k, o) { const d = await kvData(); const v = d[k]; return v == null ? null : o?.type === "json" ? JSON.parse(v) : v; },
    async put(k, v) { const d = await kvData(); d[k] = v; await kvSave(d); },
    async delete(k) { const d = await kvData(); delete d[k]; await kvSave(d); },
  },
  MEDIA: process.env.NO_MEDIA ? undefined : {
    async put(k, body) { const chunks = []; for await (const c of body) chunks.push(c); media.set(k, Buffer.concat(chunks)); },
    async get(k) { const b = media.get(k); return b ? { body: b } : null; },
    async list({ prefix }) { return { objects: [...media.keys()].filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key, size: media.get(key).length })) }; },
  },
};

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined, duplex: "half" });
    const r = url.pathname === "/api"
      ? await handleRequest(request, fileStore, Date.now() + offset)
      : await handleArchive(request, devEnv, fileStore);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  const p = path.join("public", url.pathname === "/" ? "index.html" : path.normalize(url.pathname));
  try {
    const body = await fs.readFile(p);
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}).listen(PORT, () => console.log(`Sohbet running at http://localhost:${PORT}`));
