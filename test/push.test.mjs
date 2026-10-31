import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { webcrypto as crypto } from "node:crypto";
import { encryptPayload, handlePush, pushToMember, vapidKeys } from "../lib/push.mjs";

const sqlite = new DatabaseSync(":memory:");
const DB = {
  prepare(sql) { const st = { args: [] }; const ex = () => sqlite.prepare(sql);
    return Object.assign(st, { bind(...a) { st.args = a; return st; }, async all() { return { results: ex().all(...st.args) }; },
      async run() { const r = ex().run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
      async first() { return ex().get(...st.args) ?? null; } }); },
  async batch(x) { return Promise.all(x.map((s) => s.run())); },
};
const env = { DB };
const store = { async load() { return { data: { members: [{ id: "aaaa1111", name: "Furkan" }] } }; } };
const b64u = (b) => Buffer.from(b).toString("base64url");
let pass = 0; const t = async (n, f) => { await f(); pass++; console.log("✓", n); };

// A fake "phone": its own key pair + auth secret, and a decryptor following RFC 8291 §4
const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));
const sub = { endpoint: "https://push.example/abc", keys: { p256dh: b64u(uaPub), auth: b64u(auth) } };
const hkdf = async (salt, ikm, info, len) => new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), len * 8));
const te = new TextEncoder();
async function decrypt(body) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []) }, ua.privateKey, 256));
  const cat = (...a) => Uint8Array.from(a.flatMap((x) => [...x]));
  const prk = await hkdf(auth, secret, cat(te.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hkdf(salt, prk, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, te.encode("Content-Encoding: nonce\0"), 12);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), ct));
  assert.equal(pt.at(-1), 2, "padding delimiter");
  return new TextDecoder().decode(pt.slice(0, -1));
}

await t("payload encrypts so the receiving device can decrypt it (RFC 8291)", async () => {
  const msg = JSON.stringify({ title: "Selam", body: "Türkçe çalışıyor ✓" });
  assert.equal(await decrypt(await encryptPayload(sub, msg)), msg);
});
await t("VAPID key is created once and reused", async () => {
  const a = await vapidKeys(DB), b = await vapidKeys(DB);
  assert.equal(a.pub, b.pub);
  assert.equal(Buffer.from(a.pub, "base64url").length, 65);
});
await t("subscribe + test sends an encrypted, VAPID-signed push to the member's device", async () => {
  const bad = await handlePush(new Request("https://x/api/push/subscribe", { method: "POST", body: JSON.stringify({ actor: "nobody", sub }) }), env, store, new URL("https://x/api/push/subscribe"));
  assert.equal(bad.status, 403);
  const ok = await handlePush(new Request("https://x/api/push/subscribe", { method: "POST", body: JSON.stringify({ actor: "aaaa1111", sub }) }), env, store, new URL("https://x/api/push/subscribe"));
  assert.equal(ok.status, 200);
  let seen;
  const r = await pushToMember(env, "aaaa1111", { title: "T", body: "B" }, { fetcher: async (u, init) => { seen = { u, init }; return new Response(null, { status: 201 }); } });
  assert.deepEqual([r.sent, r.failed, r.devices], [1, 0, 1]);
  assert.equal(seen.u, sub.endpoint);
  assert.match(seen.init.headers.authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  assert.equal(JSON.parse(await decrypt(seen.init.body)).title, "T");
  // The VAPID JWT must verify with the public key we hand to the browser (ES256, raw r||s)
  const [, jwt, k] = seen.init.headers.authorization.match(/t=([^,]+), k=(.+)$/);
  const [h, c, sig] = jwt.split(".");
  assert.equal(k, (await vapidKeys(DB)).pub);
  const pub = await crypto.subtle.importKey("raw", Buffer.from(k, "base64url"), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, Buffer.from(sig, "base64url"), new TextEncoder().encode(`${h}.${c}`)), "JWT signature verifies");
  const claims = JSON.parse(Buffer.from(c, "base64url"));
  assert.equal(claims.aud, "https://push.example");
  assert.ok(claims.exp - Date.now() / 1000 < 24 * 3600 && claims.exp > Date.now() / 1000);
  assert.match(claims.sub, /^(mailto:|https:\/\/)/);
});
await t("a gone subscription (410) is removed", async () => {
  await pushToMember(env, "aaaa1111", { title: "T" }, { fetcher: async () => new Response(null, { status: 410 }) });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM push_subs").get().n, 0);
});
console.log(`\n${pass} push tests passed`);
