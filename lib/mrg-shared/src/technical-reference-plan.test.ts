import test from "node:test";
import assert from "node:assert/strict";
import type { CapitalSuggestion } from "./capital-suggestion";
import { technicalReferencePlan as buildReferencePlan, referenceFillStage, captureReferencePlan, referenceSnapshotState } from "./technical-reference-plan";
import type { SuggestionSources } from "./suggestion-snapshot";
import type { ScenarioSide } from "./scenario-plan";
import { newsmakerLevels } from "./newsmaker-levels";
import { referenceDistance, referenceSpacing, selectReferenceZones } from "./reference-zones";
import { resolveScenarioPrice } from "./scenario-price";
import { CONTRACT_PROFILES, scenarioContract, validScenarioContract } from "./scenario-contract";

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

function sources(f: CapitalSuggestion): SuggestionSources {
  return { quote: f.quote, online: true, connectionRevision: 0, context: {
    history: { status: "ready", analysis: f.reference.analysis, receivedAt: f.reference.receivedAt!, message: null },
    calendar: f.calendar ?? { status: "unavailable", complete: false, timezone: "Asia/Jakarta", events: [],
      generatedAt: null, receivedAt: f.evaluatedAt, message: null },
    news: { status: "ready", items: [], receivedAt: f.evaluatedAt, fundamental: f.fundamental, message: null },
  } };
}
function technicalReferencePlan(f: CapitalSuggestion, side: ScenarioSide, strategy: "Linear Averaging" | "Martingale" = "Linear Averaging") {
  return buildReferencePlan(f.capital, sources(f), Date.parse(f.evaluatedAt), side, strategy);
}

test("LGD plan is independent of old capital/strategy gates and uses genuine nonuniform formula levels on both sides", () => {
  for (const side of ["buy", "sell"] as const) {
    const input = fixture(300000);
    const copy = structuredClone(input);
    const plan = technicalReferencePlan(input, side);
    assert.equal(plan.source, "LGD Daily");
    assert.equal(plan.sourceDate, "2026-10-16");
    assert.equal(plan.entries.length, 3);
    assert.equal(plan.newsUnassessed, true);
    assert.equal(plan.contextStatus, "incomplete");
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
    for (let n = 1; n <= 3; n++) {
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

test("both strategies support three structural layers despite unassessed news; partial fills keep sizing and stop fixed", () => {
  assert.equal(technicalReferencePlan(fixture(), "buy", "Martingale").entries.length, 3);
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

test("old deferred/incomplete status cannot gate plans; invalid required price/OHLC still fails explicitly", () => {
  for (const status of ["incomplete", "deferred"] as const) {
    const f = fixture(); f.status = status;
    assert.equal(technicalReferencePlan(f, "buy", "Martingale").entries.length, 3);
  }
  const missing = fixture(); delete missing.reference.analysis!.lastOpen;
  assert.throws(() => technicalReferencePlan(missing, "buy"), /OHLC/);
  const flat = fixture(); Object.assign(flat.reference.analysis!, { lastHigh: 4168.94, lastLow: 4168.94, lastOpen: 4168.94 });
  assert.throws(() => technicalReferencePlan(flat, "buy"), /datar/);
  const bad = fixture(); bad.reference.analysis!.lastHigh = 4100;
  assert.throws(() => technicalReferencePlan(bad, "buy"), /OHLC/);
  const far = fixture(); far.quote!.price = 999999;
  assert.throws(() => technicalReferencePlan(far, "sell"), /Belum ada zona/);
});

test("approved D1 zone spacing fixes the dated close-level example, without inventing formula prices", () => {
  const f = fixture(300000);
  const buy = technicalReferencePlan(f, "buy");
  assert.deepEqual(buy.previousSelection.entries.map(e => e.price.toFixed(2)), ["4172.84", "4171.54", "4166.79"]);
  assert.equal(buy.spacing.factor, .2);
  assert.equal(buy.spacing.atr14, 81);
  assert.equal(buy.spacing.minimumGap, 16.2);
  assert.deepEqual(buy.entries.map(e => e.price.toFixed(2)), ["4172.84", "4147.22", "4120.31"]);
  assert.equal(buy.stop.price.toFixed(2), "4093.39");
  assert.ok(buy.entries[0].members.some(m => m.price.toFixed(2) === "4171.54"));
  const sell = technicalReferencePlan(f, "sell");
  assert.deepEqual(sell.entries.map(e => e.price.toFixed(2)), ["4178.88", "4195.85", "4222.77"]);
  assert.equal(sell.stop.price.toFixed(2), "4247.08");
});

test("zone anchors prevent chaining, respect display boundaries and do not mutate input", () => {
  const levels = [100, 91, 82, 73, 64].map(price => ({ price, labels: [String(price)] }));
  const original = structuredClone(levels);
  const zones = selectReferenceZones(levels, 10);
  assert.deepEqual(zones.map(z => z.price), [100, 82, 64]);
  assert.deepEqual(zones[0].members.map(m => m.price), [100, 91]);
  assert.deepEqual(levels, original);
  assert.equal(selectReferenceZones([{ price: 100, labels: [] }, { price: 83.8, labels: [] }], 16.2).length, 2);
  assert.equal(selectReferenceZones([{ price: 100, labels: [] }, { price: 83.81, labels: [] }], 16.2).length, 1);
  assert.equal(selectReferenceZones([{ price: 100.004, labels: [] }, { price: 100, labels: [] }], .01).length, 1);
  assert.equal(referenceSpacing(81.74).minimumGap, 16.35);
  assert.equal(referenceSpacing(80).minimumGap, 16);
  assert.equal(referenceSpacing(.000001).minimumGap, .01);
  for (const bad of [0, -1, NaN, Infinity]) assert.throws(() => referenceSpacing(bad), /ATR14/);
});

test("zone separation applies to every strategy/capital across D1 snapshots and volatility regimes", () => {
  for (const scale of [.5, 1, 2]) for (const atr of [20, 81, 160, 300]) {
    for (const side of ["buy", "sell"] as const) {
      let geometry: unknown;
      for (const capital of [10, 100000, 200000, 300000, 1000000]) for (const strategy of ["Linear Averaging", "Martingale"] as const) {
        const f = fixture(capital);
        f.quote!.price *= scale;
        const a = f.reference.analysis!;
        for (const key of ["lastOpen", "lastHigh", "lastLow", "lastClose", "ma20", "ma50", "support20", "resistance20"] as const) a[key]! *= scale;
        a.atr14 = atr * scale; a.atrBaseline *= scale;
        const plan = technicalReferencePlan(f, side, strategy);
        const current = { entries: plan.entries, stop: plan.stop, targets: plan.targets };
        if (geometry) assert.deepEqual(current, geometry); else geometry = current;
        for (let i = 1; i < plan.entries.length; i++) assert.ok(referenceDistance(plan.entries[i - 1].price, plan.entries[i].price) >= plan.spacing.minimumGap);
        assert.ok(referenceDistance(plan.stop.price, plan.entries.at(-1)!.price) >= plan.spacing.minimumGap);
        for (let n = 1; n <= plan.entries.length; n++) {
          const stage = referenceFillStage(plan, n);
          assert.ok((side === "buy" ? 1 : -1) * (stage.target.price - stage.average) > 0);
          if (plan.firstLot === null) assert.equal(stage.margin, null);
          else {
            assert.ok(stage.margin! <= capital * .2 + .01);
            assert.ok(stage.lossAtStop! <= capital * .1 + .01);
          }
        }
      }
    }
  }
});

test("insufficient separated zones never force three entries, invalid ATR never falls back", () => {
  const f = fixture();
  f.reference.analysis!.atr14 = 300;
  const plan = technicalReferencePlan(f, "buy");
  assert.equal(plan.entries.length, 1);
  assert.ok(referenceDistance(plan.stop.price, plan.entries[0].price) >= 60);
  assert.throws(() => referenceFillStage(plan, 2));
  f.reference.analysis!.atr14 = 1000;
  assert.throws(() => technicalReferencePlan(f, "buy"), /Belum ada zona/);
  for (const atr of [0, -1, NaN, Infinity]) {
    f.reference.analysis!.atr14 = atr;
    assert.throws(() => technicalReferencePlan(f, "buy"), /ATR14/);
  }
});

test("eligible weekend reference uses the same zones and keeps its historical snapshot frozen", () => {
  const f = fixture(300000);
  const live = technicalReferencePlan(f, "buy");
  f.evaluatedAt = "2026-10-17T03:00:00Z";
  f.reference.receivedAt = f.evaluatedAt;
  f.quote!.asOf = "2026-10-16T16:00:00Z";
  const s = sources(f), now = Date.parse(f.evaluatedAt);
  const basis = resolveScenarioPrice(s.quote, now, true);
  assert.equal(basis?.kind, "historical");
  s.priceBasis = basis!;
  const snap = captureReferencePlan(f.capital, s, now, "buy", "Linear Averaging");
  assert.deepEqual(snap.plan.entries, live.entries);
  assert.deepEqual(snap.plan.stop, live.stop);
  assert.ok(snap.plan.contextReasons.some(r => /bukan live/.test(r.id)));
  const original = structuredClone(snap.plan);
  s.context!.history.analysis!.atr14 = 120;
  assert.equal(referenceSnapshotState(snap, f.capital, s, now).dataChanged, true);
  assert.deepEqual(snap.plan, original);
});

test("calendar events and unknown context change plan conditions, never geometry or strategy availability", () => {
  const f = fixture();
  const base = sources(f);
  const now = Date.parse(f.evaluatedAt);
  const initial = buildReferencePlan(f.capital, base, now, "buy", "Martingale");
  const withCalendar = structuredClone(base);
  withCalendar.context!.calendar = { status: "ready", complete: true, timezone: "Asia/Jakarta",
    generatedAt: f.evaluatedAt, receivedAt: f.evaluatedAt, message: null, events: [{
      id: "cpi", name: "USD CPI", currency: "USD", date: "2026-10-19", time: "10:00",
      impact: "high", at: f.evaluatedAt, previous: null, forecast: null, actual: null,
      explanation: null, source: "Fixture",
    }] };
  const waiting = buildReferencePlan(f.capital, withCalendar, now, "buy", "Martingale");
  assert.equal(waiting.contextStatus, "wait");
  assert.ok(waiting.contextReasons.some(r => /Tunggu agenda USD CPI/.test(r.id)));
  assert.deepEqual(waiting.entries, initial.entries);
  assert.equal(waiting.firstLot, initial.firstLot);
  const incomplete = structuredClone(withCalendar);
  incomplete.context!.calendar.complete = false;
  incomplete.context!.news.status = "unavailable";
  const unknown = buildReferencePlan(f.capital, incomplete, now, "buy", "Martingale");
  assert.equal(unknown.contextStatus, "incomplete");
  assert.deepEqual(unknown.entries, waiting.entries);
  assert.ok(unknown.contextReasons.some(r => /fundamental belum diketahui/.test(r.id)));
  withCalendar.context!.calendar.events[0].at = null;
  assert.equal(buildReferencePlan(f.capital, withCalendar, now, "sell", "Linear Averaging").contextStatus, "wait");
});

test("reference snapshots freeze geometry and flag price expiry, edits, source changes and reconnects", () => {
  const f = fixture();
  const source = sources(f), now = Date.parse(f.evaluatedAt);
  const snap = captureReferencePlan(f.capital, source, now, "buy", "Martingale");
  const original = structuredClone(snap);
  assert.deepEqual(referenceSnapshotState(snap, f.capital, source, now), { parametersChanged: false, dataChanged: false });
  assert.equal(referenceSnapshotState(snap, f.capital, source, now + 21000).dataChanged, true);
  assert.equal(referenceSnapshotState(snap, 200000, source, now).parametersChanged, true);
  const offline = { ...source, online: false };
  assert.equal(referenceSnapshotState(snap, f.capital, offline, now).dataChanged, true);
  assert.equal(referenceSnapshotState(snap, f.capital, { ...source, connectionRevision: 1 }, now).dataChanged, true);
  source.quote!.price += 1;
  assert.equal(referenceSnapshotState(snap, f.capital, source, now).dataChanged, true);
  assert.deepEqual(snap, original);
  const bad = sources(f);
  bad.quote!.asOf = "2026-10-18T00:00:00Z";
  assert.throws(() => captureReferencePlan(f.capital, bad, now, "buy", "Martingale"), /harga XUL10/);
  bad.quote = { ...original.sources.quote! };
  bad.context!.history.analysis!.lastDate = "2026-10-10";
  assert.throws(() => captureReferencePlan(f.capital, bad, now, "buy", "Martingale"), /OHLC/);
});

test("contract profiles preserve all geometry but size every side, strategy and fill stage using their frozen assumptions", () => {
  const f = fixture(1000000), source = sources(f), now = Date.parse(f.evaluatedAt);
  const geometry = (p: ReturnType<typeof buildReferencePlan>) => ({
    entries: p.entries, stop: p.stop, targets: p.targets, weights: p.weights, spacing: p.spacing, zones: p.zones,
  });
  for (const side of ["buy", "sell"] as const) for (const strategy of ["Linear Averaging", "Martingale"] as const) {
    const regular = buildReferencePlan(f.capital, source, now, side, strategy);
    assert.deepEqual(regular, buildReferencePlan(f.capital, source, now, side, strategy, "regular"));
    for (const profile of ["regular", "mini", "micro"] as const) {
      const plan = buildReferencePlan(f.capital, source, now, side, strategy, profile);
      assert.deepEqual(geometry(plan), geometry(regular));
      assert.deepEqual(plan.contract, CONTRACT_PROFILES[profile]);
      assert.notEqual(plan.contract, CONTRACT_PROFILES[profile], "Capture detached assumptions");
      const direction = side === "buy" ? 1 : -1;
      const unitMargin = plan.weights.reduce((s, w) => s + w, 0) * plan.contract.marginPerLot;
      const unitLoss = plan.entries.reduce((s, e, i) =>
        s + direction * (e.price - plan.stop.price) * plan.weights[i] * plan.contract.dollarsPerPointPerLot, 0);
      assert.equal(plan.firstLot, Math.floor(Math.min(.2 * f.capital / unitMargin, .1 * f.capital / unitLoss)));
      for (let filled = 1; filled <= plan.entries.length; filled++) {
        const stage = referenceFillStage(plan, filled);
        const baseline = referenceFillStage(regular, filled);
        assert.equal(stage.average, baseline.average);
        assert.deepEqual(stage.target, baseline.target);
        assert.equal(stage.totalLots, plan.weights.slice(0, filled).reduce((s, w) => s + w, 0) * plan.firstLot!);
        assert.equal(stage.margin, stage.totalLots! * plan.contract.marginPerLot);
        assert.equal(stage.lossAtStop, direction * (stage.average - plan.stop.price) * stage.totalLots! * plan.contract.dollarsPerPointPerLot);
        assert.equal(stage.profitAtTarget, direction * (stage.target.price - stage.average) * stage.totalLots! * plan.contract.dollarsPerPointPerLot);
        assert.ok(stage.margin! <= .2 * f.capital + 1e-8);
        assert.ok(stage.lossAtStop! <= .1 * f.capital + 1e-8);
      }
      const small = buildReferencePlan(.01, source, now, side, strategy, profile);
      assert.deepEqual(geometry(small), geometry(plan));
      assert.equal(small.firstLot, null);
      const stage = referenceFillStage(small, 1);
      assert.equal(stage.totalLots, null);
      assert.equal(stage.margin, null); assert.equal(stage.lossAtStop, null); assert.equal(stage.profitAtTarget, null);
    }
  }
});

test("profile edits, missing or tampered assumptions invalidate snapshots without reinterpreting their quantities", () => {
  const f = fixture(300000), source = sources(f), now = Date.parse(f.evaluatedAt);
  for (const profile of ["regular", "mini", "micro"] as const) {
    const snap = captureReferencePlan(f.capital, source, now, "buy", "Martingale", profile);
    const before = structuredClone(snap);
    assert.deepEqual(referenceSnapshotState(snap, f.capital, source, now, profile), { parametersChanged: false, dataChanged: false });
    const other = profile === "micro" ? "mini" : "micro";
    assert.deepEqual(referenceSnapshotState(snap, f.capital, source, now, other), { parametersChanged: true, dataChanged: false });
    assert.deepEqual(snap, before);
    assert.equal(referenceSnapshotState(snap, f.capital, { ...source, online: false }, now, profile).dataChanged, true);
    assert.equal(referenceSnapshotState(snap, f.capital, { ...source, connectionRevision: 1 }, now, profile).dataChanged, true);
    const legacy = structuredClone(snap);
    delete (legacy.plan as Partial<typeof legacy.plan>).contract;
    assert.equal(referenceSnapshotState(legacy, f.capital, source, now, profile).dataChanged, true);
    assert.throws(() => referenceFillStage(legacy.plan, 1), /profil/);
    assert.equal(validScenarioContract({ ...snap.plan.contract, marginPerLot: 999 }), false);
  }
  assert.throws(() => scenarioContract("invalid" as "regular"), /Profil/);
  assert.equal(scenarioContract("mini").dollarsPerPointPerLot, scenarioContract().dollarsPerPointPerLot / 10);
  assert.equal(scenarioContract("micro").dollarsPerPointPerLot, scenarioContract().dollarsPerPointPerLot / 100);
});
