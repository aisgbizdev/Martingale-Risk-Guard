import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDaily, finitePrice, normalizeCandles, providerTimestamp, validDate } from "./market-analysis";
import { EMPTY_SETTINGS, portfolioSchema, positionSchema, quoteIsFresh, type DailyCandle, type LiveQuote, type MarketContext, type Position } from "./live-types";
import { compareSimulation, evaluatePositionRisk, stressScenarios, summarizePositions } from "./position-risk";
import { normalizeQuote } from "../../../artifacts/api-server/src/market/prices";

const NOW = Date.parse("2026-10-14T13:00:00Z");
const quote: LiveQuote = { symbol: "XUL10", price: 95, bid: 94.6, ask: 95.4, asOf: new Date(NOW).toISOString(), source: "test" };
const position: Position = { id: "one", symbol: "XUL10", side: "buy", entry: 100, lots: 1, enteredAt: null };
const settings = { ...EMPTY_SETTINGS, maxLots: 10, maxLayers: 5 };
function context(): MarketContext {
  return {
    history: { status: "ready", receivedAt: new Date(NOW).toISOString(), message: null,
      analysis: { source: "LGD Daily", timeframe: "D1", basis: "gold-reference",
        candleCount: 60, firstDate: "2026-08-01", lastDate: "2026-10-13", lastClose: 100,
        ma20: 100, ma50: 99, atr14: 2, atrBaseline: 1, atrPercent: 2,
        support20: 90, resistance20: 110, trend: "up" } },
    calendar: { status: "ready", complete: true, receivedAt: new Date(NOW).toISOString(),
      generatedAt: new Date(NOW).toISOString(), timezone: "Asia/Jakarta", message: null, events: [] },
    news: { status: "ready", items: [], receivedAt: new Date(NOW).toISOString(), message: null },
  };
}
function candles(count = 74): DailyCandle[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.parse("2026-08-01") + i * 86_400_000).toISOString().slice(0, 10);
    return { date, open: 100 + i, close: 100.5 + i, high: 101 + i, low: 99 + i };
  });
}
test("strict daily date parsing includes valid leap dates and rejects impossible dates", () => {
  assert.equal(validDate("01 Jun 2026"), "2026-06-01");
  assert.equal(validDate("2024-02-29"), "2024-02-29");
  for (const bad of ["2026-02-29", "2026-04-31", "2026-13-01", "1 Jun 2026", "", null]) assert.equal(validDate(bad), null);
});
test("provider dotted Jakarta clock is converted accurately", () => {
  assert.equal(providerTimestamp("2026-10-14 20.30", "Asia/Jakarta"), "2026-10-14T13:30:00.000Z");
  assert.equal(providerTimestamp("2026-10-14T20:30:00+07:00", "Asia/Jakarta"), "2026-10-14T13:30:00.000Z");
});
test("unknown zones, all-day times, invalid clocks and timezone-free timestamps are not invented", () => {
  for (const bad of ["2026-10-14 All Day", "2026-10-14 24:00", "2026-10-14 12:60", "2026-02-30 09:00"]) {
    assert.equal(providerTimestamp(bad, "Asia/Jakarta"), null);
  }
  assert.equal(providerTimestamp("2026-10-14 12:00", "Europe/London"), null);
  assert.equal(providerTimestamp("2026-02-30T09:00:00Z", "Asia/Jakarta"), null);
  assert.equal(providerTimestamp("2026-10-14T24:00:00Z", "Asia/Jakarta"), null);
});
test("prices reject missing, blank, zero, negative and nonfinite inputs", () => {
  assert.equal(finitePrice("95.4"), 95.4);
  for (const bad of ["", " ", null, NaN, Infinity, 0, -1]) assert.equal(finitePrice(bad), null);
});
test("OHLC normalizes chronologically but rejects malformed rows and duplicate dates", () => {
  assert.equal(normalizeCandles(candles().reverse())[0].date, "2026-08-01");
  assert.throws(() => normalizeCandles([...candles(), candles()[0]]), /Duplicate/);
  assert.throws(() => normalizeCandles([{ ...candles()[0], high: 90 }]), /Invalid/);
  assert.throws(() => normalizeCandles([{ ...candles()[0], low: 103 }]), /Invalid/);
  assert.throws(() => normalizeCandles({}), /Invalid/);
});
test("MA20/50 and Wilder ATR match a deterministic reference series", () => {
  const result = analyzeDaily(candles(), NOW);
  assert.equal(result.ma20, 100.5 + (54 + 73) / 2);
  assert.equal(result.ma50, 100.5 + (24 + 73) / 2);
  assert.equal(result.atr14, 2);
  assert.equal(result.atrBaseline, 2);
  assert.equal(result.trend, "up");
  assert.equal(result.timeframe, "D1");
  assert.equal(result.basis, "gold-reference");
});
test("current-day daily candle is excluded, not passed off as closed", () => {
  assert.equal(analyzeDaily(candles(75), NOW).candleCount, 74);
});
test("insufficient, stale, gapped and flat ATR histories fail explicitly", () => {
  assert.throws(() => analyzeDaily(candles(20), NOW), /50/);
  assert.throws(() => analyzeDaily(candles(60), NOW), /old/);
  const gap = candles().filter((_, i) => i < 20 || i > 30);
  assert.throws(() => analyzeDaily(gap, NOW), /gap/);
  assert.throws(() => analyzeDaily(candles().map((c) => ({ ...c, open: 100, close: 100, high: 100, low: 100 })), NOW), /ATR/);
});
test("quote freshness uses quote timestamp, not poll timestamp", () => {
  assert.equal(quoteIsFresh(quote, NOW), true);
  assert.equal(quoteIsFresh(quote, NOW + 20_001), false);
  assert.equal(quoteIsFresh({ ...quote, asOf: null }, NOW), false);
  assert.equal(quoteIsFresh({ ...quote, asOf: new Date(NOW + 11_000).toISOString() }, NOW), false);
});
test("weighted average and total exposure are correct", () => {
  assert.deepEqual(summarizePositions([position, { ...position, id: "two", entry: 90, lots: 2 }]),
    { totalLots: 3, layers: 2, averageEntry: 280 / 3 });
  assert.deepEqual(summarizePositions([]), { totalLots: 0, layers: 0, averageEntry: null });
});
test("different directions cannot be netted or averaged", () => {
  assert.throws(() => summarizePositions([position, { ...position, id: "sell", side: "sell" }]), /same/);
  assert.throws(() => compareSimulation([position], { ...position, side: "sell" }, settings, quote, context(), NOW), /same/);
});
test("zero, negative and nonfinite position data cannot enter calculations", () => {
  for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => summarizePositions([{ ...position, lots: bad }]));
  assert.throws(() => summarizePositions([{ ...position, entry: 0 }]));
});
test("portfolio rejects duplicate IDs, unsupported instruments, and fractional layer limits", () => {
  assert.equal(portfolioSchema.safeParse({ version: 1, positions: [position, position], settings }).success, false);
  assert.equal(portfolioSchema.safeParse({ version: 1, positions: [{ ...position, symbol: "OTHER" }], settings }).success, false);
  assert.equal(portfolioSchema.safeParse({ version: 1, positions: [], settings: { ...settings, maxLayers: 1.5 } }).success, false);
});
test("initial component weights are 40/20/15/15/10 and score is reproducible", () => {
  const result = evaluatePositionRisk([position], settings, quote, context(), NOW);
  assert.deepEqual(result.components.map((c) => c.max), [40, 20, 15, 15, 10]);
  assert.deepEqual(result.components.map((c) => c.points), [4, 4, 12.5, 15, 0]);
  assert.equal(result.score, 36);
  assert.equal(result.level, "moderate");
  assert.deepEqual(result, evaluatePositionRisk([position], settings, quote, context(), NOW));
});
test("same risk rules apply to adverse sell positions", () => {
  const result = evaluatePositionRisk([{ ...position, side: "sell", entry: 90 }], settings, quote, context(), NOW);
  assert.equal(result.components.find((c) => c.key === "adverse")!.points, 12.5);
});
test("empty positions, absent user limits, stale or missing quotes give no aggregate score", () => {
  assert.equal(evaluatePositionRisk([], settings, quote, context(), NOW).score, null);
  assert.equal(evaluatePositionRisk([position], EMPTY_SETTINGS, quote, context(), NOW).score, null);
  assert.equal(evaluatePositionRisk([position], settings, null, context(), NOW).score, null);
  assert.equal(evaluatePositionRisk([position], settings, quote, context(), NOW + 30_000).score, null);
});
test("unavailable or old daily history prevents an aggregate score", () => {
  const value = context();
  value.history.status = "unavailable";
  assert.equal(evaluatePositionRisk([position], settings, quote, value, NOW).score, null);
  const old = context();
  old.history.analysis!.lastDate = "2026-10-01";
  assert.equal(evaluatePositionRisk([position], settings, quote, old, NOW).score, null);
});
test("calendar failure, incomplete pagination and old cache never become zero event risk", () => {
  for (const modify of [
    (c: MarketContext) => { c.calendar.status = "unavailable"; },
    (c: MarketContext) => { c.calendar.complete = false; },
    (c: MarketContext) => { c.calendar.generatedAt = new Date(NOW - 16 * 60_000).toISOString(); },
  ]) {
    const value = context(); modify(value);
    assert.equal(evaluatePositionRisk([position], settings, quote, value, NOW).score, null);
  }
});
function event(minutes: number, impact: "high" | "medium" = "high") {
  return { id: "cpi", name: "Synthetic test event", currency: "USD", impact,
    date: "2026-10-14", time: "20.30", at: new Date(NOW + minutes * 60_000).toISOString(),
    previous: null, forecast: null, actual: null, explanation: null, source: null };
}
test("event timing covers past release, imminent release, later release and excludes low relevance", () => {
  for (const [minutes, points] of [[-16, 0], [-15, 10], [60, 10], [61, 5], [120, 5], [121, 0]]) {
    const value = context(); value.calendar.events = [event(minutes)];
    assert.equal(evaluatePositionRisk([position], settings, quote, value, NOW).components.at(-1)!.points, points);
  }
  const value = context(); value.calendar.events = [{ ...event(10), currency: "EUR" }];
  assert.equal(evaluatePositionRisk([position], settings, quote, value, NOW).components.at(-1)!.points, 0);
});
test("untimed high-impact USD events make event pressure unknown, not zero", () => {
  const value = context();
  value.calendar.events = [{ ...event(10), at: null, time: "All Day" }];
  assert.equal(evaluatePositionRisk([position], settings, quote, value, NOW).score, null);
});
test("exceeding personal limits gives warnings while preserving component caps", () => {
  const result = evaluatePositionRisk([{ ...position, lots: 20 }], { ...settings, maxLayers: 1 }, quote, context(), NOW);
  assert.equal(result.components[0].points, 40);
  assert.equal(result.components[1].points, 20);
  assert.ok(result.warnings.some((w) => w.en.includes("lots exceed")));
  assert.equal(result.level, "high");
});
test("low/medium boundary 35 and high boundary 61 match displayed model", () => {
  const value = context(); value.history.analysis!.atrBaseline = 2;
  for (const [lots, score, level] of [[7.75, 35, "low"], [8, 36, "moderate"], [10, 44, "moderate"]] as const) {
    const result = evaluatePositionRisk([{ ...position, entry: 95, lots }], settings, quote, value, NOW);
    assert.equal(result.score, score); assert.equal(result.level, level);
  }
});
test("simulation uses one snapshot and never mutates recorded positions", () => {
  const positions = [position];
  const result = compareSimulation(positions, { ...position, id: "new", entry: 90, lots: 2 }, settings, quote, context(), NOW);
  assert.equal(result.before.summary.totalLots, 1);
  assert.equal(result.after.summary.totalLots, 3);
  assert.equal(result.after.summary.averageEntry, 280 / 3);
  assert.equal(positions.length, 1);
  assert.ok(result.warning.en.includes("exposure"));
});
test("60 remains moderate and 61 is high using the same rounded score as the UI", () => {
  const value = context();
  value.history.analysis!.atrBaseline = 2;
  value.calendar.events = [event(30)];
  const limits = { ...settings, maxLayers: 2 };
  const group = [{ ...position, entry: 95, lots: 10 }];
  const moderate = evaluatePositionRisk(group, limits, quote, value, NOW);
  assert.equal(moderate.score, 60); assert.equal(moderate.level, "moderate");
  value.history.analysis!.atrBaseline = 1.875;
  const high = evaluatePositionRisk(group, limits, quote, value, NOW);
  assert.equal(high.score, 61); assert.equal(high.level, "high");
});
test("stress scenarios are price moves, not monetary loss or forecasts", () => {
  assert.equal(stressScenarios([position], 100)[2].scenarioPrice, 98);
  assert.equal(stressScenarios([{ ...position, side: "sell" }], 100)[2].scenarioPrice, 102);
  assert.throws(() => stressScenarios([position], NaN), /Invalid/);
});
test("custom stress percentages remain explicit hypothetical moves with no safe buffer claim", () => {
  assert.equal(stressScenarios([position], 100, [3, 5])[1].scenarioPrice, 95);
  assert.equal(stressScenarios([{ ...position, entry: 80 }], 100, [3])[0].adverseDistance, 0);
  for (const values of [[], [0], [-1], [100], [Infinity], [NaN]]) {
    assert.throws(() => stressScenarios([position], 100, values), /percentages/);
  }
});
test("position timestamps are explicitly unknown or valid timezone-aware instants", () => {
  assert.equal(positionSchema.safeParse({ ...position, enteredAt: null }).success, true);
  assert.equal(positionSchema.safeParse({ ...position, enteredAt: "2026-10-14T19:00:15+07:00" }).success, true);
  for (const enteredAt of ["bad", "2026-02-30T19:00:00Z", "2026-10-14T19:00:00"]) {
    assert.equal(positionSchema.safeParse({ ...position, enteredAt }).success, false);
  }
});
test("a fresh documented quote row enables the index, and its stale tick disables it", () => {
  const packet = { status: "success", updatedAt: new Date(NOW + 60_000).toISOString(),
    data: [{ instrument: "XAU/USD", symbol: "XUL10", price: 95, buy: 95.4, sell: 94.6,
      serverTime: "20:00:00", updatedAt: new Date(NOW).toISOString() }] };
  const fresh = normalizeQuote(packet);
  assert.equal(quoteIsFresh(fresh, NOW), true);
  assert.equal(evaluatePositionRisk([position], settings, fresh, context(), NOW).score, 36);
  packet.data[0].updatedAt = new Date(NOW - 21_000).toISOString();
  const stale = normalizeQuote(packet);
  assert.equal(quoteIsFresh(stale, NOW), false);
  assert.equal(evaluatePositionRisk([position], settings, stale, context(), NOW).score, null);
});
