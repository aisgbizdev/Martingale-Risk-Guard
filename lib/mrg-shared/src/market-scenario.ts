import type { CapitalSuggestion } from "./capital-suggestion";
import { buildScenario, type ScenarioSide } from "./scenario-plan";
import { simulateCandidate, type Candidate } from "./capital-suggestion";

/** Convert one frozen, eligible market assessment to either educational direction. */
export function marketScenario(suggestion: CapitalSuggestion, side: ScenarioSide) {
  const { selected, quote, target, spacing } = suggestion;
  if (!["offered", "limited"].includes(suggestion.status) || !selected?.passes ||
    !quote?.asOf || target === null || spacing === null ||
    (suggestion.status === "limited" && (selected.strategy !== "Linear Averaging" || selected.layers > 2))) {
    throw new Error("Saran belum menghasilkan kandidat yang dapat digunakan.");
  }
  if (!Array.isArray(selected.lots) || selected.lots.length !== selected.layers) throw new Error("Lot kandidat tidak valid.");
  const checked = simulateCandidate(suggestion.capital, spacing, selected.layers, selected.strategy, selected.lots[0]);
  for (const key of Object.keys(checked) as (keyof Candidate)[]) {
    if (JSON.stringify(checked[key]) !== JSON.stringify(selected[key])) throw new Error("Hitungan kandidat tidak cocok dengan skenario.");
  }
  if (!checked.passes) throw new Error("Kandidat melewati batas modal.");
  return buildScenario({
    side, capital: suggestion.capital, entry: quote.price, asOf: quote.asOf,
    strategy: selected.strategy, layers: selected.layers, target, spacing, mode: "market",
    firstLot: selected.lots[0],
    ...(suggestion.priceBasis ? { priceBasis: structuredClone(suggestion.priceBasis) } : {}),
  });
}
