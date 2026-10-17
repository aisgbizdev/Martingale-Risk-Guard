import { jakartaDate, quoteIsFresh, type LiveQuote } from "./live-types";

/** A dated tick, not a settlement or an assertion that an exchange is closed. */
export interface ScenarioPriceBasis {
  kind: "live" | "historical";
  quote: LiveQuote;
}

export const HISTORICAL_PRICE_MAX_AGE_MS = 72 * 3600_000;
export const XUL10_SOURCE = "Newsmaker · XUL10";

/**
 * Weekend is a user-facing historical-study window in WIB, NOT a trading calendar.
 * No documented session/holiday calendar is available. Never infer market closure
 * from a dead feed or label the last observed tick an official close.
 */
export function resolveScenarioPrice(
  quote: LiveQuote | null | undefined, now: number, providerReady: boolean,
): ScenarioPriceBasis | null {
  if (!providerReady || !Number.isFinite(now) || !quote ||
    quote.symbol !== "XUL10" ||
    !Number.isFinite(quote.price) || quote.price <= 0 || quote.price > 1e12 ||
    !quote.asOf || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(quote.asOf)) return null;
  const tick = Date.parse(quote.asOf);
  if (!Number.isFinite(tick)) return null;
  if (quoteIsFresh(quote, now)) return { kind: "live", quote: { ...quote } };
  if (quote.source !== XUL10_SOURCE) return null;
  const age = now - tick;
  if (age < 0 || age > HISTORICAL_PRICE_MAX_AGE_MS) return null;
  const today = jakartaDate(now);
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  if (day !== 6 && day !== 0) return null;
  const friday = new Date(Date.parse(`${today}T00:00:00Z`) - (day === 6 ? 1 : 2) * 86400_000);
  const saturday = new Date(friday.getTime() + 86400_000);
  const quoteDay = jakartaDate(tick);
  if (quoteDay !== friday.toISOString().slice(0, 10) &&
    quoteDay !== saturday.toISOString().slice(0, 10)) return null;
  return { kind: "historical", quote: { ...quote } };
}

export function samePriceQuote(a: LiveQuote | null | undefined, b: LiveQuote | null | undefined) {
  return !!a && !!b && a.symbol === b.symbol && a.source === b.source &&
    a.price === b.price && a.asOf === b.asOf && a.bid === b.bid && a.ask === b.ask;
}

export function historicalPriceIsEligible(
  basis: ScenarioPriceBasis | undefined, quote: LiveQuote | null, now: number, online: boolean,
) {
  return basis?.kind === "historical" && samePriceQuote(basis.quote, quote) &&
    resolveScenarioPrice(quote, now, online)?.kind === "historical";
}
