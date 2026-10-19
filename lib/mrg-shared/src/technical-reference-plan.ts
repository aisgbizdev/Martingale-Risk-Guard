import type { CapitalSuggestion } from "./capital-suggestion";
import { newsmakerLevels } from "./newsmaker-levels";
import { SCENARIO_BUDGET, SCENARIO_CONTRACT, scenarioLots } from "./scenario-contract";
import type { ScenarioSide } from "./scenario-plan";

export type ReferenceLevel = { price: number; labels: string[] };
export type ReferenceStrategy = "Linear Averaging" | "Martingale";

/** Educational cross-source comparison. No offset, ratio or claim of XUL10 calibration. */
export function technicalReferencePlan(result: CapitalSuggestion, side: ScenarioSide, strategy: ReferenceStrategy = "Linear Averaging") {
  if (!["buy", "sell"].includes(side) || !["Linear Averaging", "Martingale"].includes(strategy)) throw new Error("Arah/strategi tidak valid.");
  if (!["offered", "limited", "no-fit"].includes(result.status) || !result.quote || !result.candidates.length) {
    throw new Error("Data atau konteks belum memenuhi pemeriksaan; rencana teknikal tidak diaktifkan.");
  }
  const a = result.reference.analysis;
  if (!a || a.source !== "LGD Daily" || ![a.lastOpen, a.lastHigh, a.lastLow, a.lastClose].every(n => typeof n === "number" && Number.isFinite(n) && n > 0)) {
    throw new Error("OHLC LGD D1 selesai terakhir belum lengkap; tidak memakai angka pengganti.");
  }
  const levels = newsmakerLevels({ open: a.lastOpen!, high: a.lastHigh!, low: a.lastLow!, close: a.lastClose });
  if (a.lastHigh! <= a.lastLow!) throw new Error("Rentang D1 datar; level Pivot/Fibonacci bertumpuk.");
  const allowed = result.candidates.filter(c => c.strategy === strategy);
  if (!allowed.length) throw new Error("Strategi ini dibatasi oleh konteks berita/tren saat evaluasi.");
  const maxLayers = Math.min(3, Math.max(...allowed.map(c => c.layers)));
  const pool: ReferenceLevel[] = [];
  const add = (price: number, label: string) => {
    if (!Number.isFinite(price) || price <= 0) return;
    const existing = pool.find(l => Math.abs(l.price - price) < 0.005);
    if (existing) existing.labels.push(label); else pool.push({ price, labels: [label] });
  };
  Object.entries(levels.classic).forEach(([name, price]) => add(price, `Pivot ${name.toUpperCase()}`));
  const fib = side === "buy" ? levels.up : levels.down;
  fib.retracement.forEach(l => add(l.price, `Fibo ${(l.ratio * 100).toFixed(1)}% D1`));
  // These are range anchors, not an inferred multi-day market swing.
  add(a.lastLow!, "Low D1"); add(a.lastHigh!, "High D1");
  const direction = side === "buy" ? 1 : -1;
  const anchor = result.quote.price;
  const adverse = pool.filter(l => direction * (anchor - l.price) > 0.005)
    .sort((x, y) => direction * (y.price - x.price));
  // Reserve one deeper technical level for invalidation, never fabricate an SL distance.
  const count = Math.min(maxLayers, adverse.length - 1);
  if (count < 1) throw new Error("Belum ada level entry dan batas batal berurutan di sisi harga ini. Tunggu, jangan memaksakan layer.");
  const entries = adverse.slice(0, count).map((l, i) => ({ ...l, index: i + 1 }));
  const stop = adverse[count];
  const targets = pool.filter(l => direction * (l.price - entries[0].price) > 0.005)
    .sort((x, y) => direction * (x.price - y.price));
  if (!targets.length) throw new Error("Level TP teknikal yang mendukung skenario belum tersedia.");
  const weights = scenarioLots(strategy, count);
  const unitMargin = weights.reduce((sum, w) => sum + w * SCENARIO_CONTRACT.marginPerLot, 0);
  const unitLoss = entries.reduce((sum, e, i) => sum + direction * (e.price - stop.price) * weights[i] * SCENARIO_CONTRACT.dollarsPerPointPerLot, 0);
  const firstLot = Math.floor(Math.min(result.capital * SCENARIO_BUDGET.marginFraction / unitMargin,
    result.capital * SCENARIO_BUDGET.stressFraction / unitLoss));
  if (!Number.isSafeInteger(firstLot) || firstLot < 0) throw new Error("Ukuran modal menghasilkan perhitungan lot yang tidak valid.");
  return {
    side, strategy, capital: result.capital, evaluatedAt: result.evaluatedAt,
    source: "LGD Daily" as const, sourceDate: a.lastDate,
    selectionQuote: { ...result.quote }, entries, stop, targets, weights,
    firstLot: firstLot >= 1 ? firstLot : null,
    maxLayers, limited: result.fundamental?.status !== "assessed",
    contextReasons: result.reasons.filter(r => !/T=floor|Utamakan jumlah|Lot awal otomatis|Tidak ada kandidat minimal|menjadi jangkar snapshot/.test(r)),
  };
}

export type TechnicalReferencePlan = ReturnType<typeof technicalReferencePlan>;

export function referenceFillStage(plan: TechnicalReferencePlan, filled: number) {
  if (!Number.isInteger(filled) || filled < 1 || filled > plan.entries.length) throw new RangeError("Tahap layer tidak valid.");
  const entries = plan.entries.slice(0, filled);
  const weights = plan.weights.slice(0, filled);
  const weight = weights.reduce((s, n) => s + n, 0);
  const average = entries.reduce((s, e, i) => s + e.price * weights[i], 0) / weight;
  const direction = plan.side === "buy" ? 1 : -1;
  const target = plan.targets.find(l => direction * (l.price - average) > 0.005);
  if (!target) throw new Error("TP teknikal belum tersedia untuk tahap ini.");
  // Full-plan sizing and stop stay frozen when exploring a partial fill.
  const totalLots = plan.firstLot === null ? null : weight * plan.firstLot;
  const margin = totalLots === null ? null : totalLots * SCENARIO_CONTRACT.marginPerLot;
  const lossAtStop = totalLots === null ? null : direction * (average - plan.stop.price) * totalLots * SCENARIO_CONTRACT.dollarsPerPointPerLot;
  const profitAtTarget = totalLots === null ? null : direction * (target.price - average) * totalLots * SCENARIO_CONTRACT.dollarsPerPointPerLot;
  return { filled, average, target, totalLots, margin, lossAtStop, profitAtTarget };
}
