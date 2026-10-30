// Local preview without Netlify: `npm run dev` → http://localhost:8888
// Stores data in .data/state.json. Set NOW_OFFSET_DAYS=3 to pretend it's 3 days later.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { handleRequest } from "./lib/server.mjs";

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

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await handleRequest(
      new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }),
      fileStore,
      Date.now() + offset
    );
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
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
