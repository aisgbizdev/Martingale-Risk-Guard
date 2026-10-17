import test from "node:test";
import assert from "node:assert/strict";
import { buildScenario, type ScenarioInput } from "./scenario-plan";
import { scenarioFillStage } from "./scenario-fill-stage";

const base: ScenarioInput = {
  side: "buy", capital: 300000, entry: 4500, spacing: 20, target: 10, layers: 3,
  strategy: "Linear Averaging", asOf: "2026-10-16T10:00:00Z", mode: "market", firstLot: 3,
};
test("L1 and L1–L2 use only filled dynamic lots; remaining planned layers stay unchanged", () => {
  const plan = buildScenario(base), original = structuredClone(plan);
  const one = scenarioFillStage(plan, 1), two = scenarioFillStage(plan, 2);
  assert.deepEqual(plan, original);
  assert.equal(one.average, 4500);
  assert.equal(one.tp, 4510);
  assert.equal(one.totalLots, 3);
  assert.equal(one.margin, 3000);
  assert.equal(one.targetProfit, 3000);
  assert.equal(one.stressPrice, 4440);
  assert.equal(one.stressLoss, 18000);
  assert.equal(two.totalLots, 9);
  assert.equal(two.margin, 9000);
  assert.equal(two.targetProfit, 9000);
  assert.ok(Math.abs(two.average - 4486.666666666667) < 1e-9);
  assert.equal(two.tp, two.average + 10);
  assert.equal(two.stressLoss, 42000);
  assert.deepEqual(two.pendingEntries, [plan.entries[2]]);
  assert.deepEqual(two.entries, plan.entries);
  assert.equal(two.entry, plan.entry);
  assert.equal(two.asOf, plan.asOf);
});
test("both sides, strategies, all prefixes and whole-lot scales retain the captured price geometry", () => {
  for (const side of ["buy", "sell"] as const)
    for (const strategy of ["Linear Averaging", "Martingale"] as const)
      for (const layers of [1, 2, 3])
        for (const firstLot of [1, 3, 20000000]) {
          const plan = buildScenario({ ...base, side, strategy, layers, firstLot });
          Object.freeze(plan.entries);
          Object.freeze(plan);
          for (let filled = 1; filled <= layers; filled++) {
            const stage = scenarioFillStage(plan, filled);
            const entries = plan.entries.slice(0, filled);
            assert.equal(stage.totalLots, entries.reduce((sum, e) => sum + e.lots, 0));
            assert.equal(stage.margin, stage.totalLots * 1000);
            assert.equal(stage.targetProfit, stage.totalLots * base.target * 100);
            assert.equal(stage.stressLoss, entries.reduce((sum, e, i) => sum + (layers - i) * base.spacing * e.lots * 100, 0));
            assert.equal(stage.stressPrice, plan.stressPrice);
            assert.equal(stage.marginPercent, stage.margin / plan.capital * 100);
            assert.equal(stage.stressPercent, stage.stressLoss / plan.capital * 100);
            assert.equal(stage.pendingEntries.length, layers - filled);
            assert.equal(stage.tp, stage.average + (side === "buy" ? base.target : -base.target));
            const unit = scenarioFillStage(buildScenario({ ...base, side, strategy, layers, firstLot: 1 }), filled);
            assert.equal(stage.average, unit.average);
            assert.equal(stage.tp, unit.tp);
            if (filled === layers) {
              const { filledLayers, filledEntries, pendingEntries, ...unchanged } = stage;
              assert.deepEqual(unchanged, plan);
              assert.equal(filledLayers, layers);
              assert.equal(filledEntries.length, layers);
              assert.deepEqual(pendingEntries, []);
            }
          }
        }
});
test("invalid stages/manual use fail explicitly; an impossible partial TP never falls back to the full TP", () => {
  const plan = buildScenario(base);
  for (const count of [0, -1, 1.5, 4, NaN, Infinity]) assert.throws(() => scenarioFillStage(plan, count), RangeError);
  assert.throws(() => scenarioFillStage(buildScenario({ ...base, mode: "manual", firstLot: 1 }), 1), RangeError);
  const extreme = buildScenario({ ...base, side: "sell", entry: 100, spacing: 50, target: 120, layers: 2 });
  assert.ok(extreme.tp > 0);
  assert.throws(() => scenarioFillStage(extreme, 1), /harga positif/);
  assert.equal(scenarioFillStage(extreme, 2).tp, extreme.tp);
});
