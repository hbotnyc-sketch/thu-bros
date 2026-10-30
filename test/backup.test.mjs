import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { weeklyBackup, listBackups } from "../lib/backup.mjs";

const sqlite = new DatabaseSync(":memory:");
const DB = {
  prepare(sql) { const st = { args: [] }; const ex = () => sqlite.prepare(sql);
    return Object.assign(st, { bind(...a) { st.args = a; return st; }, async all() { return { results: ex().all(...st.args) }; },
      async run() { const r = ex().run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
      async first() { return ex().get(...st.args) ?? null; } }); },
};
sqlite.exec(`CREATE TABLE app_state (id INTEGER PRIMARY KEY, data TEXT, version INTEGER); INSERT INTO app_state VALUES (1, '{"members":[]}', 3);`);
const kv = { "recap:2026-11-05": "notes", "priv:a:2026-11-05:hadis": "mine", "mynotes:a": "nb", "state": "old", "chat:x": "skip" };
const SOHBET = { async get(k) { return kv[k] ?? null; }, async list({ prefix }) { return { keys: Object.keys(kv).filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; } };
const env = { DB, SOHBET };
let pass = 0; const t = async (n, f) => { await f(); pass++; console.log("✓", n); };
const DAY = 86400000, T0 = Date.UTC(2026, 10, 1);

await t("first run takes a snapshot of state + notes", async () => {
  const r = await weeklyBackup(env, T0);
  assert.equal(r.items, 4);
  const keys = sqlite.prepare("SELECT key FROM backup_items ORDER BY key").all().map((x) => x.key);
  assert.deepEqual(keys, ["app_state", "kv:mynotes:a", "kv:priv:a:2026-11-05:hadis", "kv:recap:2026-11-05"]);
});
await t("runs at most once a week", async () => {
  assert.equal(await weeklyBackup(env, T0 + 6 * DAY), null);
  assert.ok(await weeklyBackup(env, T0 + 7 * DAY));
});
await t("keeps only the last 8", async () => {
  for (let i = 2; i < 12; i++) await weeklyBackup(env, T0 + i * 7 * DAY);
  const list = await listBackups(env);
  assert.equal(list.length, 8);
  assert.equal(list[0].at, T0 + 11 * 7 * DAY);
  const orphans = sqlite.prepare("SELECT COUNT(*) AS n FROM backup_items WHERE backup_id NOT IN (SELECT id FROM backups)").get().n;
  assert.equal(orphans, 0);
});
console.log(`\n${pass} backup tests passed`);
