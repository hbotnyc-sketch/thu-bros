import assert from "node:assert/strict";
import { emptyState, applyAction, advance, currentWeekId, cutoffAt, cooldownLeft, HOUR, zonedTime, hostFor, view } from "../lib/core.mjs";

const TZ = "America/New_York";
const at = (ds, h) => zonedTime(ds, h, TZ);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("✓", name); };

function group(n, now) {
  const s = emptyState();
  s.settings.rotaSeeded = s.settings.rolesSeeded = s.settings.rolesSeeded2 = s.settings.prelaunchCleaned = s.settings.resetTestHosting1 = true; // isolate scenario tests from one-time setup
  applyAction(s, { type: "init", tz: TZ }, now);
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(applyAction(s, { type: "addMember", name: "M" + i }, now).id);
  return { s, ids };
}
const act = (s, now, a) => { advance(s, now); const r = applyAction(s, a, now); advance(s, now); return r; };

const FRI = at("2026-10-30", 10);
const WEEK = "2026-11-05";

t("current week is the coming Thursday; Thursday itself still counts", () => {
  const { s } = group(1, FRI);
  assert.equal(currentWeekId(s, FRI), WEEK);
  assert.equal(currentWeekId(s, at("2026-11-05", 23)), WEEK);
  assert.equal(currentWeekId(s, at("2026-11-06", 0) + 1), "2026-11-12");
});

t("cutoff is Monday 9pm local (across the DST change)", () => {
  const { s } = group(1, FRI);
  assert.equal(new Date(cutoffAt(s, WEEK)).toISOString(), "2026-11-03T02:00:00.000Z"); // EST = UTC-5
});

t("volunteer claims → cooldown until 5 others present", () => {
  const { s, ids } = group(8, FRI);
  act(s, FRI, { type: "claimKonu", weekId: WEEK, actor: ids[0], title: "Huvallahüllezi" });
  assert.equal(cooldownLeft(s, ids[0]), 5);
  assert.throws(() => act(s, FRI, { type: "claimKonu", weekId: "2026-11-12", actor: ids[0], title: "x" }), /recently/);
  // 5 others present in following weeks
  let wk = "2026-11-12";
  for (let i = 1; i <= 5; i++) {
    s.weeks[wk] ??= { ...structuredClone(s.weeks[WEEK]), id: wk, konu: null, ask: null, askLog: [] };
    act(s, FRI, { type: "claimKonu", weekId: wk, actor: ids[i], title: "t" + i });
    wk = new Date(Date.parse(wk) + 7 * 864e5).toISOString().slice(0, 10);
  }
  assert.equal(cooldownLeft(s, ids[0]), 0);
});

t("small group: cooldown capped at members − 1", () => {
  const { s, ids } = group(3, FRI);
  act(s, FRI, { type: "claimKonu", weekId: WEEK, actor: ids[0], title: "x" });
  assert.equal(cooldownLeft(s, ids[0]), 2);
});

t("no volunteer → queue asks first person at cutoff, hands off after 24h / on no", () => {
  const { s, ids } = group(4, FRI);
  advance(s, at("2026-11-02", 20));
  assert.equal(s.weeks[WEEK].ask, null, "not yet before cutoff");
  const c = at("2026-11-02", 21);
  advance(s, c);
  assert.equal(s.weeks[WEEK].ask.memberId, ids[0]);
  advance(s, c + 23 * HOUR);
  assert.equal(s.weeks[WEEK].ask.memberId, ids[0]);
  advance(s, c + 24 * HOUR);
  assert.equal(s.weeks[WEEK].ask.memberId, ids[1], "timeout → next");
  assert.deepEqual(s.queue, [ids[1], ids[2], ids[3], ids[0]], "timed-out person moved to end");
  act(s, c + 25 * HOUR, { type: "answerAsk", weekId: WEEK, actor: ids[1] });
  assert.equal(s.weeks[WEEK].ask.memberId, ids[2], "no → next immediately");
  act(s, c + 26 * HOUR, { type: "claimKonu", weekId: WEEK, actor: ids[2], title: "Miraç" });
  assert.equal(s.weeks[WEEK].konu.via, "queue");
  assert.equal(s.weeks[WEEK].ask, null);
});

t("queue skips people in cooldown; exhausted queue opens slot to anyone", () => {
  const { s, ids } = group(2, FRI);
  // ids[0] presented last week
  s.weeks["2026-10-29"] = { ...structuredClone(s.weeks[WEEK]), id: "2026-10-29", konu: { presenterId: ids[0], title: "old" } };
  const c = at("2026-11-02", 21);
  advance(s, c);
  assert.equal(s.weeks[WEEK].ask.memberId, ids[1]);
  act(s, c + HOUR, { type: "answerAsk", weekId: WEEK, actor: ids[1] });
  assert.equal(s.weeks[WEEK].ask, null, "queue exhausted");
  act(s, c + 2 * HOUR, { type: "claimKonu", weekId: WEEK, actor: ids[0], title: "steps in" });
  assert.equal(s.weeks[WEEK].konu.presenterId, ids[0]);
});

t("volunteer during an ask clears it; release reopens + restores cooldown", () => {
  const { s, ids } = group(3, FRI);
  const c = at("2026-11-02", 21);
  advance(s, c);
  act(s, c + HOUR, { type: "claimKonu", weekId: WEEK, actor: ids[2], title: "x" });
  assert.equal(s.weeks[WEEK].ask, null);
  act(s, c + 2 * HOUR, { type: "releaseKonu", weekId: WEEK, actor: ids[2] });
  assert.equal(cooldownLeft(s, ids[2]), 0);
  assert.ok(s.weeks[WEEK].ask, "queue resumes after release");
});

t("cancelled week never asks", () => {
  const { s, ids } = group(3, FRI);
  act(s, FRI, { type: "setCancelled", weekId: WEEK, actor: ids[0], cancelled: true });
  advance(s, at("2026-11-03", 12));
  assert.equal(s.weeks[WEEK].ask, null);
});

t("hadis, host, bring", () => {
  const { s, ids } = group(3, FRI);
  act(s, FRI, { type: "setHadis", weekId: WEEK, actor: ids[0], text: "Ameller niyetlere göredir.", source: "Buhârî" });
  act(s, FRI, { type: "toggleHostVolunteer", weekId: WEEK, actor: ids[1] });
  act(s, FRI, { type: "setHost", weekId: WEEK, actor: ids[1], hostId: ids[1], place: "Ahmet's", time: "20:00" });
  act(s, FRI, { type: "addBring", weekId: WEEK, actor: ids[2], item: "Baklava" });
  const w = s.weeks[WEEK];
  assert.equal(w.hadis.source, "Buhârî");
  assert.equal(w.host, ids[1]);
  assert.equal(w.bring[0].item, "Baklava");
});

t("yemek sırası: order from start date, repeats, per-week change, new names become members", () => {
  const { s } = group(1, FRI); // M0 exists
  const names = ["Berkay", "Harun", "Ahmet", "M0"];
  const r = act(s, FRI, { type: "setRota", actor: s.members[0].id, names, start: "2026-11-05" });
  assert.equal(r.created, 3);
  const nm = (wk) => s.members.find((m) => m.id === hostFor(s, wk)?.id)?.name;
  assert.equal(nm("2026-11-05"), "Berkay");
  assert.equal(nm("2026-11-12"), "Harun");
  assert.equal(nm("2026-11-26"), "M0");
  const v = view(s, FRI);
  assert.equal(s.members.find((m) => m.id === v.rotaPreview[4].host.id).name, "Berkay", "repeats after the end");
  const harun = s.members.find((m) => m.name === "Harun").id;
  act(s, FRI, { type: "setHost", weekId: "2026-11-05", actor: harun, hostId: harun });
  assert.equal(hostFor(s, "2026-11-05").id, harun); assert.ok(hostFor(s, "2026-11-05").changed);
  act(s, FRI, { type: "setHost", weekId: "2026-11-05", actor: harun, hostId: "" });
  assert.equal(nm("2026-11-05"), "Berkay", "clearing the change follows the order again");
});

t("initial yemek sırası seeds once, matches existing names, never overwrites", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  const f = applyAction(s, { type: "addMember", name: "furkan" }, FRI).id;
  advance(s, FRI);
  assert.equal(s.settings.hostRota.length, 12);
  assert.equal(s.members.length, 12, "existing Furkan reused");
  assert.equal(hostFor(s, "2026-11-05").id, s.members.find((m) => m.name === "Berkay").id);
  assert.equal(hostFor(s, "2026-12-10").id, f);
  s.settings.hostRota = [f];
  advance(s, FRI);
  assert.deepEqual(s.settings.hostRota, [f], "not re-seeded");
});

t("fixed roles: only Ihsan edits hadis, only Harun edits sohbet, only presenter edits sunum", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  advance(s, FRI); // seeds rota + roles
  const id = (n) => s.members.find((m) => m.name === n).id;
  assert.throws(() => act(s, FRI, { type: "setHadis", weekId: WEEK, actor: id("Berkay"), text: "x" }), /Only Ihsan/);
  act(s, FRI, { type: "setHadis", weekId: WEEK, actor: id("Ihsan"), text: "Hadis" });
  assert.throws(() => act(s, FRI, { type: "setSohbet", weekId: WEEK, actor: id("Ihsan"), title: "x" }), /Only Harun/);
  act(s, FRI, { type: "setSohbet", weekId: WEEK, actor: id("Harun"), title: "Tevekkül", notes: "..." });
  assert.equal(s.weeks[WEEK].sohbet.title, "Tevekkül");
  act(s, FRI, { type: "claimKonu", weekId: WEEK, actor: id("Enes"), title: "Sunum" });
  assert.throws(() => act(s, FRI, { type: "editKonu", weekId: WEEK, actor: id("Celal"), title: "y" }), /Only the presenter/);
  assert.throws(() => act(s, FRI, { type: "releaseKonu", weekId: WEEK, actor: id("Celal") }), /Only the presenter/);
  act(s, FRI, { type: "editKonu", weekId: WEEK, actor: id("Enes"), title: "Sunum 2" });
  assert.equal(s.weeks[WEEK].konu.title, "Sunum 2");
});

t("pre-launch sunum (Oct 29) is cleared once, so it doesn't count as presented", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  const f = applyAction(s, { type: "addMember", name: "Furkan" }, FRI).id;
  s.weeks["2026-10-29"] = { id: "2026-10-29", konu: { presenterId: f, title: "oops" }, ask: null, askLog: [], cancelled: false };
  advance(s, FRI);
  assert.equal(s.weeks["2026-10-29"].konu, null);
  assert.equal(cooldownLeft(s, f), 0);
});

t("presenter can remove a past entry they didn't actually give", () => {
  const { s, ids } = group(3, FRI);
  s.weeks["2026-10-22"] = { id: "2026-10-22", konu: { presenterId: ids[0], title: "x" }, ask: null, askLog: [], cancelled: false };
  assert.ok(cooldownLeft(s, ids[0]) > 0);
  act(s, FRI, { type: "releaseKonu", weekId: "2026-10-22", actor: ids[0] });
  assert.equal(cooldownLeft(s, ids[0]), 0);
});

t("hosting: rota host confirms with address + notes, or skips and the next in order is asked", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  advance(s, FRI);
  const id = (n) => s.members.find((m) => m.name === n).id;
  assert.deepEqual(hostFor(s, WEEK), { id: id("Berkay"), changed: false, confirmed: false, skipped: [] });
  assert.throws(() => act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: id("Harun") }), /Berkay is the host/);
  act(s, FRI, { type: "skipHost", weekId: WEEK, actor: id("Berkay") });
  assert.equal(hostFor(s, WEEK).id, id("Harun"), "next in order is asked");
  act(s, FRI, { type: "skipHost", weekId: WEEK, actor: id("Harun") });
  assert.equal(hostFor(s, WEEK).id, id("Ahmet"));
  act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: id("Ahmet"), place: "12 Oak St, Sterling VA", hostNotes: "Gate 1234", saveAddress: true });
  const h = hostFor(s, WEEK);
  assert.equal(h.id, id("Ahmet")); assert.ok(h.confirmed); assert.ok(h.changed);
  assert.equal(s.weeks[WEEK].hostNotes, "Gate 1234");
  assert.equal(s.members.find((m) => m.name === "Ahmet").address, "12 Oak St, Sterling VA");
  assert.equal(hostFor(s, "2026-11-12").id, id("Harun"), "the order itself is unchanged");
});

t("everyone skips → anyone can offer to host", () => {
  const s = emptyState(); s.settings.rotaSeeded = s.settings.rolesSeeded = s.settings.prelaunchCleaned = true;
  applyAction(s, { type: "init", tz: TZ }, FRI);
  const a = applyAction(s, { type: "addMember", name: "A" }, FRI).id, b = applyAction(s, { type: "addMember", name: "B" }, FRI).id;
  const c = applyAction(s, { type: "addMember", name: "C" }, FRI).id;
  act(s, FRI, { type: "setRota", actor: a, names: ["A", "B"], start: WEEK });
  act(s, FRI, { type: "skipHost", weekId: WEEK, actor: a });
  act(s, FRI, { type: "skipHost", weekId: WEEK, actor: b });
  assert.equal(hostFor(s, WEEK), null);
  act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: c, place: "C's" });
  assert.equal(hostFor(s, WEEK).id, c);
});

t("one-time reset clears Berkay's test hosting for Nov 5; resetHost does it on demand", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  s.settings.resetTestHosting1 = true; advance(s, FRI);
  const b = s.members.find((m) => m.name === "Berkay");
  act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: b.id, place: "44810 Old Ox Rd", hostNotes: "test", time: "20:00", saveAddress: true });
  assert.ok(hostFor(s, WEEK).confirmed);
  delete s.settings.resetTestHosting1; // simulate the deploy that adds the reset
  advance(s, FRI); // runs the one-time reset
  assert.equal(hostFor(s, WEEK).id, b.id); assert.equal(hostFor(s, WEEK).confirmed, false);
  assert.equal(s.weeks[WEEK].place, ""); assert.equal(s.weeks[WEEK].hostNotes, ""); assert.equal(b.address, undefined);
  act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: b.id, place: "x" });
  advance(s, FRI); assert.ok(hostFor(s, WEEK).confirmed, "reset only runs once");
  act(s, FRI, { type: "resetHost", weekId: WEEK, actor: b.id });
  assert.equal(hostFor(s, WEEK).confirmed, false);
});

t("feedback board: post, like, delete own (owner can delete any), owner marks seen", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  const f = applyAction(s, { type: "addMember", name: "Furkan" }, FRI).id;
  advance(s, FRI); // seeds roles incl. feedback → Furkan
  assert.equal(s.settings.roles.feedback, f);
  const e = s.members.find((m) => m.name === "Enes").id, c = s.members.find((m) => m.name === "Celal").id;
  act(s, FRI, { type: "postFeedback", actor: e, text: "Dark mode is great!" });
  const id = s.feedback[0].id;
  act(s, FRI, { type: "likeFeedback", actor: c, id });
  assert.deepEqual(s.feedback[0].likes, [c]);
  assert.throws(() => act(s, FRI, { type: "deleteFeedback", actor: c, id }), /own posts/);
  act(s, FRI + 1000, { type: "seenFeedback", actor: c });
  assert.equal(s.settings.feedbackSeenAt, undefined, "only the inbox owner marks seen");
  act(s, FRI + 1000, { type: "seenFeedback", actor: f });
  assert.equal(s.settings.feedbackSeenAt, FRI + 1000);
  act(s, FRI, { type: "deleteFeedback", actor: f, id });
  assert.equal(s.feedback.length, 0);
});

t("notifications: host confirm, hadis, sohbet, sunum, recap for all; targeted asks only to that person", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  advance(s, FRI);
  const id = (n) => s.members.find((m) => m.name === n).id;
  act(s, FRI, { type: "setHadis", weekId: WEEK, actor: id("Ihsan"), text: "Hadis", source: "Buhârî" });
  act(s, FRI, { type: "setSohbet", weekId: WEEK, actor: id("Harun"), title: "Tevekkül" });
  act(s, FRI, { type: "claimKonu", weekId: WEEK, actor: id("Enes"), title: "Huşu" });
  act(s, FRI, { type: "skipHost", weekId: WEEK, actor: id("Berkay") });
  act(s, FRI, { type: "confirmHost", weekId: WEEK, actor: id("Harun"), place: "x" });
  const types = s.events.map((e) => e.type).reverse();
  assert.deepEqual(types, ["hadis", "sohbet", "sunum", "hostAsk", "host"]);
  assert.equal(s.events.find((e) => e.type === "hostAsk").to, id("Harun"));
  act(s, FRI + 5, { type: "seenNotifs", actor: id("Celal") });
  assert.equal(s.members.find((m) => m.name === "Celal").notifSeenAt, FRI + 5);
});

t("visitor feedback lands for real and notifies the inbox owner", () => {
  const s = emptyState();
  applyAction(s, { type: "init", tz: TZ }, FRI);
  const f = applyAction(s, { type: "addMember", name: "Furkan" }, FRI).id;
  advance(s, FRI);
  act(s, FRI, { type: "postGuestFeedback", guest: "Yusuf (Baltimore group)", text: "We'd love this for our sohbet!" });
  assert.equal(s.feedback[0].guest, "Yusuf (Baltimore group)"); assert.equal(s.feedback[0].by, null);
  assert.equal(s.events[0].to, f); assert.equal(s.events[0].guest, "Yusuf (Baltimore group)");
});

t("geliyorum / gelemiyorum", () => {
  const { s, ids } = group(2, FRI);
  act(s, FRI, { type: "rsvp", weekId: WEEK, actor: ids[0], answer: "yes" });
  act(s, FRI, { type: "rsvp", weekId: WEEK, actor: ids[1], answer: "no" });
  act(s, FRI, { type: "rsvp", weekId: WEEK, actor: ids[1], answer: "yes" });
  assert.deepEqual(s.weeks[WEEK].rsvp, { [ids[0]]: "yes", [ids[1]]: "yes" });
});

console.log(`\n${pass} tests passed`);
import fs from "node:fs";
assert.equal(fs.readFileSync(new URL("../public/core.mjs", import.meta.url), "utf8"), fs.readFileSync(new URL("../lib/core.mjs", import.meta.url), "utf8"), "run: cp lib/core.mjs public/core.mjs");
console.log("✓ public/core.mjs in sync");
