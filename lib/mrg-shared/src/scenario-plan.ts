/** Educational XUL10 price-level diagram; never an order or direction forecast. */
import type { ScenarioPriceBasis } from "./scenario-price";
import { SCENARIO_CONTRACT, scenarioLots } from "./scenario-contract";
export type ScenarioSide = "buy" | "sell";
export interface ScenarioInput {
  side: ScenarioSide;
  capital: number;
  entry: number;
  spacing: number;
  target: number;
  layers: number;
  strategy: "Linear Averaging" | "Martingale";
  asOf: string;
  mode: "manual" | "market";
  priceBasis?: ScenarioPriceBasis;
  /** Only market suggestions may override the manual first-lot default. */
  firstLot?: number;
}
const cents = (n: number) => Math.round(n * 100) / 100;

export function buildScenario(input: ScenarioInput) {
  const { side, capital, entry, spacing, target, layers, strategy, asOf, mode } = input;
  if (![capital, entry, spacing, target].every(n => Number.isFinite(n) && n > 0 && n <= 1e12) ||
    !Number.isInteger(layers) || layers < 1 || layers > 5 ||
    !["buy", "sell"].includes(side) ||
    !["Linear Averaging", "Martingale"].includes(strategy) ||
    !["manual", "market"].includes(mode) ||
    !Number.isFinite(Date.parse(asOf))) throw new Error("Parameter skenario tidak valid.");
  if (input.priceBasis && (
    !["live", "historical"].includes(input.priceBasis.kind) ||
    input.priceBasis.quote.symbol !== "XUL10" ||
    input.priceBasis.quote.price !== entry || input.priceBasis.quote.asOf !== asOf
  )) throw new Error("Acuan harga tidak cocok dengan skenario.");
  const direction = side === "buy" ? 1 : -1;
  const firstLot = input.firstLot ?? SCENARIO_CONTRACT.firstLot;
  if (!Number.isSafeInteger(firstLot) || firstLot < 1 ||
    (mode === "manual" && firstLot !== SCENARIO_CONTRACT.firstLot)) throw new Error("Lot awal skenario tidak valid.");
  const lots = scenarioLots(strategy, layers, firstLot);
  const entries = Array.from({ length: layers }, (_, index) => ({
    index: index + 1,
    price: entry - direction * index * spacing,
    lots: lots[index],
  }));
  const totalLots = cents(entries.reduce((sum, e) => sum + e.lots, 0));
  // Market scaling must not move the weighted price or magnify cancellation error.
  // Preserve the existing manual arithmetic exactly.
  const weights = mode === "market" ? scenarioLots(strategy, layers) : lots;
  const average = entries.reduce((sum, e, i) => sum + e.price * weights[i], 0) /
    weights.reduce((sum, lot) => sum + lot, 0);
  const tp = average + direction * target;
  const stressPrice = entry - direction * layers * spacing;
  if ([...entries.map(e => e.price), tp, stressPrice].some(n => !Number.isFinite(n) || n <= 0)) {
    throw new Error("Level harga harus positif. Kurangi jarak, target, atau jumlah layer.");
  }
  const margin = cents(totalLots * SCENARIO_CONTRACT.marginPerLot);
  // No rounding of price geometry: avoid fabricating instrument tick-size precision.
  const stressLoss = cents(mode === "market"
    ? entries.reduce((sum, e, i) => sum + (layers - i) * spacing * SCENARIO_CONTRACT.dollarsPerPointPerLot * e.lots, 0)
    : entries.reduce((sum, e) => sum - direction * (stressPrice - e.price) * SCENARIO_CONTRACT.dollarsPerPointPerLot * e.lots, 0));
  const targetProfit = cents(mode === "market"
    ? target * totalLots * SCENARIO_CONTRACT.dollarsPerPointPerLot
    : entries.reduce((sum, e) => sum + direction * (tp - e.price) * SCENARIO_CONTRACT.dollarsPerPointPerLot * e.lots, 0));
  return {
    ...input, entries, totalLots, average, tp, margin, stressPrice, stressLoss, targetProfit,
    marginPercent: margin / capital * 100,
    stressPercent: stressLoss / capital * 100,
  };
}
export type ScenarioPlan = ReturnType<typeof buildScenario>;
