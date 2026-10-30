// HTTP layer shared by the Netlify function and the local dev server.
// `store` is an adapter: { load(): {data, etag}, save(data, etag): boolean }
import { emptyState, advance, applyAction, view, HttpError } from "./core.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function withState(store, now, fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await store.load();
    const s = data || emptyState();
    const before = JSON.stringify(s);
    let result;
    try {
      result = fn(s);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      throw e;
    }
    if (JSON.stringify(s) !== before) {
      const ok = await store.save(s, etag);
      if (!ok) continue; // someone else wrote in between — reload and retry
    }
    return json({ ...view(s, now), result });
  }
  return json({ error: "Busy — please try again" }, 409);
}

export async function handleRequest(req, store, now = Date.now()) {
  if (req.method === "GET") return withState(store, now, (s) => { advance(s, now); });
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
    return withState(store, now, (s) => {
      advance(s, now);
      const r = applyAction(s, body || {}, now);
      advance(s, now);
      return r;
    });
  }
  return json({ error: "Method not allowed" }, 405);
}

/** Used by the hourly scheduled function. */
export async function tick(store, now = Date.now()) {
  const res = await withState(store, now, (s) => { advance(s, now); });
  return res.status;
}
