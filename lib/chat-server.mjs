// Chat: one group room ("general") and private 1-to-1 rooms ("dm:<idA>:<idB>", ids sorted).
// Stored in Cloudflare D1 (SQLite) so simultaneous messages are never lost.
const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conv TEXT NOT NULL, sender TEXT NOT NULL, body TEXT NOT NULL, at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conv, id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS chat_reads (member TEXT NOT NULL, conv TEXT NOT NULL, last_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (member, conv))"),
  ]);
  schemaReady = true;
}

export const dmConv = (a, b) => "dm:" + [a, b].sort().join(":");
const MINE = "(conv = 'general' OR (conv LIKE 'dm:%' AND instr(conv, ?1) > 0))";

export async function handleChat(req, env, store, url) {
  if (!env.DB) return json({ error: "Chat isn't set up" }, 501);
  await ensureSchema(env.DB);
  const db = env.DB;
  const actor = url.searchParams.get("actor") || "";
  const { data: st } = await store.load();
  const members = st?.members || [];
  if (!members.some((m) => m.id === actor)) return json({ error: "Pick your name first" }, 401);
  const sub = url.pathname.replace(/^\/api\/chat\/?/, "");

  // Unread counts + last message for each of my rooms (for badges and the room list)
  if (sub === "summary" && req.method === "GET") {
    const unread = await db.prepare(
      `SELECT m.conv AS conv, COUNT(*) AS n FROM messages m LEFT JOIN chat_reads r ON r.member = ?1 AND r.conv = m.conv
       WHERE ${MINE.replaceAll("conv", "m.conv")} AND m.id > COALESCE(r.last_id, 0) AND m.sender != ?1 GROUP BY m.conv`
    ).bind(actor).all();
    const last = await db.prepare(
      `SELECT id, conv, sender, body, at FROM messages WHERE id IN (SELECT MAX(id) FROM messages WHERE ${MINE} GROUP BY conv)`
    ).bind(actor).all();
    return json({ unread: Object.fromEntries(unread.results.map((r) => [r.conv, r.n])), last: last.results });
  }

  const conv = url.searchParams.get("conv") || "";
  const ok = conv === "general" || (/^dm:[a-z0-9]+:[a-z0-9]+$/.test(conv) && conv.split(":").includes(actor)
    && conv.split(":").slice(1).every((id) => members.some((m) => m.id === id)));
  if (!ok) return json({ error: "Unknown chat" }, 404);

  // Messages after an id (polling); first load returns the latest 100. Marks them read.
  if (sub === "" && req.method === "GET") {
    const after = Math.max(0, parseInt(url.searchParams.get("after"), 10) || 0);
    const rows = after
      ? (await db.prepare("SELECT id, sender, body, at FROM messages WHERE conv = ?1 AND id > ?2 ORDER BY id LIMIT 200").bind(conv, after).all()).results
      : (await db.prepare("SELECT * FROM (SELECT id, sender, body, at FROM messages WHERE conv = ?1 ORDER BY id DESC LIMIT 100) ORDER BY id").bind(conv).all()).results;
    const maxId = rows.length ? rows[rows.length - 1].id : 0;
    if (maxId) {
      await db.prepare(
        "INSERT INTO chat_reads (member, conv, last_id) VALUES (?1, ?2, ?3) ON CONFLICT(member, conv) DO UPDATE SET last_id = MAX(last_id, excluded.last_id)"
      ).bind(actor, conv, maxId).run();
    }
    return json({ messages: rows });
  }

  if (sub === "" && req.method === "POST") {
    const body = (await req.text()).trim().slice(0, 2000);
    if (!body) return json({ error: "Empty message" }, 400);
    const at = Date.now();
    const r = await db.prepare("INSERT INTO messages (conv, sender, body, at) VALUES (?1, ?2, ?3, ?4)").bind(conv, actor, body, at).run();
    const id = r.meta.last_row_id;
    await db.prepare(
      "INSERT INTO chat_reads (member, conv, last_id) VALUES (?1, ?2, ?3) ON CONFLICT(member, conv) DO UPDATE SET last_id = MAX(last_id, excluded.last_id)"
    ).bind(actor, conv, id).run();
    return json({ message: { id, sender: actor, body, at } });
  }

  return json({ error: "Not found" }, 404);
}
