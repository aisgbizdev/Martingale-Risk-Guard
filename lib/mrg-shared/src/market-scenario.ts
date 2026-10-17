import type { CapitalSuggestion } from "./capital-suggestion";
import { buildScenario, type ScenarioSide } from "./scenario-plan";

/** Convert one frozen, eligible market assessment to either educational direction. */
export function marketScenario(suggestion: CapitalSuggestion, side: ScenarioSide) {
  const { selected, quote, target, spacing } = suggestion;
  if (!["offered", "limited"].includes(suggestion.status) || !selected?.passes ||
    !quote?.asOf || target === null || spacing === null ||
    (suggestion.status === "limited" && (selected.strategy !== "Linear Averaging" || selected.layers > 2))) {
    throw new Error("Saran belum menghasilkan kandidat yang dapat digunakan.");
  }
  return buildScenario({
    side, capital: suggestion.capital, entry: quote.price, asOf: quote.asOf,
    strategy: selected.strategy, layers: selected.layers, target, spacing, mode: "market",
    ...(suggestion.priceBasis ? { priceBasis: structuredClone(suggestion.priceBasis) } : {}),
  });
}
