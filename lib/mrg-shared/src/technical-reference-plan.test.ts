import test from "node:test";
import assert from "node:assert/strict";
import type { CapitalSuggestion } from "./capital-suggestion";
import { technicalReferencePlan, referenceFillStage } from "./technical-reference-plan";
import { newsmakerLevels } from "./newsmaker-levels";

function fixture(capital = 100000, unrestricted = false): CapitalSuggestion {
  return {
    status: "no-fit", capital, evaluatedAt: "2026-10-19T03:00:00Z", reasons: [],
    quote: { symbol: "XUL10", price: 4178.59, asOf: "2026-10-19T03:00:00Z", bid: null, ask: null, source: "Newsmaker · XUL10" },
    reference: { status: "ready", receivedAt: "2026-10-19T03:00:00Z", key: "fixture", analysis: {
      source: "LGD Daily", basis: "gold-reference", timeframe: "D1", candleCount: 130,
      firstDate: "2026-04-01", lastDate: "2026-10-16",
      lastOpen: 4164.47, lastHigh: 4198.45, lastLow: 4147.22, lastClose: 4168.94,
      ma20: 4200, ma50: 4300, atr14: 81, atrBaseline: 90, atrPercent: 2,
      support20: 4000, resistance20: 4400, trend: "down",
    } }, calendar: null, fundamental: null, target: 20, spacing: 41,
    candidates: (unrestricted ? [2, 3] : [2]).flatMap(layers => (unrestricted ? ["Linear Averaging", "Martingale"] as const : ["Linear Averaging"] as const)
      .map(strategy => ({ strategy, layers, lots: [], totalLots: 0, margin: 0, stressLoss: 0,
        stressEquity: 0, fundsAfterMargin: 0, marginPercent: 0, stressPercent: 0, passes: false }))),
    selected: null,
  };
}

test("LGD plan survives old capital no-fit and uses genuine nonuniform formula levels, both sides", () => {
  for (const side of ["buy", "sell"] as const) {
    const input = fixture();
    const copy = structuredClone(input);
    const plan = technicalReferencePlan(input, side);
    assert.equal(plan.source, "LGD Daily");
    assert.equal(plan.sourceDate, "2026-10-16");
    assert.equal(plan.entries.length, 2);
    assert.equal(plan.limited, true);
    const sign = side === "buy" ? 1 : -1;
    assert.ok(sign * (plan.selectionQuote.price - plan.entries[0].price) > 0);
    assert.ok(sign * (plan.entries[0].price - plan.entries[1].price) > 0);
    assert.ok(sign * (plan.entries.at(-1)!.price - plan.stop.price) > 0);
    const levels = newsmakerLevels({ open: 4164.47, high: 4198.45, low: 4147.22, close: 4168.94 });
    const prices = [...Object.values(levels.classic), ...(side === "buy" ? levels.up : levels.down).retracement.map(l => l.price), 4147.22, 4198.45];
    for (const e of [...plan.entries, plan.stop, ...plan.targets]) assert.ok(prices.includes(e.price));
    const gap1 = Math.abs(plan.entries[0].price - plan.entries[1].price);
    const gap2 = Math.abs(plan.entries[1].price - plan.stop.price);
    assert.notEqual(gap1, gap2);
    for (let n = 1; n <= 2; n++) {
      const stage = referenceFillStage(plan, n);
      assert.ok(sign * (stage.target.price - stage.average) > 0);
      assert.ok(stage.lossAtStop! > 0 && stage.lossAtStop! <= input.capital * .1 + .01);
      assert.ok(stage.margin! <= input.capital * .2);
    }
    assert.deepEqual(input, copy);
  }
});

test("capital changes sizing not level geometry; small capital retains prices without fractional or invented lots", () => {
  for (const side of ["buy", "sell"] as const) {
    const small = technicalReferencePlan(fixture(10), side);
    const big = technicalReferencePlan(fixture(300000), side);
    assert.deepEqual(small.entries, big.entries);
    assert.deepEqual(small.stop, big.stop);
    assert.deepEqual(small.targets, big.targets);
    assert.equal(small.firstLot, null);
    assert.ok(big.firstLot! >= 1 && Number.isInteger(big.firstLot));
    for (const n of [1, 2]) {
      const stage = referenceFillStage(small, n);
      assert.equal(stage.totalLots, null);
      assert.equal(stage.margin, null);
      assert.equal(stage.lossAtStop, null);
      assert.equal(stage.profitAtTarget, null);
      assert.equal(stage.average, referenceFillStage(big, n).average);
    }
  }
});

test("three layers and Martingale only when context permits; partial fills keep sizing and stop fixed", () => {
  assert.throws(() => technicalReferencePlan(fixture(), "buy", "Martingale"));
  for (const side of ["buy", "sell"] as const) {
    for (const strategy of ["Linear Averaging", "Martingale"] as const) {
      const plan = technicalReferencePlan(fixture(300000, true), side, strategy);
      assert.equal(plan.entries.length, 3);
      assert.deepEqual(plan.weights, strategy === "Martingale" ? [1, 2, 4] : [1, 2, 3]);
      const firstLot = plan.firstLot!;
      const whole = referenceFillStage(plan, 3);
      const first = referenceFillStage(plan, 1);
      assert.equal(first.totalLots, firstLot);
      assert.equal(first.average, plan.entries[0].price);
      assert.ok(first.lossAtStop! < whole.lossAtStop!);
      assert.equal(first.lossAtStop, Math.abs(plan.entries[0].price - plan.stop.price) * firstLot * 100);
      assert.throws(() => referenceFillStage(plan, 0));
      assert.throws(() => referenceFillStage(plan, 4));
      assert.throws(() => referenceFillStage(plan, 1.5));
    }
  }
});

test("missing/stale/deferred context, bad OHLC, flat range and lack of technical structure fail explicitly", () => {
  for (const status of ["incomplete", "deferred"] as const) {
    const f = fixture(); f.status = status;
    assert.throws(() => technicalReferencePlan(f, "buy"));
  }
  const missing = fixture(); delete missing.reference.analysis!.lastOpen;
  assert.throws(() => technicalReferencePlan(missing, "buy"), /OHLC/);
  const flat = fixture(); Object.assign(flat.reference.analysis!, { lastHigh: 4168.94, lastLow: 4168.94, lastOpen: 4168.94 });
  assert.throws(() => technicalReferencePlan(flat, "buy"), /datar/);
  const bad = fixture(); bad.reference.analysis!.lastHigh = 4100;
  assert.throws(() => technicalReferencePlan(bad, "buy"), /OHLC/);
  const far = fixture(); far.quote!.price = 999999;
  assert.throws(() => technicalReferencePlan(far, "sell"), /Belum ada level/);
});
