// Sohbet archive: Claude summarization prompt + helpers (no I/O).

export const RECAP_FIELDS = ["title", "summary", "hadis", "sohbet", "sunum", "questions"];

export const SYSTEM_PROMPT = `You write the archive notes for "Thursday Bros", a weekly Turkish Islamic study circle (sohbet) among friends.
Each night usually has three parts: a hadis read and discussed, a sohbet led by a fixed person, and a short sunum (talk) by a rotating member.

The input is a transcript, often produced by automatic speech recognition: expect recognition errors, unlabeled speakers, small talk, and Arabic phrases written phonetically.

Rules:
- Write everything in Turkish, in a warm but concise note-taking style.
- Be faithful to what was said. Do not invent ayet, hadis or source references; include a reference only if it is said or clearly identifiable. Mark anything uncertain with "(?)".
- Correct obvious transcription errors in religious terms when the intended word is clear (e.g. Esma names, sure names).
- Skip greetings, logistics and food talk.
- Bullets: use "• " at the start of each line, 2–7 bullets per section. Leave a section empty ("") if that part did not happen.

Return ONLY a JSON object, no other text, with these keys:
{"title": short title for the night (max 8 words),
 "summary": 3–5 sentence overview,
 "hadis": bullets about the hadis and its discussion,
 "sohbet": bullets with the sohbet's main points,
 "sunum": bullets with the sunum's takeaways,
 "questions": bullets with questions raised or left open,
 "tags": array of 3–8 short tags (topics, Esma names, sure/ayet refs like "Haşr 22", events like "Miraç")}`;

export function buildUserPrompt(transcript, ctx = {}) {
  const planned = [
    ctx.hadis && `Hadis (planned): ${ctx.hadis}`,
    ctx.sohbet && `Sohbet topic (planned): ${ctx.sohbet}`,
    ctx.sunum && `Sunum (planned): ${ctx.sunum}`,
    ctx.date && `Date: ${ctx.date}`,
  ].filter(Boolean).join("\n");
  return `${planned ? `What was planned for this night:\n${planned}\n\n` : ""}Transcript:\n"""\n${transcript}\n"""`;
}

/** Pull the JSON object out of the model's reply and normalize it. */
export function parseSummary(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("Summary was not in the expected format");
  const o = JSON.parse(text.slice(a, b + 1));
  const out = {};
  for (const k of RECAP_FIELDS) out[k] = typeof o[k] === "string" ? o[k].trim() : Array.isArray(o[k]) ? o[k].map((x) => "• " + x).join("\n") : "";
  out.tags = (Array.isArray(o.tags) ? o.tags : String(o.tags || "").split(",")).map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  return out;
}

export function cleanRecap(a) {
  const c = (v, n) => String(v ?? "").trim().slice(0, n);
  const r = {};
  r.title = c(a.title, 140);
  for (const k of ["summary", "hadis", "sohbet", "sunum", "questions"]) r[k] = c(a[k], 12000);
  r.tags = (Array.isArray(a.tags) ? a.tags : String(a.tags || "").split(",")).map((t) => c(t, 40)).filter(Boolean).slice(0, 20);
  r.attendees = (Array.isArray(a.attendees) ? a.attendees : []).map((x) => c(x, 20)).filter(Boolean).slice(0, 100);
  return r;
}
