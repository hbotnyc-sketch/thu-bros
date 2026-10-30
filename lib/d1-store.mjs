// Shared group state in Cloudflare D1 with optimistic locking:
// every save says "only if nobody saved since I read it" (version check), and the server
// retries on conflict — so two people tapping at the same moment never overwrite each other.
// On first run it copies the existing state over from Workers KV.
let ready = false;
async function ensure(db) {
  if (ready) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, version INTEGER NOT NULL)").run();
  ready = true;
}

export function d1Store(db, kv) {
  return {
    async load() {
      await ensure(db);
      const row = await db.prepare("SELECT data, version FROM app_state WHERE id = 1").first();
      if (row) return { data: JSON.parse(row.data), etag: row.version };
      const old = kv ? await kv.get("state", { type: "json" }) : null; // one-time migration from KV
      return { data: old, etag: null };
    },
    async save(data, etag) {
      const json = JSON.stringify(data);
      const r = etag == null
        ? await db.prepare("INSERT OR IGNORE INTO app_state (id, data, version) VALUES (1, ?1, 1)").bind(json).run()
        : await db.prepare("UPDATE app_state SET data = ?1, version = version + 1 WHERE id = 1 AND version = ?2").bind(json, etag).run();
      return r.meta.changes === 1;
    },
  };
}
