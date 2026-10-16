import test from "node:test";
import assert from "node:assert/strict";
import { applySuggestion, captureSuggestion, suggestionSnapshotState, type SuggestionSources } from "./suggestion-snapshot";
import type { CalendarEvent, MarketContext } from "./live-types";
import { paramsKey } from "./study-identity";

const now = Date.parse("2026-10-16T04:54:10Z");
const at = (offset = 0) => new Date(now + offset).toISOString();
function sources(): SuggestionSources {
  return {
    online: true, connectionRevision: 0,
    quote: { symbol: "XUL10", price: 4170, bid: null, ask: null, asOf: at(), source: "Newsmaker" },
    context: {
      history: { status: "ready", receivedAt: at(), message: null, analysis: {
        source: "LGD Daily", timeframe: "D1", basis: "gold-reference", candleCount: 129,
        firstDate: "2026-04-01", lastDate: "2026-10-15", lastClose: 4170,
        ma20: 4201, ma50: 4334, trend: "down", atr14: 81.74, atrBaseline: 91.89,
        atrPercent: 1.96, support20: 4000, resistance20: 4500,
      } },
      calendar: { status: "ready", complete: true, timezone: "Asia/Jakarta", events: [], generatedAt: at(), receivedAt: at(), message: null },
      news: { status: "ready", items: [], receivedAt: at(), message: null, fundamental: {
        status: "assessed", evaluatedAt: at(), scope: "Selected articles only", reasons: [], evidence: [{
          slug: "gold", title: "Gold", url: "https://example.com/gold", publishedAt: at(), reviewedAt: at(),
          category: "Gold", source: "Newsmaker", excerpt: "Gold uncertainty", rationale: "Relevant context",
          contentHash: "a".repeat(64), tag: "covered",
        }],
      } },
    },
  };
}

test("ticks during capital editing cannot rewrite or apply the frozen offer", () => {
  const live = sources(), snapshot = captureSuggestion(20000, live, now);
  const before = structuredClone(snapshot);
  live.quote!.price = 4180;
  live.context!.history.analysis!.atr14 = 100;
  live.context!.calendar.events.push({ id: "new" } as CalendarEvent);
  live.context!.news.fundamental!.evidence[0].excerpt = "Changed article";
  const state = suggestionSnapshotState(snapshot, 30000, live, now);
  assert.equal(state.parametersChanged, true);
  assert.equal(state.dataChanged, true);
  assert.equal(state.canApply, false);
  assert.deepEqual(snapshot, before);
  assert.equal(snapshot.result.target, 20);
  assert.equal(snapshot.result.spacing, 41);
});

test("each source update/failure blocks application without changing the displayed snapshot", () => {
  const mutations: ((s: SuggestionSources) => void)[] = [
    s => { s.quote!.asOf = at(1000); },
    s => { s.quote = null; },
    s => { s.context = null; },
    s => { s.context!.history.analysis!.atr14 = 100; },
    s => { s.context!.history.status = "unavailable"; },
    s => { s.context!.calendar.generatedAt = at(1000); },
    s => { s.context!.calendar.complete = false; },
    s => { s.context!.calendar.events = [{ name: "CPI" } as CalendarEvent]; },
    s => { s.context!.news.status = "unavailable"; },
    s => { s.context!.news.fundamental!.evidence[0].tag = "high-uncertainty"; },
    s => { s.context!.news.items.push({ slug: "new" } as MarketContext["news"]["items"][number]); },
  ];
  for (const mutate of mutations) {
    const live = sources(), snapshot = captureSuggestion(20000, live, now), before = structuredClone(snapshot);
    assert.equal(suggestionSnapshotState(snapshot, 20000, live, now).canApply, true);
    mutate(live);
    assert.equal(suggestionSnapshotState(snapshot, 20000, live, now).canApply, false);
    assert.deepEqual(snapshot, before);
  }
});

test("each source expires independently even without another poll", () => {
  for (const prepare of [
    (_s: SuggestionSources) => {},
    (s: SuggestionSources) => { s.context!.calendar.generatedAt = at(-899000); },
    (s: SuggestionSources) => { s.context!.news.fundamental!.evaluatedAt = at(-899000); },
    (s: SuggestionSources) => { s.context!.news.fundamental!.evidence[0].publishedAt = at(-86399000); },
    (s: SuggestionSources) => {
      s.context!.news.fundamental!.evidence[0].publishedAt = at(-86399500);
      s.context!.news.fundamental!.evidence[0].reviewedAt = at(-86399000);
    },
    (s: SuggestionSources) => { s.context!.calendar.events = [{
      id: "cpi", name: "CPI", currency: "USD", impact: "high", at: at(120 * 60000 + 1000),
    } as CalendarEvent]; },
  ]) {
    const live = sources(); prepare(live);
    const snapshot = captureSuggestion(20000, live, now);
    assert.equal(snapshot.result.status, "offered");
    assert.equal(suggestionSnapshotState(snapshot, 20000, live, now).canApply, true);
    assert.equal(suggestionSnapshotState(snapshot, 20000, live, now + 20001).canApply, false);
    // Apart from the quote-only case, isolate the other source boundary before the quote expires.
    if (snapshot.sources.context?.calendar.generatedAt !== at() ||
      snapshot.sources.context?.news.fundamental?.evaluatedAt !== at() ||
      snapshot.sources.context?.news.fundamental?.evidence[0].publishedAt !== at() ||
      snapshot.sources.context?.calendar.events.length) {
      assert.equal(suggestionSnapshotState(snapshot, 20000, live, now + 1001).canApply, false);
    }
  }
});

test("D1 closed-day freshness expires at the Jakarta day boundary", () => {
  const live = sources();
  const midnight = Date.parse("2026-10-16T17:00:00Z");
  live.quote!.asOf = new Date(midnight - 1000).toISOString();
  live.context!.calendar.generatedAt = live.quote!.asOf;
  live.context!.news.fundamental!.evaluatedAt = live.quote!.asOf!;
  live.context!.history.analysis!.lastDate = "2026-10-12";
  const snapshot = captureSuggestion(20000, live, midnight - 1000);
  assert.equal(snapshot.result.status, "offered");
  assert.equal(suggestionSnapshotState(snapshot, 20000, live, midnight + 1).canApply, false);
});

test("offline then reconnect never reactivates an old offer; explicit recapture is required", () => {
  const live = sources(), active = captureSuggestion(20000, live, now);
  live.online = false; live.connectionRevision++;
  assert.equal(suggestionSnapshotState(active, 20000, live, now).canApply, false);
  live.online = true; live.connectionRevision++;
  assert.equal(suggestionSnapshotState(active, 20000, live, now).canApply, false);
  const preview = captureSuggestion(20000, live, now + 1);
  assert.equal(suggestionSnapshotState(preview, 20000, live, now + 1).canApply, true);
  assert.notEqual(preview, active);
  assert.equal(active.result.evaluatedAt, at());
});

test("reviewing a replacement preserves the active scenario until an eligible explicit apply", () => {
  const live = sources();
  const first = captureSuggestion(20000, live, now);
  let active = applySuggestion(null, first, 20000, live, now);
  assert.equal(active, first);
  live.context!.history.analysis!.atr14 = 40;
  const preview = captureSuggestion(30000, live, now + 1);
  assert.equal(active?.result.spacing, 41);
  assert.equal(preview.result.spacing, 20);
  assert.equal(applySuggestion(active, preview, 20000, live, now + 1), active);
  assert.equal(applySuggestion(active, preview, 30000, live, now + 20001), active);
  assert.equal(applySuggestion(active, preview, 30000, live, now + 1, true), active);
  active = applySuggestion(active, preview, 30000, live, now + 1);
  assert.equal(active, preview);
  assert.equal(first.result.capital, 20000);
  for (const capital of [0, 100]) {
    const ineligible = captureSuggestion(capital, live, now + 1);
    assert.equal(applySuggestion(active, ineligible, capital, live, now + 1), active);
  }
  live.online = false;
  const offline = captureSuggestion(30000, live, now + 1);
  assert.equal(applySuggestion(active, offline, 30000, live, now + 1), active);
});

test("all six manual assumptions invalidate identity; numeric formatting does not", () => {
  const params = { modal: 20000, targetPoin: "30", strategy: "Linear Averaging", maxLayer: "3", experience: "Pemula", marketCondition: "Trending" };
  for (const patch of [{ modal: 30000 }, { targetPoin: "40" }, { strategy: "Martingale" }, { maxLayer: "4" }, { experience: "Berpengalaman" }, { marketCondition: "Sideways" }]) {
    assert.notEqual(paramsKey(params), paramsKey({ ...params, ...patch }));
  }
  assert.equal(paramsKey(params), paramsKey({ ...params, modal: "20000.00" }));
});
