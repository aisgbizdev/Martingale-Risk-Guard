import test from "node:test";
import assert from "node:assert/strict";
import type { LiveQuote, MarketContext, CalendarEvent } from "./live-types";
import { simulateCandidate, sizeCandidate, suggestFromCapital } from "./capital-suggestion";
import { marketScenario } from "./market-scenario";
import { buildScenario } from "./scenario-plan";
import { captureSuggestion, suggestionSnapshotState } from "./suggestion-snapshot";

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

test("USD200k whole-lot example: target20 spacing41, lots1/2 margin3000 stress16400", () => {
  const result = suggestFromCapital(200000, context(), quote, now);
  assert.equal(result.status, "offered");
  assert.equal(result.target, 20);
  assert.equal(result.spacing, 41);
  assert.deepEqual(result.selected, {
    strategy: "Linear Averaging", layers: 2, lots: [1, 2], totalLots: 3,
    margin: 3000, stressLoss: 16400, stressEquity: 183600, fundsAfterMargin: 180600,
    marginPercent: 1.5, stressPercent: 8.200000000000001, passes: true,
  });
  assert.equal(simulateCandidate(200000, 41, 3, "Linear Averaging").stressLoss, 41000);
  assert.equal(simulateCandidate(20000, 41, 3, "Linear Averaging").passes, false);
  assert.equal(simulateCandidate(200000, 41, 3, "Martingale").stressLoss, 45100);
  assert.equal(simulateCandidate(200000, 41, 3, "Martingale").margin, 7000);
});

test("all four data sources affect availability and technicals/fundamentals alter candidates", () => {
  const data = context();
  data.history.analysis!.lastClose = 4250;
  data.history.analysis!.trend = "mixed";
  const result = suggestFromCapital(500000, data, quote, now);
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
    assert.equal(suggestFromCapital(200000, data, quote, now).status, deferred ? "deferred" : "offered");
    data.calendar.events[0].at = null;
    assert.equal(suggestFromCapital(20000, data, quote, now).status, "deferred");
    data.calendar.events[0].impact = "unknown";
    assert.equal(suggestFromCapital(20000, data, quote, now).status, "deferred");
  }
});

test("capital boundaries, margin vs stress, no negative funds disguised as safety, no study metrics", () => {
  assert.equal(simulateCandidate(164000, 41, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(163999, 41, 2, "Linear Averaging").passes, false);
  assert.equal(simulateCandidate(15000, 1, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(14999, 1, 2, "Linear Averaging").passes, false);
  assert.equal(suggestFromCapital(100, context(), quote, now).status, "no-fit");
  assert.equal(simulateCandidate(100, 41, 2, "Linear Averaging").fundsAfterMargin, -19300);
  const data = context(), before = JSON.stringify(data);
  const result = suggestFromCapital(20000, data, quote, now);
  assert.equal(JSON.stringify(data), before);
  for (const key of ["score", "pf", "rom", "er"]) assert.equal(key in result, false);
  assert.throws(() => simulateCandidate(100, 0, 2, "Martingale"));
});

test("approved limited policy produces Linear two layers, never neutral or a full assessment", () => {
  const data = context();
  data.history.analysis!.lastClose = 4250;
  data.history.analysis!.trend = "mixed";
  data.news.fundamental = {
    status: "incomplete", evaluatedAt: stamp, scope: "No editorial impact tags",
    reasons: ["Penilaian redaksi belum tersedia."], evidence: [],
  };
  assert.equal(suggestFromCapital(100000, data, quote, now).status, "incomplete");
  const result = suggestFromCapital(200000, data, quote, now, true, true);
  assert.equal(result.status, "limited");
  assert.equal(result.fundamental?.status, "incomplete");
  assert.match(result.reasons[0], /bukan netral/);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.selected?.strategy, "Linear Averaging");
  assert.equal(result.selected?.layers, 2);
  assert.equal(result.target, 20);
  assert.equal(result.spacing, 41);
  assert.equal(result.selected?.margin, 3000);
  assert.equal(result.selected?.stressLoss, 16400);
});

test("missing, invalid, stale, future, conflicting and archived AI assessments remain limited", () => {
  for (const mutate of [
    (d: MarketContext) => { delete d.news.fundamental; },
    (d: MarketContext) => { d.news.fundamental!.evidence = []; },
    (d: MarketContext) => { d.news.fundamental!.evaluatedAt = new Date(now - 900001).toISOString(); },
    (d: MarketContext) => { d.news.fundamental!.evidence[0].publishedAt = new Date(now + 1000).toISOString(); },
    (d: MarketContext) => { d.news.fundamental!.status = "incomplete"; d.news.fundamental!.reasons = ["Conflicting reviews"]; },
    (d: MarketContext) => { d.news.fundamental!.evidence[0].excerpt = ""; },
    (d: MarketContext) => { d.news.fundamental!.evidence[0].reviewMethod = "ai"; },
  ]) {
    const d = context(); mutate(d);
    const result = suggestFromCapital(200000, d, quote, now, true, true);
    assert.equal(result.status, "limited");
    assert.equal(result.selected?.layers, 2);
    assert.equal(result.candidates.some(c => c.strategy === "Martingale"), false);
  }
});

test("limited policy still blocks missing/stale required sources and still defers USD calendar risk", () => {
  for (const mutate of [
    (d: MarketContext) => { d.history.status = "unavailable"; },
    (d: MarketContext) => { d.calendar.complete = false; },
    (d: MarketContext) => { d.news.status = "unavailable"; },
    (d: MarketContext) => { d.news.receivedAt = new Date(now - 900001).toISOString(); },
  ]) {
    const d = context(); delete d.news.fundamental; mutate(d);
    assert.equal(suggestFromCapital(100000, d, quote, now, true, true).status, "incomplete");
  }
  const d = context(); delete d.news.fundamental;
  d.calendar.events = [{ id: "cpi", name: "CPI", currency: "USD", impact: "high", at: stamp } as CalendarEvent];
  assert.equal(suggestFromCapital(100000, d, quote, now, true, true).status, "deferred");
  assert.equal(suggestFromCapital(100000, d, quote, now, false, true).status, "incomplete");
  assert.equal(suggestFromCapital(100000, context(), { ...quote, asOf: new Date(now - 21000).toISOString() }, now, true, true).status, "incomplete");
});

test("three layers are available only with valid full assessment and qualifying conditions/capital", () => {
  const d = context(); d.history.analysis!.trend = "mixed"; d.history.analysis!.lastClose = 4250;
  const result = suggestFromCapital(500000, d, quote, now, true, true);
  assert.equal(result.status, "offered");
  assert.equal(result.selected?.layers, 3);
  d.news.fundamental!.status = "incomplete";
  assert.equal(suggestFromCapital(500000, d, quote, now, true, true).selected?.layers, 2);
  assert.equal(suggestFromCapital(100, d, quote, now, true, true).status, "no-fit");
});

test("a limited snapshot builds symmetric Buy/Sell diagrams from the captured quote and exact candidate math", () => {
  const d = context(); delete d.news.fundamental;
  const result = suggestFromCapital(200000, d, quote, now, true, true);
  const buy = marketScenario(result, "buy"), sell = marketScenario(result, "sell");
  for (const plan of [buy, sell]) {
    assert.equal(plan.mode, "market");
    assert.equal(plan.entry, quote.price);
    assert.equal(plan.asOf, quote.asOf);
    assert.equal(plan.margin, result.selected?.margin);
    assert.equal(plan.stressLoss, result.selected?.stressLoss);
    assert.equal(plan.layers, 2);
  }
  assert.ok(buy.entries[1].price < buy.entry);
  assert.ok(sell.entries[1].price > sell.entry);
  assert.ok(buy.tp > buy.average);
  assert.ok(sell.tp < sell.average);
  assert.throws(() => marketScenario({ ...result, status: "incomplete" }, "buy"));
  assert.throws(() => marketScenario({ ...result, selected: { ...result.selected!, layers: 3 } }, "sell"));
});

test("limited captures remain frozen and expire without becoming a three-layer or full suggestion", () => {
  const d = context(); delete d.news.fundamental;
  const sources = { context: d, quote: { ...quote }, online: true, connectionRevision: 0 };
  const snap = captureSuggestion(200000, sources, now, true);
  assert.equal(snap.result.status, "limited");
  assert.equal(suggestionSnapshotState(snap, 200000, sources, now).canApply, true);
  assert.equal(suggestionSnapshotState(snap, 200000, sources, now + 21000).canApply, false);
  assert.equal(suggestionSnapshotState(snap, 300000, sources, now).canApply, false);
  sources.quote.price += 10;
  assert.equal(suggestionSnapshotState(snap, 200000, sources, now).canApply, false);
  assert.equal(snap.result.quote?.price, quote.price);
  assert.equal(snap.result.status, "limited");
  assert.equal(snap.result.selected?.layers, 2);
});

test("automatic whole first lot responds to capital and spacing, not theoretical margin capacity", () => {
  for (const [capital, lots, margin, stress] of [
    [100000, [1, 2], 3000, 8000],
    [200000, [2, 4], 6000, 16000],
    [300000, [3, 6], 9000, 24000],
  ] as const) {
    const c = sizeCandidate(capital, 20, 2, "Linear Averaging");
    assert.deepEqual(c.lots, [...lots]);
    assert.equal(c.margin, margin);
    assert.equal(c.stressLoss, stress);
    assert.equal(c.passes, true);
    const d = context(); d.history.analysis!.atr14 = 40;
    const offered = suggestFromCapital(capital, d, quote, now, true, true);
    assert.deepEqual(offered.selected?.lots, [...lots], "The real suggestion path uses dynamic sizing");
  }
  assert.equal(sizeCandidate(100000, 40, 2, "Linear Averaging").passes, false);
  for (const capital of [200000, 300000])
    assert.deepEqual(sizeCandidate(capital, 40, 2, "Linear Averaging").lots, [1, 2]);
  assert.deepEqual(sizeCandidate(300000, 20, 3, "Martingale").lots, [1, 2, 4]);
  assert.deepEqual(sizeCandidate(600000, 20, 3, "Martingale").lots, [2, 4, 8]);
});

test("dynamic lots round down at both budget boundaries and maximize only inside those fixed limits", () => {
  for (const [capital, spacing, passes] of [
    [160000, 40, true], [159999, 40, false], [15000, 1, true], [14999, 1, false],
  ] as const) assert.equal(sizeCandidate(capital, spacing, 2, "Linear Averaging").passes, passes);
  for (const capital of [100000, 200000, 300000, 600000, 1e12])
    for (const spacing of [1, 20, 40, 41, 60])
      for (const layers of [2, 3]) for (const strategy of ["Linear Averaging", "Martingale"] as const) {
        const c = sizeCandidate(capital, spacing, layers, strategy);
        assert.ok(c.lots.every(n => Number.isSafeInteger(n) && n >= 1));
        if (!c.passes) {
          assert.equal(c.lots[0], 1);
          continue;
        }
        assert.ok(c.margin <= capital * .2 && c.stressLoss <= capital * .1);
        assert.equal(simulateCandidate(capital, spacing, layers, strategy, c.lots[0] + 1).passes, false);
        for (const side of ["buy", "sell"] as const) {
          const plan = buildScenario({ capital, spacing, layers, strategy, side, entry: 4500.27,
            target: 20, mode: "market", asOf: stamp, firstLot: c.lots[0] });
          const unit = buildScenario({ capital, spacing, layers, strategy, side, entry: 4500.27,
            target: 20, mode: "market", asOf: stamp });
          assert.deepEqual(plan.entries.map(e => e.lots), c.lots);
          assert.deepEqual(plan.entries.map(e => e.price), unit.entries.map(e => e.price));
          assert.ok(Math.abs(plan.average - unit.average) < 1e-8);
          assert.ok(Math.abs(plan.tp - unit.tp) < 1e-8);
          assert.equal(plan.margin, c.margin);
          assert.equal(plan.stressLoss, c.stressLoss);
          assert.equal(plan.targetProfit, c.totalLots * 20 * 100);
        }
      }
  for (const firstLot of [0, -1, .1, NaN, Infinity])
    assert.throws(() => simulateCandidate(300000, 20, 2, "Linear Averaging", firstLot));
});

test("dynamic snapshots preserve sized lots on either side and never leak sizing into manual defaults", () => {
  const d = context(); d.history.analysis!.atr14 = 40;
  const sources = { context: d, quote: { ...quote }, online: true, connectionRevision: 0 };
  const captured = captureSuggestion(300000, sources, now, true);
  const frozen = structuredClone(captured);
  for (const side of ["buy", "sell"] as const) {
    const plan = marketScenario(captured.result, side);
    assert.deepEqual(plan.entries.map(e => e.lots), [3, 6]);
    assert.equal(plan.margin, 9000);
    assert.equal(plan.stressLoss, 24000);
    const manualInput = { capital: 300000, spacing: 30, layers: 3, strategy: "Linear Averaging" as const,
      side, entry: quote.price, target: 30, mode: "manual" as const, asOf: stamp };
    const before = buildScenario(manualInput);
    assert.deepEqual(before.entries.map(e => e.lots), [1, 2, 3]);
    assert.equal(before.margin, 6000);
    assert.equal(before.stressLoss, 30000);
    assert.equal(before.targetProfit, 18000);
    assert.throws(() => buildScenario({ ...manualInput, firstLot: 3 }));
    assert.deepEqual(buildScenario(manualInput), before);
  }
  assert.equal(suggestionSnapshotState(captured, 300000, sources, now).canApply, true);
  assert.equal(suggestionSnapshotState(captured, 200000, sources, now).canApply, false);
  sources.context.history.analysis!.atr14 = 80;
  assert.equal(suggestionSnapshotState(captured, 300000, sources, now).canApply, false);
  assert.equal(suggestionSnapshotState(captured, 300000, sources, now + 21000).canApply, false);
  assert.deepEqual(captured, frozen);
  const forged = structuredClone(captured.result); forged.selected!.lots[1] += 1;
  assert.throws(() => marketScenario(forged, "buy"), /Hitungan/);
});
