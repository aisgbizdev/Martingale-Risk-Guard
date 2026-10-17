/** User-selected educational assumptions, not verified broker specifications. */
export const SCENARIO_CONTRACT = Object.freeze({
  firstLot: 1,
  marginPerLot: 1000,
  dollarsPerPointPerLot: 100,
});
export const SCENARIO_BUDGET = Object.freeze({ marginFraction: 0.2, stressFraction: 0.1 });

export function scenarioLots(strategy: "Linear Averaging" | "Martingale", layers: number, firstLot: number = SCENARIO_CONTRACT.firstLot) {
  return Array.from({ length: layers }, (_, i) =>
    firstLot * (strategy === "Martingale" ? 2 ** i : i + 1));
}
