// Three versions of the same app:
//   "mix" – the original: English with Turkish terms (Hadis, Sohbet, Sunum, Geliyorum). This is the default.
//   "en"  – full English (en.js replaces the Turkish terms).
//   "tr"  – full Turkish (tr.js).
// The "mix" English text in the code is the key; anything missing from en.js / tr.js falls back to it.
// TR voice: a warm friend in the group, "sen" form, short sentences, Islamic phrases only where they are natural
// (inşallah, Allah razı olsun, hoş geldin). No office language ("lütfen", "kullanıcı"). Keep the same word for
// the same thing everywhere: ev sahibi (host), sunum, sohbet, hadis, Geliyorum / Gelemiyorum, Sıra.
import { TR } from "./tr.js";
import { EN } from "./en.js";

let lang = "mix";
try {
  const q = new URLSearchParams(location.search).get("lang");
  if (["mix", "en", "tr"].includes(q)) localStorage.setItem("tb.lang2", q);
  const v = localStorage.getItem("tb.lang2");
  if (v === "en" || v === "tr") lang = v;
} catch {}

export const LANG = lang;
try { document.documentElement.lang = lang === "tr" ? "tr" : "en"; } catch {}
export const loc = lang === "tr" ? "tr-TR" : "en-US";
export function setLang(l) { try { localStorage.setItem("tb.lang2", l); } catch {} location.reload(); }

const dict = lang === "tr" ? TR : lang === "en" ? EN : null;
/** T("Take it") · T("{n} days left", { n: 3 }) */
export function T(s, v) {
  let out = dict && dict[s] != null ? dict[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  return out;
}
/** Pick singular/plural: P(n, "{n} day", "{n} days") – Turkish has no plural after numbers. */
export const P = (n, one, many) => T(n === 1 ? one : many, { n });
