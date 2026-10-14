import { z } from "zod";

export interface Copy {
  id: string;
  en: string;
}

export interface LiveQuote {
  symbol: "XUL10";
  price: number;
  bid: number | null;
  ask: number | null;
  asOf: string | null;
  source: string;
}

export interface QuoteResponse {
  status: "ready" | "unavailable";
  quote: LiveQuote | null;
  receivedAt: string;
  message: Copy | null;
}

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DailyAnalysis {
  source: "LGD Daily";
  timeframe: "D1";
  basis: "gold-reference";
  candleCount: number;
  firstDate: string;
  lastDate: string;
  lastClose: number;
  ma20: number;
  ma50: number;
  atr14: number;
  atrBaseline: number;
  atrPercent: number;
  support20: number;
  resistance20: number;
  trend: "up" | "down" | "mixed";
}

export interface CalendarEvent {
  id: string;
  name: string;
  country?: string | null;
  currency: string;
  impact: "high" | "medium" | "low" | "unknown";
  date: string | null;
  time: string;
  at: string | null;
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  explanation: string | null;
  source: string | null;
}

export interface NewsItem {
  slug: string;
  title: string;
  titleEn: string;
  publishedAt: string | null;
  category: string;
  source: string;
}

export interface Article extends NewsItem {
  content: string;
  contentEn: string;
}

export interface MarketContext {
  history: {
    status: "ready" | "unavailable";
    analysis: DailyAnalysis | null;
    receivedAt: string;
    message: Copy | null;
  };
  calendar: {
    status: "ready" | "unavailable";
    complete: boolean;
    events: CalendarEvent[];
    generatedAt: string | null;
    receivedAt: string;
    timezone: string;
    message: Copy | null;
  };
  news: {
    status: "ready" | "unavailable";
    items: NewsItem[];
    receivedAt: string;
    message: Copy | null;
  };
}

const positive = z.number().finite().positive().max(1e12);
const optionalPositive = positive.nullable();
export const positionSchema = z.object({
  id: z.string().min(1).max(100),
  symbol: z.literal("XUL10"),
  side: z.enum(["buy", "sell"]),
  entry: positive,
  lots: positive.max(1e6),
  enteredAt: z.string().max(40).datetime({ offset: true }).nullable(),
});
export type Position = z.infer<typeof positionSchema>;

export const settingsSchema = z.object({
  capital: optionalPositive,
  equity: optionalPositive,
  currency: z.enum(["USD", "IDR"]),
  maxLots: optionalPositive,
  maxLayers: z.number().int().min(1).max(200).nullable(),
  targetPriceDistance: optionalPositive,
  layerSpacingPrice: optionalPositive,
});
export type PositionSettings = z.infer<typeof settingsSchema>;

export const portfolioSchema = z.object({
  version: z.literal(1),
  positions: z.array(positionSchema).max(200).refine(
    (positions) => new Set(positions.map((p) => p.id)).size === positions.length,
    "Duplicate position IDs",
  ),
  settings: settingsSchema,
});
export type Portfolio = z.infer<typeof portfolioSchema>;

export const EMPTY_SETTINGS: PositionSettings = {
  capital: null, equity: null, currency: "USD", maxLots: null, maxLayers: null,
  targetPriceDistance: null, layerSpacingPrice: null,
};

export const QUOTE_MAX_AGE_MS = 20_000;
export const CALENDAR_MAX_AGE_MS = 15 * 60_000;

export function quoteIsFresh(quote: LiveQuote | null | undefined, now = Date.now()) {
  if (!quote?.asOf) return false;
  const age = now - Date.parse(quote.asOf);
  return Number.isFinite(age) && age >= -10_000 && age <= QUOTE_MAX_AGE_MS;
}

export function calendarIsFresh(calendar: MarketContext["calendar"] | null | undefined, now = Date.now()) {
  if (calendar?.status !== "ready" || !calendar.complete || !calendar.generatedAt) return false;
  const age = now - Date.parse(calendar.generatedAt);
  return Number.isFinite(age) && age >= -10_000 && age <= CALENDAR_MAX_AGE_MS;
}

export function jakartaDate(now: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(now));
}
