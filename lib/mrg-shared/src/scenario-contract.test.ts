import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_CONTRACT, SCENARIO_BUDGET, scenarioLots } from "./scenario-contract";
import { simulateCandidate } from "./capital-suggestion";
import { buildScenario } from "./scenario-plan";

test("agreed contract: whole first lot, USD1000 margin, USD100 per one whole price point", () => {
  assert.deepEqual(SCENARIO_CONTRACT, { firstLot: 1, marginPerLot: 1000, dollarsPerPointPerLot: 100 });
  assert.equal(Object.isFrozen(SCENARIO_CONTRACT), true);
  assert.deepEqual(scenarioLots("Linear Averaging", 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(scenarioLots("Martingale", 5), [1, 2, 4, 8, 16]);
  for (const side of ["buy", "sell"] as const) {
    const plan = buildScenario({ side, capital: 300000, entry: 4500, spacing: 1,
      target: 1, layers: 1, strategy: "Linear Averaging", mode: "manual", asOf: "2026-10-17T01:00:00Z" });
    assert.equal(plan.entries[0].lots, 1);
    assert.equal(plan.tp, side === "buy" ? 4501 : 4499);
    assert.equal(plan.margin, 1000);
    assert.equal(plan.targetProfit, 100);
    assert.equal(plan.stressLoss, 100);
  }
});

test("300k means 300 lots of theoretical margin capacity, not an instruction to deploy them", () => {
  assert.equal(300000 / SCENARIO_CONTRACT.marginPerLot, 300);
  const plan = simulateCandidate(300000, 40, 2, "Linear Averaging");
  assert.deepEqual(plan.lots, [1, 2]);
  assert.equal(plan.totalLots, 3);
  assert.equal(plan.margin, 3000);
  assert.equal(plan.stressLoss, 16000);
  assert.equal(plan.passes, true);
  const tooSmall = simulateCandidate(20000, 40, 2, "Linear Averaging");
  assert.equal(tooSmall.stressPercent, 80);
  assert.equal(tooSmall.passes, false);
  assert.deepEqual(tooSmall.lots, [1, 2], "Never downsize to fractional lots to pass");
  assert.equal(simulateCandidate(200000, 40, 2, "Linear Averaging").passes, true);
});

test("both diagram engines and fixed budget boundaries agree without changing price geometry", () => {
  assert.deepEqual(SCENARIO_BUDGET, { marginFraction: 0.2, stressFraction: 0.1 });
  for (const side of ["buy", "sell"] as const) for (const strategy of ["Linear Averaging", "Martingale"] as const) {
    const candidate = simulateCandidate(300000, 40, 3, strategy);
    const plan = buildScenario({ side, capital: 300000, entry: 4500, spacing: 40, target: 20,
      layers: 3, strategy, asOf: "2026-10-17T01:00:00Z", mode: "market" });
    assert.deepEqual(plan.entries.map(e => e.lots), candidate.lots);
    assert.equal(plan.margin, candidate.margin);
    assert.equal(plan.stressLoss, candidate.stressLoss);
    assert.equal(plan.totalLots, candidate.totalLots);
  }
  assert.equal(simulateCandidate(160000, 40, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(159999, 40, 2, "Linear Averaging").passes, false);
  assert.equal(simulateCandidate(15000, 1, 2, "Linear Averaging").passes, true);
  assert.equal(simulateCandidate(14999, 1, 2, "Linear Averaging").passes, false);
});
