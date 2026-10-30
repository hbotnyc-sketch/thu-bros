// Thursday Bros — single-page client. No framework: state → render() → event delegation.
import { HADITHS } from "./hadiths.js";
import { applyAction as demoApply, advance as demoAdvance, view as demoView } from "./core.mjs";

/* ---------- visitor preview mode (/?demo): live data, every action stays in this browser ---------- */
const DEMO = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("demo")) { sessionStorage.setItem("tb.demo", "1"); history.replaceState(null, "", location.pathname); }
    if (q.has("exitdemo")) { sessionStorage.removeItem("tb.demo"); history.replaceState(null, "", location.pathname); }
    return sessionStorage.getItem("tb.demo") === "1";
  } catch { return false; }
})();

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  // Visitor preview keeps its own sign-in separate from the real one
  get(k) { try { return DEMO ? sessionStorage.getItem("demo." + k) : localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { const st = DEMO ? sessionStorage : localStorage, key = DEMO ? "demo." + k : k; v == null ? st.removeItem(key) : st.setItem(key, v); } catch {} },
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
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
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
const fbName = (f) => (f.guest ? `${f.guest} (visitor)` : nameOf(f.by));
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
let demoState = null, demoDirty = false;
const cityOnly = (a) => { const p = String(a || "").split(",").map((x) => x.trim()).filter(Boolean); return p.length > 1 ? p.slice(1).join(", ") : p.length ? "(address hidden)" : ""; };
function demoMask(st) {
  st.members.forEach((m) => { m.phone = ""; if (m.address) m.address = cityOnly(m.address); });
  Object.values(st.weeks).forEach((w) => { if (w.place) w.place = cityOnly(w.place); if (w.hostNotes) w.hostNotes = "(host notes are hidden in the visitor preview)"; });
  return st;
}
async function demoApi(body) {
  if (!demoState || (!body && !demoDirty)) {
    const r = await fetch("/api"); const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Can't reach the server");
    skew = j.now - Date.now();
    demoState = demoMask(j.state);
  }
  const t = Date.now() + skew;
  let result = null;
  if (body) {
    const snapshot = structuredClone(demoState);
    try { demoAdvance(demoState, t); result = demoApply(demoState, body, t); demoAdvance(demoState, t); demoDirty = true; }
    catch (e) { demoState = snapshot; throw new Error(e.message); }
  } else demoAdvance(demoState, t);
  S = demoView(demoState, t);
  if (!sel || !S.state.weeks[sel] || sel < S.currentWeekId) sel = S.currentWeekId;
  return result;
}
async function api(body) {
  if (DEMO) return demoApi(body);
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
  if (document.querySelector("details.private[open]")) return; // don't wipe private notes being written
  const a = document.activeElement; // don't interrupt typing (e.g. archive search)
  if (a && $("#app").contains(a) && a.matches("input, textarea, select")) return;
  try { await api(); render(); refreshChatSummary(); } catch (e) { if (!S) showError(e.message); }
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
function openSheet({ title, lead = "", body, action = "Save", danger = "", back = "", cls = "", side = "" }, onSubmit) {
  sheetSubmit = onSubmit;
  $("#sheet-root").innerHTML = `<div class="scrim" data-a="close"></div>
    <form class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
      <div class="sheet-bar">
        ${back ? `<button type="button" class="icon-btn" data-a="${back}" aria-label="Back">${ic("back")}</button>` : `<button type="button" class="icon-btn" data-a="close" aria-label="Close">${ic("x")}</button>`}
        <h2>${title}</h2>
        ${side || (action ? `<button type="submit" class="btn filled" data-primary>${action}</button>` : `<button type="button" class="btn text" data-a="close">Done</button>`)}
      </div>
      <div class="sheet-body">${lead ? `<p class="lead">${lead}</p>` : ""}${body}
        ${danger ? `<div class="danger-zone">${danger}</div>` : ""}</div>
    </form>`;
  document.body.classList.add("locked");
  const f = $("#sheet-root form");
  f.querySelectorAll("input[data-addr]").forEach(addressAutocomplete);
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
/* ---------- address search (free: Photon / OpenStreetMap, no key) ---------- */
const ADDR_BIAS = { lat: 39.0, lon: -77.4 }; // Northern Virginia — results near here rank first
function fmtAddress(p) {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  const st = p.countrycode === "US" && US_STATES[p.state] ? US_STATES[p.state] : p.state;
  const city = p.city || p.town || p.village || p.district || p.county || "";
  return [line1, city, [st, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}
const US_STATES = { Virginia: "VA", Maryland: "MD", "District of Columbia": "DC", "West Virginia": "WV", Pennsylvania: "PA", Delaware: "DE", "New York": "NY", "New Jersey": "NJ", "North Carolina": "NC" };
function addressAutocomplete(input) {
  const wrap = document.createElement("div");
  wrap.className = "addr-ac";
  input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
  const list = document.createElement("ul");
  list.className = "addr-list"; list.setAttribute("role", "listbox"); list.hidden = true;
  wrap.appendChild(list);
  let timer, ctrl, items = [], active = -1;
  const hide = () => { list.hidden = true; active = -1; };
  const pick = (i) => { if (!items[i]) return; input.value = items[i]; hide(); input.dispatchEvent(new Event("change", { bubbles: true })); };
  const draw = () => {
    list.innerHTML = items.map((a, i) => `<li role="option" class="${i === active ? "on" : ""}" data-i="${i}">${ic("pin")}<span>${esc(a)}</span></li>`).join("")
      + `<li class="addr-attr">Address search © OpenStreetMap</li>`;
    list.hidden = !items.length;
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 4) { items = []; hide(); return; }
    timer = setTimeout(async () => {
      ctrl?.abort(); ctrl = new AbortController();
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=${ADDR_BIAS.lat}&lon=${ADDR_BIAS.lon}`, { signal: ctrl.signal });
        const j = await r.json();
        items = [...new Set((j.features || []).map((f) => fmtAddress(f.properties || {})).filter((a) => a.length > 6))];
        active = -1; draw();
      } catch {}
    }, 300);
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { active = Math.min(items.length - 1, active + 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { pick(active); e.preventDefault(); }
    else if (e.key === "Escape") { hide(); e.stopPropagation(); }
  });
  list.addEventListener("pointerdown", (e) => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
  input.addEventListener("blur", () => setTimeout(hide, 150));
}

function closeSheet() { stopChatPoll(); $("#sheet-root").innerHTML = ""; sheetSubmit = null; document.body.classList.remove("locked"); refreshChatSummary(); }
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
/** Time, address and notes are shown only once the host has confirmed them. */
const detailsReady = (w) => !!hostOf(w)?.confirmed;
const rsvpOf = (w) => w.rsvp || {};
const roleId = (r) => { const id = S.state.settings.roles?.[r]; return id && member(id) ? id : null; };
const feedbackUnread = () => roleId("feedback") === me
  ? (S.state.feedback || []).filter((f) => f.by !== me && f.at > (S.state.settings.feedbackSeenAt || 0)).length : 0;
const canEdit = (r) => !roleId(r) || roleId(r) === me;
const localToday = () => new Date().toLocaleDateString("en-CA", { timeZone: S.state.settings.tz || undefined });
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
  if (!me || !member(me)) { me = null; store.set("sohbet.me", null); return DEMO ? renderDemoWho() : renderWho(); }
  const w = W();
  $("#app").innerHTML = `
    <header class="topbar"><div class="topbar-in">
      <div class="brand">${logo()}<span class="wordmark">Thursday Bros</span>
        <button class="icon-btn refresh" data-a="reload" title="Refresh" aria-label="Refresh">${ic("refresh")}</button></div>
      <button class="icon-btn has-badge" data-a="chat" title="Chat" aria-label="Chat">${ic("chat")}${chatUnreadTotal() ? `<span class="badge-dot">${chatUnreadTotal()}</span>` : ""}</button>
      <button class="icon-btn has-badge" data-a="notifs" title="Notifications" aria-label="Notifications">${ic("bell")}${notifUnread() ? `<span class="badge-dot">${notifUnread()}</span>` : ""}</button>
      <button class="avatar" data-a="profile" title="${esc(nameOf(me))} — profile & my notes" style="background:hsl(${hue(me)} 55% 86%);color:hsl(${hue(me)} 45% 22%)">${esc(initials(me))}</button>
    </div></header>
    <main class="wrap">
      ${DEMO ? demoBar() : installBar()}
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
      <div class="foot">
        <button class="btn outlined" data-a="feedback">${ic("chat")} Send feedback & ideas${(S.state.feedback || []).length ? ` <span class="muted small">· ${(S.state.feedback || []).length}</span>` : ""}</button>
        <p class="foot-note">Selam, ${esc(nameOf(me))} · Allah kabul etsin</p>
      </div>
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
    return `<section class="hero quiet"><div class="quiet-row">
      ${avatar(w.ask.memberId, "sm")}
      <div class="grow">No volunteer for sunum yet — asking <b>${esc(who?.name)}</b> · ${left(remain)} left</div>
      <button type="button" class="btn text" data-a="personShare" data-id="${w.ask.memberId}" data-kind="sunum">${ic("chat")} Nudge</button>
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
      `<span class="tick ${h?.confirmed ? "on" : ""}" title="${h?.confirmed ? "Host confirmed" : "Host not confirmed yet"}">${ic("check")}</span><span class="dot ${w.konu ? "full" : ""}" title="${w.konu ? "Sunum taken" : "Sunum still open"}"></span>
       <span class="wk-host">${h ? esc(nameOf(h.id)) : "Host?"}</span>`;
    return `<button class="wk ${id === sel ? "sel" : ""}" data-a="week" data-id="${id}">
      <small>${label}</small><b>${fmtDate(id, { month: "short", day: "numeric" })}</b><span class="dots">${sub}</span></button>`;
  }).join("")}</nav>`;
}

function renderWeekHead(w) {
  const place = weekPlace(w);
  return `<div class="week-head"><div style="flex:1;min-width:0">
      <h1>${fmtDate(w.id, { weekday: "long", month: "short", day: "numeric" })}</h1>
      <div class="meta">${w.cancelled ? "" : detailsReady(w) ? `
        <span>${ic("clock")}${esc(fmtTime(weekTime(w)))}</span>
        ${place ? `<a class="meta-link" href="${gmaps(place)}" target="_blank" rel="noopener">${ic("pin")}${esc(place)}</a>` : ""}`
        : `<span>${ic("clock")}Time & place once the host confirms</span>`}
      </div></div>
    <div class="wh-actions"><button class="icon-btn" data-a="share" title="Share this week" aria-label="Share this week">${ic("share")}</button>
    <button class="btn text small" data-a="cancel">${w.cancelled ? "Restore week" : "Cancel week"}</button></div>
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
      ${h.notes ? `<div class="notes-box"><div class="lbl">Discussion notes</div>${clampBlock("h" + w.id, h.notes)}
        ${owner === me ? `<button class="btn text small move-priv" data-a="toPrivate" data-part="hadis" data-week="${w.id}">${ic("lock")} Move to My notes</button>` : ""}</div>` : ""}`
    : edit ? `${sampleHadis()}<button class="btn tonal" data-a="hadis">${ic("plus")} Add hadis</button>`
    : `<p class="empty" style="margin:0">${esc(nameOf(owner))} will post this week's hadis here.</p>`}
    ${owner === me ? privateBox(w, "hadis") : ""}
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
      ${so.notes ? `<div class="notes-box"><div class="lbl">Notes · skim before sohbet</div>${clampBlock("s" + w.id, so.notes)}
        ${owner === me ? `<button class="btn text small move-priv" data-a="toPrivate" data-part="sohbet" data-week="${w.id}">${ic("lock")} Move to My notes</button>` : ""}</div>` : ""}
      ${so.link ? `<div class="actions"><a class="btn outlined" href="${esc(so.link)}" target="_blank" rel="noopener">${ic("link")} Open link</a></div>` : ""}`
    : edit ? `${sampleSohbet()}<button class="btn tonal" data-a="sohbet">${ic("plus")} Add sohbet topic</button>`
    : `<p class="empty" style="margin:0">${esc(nameOf(owner))} will share the sohbet topic and notes here before Thursday.</p>`}
    ${owner === me ? privateBox(w, "sohbet") : ""}
  </section>`;
}

/** 🔒 Private notes box — only rendered for the person running that part. */
function privateBox(w, part) {
  return `<details class="private" data-priv="${part}" data-week="${w.id}">
    <summary>${ic("lock")} My notes <span class="muted small">· only you can see these</span></summary>
    <div class="priv-body"><textarea rows="6" maxlength="20000" placeholder="Your own prep: reminders, points you want to make, questions to ask…"></textarea>
    <div class="row" style="justify-content:space-between;margin-top:8px"><span class="small muted priv-status"></span>
    <button type="button" class="btn tonal small" data-a="privSave">Save</button></div></div></details>`;
}
document.addEventListener("toggle", async (e) => {
  const d = e.target;
  if (!d.matches?.("details.private") || !d.open || d.dataset.loaded) return;
  const ta = d.querySelector("textarea"), st = d.querySelector(".priv-status");
  st.textContent = "Loading…";
  try {
    const j = await apiX(`/api/private?week=${d.dataset.week}&part=${d.dataset.priv}&actor=${me}`);
    ta.value = j.text; d.dataset.loaded = "1"; st.textContent = j.text ? "" : "Nothing yet";
  } catch (err) { st.textContent = err.message; }
}, true);

document.addEventListener("input", (e) => { const d = e.target.closest?.("details.private"); if (d) { d.dataset.dirty = "1"; d.querySelector(".priv-status").textContent = "Not saved yet"; } });
document.addEventListener("focusout", (e) => {
  const d = e.target.closest?.("details.private");
  if (d?.dataset.dirty && e.target.matches("textarea")) { delete d.dataset.dirty; d.querySelector("[data-a=privSave]")?.click(); }
});

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
      <div class="sub">${mine ? "You're presenting" : k.via === "queue" ? "Stepped up from the queue" : "Volunteered"} · jazakallah</div></div></div>
    <p class="title">${esc(k.title)}</p>
    <div class="chips" style="margin-bottom:6px"><span class="chip on">${esc(typeLabel(k.topicType))}</span></div>
    ${k.summary ? `<p class="notes" style="margin-top:8px">${esc(k.summary)}</p>` : ""}
    ${k.notes ? `<div class="notes-box"><div class="lbl">Prep notes · skim before sohbet</div>${clampBlock("k" + w.id, k.notes)}
      ${mine ? `<button class="btn text small move-priv" data-a="toPrivate" data-part="sunum" data-week="${w.id}">${ic("lock")} Move to My notes</button>` : ""}</div>` : ""}
    ${k.link ? `<div class="actions"><a class="btn outlined" href="${esc(k.link)}" target="_blank" rel="noopener">${ic("link")} See the sunum resources</a></div>` : ""}
    ${mine ? `<div class="row actions">
      ${!k.notes ? `<button class="btn tonal" data-a="editKonu">${ic("plus")} Add notes for everyone</button>` : ""}
      <span class="spacer"></span><button class="btn text danger" data-a="release">Give up slot</button></div>
      ${privateBox(w, "sunum")}` : ""}
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
    ? `<button type="button" class="btn text small" data-a="personShare" data-id="${h.id}" data-kind="host">${ic("chat")} Remind</button>` : "";
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
    ${h?.confirmed && !w.cancelled ? `<div class="addr">${ic("clock")}<div><div class="addr-t">${esc(fmtDate(w.id, { weekday: "long" }))}, ${esc(fmtTime(weekTime(w)))}</div></div></div>` : ""}
    ${place && h?.confirmed ? `<div class="addr">${ic("pin")}<div style="flex:1;min-width:0"><div class="addr-t">${esc(place)}</div>
        <div class="row" style="margin-top:8px"><a class="btn outlined small" href="${gmaps(place)}" target="_blank" rel="noopener">Google Maps</a><a class="btn outlined small" href="${amaps(place)}" target="_blank" rel="noopener">Apple Maps</a></div></div></div>` : ""}
    ${w.hostNotes && h?.confirmed ? `<div class="notes-box" style="margin-top:0;margin-bottom:12px"><div class="lbl">Notes from host</div><div class="notes">${esc(w.hostNotes)}</div></div>` : ""}
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
    <button class="btn text small my-nb" data-a="profile" data-week="${w.id}">${ic("lock")} My personal notes</button>
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
    <label class="field"><span>Address <i>blank = host's saved address</i></span><input type="text" name="place" maxlength="200" value="${esc(w.place)}" placeholder="${esc(member(hostOf(w)?.id)?.address || "Start typing an address…")}" autocomplete="off" data-addr /></label>
    <label class="field"><span>Time</span><input type="time" name="time" value="${esc(weekTime(w))}" /></label>
    <label class="field"><span>Notes <i>optional</i></span><textarea name="hostNotes" rows="3" maxlength="1000" placeholder="e.g. Parking on the street, dinner after sohbet">${esc(w.hostNotes)}</textarea></label>`,
    danger: `<button type="submit" class="btn text danger" name="_reset" value="1">${ic("trash")} Reset hosting for this week</button>
      <p class="hint">Clears the confirmation, skips, address, time and notes, so the host from the yemek sırası is asked again.</p>`,
  }, async (f, submitter) => {
    if (submitter?.name === "_reset") {
      if (!confirm("Reset hosting for this week?")) throw 0;
      await act("resetHost", { weekId: w.id }); toast("Hosting reset"); return;
    }
    await act("setHost", { weekId: w.id, ...f }); toast("Saved");
  });
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
    <label class="field"><span>Address</span><input type="text" name="place" maxlength="200" value="${esc(w.place || mine?.address || "")}" placeholder="Start typing your address…" autocomplete="off" data-addr />
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

async function profileSheet(focusWeek) {
  const m = member(me);
  let notes = {};
  try { notes = (await apiX(`/api/mynotes?actor=${me}`)).notes || {}; } catch (e) { toast(e.message); }
  const wk = focusWeek || S.currentWeekId;
  const past = Object.keys(notes).filter((id) => id !== wk).sort().reverse();
  const noteBox = (id, open) => `<details class="nb" data-week="${id}" ${open ? "open" : ""}>
      <summary><span class="d">${esc(fmtDate(id, { weekday: "short", month: "short", day: "numeric", year: id.slice(0, 4) !== String(new Date().getFullYear()) ? "numeric" : undefined }))}</span>
        <span class="small muted p">${esc(S.state.weeks[id] ? weekTitle(S.state.weeks[id]) : "")}</span></summary>
      <textarea data-nb="${id}" rows="${open ? 9 : 6}" maxlength="20000" placeholder="Write anything: what stuck with you, ayetler, questions, dua…">${esc(notes[id] || "")}</textarea>
      <div class="small muted nb-status" data-for="${id}"></div></details>`;
  openSheet({
    title: "Profile",
    action: null,
    body: `
    <div class="prof">${avatar(me, "lg")}<div><div class="who" style="font-size:18px;font-weight:500">${esc(m.name)}</div>
      <div class="small muted">${m.phone ? esc(m.phone) : "No WhatsApp number"}${m.address ? " · " + esc(m.address) : ""}</div></div></div>

    ${roleId("feedback") === me && !DEMO ? `<button type="button" class="btn filled block" data-a="stats" style="margin:6px 0 8px">📊 Site stats · who joined</button>
      <button type="button" class="btn tonal block" data-a="demoLink" style="margin:0 0 8px">👀 Visitor preview link (for other groups)</button>` : ""}
    ${roleId("feedback") === me ? `<button type="button" class="btn ${feedbackUnread() ? "filled" : "tonal"} block" data-a="feedback" style="margin:6px 0 4px">${ic("chat")} Feedback${feedbackUnread() ? ` · ${feedbackUnread()} new` : ""}</button>` : ""}
    <div class="section-lbl">${ic("lock")} My notes <span class="muted" style="font-weight:400">· only you can see these</span></div>
    ${noteBox(wk, true)}
    ${past.length ? `<div class="section-lbl" style="margin-top:18px">Earlier</div>${past.map((id) => noteBox(id, false)).join("")}` : ""}

    <div class="section-lbl" style="margin-top:22px">My details</div>
    <label class="field"><span>WhatsApp number</span><input type="tel" id="pf-phone" value="${esc(m.phone)}" placeholder="+1 555 123 4567" /></label>
    <label class="field"><span>Home address <i>for hosting</i></span><input type="text" id="pf-addr" value="${esc(m.address)}" placeholder="Start typing your address…" autocomplete="off" data-addr /></label>
    <div class="row" style="justify-content:space-between">
      <button type="button" class="btn tonal" data-a="pfSave">Save details</button>
      <button type="button" class="btn text" data-a="switch">Switch user</button>
    </div>
    <button type="button" class="btn outlined block" data-a="members" style="margin-top:14px">${ic("users")} Members, queue & settings</button>
    ${isStandalone() ? "" : `<button type="button" class="btn text block" data-a="installSheet" style="margin-top:6px">📲 Add to home screen</button>`}`,
  });
}
const nbTimers = {};
async function saveNote(id, text) {
  const st = document.querySelector(`.nb-status[data-for="${id}"]`);
  if (st) st.textContent = "Saving…";
  try {
    await apiX(`/api/mynotes?actor=${me}&week=${id}`, { method: "POST", body: text });
    if (st) st.textContent = "Saved ✓";
  } catch (e) { if (st) st.textContent = e.message; }
}
document.addEventListener("input", (e) => {
  const id = e.target.dataset?.nb; if (!id) return;
  const st = document.querySelector(`.nb-status[data-for="${id}"]`); if (st) st.textContent = "…";
  clearTimeout(nbTimers[id]);
  nbTimers[id] = setTimeout(() => saveNote(id, e.target.value), 1200);
});

const ago = (t) => {
  const d = (now() - t) / 1000;
  if (d < 60) return "just now"; if (d < 3600) return `${Math.floor(d / 60)}m ago`; if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
function feedbackSheet() {
  const list = S.state.feedback || [];
  const owner = roleId("feedback"), isOwner = owner === me, seen = S.state.settings.feedbackSeenAt || 0;
  openSheet({
    title: "Feedback & ideas",
    action: "Post",
    lead: `Ideas to improve the site or the sohbet? Everyone can see posts here${owner ? `; ${esc(nameOf(owner))} gets notified` : ""}.`,
    body: `
    ${DEMO ? `<p class="hint" style="margin:0 0 10px">Your feedback is sent for real to the Thursday Bros team, even in the preview.</p>
      <label class="field"><span>Your name</span><input type="text" name="guest" maxlength="40" value="${esc(store.get("guestName") || "")}" placeholder="e.g. Yusuf (Baltimore)" /></label>` : ""}
    <label class="field"><span>Your feedback</span><textarea name="text" rows="3" maxlength="2000" placeholder="${DEMO ? "What did you like? What would make it useful for your group?" : "e.g. Could we add a reminder the night before?"}"></textarea></label>
    ${list.length ? `<ul class="fb-list">${list.map((f) => `<li class="${isOwner && f.by !== me && f.at > seen ? "new" : ""}">
        ${f.guest ? `<span class="avatar sm guest">${esc((f.guest[0] || "V").toUpperCase())}</span>` : avatar(f.by, "sm")}<div class="grow">
          <div class="fb-h"><b>${esc(fbName(f))}</b> <span class="muted small">· ${ago(f.at)}</span>${isOwner && f.by !== me && f.at > seen ? ' <span class="chip on fb-new">new</span>' : ""}</div>
          <div class="fb-t">${esc(f.text)}</div>
          <div class="fb-a">
            <button type="button" class="fb-like ${f.likes.includes(me) ? "on" : ""}" data-a="fbLike" data-id="${f.id}" aria-pressed="${f.likes.includes(me)}">👍 ${f.likes.length || ""}</button>
            ${f.by === me || isOwner ? `<button type="button" class="btn text small danger" data-a="fbDel" data-id="${f.id}">Delete</button>` : ""}
          </div></div></li>`).join("")}</ul>` : `<p class="muted">No feedback yet — be the first!</p>`}`,
  }, async (fm) => {
    if (!fm.text?.trim()) { toast("Write something first"); throw 0; }
    if (DEMO) {
      const guest = (fm.guest || store.get("guestName") || "").trim() || "Visitor";
      store.set("guestName", guest);
      const r = await fetch("/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "postGuestFeedback", guest, text: fm.text }) });
      if (!r.ok) { toast("Couldn't send, try again"); throw 0; }
      demoState.feedback ||= []; demoState.feedback.unshift({ id: "local" + Date.now(), by: null, guest, text: fm.text.trim(), at: Date.now(), likes: [] });
      S = demoView(demoState, Date.now() + skew); render();
      toast("Thank you! Your feedback was sent 🙏");
      setTimeout(feedbackSheet, 0);
      return;
    }
    await act("postFeedback", { text: fm.text });
    toast("Thanks — posted!");
    setTimeout(feedbackSheet, 0);
  });
  if (isOwner && list.some((f) => f.by !== me && f.at > seen)) act("seenFeedback").then(() => {}).catch(() => {});
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
    <div class="setting"><div>Feedback inbox<div class="small muted">Gets a badge when someone posts feedback</div></div>
      <select data-change="role" data-role="feedback" style="width:auto;max-width:46%" aria-label="Feedback inbox">${roleOptions("feedback")}</select></div>
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
    title: `Edit ${esc(m.name)}`,
    body: `
    <label class="field"><span>Name</span><input type="text" name="name" maxlength="40" value="${esc(m.name)}" /></label>
    <label class="field"><span>WhatsApp number</span><input type="tel" name="phone" value="${esc(m.phone)}" placeholder="+1 555 123 4567" />
      <div class="hint">Used for the one-tap nudge when the queue asks them.</div></label>
    <label class="field"><span>Home address <i>for hosting</i></span><input type="text" name="address" maxlength="200" value="${esc(m.address)}" placeholder="Start typing an address…" autocomplete="off" data-addr /></label>`,
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
const demoLocal = { notes: {}, priv: {}, chat: [] };
function demoX(path, opts) {
  const u = new URL(path, location.origin), r = u.pathname.replace("/api/", ""), post = (opts.method || "GET") !== "GET";
  const ok = (x) => Promise.resolve(x);
  if (r === "recap" && !post) // archive notes are visible (live); transcripts & recordings stay private
    return fetch(path).then((x) => x.json()).then((j) => ({ ...j, transcript: "", audio: [], aiEnabled: false }));
  if (r === "mynotes") { if (post) { demoLocal.notes[u.searchParams.get("week")] = opts.body; return ok({ ok: true }); } return ok({ notes: { ...demoLocal.notes } }); }
  if (r === "private") { const k = u.searchParams.get("week") + u.searchParams.get("part"); if (post) { demoLocal.priv[k] = opts.body; return ok({ ok: true }); } return ok({ text: demoLocal.priv[k] || "" }); }
  if (r === "chat/summary") return ok({ unread: {}, last: [] });
  if (r === "chat") {
    if (post) { const m = { id: demoLocal.chat.length + 1, sender: me, body: opts.body, at: Date.now() }; demoLocal.chat.push(m); return ok({ message: m }); }
    const after = +u.searchParams.get("after") || 0; return ok({ messages: demoLocal.chat.filter((m) => m.id > after) });
  }
  if (r === "transcript" || r === "audio") return ok({ ok: true, stored: false });
  if (r === "recap" && post) return Promise.reject(new Error("Visitor preview: notes aren't saved"));
  if (r === "transcribe" || r === "summarize") return Promise.reject(new Error("Visitor preview: AI is turned off here"));
  if (r === "stats") return Promise.reject(new Error("Stats are only for the admin"));
  return ok({});
}
async function apiX(path, opts = {}) {
  if (DEMO) { const d = demoX(path, opts); if (d) return d; }
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
    const happened = w.id <= localToday();
    const going = happened ? Object.entries(w.rsvp || {}).filter(([, v]) => v === "yes").map(([k]) => k) : [];
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
      <div class="field"><span>Who came ${happened ? "" : `<i>fill in after the sohbet</i>`}</span><div class="seg att">${sorted.map((m) => `<label><input type="checkbox" name="att" value="${m.id}" ${att.has(m.id) ? "checked" : ""}/><span>${esc(m.name)}</span></label>`).join("")}</div></div>`,
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

/* ---------- visit tracking (anonymous id until a name is picked) ---------- */
function visitorId() {
  try {
    let v = localStorage.getItem("tb.vid");
    if (!v) { v = (crypto.randomUUID?.() || String(Math.random())).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24); localStorage.setItem("tb.vid", v); }
    return v;
  } catch { return "anon" + Math.random().toString(36).slice(2, 10); }
}
function trackVisit() {
  try { if (sessionStorage.getItem("tb.visit") === (me || "-")) return; sessionStorage.setItem("tb.visit", me || "-"); } catch {}
  fetch(`/api/visit?vid=${visitorId()}&actor=${DEMO ? "" : me || ""}${DEMO ? "&demo=1" : ""}`, { method: "POST" }).catch(() => {});
}

/* ---------- personal links ---------- */
const inviteCache = {};
async function personalLink(id) {
  if (!inviteCache[id]) {
    const r = await api({ type: "inviteToken", actor: me, id }); // doesn't need a re-render
    inviteCache[id] = `${location.origin}/?i=${r.token}`;
  }
  return inviteCache[id];
}
/* Share texts: Turkish, English letters only, short and personal */
const ascii = (t) => String(t)
  .replace(/[çÇ]/g, (c) => (c === "ç" ? "c" : "C")).replace(/[ğĞ]/g, (c) => (c === "ğ" ? "g" : "G"))
  .replace(/ı/g, "i").replace(/İ/g, "I").replace(/[öÖ]/g, (c) => (c === "ö" ? "o" : "O"))
  .replace(/[şŞ]/g, (c) => (c === "ş" ? "s" : "S")).replace(/[üÜ]/g, (c) => (c === "ü" ? "u" : "U"))
  .normalize("NFD").replace(/[̀-ͯ]/g, "");
const AYLAR = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
const trDay = (id) => { const [, m, d] = id.split("-").map(Number); return `${d} ${AYLAR[m - 1]}`; };
const hhmm = (t) => (/^\d{1,2}:\d{2}$/.test(t || "") ? t.padStart(5, "0") : t || "");
const firstName = (full) => { const w = String(full || "").trim().split(/\s+/); return (w[0]?.endsWith(".") && w[1]) ? w[1] : w[0] || ""; };
function personTemplates(id, link) {
  const n = ascii(firstName(member(id)?.name));
  const cw = curWeek(), gun = `bu Persembe (${trDay(cw.id)})`, h = hostOf(cw);
  const t = [
    { k: "invite", label: "Invite", text: `Selam ${n}, Persembe sohbetleri icin kucuk bir sayfa actik. Hadis, sohbet, sunum ve yemek sirasi hep orada. Link sana ozel, tiklayinca direkt giris yapiyorsun: ${link}` },
    { k: "host", label: "Hosting", text: `Selam ${n}, ${gun} yemek sirasi sende insallah. Musaitsen buradan onaylayip adresi ve saati yazar misin? ${link}` },
    { k: "rsvp", label: "Geliyorum", text: `Selam ${n}, ${gun} geliyor musun? Buradan bir tikla isaretlersen sayiyi bilelim: ${link}` },
    { k: "sunum", label: "Sunum", text: `Selam ${n}, ${gun} 10-15 dakikalik kisa bir sunum yapmak ister misin? Konuyu buradan secebilirsin: ${link}` },
  ];
  return t.map((x) => ({ ...x, text: ascii(x.text), suggested: x.k === "host" ? h?.id === id && !h.confirmed : false }));
}
async function personSheet(id, kind) {
  let link; try { link = await personalLink(id); } catch (e) { return toast(e.message); }
  const m = member(id), list = personTemplates(id, link);
  const cur = kind || (list.find((x) => x.suggested)?.k) || "invite";
  openSheet({
    title: `Send to ${esc(m.name)}`, action: null,
    lead: `A personal link: it opens the site already signed in as ${esc(m.name)} (after a quick “Are you ${esc(m.name)}?”).`,
    body: `
    <div class="seg tabs">${list.map((x) => `<label><input type="radio" name="pt" value="${x.k}" ${x.k === cur ? "checked" : ""} data-pt="${id}" /><span>${x.label}${x.suggested ? " ★" : ""}</span></label>`).join("")}</div>
    <textarea id="pt-text" rows="6">${esc(list.find((x) => x.k === cur).text)}</textarea>
    <div class="share-btns">
      <a class="btn filled lg" id="pt-wa" target="_blank" rel="noopener" href="${waLink(m.phone, list.find((x) => x.k === cur).text)}">${ic("chat")} WhatsApp${m.phone ? ` ${esc(m.name)}` : ""}</a>
      ${navigator.share ? `<button type="button" class="btn tonal lg" data-a="ptShare">${ic("share")} Share…</button>` : ""}
      <button type="button" class="btn outlined lg" data-a="ptCopy" data-link="${link}">${ic("link")} Copy link</button>
    </div>
    ${m.phone ? "" : `<p class="hint">No WhatsApp number saved for ${esc(m.name)}, so WhatsApp will ask who to send it to. Add it in their profile to skip that.</p>`}
    <p class="hint">Anyone with this link can sign in as ${esc(m.name)}, so send it only to them.</p>`,
  });
  const ta = $("#pt-text"), wa = $("#pt-wa");
  ta.addEventListener("input", () => { wa.href = waLink(m.phone, ta.value); });
}
function sendToSheet() {
  const people = [...members()].filter((m) => m.id !== me).sort((a, b) => a.name.localeCompare(b.name));
  openSheet({
    title: "Share", action: null,
    body: `
    <button type="button" class="btn tonal lg block" data-a="shareGroup">${ic("share")} Share this week with the group</button>
    <div class="section-lbl">Or send a personal link to one person</div>
    <div class="picker-box">${ic("search")}<input type="search" id="pp-q" placeholder="Search people" autocomplete="off" /></div>
    <ul class="picker-list" id="pp-list">${people.map((m) => `<li><button type="button" data-a="personShare" data-id="${m.id}" data-n="${esc(fold(m.name))}">${avatar(m.id, "sm")}<span>${esc(m.name)}</span></button></li>`).join("")}</ul>`,
  });
  $("#pp-q").addEventListener("input", (e) => {
    const t = fold(e.target.value.trim());
    document.querySelectorAll("#pp-list button").forEach((b) => { b.parentElement.hidden = t && !b.dataset.n.includes(t); });
  });
}

/* opening someone's personal link: /?i=<token> */
async function handleInviteLink() {
  const tok = new URLSearchParams(location.search).get("i");
  if (!tok) return;
  const clean = () => history.replaceState(null, "", location.pathname);
  let who; try { who = await apiX(`/api/invite?i=${encodeURIComponent(tok)}`); } catch (e) { clean(); return toast(e.message); }
  if (me === who.id) return clean();
  const el = document.createElement("div");
  el.className = "welcome claim";
  el.innerHTML = `<div class="welcome-card">
    <div class="welcome-mark">${logo()}</div>
    <div class="welcome-lbl">Thursday Bros</div>
    <h2 class="claim-q">Are you ${esc(who.name)}?</h2>
    <p class="muted" style="margin:0 0 20px">This link was made for ${esc(who.name)}. Tap yes and this phone will remember you.</p>
    <button class="btn filled lg block" data-claim="yes">Yes, I'm ${esc(who.name)}</button>
    <button class="btn text block" data-claim="no" style="margin-top:6px">No, I'm someone else</button></div>`;
  document.body.appendChild(el);
  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-claim]")?.dataset.claim; if (!c) return;
    el.remove(); clean();
    if (c === "yes") {
      me = who.id; store.set("sohbet.me", me);
      try { sessionStorage.removeItem("tb.visit"); } catch {}
      render(); trackVisit(); refreshChatSummary(); toast(`Selam, ${who.name}!`); showWelcomeHadith();
    }
  });
}

/* ---------- site stats (admin) ---------- */
async function statsSheet() {
  let d; try { d = await apiX(`/api/stats?actor=${me}`); } catch (e) { return toast(e.message); }
  const byDay = Object.fromEntries(d.days.map((x) => [x.day, x]));
  const days = []; for (let i = 13; i >= 0; i--) { const t = new Date(d.today + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - i); days.push(t.toISOString().slice(0, 10)); }
  const max = Math.max(1, ...d.days.map((x) => x.people));
  const today = byDay[d.today] || { people: 0, opens: 0, named: 0 };
  const joined = d.members.filter((m) => m.active).sort((a, b) => (b.last_at || 0) - (a.last_at || 0));
  const notYet = d.members.filter((m) => !m.active).sort((a, b) => a.name.localeCompare(b.name));
  const invite = (m) => waLink(m.phone, `Selam ${m.name}! Our Thursday Bros page is up: hadis, sohbet, sunum, host & chat in one place. Open it and pick your name 👉 ${location.origin}`);
  openSheet({
    title: "Site stats", action: null,
    lead: `Only you can see this. Tracking since ${esc(fmtDate(d.trackingSince, { month: "short", day: "numeric" }))}.`,
    body: `
    <div class="kpis">
      <div><b>${today.people}</b><span>people today</span></div>
      <div><b>${today.opens}</b><span>opens today</span></div>
      <div><b>${joined.length}<small>/${d.members.length}</small></b><span>members joined</span></div>
      <div><b>${d.totals.visitors}</b><span>devices total</span></div>
    </div>
    ${d.demoTotal ? `<p class="small muted" style="margin:-4px 0 6px">👀 Visitor preview: ${d.demoToday} today · ${d.demoTotal} total</p>` : ""}
    ${d.anonToday ? `<p class="small muted" style="margin:-4px 0 12px">${d.anonToday} visitor${d.anonToday > 1 ? "s" : ""} today opened the site but haven't picked a name yet.</p>` : ""}
    <div class="section-lbl">People per day · last 14 days</div>
    <div class="bars">${days.map((id) => { const x = byDay[id]; const n = x?.people || 0;
      return `<div class="bar" title="${id}: ${n} people, ${x?.opens || 0} opens"><span class="n">${n || ""}</span><i style="height:${(n / max) * 100}%"></i><span class="d">${new Date(id + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "narrow" })}</span></div>`; }).join("")}</div>

    <div class="section-lbl">Joined · ${joined.length}</div>
    <ul class="list stat-list">${joined.map((m) => `<li>${avatar(m.id, "sm")}<div class="grow">${esc(m.name)}
      <div class="small muted">${m.last_at ? `last on ${ago(m.last_at)} · ${m.opens} open${m.opens > 1 ? "s" : ""}${m.device ? " · " + esc(m.device) : ""}` : "active before tracking started"}</div></div>
      <span class="ok-dot">${ic("check")}</span></li>`).join("") || `<li class="muted small">No one yet.</li>`}</ul>

    <div class="section-lbl">Not joined yet · ${notYet.length}</div>
    <ul class="list stat-list">${notYet.map((m) => `<li>${avatar(m.id, "sm")}<div class="grow">${esc(m.name)}${m.phone ? "" : ` <span class="small muted">· no number</span>`}</div>
      <button type="button" class="btn text small" data-a="personShare" data-id="${m.id}" data-kind="invite">${ic("chat")} Invite</button></li>`).join("") || `<li class="muted small">Everyone's in 🎉</li>`}</ul>`,
  });
}

/* ---------- add to home screen ---------- */
let installEvt = null; // Android/desktop Chrome can install directly
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (S && me) render(); });
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
const platform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return /CriOS/.test(ua) ? "ios-chrome" : "ios-safari";
  if (/Android/.test(ua)) return "android";
  return "desktop";
};
function installBar() {
  if (isStandalone()) return "";
  try { if (localStorage.getItem("tb.installDismissed")) return ""; } catch {}
  return `<div class="install-bar" role="button" tabindex="0" data-a="installHow" aria-label="Add Thursday Bros to your home screen — how">
    <span class="ib-ic">${logo()}</span>
    <span class="grow"><b>Add Thursday Bros to your home screen</b><span class="small muted">Opens like an app, one tap away</span></span>
    <button class="btn filled small" data-a="installHow">${installEvt ? "Install" : "How?"}</button>
    <button class="icon-btn" data-a="installHide" aria-label="Dismiss">${ic("x")}</button></div>`;
}
const SHARE_IOS = `<svg class="ic inl" viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>`;
const INSTALL_STEPS = {
  "ios-safari": { label: "iPhone · Safari", steps: [
    `Open <b>${location.host}</b> in <b>Safari</b>.`,
    `Tap the <b>Share</b> button ${SHARE_IOS} at the bottom of the screen (on iPad: top right).`,
    `Scroll down and tap <b>Add to Home Screen</b>.`,
    `Keep the name <b>Thursday Bros</b> (or edit it).`,
    `Tap <b>Add</b> in the top-right corner. The TB icon appears with your apps.`] },
  "ios-chrome": { label: "iPhone · Chrome", steps: [
    `Open the <b>Google Chrome</b> app and go to <b>${location.host}</b>.`,
    `Tap the <b>Share</b> button ${SHARE_IOS} to the right of the address bar.`,
    `Scroll down and select <b>Add to Home Screen</b>.`,
    `Edit the name if you like.`,
    `Tap <b>Add</b> in the top corner to place it on your home screen.`] },
  "android": { label: "Android · Chrome", steps: [
    `Open <b>${location.host}</b> in <b>Chrome</b>.`,
    `Tap the <b>⋮</b> menu at the top right.`,
    `Tap <b>Add to Home screen</b> (or <b>Install app</b>).`,
    `Tap <b>Install</b> / <b>Add</b>. The TB icon appears with your apps.`] },
};
function installSheet(tab) {
  const cur = tab || (platform() === "desktop" ? "ios-safari" : platform());
  openSheet({
    title: "Add to home screen", action: null,
    lead: "Save Thursday Bros next to your apps. It opens full-screen, like a real app.",
    body: `
    ${installEvt ? `<button type="button" class="btn filled lg block" data-a="installNow" style="margin-bottom:16px">${ic("plus")} Install now</button>` : ""}
    <div class="seg tabs">${Object.entries(INSTALL_STEPS).map(([k, v]) => `<label><input type="radio" name="it" value="${k}" ${k === cur ? "checked" : ""} data-it /><span>${v.label}</span></label>`).join("")}</div>
    <ol class="steps">${INSTALL_STEPS[cur].steps.map((x) => `<li>${x}</li>`).join("")}</ol>
    ${platform() === cur ? `<p class="hint">↑ These are the steps for the browser you're using now.</p>` : ""}`,
  });
}

/* ---------- visitor preview UI ---------- */
function demoBar() {
  return `<div class="demo-bar"><span class="grow"><b>👀 Visitor preview</b><span class="small">Live data · try anything, nothing is saved to the real site</span></span>
    <button class="btn filled small" data-a="feedback">Feedback</button><button class="btn text small" data-a="demoExit">Exit</button></div>`;
}
function renderDemoWho() {
  const list = [...members()].sort((a, b) => a.name.localeCompare(b.name));
  $("#app").innerHTML = `<main class="who-page">
    <div class="logo">${logo()}</div>
    <h1>Visitor preview</h1>
    <div class="who-brand">Thursday Bros · weekly sohbet</div>
    <p>You're seeing our real, live page. Tap and try anything: Geliyorum, hosting, sunum… it only changes on your screen, never on the real site. We'd love your feedback!</p>
    <label class="field"><span>Your name <i>so we know who left feedback</i></span><input type="text" id="demo-name" maxlength="40" placeholder="e.g. Yusuf (Baltimore)" /></label>
    <button class="btn filled lg block" data-a="demoGuest">Look around as a guest</button>
    <div class="divider" style="margin-top:22px">or see it through a member's eyes</div>
    <div class="name-grid">${list.map((m) => `<button data-a="demoAs" data-id="${m.id}">${avatar(m.id, "sm")}${esc(m.name)}</button>`).join("")}</div>
    <p class="small muted">Chat, private notes, phone numbers and full addresses are hidden in the preview.</p></main>`;
}

/* ---------- notifications ---------- */
const myEvents = () => (S.state.events || []).filter((e) => (!e.to || e.to === me) && (e.guest || e.by !== me) && (e.guest || !e.by || member(e.by) || e.type === "sunumAsk"));
const notifUnread = () => { const seen = member(me)?.notifSeenAt || 0; return myEvents().filter((e) => e.at > seen).length; };
function notifLine(e) {
  const who = `<b>${esc(e.guest ? `${e.guest} (visitor)` : nameOf(e.by))}</b>`, day = e.weekId ? esc(shortDate(e.weekId)) : "", t = e.text ? esc(e.text) : "";
  switch (e.type) {
    case "host": return [ic("home"), `${who} confirmed hosting on ${day} — time & address are up`];
    case "hostAsk": return [ic("home"), `${who} can't host on ${day}. <b>Can you host?</b>`];
    case "hadis": return [ic("book"), `${who} posted the hadis for ${day}${t ? ` · ${t}` : ""}`];
    case "hadisEdit": return [ic("book"), `${who} updated the hadis for ${day}`];
    case "sohbet": return [ic("chat"), `${who} shared the sohbet for ${day}${t ? `: ${t}` : ""}`];
    case "sohbetEdit": return [ic("chat"), `${who} updated the sohbet notes for ${day}`];
    case "sunum": return [ic("mic"), `${who} is giving the sunum on ${day}${t ? `: ${t}` : ""}`];
    case "sunumNotes": return [ic("mic"), `${who} added notes to the sunum${t ? ` “${t}”` : ""}`];
    case "sunumAsk": return [ic("mic"), `No one volunteered for ${day}. <b>Can you give the sunum?</b>`];
    case "recap": return [ic("notes"), `${who} added notes from ${day}${t ? `: ${t}` : ""}`];
    case "feedback": return [ic("chat"), `${who} sent feedback: “${t}”`];
    default: return [ic("bell"), "Update"];
  }
}
function notifsSheet() {
  const seen = member(me)?.notifSeenAt || 0;
  const list = myEvents().slice(0, 60);
  openSheet({
    title: "Notifications", action: null,
    body: list.length ? `<ul class="notif-list">${list.map((e) => { const [i, txt] = notifLine(e);
      return `<li><button type="button" class="notif ${e.at > seen ? "new" : ""}" data-a="notifGo" data-type="${e.type}" data-week="${e.weekId || ""}">
        <span class="n-ic">${i}</span><span class="grow">${txt}<span class="small muted n-t">${ago(e.at)}</span></span></button></li>`; }).join("")}</ul>`
      : `<p class="muted">Nothing yet. You'll see updates here when the host confirms, the hadis or sohbet is posted, someone takes the sunum, or notes are added.</p>`,
  });
  if (notifUnread()) act("seenNotifs").catch(() => {});
}
function notifGo(el) {
  const { type, week } = el.dataset;
  closeSheet();
  if (type === "feedback") return feedbackSheet();
  if (!week) return;
  if (week < S.currentWeekId) return openDetail(week);
  sel = week; render(); window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- chat ---------- */
let chat = { summary: { unread: {}, last: [] }, conv: null, lastId: 0, timer: null };
const chatUnreadTotal = () => Object.values(chat.summary.unread || {}).reduce((a, b) => a + b, 0);
async function refreshChatSummary() {
  if (!me || !S) return;
  try {
    chat.summary = await apiX(`/api/chat/summary?actor=${me}`);
    const b = document.querySelector('[data-a="chat"].has-badge');
    if (b) { b.querySelector(".badge-dot")?.remove(); const n = chatUnreadTotal(); if (n) b.insertAdjacentHTML("beforeend", `<span class="badge-dot">${n}</span>`); }
  } catch {}
}
function stopChatPoll() { clearInterval(chat.timer); chat.timer = null; chat.conv = null; }
const dmWith = (id) => "dm:" + [me, id].sort().join(":");
const otherIn = (conv) => conv.split(":").slice(1).find((x) => x !== me);
const convName = (conv) => conv === "general" ? "Thursday Bros · General" : nameOf(otherIn(conv));

async function chatList() {
  stopChatPoll();
  await refreshChatSummary();
  const last = Object.fromEntries((chat.summary.last || []).map((m) => [m.conv, m]));
  const dms = (chat.summary.last || []).filter((m) => m.conv.startsWith("dm:") && member(otherIn(m.conv))).sort((a, b) => b.id - a.id).map((m) => m.conv);
  const row = (conv) => {
    const l = last[conv], n = chat.summary.unread?.[conv] || 0;
    const pic = conv === "general" ? `<span class="avatar sm grp">${logo()}</span>` : avatar(otherIn(conv), "sm");
    return `<button type="button" class="conv" data-a="chatOpen" data-conv="${conv}">${pic}
      <span class="grow"><span class="c-n">${esc(convName(conv))}</span>
      <span class="small muted c-p">${l ? `${l.sender === me ? "You: " : conv === "general" ? esc(nameOf(l.sender)) + ": " : ""}${esc(l.body.slice(0, 80))}` : "Say selam 👋"}</span></span>
      ${l ? `<span class="small muted">${ago(l.at)}</span>` : ""}${n ? `<span class="badge-dot inline">${n}</span>` : ""}</button>`;
  };
  openSheet({
    title: "Chat", action: null,
    body: `${row("general")}
      <div class="section-lbl">Private</div>
      ${dms.map(row).join("") || `<p class="small muted" style="margin:0 0 8px">No private chats yet.</p>`}
      <button type="button" class="btn tonal" data-a="chatNew" style="margin-top:8px">${ic("plus")} New private message</button>`,
  });
}
function chatNew() {
  stopChatPoll();
  const people = [...members()].filter((m) => m.id !== me).sort((a, b) => a.name.localeCompare(b.name));
  openSheet({
    title: "New message", action: null, back: "chat",
    body: `<div class="picker-box">${ic("search")}<input type="search" id="dm-q" placeholder="Search people" autocomplete="off" /></div>
      <ul class="picker-list" id="dm-list">${people.map((m) => `<li><button type="button" data-a="chatOpen" data-conv="${dmWith(m.id)}" data-n="${esc(fold(m.name))}">${avatar(m.id, "sm")}<span>${esc(m.name)}</span></button></li>`).join("")}</ul>`,
  });
  $("#dm-q").addEventListener("input", (e) => {
    const t = fold(e.target.value.trim());
    document.querySelectorAll("#dm-list button").forEach((b) => { b.parentElement.hidden = t && !b.dataset.n.includes(t); });
  });
}
const fmtClock = (t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtDay = (t) => { const d = new Date(t), today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  return d.toDateString() === today.toDateString() ? "Today" : d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
function msgHtml(list, prev) {
  let out = "";
  list.forEach((m, i) => {
    const p = i ? list[i - 1] : prev;
    if (!p || fmtDay(p.at) !== fmtDay(m.at)) out += `<div class="day-sep">${fmtDay(m.at)}</div>`;
    const mine = m.sender === me, cont = p && p.sender === m.sender && m.at - p.at < 5 * 60000 && fmtDay(p.at) === fmtDay(m.at);
    out += `<div class="msg ${mine ? "me" : ""} ${cont ? "cont" : ""}">
      ${!mine && chat.conv === "general" ? (cont ? `<span class="avatar sm ghost"></span>` : avatar(m.sender, "sm")) : ""}
      <div class="bub">${!mine && chat.conv === "general" && !cont ? `<div class="m-n">${esc(nameOf(m.sender))}</div>` : ""}${esc(m.body)}<span class="m-t">${fmtClock(m.at)}</span></div></div>`;
  });
  return out;
}
async function chatOpen(conv) {
  stopChatPoll();
  chat.conv = conv; chat.lastId = 0; chat.msgs = [];
  const pic = conv === "general" ? "" : avatar(otherIn(conv), "sm");
  openSheet({
    title: `<span class="chat-title">${pic}${esc(convName(conv))}</span>`, action: null, back: "chat", cls: "chat-sheet", side: " ",
    body: `<div class="chat-msgs" id="chat-msgs"><p class="small muted" style="text-align:center">Loading…</p></div>
      <div class="chat-compose"><textarea id="chat-in" rows="1" maxlength="2000" placeholder="Message${conv === "general" ? " everyone" : ""}…" enterkeyhint="send"></textarea>
      <button type="submit" class="btn filled send" aria-label="Send">${ic("send")}</button></div>`,
  }, async () => {
    const ta = $("#chat-in"), body = ta.value.trim();
    if (!body) throw 0;
    ta.value = ""; ta.style.height = "";
    try {
      const { message } = await apiX(`/api/chat?conv=${conv}&actor=${me}`, { method: "POST", body });
      appendMsgs([message]);
    } catch (e) { ta.value = body; toast(e.message); }
    return "keep";
  });
  const ta = $("#chat-in");
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#sheet-root form").requestSubmit(); } });
  await pollChat(true);
  chat.timer = setInterval(() => pollChat(false), 3000);
}
function appendMsgs(list) {
  list = list.filter((m) => m.id > chat.lastId);
  if (!list.length) return;
  const box = $("#chat-msgs"); if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  if (!chat.lastId) box.innerHTML = "";
  box.insertAdjacentHTML("beforeend", msgHtml(list, chat.msgs.at(-1)));
  chat.msgs.push(...list); chat.lastId = list.at(-1).id;
  if (atBottom || list.some((m) => m.sender === me) || chat.msgs.length === list.length) box.scrollTop = box.scrollHeight;
}
async function pollChat(first) {
  const conv = chat.conv; if (!conv) return;
  try {
    const { messages } = await apiX(`/api/chat?conv=${conv}&actor=${me}&after=${chat.lastId}`);
    if (conv !== chat.conv) return;
    if (first && !messages.length) $("#chat-msgs").innerHTML = DEMO ? `<p class="small muted chat-empty">Chat is private to the group, so it's hidden in the visitor preview.<br>You can still try sending: messages stay on your screen.</p>` : `<p class="small muted chat-empty">${conv === "general" ? "Group chat for everyone in Thursday Bros." : `Private chat with ${esc(convName(conv))}. Only you two can see this.`}<br>Say selam 👋</p>`;
    appendMsgs(messages);
  } catch {}
}

/* ---------- events ---------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a;
  const w = S && sel ? W() : null;
  switch (a) {
    case "close":
      for (const [id, t] of Object.entries(nbTimers)) { clearTimeout(t); delete nbTimers[id]; const ta = document.querySelector(`[data-nb="${id}"]`); if (ta) saveNote(id, ta.value); }
      if (activeRec) { if (confirm("Stop recording?")) stopRecording(); break; }
      closeSheet(); break;
    case "detail": openDetail(el.dataset.week); break;
    case "recap": recapSheet(el.dataset.week || sel); break;
    case "record": startRecording(el.dataset.week || sel); break;
    case "recStop": stopRecording(); break;
    case "summarize": summarizeInto(el.dataset.week, el); break;
    case "iam": me = el.dataset.id; store.set("sohbet.me", me); render(); toast(`Selam, ${nameOf(me)}!`); showWelcomeHadith(); trackVisit(); break;
    case "join":
      try {
        const r = await api({ type: "addMember", name: el.dataset.name });
        me = r.id; store.set("sohbet.me", me); render();
        toast(`Hoş geldin, ${el.dataset.name}!`); showWelcomeHadith(); trackVisit();
      } catch (err) { toast(err.message); }
      break;
    case "profile": profileSheet(el.dataset.week); break;
    case "notifs": notifsSheet(); break;
    case "demoGuest": {
      const nm = ($("#demo-name")?.value || "").trim();
      try { store.set("guestName", nm); } catch {}
      const r = await api({ type: "addMember", name: "Guest" + (nm ? ` · ${nm}` : "") }).catch((e) => toast(e.message));
      if (r?.id) { me = r.id; store.set("sohbet.me", me); render(); showWelcomeHadith(); }
      break;
    }
    case "demoAs": me = el.dataset.id; store.set("sohbet.me", me); try { store.set("guestName", ($("#demo-name")?.value || "").trim()); } catch {} render(); toast(`Viewing as ${nameOf(me)}: nothing is saved`); break;
    case "demoExit": try { sessionStorage.removeItem("tb.demo"); } catch {} location.href = "/"; break;
    case "stats": statsSheet(); break;
    case "demoLink": {
      const link = `${location.origin}/?demo`;
      const text = ascii(`Selam! Persembe sohbetlerimiz icin bir sayfa yaptik: hadis, sohbet, sunum, yemek sirasi, sohbet notlari. Gercek sayfamizi gezebilirsin, ne yaparsan yap bizim sayfayi etkilemiyor. Fikirlerini yazarsan cok seviniriz: ${link}`);
      openSheet({ title: "Visitor preview link", action: null,
        lead: "For people outside the group: they see live data, can tap around freely, and nothing they do changes your site. Their feedback reaches you for real.",
        body: `<textarea id="pt-text" rows="5">${esc(text)}</textarea>
          <div class="share-btns"><a class="btn filled lg" target="_blank" rel="noopener" href="${waLink("", text)}">${ic("chat")} WhatsApp</a>
          ${navigator.share ? `<button type="button" class="btn tonal lg" data-a="ptShare">${ic("share")} Share…</button>` : ""}
          <button type="button" class="btn outlined lg" data-a="ptCopy" data-link="${link}">${ic("link")} Copy</button></div>
          <p class="hint">Hidden in the preview: chat, private notes, phone numbers, street addresses and host notes.</p>` });
      break;
    }
    case "installHow": if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } else installSheet(); break;
    case "installNow": closeSheet(); installEvt?.prompt(); installEvt?.userChoice.finally(() => { installEvt = null; render(); }); break;
    case "reload": el.classList.add("spin"); setTimeout(() => location.reload(), 150); break;
    case "installHide": try { localStorage.setItem("tb.installDismissed", "1"); } catch {} render(); toast("You can find it anytime in your Profile"); break;
    case "installSheet": installSheet(); break;
    case "notifGo": notifGo(el); break;
    case "chat": chatList(); break;
    case "chatNew": chatNew(); break;
    case "chatOpen": chatOpen(el.dataset.conv); break;
    case "feedback": feedbackSheet(); break;
    case "fbLike": await act("likeFeedback", { id: el.dataset.id }).catch(() => {}); feedbackSheet(); break;
    case "fbDel":
      if (confirm("Delete this post?")) { await act("deleteFeedback", { id: el.dataset.id }).catch(() => {}); feedbackSheet(); }
      break;
    case "pfSave":
      await act("updateMember", { id: me, phone: $("#pf-phone").value, address: $("#pf-addr").value }).catch(() => {});
      toast("Saved"); profileSheet();
      break;
    case "switch":
      if (confirm(`You're ${nameOf(me)}. Switch to a different name?`)) {
        closeSheet(); me = null; store.set("sohbet.me", null);
        if (!DEMO) fetch("/api/signout", { method: "POST" }).catch(() => {});
        try { sessionStorage.removeItem("tb.visit"); } catch {}
        chat.summary = { unread: {}, last: [] }; render(); window.scrollTo(0, 0);
      }
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
    case "toPrivate": {
      const part = el.dataset.part, wk = S.state.weeks[el.dataset.week];
      const pub = part === "sunum" ? wk.konu?.notes : part === "sohbet" ? wk.sohbet?.notes : wk.hadis?.notes;
      if (!pub || !confirm("Move these notes into your private notes? They'll be removed from the card everyone sees.")) break;
      try {
        const url = `/api/private?week=${wk.id}&part=${part}&actor=${me}`;
        const cur = (await apiX(url)).text;
        await apiX(url, { method: "POST", body: [cur, pub].filter((x) => x?.trim()).join("\n\n") });
        if (part === "sunum") await act("editKonu", { weekId: wk.id, ...wk.konu, notes: "" });
        else if (part === "sohbet") await act("setSohbet", { weekId: wk.id, title: wk.sohbet.title, link: wk.sohbet.link, notes: "" });
        else await act("setHadis", { weekId: wk.id, text: wk.hadis.text, source: wk.hadis.source, notes: "" });
        toast("Moved to My notes 🔒");
        const d = document.querySelector(`details.private[data-priv=${part}]`); if (d) d.open = true;
      } catch (err) { toast(err.message); }
      break;
    }
    case "privSave": {
      const d = el.closest("details.private"), st = d.querySelector(".priv-status");
      el.disabled = true; st.textContent = "Saving…";
      try {
        await apiX(`/api/private?week=${d.dataset.week}&part=${d.dataset.priv}&actor=${me}`, { method: "POST", body: d.querySelector("textarea").value });
        st.textContent = "Saved ✓"; delete d.dataset.dirty;
      } catch (err) { st.textContent = err.message; }
      el.disabled = false;
      break;
    }
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
    case "share": sendToSheet(); break;
    case "shareGroup": closeSheet(); shareWeek(); break;
    case "personShare": personSheet(el.dataset.id, el.dataset.kind); break;
    case "ptCopy": try { await navigator.clipboard.writeText($("#pt-text").value); toast("Message with link copied"); } catch { prompt("Copy this:", el.dataset.link); } break;
    case "ptShare": navigator.share?.({ text: $("#pt-text").value }).catch(() => {}); break;
  }
});

document.addEventListener("change", async (e) => {
  if (e.target.matches?.("[data-pt]")) {
    const id = e.target.dataset.pt, link = await personalLink(id), t = personTemplates(id, link).find((x) => x.k === e.target.value);
    $("#pt-text").value = t.text; $("#pt-wa").href = waLink(member(id)?.phone, t.text); return;
  }
  if (e.target.matches?.("[data-it]")) { installSheet(e.target.value); return; }
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
  const w = W(), h = hostOf(w), place = weekPlace(w);
  const yes = Object.values(rsvpOf(w)).filter((v) => v === "yes").length;
  const L = [`*Thursday Bros - ${trDay(w.id)} Persembe*`];
  if (w.cancelled) L.push("Bu hafta sohbet yok.");
  else {
    L.push(detailsReady(w) ? `Ev: ${nameOf(h.id)}, saat ${hhmm(weekTime(w))}${place ? `\nAdres: ${place}` : ""}` : `Ev: ${h ? nameOf(h.id) + " (onay bekleniyor)" : "henuz belli degil"}`);
    if (w.hadis) L.push(`Hadis: ${nameOf(w.hadis.by)} paylasti`);
    L.push(w.sohbet?.title ? `Sohbet: ${w.sohbet.title}` : "Sohbet: konu yakinda");
    L.push(w.konu ? `Sunum: ${nameOf(w.konu.presenterId)} - ${w.konu.title}` : "Sunum: henuz bos, isteyen var mi?");
    L.push(`${yes ? `${yes} kisi geliyor. ` : ""}Geliyor musun? Buradan isaretle:`);
  }
  L.push(location.origin);
  const text = ascii(L.join("\n"));
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
      <div class="welcome-timer"><span></span></div>
      <div class="welcome-hint">Tap anywhere to continue</div>
    </div>`;
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.add("out"); setTimeout(() => el.remove(), 300); };
  el.addEventListener("click", close);
  setTimeout(close, 3000);
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
  document.body.appendChild(el);
}

/* ---------- pull down to refresh ---------- */
(() => {
  let y0 = null, pulled = 0, ind = null;
  const reset = () => { y0 = null; pulled = 0; if (ind) { ind.style.opacity = 0; ind.style.transform = "translate(-50%, -40px)"; } };
  document.addEventListener("touchstart", (e) => {
    if ($("#sheet-root").innerHTML || window.scrollY > 0 || document.querySelector(".welcome")) return;
    y0 = e.touches[0].clientY;
    if (!ind) { ind = document.createElement("div"); ind.className = "ptr"; ind.innerHTML = ic("refresh"); document.body.appendChild(ind); }
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (y0 == null) return;
    pulled = Math.max(0, e.touches[0].clientY - y0);
    if (window.scrollY > 0) return reset();
    const d = Math.min(pulled, 110);
    ind.style.opacity = Math.min(1, d / 70);
    ind.style.transform = `translate(-50%, ${d - 40}px) rotate(${d * 3}deg)`;
    ind.classList.toggle("ready", pulled > 85);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (y0 != null && pulled > 85) { ind.classList.add("spin"); setTimeout(() => location.reload(), 200); return; }
    reset();
  });
})();

/* ---------- boot ---------- */
(async () => {
  try {
    await api();
    // Browser forgot the name (Safari 7-day cleanup, cleared data…)? Restore it from the server cookie.
    if (!DEMO && (!me || !member(me))) {
      try { const w = await apiX("/api/whoami"); if (w.id && member(w.id)) { me = w.id; store.set("sohbet.me", me); } } catch {}
    }
    if (!S.state.settings.tz) await api({ type: "init", tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    render();
    const hasInvite = !DEMO && new URLSearchParams(location.search).has("i");
    if (hasInvite) await handleInviteLink();
    trackVisit();
    if (me && member(me) && !document.querySelector(".claim")) { showWelcomeHadith(); refreshChatSummary(); } // only once someone has picked their name
  } catch (e) { showError(e.message); }
  setInterval(() => { if (!$("#sheet-root").innerHTML && document.visibilityState === "visible") refresh(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !$("#sheet-root").innerHTML) refresh(); });
})();
