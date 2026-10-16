import test from "node:test";
import assert from "node:assert/strict";
import type { LiveQuote, MarketContext, CalendarEvent } from "./live-types";
import { simulateCandidate, suggestFromCapital } from "./capital-suggestion";

const now = Date.parse("2026-10-16T04:54:10Z");
const stamp = new Date(now).toISOString();
const quote: LiveQuote = { symbol: "XUL10", price: 4170.27, bid: null, ask: null, asOf: stamp, source: "Newsmaker · XUL10" };
function context(): MarketContext {
  return {
    history: { status: "ready", receivedAt: stamp, message: null, analysis: {
      source: "LGD Daily", timeframe: "D1", basis: "gold-reference", candleCount: 129,
      firstDate: "2026-04-01", lastDate: "2026-10-15", lastClose: 4170.27,
      ma20: 4201.78, ma50: 4334.38, trend: "down", atr14: 81.74, atrBaseline: 91.89,
      atrPercent: 1.96, support20: 4000, resistance20: 4500,
    } },
    calendar: { status: "ready", complete: true, timezone: "Asia/Jakarta", events: [], generatedAt: stamp, receivedAt: stamp, message: null },
    news: { status: "ready", items: [], receivedAt: stamp, message: null, fundamental: {
      status: "assessed", evaluatedAt: stamp, scope: "Selected articles only", reasons: [], evidence: [{
        slug: "gold", title: "Gold", url: "https://example.com/gold", publishedAt: stamp, reviewedAt: stamp,
        category: "Gold", source: "Newsmaker", excerpt: "Gold uncertainty", rationale: "Relevant gold context",
        contentHash: "a".repeat(64), tag: "covered",
      }],
    } },
  };
}

test("approved USD20k example: target20 spacing41, linear .1/.2 margin600 stress1640 equity18360 funds17760", () => {
  const result = suggestFromCapital(20000, context(), quote, now);
  assert.equal(result.status, "offered");
  assert.equal(result.target, 20);
  assert.equal(result.spacing, 41);
  assert.deepEqual(result.selected, {
    strategy: "Linear Averaging", layers: 2, lots: [0.1, 0.2], totalLots: 0.3,
    margin: 600, stressLoss: 1640, stressEquity: 18360, fundsAfterMargin: 17760,
    marginPercent: 3, stressPercent: 8.200000000000001, passes: true,
  });
  assert.equal(simulateCandidate(20000, 41, 3, "Linear Averaging").stressLoss, 4100);
  assert.equal(simulateCandidate(20000, 41, 3, "Linear Averaging").passes, false);
  assert.equal(simulateCandidate(20000, 41, 3, "Martingale").stressLoss, 4510);
  assert.equal(simulateCandidate(20000, 41, 3, "Martingale").margin, 1400);
});

test("all four data sources affect availability and technicals/fundamentals alter candidates", () => {
  const data = context();
  data.history.analysis!.lastClose = 4250;
  data.history.analysis!.trend = "mixed";
  const result = suggestFromCapital(100000, data, quote, now);
  assert.equal(result.candidates.length, 4);
  assert.equal(result.selected?.layers, 3);
  assert.equal(result.selected?.strategy, "Linear Averaging");
  data.news.fundamental!.evidence[0].tag = "high-uncertainty";
  assert.equal(suggestFromCapital(100000, data, quote, now).candidates.length, 1);
  data.history.analysis!.atr14 = 40;
  assert.equal(suggestFromCapital(100000, data, quote, now).target, 10);
  assert.equal(suggestFromCapital(100000, data, quote, now).spacing, 20);
  assert.equal(suggestFromCapital(100000, data, { ...quote, price: 20 }, now).status, "incomplete");
});

test("missing, malformed, stale, failed and offline data never yield a substitute scenario", () => {
  for (const mutate of [
    (d: MarketContext) => { d.history.status = "unavailable"; },
    (d: MarketContext) => { d.history.analysis!.lastDate = "2026-10-01"; },
    (d: MarketContext) => { d.history.analysis!.atr14 = NaN; },
    (d: MarketContext) => { d.history.analysis!.atr14 = 0.1; },
    (d: MarketContext) => { d.calendar.complete = false; },
    (d: MarketContext) => { d.calendar.generatedAt = new Date(now - 900001).toISOString(); },
    (d: MarketContext) => { d.calendar.timezone = "UTC"; },
    (d: MarketContext) => { d.news.status = "unavailable"; },
    (d: MarketContext) => { delete d.news.fundamental; },
    (d: MarketContext) => { d.news.fundamental!.status = "incomplete"; },
    (d: MarketContext) => { d.news.fundamental!.evidence = []; },
    (d: MarketContext) => { d.news.fundamental!.evidence[0].excerpt = ""; },
    (d: MarketContext) => { d.news.fundamental!.evidence[0].publishedAt = new Date(now - 86400001).toISOString(); },
    (d: MarketContext) => { d.news.fundamental!.evaluatedAt = "invalid"; },
  ]) {
    const data = context(); mutate(data);
    const result = suggestFromCapital(20000, data, quote, now);
    assert.equal(result.status, "incomplete");
    assert.equal(result.selected, null);
    assert.equal(result.target, null);
    assert.equal(result.candidates.length, 0);
  }
  for (const q of [null, { ...quote, asOf: new Date(now - 20001).toISOString() }, { ...quote, price: NaN }]) {
    assert.equal(suggestFromCapital(20000, context(), q, now).status, "incomplete");
  }
  assert.equal(suggestFromCapital(20000, undefined, quote, now).status, "incomplete");
  assert.equal(suggestFromCapital(20000, context(), quote, now, false).status, "incomplete");
  for (const capital of [0, -1, NaN, Infinity, 1e12 + 1]) assert.equal(suggestFromCapital(capital, context(), quote, now).status, "incomplete");
});

test("calendar inclusive window, unknown time or impact defer; outside the window permits", () => {
  for (const [minutes, deferred] of [[-15.001, false], [-15, true], [120, true], [120.001, false]] as const) {
    const data = context();
    data.calendar.events = [{
      id: "usd", currency: "USD", impact: "high", name: "CPI", at: new Date(now + minutes * 60000).toISOString(),
    } as CalendarEvent];
    assert.equal(suggestFromCapital(20000, data, quote, now).status, deferred ? "deferred" : "offered");
    data.calendar.events[0].at = null;
    assert.equal(suggestFromCapital(20000, data, quote, now).status, "deferred");
    data.calendar.events[0].impact = "unknown";
    assert.equal(suggestFromCapital(20000, data, quote, now).status, "deferred");
  }
});

test("capital boundaries, margin vs stress, no negative funds disguised as safety, no study metrics", () => {
  assert.equal(simulateCandidate(16400, 41, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(16399, 41, 2, "Linear Averaging").passes, false);
  assert.equal(simulateCandidate(3000, 1, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(2999, 1, 2, "Linear Averaging").passes, false);
  assert.equal(suggestFromCapital(100, context(), quote, now).status, "no-fit");
  assert.equal(simulateCandidate(100, 41, 2, "Linear Averaging").fundsAfterMargin, -2140);
  const data = context(), before = JSON.stringify(data);
  const result = suggestFromCapital(20000, data, quote, now);
  assert.equal(JSON.stringify(data), before);
  for (const key of ["score", "pf", "rom", "er"]) assert.equal(key in result, false);
  assert.throws(() => simulateCandidate(100, 0, 2, "Martingale"));
});
