import { suggestFromCapital, type CapitalSuggestion } from "./capital-suggestion";
import type { LiveQuote, MarketContext } from "./live-types";

export interface SuggestionSources {
  context: MarketContext | null | undefined;
  quote: LiveQuote | null;
  online: boolean;
  connectionRevision: number;
}

export interface SuggestionSnapshot {
  result: CapitalSuggestion;
  sources: SuggestionSources;
  sourceKey: string;
}

export function suggestionSourceKey(sources: SuggestionSources) {
  return JSON.stringify(sources);
}

export function captureSuggestion(capital: number, sources: SuggestionSources, now: number): SuggestionSnapshot {
  const detached = structuredClone(sources);
  return {
    sources: detached,
    sourceKey: suggestionSourceKey(detached),
    result: structuredClone(suggestFromCapital(capital, detached.context, detached.quote, now, detached.online)),
  };
}

export function suggestionSnapshotState(snapshot: SuggestionSnapshot, capital: number, sources: SuggestionSources, now: number) {
  // Re-evaluate only to detect expiration/window transitions. Never replace the frozen result.
  const { evaluatedAt: _before, ...before } = snapshot.result;
  const { evaluatedAt: _after, ...after } = suggestFromCapital(
    snapshot.result.capital, snapshot.sources.context, snapshot.sources.quote, now, sources.online,
  );
  const parametersChanged = capital !== snapshot.result.capital;
  const dataChanged = snapshot.sourceKey !== suggestionSourceKey(sources) ||
    JSON.stringify(before) !== JSON.stringify(after);
  return {
    parametersChanged,
    dataChanged,
    canApply: !parametersChanged && !dataChanged && snapshot.result.status === "offered" && !!snapshot.result.selected,
  };
}

export function applySuggestion(
  active: SuggestionSnapshot | null, preview: SuggestionSnapshot,
  capital: number, sources: SuggestionSources, now: number, invalidated = false,
) {
  return !invalidated && suggestionSnapshotState(preview, capital, sources, now).canApply ? preview : active;
}
