// Sohbet — core state machine (pure, no I/O). Shared by the Netlify functions and the local dev server.

export const HOUR = 3600000;
export const DAY = 24 * HOUR;

export const DEFAULT_SETTINGS = {
  tz: null,               // IANA timezone, set from the first visitor's browser
  sohbetWeekday: 4,       // 0=Sun … 4=Thursday
  cutoffDaysBefore: 3,    // backup queue starts 3 days before (Monday)
  cutoffHour: 21,         // …at 9pm local
  askHours: 24,           // each person in the queue gets 24h to answer
  cooldown: 5,            // hide the prompt until 5 others have presented
  defaultTime: "20:00",
  defaultPlace: "",
};

export const TOPIC_TYPES = ["esma", "ayet", "siyer", "iman", "other"];

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function emptyState() {
  return { version: 1, members: [], queue: [], weeks: {}, settings: { ...DEFAULT_SETTINGS } };
}

const uid = () => Math.random().toString(36).slice(2, 10);
const clean = (v, max = 4000) => String(v ?? "").trim().slice(0, max);

/* ---------- date helpers (week ids are local dates "YYYY-MM-DD") ---------- */

export function addDays(ds, n) {
  const d = new Date(ds + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekdayOf = (ds) => new Date(ds + "T00:00:00Z").getUTCDay();

export function localDate(ms, tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(ms));
}
function tzOffset(ms, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms)).map((x) => [x.type, x.value])
  );
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
/** UTC ms for a local wall-clock time (date + hour) in tz */
export function zonedTime(ds, hour, tz) {
  const guess = Date.parse(ds + "T00:00:00Z") + hour * HOUR;
  const o1 = tzOffset(guess, tz);
  let t = guess - o1;
  const o2 = tzOffset(t, tz);
  if (o2 !== o1) t = guess - o2;
  return t;
}

const tzOf = (s) => s.settings.tz || "UTC";
export function currentWeekId(s, now) {
  const today = localDate(now, tzOf(s));
  return addDays(today, (s.settings.sohbetWeekday - weekdayOf(today) + 7) % 7);
}
export const cutoffAt = (s, id) => zonedTime(addDays(id, -s.settings.cutoffDaysBefore), s.settings.cutoffHour, tzOf(s));
export const weekEndAt = (s, id) => zonedTime(addDays(id, 1), 0, tzOf(s));

function newWeek(s, id) {
  return {
    id, time: s.settings.defaultTime, place: s.settings.defaultPlace, cancelled: false,
    hadis: null, konu: null, ask: null, askLog: [],
    hostVolunteers: [], host: null, hostNotes: "", bring: [],
  };
}
export function ensureWeeks(s, now) {
  const cur = currentWeekId(s, now);
  for (let i = 0; i < 4; i++) {
    const id = addDays(cur, 7 * i);
    if (!s.weeks[id]) s.weeks[id] = newWeek(s, id);
  }
  return cur;
}

/* ---------- cooldown ---------- */

function presentations(s) {
  return Object.values(s.weeks)
    .filter((w) => w.konu && !w.cancelled)
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((w) => w.konu.presenterId);
}
/** Cooldown can't exceed group size − 1, or small groups would lock everyone out. */
export const effectiveCooldown = (s) => Math.max(0, Math.min(s.settings.cooldown, s.members.length - 1));
/** How many more *other* presentations are needed before this member sees the prompt again. */
export function cooldownLeft(s, memberId) {
  const p = presentations(s);
  const i = p.lastIndexOf(memberId);
  if (i < 0) return 0;
  return Math.max(0, effectiveCooldown(s) - (p.length - 1 - i));
}

/* ---------- backup queue ---------- */

const toEnd = (s, id) => { s.queue = s.queue.filter((x) => x !== id); s.queue.push(id); };

function pickNext(s, w) {
  const asked = new Set(w.askLog.map((l) => l.memberId));
  const live = new Set(s.members.map((m) => m.id));
  return s.queue.find((id) => live.has(id) && !asked.has(id) && cooldownLeft(s, id) === 0) || null;
}

/** Advance time-based state: create weeks, start the backup queue at cutoff, hand off after 24h. */
export function advance(s, now) {
  const cur = ensureWeeks(s, now);
  for (const w of Object.values(s.weeks)) if (w.id < cur && w.ask) w.ask = null;

  const w = s.weeks[cur];
  if (w.cancelled || w.konu || now < cutoffAt(s, cur) || now >= weekEndAt(s, cur)) {
    if (w.ask && (w.cancelled || w.konu)) w.ask = null;
    return cur;
  }
  if (w.ask && now - w.ask.askedAt >= s.settings.askHours * HOUR) {
    w.askLog.push({ memberId: w.ask.memberId, askedAt: w.ask.askedAt, result: "timeout", at: now });
    toEnd(s, w.ask.memberId);
    w.ask = null;
  }
  if (!w.ask) {
    const next = pickNext(s, w);
    if (next) w.ask = { memberId: next, askedAt: now };
  }
  return cur;
}

/* ---------- actions ---------- */

function topicFields(a) {
  return {
    title: clean(a.title, 140),
    topicType: TOPIC_TYPES.includes(a.topicType) ? a.topicType : "other",
    summary: clean(a.summary, 600),
    notes: clean(a.notes, 8000),
    link: /^https?:\/\//i.test(clean(a.link)) ? clean(a.link, 500) : "",
  };
}

export function applyAction(s, a, now) {
  const cur = ensureWeeks(s, now);
  const need = (c, msg, code = 400) => { if (!c) throw new HttpError(code, msg); };
  const member = (id) => s.members.find((m) => m.id === id);
  const week = () => { const w = s.weeks[a.weekId]; need(w, "Unknown week", 404); return w; };
  const actor = () => { const m = member(a.actor); need(m, "Pick your name first", 401); return m; };

  switch (a.type) {
    case "init":
      if (!s.settings.tz && a.tz) { try { localDate(now, a.tz); s.settings.tz = a.tz; } catch {} }
      return null;

    /* members & queue */
    case "addMember": {
      const name = clean(a.name, 40);
      need(name, "Name is required");
      need(!s.members.some((m) => m.name.toLowerCase() === name.toLowerCase()), "That name is already in the list");
      const m = { id: uid(), name, phone: clean(a.phone, 24) };
      s.members.push(m);
      s.queue.push(m.id);
      return { id: m.id };
    }
    case "updateMember": {
      const m = member(a.id); need(m, "Unknown member", 404);
      if (a.name != null) {
        const name = clean(a.name, 40); need(name, "Name is required");
        need(!s.members.some((x) => x.id !== m.id && x.name.toLowerCase() === name.toLowerCase()), "That name is already in the list");
        m.name = name;
      }
      if (a.phone != null) m.phone = clean(a.phone, 24);
      return null;
    }
    case "removeMember": {
      need(member(a.id), "Unknown member", 404);
      s.members = s.members.filter((m) => m.id !== a.id);
      s.queue = s.queue.filter((id) => id !== a.id);
      for (const w of Object.values(s.weeks)) {
        if (w.ask?.memberId === a.id) w.ask = null;
        w.hostVolunteers = w.hostVolunteers.filter((id) => id !== a.id);
        if (w.host === a.id) w.host = null;
      }
      return null;
    }
    case "moveQueue": {
      const i = s.queue.indexOf(a.id), j = i + (a.dir > 0 ? 1 : -1);
      if (i >= 0 && j >= 0 && j < s.queue.length) [s.queue[i], s.queue[j]] = [s.queue[j], s.queue[i]];
      return null;
    }
    case "setSettings": {
      if (a.cooldown != null) s.settings.cooldown = Math.max(0, Math.min(20, parseInt(a.cooldown, 10) || 0));
      if (a.tz) { try { localDate(now, a.tz); s.settings.tz = a.tz; } catch { throw new HttpError(400, "Unknown timezone"); } }
      if (a.defaultTime != null) s.settings.defaultTime = clean(a.defaultTime, 10);
      if (a.defaultPlace != null) s.settings.defaultPlace = clean(a.defaultPlace, 200);
      return null;
    }

    /* konu */
    case "claimKonu": {
      const w = week(), me = actor();
      need(!w.cancelled, "This week is cancelled");
      need(!w.konu, "Someone already took this week");
      need(w.id >= cur, "That week has passed");
      const asked = w.ask?.memberId === me.id;
      // After cutoff with nobody left in the queue, anyone may step in.
      const openToAll = w.id === cur && !w.ask && now >= cutoffAt(s, cur);
      need(asked || openToAll || cooldownLeft(s, me.id) === 0, "You presented recently — let a few others go first 🙂", 409);
      const f = topicFields(a);
      need(f.title, "Give your topic a title");
      w.konu = { presenterId: me.id, ...f, via: asked ? "queue" : "volunteer", at: now };
      if (w.ask) {
        if (asked) w.askLog.push({ memberId: me.id, askedAt: w.ask.askedAt, result: "yes", at: now });
        w.ask = null;
      }
      toEnd(s, me.id);
      return null;
    }
    case "editKonu": {
      const w = week(); actor();
      need(w.konu, "No topic to edit");
      const f = topicFields(a); need(f.title, "Give your topic a title");
      Object.assign(w.konu, f);
      return null;
    }
    case "releaseKonu": {
      const w = week(); actor();
      need(w.konu, "No topic to release");
      w.konu = null;
      return null;
    }
    case "answerAsk": {
      const w = week(), me = actor();
      need(w.ask?.memberId === me.id, "You're not the one being asked right now");
      // "yes" is completed via claimKonu (with the topic form); here we only handle "no".
      w.askLog.push({ memberId: me.id, askedAt: w.ask.askedAt, result: "no", at: now });
      toEnd(s, me.id);
      w.ask = null;
      return null;
    }

    /* hadis */
    case "setHadis": {
      const w = week(), me = actor();
      const text = clean(a.text, 6000);
      w.hadis = text ? { text, source: clean(a.source, 300), notes: clean(a.notes, 6000), by: me.id, at: now } : null;
      return null;
    }

    /* host & food */
    case "toggleHostVolunteer": {
      const w = week(), me = actor();
      w.hostVolunteers = w.hostVolunteers.includes(me.id)
        ? w.hostVolunteers.filter((x) => x !== me.id)
        : [...w.hostVolunteers, me.id];
      return null;
    }
    case "setHost": {
      const w = week(); actor();
      need(!a.hostId || member(a.hostId), "Unknown member");
      w.host = a.hostId || null;
      if (a.place != null) w.place = clean(a.place, 200);
      if (a.time != null) w.time = clean(a.time, 10);
      if (a.hostNotes != null) w.hostNotes = clean(a.hostNotes, 1000);
      if (w.host && !w.hostVolunteers.includes(w.host)) w.hostVolunteers.push(w.host);
      return null;
    }
    case "addBring": {
      const w = week(), me = actor();
      const item = clean(a.item, 80); need(item, "What are you bringing?");
      w.bring.push({ id: uid(), memberId: me.id, item });
      return null;
    }
    case "removeBring": {
      const w = week(); actor();
      w.bring = w.bring.filter((b) => b.id !== a.id);
      return null;
    }
    case "setCancelled": {
      const w = week(); actor();
      w.cancelled = !!a.cancelled;
      if (w.cancelled) w.ask = null;
      return null;
    }
    default:
      throw new HttpError(400, "Unknown action");
  }
}

/** What the client receives: raw state + computed bits. */
export function view(s, now) {
  const cur = currentWeekId(s, now);
  const weeks = {};
  for (const id of Object.keys(s.weeks)) weeks[id] = { cutoff: cutoffAt(s, id), end: weekEndAt(s, id) };
  const cooldowns = Object.fromEntries(s.members.map((m) => [m.id, cooldownLeft(s, m.id)]));
  return { state: s, now, currentWeekId: cur, weekMeta: weeks, cooldowns, effectiveCooldown: effectiveCooldown(s) };
}
