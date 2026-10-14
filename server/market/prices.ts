import type { LiveQuote, MarketContext, QuoteResponse } from "../../shared/live-types";
import { analyzeDaily, finitePrice, normalizeCandles, providerTimestamp } from "../../shared/market-analysis";
import { fetchProviderJson, QUOTE_BASE, SingleFlightCache } from "./provider";

export function normalizeQuote(payload: any): LiveQuote {
  if (payload?.status !== "success" || !Array.isArray(payload.data)) throw new Error("Invalid quote envelope");
  if (payload.state && payload.state !== "connected") throw new Error("Upstream quote connection is not ready");
  const row = payload.data.find((item: any) => item?.symbol === "XUL10");
  const price = finitePrice(row?.price);
  if (price === null) throw new Error("XUL10 price is absent or invalid");
  const bid = finitePrice(row.sell), ask = finitePrice(row.buy);
  if (bid !== null && ask !== null && bid > ask) throw new Error("Crossed quote");
  // Direct feed and documented wrapper expose different per-symbol aliases.
  // A clock without its date is insufficient. Never borrow the envelope's time.
  // Where aliases disagree, retain the oldest valid tick rather than freshening it.
  const tickTimes = [row.serverDateTime, row.date_time, row.updatedAt, row.serverTime]
    .map((value) => providerTimestamp(value, "Asia/Jakarta"))
    .filter((value): value is string => value !== null);
  const asOf = tickTimes.length ? new Date(Math.min(...tickTimes.map((value) => Date.parse(value)))).toISOString() : null;
  return {
    symbol: "XUL10", price, bid, ask,
    asOf,
    source: "Newsmaker · XUL10",
  };
}

const quotesCache = new SingleFlightCache<QuoteResponse>();
const historyCache = new SingleFlightCache<MarketContext["history"]>();
let lastQuote: LiveQuote | null = null;

export async function getQuotes(): Promise<QuoteResponse> {
  try {
    return await quotesCache.get(async () => {
      const quote = normalizeQuote(await fetchProviderJson(`${QUOTE_BASE}/live-quotes`));
      lastQuote = quote;
      return {
        status: "ready", quote, receivedAt: new Date().toISOString(),
        message: quote.asOf ? null : {
          id: "Timestamp harga tidak tersedia; analisis live ditunda.",
          en: "Quote timestamp is unavailable; live analysis is paused.",
        },
      };
    }, 5_000);
  } catch {
    return {
      status: "unavailable", quote: lastQuote, receivedAt: new Date().toISOString(),
      message: {
        id: "Feed XUL10 tidak tersedia. Harga terakhir, jika ada, bukan harga live.",
        en: "XUL10 feed is unavailable. Any last price shown is not live.",
      },
    };
  }
}

export async function getHistory(): Promise<MarketContext["history"]> {
  try {
    return await historyCache.get(async () => {
      const since = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
      const payload = await fetchProviderJson(`${QUOTE_BASE}/historical?dateFrom=${since}`);
      if (payload?.status !== "success" || !Array.isArray(payload.data)) throw new Error("Invalid history envelope");
      const gold = payload.data.find((group: any) => group?.symbol === "LGD Daily");
      const analysis = analyzeDaily(normalizeCandles(gold?.data));
      return { status: "ready", analysis, receivedAt: new Date().toISOString(), message: null };
    }, 15 * 60_000);
  } catch {
    return {
      status: "unavailable", analysis: null, receivedAt: new Date().toISOString(),
      message: {
        id: "Riwayat LGD Daily tidak tersedia, kedaluwarsa, atau belum memenuhi syarat OHLC.",
        en: "LGD Daily history is unavailable, stale, or does not meet OHLC requirements.",
      },
    };
  }
}
