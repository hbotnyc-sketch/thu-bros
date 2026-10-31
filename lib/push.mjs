// Web Push (free, no packages): VAPID keys live in D1, payloads are encrypted per RFC 8291
// (aes128gcm) with WebCrypto, so it runs the same in Cloudflare Workers and Node.
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(s).length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

let ready = false;
async function ensure(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS push_config (k TEXT PRIMARY KEY, v TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, member TEXT NOT NULL, sub TEXT NOT NULL, at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_push_member ON push_subs(member)"),
  ]);
  ready = true;
}

/** The VAPID key pair is created once and kept in D1. */
export async function vapidKeys(db) {
  await ensure(db);
  const row = await db.prepare("SELECT v FROM push_config WHERE k = 'vapid'").first();
  if (row) return JSON.parse(row.v);
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
  const keys = { pub, priv: jwk };
  await db.prepare("INSERT OR IGNORE INTO push_config (k, v) VALUES ('vapid', ?1)").bind(JSON.stringify(keys)).run();
  const again = await db.prepare("SELECT v FROM push_config WHERE k = 'vapid'").first();
  return JSON.parse(again.v);
}

async function vapidHeader(keys, endpoint, subject) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey("jwk", keys.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${keys.pub}`;
}

const hkdf = async (salt, ikm, info, len) => {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
};

/** RFC 8291 payload encryption for one subscription → request body. */
export async function encryptPayload(sub, text) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const prk = await hkdf(auth, secret, cat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const data = cat(enc.encode(text), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, data));
  return cat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

/** Send one push. Returns { ok, status }. 404/410 mean the subscription is gone. */
export async function pushTo(env, sub, message, { subject = "mailto:noreply@thu-bros.invalid", fetcher = fetch } = {}) {
  const keys = await vapidKeys(env.DB);
  const body = await encryptPayload(sub, JSON.stringify(message));
  const r = await fetcher(sub.endpoint, {
    method: "POST",
    headers: { authorization: await vapidHeader(keys, sub.endpoint, subject), "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400", urgency: "high" },
    body,
  });
  return { ok: r.ok, status: r.status };
}

/** Push to every device a member has signed up. Drops dead subscriptions. */
export async function pushToMember(env, memberId, message, opts) {
  await ensure(env.DB);
  const { results } = await env.DB.prepare("SELECT endpoint, sub FROM push_subs WHERE member = ?1").bind(memberId).all();
  const out = { sent: 0, failed: 0, devices: results.length };
  for (const row of results) {
    try {
      const r = await pushTo(env, JSON.parse(row.sub), message, opts);
      if (r.ok) out.sent++;
      else { out.failed++; out.lastStatus = r.status; if (r.status === 404 || r.status === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1").bind(row.endpoint).run(); }
    } catch (e) { out.failed++; out.error = String(e.message || e); }
  }
  return out;
}

/** /api/push/key · /api/push/subscribe · /api/push/unsubscribe · /api/push/test */
export async function handlePush(req, env, store, url) {
  if (!env.DB) return json({ error: "Push isn't set up" }, 501);
  await ensure(env.DB);
  const route = url.pathname.replace(/^\/api\/push\/?/, "");
  if (route === "key" && req.method === "GET") return json({ key: (await vapidKeys(env.DB)).pub });
  if (req.method !== "POST") return json({ error: "Not found" }, 404);
  const body = await req.json().catch(() => ({}));
  const { data } = await store.load();
  const m = (data?.members || []).find((x) => x.id === body.actor);
  if (!m) return json({ error: "Unknown member" }, 403);
  if (route === "subscribe") {
    const s = body.sub;
    if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth || !/^https:\/\//.test(s.endpoint)) return json({ error: "Bad subscription" }, 400);
    await env.DB.prepare("INSERT OR REPLACE INTO push_subs (endpoint, member, sub, at) VALUES (?1, ?2, ?3, ?4)").bind(s.endpoint, m.id, JSON.stringify(s), Date.now()).run();
    return json({ ok: true });
  }
  if (route === "unsubscribe") {
    if (body.endpoint) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?1 AND member = ?2").bind(body.endpoint, m.id).run();
    return json({ ok: true });
  }
  if (route === "test") {
    const r = await pushToMember(env, m.id, { title: "Thursday Bros 🔔", body: `Selam ${m.name}! Bildirimler çalışıyor, insallah.`, url: "/" });
    return json(r);
  }
  return json({ error: "Not found" }, 404);
}
