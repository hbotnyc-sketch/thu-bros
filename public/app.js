// Sohbet — single-page client. No framework: state → render() → event delegation.

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const HOUR = 3600000, DAY = 24 * HOUR;

const ICONS = {
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  food: '<path d="M3 11h18a9 9 0 0 1-18 0zM7 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M17 7c0-1.5 1-2 1-3.5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  swap: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
};
const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

const TYPES = [
  { id: "esma", label: "Esma-ül Hüsna" },
  { id: "ayet", label: "Ayet / Sure" },
  { id: "siyer", label: "Siyer / Event" },
  { id: "iman", label: "Daily iman" },
  { id: "other", label: "Other" },
];
const typeLabel = (id) => TYPES.find((t) => t.id === id)?.label || "Konu";

/* ---------- state ---------- */
let S = null;                      // server view
let me = store.get("sohbet.me");   // my member id
let sel = null;                    // selected week id
let skew = 0;                      // server clock − local clock
let expanded = new Set();
const now = () => Date.now() + skew;

const members = () => S.state.members;
const member = (id) => members().find((m) => m.id === id);
const nameOf = (id) => member(id)?.name || "Someone";
const initials = (id) => (nameOf(id).trim()[0] || "?").toUpperCase();
const hue = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (id, cls = "") =>
  `<span class="avatar ${cls}" style="background:hsl(${hue(id)} 55% 86%);color:hsl(${hue(id)} 45% 22%)">${esc(initials(id))}</span>`;

const fmtDate = (id, opts) => new Date(id + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
const fmtTime = (hhmm) => {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm || "")) return hhmm || "";
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
};
function left(ms) {
  if (ms <= 0) return "now";
  const h = Math.ceil(ms / HOUR);
  if (h < 24) return `${h}h`;
  const d = Math.ceil(ms / DAY);
  return `${d} day${d > 1 ? "s" : ""}`;
}

/* ---------- api ---------- */
async function api(body) {
  const r = await fetch("/api", {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let j;
  try { j = await r.json(); } catch { throw new Error("Can't reach the server"); }
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  S = j;
  skew = j.now - Date.now();
  if (!sel || !S.state.weeks[sel] || sel < S.currentWeekId) sel = S.currentWeekId;
  return j.result;
}
async function act(type, data = {}) {
  try {
    const r = await api({ type, actor: me, weekId: sel, ...data });
    render();
    return r;
  } catch (e) {
    toast(e.message);
    render();
    throw e;
  }
}
async function refresh() {
  try { await api(); render(); } catch (e) { if (!S) showError(e.message); }
}

/* ---------- toast & sheet ---------- */
let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2800);
}

let sheetSubmit = null;
/** Full-screen dialog on phones, centered card on desktop. The primary action lives in the
 *  sticky top bar so floating badges, browser toolbars and the keyboard can never cover it. */
function openSheet({ title, lead = "", body, action = "Save", danger = "" }, onSubmit) {
  sheetSubmit = onSubmit;
  $("#sheet-root").innerHTML = `<div class="scrim" data-a="close"></div>
    <form class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
      <div class="sheet-bar">
        <button type="button" class="icon-btn" data-a="close" aria-label="Close">${ic("x")}</button>
        <h2>${esc(title)}</h2>
        ${action ? `<button type="submit" class="btn filled" data-primary>${action}</button>` : `<button type="button" class="btn text" data-a="close">Done</button>`}
      </div>
      <div class="sheet-body">${lead ? `<p class="lead">${lead}</p>` : ""}${body}
        ${danger ? `<div class="danger-zone">${danger}</div>` : ""}</div>
    </form>`;
  document.body.classList.add("locked");
  const f = $("#sheet-root form");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sheetSubmit) return;
    const btn = f.querySelector("[data-primary]");
    if (btn) btn.disabled = true;
    try {
      const keep = await sheetSubmit(Object.fromEntries(new FormData(f)), e.submitter);
      if (keep !== "keep") closeSheet();
    } catch { if (btn) btn.disabled = false; }
  });
}
function closeSheet() { $("#sheet-root").innerHTML = ""; sheetSubmit = null; document.body.classList.remove("locked"); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/* ---------- derived ---------- */
const W = () => S.state.weeks[sel];
const curWeek = () => S.state.weeks[S.currentWeekId];
const cooldown = (id) => S.cooldowns[id] || 0;
function canClaim(w) {
  if (!me || w.konu || w.cancelled) return false;
  if (w.ask?.memberId === me) return true;
  const isCur = w.id === S.currentWeekId;
  if (isCur && !w.ask && now() >= S.weekMeta[w.id].cutoff) return true; // queue exhausted → anyone
  return cooldown(me) === 0;
}
function waLink(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/* ---------- render ---------- */
function render() {
  if (!S) return;
  if (!me || !member(me)) { me = null; store.set("sohbet.me", null); return renderWho(); }
  const w = W();
  $("#app").innerHTML = `
    <header class="topbar"><div class="topbar-in">
      <div class="brand">${logo()}Sohbet</div>
      <button class="icon-btn" data-a="share" title="Share this week" aria-label="Share this week">${ic("share")}</button>
      <button class="icon-btn" data-a="members" title="Members & settings" aria-label="Members and settings">${ic("users")}</button>
      <button class="avatar" data-a="switch" title="${esc(nameOf(me))} — switch" style="background:hsl(${hue(me)} 55% 86%);color:hsl(${hue(me)} 45% 22%)">${esc(initials(me))}</button>
    </div></header>
    <main class="wrap">
      ${renderPrompt()}
      ${renderWeekTabs()}
      ${renderWeekHead(w)}
      ${w.cancelled ? `<div class="banner">${ic("ban")} No sohbet this week.</div>` : ""}
      ${renderHadis(w)}
      ${renderKonu(w)}
      ${renderHost(w)}
      ${renderArchive()}
      <p class="foot-note">Selam, ${esc(nameOf(me))} · Allah kabul etsin</p>
    </main>`;
}

const logo = () => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="var(--primary)"/><path d="M41 44.5A15 15 0 1 1 30.5 19a12 12 0 0 0 10.5 25.5z" fill="var(--primary-container)"/><circle cx="43" cy="23" r="3" fill="var(--primary-container)"/></svg>`;

function renderPrompt() {
  const w = curWeek();
  if (w.cancelled || w.konu) return "";
  const meta = S.weekMeta[w.id];
  const t = now();
  const beforeCutoff = t < meta.cutoff;
  const day = fmtDate(w.id, { weekday: "long" });

  // 1) I'm the one being asked by the backup queue
  if (w.ask?.memberId === me) {
    const remain = w.ask.askedAt + 24 * HOUR - t;
    return `<section class="hero warn">
      <div class="deco">${ic("mic")}</div>
      <span class="chip">${ic("clock")} ${left(remain)} to answer</span>
      <h2>No one volunteered this week. Can you present on ${esc(day)}?</h2>
      <p>Any short iman topic is perfect — 10–15 minutes. If you can't, it passes to the next person.</p>
      <div class="row">
        <button class="btn filled lg" data-a="claim" data-week="${w.id}">${ic("check")} Yes, I'll present</button>
        <button class="btn text" data-a="decline">Not this time</button>
      </div></section>`;
  }

  // 2) Someone else is being asked
  if (w.ask) {
    const who = member(w.ask.memberId);
    const remain = w.ask.askedAt + 24 * HOUR - t;
    const msg = `Selam ${who?.name || ""}! No one volunteered for Konu this ${day} (${fmtDate(w.id, { month: "short", day: "numeric" })}). Can you present? Answer here: ${location.origin}`;
    return `<section class="hero quiet"><div class="quiet-row">
      ${avatar(w.ask.memberId, "sm")}
      <div class="grow">No volunteer yet — asking <b>${esc(who?.name)}</b> · ${left(remain)} left</div>
      <a class="btn text" href="${waLink(who?.phone, msg)}" target="_blank" rel="noopener">${ic("chat")} Nudge</a>
    </div>
    ${canClaim(w) ? `<div class="row" style="margin-top:8px"><button class="btn outlined" data-a="claim" data-week="${w.id}">Actually, I'll take it</button></div>` : ""}
    </section>`;
  }

  // 3) Past cutoff, queue exhausted → open to anyone
  if (!beforeCutoff) {
    return `<section class="hero">
      <div class="deco">${ic("mic")}</div>
      <h2>This week's Konu is still open</h2>
      <p>Everyone in the queue has passed. Anyone can step in — even a short reflection helps.</p>
      <button class="btn filled lg" data-a="claim" data-week="${w.id}">${ic("mic")} I'll take it</button>
    </section>`;
  }

  // 4) In cooldown → gentle note, no prompt
  if (cooldown(me) > 0) {
    const n = cooldown(me);
    return `<section class="hero quiet"><div class="quiet-row">
      <span class="avatar sm" style="background:var(--primary-container);color:var(--on-primary-container)">${ic("check")}</span>
      <div class="grow"><b>You presented recently</b> — jazakallah! Your turn opens again after ${n} more ${n === 1 ? "person" : "people"}.</div>
    </div></section>`;
  }

  // 5) The main volunteer prompt
  const ms = meta.cutoff - t;
  const countdown = ms < DAY ? `Last day to volunteer · ${left(ms)} left` : `${left(ms)} left to volunteer`;
  return `<section class="hero">
    <div class="deco">${ic("mic")}</div>
    <span class="chip">${ic("clock")} ${countdown}</span>
    <h2>This week's Konu is open — want to take it?</h2>
    <p>Share something for 10–15 min: an Esma like Huvallahüllezi, an ayet, Miraç, or a day-to-day iman topic.</p>
    <button class="btn filled lg" data-a="claim" data-week="${w.id}">${ic("mic")} I'll take it</button>
  </section>`;
}

function renderWeekTabs() {
  const ids = Object.keys(S.state.weeks).filter((id) => id >= S.currentWeekId).sort().slice(0, 4);
  return `<nav class="weeks" aria-label="Weeks">${ids.map((id) => {
    const w = S.state.weeks[id];
    const label = id === S.currentWeekId ? "This week" : fmtDate(id, { weekday: "short" });
    const dots = w.cancelled ? `<span class="small muted">Off</span>` :
      `<span class="dot ${w.hadis ? "full" : ""}" title="Hadis"></span><span class="dot ${w.konu ? "full" : ""}" title="Konu"></span><span class="dot ${w.host ? "full" : ""}" title="Host"></span>`;
    return `<button class="wk ${id === sel ? "sel" : ""}" data-a="week" data-id="${id}">
      <small>${label}</small><b>${fmtDate(id, { month: "short", day: "numeric" })}</b><span class="dots">${dots}</span></button>`;
  }).join("")}</nav>`;
}

function renderWeekHead(w) {
  const host = w.host ? member(w.host) : null;
  return `<div class="week-head"><div style="flex:1">
      <h1>${fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" })}</h1>
      <div class="meta">
        ${w.time ? `<span>${ic("clock")}${esc(fmtTime(w.time))}</span>` : ""}
        ${w.place || host ? `<span>${ic("pin")}${esc(w.place || `${host.name}'s place`)}</span>` : ""}
      </div></div>
    <button class="btn text small" data-a="cancel">${w.cancelled ? "Restore week" : "Cancel week"}</button>
  </div>`;
}

function clampBlock(key, text) {
  const long = text.length > 280 || text.split("\n").length > 5;
  const open = expanded.has(key);
  return `<div class="notes ${long && !open ? "clamp" : ""}">${esc(text)}</div>
    ${long ? `<button class="more" data-a="more" data-k="${key}">${open ? "Show less" : "Read more"}</button>` : ""}`;
}

function renderHadis(w) {
  const h = w.hadis;
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("book")}</span><h3>Hadis</h3>
      ${h ? `<button class="icon-btn" data-a="hadis" aria-label="Edit hadis">${ic("edit")}</button>` : ""}</div>
    ${h ? `
      <p class="quote">${esc(h.text)}</p>
      ${h.source ? `<div class="src">— ${esc(h.source)}</div>` : ""}
      ${h.notes ? `<div class="notes-box"><div class="lbl">Discussion notes</div>${clampBlock("h" + w.id, h.notes)}</div>` : ""}
      <div class="small muted" style="margin-top:12px">Shared by ${esc(nameOf(h.by))}</div>`
    : `<p class="empty">No hadis posted yet for this week.</p>
       <button class="btn tonal" data-a="hadis">${ic("plus")} Add hadis</button>`}
  </section>`;
}

function renderKonu(w) {
  const k = w.konu;
  if (!k) {
    const asking = w.ask ? (w.ask.memberId === me ? "The backup queue is asking you this week." : `Backup queue is asking ${esc(nameOf(w.ask.memberId))}.`) : "Open — waiting for a volunteer.";
    return `<section class="card">
      <div class="card-h"><span class="badge">${ic("mic")}</span><h3>Konu</h3></div>
      <p class="empty">${w.cancelled ? "—" : asking}</p>
      ${canClaim(w) ? `<button class="btn tonal" data-a="claim" data-week="${w.id}">${ic("mic")} ${w.ask?.memberId === me ? "Yes, I'll present" : w.id === S.currentWeekId ? "Take this week" : "Take this one"}</button>` : ""}
      ${!w.cancelled && !canClaim(w) && cooldown(me) > 0 ? `<p class="small muted" style="margin:0">You're on a short break — ${cooldown(me)} more ${cooldown(me) === 1 ? "person" : "people"} to go.</p>` : ""}
    </section>`;
  }
  const mine = k.presenterId === me;
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("mic")}</span><h3>Konu</h3>
      <button class="icon-btn" data-a="editKonu" aria-label="Edit topic">${ic("edit")}</button></div>
    <div class="person">${avatar(k.presenterId, "lg")}
      <div><div class="who">${esc(nameOf(k.presenterId))}</div>
      <div class="sub">${k.via === "queue" ? "Stepped up from the queue" : "Volunteered"} · jazakallah</div></div></div>
    <p class="title">${esc(k.title)}</p>
    <div class="chips" style="margin-bottom:6px"><span class="chip on">${esc(typeLabel(k.topicType))}</span></div>
    ${k.summary ? `<p class="notes" style="margin-top:8px">${esc(k.summary)}</p>` : ""}
    ${k.notes ? `<div class="notes-box"><div class="lbl">Prep notes · skim before sohbet</div>${clampBlock("k" + w.id, k.notes)}</div>` : ""}
    ${k.link ? `<div class="actions"><a class="btn outlined" href="${esc(k.link)}" target="_blank" rel="noopener">${ic("link")} Open link</a></div>` : ""}
    ${mine ? `<div class="row actions">
      ${!k.notes ? `<button class="btn tonal" data-a="editKonu">${ic("plus")} Add prep notes</button>` : ""}
      <span class="spacer"></span><button class="btn text danger" data-a="release">Give up slot</button></div>` : ""}
  </section>`;
}

function renderHost(w) {
  const iVol = w.hostVolunteers.includes(me);
  const vols = w.hostVolunteers.filter((id) => member(id));
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("home")}</span><h3>Host & food</h3>
      <button class="icon-btn" data-a="host" aria-label="Edit host details">${ic("edit")}</button></div>
    ${w.host ? `
      <div class="person">${avatar(w.host, "lg")}<div><div class="who">${esc(nameOf(w.host))}</div><div class="sub">Hosting this week</div></div></div>
      <div class="kv">
        ${w.place ? `${ic("pin")}<div>${esc(w.place)}</div>` : ""}
        ${w.time ? `${ic("clock")}<div>${esc(fmtTime(w.time))}</div>` : ""}
        ${w.hostNotes ? `${ic("food")}<div style="white-space:pre-wrap">${esc(w.hostNotes)}</div>` : ""}
      </div>`
    : `<p class="empty">Who can host this week?</p>
       <div class="row"><button class="btn ${iVol ? "tonal" : "outlined"}" data-a="hostVol">${iVol ? `${ic("check")} You can host` : `${ic("home")} I can host`}</button>
       ${vols.length ? `<button class="btn text" data-a="host">Confirm host</button>` : ""}</div>
       ${vols.length ? `<div class="section-lbl">Can host</div><div class="chips">${vols.map((id) => `<span class="chip">${esc(nameOf(id))}</span>`).join("")}</div>` : ""}`}
    <div class="section-lbl">Who's bringing what</div>
    ${w.bring.length ? `<ul class="list">${w.bring.map((b) => `<li>${avatar(b.memberId, "sm")}
      <div class="grow"><b style="font-weight:500">${esc(b.item)}</b> <span class="muted small">· ${esc(nameOf(b.memberId))}</span></div>
      ${b.memberId === me ? `<button class="icon-btn" data-a="unbring" data-id="${b.id}" aria-label="Remove">${ic("x")}</button>` : ""}</li>`).join("")}</ul>` : ""}
    <form class="add-row" data-form="bring"><input type="text" name="item" placeholder="I'll bring… (çay, tatlı, pide)" maxlength="80" aria-label="What you'll bring" />
      <button class="btn tonal" type="submit" aria-label="Add">${ic("plus")}</button></form>
  </section>`;
}

function renderArchive() {
  const past = Object.values(S.state.weeks).filter((w) => w.id < S.currentWeekId && w.konu && !w.cancelled).sort((a, b) => (a.id < b.id ? 1 : -1));
  if (!past.length) return "";
  return `<section class="archive"><h2>Past topics</h2><ul class="list">${past.slice(0, 30).map((w) => `
    <li><span class="date">${fmtDate(w.id, { month: "short", day: "numeric" })}</span>
      <div class="grow"><div>${esc(w.konu.title)}</div><div class="small muted">${esc(nameOf(w.konu.presenterId))} · ${esc(typeLabel(w.konu.topicType))}</div></div></li>`).join("")}
  </ul></section>`;
}

/* ---------- who are you ---------- */
function renderWho() {
  const list = [...members()].sort((a, b) => a.name.localeCompare(b.name));
  $("#app").innerHTML = `<main class="who-page">
    <div class="logo">${logo()}</div>
    <h1>Selamün aleyküm</h1>
    <p>Tap your name so the group knows who's who. This phone will remember you.</p>
    ${list.length ? `<div class="name-grid">${list.map((m) => `<button data-a="iam" data-id="${m.id}">${avatar(m.id, "sm")}${esc(m.name)}</button>`).join("")}</div>
    <div class="divider">Not in the list?</div>` : ""}
    <form data-form="join">
      <label class="field"><span>Your name</span><input type="text" name="name" maxlength="40" autocomplete="given-name" required /></label>
      <label class="field"><span>WhatsApp number (optional)</span><input type="tel" name="phone" placeholder="+1 555 123 4567" autocomplete="tel" />
        <div class="hint">Only used for a one-tap nudge if the queue asks you to present.</div></label>
      <button class="btn filled lg block" type="submit">Join the sohbet</button>
    </form></main>`;
}

/* ---------- sheets ---------- */
const weekLabel = (w) => fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" });

function topicSheet(w, existing) {
  const k = existing || {};
  const isAsk = w.ask?.memberId === me;
  openSheet({
    title: existing ? "Edit topic" : isAsk ? "What will you share?" : "Take this week's Konu",
    lead: `${weekLabel(w)} · a title is enough to start.`,
    action: existing ? "Save" : "Take it",
    body: `
    <div class="field"><span>Type</span><div class="seg">${TYPES.map((t) => `<label><input type="radio" name="topicType" value="${t.id}" ${(k.topicType || "iman") === t.id ? "checked" : ""}/><span>${t.label}</span></label>`).join("")}</div></div>
    <label class="field"><span>Title</span><input type="text" name="title" maxlength="140" required value="${esc(k.title)}" placeholder="e.g. Hüvallahüllezî — Haşr 22–24" enterkeyhint="next" /></label>
    <label class="field"><span>Short summary <i>optional</i></span><textarea name="summary" maxlength="600" rows="2" placeholder="What's it about, in a sentence or two">${esc(k.summary)}</textarea></label>
    <label class="field"><span>Prep notes for everyone <i>optional</i></span><textarea name="notes" maxlength="8000" rows="5" placeholder="Ayetler, meali, key points, questions… people can skim this before sohbet.">${esc(k.notes)}</textarea>
      <div class="hint">You can add or update these later — a day before is great.</div></label>
    <label class="field"><span>Link <i>optional</i></span><input type="url" name="link" value="${esc(k.link)}" placeholder="https://…" inputmode="url" /></label>`,
  }, async (f) => {
    if (!f.title?.trim()) { toast("Give your topic a title"); $("#sheet-root [name=title]")?.focus(); throw 0; }
    await act(existing ? "editKonu" : "claimKonu", { weekId: w.id, ...f });
    toast(existing ? "Saved" : "It's yours — jazakallah!");
  });
}

function hadisSheet(w) {
  const h = w.hadis || {};
  openSheet({
    title: w.hadis ? "Edit hadis" : "Add hadis",
    lead: weekLabel(w),
    body: `
    <label class="field"><span>Hadis-i şerif</span><textarea name="text" rows="6" maxlength="6000" placeholder="Hadis metni / meali">${esc(h.text)}</textarea></label>
    <label class="field"><span>Source</span><input type="text" name="source" maxlength="300" value="${esc(h.source)}" placeholder="e.g. Buhârî, Îmân 1" /></label>
    <label class="field"><span>Discussion notes <i>optional</i></span><textarea name="notes" rows="4" maxlength="6000" placeholder="Points or questions to discuss">${esc(h.notes)}</textarea></label>`,
    danger: w.hadis ? `<button type="submit" class="btn text danger" name="_clear" value="1">${ic("trash")} Remove hadis</button>` : "",
  }, async (f, submitter) => {
    if (submitter?.name === "_clear") { if (!confirm("Remove this hadis?")) throw 0; f.text = ""; }
    else if (!f.text?.trim()) { toast("Add the hadis text"); throw 0; }
    await act("setHadis", { weekId: w.id, ...f });
    toast(f.text ? "Saved" : "Removed");
  });
}

function hostSheet(w) {
  const vols = w.hostVolunteers.filter((id) => member(id));
  const others = members().filter((m) => !vols.includes(m.id));
  const opt = (id) => `<option value="${id}" ${w.host === id ? "selected" : ""}>${esc(nameOf(id))}</option>`;
  openSheet({
    title: "Host & details",
    lead: weekLabel(w),
    body: `
    <label class="field"><span>Host</span><select name="hostId">
      <option value="">Not decided yet</option>
      ${vols.length ? `<optgroup label="Can host">${vols.map(opt).join("")}</optgroup>` : ""}
      <optgroup label="Everyone">${others.map((m) => opt(m.id)).join("")}</optgroup></select></label>
    <label class="field"><span>Place / address</span><input type="text" name="place" maxlength="200" value="${esc(w.place)}" placeholder="Address or 'Ahmet's place'" /></label>
    <label class="field"><span>Time</span><input type="time" name="time" value="${esc(w.time)}" /></label>
    <label class="field"><span>Food & notes</span><textarea name="hostNotes" rows="3" maxlength="1000" placeholder="e.g. Dinner after sohbet, parking on the street">${esc(w.hostNotes)}</textarea></label>`,
  }, async (f) => { await act("setHost", { weekId: w.id, ...f }); toast("Saved"); });
}

function membersSheet() {
  const q = S.state.queue.filter((id) => member(id));
  const cd = S.state.settings.cooldown;
  openSheet({
    title: "Members & queue",
    action: null,
    lead: "Order is the backup queue when nobody volunteers. Whoever presents or passes moves to the end.",
    body: `
    <ul class="list mem">${q.map((id, i) => {
      const m = member(id), c = cooldown(id);
      return `<li><span class="pos">${i + 1}</span>${avatar(id, "sm")}
        <div class="grow"><div class="nm">${esc(m.name)}${id === me ? ' <span class="muted small">(you)</span>' : ""}</div>
          <div class="small muted">${c ? `Break · ${c} to go` : "Available"}</div></div>
        <div class="mem-actions">
        <button type="button" class="icon-btn" data-a="mup" data-id="${id}" aria-label="Move ${esc(m.name)} up" ${i === 0 ? "disabled" : ""}>${ic("up")}</button>
        <button type="button" class="icon-btn" data-a="mdown" data-id="${id}" aria-label="Move ${esc(m.name)} down" ${i === q.length - 1 ? "disabled" : ""}>${ic("down")}</button>
        <button type="button" class="icon-btn" data-a="medit" data-id="${id}" aria-label="Edit ${esc(m.name)}">${ic("edit")}</button></div></li>`;
    }).join("")}</ul>
    <div class="section-lbl">Add someone</div>
    <div class="add-grid"><input type="text" name="name" placeholder="Name" maxlength="40" aria-label="Name" enterkeyhint="done" />
      <input type="tel" name="phone" placeholder="WhatsApp (optional)" aria-label="WhatsApp number" />
      <button type="submit" class="btn tonal">${ic("plus")} Add</button></div>
    <div class="section-lbl">Settings</div>
    <div class="setting"><div>Break after presenting<div class="small muted">Prompt hides until this many others present (now ${S.effectiveCooldown} for this group size)</div></div>
      <div class="stepper"><button type="button" data-a="cd" data-d="-1" aria-label="Less">−</button><b>${cd}</b><button type="button" data-a="cd" data-d="1" aria-label="More">+</button></div></div>
    <p class="small muted">Thursdays · backup queue starts Monday 9pm · 24h per person · ${esc(S.state.settings.tz || "UTC")}</p>`,
  }, async (f) => {
    if (!f.name?.trim()) { toast("Enter a name"); throw 0; }
    await act("addMember", { name: f.name, phone: f.phone });
    toast(`${f.name.trim()} added`);
    setTimeout(membersSheet, 0);
  });
}

function editMemberSheet(id) {
  const m = member(id);
  openSheet({
    title: `Edit ${m.name}`,
    body: `
    <label class="field"><span>Name</span><input type="text" name="name" maxlength="40" value="${esc(m.name)}" /></label>
    <label class="field"><span>WhatsApp number</span><input type="tel" name="phone" value="${esc(m.phone)}" placeholder="+1 555 123 4567" />
      <div class="hint">Used for the one-tap nudge when the queue asks them.</div></label>`,
    danger: `<button type="submit" class="btn text danger" name="_remove" value="1">${ic("trash")} Remove from group</button>`,
  }, async (f, submitter) => {
    if (submitter?.name === "_remove") {
      if (!confirm(`Remove ${m.name} from the group?`)) throw 0;
      await act("removeMember", { id });
    } else await act("updateMember", { id, name: f.name, phone: f.phone });
    setTimeout(membersSheet, 0);
  });
}

/* ---------- events ---------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a;
  const w = S && sel ? W() : null;
  switch (a) {
    case "close": closeSheet(); break;
    case "iam": me = el.dataset.id; store.set("sohbet.me", me); render(); break;
    case "switch":
      if (confirm(`You're ${nameOf(me)}. Switch to a different name?`)) { me = null; store.set("sohbet.me", null); render(); }
      break;
    case "week": sel = el.dataset.id; render(); break;
    case "more": { const k = el.dataset.k; expanded.has(k) ? expanded.delete(k) : expanded.add(k); render(); break; }
    case "claim": { const wk = S.state.weeks[el.dataset.week || sel]; topicSheet(wk); break; }
    case "editKonu": topicSheet(w, w.konu); break;
    case "release":
      if (confirm("Give up this slot? It reopens for others.")) { await act("releaseKonu").catch(() => {}); toast("Slot reopened"); }
      break;
    case "decline":
      if (confirm("No problem — pass to the next person?")) { await act("answerAsk", { weekId: S.currentWeekId }).catch(() => {}); toast("Passed on — maybe next time!"); }
      break;
    case "hadis": hadisSheet(w); break;
    case "host": hostSheet(w); break;
    case "hostVol": act("toggleHostVolunteer").catch(() => {}); break;
    case "unbring": act("removeBring", { id: el.dataset.id }).catch(() => {}); break;
    case "cancel":
      if (confirm(w.cancelled ? "Bring this week back?" : "Mark this week as no sohbet?")) act("setCancelled", { cancelled: !w.cancelled }).catch(() => {});
      break;
    case "members": membersSheet(); break;
    case "medit": editMemberSheet(el.dataset.id); break;
    case "mup": case "mdown":
      await act("moveQueue", { id: el.dataset.id, dir: a === "mup" ? -1 : 1 }).catch(() => {});
      membersSheet();
      break;
    case "cd":
      await act("setSettings", { cooldown: S.state.settings.cooldown + +el.dataset.d }).catch(() => {});
      membersSheet();
      break;
    case "share": shareWeek(); break;
  }
});

document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-form]");
  if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  if (f.dataset.form === "bring") {
    if (!data.item?.trim()) return;
    await act("addBring", data).catch(() => {});
  } else if (f.dataset.form === "join") {
    if (!data.name?.trim()) return toast("Enter your name");
    try {
      const r = await api({ type: "addMember", ...data });
      me = r.id; store.set("sohbet.me", me); render();
      toast(`Hoş geldin, ${data.name.trim()}!`);
    } catch (err) { toast(err.message); }
  }
});

function shareWeek() {
  const w = W();
  const lines = [`*Sohbet · ${fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" })}*`];
  if (w.cancelled) lines.push("No sohbet this week.");
  else {
    if (w.time || w.place) lines.push(`🕗 ${fmtTime(w.time)}${w.place ? " · 📍 " + w.place : ""}`);
    lines.push(`📖 Hadis: ${w.hadis ? (w.hadis.source || "posted") : "—"}`);
    lines.push(`🎤 Konu: ${w.konu ? `${w.konu.title} (${nameOf(w.konu.presenterId)})` : "Open — volunteer here 👇"}`);
    lines.push(`🏠 Host: ${w.host ? nameOf(w.host) : "Who can host?"}`);
  }
  lines.push(location.origin);
  const text = lines.join("\n");
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else window.open(waLink("", text), "_blank", "noopener");
}

function showError(msg) {
  $("#app").innerHTML = `<main class="who-page"><div class="logo">${logo()}</div><h1>Can't load</h1><p>${esc(msg)}</p>
    <button class="btn filled" onclick="location.reload()">Try again</button></main>`;
}

/* ---------- boot ---------- */
(async () => {
  try {
    await api();
    if (!S.state.settings.tz) await api({ type: "init", tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    render();
  } catch (e) { showError(e.message); }
  setInterval(() => { if (!$("#sheet-root").innerHTML && document.visibilityState === "visible") refresh(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !$("#sheet-root").innerHTML) refresh(); });
})();
