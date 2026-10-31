# Thursday Bros — project guide for any AI coding assistant

Read this first. It is the handoff file for Claude Code, Codex, Gemini CLI, Cursor, etc.
(CLAUDE.md and GEMINI.md just point here.)

## What this is
A tiny one-page web app for a weekly Thursday Islamic sohbet group (~12 men). Owner: Furkan
(frknzjn@gmail.com; writes English and Turkish; mostly works from his phone).
Goals: simple, sleek, minimalist, Google-like UX. **Everything must stay free** (no paid APIs,
no paid storage, no Anthropic API key). Live: https://thu-bros.hbotnyc.workers.dev
Repo: github.com/hbotnyc-sketch/thu-bros (branch `main`; branch `v1` = the v1.0 MVP snapshot).
Pushing to `main` auto-deploys via Cloudflare Workers Builds (~1–2 min).

## How the week works
- **Hadis**: always Ihsan. **Sohbet notes**: always Harun. (roles in settings)
- **Sunum** (10–15 min talk): rotating, volunteer-based. Cooldown of 5 other presenters.
  Monday 9pm cutoff → backup queue asks one person at a time, 24h each.
- **Host & yemek**: fixed rotation (`hostRota`); host confirms (time, address, notes) or skips,
  which passes the ask to the next person. Time/address are hidden until the host confirms.
- **Geliyorum / Gelemiyorum** poll. Past sohbets archive with notes/transcripts.
- Sign-in is name-only (trust-based) + cookie backup + personal invite links.

## Stack (all free tier)
Cloudflare Workers + static assets (`public/`), D1 (`thu-bros-db`, binding DB), KV (SOHBET),
Workers AI (Whisper for Turkish transcription, gpt-oss-120b for summaries), hourly Cron.
No framework on the front end: `public/app.js` renders with template strings + event
delegation (`data-a="action"`), bottom sheets via `openSheet()`.

## Layout
- `lib/core.mjs` – pure rules engine (weeks, queue, host rota, actions, `view()`).
  **Copy to `public/core.mjs` after any change** (`cp lib/core.mjs public/core.mjs`);
  a test fails if they differ. Used by the visitor preview.
- `lib/server.mjs` – `/api` (GET state, POST action), `tick()`; optimistic locking in `lib/d1-store.mjs`.
- `lib/archive-server.mjs` – `/api/*` router (recap, transcripts, private notes, AI) →
  `chat-server`, `stats-server`, `push.mjs` (web push, VAPID key stored in D1, RFC 8291 by hand),
  `backup.mjs` (weekly backup into D1, keeps last 8).
- `cloudflare/worker.mjs` – entry. `public/sw.js` – service worker (push only).
- `dev-server.mjs` – local server with D1/KV stand-ins: `NO_MEDIA=1 node --no-warnings dev-server.mjs`
  → http://localhost:8888 (`NOW_OFFSET_DAYS=3` fakes the date).
- `wrangler.jsonc` – bindings. Visitor preview: `/?demo` (runs locally in the browser).

## Rules of the road
- Run `npm test` before every push (core, archive, chat+D1, backup, push tests).
- Bump the `?v=N` on `app.js`/`styles.css` in `public/index.html` when front-end files change
  (phones cache hard).
- Make the front end readable: min ~16px text, 40px+ tap targets, check light AND dark mode,
  check at 390px wide (iPhone).
- Share messages to members are **Turkish using English letters only** (no ç ş ğ ı ö ü), short, warm.
- Don't add paid services. Don't store audio server-side (R2 isn't enabled).
- Don't touch real data; use the dev server for experiments.
- Commit small, clear messages.

## Language (English | Türkçe | Mix)
`public/i18n.js`, `public/en.js`, `public/tr.js`. Three versions of the same app, chosen on the sign-in screen
or in Profile (`?lang=en|tr|mix` previews):
- **Mix** (default, the original): English with Turkish terms (Hadis, Sohbet, Sunum, Geliyorum, Sıra).
- **English**: full English; `en.js` replaces the Turkish terms (Hadith, Discussion, Talk, I'm coming...).
- **Türkçe**: full Turkish; `tr.js`.
The Mix English text in the code is the key: wrap UI strings in `T("Mix text")` (`T("{n} left", { n })` for
variables). Anything missing from `en.js`/`tr.js` falls back to the key. TR voice: warm friend in the group,
"sen", short, Islamic phrases only where natural. Same word for the same thing (ev sahibi, sunum, sohbet,
hadis, Geliyorum / Gelemiyorum, Sıra). Turkish shows full month names (Kasım).
Translated so far: main screen. TODO: sheets/forms, toasts, tour, chat, notifications, archive, recording.
Bump the `?v=` in the `i18n.js` import inside app.js together with index.html.

## Versions
- **v1.0** (branch `v1`): original layout.
- **v1.2** (current `main`): "This week" card at the top (time, place, host, sunum, RSVP), calmer page,
  examples behind a link, recap card only from Thursday, weekly backup, push notifications.

## Roadmap / ideas
- EN | TR language toggle (sign-in screen + Profile; default = phone language; keep current as is).
- Wire push to real events (sunum open, host confirmed, Thursday morning reminder), opt-in per type.
- Monday nudges / reminders for Ihsan, Harun and the host to post (Furkan thinks it's a bit early).
- Host ✎/cancel are limited to host + admin (done). Chat exists but may be dropped later.
