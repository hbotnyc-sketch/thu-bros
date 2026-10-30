// Thursday Bros — single-page client. No framework: state → render() → event delegation.
import { HADITHS } from "./hadiths.js";

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
  notes: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  rec: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  wand: '<path d="m15 4 5 5L9 20H4v-5zM13 6l5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !activeRec) closeSheet(); });

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
const gmaps = (a) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
const amaps = (a) => `https://maps.apple.com/?q=${encodeURIComponent(a)}`;
const hostOf = (w) => S.hosts?.[w.id] || null;
const weekTime = (w) => w.customTime || S.state.settings.defaultTime;
const weekPlace = (w) => w.place || member(hostOf(w)?.id)?.address || "";
const rsvpOf = (w) => w.rsvp || {};
const roleId = (r) => { const id = S.state.settings.roles?.[r]; return id && member(id) ? id : null; };
const canEdit = (r) => !roleId(r) || roleId(r) === me;
const shortDate = (id) => fmtDate(id, { weekday: "short", month: "short", day: "numeric" });
/** Upcoming week this member is presenting (if any) */
const upcomingTalk = (id) => Object.values(S.state.weeks)
  .filter((w) => w.id >= S.currentWeekId && !w.cancelled && w.konu?.presenterId === id).sort((a, b) => (a.id < b.id ? -1 : 1))[0] || null;
function breakText(id) {
  const up = upcomingTalk(id), n = cooldown(id);
  if (up) return `Presenting ${shortDate(up.id)}`;
  return n ? `Short break · ${n} to go` : "Available";
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
      <div class="brand">${logo()}<span class="wordmark">Thursday Bros</span></div>
      <button class="icon-btn" data-a="share" title="Share this week" aria-label="Share this week">${ic("share")}</button>
      <button class="icon-btn" data-a="members" title="Members & settings" aria-label="Members and settings">${ic("users")}</button>
      <button class="avatar" data-a="switch" title="${esc(nameOf(me))} — switch" style="background:hsl(${hue(me)} 55% 86%);color:hsl(${hue(me)} 45% 22%)">${esc(initials(me))}</button>
    </div></header>
    <main class="wrap">
      ${renderHostPrompt()}
      ${renderPrompt()}
      ${renderWeekTabs()}
      ${renderWeekHead(w)}
      ${w.cancelled ? `<div class="banner">${ic("ban")} No sohbet this week.</div>` : ""}
      ${renderHadis(w)}
      ${renderSohbet(w)}
      ${renderKonu(w)}
      ${renderHost(w)}
      ${w.id === S.currentWeekId && !w.cancelled ? renderRecapCard(w) : ""}
      ${renderArchive()}
      <p class="foot-note">Selam, ${esc(nameOf(me))} · Allah kabul etsin</p>
    </main>`;
}

const logo = () => `<svg viewBox="0 0 64 64" aria-hidden="true" class="mark"><rect width="64" height="64" rx="16" fill="var(--on-surface)"/><text x="28" y="43" text-anchor="middle" font-family="'Roboto Flex','Helvetica Neue',Arial,sans-serif" font-weight="800" font-size="30" letter-spacing="-2" fill="var(--surface)">TB</text><circle cx="51.5" cy="40.5" r="3.6" fill="var(--primary)"/></svg>`;

function renderHostPrompt() {
  const w = curWeek();
  if (w.cancelled) return "";
  const h = hostOf(w), day = shortDate(w.id);
  const skipped = (w.hostSkips || []).filter((x) => member(x));
  if (!h) return `<section class="hero warn">
      <div class="deco">${ic("home")}</div>
      <h2>No host yet for ${esc(day)}</h2>
      <p>Everyone in the yemek sırası has passed this week. Can you host?</p>
      <button class="btn filled lg" data-a="hostYes">${ic("home")} I can host</button></section>`;
  if (h.id !== me || h.confirmed) return "";
  return `<section class="hero warn">
    <div class="deco">${ic("home")}</div>
    <span class="chip">${ic("home")} Yemek sırası</span>
    <h2>${skipped.length ? `${esc(skipped.map(nameOf).join(", "))} can't host this week — can you host on ${esc(day)}?` : `You're hosting on ${esc(day)} 🏠`}</h2>
    <p>${skipped.length ? "If you can't either, it'll ask the next person in the order." : "Please confirm and share the address and any details: gate code, parking, food…"}</p>
    <div class="row">
      <button class="btn filled lg" data-a="hostYes">${ic("check")} Yes, I'll host</button>
      <button class="btn text" data-a="hostSkip">${skipped.length ? "I can't" : "Skip this week"}</button>
    </div></section>`;
}

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
    const msg = `Selam ${who?.name || ""}! No one volunteered for the sunum this ${day} (${fmtDate(w.id, { month: "short", day: "numeric" })}). Can you present? Answer here: ${location.origin}`;
    return `<section class="hero quiet"><div class="quiet-row">
      ${avatar(w.ask.memberId, "sm")}
      <div class="grow">No volunteer for sunum yet — asking <b>${esc(who?.name)}</b> · ${left(remain)} left</div>
      <a class="btn text" href="${waLink(who?.phone, msg)}" target="_blank" rel="noopener">${ic("chat")} Nudge</a>
    </div>
    ${canClaim(w) ? `<div class="row" style="margin-top:8px"><button class="btn outlined" data-a="claim" data-week="${w.id}">Actually, I'll take it</button></div>` : ""}
    </section>`;
  }

  // 3) Past cutoff, queue exhausted → open to anyone
  if (!beforeCutoff) {
    return `<section class="hero">
      <div class="deco">${ic("mic")}</div>
      <h2>This week's sunum is still open</h2>
      <p>Everyone in the queue has passed. Anyone can step in — even a short reflection helps.</p>
      <button class="btn filled lg" data-a="claim" data-week="${w.id}">${ic("mic")} I'll take it</button>
    </section>`;
  }

  // 4) In cooldown → gentle note, no prompt
  if (cooldown(me) > 0) {
    const n = cooldown(me);
    return `<section class="hero quiet"><div class="quiet-row">
      <span class="avatar sm" style="background:var(--primary-container);color:var(--on-primary-container)">${ic("check")}</span>
      <div class="grow">${upcomingTalk(me)
        ? `<b>You're presenting on ${esc(shortDate(upcomingTalk(me).id))}</b> — jazakallah! Tap that week above to add or update your prep notes.`
        : `<b>You presented recently</b> — jazakallah! Your turn opens again after ${n} more ${n === 1 ? "person" : "people"}.`}</div>
    </div></section>`;
  }

  // 5) The main volunteer prompt
  const ms = meta.cutoff - t;
  const countdown = ms < DAY ? `Last day to volunteer · ${left(ms)} left` : `${left(ms)} left to volunteer`;
  return `<section class="hero">
    <div class="deco">${ic("mic")}</div>
    <span class="chip">${ic("clock")} ${countdown}</span>
    <h2>Sunum for ${esc(shortDate(w.id))} is open — want to take it?</h2>
    <p>Share something for 10–15 min: an Esma like Huvallahüllezi, an ayet, Miraç, or a day-to-day iman topic.</p>
    <button class="btn filled lg" data-a="claim" data-week="${w.id}">${ic("mic")} I'll take it</button>
  </section>`;
}

function renderWeekTabs() {
  const ids = Object.keys(S.state.weeks).filter((id) => id >= S.currentWeekId).sort().slice(0, 4);
  return `<nav class="weeks" aria-label="Weeks">${ids.map((id) => {
    const w = S.state.weeks[id];
    const today = new Date().toLocaleDateString("en-CA", { timeZone: S.state.settings.tz || undefined });
    const label = id === S.currentWeekId ? (id === today ? "Today" : "Next sohbet") : fmtDate(id, { weekday: "short" });
    const h = hostOf(w);
    const sub = w.cancelled ? `<span class="small muted">No sohbet</span>` :
      `<span class="dot ${w.hadis ? "full" : ""}" title="Hadis"></span><span class="dot ${w.konu ? "full" : ""}" title="Konu"></span>
       <span class="wk-host">${h ? esc(nameOf(h.id)) + (h.confirmed ? " ✓" : "") : "Host?"}</span>`;
    return `<button class="wk ${id === sel ? "sel" : ""}" data-a="week" data-id="${id}">
      <small>${label}</small><b>${fmtDate(id, { month: "short", day: "numeric" })}</b><span class="dots">${sub}</span></button>`;
  }).join("")}</nav>`;
}

function renderWeekHead(w) {
  const place = weekPlace(w);
  return `<div class="week-head"><div style="flex:1;min-width:0">
      <h1>${fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" })}</h1>
      <div class="meta">
        <span>${ic("clock")}${esc(fmtTime(weekTime(w)))}</span>
        ${place ? `<a class="meta-link" href="${gmaps(place)}" target="_blank" rel="noopener">${ic("pin")}${esc(place)}</a>` : ""}
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
  const h = w.hadis, owner = roleId("hadis"), edit = canEdit("hadis");
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("book")}</span><h3>Hadis</h3>
      ${owner ? `<span class="owner">${esc(nameOf(owner))}</span>` : ""}
      ${h && edit ? `<button class="icon-btn" data-a="hadis" aria-label="Edit hadis">${ic("edit")}</button>` : ""}</div>
    ${h ? `
      <p class="quote">${esc(h.text)}</p>
      ${h.source ? `<div class="src">— ${esc(h.source)}</div>` : ""}
      ${h.notes ? `<div class="notes-box"><div class="lbl">Discussion notes</div>${clampBlock("h" + w.id, h.notes)}</div>` : ""}`
    : edit ? `${sampleHadis()}<button class="btn tonal" data-a="hadis">${ic("plus")} Add hadis</button>`
    : `<p class="empty" style="margin:0">${esc(nameOf(owner))} will post this week's hadis here.</p>`}
  </section>`;
}

function renderSohbet(w) {
  const so = w.sohbet, owner = roleId("sohbet"), edit = canEdit("sohbet");
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("chat")}</span><h3>Sohbet</h3>
      ${owner ? `<span class="owner">${esc(nameOf(owner))}</span>` : ""}
      ${so && edit ? `<button class="icon-btn" data-a="sohbet" aria-label="Edit sohbet">${ic("edit")}</button>` : ""}</div>
    ${so ? `
      ${so.title ? `<p class="title">${esc(so.title)}</p>` : ""}
      ${so.notes ? `<div class="notes-box"><div class="lbl">Notes · skim before sohbet</div>${clampBlock("s" + w.id, so.notes)}</div>` : ""}
      ${so.link ? `<div class="actions"><a class="btn outlined" href="${esc(so.link)}" target="_blank" rel="noopener">${ic("link")} Open link</a></div>` : ""}`
    : edit ? `${sampleSohbet()}<button class="btn tonal" data-a="sohbet">${ic("plus")} Add sohbet topic</button>`
    : `<p class="empty" style="margin:0">${esc(nameOf(owner))} will share the sohbet topic and notes here before Thursday.</p>`}
  </section>`;
}

const instr = (t) => `<span class="instr">(${t})</span>`;
function sampleHadis() {
  return `<div class="sample" aria-label="Example">
    <span class="sample-tag">Örnek · instruction sample</span>
    <p class="quote">Kolaylaştırınız, zorlaştırmayınız; müjdeleyiniz, nefret ettirmeyiniz.
${instr("hadis metni buraya — Türkçe meal, Arapça ya da ikisi birden")}</p>
    <div class="src">— Buhârî, İlim 11 ${instr("kaynak: kitap + numara, isteyen açıp bakabilsin")}</div>
    <div class="notes-box"><div class="lbl">Discussion notes</div><div class="notes">• Dini yaşarken kendimize ve başkalarına nasıl kolaylık gösteririz?
• Ailede / işte bir örnek
${instr("isteğe bağlı: sohbeti açmak için 2–3 nokta veya soru")}</div></div>
    <p class="instr block">(Bu bir örnektir, gerçek hadis eklenince kaybolur. "Add hadis"e bas → metin, kaynak, notlar → Save. Sohbetten 1–2 gün önce eklersen herkes önceden okuyabilir. Sonradan ✎ ile düzenleyebilirsin.)</p>
  </div>`;
}
function sampleKonu() {
  return `<div class="sample" aria-label="Example">
    <span class="sample-tag">Örnek · instruction sample</span>
    <p class="title">Hüvallahüllezî — Haşr 22–24 ${instr("başlık: kısa ve net")}</p>
    <div class="chips" style="margin-bottom:6px"><span class="chip on">Esma-ül Hüsna</span> ${instr("tür: Esma, Ayet, Siyer, Daily iman…")}</div>
    <p class="notes" style="margin-top:8px">Haşr suresinin son ayetlerindeki isimler ve günlük hayatımıza yansıması. ${instr("1–2 cümle özet")}</p>
    <div class="notes-box"><div class="lbl">Prep notes · skim before sohbet</div><div class="notes">Haşr 22: "O, kendisinden başka ilah olmayan Allah'tır; gaybı da görünen âlemi de bilendir…"
1) Âlimü'l-gaybi ve'ş-şehâde
2) er-Rahmân, er-Rahîm
3) el-Melik, el-Kuddûs, es-Selâm
Soru: Bu isimleri gün içinde nasıl hatırlarız?
${instr("hazırlık notları: ayet/meal, ana noktalar, sorular — herkes önceden göz atar")}</div></div>
    <p class="instr block">(Bu bir örnektir. Konuyu alan kişi "Take"e basar → başlık + tür yeterli, notları sonradan ✎ ile ekleyebilir. Notları sohbetten bir gün önce eklemek idealdir. 10–15 dk yeter.)</p>
  </div>`;
}

function sampleSohbet() {
  return `<div class="sample" aria-label="Example">
    <span class="sample-tag">Örnek · instruction sample</span>
    <p class="title">Tevekkül: sebebe sarılıp Allah'a dayanmak ${instr("bu haftanın sohbet konusu")}</p>
    <div class="notes-box"><div class="lbl">Notes · skim before sohbet</div><div class="notes">• Âl-i İmrân 159: "…Bir kere de karar verdin mi, artık Allah'a tevekkül et."
• "Deveni bağla, sonra tevekkül et." (Tirmizî, Kıyâmet 60)
• Soru: İş/okul stresinde tevekkülü nasıl yaşarız?
${instr("ayetler, hadisler, ana noktalar, sorular — herkes sohbetten önce göz atar")}</div></div>
    <p class="instr block">(Bu bir örnektir, sadece sana görünüyor ve gerçek konu eklenince kaybolur. "Add sohbet topic"e bas → başlık + notlar (+ link istersen) → Save. Bir gün önce paylaşırsan herkes okuyup gelir.)</p>
  </div>`;
}

function renderKonu(w) {
  const k = w.konu;
  if (!k) {
    const asking = w.ask ? (w.ask.memberId === me ? "The backup queue is asking you this week." : `Backup queue is asking ${esc(nameOf(w.ask.memberId))}.`) : "Open — waiting for a volunteer.";
    return `<section class="card">
      <div class="card-h"><span class="badge">${ic("mic")}</span><h3>Sunum</h3><span class="owner">rotating</span></div>
      <p class="empty">${w.cancelled ? "—" : asking}</p>
      ${w.cancelled ? "" : sampleKonu()}
      ${canClaim(w) ? `<button class="btn tonal" data-a="claim" data-week="${w.id}">${ic("mic")} ${w.ask?.memberId === me ? "Yes, I'll present" : `Take ${fmtDate(w.id, { month: "short", day: "numeric" })}`}</button>` : ""}
      ${!w.cancelled && !canClaim(w) && cooldown(me) > 0 ? `<p class="small muted" style="margin:0">${upcomingTalk(me) ? `You're presenting on ${esc(shortDate(upcomingTalk(me).id))} — one at a time 🙂` : `You're on a short break — ${cooldown(me)} more ${cooldown(me) === 1 ? "person" : "people"} to go.`}</p>` : ""}
    </section>`;
  }
  const mine = k.presenterId === me;
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("mic")}</span><h3>Sunum</h3>
      ${mine ? `<button class="icon-btn" data-a="editKonu" aria-label="Edit topic">${ic("edit")}</button>` : ""}</div>
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
  const h = hostOf(w);
  const place = weekPlace(w);
  const r = rsvpOf(w);
  const yes = Object.keys(r).filter((id) => r[id] === "yes" && member(id));
  const no = Object.keys(r).filter((id) => r[id] === "no" && member(id));
  const mine = r[me];
  const skipped = (w.hostSkips || []).filter((x) => member(x));
  const hm = h && member(h.id);
  const nudge = h && !h.confirmed && h.id !== me
    ? `<a class="btn text small" href="${waLink(hm?.phone, `Selam ${hm?.name}! You're down to host Thursday Bros on ${shortDate(w.id)}. Can you confirm (or skip) here: ${location.origin}`)}" target="_blank" rel="noopener">${ic("chat")} Remind</a>` : "";
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("home")}</span><h3>Host & yemek</h3>
      <button class="icon-btn" data-a="host" aria-label="Change host or details">${ic("edit")}</button></div>
    ${h ? `<div class="person">${avatar(h.id, "lg")}<div style="flex:1;min-width:0"><div class="who">${esc(nameOf(h.id))}${h.id === me ? ' <span class="muted small">(you)</span>' : ""}</div>
        <div class="sub">${h.confirmed ? `<span class="ok">${ic("check")} Confirmed</span>` : "Waiting to confirm"}${skipped.length ? ` · covering for ${esc(skipped.map(nameOf).join(", "))}` : h.changed ? " · swapped" : ""}</div></div>
        ${nudge || `<button class="btn text" data-a="rota">Sıra</button>`}</div>
        ${h.id === me && !h.confirmed && w.id !== S.currentWeekId ? `<div class="row" style="margin:-4px 0 12px"><button class="btn tonal" data-a="hostYes">${ic("check")} Confirm</button><button class="btn text" data-a="hostSkip">Skip this week</button></div>` : ""}
        ${h.id === me && h.confirmed ? `<button class="btn text small" data-a="hostYes" style="margin:-6px 0 8px;padding-left:0">${ic("edit")} Update address & notes</button>` : ""}`
      : (S.state.settings.hostRota || []).length
        ? `<p class="empty">No host yet — everyone in the order passed.</p><button class="btn tonal" data-a="hostYes" style="margin-bottom:12px">${ic("home")} I can host</button>`
        : `<p class="empty">No host yet. Set up the yemek sırası once and it fills every week.</p>
           <button class="btn tonal" data-a="rotaEdit" style="margin-bottom:12px">${ic("plus")} Set yemek sırası</button>`}
    ${h && !w.cancelled ? `<div class="addr">${ic("clock")}<div><div class="addr-t">${esc(fmtDate(w.id, { weekday: "long" }))}, ${esc(fmtTime(weekTime(w)))}</div></div></div>` : ""}
    ${place ? `<div class="addr">${ic("pin")}<div style="flex:1;min-width:0"><div class="addr-t">${esc(place)}</div>
        <div class="row" style="margin-top:8px"><a class="btn outlined small" href="${gmaps(place)}" target="_blank" rel="noopener">Google Maps</a><a class="btn outlined small" href="${amaps(place)}" target="_blank" rel="noopener">Apple Maps</a></div></div></div>` : ""}
    ${w.hostNotes ? `<div class="notes-box" style="margin-top:0;margin-bottom:12px"><div class="lbl">Notes from host</div><div class="notes">${esc(w.hostNotes)}</div></div>` : ""}
    ${w.cancelled ? "" : `<div class="rsvp">
      <div class="section-lbl" style="margin-top:4px">Geliyor musun?</div>
      <div class="seg2" role="group" aria-label="Attendance">
        <button class="${mine === "yes" ? "on" : ""}" data-a="rsvp" data-v="yes" aria-pressed="${mine === "yes"}">${mine === "yes" ? ic("check") : ""}Geliyorum <b>${yes.length}</b></button>
        <button class="${mine === "no" ? "on no" : ""}" data-a="rsvp" data-v="no" aria-pressed="${mine === "no"}">${mine === "no" ? ic("check") : ""}Gelemiyorum <b>${no.length}</b></button>
      </div>
      ${yes.length ? `<div class="faces">${yes.slice(0, 14).map((id) => `<span title="${esc(nameOf(id))}">${avatar(id, "sm")}</span>`).join("")}
        <span class="small muted">${esc(yes.slice(0, 3).map(nameOf).join(", "))}${yes.length > 3 ? ` +${yes.length - 3}` : ""}</span></div>` : ""}
      ${no.length ? `<div class="small muted" style="margin-top:6px">Gelemiyor: ${esc(no.map(nameOf).join(", "))}</div>` : ""}
    </div>`}
  </section>`;
}

let archiveQ = "";
const weekTitle = (w) => w.recap?.title || w.sohbet?.title || w.konu?.title || "Sohbet";
function pastWeeks() {
  return Object.values(S.state.weeks)
    .filter((w) => w.id < S.currentWeekId && !w.cancelled && (w.recap || w.konu || w.hadis || w.sohbet))
    .sort((a, b) => (a.id < b.id ? 1 : -1));
}
function archiveRows() {
  const t = fold(archiveQ.trim());
  const rows = pastWeeks().filter((w) => !t || fold([
    weekTitle(w), ...(w.recap?.tags || []), w.recap?.snippet, w.sohbet?.title, w.konu?.title, w.hadis?.source, w.hadis?.text,
    w.konu && nameOf(w.konu.presenterId), fmtDate(w.id, { month: "long", year: "numeric" }),
  ].filter(Boolean).join(" ")).includes(t));
  if (!rows.length) return `<li class="muted small" style="padding:14px 2px">${t ? "Nothing found." : "No past sohbets yet."}</li>`;
  return rows.map((w) => `<li><button class="arch-row" data-a="detail" data-week="${w.id}">
    <span class="date">${fmtDate(w.id, { month: "short", day: "numeric" })}<small>${fmtDate(w.id, { year: "numeric" })}</small></span>
    <span class="grow"><span class="t">${esc(weekTitle(w))}</span>
      <span class="small muted">${[w.konu && "Sunum: " + nameOf(w.konu.presenterId), w.recap ? "📝 notes" : "", w.recap?.audioParts ? "🎧 audio" : ""].filter(Boolean).map(esc).join(" · ")}</span>
      ${w.recap?.tags?.length ? `<span class="tags">${w.recap.tags.slice(0, 4).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</span>` : ""}</span>
    ${ic("down").replace('class="ic"', 'class="ic chev"')}</button></li>`).join("");
}
function renderArchive() {
  if (!pastWeeks().length) return "";
  return `<section class="archive"><h2>Geçmiş sohbetler</h2>
    <div class="picker-box search">${ic("search")}<input type="search" id="arch-q" placeholder="Search topics, tags, names…" value="${esc(archiveQ)}" aria-label="Search past sohbets" /></div>
    <ul class="list" id="arch-list">${archiveRows()}</ul></section>`;
}
document.addEventListener("input", (e) => {
  if (e.target.id === "arch-q") { archiveQ = e.target.value; const l = $("#arch-list"); if (l) l.innerHTML = archiveRows(); }
});

function renderRecapCard(w) {
  const r = w.recap;
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("notes")}</span><h3>Notlar · Recap</h3>
      ${r ? `<button class="icon-btn" data-a="recap" data-week="${w.id}" aria-label="Edit notes">${ic("edit")}</button>` : ""}</div>
    ${r ? `<p class="title">${esc(r.title || "Notes")}</p>${r.snippet ? `<p class="notes" style="margin-top:0">${esc(r.snippet)}…</p>` : ""}
      <div class="row actions"><button class="btn tonal" data-a="detail" data-week="${w.id}">Open notes</button>
      <button class="btn text" data-a="record" data-week="${w.id}">${ic("rec")} Record more</button></div>`
    : `<p class="empty">During or after the sohbet: record it, upload audio, paste a transcript, or type notes. It all goes into Geçmiş sohbetler.</p>
      <div class="row"><button class="btn filled" data-a="record" data-week="${w.id}">${ic("rec")} Record sohbet</button>
      <button class="btn tonal" data-a="recap" data-week="${w.id}">${ic("notes")} Add notes</button></div>`}
  </section>`;
}

/* ---------- who are you ---------- */
function renderWho() {
  $("#app").innerHTML = `<main class="who-page">
    <div class="logo">${logo()}</div>
    <h1>Selamün aleyküm</h1>
    <div class="who-brand">Thursday Bros · weekly sohbet</div>
    <p>Start typing your name and pick yourself from the list. This phone will remember you.</p>
    <div class="picker">
      <div class="picker-box">${ic("users")}<input type="text" id="who-q" placeholder="Your name" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Your name" aria-controls="who-list" /></div>
      <ul class="picker-list" id="who-list" role="listbox"></ul>
    </div>
  </main>`;
  const q = $("#who-q");
  const draw = () => {
    const t = fold(q.value.trim());
    const list = [...members()].sort((a, b) => a.name.localeCompare(b.name))
      .filter((m) => !t || fold(m.name).includes(t))
      .sort((a, b) => (fold(a.name).startsWith(t) ? 0 : 1) - (fold(b.name).startsWith(t) ? 0 : 1));
    const exact = members().some((m) => fold(m.name) === t);
    $("#who-list").innerHTML = list.slice(0, 30).map((m) => `<li><button type="button" role="option" data-a="iam" data-id="${m.id}">${avatar(m.id, "sm")}<span>${hl(m.name, t)}</span></button></li>`).join("")
      + (t && !exact ? `<li><button type="button" class="new" data-a="join" data-name="${esc(q.value.trim())}">${ic("plus")}<span>I'm new — add “${esc(q.value.trim())}”</span></button></li>` : "")
      + (!list.length && !t ? `<li class="muted small" style="padding:12px">No one here yet — type your name to join.</li>` : "");
  };
  q.addEventListener("input", draw);
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#who-list button")?.click(); } });
  draw();
}
const fold = (t) => String(t).toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
function hl(name, t) {
  if (!t) return esc(name);
  const i = fold(name).indexOf(t);
  return i < 0 ? esc(name) : esc(name.slice(0, i)) + "<b>" + esc(name.slice(i, i + t.length)) + "</b>" + esc(name.slice(i + t.length));
}

/* ---------- sheets ---------- */
const weekLabel = (w) => fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" });

function topicSheet(w, existing) {
  const k = existing || {};
  const isAsk = w.ask?.memberId === me;
  openSheet({
    title: existing ? "Edit sunum" : isAsk ? "What will you share?" : `Sunum · ${fmtDate(w.id, { month: "short", day: "numeric" })}`,
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
  const def = S.rotaPreview.find((x) => x.weekId === w.id)?.host?.id || null;
  const rotaId = (() => { const h = hostOf(w); return h && !h.changed ? h.id : (w.host ? null : def); })();
  const opt = (m) => `<option value="${m.id}" ${w.host === m.id ? "selected" : ""}>${esc(m.name)}</option>`;
  const sorted = [...members()].sort((a, b) => a.name.localeCompare(b.name));
  openSheet({
    title: "Host & details",
    lead: `${weekLabel(w)} · changes here only affect this week.`,
    body: `
    <label class="field"><span>Host</span><select name="hostId">
      <option value="" ${!w.host ? "selected" : ""}>Follow yemek sırası${rotaId ? ` (${esc(nameOf(rotaId))})` : ""}</option>
      ${sorted.map(opt).join("")}</select>
      <div class="hint">Swapping weeks? Pick the other person here, and do the same on their week.</div></label>
    <label class="field"><span>Address <i>blank = host's saved address</i></span><input type="text" name="place" maxlength="200" value="${esc(w.place)}" placeholder="${esc(member(hostOf(w)?.id)?.address || "Street, city")}" /></label>
    <label class="field"><span>Time</span><input type="time" name="time" value="${esc(weekTime(w))}" /></label>
    <label class="field"><span>Notes <i>optional</i></span><textarea name="hostNotes" rows="3" maxlength="1000" placeholder="e.g. Parking on the street, dinner after sohbet">${esc(w.hostNotes)}</textarea></label>`,
  }, async (f) => { await act("setHost", { weekId: w.id, ...f }); toast("Saved"); });
}

function confirmHostSheet(w) {
  const mine = member(me);
  const h = hostOf(w);
  const updating = h?.id === me && h.confirmed;
  openSheet({
    title: updating ? "Hosting details" : "Confirm hosting",
    lead: `${weekLabel(w)} · everyone sees this on the site.`,
    action: updating ? "Save" : "Confirm",
    body: `
    <label class="field"><span>Address</span><input type="text" name="place" maxlength="200" value="${esc(w.place || mine?.address || "")}" placeholder="Street, city" autocomplete="street-address" />
      <label class="check"><input type="checkbox" name="saveAddress" value="1" checked /> Remember as my home address</label></label>
    <div class="field"><span>Start time</span>
      <div class="seg" style="margin-bottom:8px">${["19:00", "19:30", "20:00"].map((t) => `<label><input type="radio" name="tq" value="${t}" ${weekTime(w) === t ? "checked" : ""} data-tq /><span>${fmtTime(t)}</span></label>`).join("")}</div>
      <input type="time" name="time" value="${esc(weekTime(w))}" aria-label="Start time" /></div>
    <label class="field"><span>Notes for everyone <i>optional</i></span><textarea name="hostNotes" rows="4" maxlength="1000" placeholder="Gate code, where to park, which door, food plans…">${esc(w.hostNotes)}</textarea></label>`,
  }, async (f) => {
    if (!f.place?.trim()) { toast("Add the address so people can find you"); throw 0; }
    await act("confirmHost", { weekId: w.id, place: f.place, time: f.time, hostNotes: f.hostNotes, saveAddress: !!f.saveAddress });
    toast(updating ? "Saved" : "Jazakallah — you're hosting!");
  });
}

function rotaSheet() {
  const rows = S.rotaPreview.filter((x) => x.host);
  openSheet({
    title: "Yemek sırası",
    action: null,
    lead: "The order repeats after the last person. Changes for a single week show as swapped.",
    body: rows.length ? `<ul class="list">${rows.map(({ weekId, host }) => {
      const w = S.state.weeks[weekId];
      return `<li class="${weekId === S.currentWeekId ? "now" : ""}"><span class="date">${fmtDate(weekId, { month: "short", day: "numeric" })}</span>
        ${avatar(host.id, "sm")}<div class="grow">${esc(nameOf(host.id))}${host.id === me ? ' <span class="muted small">(you)</span>' : ""}
        ${w?.cancelled ? ' <span class="chip">No sohbet</span>' : host.changed ? ' <span class="chip">swapped</span>' : ""}</div></li>`;
    }).join("")}</ul>
    <button type="button" class="btn outlined" data-a="rotaEdit" style="margin-top:16px">${ic("edit")} Edit order</button>`
    : `<p class="empty">No order yet.</p><button type="button" class="btn tonal" data-a="rotaEdit">${ic("plus")} Set yemek sırası</button>`,
  });
}

function rotaEditSheet() {
  const st = S.state.settings;
  const names = (st.hostRota || []).filter((id) => member(id)).map(nameOf).join("\n");
  openSheet({
    title: "Edit yemek sırası",
    lead: "One name per line, in order. You can paste the list from WhatsApp — dates are removed automatically. New names are added to the group.",
    body: `
    <label class="field"><span>Order</span><textarea name="names" rows="12" placeholder="Berkay     Nov 5, 26&#10;Harun      Nov 12, 26&#10;Ahmet      Nov 19, 26">${esc(names)}</textarea></label>
    <label class="field"><span>First person hosts on</span><input type="date" name="start" value="${esc(st.rotaStart || S.currentWeekId)}" />
      <div class="hint">If you paste a list with dates, the first date is used.</div></label>`,
  }, async (f) => {
    const lines = String(f.names || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const dateRe = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(,?\s*'?\d{2,4})?|\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?|\d{4}-\d{2}-\d{2}/i;
    let start = f.start;
    const first = lines.find((l) => dateRe.test(l));
    if (first) { const d = parseLooseDate(first.match(dateRe)[0]); if (d) start = d; }
    const names = lines.map((l) => l.replace(dateRe, "").replace(/^(yemek s[ıi]ram[ıi]z|s[ıi]ra)\s*:?$/i, "").replace(/^[\d.)\-\s]+/, "").trim()).filter(Boolean);
    if (!names.length) { toast("Add at least one name"); throw 0; }
    const r = await act("setRota", { names, start });
    toast(r?.created ? `Saved · ${r.created} new ${r.created === 1 ? "person" : "people"} added` : "Saved");
    setTimeout(rotaSheet, 0);
  });
}
function parseLooseDate(t) {
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;
  const mo = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  const m1 = t.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s*'?(\d{2,4}))?/i);
  const m2 = t.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  let y, m, d;
  if (m1) { m = mo.indexOf(m1[1].toLowerCase()) + 1; d = +m1[2]; y = m1[3]; }
  else if (m2) { m = +m2[1]; d = +m2[2]; y = m2[3]; } // US style M/D
  else return null;
  y = y ? (+y < 100 ? 2000 + +y : +y) : new Date().getFullYear();
  if (!m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function sohbetSheet(w) {
  const so = w.sohbet || {};
  openSheet({
    title: w.sohbet ? "Edit sohbet" : "Add sohbet topic",
    lead: `${weekLabel(w)} · share a day before so people can skim it.`,
    body: `
    <label class="field"><span>Topic</span><input type="text" name="title" maxlength="140" value="${esc(so.title)}" placeholder="e.g. Tevekkül" /></label>
    <label class="field"><span>Notes</span><textarea name="notes" rows="8" maxlength="8000" placeholder="Ayetler, hadisler, ana noktalar, sorular…">${esc(so.notes)}</textarea></label>
    <label class="field"><span>Link <i>optional</i></span><input type="url" name="link" value="${esc(so.link)}" placeholder="https://…" inputmode="url" /></label>`,
    danger: w.sohbet ? `<button type="submit" class="btn text danger" name="_clear" value="1">${ic("trash")} Remove</button>` : "",
  }, async (f, submitter) => {
    if (submitter?.name === "_clear") { if (!confirm("Remove this sohbet topic?")) throw 0; f.title = ""; f.notes = ""; }
    else if (!f.title?.trim() && !f.notes?.trim()) { toast("Add a topic or notes"); throw 0; }
    await act("setSohbet", { weekId: w.id, ...f });
    toast("Saved");
  });
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
          <div class="small muted">${esc(breakText(id))}</div></div>
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
    <div class="setting"><div>Hadis<div class="small muted">Only this person can post the hadis</div></div>
      <select data-change="role" data-role="hadis" style="width:auto;max-width:46%" aria-label="Hadis person">${roleOptions("hadis")}</select></div>
    <div class="setting"><div>Sohbet<div class="small muted">Only this person can post the sohbet</div></div>
      <select data-change="role" data-role="sohbet" style="width:auto;max-width:46%" aria-label="Sohbet person">${roleOptions("sohbet")}</select></div>
    <div class="setting"><div>Usual start time<div class="small muted">Each week can still be changed</div></div>
      <input type="time" value="${esc(S.state.settings.defaultTime)}" data-change="defTime" style="width:auto" aria-label="Usual start time" /></div>
    <div class="setting"><div>Yemek sırası<div class="small muted">${(S.state.settings.hostRota || []).length} people</div></div>
      <button type="button" class="btn outlined" data-a="rotaEdit">${ic("edit")} Edit</button></div>
    <p class="small muted">Thursdays · backup queue starts Monday 9pm · 24h per person · ${esc(S.state.settings.tz || "UTC")}</p>`,
  }, async (f) => {
    if (!f.name?.trim()) { toast("Enter a name"); throw 0; }
    await act("addMember", { name: f.name, phone: f.phone });
    toast(`${f.name.trim()} added`);
    setTimeout(membersSheet, 0);
  });
}

function roleOptions(r) {
  const cur = roleId(r);
  return `<option value="">Anyone</option>` + [...members()].sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => `<option value="${m.id}" ${m.id === cur ? "selected" : ""}>${esc(m.name)}</option>`).join("");
}

function editMemberSheet(id) {
  const m = member(id);
  openSheet({
    title: `Edit ${m.name}`,
    body: `
    <label class="field"><span>Name</span><input type="text" name="name" maxlength="40" value="${esc(m.name)}" /></label>
    <label class="field"><span>WhatsApp number</span><input type="tel" name="phone" value="${esc(m.phone)}" placeholder="+1 555 123 4567" />
      <div class="hint">Used for the one-tap nudge when the queue asks them.</div></label>
    <label class="field"><span>Home address <i>for hosting</i></span><input type="text" name="address" maxlength="200" value="${esc(m.address)}" placeholder="Street, city" /></label>`,
    danger: `<button type="submit" class="btn text danger" name="_remove" value="1">${ic("trash")} Remove from group</button>`,
  }, async (f, submitter) => {
    if (submitter?.name === "_remove") {
      if (!confirm(`Remove ${m.name} from the group?`)) throw 0;
      await act("removeMember", { id });
    } else await act("updateMember", { id, name: f.name, phone: f.phone, address: f.address });
    setTimeout(membersSheet, 0);
  });
}

/* ---------- archive: notes, transcripts, recording ---------- */
async function apiX(path, opts = {}) {
  const r = await fetch(path, opts);
  let j; try { j = await r.json(); } catch { throw new Error("Can't reach the server"); }
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}
const loadRecap = (id) => apiX(`/api/recap?week=${id}`);
const bullets = (t) => esc(t || "");
const wordCount = (t) => (t.trim().match(/\S+/g) || []).length;

async function openDetail(id) {
  let d;
  try { d = await loadRecap(id); } catch (e) { return toast(e.message); }
  const w = S.state.weeks[id], r = d.recap || {}, meta = w.recap || {};
  const att = (r.attendees || meta.attendees || []).filter((x) => member(x));
  const sec = (label, txt) => txt ? `<div class="d-sec"><div class="lbl">${label}</div><div class="notes">${bullets(txt)}</div></div>` : "";
  openSheet({
    title: fmtDate(id, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    action: null,
    body: `
    <h3 class="d-title">${esc(r.title || weekTitle(w))}</h3>
    ${r.tags?.length ? `<div class="chips" style="margin-bottom:12px">${r.tags.map((t) => `<span class="chip on">${esc(t)}</span>`).join("")}</div>` : ""}
    ${r.summary ? `<p class="d-summary">${esc(r.summary)}</p>` : `<p class="muted">No notes yet for this sohbet.</p>`}
    ${sec("Hadis", r.hadis)}${sec("Sohbet", r.sohbet)}${sec("Sunum", r.sunum)}${sec("Questions", r.questions)}
    ${att.length ? `<div class="d-sec"><div class="lbl">Who came · ${att.length}</div><div class="faces">${att.map((x) => `<span title="${esc(nameOf(x))}">${avatar(x, "sm")}</span>`).join("")}</div>
      <div class="small muted" style="margin-top:6px">${esc(att.map(nameOf).join(", "))}</div></div>` : ""}
    <div class="row" style="margin:14px 0 6px"><button type="button" class="btn tonal" data-a="recap" data-week="${id}">${ic("edit")} ${d.recap ? "Edit notes" : "Add notes"}</button></div>

    <div class="d-plan">
      <div class="section-lbl">What was planned</div>
      ${w.hadis ? `<div class="d-sec"><div class="lbl">Hadis</div><p class="quote" style="font-size:15px">${esc(w.hadis.text)}</p>${w.hadis.source ? `<div class="src">— ${esc(w.hadis.source)}</div>` : ""}</div>` : ""}
      ${w.sohbet ? `<div class="d-sec"><div class="lbl">Sohbet · ${esc(nameOf(w.sohbet.by))}</div>${w.sohbet.title ? `<b style="font-weight:500">${esc(w.sohbet.title)}</b>` : ""}${w.sohbet.notes ? clampBlock("ds" + id, w.sohbet.notes) : ""}</div>` : ""}
      ${w.konu ? `<div class="d-sec"><div class="lbl">Sunum · ${esc(nameOf(w.konu.presenterId))}</div><b style="font-weight:500">${esc(w.konu.title)}</b>${w.konu.notes ? clampBlock("dk" + id, w.konu.notes) : ""}
        ${w.konu.presenterId === me ? `<div><button type="button" class="btn text small" data-a="unpresent" data-week="${id}" style="padding-left:0">I didn't present this</button></div>` : ""}</div>` : ""}
    </div>

    ${d.audio.length ? `<div class="d-sec"><div class="lbl">Recording · ${d.audio.length} part${d.audio.length > 1 ? "s" : ""}</div>
      <ol class="audio-list">${d.audio.map((a, i) => `<li><span>Part ${i + 1}</span><audio controls preload="none" src="/api/audio?key=${encodeURIComponent(a.key)}"></audio></li>`).join("")}</ol></div>` : ""}
    ${d.transcript ? `<details class="d-tx"><summary>Transcript · ${wordCount(d.transcript).toLocaleString()} words</summary><div class="notes">${esc(d.transcript)}</div></details>` : ""}`,
  });
}

function recapSheet(id, preset = {}) {
  return loadRecap(id).then((d) => {
    const w = S.state.weeks[id];
    const r = { ...(d.recap || {}), ...(preset.keep || {}), ...(preset.draft || {}) };
    const transcript = preset.transcript ?? d.transcript ?? "";
    const going = Object.entries(w.rsvp || {}).filter(([, v]) => v === "yes").map(([k]) => k);
    const att = new Set(r.attendees?.length ? r.attendees : going);
    const sorted = [...members()].sort((a, b) => a.name.localeCompare(b.name));
    openSheet({
      title: d.recap ? "Edit notes" : "Sohbet notes",
      lead: `${weekLabel(w)} · anyone can add or edit.`,
      body: `
      <div class="src-tools">
        <div class="section-lbl" style="margin-top:0">1 · Transcript <i class="muted small" style="font-style:normal">(optional)</i></div>
        <div class="row" style="margin-bottom:10px">
          <button type="button" class="btn outlined" data-a="record" data-week="${id}">${ic("rec")} Record</button>
          <label class="btn outlined" style="cursor:pointer">${ic("upload")} Upload audio<input type="file" accept="audio/*,video/mp4" data-change="upload" data-week="${id}" hidden /></label>
        </div>
        <textarea name="transcript" id="rc-tx" rows="5" placeholder="…or paste a transcript here (e.g. from Voice Memos)">${esc(transcript)}</textarea>
        <div class="row" style="margin-top:8px;justify-content:space-between">
          <span class="small muted" id="rc-wc">${transcript ? wordCount(transcript).toLocaleString() + " words" : ""}</span>
          <button type="button" class="btn tonal" data-a="summarize" data-week="${id}" ${d.aiEnabled ? "" : "disabled"}>${ic("wand")} Summarize with AI</button>
        </div>
        ${preset.audioUrl ? `<a class="btn outlined block" style="margin-top:10px" href="${preset.audioUrl}" download="thursday-bros-${id}.${preset.audioExt}">${ic("upload").replace('d="M12 16V4M7 9l5-5 5 5M4 20h16"', 'd="M12 4v12M7 11l5 5 5-5M4 20h16"')} Save recording to phone</a>
          <p class="hint">The audio isn't stored on the site. Save it here if you want to keep it.</p>` : ""}
      </div>
      <div class="section-lbl">2 · Notes ${preset.draft ? `<span class="chip on" style="margin-left:6px">AI draft — please review</span>` : ""}</div>
      <label class="field"><span>Title</span><input type="text" name="title" maxlength="140" value="${esc(r.title)}" placeholder="e.g. Tevekkül ve sabır" /></label>
      <label class="field"><span>Summary</span><textarea name="summary" rows="4" placeholder="A few sentences about the night">${esc(r.summary)}</textarea></label>
      <label class="field"><span>Hadis</span><textarea name="hadis" rows="3" placeholder="• What we discussed">${esc(r.hadis)}</textarea></label>
      <label class="field"><span>Sohbet</span><textarea name="sohbet" rows="4" placeholder="• Main points">${esc(r.sohbet)}</textarea></label>
      <label class="field"><span>Sunum</span><textarea name="sunum" rows="3" placeholder="• Takeaways">${esc(r.sunum)}</textarea></label>
      <label class="field"><span>Questions</span><textarea name="questions" rows="3" placeholder="• Questions raised or left open">${esc(r.questions)}</textarea></label>
      <label class="field"><span>Tags <i>comma separated</i></span><input type="text" name="tags" value="${esc((r.tags || []).join(", "))}" placeholder="tevekkül, Haşr 22, el-Kuddûs" /></label>
      <div class="field"><span>Who came</span><div class="seg att">${sorted.map((m) => `<label><input type="checkbox" name="att" value="${m.id}" ${att.has(m.id) ? "checked" : ""}/><span>${esc(m.name)}</span></label>`).join("")}</div></div>`,
    }, async (f) => {
      const body = {
        actor: me, title: f.title, summary: f.summary, hadis: f.hadis, sohbet: f.sohbet, sunum: f.sunum, questions: f.questions,
        tags: String(f.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
        attendees: [...document.querySelectorAll("#sheet-root input[name=att]:checked")].map((x) => x.value),
        transcript: $("#rc-tx")?.value ?? "",
      };
      if (!body.title && !body.summary && !body.sohbet && !body.hadis && !body.sunum && !body.transcript.trim()) { toast("Add a title, some notes, or a transcript"); throw 0; }
      try { S = await apiX(`/api/recap?week=${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
      catch (e) { toast(e.message); throw e; }
      render();
      toast("Saved to Geçmiş sohbetler");
    });
    const tx = $("#rc-tx");
    tx?.addEventListener("input", () => { $("#rc-wc").textContent = tx.value.trim() ? wordCount(tx.value).toLocaleString() + " words" : ""; });
  }).catch((e) => toast(e.message));
}

async function summarizeInto(id, btn) {
  const tx = $("#rc-tx")?.value || "";
  if (tx.trim().length < 40) return toast("Paste or record a transcript first");
  const w = S.state.weeks[id];
  btn.disabled = true; const label = btn.innerHTML; btn.innerHTML = `<span class="spinner sm"></span> Summarizing…`;
  try {
    const { draft } = await apiX("/api/summarize", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: tx, context: {
        date: weekLabel(w),
        hadis: w.hadis ? `${w.hadis.text.slice(0, 300)} (${w.hadis.source || ""})` : "",
        sohbet: w.sohbet?.title || "", sunum: w.konu ? `${w.konu.title} — ${nameOf(w.konu.presenterId)}` : "",
      } }),
    });
    const f = $("#sheet-root form");
    for (const k of ["title", "summary", "hadis", "sohbet", "sunum", "questions"]) if (draft[k]) f.elements[k].value = draft[k];
    if (draft.tags?.length) f.elements.tags.value = draft.tags.join(", ");
    toast("Draft ready — review, then Save");
    f.elements.title.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) { toast(e.message); }
  btn.disabled = false; btn.innerHTML = label;
}

/* audio helpers: 16 kHz mono WAV parts, ~60s each */
const PART_SECONDS = window.__partSeconds || 60, OUT_RATE = 16000;
function downsample(f32, inRate) {
  const ratio = inRate / OUT_RATE, len = Math.floor(f32.length / ratio), out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const a = Math.floor(i * ratio), b = Math.min(f32.length, Math.floor((i + 1) * ratio));
    let sum = 0; for (let j = a; j < b; j++) sum += f32[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, b - a)));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}
function wavBlob(pcm) {
  const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, OUT_RATE, true);
  v.setUint32(28, OUT_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: "audio/wav" });
}
async function blobB64(blob) {
  const u = new Uint8Array(await blob.arrayBuffer()); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Sends parts one at a time: keep audio (if storage is on) → transcribe → save running transcript. */
class Pipeline {
  constructor(week, startPart, baseText, onUpdate, keepAudio = false) {
    Object.assign(this, { week, next: startPart, base: baseText.trim(), onUpdate, keepAudio, parts: [], done: 0, total: 0, failed: 0 });
    this.q = Promise.resolve();
  }
  add(blob) {
    const i = this.next++, k = this.total++;
    this.q = this.q.then(() => this.process(i, k, blob));
    return this.q;
  }
  async process(i, k, blob) {
    try {
      if (this.keepAudio) await fetch(`/api/audio?week=${this.week}&part=${i}`, { method: "PUT", body: blob }).catch(() => {});
      const { text } = await apiX(`/api/transcribe?week=${this.week}&part=${i}`, { method: "POST", body: await blobB64(blob) });
      this.parts[k] = text;
    } catch (e) {
      this.parts[k] = `[part ${i + 1}: transcription failed]`; this.failed++; this.lastError = e.message;
    }
    this.done++;
    await fetch(`/api/transcript?week=${this.week}`, { method: "POST", body: this.text() }).catch(() => {});
    this.onUpdate?.(this);
  }
  text() { return [this.base, this.parts.filter(Boolean).join("\n")].filter(Boolean).join("\n\n"); }
  drain() { return this.q; }
}

function editorDraft() {
  const f = $("#sheet-root form"); if (!f || !$("#rc-tx")) return null;
  const v = (k) => f.elements[k]?.value || "";
  return { title: v("title"), summary: v("summary"), hadis: v("hadis"), sohbet: v("sohbet"), sunum: v("sunum"), questions: v("questions"),
    tags: v("tags").split(",").map((t) => t.trim()).filter(Boolean),
    attendees: [...f.querySelectorAll("input[name=att]:checked")].map((x) => x.value) };
}
let activeRec = null;
async function startRecording(id) {
  const keep = editorDraft();
  let d; try { d = await loadRecap(id); } catch (e) { return toast(e.message); }
  if (!navigator.mediaDevices?.getUserMedia) return toast("This browser can't record. Try Safari or Chrome.");
  openSheet({
    title: "Recording sohbet", action: null,
    lead: `${weekLabel(S.state.weeks[id])} · keep this screen open; the phone stays awake.`,
    body: `<div class="rec">
      <div class="rec-dot"></div><div class="rec-time" id="rec-time">00:00</div>
      <div class="rec-level"><span id="rec-lvl"></span></div>
      <p class="small muted" id="rec-status">Starting microphone…</p>
      <button type="button" class="btn filled lg block rec-stop" data-a="recStop">${ic("stop")} Stop & finish</button>
      <div class="rec-tx" id="rec-tx"></div></div>`,
  });
  const pipe = new Pipeline(id, d.mediaEnabled ? d.audio.length : 0, d.transcript || "", (p) => {
    const tx = $("#rec-tx"); if (tx) { tx.textContent = p.parts.filter(Boolean).slice(-4).join("\n"); }
    const st = $("#rec-status"); if (st && activeRec) st.textContent = `${p.done} min transcribed${p.failed ? ` · ${p.failed} failed` : ""}`;
  }, d.mediaEnabled);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(); await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const rec = { id, keep, stream, ctx, proc, pipe, buf: [], len: 0, rate: ctx.sampleRate, started: Date.now(), wake: null };
    rec.flush = () => {
      if (!rec.len) return;
      const all = new Float32Array(rec.len); let o = 0;
      for (const b of rec.buf) { all.set(b, o); o += b.length; }
      rec.buf = []; rec.len = 0;
      pipe.add(wavBlob(downsample(all, rec.rate)));
    };
    proc.onaudioprocess = (e) => {
      const d0 = e.inputBuffer.getChannelData(0);
      rec.buf.push(new Float32Array(d0)); rec.len += d0.length;
      let peak = 0; for (let i = 0; i < d0.length; i += 16) peak = Math.max(peak, Math.abs(d0[i]));
      const l = $("#rec-lvl"); if (l) l.style.width = Math.min(100, peak * 140) + "%";
      if (rec.len >= rec.rate * PART_SECONDS) rec.flush();
    };
    src.connect(proc); proc.connect(ctx.destination);
    // A small compressed copy the recorder can save to their phone (not uploaded)
    try {
      const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      if (type) {
        rec.mr = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 48000 });
        rec.mrChunks = []; rec.mrType = type;
        rec.mr.ondataavailable = (e) => e.data.size && rec.mrChunks.push(e.data);
        rec.mr.start(10000);
      }
    } catch {}
    rec.timer = setInterval(() => {
      const s = Math.floor((Date.now() - rec.started) / 1000), t = $("#rec-time");
      if (t) t.textContent = `${s >= 3600 ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }, 500);
    try { rec.wake = await navigator.wakeLock?.request("screen"); } catch {}
    activeRec = rec;
    $("#rec-status").textContent = "Recording · transcribed every minute";
  } catch (e) {
    closeSheet();
    toast(e.name === "NotAllowedError" ? "Microphone permission was denied" : "Couldn't start the microphone");
  }
}
async function stopRecording() {
  const rec = activeRec; if (!rec) return closeSheet();
  activeRec = null;
  rec.flush(); clearInterval(rec.timer);
  const saved = rec.mr && rec.mr.state !== "inactive" ? new Promise((res) => { rec.mr.onstop = res; rec.mr.stop(); }) : Promise.resolve();
  await saved;
  rec.proc.disconnect(); rec.stream.getTracks().forEach((t) => t.stop()); rec.ctx.close().catch(() => {}); rec.wake?.release?.().catch(() => {});
  const st = $("#rec-status"); if (st) st.textContent = "Finishing the last parts…";
  const b = $(".rec-stop"); if (b) { b.disabled = true; b.innerHTML = `<span class="spinner sm"></span> Transcribing…`; }
  await rec.pipe.drain();
  if (rec.pipe.failed) toast(`${rec.pipe.failed} part(s) couldn't be transcribed${rec.pipe.lastError ? ": " + rec.pipe.lastError : ""}`);
  closeSheet();
  let audioUrl = null, audioExt = "m4a";
  if (rec.mrChunks?.length) {
    const blob = new Blob(rec.mrChunks, { type: rec.mrType.split(";")[0] });
    audioUrl = URL.createObjectURL(blob); audioExt = rec.mrType.includes("webm") ? "webm" : "m4a";
  }
  recapSheet(rec.id, { transcript: rec.pipe.text(), keep: rec.keep, audioUrl, audioExt });
}

async function uploadAudio(id, file) {
  if (!file) return;
  const keep = editorDraft();
  let d; try { d = await loadRecap(id); } catch (e) { return toast(e.message); }
  openSheet({
    title: "Transcribing audio", action: null,
    lead: `${esc(file.name)} · keep this screen open.`,
    body: `<div class="rec"><div class="rec-level"><span id="up-bar" style="width:2%"></span></div><p class="small muted" id="up-status">Reading the file…</p><div class="rec-tx" id="rec-tx"></div></div>`,
  });
  const keepTx = $("#rc-tx")?.value;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx; try { ctx = new AC({ sampleRate: OUT_RATE }); } catch { ctx = new AC(); }
    const ab = await file.arrayBuffer();
    const audio = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
    ctx.close?.();
    const ch = audio.getChannelData(0), rate = audio.sampleRate, step = rate * PART_SECONDS;
    const total = Math.ceil(ch.length / step);
    const pipe = new Pipeline(id, d.mediaEnabled ? d.audio.length : 0, keepTx ?? d.transcript ?? "", (p) => {
      const bar = $("#up-bar"); if (bar) bar.style.width = Math.max(2, (p.done / total) * 100) + "%";
      const s = $("#up-status"); if (s) s.textContent = `Transcribed ${p.done} of ${total} minutes${p.failed ? ` · ${p.failed} failed` : ""}`;
      const tx = $("#rec-tx"); if (tx) tx.textContent = p.parts.filter(Boolean).slice(-3).join("\n");
    }, d.mediaEnabled);
    $("#up-status").textContent = `0 of ${total} minutes`;
    for (let o = 0; o < ch.length; o += step) await pipe.add(wavBlob(downsample(ch.subarray(o, o + step), rate)));
    closeSheet();
    if (pipe.failed) toast(`${pipe.failed} part(s) couldn't be transcribed`);
    recapSheet(id, { transcript: pipe.text(), keep });
  } catch (e) {
    closeSheet();
    toast("Couldn't read that audio file. Try an .m4a or .mp3, or paste the transcript instead.");
  }
}

/* ---------- events ---------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a;
  const w = S && sel ? W() : null;
  switch (a) {
    case "close":
      if (activeRec) { if (confirm("Stop recording?")) stopRecording(); break; }
      closeSheet(); break;
    case "detail": openDetail(el.dataset.week); break;
    case "recap": recapSheet(el.dataset.week || sel); break;
    case "record": startRecording(el.dataset.week || sel); break;
    case "recStop": stopRecording(); break;
    case "summarize": summarizeInto(el.dataset.week, el); break;
    case "iam": me = el.dataset.id; store.set("sohbet.me", me); render(); toast(`Selam, ${nameOf(me)}!`); break;
    case "join":
      try {
        const r = await api({ type: "addMember", name: el.dataset.name });
        me = r.id; store.set("sohbet.me", me); render();
        toast(`Hoş geldin, ${el.dataset.name}!`);
      } catch (err) { toast(err.message); }
      break;
    case "switch":
      if (confirm(`You're ${nameOf(me)}. Switch to a different name?`)) { me = null; store.set("sohbet.me", null); render(); }
      break;
    case "week": sel = el.dataset.id; render(); break;
    case "more": { const k = el.dataset.k; expanded.has(k) ? expanded.delete(k) : expanded.add(k); render(); break; }
    case "claim": { const wk = S.state.weeks[el.dataset.week || sel]; topicSheet(wk); break; }
    case "editKonu": topicSheet(w, w.konu); break;
    case "unpresent":
      if (confirm("Remove this from past topics? Use this if you didn't actually present that week.")) {
        await act("releaseKonu", { weekId: el.dataset.week }).catch(() => {});
        closeSheet();
        toast("Removed — you can take an upcoming week again");
      }
      break;
    case "release":
      if (confirm("Give up this slot? It reopens for others.")) { await act("releaseKonu").catch(() => {}); toast("Slot reopened"); }
      break;
    case "decline":
      if (confirm("No problem — pass to the next person?")) { await act("answerAsk", { weekId: S.currentWeekId }).catch(() => {}); toast("Passed on — maybe next time!"); }
      break;
    case "hadis": hadisSheet(w); break;
    case "sohbet": sohbetSheet(w); break;
    case "host": hostSheet(w); break;
    case "rsvp": {
      const v = el.dataset.v;
      act("rsvp", { answer: rsvpOf(w)[me] === v ? null : v }).catch(() => {});
      break;
    }
    case "rota": rotaSheet(); break;
    case "hostYes": {
      const wk = el.closest(".hero") ? curWeek() : w;
      confirmHostSheet(wk);
      break;
    }
    case "hostSkip": {
      const wk = el.closest(".hero") ? curWeek() : w;
      if (confirm("Skip hosting this week? The next person in the yemek sırası will be asked.")) {
        await act("skipHost", { weekId: wk.id }).catch(() => {});
        toast("Okay — asking the next person");
      }
      break;
    }
    case "rotaEdit": rotaEditSheet(); break;
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

document.addEventListener("change", async (e) => {
  if (e.target.matches?.("[data-tq]")) { const t = $("#sheet-root input[name=time]"); if (t) t.value = e.target.value; return; }
  const el = e.target.closest("[data-change]");
  if (!el) return;
  if (el.dataset.change === "upload") { uploadAudio(el.dataset.week, el.files?.[0]); return; }
  if (el.dataset.change === "role") {
    await act("setRoles", { [el.dataset.role]: el.value || null }).catch(() => {});
    toast("Saved");
    return;
  }
  if (el.dataset.change === "defTime" && el.value) {
    await act("setSettings", { defaultTime: el.value }).catch(() => {});
    toast("Saved");
  }
});

document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-form]");
  if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  if (f.dataset.form === "join") {
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
  const h = hostOf(w);
  const place = weekPlace(w);
  const yes = Object.values(rsvpOf(w)).filter((v) => v === "yes").length;
  const lines = [`*Thursday Bros · ${fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" })}*`];
  if (w.cancelled) lines.push("No sohbet this week.");
  else {
    lines.push(`🏠 ${h ? nameOf(h.id) + " hosting" + (h.confirmed ? "" : " (to confirm)") : "Host?"} · 🕖 ${fmtTime(weekTime(w))}${place ? "\n📍 " + place + "\n" + gmaps(place) : ""}`);
    lines.push(`📖 Hadis: ${w.hadis ? (w.hadis.source || "posted") : "—"}`);
    lines.push(`💬 Sohbet: ${w.sohbet?.title || "—"}`);
    lines.push(`🎤 Sunum: ${w.konu ? `${w.konu.title} (${nameOf(w.konu.presenterId)})` : "Open — volunteer 👇"}`);
    lines.push(`✅ Geliyorum: ${yes} · tap to answer 👇`);
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

/* ---------- welcome hadith (once per visit) ---------- */
function showWelcomeHadith() {
  try { if (sessionStorage.getItem("tb.welcomed")) return; sessionStorage.setItem("tb.welcomed", "1"); } catch {}
  let last = -1; try { last = +(localStorage.getItem("tb.lastHadith") ?? -1); } catch {}
  let i = Math.floor(Math.random() * HADITHS.length);
  if (i === last) i = (i + 1) % HADITHS.length;
  try { localStorage.setItem("tb.lastHadith", String(i)); } catch {}
  const h = HADITHS[i];
  const el = document.createElement("div");
  el.className = "welcome";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Hadis");
  el.innerHTML = `<div class="welcome-card">
      <div class="welcome-mark">${logo()}</div>
      <div class="welcome-lbl">Hz. Peygamber (s.a.v.) buyurdu:</div>
      <blockquote class="welcome-q">${esc(h.t)}</blockquote>
      <div class="welcome-src">${esc(h.s)}</div>
      <button class="btn filled lg block" data-welcome>Bismillah</button>
    </div>`;
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 250); };
  el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-welcome]")) close(); });
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape" || e.key === "Enter") { close(); document.removeEventListener("keydown", k); } });
  document.body.appendChild(el);
  setTimeout(() => el.querySelector("[data-welcome]")?.focus(), 50);
}

/* ---------- boot ---------- */
(async () => {
  showWelcomeHadith();
  try {
    await api();
    if (!S.state.settings.tz) await api({ type: "init", tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    render();
  } catch (e) { showError(e.message); }
  setInterval(() => { if (!$("#sheet-root").innerHTML && document.visibilityState === "visible") refresh(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !$("#sheet-root").innerHTML) refresh(); });
})();
