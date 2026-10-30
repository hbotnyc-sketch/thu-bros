import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handleChat, dmConv } from "../lib/chat-server.mjs";

const sqlite = new DatabaseSync(":memory:");
const DB = {
  prepare(sql) { const st = { args: [] }; const ex = () => sqlite.prepare(sql);
    return Object.assign(st, { bind(...a) { st.args = a; return st; }, async all() { return { results: ex().all(...st.args) }; },
      async run() { const r = ex().run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
      async first() { return ex().get(...st.args) ?? null; } }); },
  async batch(x) { return Promise.all(x.map((s) => s.run())); },
};
const state = { members: [{ id: "aaaa1111", name: "A" }, { id: "bbbb2222", name: "B" }, { id: "cccc3333", name: "C" }] };
const store = { async load() { return { data: state }; } };
const call = async (path, init) => { const url = new URL("https://x" + path); const r = await handleChat(new Request(url, init), { DB }, store, url); return { status: r.status, body: await r.json() }; };
let pass = 0; const t = async (n, f) => { await f(); pass++; console.log("✓", n); };
const A = "aaaa1111", B = "bbbb2222", C = "cccc3333", AB = dmConv(B, A);

await t("general chat: send, read, unread counts", async () => {
  await call(`/api/chat?conv=general&actor=${A}`, { method: "POST", body: "Selam!" });
  await call(`/api/chat?conv=general&actor=${B}`, { method: "POST", body: "Aleykümselam" });
  const s = await call(`/api/chat/summary?actor=${C}`);
  assert.equal(s.body.unread.general, 2);
  const m = await call(`/api/chat?conv=general&actor=${C}`);
  assert.deepEqual(m.body.messages.map((x) => x.body), ["Selam!", "Aleykümselam"]);
  assert.equal((await call(`/api/chat/summary?actor=${C}`)).body.unread.general, undefined, "read after opening");
  assert.equal((await call(`/api/chat/summary?actor=${A}`)).body.unread.general, 1, "own messages don't count");
});
await t("polling returns only newer messages", async () => {
  const first = (await call(`/api/chat?conv=general&actor=${A}`)).body.messages;
  await call(`/api/chat?conv=general&actor=${C}`, { method: "POST", body: "Yeni" });
  const r = await call(`/api/chat?conv=general&actor=${A}&after=${first.at(-1).id}`);
  assert.deepEqual(r.body.messages.map((x) => x.body), ["Yeni"]);
});
await t("private chat: only the two people can read it", async () => {
  assert.equal(AB, "dm:aaaa1111:bbbb2222");
  await call(`/api/chat?conv=${AB}&actor=${A}`, { method: "POST", body: "gizli" });
  assert.equal((await call(`/api/chat/summary?actor=${B}`)).body.unread[AB], 1);
  assert.equal((await call(`/api/chat?conv=${AB}&actor=${C}`)).status, 404);
  assert.equal((await call(`/api/chat/summary?actor=${C}`)).body.unread[AB], undefined);
  assert.ok(!(await call(`/api/chat/summary?actor=${C}`)).body.last.some((m) => m.conv === AB));
  assert.equal((await call(`/api/chat?conv=${AB}&actor=${B}`)).body.messages[0].body, "gizli");
});
await t("unknown people and rooms are rejected", async () => {
  assert.equal((await call(`/api/chat?conv=general&actor=nobody`)).status, 401);
  assert.equal((await call(`/api/chat?conv=dm:aaaa1111:zzzz9999&actor=${A}`)).status, 404);
  assert.equal((await call(`/api/chat?conv=general&actor=${A}`, { method: "POST", body: "  " })).status, 400);
});
await t("D1 state store: stale writes are rejected so the server retries (no lost updates)", async () => {
  const { d1Store } = await import("../lib/d1-store.mjs");
  const kv = { async get() { return { members: [], weeks: {}, from: "kv" }; } };
  const st = d1Store(DB, kv);
  const first = await st.load();
  assert.equal(first.data.from, "kv", "migrates from KV on first run"); assert.equal(first.etag, null);
  assert.ok(await st.save({ n: 1 }, null));
  const a = await st.load(), b = await st.load();      // two people read the same version
  assert.ok(await st.save({ n: 2, who: "a" }, a.etag)); // A saves first
  assert.equal(await st.save({ n: 2, who: "b" }, b.etag), false, "B's stale save is refused");
  const c = await st.load(); assert.equal(c.data.who, "a");
  assert.ok(await st.save({ n: 3, who: "b" }, c.etag), "B retries on fresh data");
});
await t("server retries on conflict: two simultaneous RSVPs both land", async () => {
  const { d1Store } = await import("../lib/d1-store.mjs");
  const { handleRequest } = await import("../lib/server.mjs");
  sqlite.exec("DELETE FROM app_state");
  const st = d1Store(DB, null);
  const post = (b) => handleRequest(new Request("https://x/api", { method: "POST", body: JSON.stringify(b) }), st).then((r) => r.json());
  let s0 = await post({ type: "init", tz: "America/New_York" });
  const x = (await post({ type: "addMember", name: "X" })).result.id, y = (await post({ type: "addMember", name: "Y" })).result.id;
  const wk = s0.currentWeekId;
  await Promise.all([post({ type: "rsvp", actor: x, weekId: wk, answer: "yes" }), post({ type: "rsvp", actor: y, weekId: wk, answer: "yes" })]);
  const fin = (await st.load()).data.weeks[wk].rsvp;
  assert.deepEqual(Object.keys(fin).sort(), [x, y].sort());
});
console.log(`\n${pass} chat tests passed`);
