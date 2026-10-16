/** Educational XUL10 price-level diagram; never an order or direction forecast. */
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
  const direction = side === "buy" ? 1 : -1;
  const entries = Array.from({ length: layers }, (_, index) => ({
    index: index + 1,
    price: entry - direction * index * spacing,
    lots: cents(0.1 * (strategy === "Martingale" ? 2 ** index : index + 1)),
  }));
  const totalLots = cents(entries.reduce((sum, e) => sum + e.lots, 0));
  const average = entries.reduce((sum, e) => sum + e.price * e.lots, 0) / totalLots;
  const tp = average + direction * target;
  const stressPrice = entry - direction * layers * spacing;
  if ([...entries.map(e => e.price), tp, stressPrice].some(n => !Number.isFinite(n) || n <= 0)) {
    throw new Error("Level harga harus positif. Kurangi jarak, target, atau jumlah layer.");
  }
  const margin = cents(totalLots * 2000);
  // No rounding of price geometry: avoid fabricating instrument tick-size precision.
  const stressLoss = cents(entries.reduce((sum, e) =>
    sum - direction * (stressPrice - e.price) * 100 * e.lots, 0));
  const targetProfit = cents(entries.reduce((sum, e) =>
    sum + direction * (tp - e.price) * 100 * e.lots, 0));
  return {
    ...input, entries, totalLots, average, tp, margin, stressPrice, stressLoss, targetProfit,
    marginPercent: margin / capital * 100,
    stressPercent: stressLoss / capital * 100,
  };
}
export type ScenarioPlan = ReturnType<typeof buildScenario>;
