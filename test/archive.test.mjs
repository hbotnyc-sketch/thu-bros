import assert from "node:assert/strict";
import { handleArchive } from "../lib/archive-server.mjs";
import { handleRequest } from "../lib/server.mjs";
import { parseSummary } from "../lib/recap.mjs";

const kv = new Map(), r2 = new Map();
let state = null;
const store = { async load() { return { data: state, etag: null }; }, async save(d) { state = d; return true; } };
const env = {
  SOHBET: { async get(k, o) { const v = kv.get(k); return v == null ? null : o?.type === "json" ? JSON.parse(v) : v; }, async put(k, v) { kv.set(k, v); }, async delete(k) { kv.delete(k); } },
  MEDIA: { async put(k, b) { r2.set(k, b); }, async get(k) { return r2.has(k) ? { body: "x" } : null; }, async list({ prefix }) { return { objects: [...r2.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, size: 1 })) }; } },
  AI: { async run(model, input) {
    if (model === "@cf/openai/gpt-oss-120b") { assert.equal(input.messages[0].role, "system"); return { choices: [{ message: { content: '{"title":"Ücretsiz özet","summary":"Özet.","hadis":"","sohbet":"• Nokta","sunum":"","questions":"","tags":["tevekkül"]}' } }] }; }
    assert.equal(model, "@cf/openai/whisper-large-v3-turbo"); assert.equal(input.language, "tr"); return { text: "Bismillah, bugün tevekkülü konuşacağız." }; } },
};
const call = async (path, init) => { const r = await handleArchive(new Request("https://x" + path, init), env, store); return { status: r.status, body: await r.json() }; };
let pass = 0; const t = async (n, f) => { await f(); pass++; console.log("✓", n); };

const s0 = await (await handleRequest(new Request("https://x/api", { method: "POST", body: JSON.stringify({ type: "init", tz: "America/New_York" }) }), store)).json();
const me = s0.state.members[0].id, wk = "2026-11-05";

await t("audio part stored in R2 and transcribed with Whisper (Turkish)", async () => {
  assert.deepEqual((await call(`/api/audio?week=${wk}&part=0`, { method: "PUT", body: "RIFF" })).body, { stored: true });
  const r = await call(`/api/transcribe?week=${wk}&part=0`, { method: "POST", body: "UklGRg==" });
  assert.match(r.body.text, /tevekkül/);
});
await t("running transcript saved and returned with audio list", async () => {
  await call(`/api/transcript?week=${wk}`, { method: "POST", body: "part one\npart two" });
  const r = await call(`/api/recap?week=${wk}`);
  assert.equal(r.body.transcript, "part one\npart two");
  assert.equal(r.body.audio.length, 1);
  assert.equal(r.body.aiEnabled, true, "free Workers AI counts as enabled");
});
await t("saving notes writes full recap + meta in shared state", async () => {
  const r = await call(`/api/recap?week=${wk}`, { method: "POST", body: JSON.stringify({ actor: me, title: "Tevekkül", summary: "Güzel bir sohbet.", tags: ["tevekkül", " sabır "], attendees: [me], transcript: "full text" }) });
  assert.equal(r.status, 200);
  assert.equal(r.body.state.weeks[wk].recap.title, "Tevekkül");
  assert.deepEqual(r.body.state.weeks[wk].recap.tags, ["tevekkül", "sabır"]);
  assert.equal(r.body.state.weeks[wk].recap.audioParts, 1);
  assert.equal(JSON.parse(kv.get(`recap:${wk}`)).summary, "Güzel bir sohbet.");
  assert.equal(kv.get(`tx:${wk}`), "full text");
});
await t("summarize without any key uses free Workers AI (gpt-oss-120b)", async () => {
  const r = await call(`/api/summarize`, { method: "POST", body: JSON.stringify({ transcript: "x".repeat(100) }) });
  assert.equal(r.status, 200); assert.equal(r.body.draft.title, "Ücretsiz özet"); assert.deepEqual(r.body.draft.tags, ["tevekkül"]);
});
await t("summarize calls Claude and parses the JSON reply", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const b = JSON.parse(init.body); assert.equal(init.headers["x-api-key"], "k"); assert.match(b.messages[0].content, /Tevekkül/);
    return new Response(JSON.stringify({ content: [{ type: "text", text: 'İşte: {"title":"Tevekkül","summary":"Özet.","hadis":"","sohbet":["Sebep","Dua"],"sunum":"","questions":"• Nasıl?","tags":["tevekkül"]}' }] }), { status: 200 });
  };
  env.ANTHROPIC_API_KEY = "k";
  const r = await call(`/api/summarize`, { method: "POST", body: JSON.stringify({ transcript: "y".repeat(100), context: { sohbet: "Tevekkül" } }) });
  globalThis.fetch = orig; delete env.ANTHROPIC_API_KEY;
  assert.equal(r.body.draft.title, "Tevekkül");
  assert.equal(r.body.draft.sohbet, "• Sebep\n• Dua");
});
await t("bad week ids and audio keys are rejected", async () => {
  assert.equal((await call(`/api/recap?week=../x`)).status, 400);
  assert.equal((await handleArchive(new Request("https://x/api/audio?key=state"), env, store)).status, 404);
});
await t("works without R2: audio not stored, transcription still fine", async () => {
  const m = env.MEDIA; delete env.MEDIA;
  assert.deepEqual((await call(`/api/audio?week=${wk}&part=1`, { method: "PUT", body: "RIFF" })).body, { stored: false });
  assert.equal((await call(`/api/recap?week=${wk}`)).body.mediaEnabled, false);
  env.MEDIA = m;
});
await t("private notes: only the part's owner can read/write, stored per person", async () => {
  // make `me` the sunum presenter of wk; add another member
  state.weeks[wk].konu = { presenterId: me, title: "x" };
  state.members.push({ id: "other", name: "Other", phone: "" });
  assert.equal((await call(`/api/private?week=${wk}&part=sunum&actor=${me}`, { method: "POST", body: "gizli not" })).status, 200);
  assert.equal((await call(`/api/private?week=${wk}&part=sunum&actor=${me}`)).body.text, "gizli not");
  assert.equal((await call(`/api/private?week=${wk}&part=sunum&actor=other`)).status, 403);
  assert.equal((await call(`/api/private?week=${wk}&part=sunum&actor=nobody`)).status, 401);
  assert.ok(!JSON.stringify(state).includes("gizli not"), "never in the shared state");
});
await t("personal notebook: per member, per week, private", async () => {
  await call(`/api/mynotes?actor=${me}&week=${wk}`, { method: "POST", body: "benim notum" });
  await call(`/api/mynotes?actor=other&week=${wk}`, { method: "POST", body: "onun notu" });
  assert.deepEqual((await call(`/api/mynotes?actor=${me}`)).body.notes, { [wk]: "benim notum" });
  assert.deepEqual((await call(`/api/mynotes?actor=other`)).body.notes, { [wk]: "onun notu" });
  assert.equal((await call(`/api/mynotes?actor=nobody`)).status, 401);
  await call(`/api/mynotes?actor=${me}&week=${wk}`, { method: "POST", body: "" });
  assert.deepEqual((await call(`/api/mynotes?actor=${me}`)).body.notes, {});
});
assert.throws(() => parseSummary("no json here"));
console.log(`\n${pass} archive tests passed`);
