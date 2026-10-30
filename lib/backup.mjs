// Weekly automatic backup (free): copies the group state, every note in KV and the chat
// into D1 backup tables. Runs from the hourly cron; does real work at most once a week.
// Keeps the last KEEP snapshots. Restore is a manual step (see README).
const WEEK = 7 * 86400000;
const KEEP = 8;
const PREFIXES = ["recap:", "tx:", "priv:", "mynotes:"];
const MAX_VALUE = 1_500_000; // stay under D1's per-value limit

async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, items INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS backup_items (backup_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT, PRIMARY KEY (backup_id, key))`).run();
}

async function kvKeys(kv, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await kv.list({ prefix, cursor });
    out.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

/** Returns null when a backup isn't due yet, otherwise { id, items, bytes }. */
export async function weeklyBackup(env, now = Date.now(), { force = false } = {}) {
  const db = env.DB;
  if (!db) return null;
  await ensureTables(db);
  const last = await db.prepare(`SELECT MAX(at) AS at FROM backups`).first();
  if (!force && last?.at && now - last.at < WEEK) return null;

  const items = [];
  const st = await db.prepare(`SELECT data FROM app_state WHERE id = 1`).first().catch(() => null);
  if (st?.data) items.push(["app_state", st.data]);
  for (const t of ["messages", "chat_reads", "visits"]) {
    const r = await db.prepare(`SELECT * FROM ${t}`).all().catch(() => null);
    if (r?.results) items.push([`d1:${t}`, JSON.stringify(r.results)]);
  }
  if (env.SOHBET?.list) {
    for (const p of PREFIXES) {
      for (const k of await kvKeys(env.SOHBET, p)) {
        const v = await env.SOHBET.get(k);
        if (v != null) items.push([`kv:${k}`, v]);
      }
    }
  }

  const { meta } = await db.prepare(`INSERT INTO backups (at) VALUES (?1)`).bind(now).run();
  const id = meta.last_row_id;
  let bytes = 0, n = 0;
  for (const [key, value] of items) {
    if (value.length > MAX_VALUE) continue;
    await db.prepare(`INSERT OR REPLACE INTO backup_items (backup_id, key, value) VALUES (?1, ?2, ?3)`).bind(id, key, value).run();
    bytes += value.length; n++;
  }
  await db.prepare(`UPDATE backups SET items = ?1, bytes = ?2 WHERE id = ?3`).bind(n, bytes, id).run();

  // Prune: keep the newest KEEP snapshots.
  const old = await db.prepare(`SELECT id FROM backups ORDER BY at DESC LIMIT -1 OFFSET ?1`).bind(KEEP).all();
  for (const r of old.results || []) {
    await db.prepare(`DELETE FROM backup_items WHERE backup_id = ?1`).bind(r.id).run();
    await db.prepare(`DELETE FROM backups WHERE id = ?1`).bind(r.id).run();
  }
  return { id, items: n, bytes };
}

export async function listBackups(env) {
  if (!env.DB) return [];
  await ensureTables(env.DB);
  const r = await env.DB.prepare(`SELECT id, at, items, bytes FROM backups ORDER BY at DESC`).all();
  return r.results || [];
}
