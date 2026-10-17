import { calendarIsFresh, type CalendarEvent, type Copy, type MarketContext, type NewsItem } from "./live-types";

export type NumericComparison = "above" | "below" | "equal" | "unavailable";
export interface RuleCalendarReading {
  event: CalendarEvent;
  phase: "upcoming" | "published" | "awaiting" | "unknown";
  forecastComparison: NumericComparison;
  previousComparison: NumericComparison;
}
export interface RuleNewsReading {
  item: NewsItem;
  status: "matched" | "no-match" | "unavailable" | "stale" | "invalid-date" | "oversized";
  contentHash: string | null;
  matches: { topic: Copy; excerpt: string; eventKeys: string[] }[];
}
export interface MarketRuleAnalysis {
  method: "rules";
  version: string;
  evaluatedAt: string;
  calendarAvailable: boolean;
  calendarTotal: number;
  calendarTruncated: boolean;
  calendar: RuleCalendarReading[];
  newsAvailable: boolean;
  newsTotal: number;
  newsTruncated: boolean;
  news: RuleNewsReading[];
}

// Only unambiguous provider notation. Decimal commas, ranges, prose and currencies
// are deliberately not guessed. K/M/B are scaled quantities, not percentages.
function numeric(raw: string | null) {
  const match = raw?.trim().replace(/\u2212/g, "-")
    .match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(%|K|M|B)?$/i);
  if (!match) return null;
  const suffix = match[2]?.toUpperCase() ?? "";
  const multiplier = ({ K: 1e3, M: 1e6, B: 1e9 } as Record<string, number>)[suffix] ?? 1;
  const value = Number(match[1].replace(/,/g, "")) * multiplier;
  return Number.isFinite(value) ? { value, unit: suffix === "%" ? "percent" : "number" } : null;
}

export function compareCalendarValues(actual: string | null, reference: string | null): NumericComparison {
  const a = numeric(actual), b = numeric(reference);
  if (!a || !b || a.unit !== b.unit) return "unavailable";
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(a.value), Math.abs(b.value)) * 4;
  return Math.abs(a.value - b.value) <= tolerance ? "equal" : a.value > b.value ? "above" : "below";
}

export function readCalendarRules(calendar: MarketContext["calendar"], now: number) {
  const available = calendarIsFresh(calendar, now) && calendar.timezone === "Asia/Jakarta";
  const scoped = available ? calendar.events.filter(event => {
    if (event.currency !== "USD") return false;
    const at = Date.parse(event.at ?? "");
    return !Number.isFinite(at) || (at >= now - 24 * 3600_000 && at <= now + 48 * 3600_000);
  }).sort((a, b) => {
    const distance = (e: CalendarEvent) => Number.isFinite(Date.parse(e.at ?? ""))
      ? Math.abs(Date.parse(e.at!) - now) : -1;
    return distance(a) - distance(b) || `${a.id}/${a.date}`.localeCompare(`${b.id}/${b.date}`);
  }) : [];
  return {
    available, total: scoped.length, truncated: scoped.length > 12,
    readings: scoped.slice(0, 12).map((event): RuleCalendarReading => {
      const at = Date.parse(event.at ?? "");
      const phase = !Number.isFinite(at) ? "unknown" : at > now ? "upcoming" :
        event.actual?.trim() && event.actual.trim() !== "-" ? "published" : "awaiting";
      return {
        event, phase,
        forecastComparison: phase === "published" ? compareCalendarValues(event.actual, event.forecast) : "unavailable",
        previousComparison: phase === "published" ? compareCalendarValues(event.actual, event.previous) : "unavailable",
      };
    }),
  };
}

// These are topic aliases, not sentiment, event-occurrence or impact classifiers.
// CPI and PCE, and payrolls and unemployment, deliberately remain distinct.
export const NEWS_TOPICS = [
  { label: { id: "Inflasi CPI", en: "CPI inflation" }, pattern: /\b(?:CPI|consumer price index|indeks harga konsumen)\b/i },
  { label: { id: "Inflasi PCE", en: "PCE inflation" }, pattern: /\b(?:PCE|personal consumption expenditures?|pengeluaran konsumsi pribadi)\b/i },
  { label: { id: "Payroll AS", en: "US payrolls" }, pattern: /\b(?:NFP|non[\s-]?farm payrolls?|payrolls?)\b/i },
  { label: { id: "Tingkat pengangguran", en: "Unemployment rate" }, pattern: /\b(?:unemployment rate|tingkat pengangguran)\b/i },
  { label: { id: "Kebijakan Fed", en: "Fed policy" }, pattern: /\b(?:FOMC|federal funds rate|fed(?:eral reserve)?|suku bunga fed)\b/i },
  { label: { id: "PDB", en: "GDP" }, pattern: /\b(?:GDP|gross domestic product|PDB|produk domestik bruto)\b/i },
  { label: { id: "Penjualan ritel", en: "Retail sales" }, pattern: /\b(?:retail sales|penjualan (?:ritel|eceran))\b/i },
  { label: { id: "PMI", en: "PMI" }, pattern: /\b(?:PMI|purchasing managers?['’]? index|indeks manajer pembelian)\b/i },
] as const;

export function matchBodyTopics(body: string, calendar: RuleCalendarReading[]): RuleNewsReading["matches"] {
  return NEWS_TOPICS.flatMap(topic => {
    const match = topic.pattern.exec(body);
    if (!match) return [];
    const start = Math.max(0, match.index - 100);
    return [{
      topic: { ...topic.label },
      excerpt: body.slice(start, match.index + match[0].length + 160),
      eventKeys: calendar.filter(({ event }) => topic.pattern.test(event.name))
        .map(({ event }) => `${event.id}/${event.date}`),
    }];
  });
}
