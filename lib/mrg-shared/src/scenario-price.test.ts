import test from "node:test";
import assert from "node:assert/strict";
import { resolveScenarioPrice, XUL10_SOURCE } from "./scenario-price";
import { quoteIsFresh, type LiveQuote, type MarketContext } from "./live-types";
import { suggestFromCapital } from "./capital-suggestion";
import { captureSuggestion, suggestionSnapshotState, type SuggestionSources } from "./suggestion-snapshot";
import { marketScenario } from "./market-scenario";
import { buildScenario } from "./scenario-plan";

const saturday = Date.parse("2026-10-17T13:00:00Z");
const sunday = Date.parse("2026-10-18T13:00:00Z");
const lastTick: LiveQuote = {
  symbol: "XUL10", price: 4165.18, bid: 4164.78, ask: 4165.58,
  asOf: "2026-10-16T22:37:59.000Z", source: XUL10_SOURCE,
};
const quote = (asOf: string | null) => ({ ...lastTick, asOf });
function context(now: number): MarketContext {
  const at = new Date(now).toISOString();
  return {
    history: { status: "ready", receivedAt: at, message: null, analysis: {
      source: "LGD Daily", timeframe: "D1", basis: "gold-reference",
      candleCount: 130, firstDate: "2026-04-01", lastDate: "2026-10-16",
      lastOpen: 4100, lastHigh: 4200, lastLow: 4050, lastClose: 4165,
      ma20: 4200, ma50: 4300, trend: "down", atr14: 80, atrBaseline: 90,
      atrPercent: 1.92, support20: 4000, resistance20: 4500,
    } },
    calendar: { status: "ready", complete: true, events: [], timezone: "Asia/Jakarta",
      generatedAt: at, receivedAt: at, message: null },
    news: { status: "ready", items: [], receivedAt: at, message: null, fundamental: {
      status: "incomplete", evaluatedAt: at, scope: "Fixture, unassessed", evidence: [], reasons: ["Unknown impact"],
    } },
  };
}
function sources(now = saturday): SuggestionSources {
  return { online: true, connectionRevision: 0, context: context(now), quote: { ...lastTick },
    priceBasis: resolveScenarioPrice(lastTick, now, true)! };
}

test("dated XUL10 last tick is a historical reference on Saturday and Sunday, never fresh or an official close", () => {
  for (const now of [saturday, sunday]) {
    const basis = resolveScenarioPrice(lastTick, now, true);
    assert.equal(basis?.kind, "historical");
    assert.deepEqual(basis?.quote, lastTick);
    assert.notEqual(basis?.quote, lastTick);
    assert.equal(quoteIsFresh(lastTick, now), false);
    assert.equal("close" in basis!, false);
  }
});

test("no fallback during weekday feed failure, or from an unavailable provider/offline", () => {
  assert.equal(resolveScenarioPrice(lastTick, Date.parse("2026-10-19T02:00:00Z"), true), null);
  assert.equal(resolveScenarioPrice(lastTick, saturday, false), null);
  assert.equal(resolveScenarioPrice(quote("2026-10-16T02:00:00Z"), Date.parse("2026-10-16T03:00:00Z"), true), null);
});

test("reject unknown/malformed/future timestamps, earlier sessions, wrong symbols/sources and invalid prices", () => {
  for (const bad of [
    quote(null), quote("bad"), quote("2026-10-16T22:37:59"), quote("2026-10-18T22:00:00Z"),
    quote("2026-10-15T12:00:00Z"), quote("2026-10-09T22:00:00Z"),
    { ...lastTick, symbol: "LGD Daily" } as unknown as LiveQuote,
    { ...lastTick, source: "OANDA:XAUUSD" }, { ...lastTick, price: NaN }, { ...lastTick, price: -1 },
  ]) assert.equal(resolveScenarioPrice(bad, saturday, true), null);
  assert.equal(resolveScenarioPrice(lastTick, NaN, true), null);
  // WIB crosses into Monday while it is still Sunday UTC: no weekend claim.
  assert.equal(resolveScenarioPrice(lastTick, Date.parse("2026-10-18T17:00:00Z"), true), null);
});

test("a genuine fresh tick always wins even on a weekend, without changing the live 20-second limit", () => {
  const fresh = quote(new Date(saturday - 1000).toISOString());
  assert.equal(resolveScenarioPrice(fresh, saturday, true)?.kind, "live");
  assert.equal(quoteIsFresh(fresh, saturday), true);
  assert.equal(quoteIsFresh(fresh, saturday + 20_000), false);
});

test("historical suggestions require explicit matching basis; limited status and both directions are preserved", () => {
  const s = sources();
  assert.equal(suggestFromCapital(20000, s.context, s.quote, saturday, true, true).status, "incomplete");
  const capture = captureSuggestion(200000, s, saturday, true);
  assert.equal(capture.result.status, "limited");
  assert.equal(capture.result.selected?.strategy, "Linear Averaging");
  assert.equal(capture.result.selected?.layers, 2);
  assert.ok(capture.result.reasons.some(r => r.includes("bukan harga live")));
  for (const side of ["buy", "sell"] as const) {
    const plan = marketScenario(capture.result, side);
    assert.equal(plan.entry, lastTick.price);
    assert.equal(plan.asOf, lastTick.asOf);
    assert.equal(plan.priceBasis?.kind, "historical");
    assert.equal(plan.entries[1].price, lastTick.price + (side === "buy" ? -40 : 40));
    assert.ok(side === "buy" ? plan.tp > plan.average : plan.tp < plan.average);
    assert.ok(plan.marginPercent <= 20 && plan.stressPercent <= 10);
  }
  const forged = { ...s, priceBasis: { ...s.priceBasis!, quote: { ...lastTick, price: 9999 } } };
  assert.equal(captureSuggestion(20000, forged, saturday, true).result.status, "incomplete");
});

test("historical price does not move D1/calendar/news checks to Friday or relax capital limits", () => {
  const mutations: ((s: SuggestionSources) => void)[] = [
    s => { s.context!.calendar.generatedAt = lastTick.asOf; },
    s => { s.context!.calendar.complete = false; },
    s => { s.context!.news.receivedAt = lastTick.asOf!; },
    s => { s.context!.news.status = "unavailable"; },
    s => { s.context!.history.analysis!.lastDate = "2026-10-01"; },
  ];
  for (const mutate of mutations) {
    const s = sources(); mutate(s);
    assert.equal(captureSuggestion(20000, s, saturday, true).result.status, "incomplete");
  }
  const blocked = sources();
  blocked.context!.calendar.events = [{
    id: "cpi", name: "USD CPI", currency: "USD", impact: "high",
    date: "2026-10-17", time: "20:30", at: new Date(saturday + 30 * 60_000).toISOString(),
    previous: null, forecast: null, actual: null, explanation: null, source: "fixture",
  }];
  assert.equal(captureSuggestion(20000, blocked, saturday, true).result.status, "deferred");
  assert.equal(captureSuggestion(100, sources(), saturday, true).result.status, "no-fit");
  const offline = sources(); offline.online = false;
  assert.equal(captureSuggestion(20000, offline, saturday, true).result.status, "incomplete");
});

test("expired historical windows or resumed live ticks invalidate, never rewrite captured plans", () => {
  const s = sources();
  const capture = captureSuggestion(200000, s, saturday, true);
  const before = structuredClone(capture);
  const plan = marketScenario(capture.result, "sell");
  assert.equal(suggestionSnapshotState(capture, 200000, s, saturday).canApply, true);
  const fresh = { ...s, quote: quote(new Date(saturday).toISOString()), priceBasis: undefined };
  assert.equal(suggestionSnapshotState(capture, 200000, fresh, saturday).dataChanged, true);
  assert.equal(suggestionSnapshotState(capture, 200000, s, Date.parse("2026-10-19T01:00:00Z")).canApply, false);
  assert.equal(suggestionSnapshotState(capture, 210000, s, saturday).parametersChanged, true);
  assert.deepEqual(capture, before);
  assert.equal(plan.entry, 4165.18);
  assert.equal(plan.priceBasis?.kind, "historical");
  assert.equal(plan.asOf, lastTick.asOf);
});

test("manual historical diagrams remain separate from original study rules and validate basis identity", () => {
  const input = { capital: 20000, entry: lastTick.price, spacing: 30, target: 30, layers: 3,
    strategy: "Linear Averaging" as const, asOf: lastTick.asOf!, mode: "manual" as const,
    priceBasis: resolveScenarioPrice(lastTick, saturday, true)! };
  for (const side of ["buy", "sell"] as const) {
    const plan = buildScenario({ ...input, side });
    assert.equal(plan.entries.length, 3);
    assert.equal(plan.priceBasis?.quote.price, plan.entry);
  }
  assert.throws(() => buildScenario({ ...input, side: "buy", entry: 9999 }), /Acuan harga/);
});
