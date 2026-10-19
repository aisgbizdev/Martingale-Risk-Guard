import test from "node:test";
import assert from "node:assert/strict";
import { buildScenario } from "./scenario-plan";
import { newsmakerLevels } from "./newsmaker-levels";
import { referenceSpacing } from "./reference-zones";
import { technicalReferencePlan, referenceFillStage } from "./technical-reference-plan";
import type { SuggestionSources } from "./suggestion-snapshot";

// Reproducible, synthetic examples published in Panduan & Literasi.
const time = "2026-10-19T03:00:00Z";
const display = (n: number) => n.toFixed(2);

test("guide manual examples preserve original arithmetic on both directions", () => {
  for (const side of ["buy", "sell"] as const) {
    const linear = buildScenario({ side, entry: 4500, spacing: 30, layers: 3,
      target: 30, capital: 300000, strategy: "Linear Averaging", mode: "manual", asOf: time });
    const martingale = buildScenario({ ...linear, strategy: "Martingale" });
    assert.equal(linear.totalLots, 6);
    assert.equal(martingale.totalLots, 7);
    assert.equal(linear.margin, 6000);
    assert.equal(martingale.margin, 7000);
    assert.equal(linear.stressLoss, 30000);
    assert.equal(martingale.stressLoss, 33000);
    assert.equal(linear.targetProfit, 18000);
    assert.equal(display(linear.average), side === "buy" ? "4460.00" : "4540.00");
    assert.equal(display(linear.tp), side === "buy" ? "4490.00" : "4510.00");
    assert.equal(display(martingale.average), side === "buy" ? "4457.14" : "4542.86");
    assert.equal(display(martingale.tp), side === "buy" ? "4487.14" : "4512.86");
  }
});

test("guide Pivot/Fibonacci, zone and capital examples match active suggestion functions", () => {
  const levels = newsmakerLevels({ open: 4510, high: 4540, low: 4480, close: 4500 });
  assert.equal(display(levels.classic.p), "4506.67");
  assert.equal(display(levels.classic.s4), "4349.59");
  assert.equal(levels.woodie.p, 4510);
  assert.equal(levels.camarilla.r1, 4505.5);
  assert.equal(levels.up.retracement.find(x => x.ratio === .618)!.price, 4502.92);
  assert.equal(display(levels.up.projection.find(x => x.ratio === 1.618)!.price), "4577.08");
  assert.equal(referenceSpacing(14.37).minimumGap, 2.88);
  const sources: SuggestionSources = {
    quote: { symbol: "XUL10", price: 4500, asOf: time, source: "Synthetic guide example", bid: null, ask: null },
    online: true, connectionRevision: 0,
    context: {
      history: { status: "ready", receivedAt: time, message: null, analysis: {
        source: "LGD Daily", basis: "gold-reference", timeframe: "D1",
        candleCount: 130, firstDate: "2026-04-01", lastDate: "2026-10-16",
        lastOpen: 4510, lastHigh: 4540, lastLow: 4480, lastClose: 4500,
        ma20: 4520, ma50: 4550, atr14: 40, atrBaseline: 45, atrPercent: 40 / 4500 * 100,
        support20: 4400, resistance20: 4600, trend: "down",
      } },
      calendar: { status: "unavailable", complete: false, timezone: "Asia/Jakarta",
        events: [], generatedAt: null, receivedAt: time, message: null },
      news: { status: "unavailable", items: [], receivedAt: time, fundamental: null, message: null },
    },
  };
  const plan = technicalReferencePlan(400000, sources, Date.parse(time), "buy");
  assert.deepEqual(plan.entries.map(x => display(x.price)), ["4492.84", "4480.00", "4446.67"]);
  assert.equal(display(plan.stop.price), "4413.33");
  assert.equal(plan.firstLot, 1);
  assert.equal(plan.entries[1].members.length, 2);
  const stage = referenceFillStage(plan, 3);
  assert.equal(display(stage.average), "4465.47");
  assert.equal(stage.target.price, 4502.92);
  assert.equal(display(stage.lossAtStop!), "31284.00");
  assert.equal(display(stage.profitAtTarget!), "22468.00");
  const partial = referenceFillStage(plan, 2);
  assert.equal(display(partial.average), "4484.28");
  assert.equal(partial.totalLots, 3);
  // Exact sizing threshold is based on unrounded calculations.
  assert.equal(technicalReferencePlan(300000, sources, Date.parse(time), "buy").firstLot, null);
});
