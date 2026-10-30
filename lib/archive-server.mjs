// Archive endpoints (Cloudflare Worker): recap notes, transcripts, audio parts, transcription, summaries.
// env: { SOHBET (KV), MEDIA? (R2), AI? (Workers AI), ANTHROPIC_API_KEY?, CLAUDE_MODEL?, FAKE_AI? }
import { handleRequest } from "./server.mjs";
import { SYSTEM_PROMPT, buildUserPrompt, parseSummary, cleanRecap } from "./recap.mjs";
import { handleChat } from "./chat-server.mjs";
import { handleStats } from "./stats-server.mjs";

const json = (b, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const WEEK = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(4, "0");
const MAX_TRANSCRIPT = 400_000; // ~ several hours of speech

export async function handleArchive(req, env, store) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\//, "");
  const week = url.searchParams.get("week") || "";
  const needWeek = () => { if (!WEEK.test(week)) throw Object.assign(new Error("Bad week"), { status: 400 }); };

  try {
    if (route === "chat" || route.startsWith("chat/")) return await handleChat(req, env, store, url);
    if (route === "visit" || route === "stats") return await handleStats(req, env, store, url);

    // Full notes + transcript + audio list for one week
    if (route === "recap" && req.method === "GET") {
      needWeek();
      const [recap, transcript] = await Promise.all([
        env.SOHBET.get(`recap:${week}`, { type: "json" }),
        env.SOHBET.get(`tx:${week}`),
      ]);
      let audio = [];
      if (env.MEDIA) {
        const l = await env.MEDIA.list({ prefix: `audio/${week}/` });
        audio = l.objects.map((o) => ({ key: o.key, size: o.size }));
      }
      return json({ recap, transcript: transcript || "", audio, mediaEnabled: !!env.MEDIA, aiEnabled: !!(env.ANTHROPIC_API_KEY || env.AI || env.FAKE_AI) });
    }

    // Save notes (+ transcript), then update the lightweight meta in the shared state
    if (route === "recap" && req.method === "POST") {
      needWeek();
      const body = await req.json();
      const r = cleanRecap(body);
      r.updatedAt = Date.now(); r.updatedBy = String(body.actor || "");
      const writes = [env.SOHBET.put(`recap:${week}`, JSON.stringify(r))];
      if (typeof body.transcript === "string") {
        const t = body.transcript.slice(0, MAX_TRANSCRIPT);
        writes.push(t.trim() ? env.SOHBET.put(`tx:${week}`, t) : env.SOHBET.delete(`tx:${week}`));
      }
      await Promise.all(writes);
      let audioParts = 0;
      if (env.MEDIA) audioParts = (await env.MEDIA.list({ prefix: `audio/${week}/` })).objects.length;
      const metaReq = new Request(new URL("/api", url), {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "setRecapMeta", actor: body.actor, weekId: week, title: r.title, tags: r.tags,
          snippet: r.summary.slice(0, 280), hasTranscript: !!(body.transcript || "").trim(), audioParts, attendees: r.attendees,
        }),
      });
      return handleRequest(metaReq, store);
    }

    // Save the running transcript (recorder/upload calls this after each part)
    if (route === "transcript" && req.method === "POST") {
      needWeek();
      const t = (await req.text()).slice(0, MAX_TRANSCRIPT);
      await env.SOHBET.put(`tx:${week}`, t);
      return json({ ok: true });
    }

    // Keep one audio part (raw WAV body) — only when R2 is enabled
    if (route === "audio" && req.method === "PUT") {
      needWeek();
      const part = parseInt(url.searchParams.get("part"), 10);
      if (!env.MEDIA) return json({ stored: false });
      await env.MEDIA.put(`audio/${week}/${pad(part)}.wav`, req.body, { httpMetadata: { contentType: "audio/wav" } });
      return json({ stored: true });
    }
    if (route === "audio" && req.method === "GET") {
      const key = url.searchParams.get("key") || "";
      if (!env.MEDIA || !/^audio\/\d{4}-\d{2}-\d{2}\/\d{4}\.wav$/.test(key)) return json({ error: "Not found" }, 404);
      const o = await env.MEDIA.get(key);
      if (!o) return json({ error: "Not found" }, 404);
      return new Response(o.body, { headers: { "content-type": "audio/wav", "cache-control": "private, max-age=86400" } });
    }

    // Transcribe one ~60s part. Body = base64 of a 16 kHz mono WAV (encoded on the phone to save server CPU).
    if (route === "transcribe" && req.method === "POST") {
      const b64 = await req.text();
      if (!b64) return json({ error: "No audio" }, 400);
      if (env.FAKE_AI) return json({ text: `(test transcript of part ${url.searchParams.get("part")})` });
      if (!env.AI) return json({ error: "Transcription is not set up" }, 501);
      const lang = url.searchParams.get("lang") || "tr";
      const res = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio: b64, language: lang });
      return json({ text: (res?.text || "").trim() });
    }

    // Draft notes from a transcript with Claude (not saved until the user reviews and taps Save)
    if (route === "summarize" && req.method === "POST") {
      const { transcript = "", context = {} } = await req.json();
      if (transcript.trim().length < 40) return json({ error: "Transcript is too short to summarize" }, 400);
      if (env.FAKE_AI) return json({ draft: parseSummary(JSON.stringify({ title: "Test özet", summary: "Bu bir test özetidir.", hadis: "• Test", sohbet: "• Test", sunum: "", questions: "• Test?", tags: ["test", "tevekkül"] })) });
      const prompt = buildUserPrompt(transcript.slice(0, MAX_TRANSCRIPT), context);
      if (!env.ANTHROPIC_API_KEY) {
        // Free path: Cloudflare Workers AI (counts toward the free daily allowance)
        if (!env.AI) return json({ error: "Summaries aren't set up" }, 501);
        const res = await env.AI.run(env.SUMMARY_MODEL || "@cf/openai/gpt-oss-120b", {
          messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
          max_tokens: 4000,
        });
        const text = typeof res === "string" ? res
          : res?.response ?? res?.choices?.[0]?.message?.content ?? res?.output_text
          ?? (res?.output || []).flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("") ?? "";
        if (!text) return json({ error: "The AI didn't return a summary — try again" }, 502);
        return json({ draft: parseSummary(typeof text === "string" ? text : JSON.stringify(text)) });
      }
      // Optional: Claude, if an ANTHROPIC_API_KEY secret is ever added
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: env.CLAUDE_MODEL || "claude-sonnet-5-5",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: `Claude error: ${j?.error?.message || r.status}` }, 502);
      const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      return json({ draft: parseSummary(text) });
    }

    // Private prep notes: only for the person running that part (hadis / sohbet / sunum) that week.
    if (route === "private") {
      needWeek();
      const part = url.searchParams.get("part");
      if (!["hadis", "sohbet", "sunum"].includes(part)) return json({ error: "Bad part" }, 400);
      const actor = url.searchParams.get("actor") || "";
      const { data: st } = await store.load();
      const m = st?.members?.find((x) => x.id === actor);
      if (!m) return json({ error: "Pick your name first" }, 401);
      const role = part === "sunum" ? st.weeks?.[week]?.konu?.presenterId : st.settings?.roles?.[part];
      if (role !== actor && !(part !== "sunum" && !role)) return json({ error: "These notes are only for the person running this part" }, 403);
      const key = `priv:${actor}:${week}:${part}`;
      if (req.method === "GET") return json({ text: (await env.SOHBET.get(key)) || "" });
      if (req.method === "POST") {
        const t = (await req.text()).slice(0, 20000);
        await (t.trim() ? env.SOHBET.put(key, t) : env.SOHBET.delete(key));
        return json({ ok: true });
      }
    }

    // Personal notebook: every member's own notes per sohbet, visible only to them.
    if (route === "mynotes") {
      const actor = url.searchParams.get("actor") || "";
      const { data: st } = await store.load();
      if (!st?.members?.some((x) => x.id === actor)) return json({ error: "Pick your name first" }, 401);
      const key = `mynotes:${actor}`;
      const notes = (await env.SOHBET.get(key, { type: "json" })) || {};
      if (req.method === "GET") return json({ notes });
      if (req.method === "POST") {
        needWeek();
        const t = (await req.text()).slice(0, 20000);
        if (t.trim()) notes[week] = t; else delete notes[week];
        await env.SOHBET.put(key, JSON.stringify(notes));
        return json({ ok: true });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message || "Server error" }, e.status || 500);
  }
}
