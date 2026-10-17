import type { ScenarioPlan } from "./scenario-plan";
import { SCENARIO_CONTRACT, scenarioLots } from "./scenario-contract";

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Educational prefix of a captured market plan, not observed broker fills.
 * Pending lots never enter totals. The original full-basket stress price stays
 * fixed so stages are compared at the same hypothetical adverse price.
 */
export function scenarioFillStage(plan: ScenarioPlan, filledLayers: number) {
  if (plan.mode !== "market" || !Number.isInteger(filledLayers) ||
    filledLayers < 1 || filledLayers > plan.layers) {
    throw new RangeError("Tahap harus berisi L1 sampai layer terpilih pada Saran MRG.");
  }
  const filledEntries = plan.entries.slice(0, filledLayers);
  const pendingEntries = plan.entries.slice(filledLayers);
  // Preserve the full plan exactly when every layer is assumed filled.
  if (filledLayers === plan.layers) return { ...plan, filledLayers, filledEntries, pendingEntries };

  const weights = scenarioLots(plan.strategy, filledLayers);
  const average = filledEntries.reduce((sum, e, i) => sum + e.price * weights[i], 0) /
    weights.reduce((sum, lot) => sum + lot, 0);
  const tp = average + (plan.side === "buy" ? 1 : -1) * plan.target;
  if (!Number.isFinite(tp) || tp <= 0) {
    throw new RangeError("Target TP tahap ini tidak menghasilkan harga positif.");
  }
  const totalLots = filledEntries.reduce((sum, e) => sum + e.lots, 0);
  const margin = cents(totalLots * SCENARIO_CONTRACT.marginPerLot);
  const stressLoss = cents(filledEntries.reduce((sum, e, i) =>
    sum + (plan.layers - i) * plan.spacing * SCENARIO_CONTRACT.dollarsPerPointPerLot * e.lots, 0));
  return {
    ...plan, filledLayers, filledEntries, pendingEntries, totalLots, average, tp, margin, stressLoss,
    targetProfit: cents(plan.target * totalLots * SCENARIO_CONTRACT.dollarsPerPointPerLot),
    marginPercent: margin / plan.capital * 100,
    stressPercent: stressLoss / plan.capital * 100,
  };
}
export type FilledScenario = ReturnType<typeof scenarioFillStage>;
