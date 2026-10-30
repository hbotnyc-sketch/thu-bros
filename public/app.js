// Thursday Bros — single-page client. No framework: state → render() → event delegation.

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
const hostOf = (w) => S.hosts?.[w.id] || null;
const weekTime = (w) => w.customTime || S.state.settings.defaultTime;
const weekPlace = (w) => w.place || member(hostOf(w)?.id)?.address || "";
const rsvpOf = (w) => w.rsvp || {};
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

const logo = () => `<svg viewBox="0 0 64 64" aria-hidden="true" class="mark"><rect width="64" height="64" rx="16" fill="var(--on-surface)"/><text x="28" y="43" text-anchor="middle" font-family="'Roboto Flex','Helvetica Neue',Arial,sans-serif" font-weight="800" font-size="30" letter-spacing="-2" fill="var(--surface)">TB</text><circle cx="51.5" cy="40.5" r="3.6" fill="var(--primary)"/></svg>`;

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
    const h = hostOf(w);
    const sub = w.cancelled ? `<span class="small muted">No sohbet</span>` :
      `<span class="dot ${w.hadis ? "full" : ""}" title="Hadis"></span><span class="dot ${w.konu ? "full" : ""}" title="Konu"></span>
       <span class="wk-host">${h ? esc(nameOf(h.id)) : "Host?"}</span>`;
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
        ${place ? `<span>${ic("pin")}${esc(place)}</span>` : ""}
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
    : `${sampleHadis()}
       <button class="btn tonal" data-a="hadis">${ic("plus")} Add hadis</button>`}
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
    <p class="instr block">(Bu bir örnektir. Konuyu alan kişi "Take this week"e basar → başlık + tür yeterli, notları sonradan ✎ ile ekleyebilir. Notları sohbetten bir gün önce eklemek idealdir. 10–15 dk yeter.)</p>
  </div>`;
}

function renderKonu(w) {
  const k = w.konu;
  if (!k) {
    const asking = w.ask ? (w.ask.memberId === me ? "The backup queue is asking you this week." : `Backup queue is asking ${esc(nameOf(w.ask.memberId))}.`) : "Open — waiting for a volunteer.";
    return `<section class="card">
      <div class="card-h"><span class="badge">${ic("mic")}</span><h3>Konu</h3></div>
      <p class="empty">${w.cancelled ? "—" : asking}</p>
      ${w.cancelled ? "" : sampleKonu()}
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
  const h = hostOf(w);
  const place = weekPlace(w);
  const r = rsvpOf(w);
  const yes = Object.keys(r).filter((id) => r[id] === "yes" && member(id));
  const no = Object.keys(r).filter((id) => r[id] === "no" && member(id));
  const mine = r[me];
  const mapsUrl = place ? `https://maps.google.com/?q=${encodeURIComponent(place)}` : "";
  return `<section class="card">
    <div class="card-h"><span class="badge">${ic("home")}</span><h3>Host & yemek</h3>
      <button class="icon-btn" data-a="host" aria-label="Change host or details">${ic("edit")}</button></div>
    ${h ? `<div class="person">${avatar(h.id, "lg")}<div style="flex:1;min-width:0"><div class="who">${esc(nameOf(h.id))}${h.id === me ? ' <span class="muted small">(you)</span>' : ""}</div>
        <div class="sub">${h.changed ? "Changed for this week" : "Yemek sırası"}</div></div>
        <button class="btn text" data-a="rota">Sıra</button></div>`
      : `<p class="empty">No host yet. Set up the yemek sırası once and it fills every week.</p>
         <button class="btn tonal" data-a="rotaEdit" style="margin-bottom:12px">${ic("plus")} Set yemek sırası</button>`}
    ${place || w.hostNotes ? `<div class="kv">
      ${place ? `${ic("pin")}<div><a href="${mapsUrl}" target="_blank" rel="noopener">${esc(place)}</a></div>` : ""}
      ${w.hostNotes ? `${ic("food")}<div style="white-space:pre-wrap">${esc(w.hostNotes)}</div>` : ""}</div>` : ""}
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
    <div class="who-brand">Thursday Bros · weekly sohbet</div>
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
    case "rsvp": {
      const v = el.dataset.v;
      act("rsvp", { answer: rsvpOf(w)[me] === v ? null : v }).catch(() => {});
      break;
    }
    case "rota": rotaSheet(); break;
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
  const el = e.target.closest("[data-change]");
  if (!el) return;
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
    lines.push(`🏠 ${h ? nameOf(h.id) + " hosting" : "Host?"} · 🕖 ${fmtTime(weekTime(w))}${place ? "\n📍 " + place : ""}`);
    lines.push(`📖 Hadis: ${w.hadis ? (w.hadis.source || "posted") : "—"}`);
    lines.push(`🎤 Konu: ${w.konu ? `${w.konu.title} (${nameOf(w.konu.presenterId)})` : "Open — volunteer 👇"}`);
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
