// EN | TR. The English text in the code is the key; anything missing from TR falls back to English.
// "EN" is the original version of the app (English with Turkish terms like Hadis, Sohbet, Sunum).
// TR voice: a warm friend in the group, "sen" form, short sentences, Islamic phrases only where they are natural
// (inşallah, Allah razı olsun, hoş geldin). No office language ("lütfen", "kullanıcı"). Keep the same word for
// the same thing everywhere: ev sahibi (host), sunum, sohbet, hadis, Geliyorum / Gelemiyorum, Sıra.
import { TR } from "./tr.js";

let lang = "en";
try {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "tr" || q === "en") localStorage.setItem("tb.lang", q);
  lang = localStorage.getItem("tb.lang") === "tr" ? "tr" : "en";
} catch {}

export const LANG = lang;
try { document.documentElement.lang = lang; } catch {}
export const loc = lang === "tr" ? "tr-TR" : "en-US";
export function setLang(l) { try { localStorage.setItem("tb.lang", l); } catch {} location.reload(); }

/** T("Take it") · T("{n} days left", { n: 3 }) */
export function T(s, v) {
  let out = lang === "tr" && TR[s] != null ? TR[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  return out;
}
/** Pick singular/plural: P(n, "{n} day", "{n} days") – Turkish has no plural after numbers. */
export const P = (n, one, many) => T(n === 1 ? one : many, { n });
