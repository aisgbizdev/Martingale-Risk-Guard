import test from "node:test";
import assert from "node:assert/strict";
import { buildScenario, type ScenarioInput } from "./scenario-plan";
import { simulateCandidate } from "./capital-suggestion";

const base: ScenarioInput = {
  side: "buy", capital: 20000, entry: 4500, spacing: 30, target: 30, layers: 3,
  strategy: "Linear Averaging", asOf: "2026-10-16T10:00:00Z", mode: "manual",
};
test("buy diagram uses descending entries, weighted average and TP above basket", () => {
  const s = buildScenario(base);
  assert.deepEqual(s.entries.map(e => e.price), [4500, 4470, 4440]);
  assert.equal(s.average, 4460);
  assert.equal(s.tp, 4490);
  assert.equal(s.totalLots, 0.6);
  assert.equal(s.margin, 1200);
  assert.equal(s.stressPrice, 4410);
  assert.equal(s.stressLoss, 3000);
  assert.equal(s.targetProfit, 1800);
});
test("sell is symmetric, not a buy plan with renamed labels", () => {
  const b = buildScenario(base), s = buildScenario({ ...base, side: "sell" });
  assert.deepEqual(s.entries.map(e => e.price), [4500, 4530, 4560]);
  assert.equal(s.average, 4540);
  assert.equal(s.tp, 4510);
  assert.equal(s.stressPrice, 4590);
  assert.equal(s.stressLoss, b.stressLoss);
  assert.equal(s.targetProfit, b.targetProfit);
  assert.equal(s.margin, b.margin);
});
test("market candidates and diagram have identical margin/stress in either direction", () => {
  for (const side of ["buy", "sell"] as const)
    for (const strategy of ["Linear Averaging", "Martingale"] as const)
      for (const layers of [2, 3]) {
        const s = buildScenario({ ...base, side, strategy, layers, mode: "market" });
        const c = simulateCandidate(base.capital, base.spacing, layers, strategy);
        assert.equal(s.margin, c.margin);
        assert.equal(s.stressLoss, c.stressLoss);
      }
});
test("manual defaults support both strategies through five layers without changing study scores", () => {
  const s = buildScenario({ ...base, side: "sell", strategy: "Martingale", layers: 5 });
  assert.deepEqual(s.entries.map(e => e.lots), [0.1, 0.2, 0.4, 0.8, 1.6]);
  assert.equal(s.totalLots, 3.1);
  assert.equal(s.margin, 6200);
});
test("invalid input and impossible price geometry fail explicitly", () => {
  for (const patch of [
    { side: "" }, { capital: NaN }, { entry: 0 }, { target: Infinity },
    { spacing: -1 }, { layers: 0 }, { layers: 6 }, { layers: 2.5 },
    { asOf: "" }, { mode: "signal" }, { strategy: "other" },
    { entry: 20, spacing: 30 }, { side: "sell", target: 10000 },
  ]) assert.throws(() => buildScenario({ ...base, ...patch } as ScenarioInput));
});
test("snapshot is independent of subsequently mutated input and is not a price trajectory", () => {
  const input = { ...base };
  const s = buildScenario(input);
  input.entry = 5000;
  input.side = "sell";
  assert.equal(s.entry, 4500);
  assert.equal(s.side, "buy");
  assert.equal(s.asOf, base.asOf);
  assert.equal("candles" in s, false);
});
