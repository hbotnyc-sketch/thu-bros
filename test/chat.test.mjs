import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handleChat, dmConv } from "../lib/chat-server.mjs";

const sqlite = new DatabaseSync(":memory:");
const DB = {
  prepare(sql) { const st = { args: [] }; const ex = () => sqlite.prepare(sql);
    return Object.assign(st, { bind(...a) { st.args = a; return st; }, async all() { return { results: ex().all(...st.args) }; },
      async run() { const r = ex().run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid) } }; } }); },
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
console.log(`\n${pass} chat tests passed`);
