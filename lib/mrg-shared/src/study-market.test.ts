import test from "node:test";
import assert from "node:assert/strict";
import type { CalendarEvent, MarketContext } from "./live-types";
import { getStudyReference, getStudyWarnings, studyStatusLabel } from "./study-market";
import { calculateRisk } from "../../../artifacts/api-server/src/rules";
import type { RiskInput } from "./schema";

const now = Date.parse("2026-10-16T04:54:10Z");
function context(): MarketContext {
  return {
    history: {
      status: "ready", receivedAt: new Date(now).toISOString(), message: null,
      analysis: {
        source: "LGD Daily", timeframe: "D1", basis: "gold-reference",
        candleCount: 129, firstDate: "2026-04-01", lastDate: "2026-10-15",
        lastClose: 4170.27, ma20: 4201.78, ma50: 4334.38, trend: "down",
        atr14: 81.74, atrBaseline: 91.89, atrPercent: 1.96, support20: 4000, resistance20: 4500,
      },
    },
    calendar: {
      status: "ready", complete: true, events: [], timezone: "Asia/Jakarta",
      receivedAt: new Date(now).toISOString(), generatedAt: new Date(now).toISOString(), message: null,
    },
    news: { status: "unavailable", items: [], receivedAt: new Date(now).toISOString(), message: null },
  };
}
const input: RiskInput = {
  modal: 200000, targetPoin: "30", strategy: "Martingale", maxLayer: "3",
  experience: "Berpengalaman", marketCondition: "Trending",
};
const event = (minutes: number): CalendarEvent => ({
  id: `e${minutes}`, name: "USD release", currency: "USD", impact: "high",
  date: "2026-10-16", time: "", at: new Date(now + minutes * 60_000).toISOString(),
  previous: null, forecast: null, actual: null, explanation: null, source: "Newsmaker",
});

test("approved snapshot and strategy/condition comparisons retain exact legacy results", () => {
  for (const [strategy, marketCondition, score, status] of [
    ["Martingale", "Trending", 70, "TIDAK LAYAK"],
    ["Linear Averaging", "Trending", 25, "AMAN"],
    ["Martingale", "Sideways", 55, "BERISIKO"],
    ["Linear Averaging", "Sideways", 15, "AMAN"],
  ] as const) {
    const result = calculateRisk({ ...input, strategy, marketCondition });
    assert.equal(result.score, score);
    assert.equal(result.status, status);
  }
});

test("D1 up/down suggest Trending, mixed never implies Sideways", () => {
  const data = context();
  assert.equal(getStudyReference(data, now).status, "ready");
  data.history.analysis!.lastClose = 4500;
  data.history.analysis!.ma20 = 4400;
  data.history.analysis!.trend = "up";
  assert.equal(getStudyReference(data, now).status, "ready");
  data.history.analysis!.lastClose = 4400;
  data.history.analysis!.trend = "mixed";
  assert.equal(getStudyReference(data, now).status, "mixed");
  assert.equal(getStudyReference(undefined, now).status, "unavailable");
  assert.equal(getStudyReference(data, now, false).status, "unavailable");
});

test("D1 reference rejects old, open, malformed, inconsistent and insufficient history", () => {
  for (const mutate of [
    (d: MarketContext) => { d.history.analysis!.lastDate = "2026-10-11"; },
    (d: MarketContext) => { d.history.analysis!.lastDate = "2026-10-16"; },
    (d: MarketContext) => { d.history.analysis!.lastDate = "bad"; },
    (d: MarketContext) => { d.history.analysis!.candleCount = 49; },
    (d: MarketContext) => { d.history.analysis!.ma20 = NaN; },
    (d: MarketContext) => { d.history.analysis!.trend = "up"; },
    (d: MarketContext) => { d.history.receivedAt = "invalid"; },
    (d: MarketContext) => { d.history.receivedAt = new Date(now + 10_001).toISOString(); },
  ]) {
    const data = context(); mutate(data);
    assert.equal(getStudyReference(data, now).status, "unavailable");
  }
  const data = context();
  data.history.analysis!.lastDate = "2026-10-12";
  assert.equal(getStudyReference(data, now).status, "ready", "four days are permitted");
});

test("reference key changes with analysis or received timestamp so confirmation can be invalidated", () => {
  const data = context();
  const first = getStudyReference(data, now).key;
  data.history.analysis!.lastClose -= 1;
  const second = getStudyReference(data, now).key;
  assert.notEqual(first, second);
  data.history.receivedAt = new Date(now + 1000).toISOString();
  assert.notEqual(second, getStudyReference(data, now).key);
});

test("ATR and calendar warnings do not change the study score or import position weights", () => {
  const data = context();
  data.calendar.events = [event(60)];
  const before = calculateRisk(input);
  const warnings = getStudyWarnings(data, now);
  assert.match(warnings[0].id, /lebih kecil/);
  assert.ok(warnings.some(w => w.id.includes("USD release")));
  assert.ok(warnings.every(w => !/40\/20\/15\/15\/10/.test(w.id)));
  assert.deepEqual(calculateRisk(input), before);
  const serialized = JSON.stringify(data);
  getStudyReference(data, now);
  assert.equal(JSON.stringify(data), serialized, "helpers do not modify the submitted evidence");
});

test("calendar window includes -15 to +120 minutes, excludes outside and the document's past event", () => {
  for (const [minutes, present] of [[-15.001, false], [-15, true], [120, true], [120.001, false], [-84, false]] as const) {
    const data = context(); data.calendar.events = [event(minutes)];
    assert.equal(getStudyWarnings(data, now).some(w => w.id.includes("USD release")), present);
  }
});

test("stale, incomplete, missing and offline calendar cannot masquerade as no nearby events", () => {
  for (const mutate of [
    (d: MarketContext) => { d.calendar.complete = false; },
    (d: MarketContext) => { d.calendar.generatedAt = new Date(now - 900_001).toISOString(); },
    (d: MarketContext) => { d.calendar.status = "unavailable"; },
    (d: MarketContext) => { d.calendar.generatedAt = null; },
  ]) {
    const data = context(); mutate(data);
    const warnings = getStudyWarnings(data, now);
    assert.ok(warnings.some(w => w.id.startsWith("Kalender belum")));
    assert.ok(!warnings.some(w => w.id.startsWith("Tidak ditemukan agenda")));
  }
  assert.ok(getStudyWarnings(context(), now, false).some(w => w.id.startsWith("Kalender belum")));
});

test("uncertain USD event times and impact are disclosed, non-USD events do not trigger", () => {
  const data = context();
  data.calendar.events = [{ ...event(0), at: null }, { ...event(0), impact: "unknown" }];
  assert.ok(getStudyWarnings(data, now).some(w => w.id.startsWith("Sebagian agenda")));
  data.calendar.events = [{ ...event(0), currency: "EUR" }];
  assert.ok(!getStudyWarnings(data, now).some(w => w.id.includes("USD release")));
});

test("approved labels avoid a promise of safety and retain explicit study limitation", () => {
  assert.equal(studyStatusLabel("AMAN").id, "Risiko relatif rendah");
  assert.equal(studyStatusLabel("BERISIKO").id, "Berisiko");
  assert.equal(studyStatusLabel("TIDAK LAYAK").id, "Tidak layak menurut aturan studi");
});
