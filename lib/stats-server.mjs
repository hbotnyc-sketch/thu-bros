// Site stats (D1): one row per visitor per day. A visitor is a random id kept in the browser;
// once they pick their name the row is linked to that member. Only the admin can read stats.
import { localDate, addDays } from "./core.mjs";

const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

let ready = false;
async function ensure(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS visits (day TEXT NOT NULL, visitor TEXT NOT NULL, member TEXT, opens INTEGER NOT NULL DEFAULT 1, first_at INTEGER NOT NULL, last_at INTEGER NOT NULL, ua TEXT, PRIMARY KEY (day, visitor))"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_visits_member ON visits(member)"),
  ]);
  ready = true;
}
const device = (ua = "") => /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac|Windows|Linux/.test(ua) ? "Computer" : "Other";

/** Members who did something on the site before tracking existed (RSVP, posts, chat…). */
function activeFromState(st) {
  const ids = new Set();
  for (const w of Object.values(st.weeks || {})) {
    Object.keys(w.rsvp || {}).forEach((id) => ids.add(id));
    [w.konu?.presenterId, w.hadis?.by, w.sohbet?.by, w.hostConfirmed, w.recap?.by].forEach((id) => id && ids.add(id));
    (w.hostSkips || []).forEach((id) => ids.add(id));
  }
  (st.events || []).forEach((e) => e.by && ids.add(e.by));
  (st.feedback || []).forEach((f) => ids.add(f.by));
  (st.members || []).forEach((m) => m.notifSeenAt && ids.add(m.id));
  return ids;
}

export async function handleStats(req, env, store, url) {
  if (!env.DB) return json({ error: "Stats aren't set up" }, 501);
  await ensure(env.DB);
  const db = env.DB;
  const { data: st } = await store.load();
  const tz = st?.settings?.tz || "America/New_York";
  const now = Date.now();
  const day = localDate(now, tz);

  // Long-lived sign-in backup (survives Safari's 7-day storage cleanup; server-set cookies aren't capped)
  const cookieMe = (req.headers.get("cookie") || "").match(/(?:^|;\s*)tb_me=([a-z0-9]+)/)?.[1] || "";
  const meCookie = (id) => id
    ? `tb_me=${id}; Max-Age=34560000; Path=/; SameSite=Lax; Secure; HttpOnly`
    : "tb_me=; Max-Age=0; Path=/; SameSite=Lax; Secure; HttpOnly";
  if (url.pathname === "/api/whoami" && req.method === "GET") {
    const m = st?.members?.find((x) => x.id === cookieMe);
    return json({ id: m ? m.id : null });
  }
  // Personal link: GET /api/invite?i=<token> → who it's for (signing in happens via /api/visit, which sets the cookie)
  if (url.pathname === "/api/invite" && req.method === "GET") {
    const tok = url.searchParams.get("i") || "";
    const m = tok.length >= 12 ? st?.members?.find((x) => x.invite === tok) : null;
    return m ? json({ id: m.id, name: m.name }) : json({ error: "This link isn't valid anymore" }, 404);
  }
  if (url.pathname === "/api/signout" && req.method === "POST") {
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": meCookie("") } });
  }

  // Record an open: POST /api/visit?vid=…&actor=…
  if (url.pathname === "/api/visit" && req.method === "POST") {
    const vid = (url.searchParams.get("vid") || "").slice(0, 40);
    if (!/^[a-z0-9]{6,40}$/.test(vid)) return json({ error: "Bad visitor" }, 400);
    const actor = url.searchParams.get("actor") || "";
    const member = url.searchParams.get("demo") ? "visitor" : st?.members?.some((m) => m.id === actor) ? actor : null;
    await db.prepare(
      `INSERT INTO visits (day, visitor, member, opens, first_at, last_at, ua) VALUES (?1, ?2, ?3, 1, ?4, ?4, ?5)
       ON CONFLICT(day, visitor) DO UPDATE SET opens = opens + 1, last_at = ?4, member = COALESCE(?3, member), ua = ?5`
    ).bind(day, vid, member, now, device(req.headers.get("user-agent") || "")).run();
    const headers = { "content-type": "application/json", "cache-control": "no-store" };
    if (member && member !== cookieMe) headers["set-cookie"] = meCookie(member);
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  // Admin-only summary: GET /api/stats?actor=…
  if (url.pathname === "/api/stats" && req.method === "GET") {
    const actor = url.searchParams.get("actor") || "";
    const admin = st?.settings?.roles?.feedback;
    if (!actor || actor !== admin) return json({ error: "Only the admin can see stats" }, 403);
    const from = addDays(day, -13);
    const days = (await db.prepare(
      "SELECT day, COUNT(*) AS people, SUM(opens) AS opens, COUNT(member) AS named FROM visits WHERE day >= ?1 AND (member IS NULL OR member != 'visitor') GROUP BY day ORDER BY day"
    ).bind(from).all()).results;
    const totals = await db.prepare(
      "SELECT COUNT(DISTINCT visitor) AS visitors, COALESCE(SUM(opens), 0) AS opens, COUNT(DISTINCT member) AS members FROM visits WHERE member IS NULL OR member != 'visitor'"
    ).first();
    const seen = (await db.prepare(
      "SELECT member, MIN(first_at) AS first_at, MAX(last_at) AS last_at, SUM(opens) AS opens, MAX(ua) AS device FROM visits WHERE member IS NOT NULL AND member != 'visitor' GROUP BY member"
    ).all()).results;
    const anonToday = await db.prepare("SELECT COUNT(*) AS n FROM visits WHERE day = ?1 AND member IS NULL").bind(day).first();
    const demoToday = await db.prepare("SELECT COUNT(*) AS n, (SELECT COUNT(*) FROM visits WHERE member = 'visitor') AS total FROM visits WHERE day = ?1 AND member = 'visitor'").bind(day).first();
    const before = activeFromState(st || {});
    const seenMap = Object.fromEntries(seen.map((r) => [r.member, r]));
    const members = (st?.members || []).map((m) => ({
      id: m.id, name: m.name, phone: m.phone || "",
      ...(seenMap[m.id] || {}),
      active: !!seenMap[m.id] || before.has(m.id),
    }));
    return json({ today: day, days, totals, anonToday: anonToday?.n || 0, demoToday: demoToday?.n || 0, demoTotal: demoToday?.total || 0, members, trackingSince: (await db.prepare("SELECT MIN(day) AS d FROM visits").first())?.d || day });
  }
  return json({ error: "Not found" }, 404);
}
