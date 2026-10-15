import type { DailyAnalysis, DailyCandle } from "./live-types";
import { jakartaDate } from "./live-types";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function validDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let normalized = value;
  const long = /^(\d{2}) ([A-Za-z]{3}) (\d{4})$/.exec(value);
  if (long) {
    const month = months.indexOf(long[2]);
    if (month < 0) return null;
    normalized = `${long[3]}-${String(month + 1).padStart(2, "0")}-${long[1]}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === normalized
    ? normalized : null;
}

export function providerTimestamp(value: unknown, timezone: string): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2})[:.](\d{2})(?::(\d{2}))?$/.exec(value);
  if (match) {
    if (timezone !== "Asia/Jakarta" || !validDate(match[1])) return null;
    const [, date, hours, minutes, seconds = "00"] = match;
    if (+hours > 23 || +minutes > 59 || +seconds > 59) return null;
    return new Date(`${date}T${hours}:${minutes}:${seconds}+07:00`).toISOString();
  }
  // Require an explicit offset: never interpret a timezone-free provider clock as UTC.
  const iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!iso || !validDate(iso[1]) || +iso[2] > 23 || +iso[3] > 59 || +iso[4] > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function finitePrice(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 1e12 ? number : null;
}

export function normalizeCandles(rows: unknown): DailyCandle[] {
  if (!Array.isArray(rows)) throw new Error("Invalid OHLC payload");
  const dates = new Set<string>();
  return rows.map((row): DailyCandle => {
    if (!row || typeof row !== "object") throw new Error("Invalid OHLC row");
    const date = validDate(row.date);
    const open = finitePrice(row.open), high = finitePrice(row.high);
    const low = finitePrice(row.low), close = finitePrice(row.close);
    if (!date || open === null || high === null || low === null || close === null ||
      high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
      throw new Error("Invalid OHLC values");
    }
    if (dates.has(date)) throw new Error("Duplicate candle date");
    dates.add(date);
    return { date, open, high, low, close };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function mean(values: number[]) {
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeDaily(allCandles: DailyCandle[], now = Date.now()): DailyAnalysis {
  // A provider's current-day row is not assumed to be a closed daily candle.
  const today = jakartaDate(now);
  const candles = allCandles.filter((c) => c.date < today);
  if (candles.length < 50) throw new Error("At least 50 closed daily candles required");
  const last = candles.at(-1)!;
  const age = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last.date}T00:00:00Z`);
  if (age > 4 * 86_400_000) throw new Error("Daily history too old");
  for (let i = 1; i < candles.length; i++) {
    if (Date.parse(candles[i].date) - Date.parse(candles[i - 1].date) > 7 * 86_400_000) {
      throw new Error("Historical series contains a large gap");
    }
  }
  const closes = candles.map((c) => c.close);
  const ma20 = mean(closes.slice(-20)), ma50 = mean(closes.slice(-50));
  const trueRanges = candles.slice(1).map((c, i) =>
    Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close)),
  );
  let atr = mean(trueRanges.slice(0, 14));
  const atrs = [atr];
  for (const range of trueRanges.slice(14)) {
    atr = (atr * 13 + range) / 14;
    atrs.push(atr);
  }
  const atrBaseline = median(atrs.slice(-21, -1));
  if (!(atr > 0) || !(atrBaseline > 0)) throw new Error("ATR cannot be evaluated");
  const recent = candles.slice(-20);
  return {
    source: "LGD Daily", timeframe: "D1", basis: "gold-reference",
    candleCount: candles.length, firstDate: candles[0].date, lastDate: last.date,
    lastClose: last.close, ma20, ma50, atr14: atr, atrBaseline,
    atrPercent: atr / last.close * 100,
    support20: Math.min(...recent.map((c) => c.low)),
    resistance20: Math.max(...recent.map((c) => c.high)),
    trend: last.close > ma20 && ma20 > ma50 ? "up" :
      last.close < ma20 && ma20 < ma50 ? "down" : "mixed",
  };
}
