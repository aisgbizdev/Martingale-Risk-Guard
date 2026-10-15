import type { CalendarEvent, MarketContext } from "@workspace/mrg-shared/live-types";
import { providerTimestamp, validDate } from "@workspace/mrg-shared/market-analysis";
import { fetchProviderJson, NEWSMAKER_BASE, ProviderError, SingleFlightCache } from "./provider";

const text = (v: unknown): string | null => typeof v === "string" && v.trim() && v.trim() !== "-" ? v.trim() : null;

export function normalizeEvent(row: any, timezone: string): CalendarEvent {
  if (!row || typeof row !== "object" || !text(row.figures) || row.id === undefined) throw new Error("Invalid event");
  const date = validDate(row.date);
  const time = typeof row.time === "string" ? row.time.trim() : "";
  const rawImpact = String(row.impact ?? "").toLowerCase();
  const impact = /^(high|tinggi)$/.test(rawImpact) ? "high" :
    /^(medium|moderate|sedang)$/.test(rawImpact) ? "medium" :
    /^(low|rendah)$/.test(rawImpact) ? "low" : "unknown";
  const rawCurrency = String(row.country ?? "").trim().toUpperCase();
  const currency = ({ US: "USD", USA: "USD", CHN: "CNY", JPN: "JPY" } as Record<string, string>)[rawCurrency] ?? rawCurrency;
  return {
    id: String(row.id), name: text(row.figures)!, country: text(row.country), currency, impact, date, time,
    at: date ? providerTimestamp(`${date} ${time}`, timezone) : null,
    previous: text(row.previous), forecast: text(row.forecast), actual: text(row.actual),
    explanation: text(row.why_trader_care), source: text(row.sources),
  };
}

async function getPeriod(period: "this-week" | "next-week") {
  const url = `${NEWSMAKER_BASE}/kalender-ekonomi/${period}`;
  const first = await fetchProviderJson(`${url}?page=1`, true);
  const pages = first?.meta?.pagination?.last_page;
  const total = first?.meta?.pagination?.total;
  const timezone = first?.meta?.timezone;
  if (first?.status !== "success" || !Array.isArray(first.data) ||
      !Number.isInteger(pages) || pages < 1 || pages > 20 ||
      !Number.isInteger(total) || total < 0 || timezone !== "Asia/Jakarta") {
    throw new Error("Invalid calendar pagination or timezone");
  }
  const rows = [...first.data];
  const generationTimes: string[] = [];
  const firstTime = providerTimestamp(first.meta.generated_at, timezone);
  if (!firstTime) throw new Error("Calendar generation time is unavailable");
  generationTimes.push(firstTime);
  for (let start = 2; start <= pages; start += 4) {
    const results = await Promise.all(
      Array.from({ length: Math.min(4, pages - start + 1) }, (_, i) => start + i)
        .map(async (page) => {
          const result = await fetchProviderJson(`${url}?page=${page}`, true);
          if (result?.status !== "success" || !Array.isArray(result.data) ||
              result.meta?.pagination?.current_page !== page ||
              result.meta?.pagination?.total !== total ||
              result.meta?.pagination?.last_page !== pages ||
              result.meta?.timezone !== timezone) throw new Error("Calendar changed during pagination");
          return result;
        }),
    );
    for (const result of results) {
      rows.push(...result.data);
      const generated = providerTimestamp(result.meta.generated_at, timezone);
      if (!generated) throw new Error("Missing calendar generation time");
      generationTimes.push(generated);
    }
  }
  if (rows.length !== total) throw new Error("Calendar pagination incomplete");
  return { events: rows.map((row) => normalizeEvent(row, timezone)), generatedAt: generationTimes.sort()[0] };
}

const calendarCache = new SingleFlightCache<MarketContext["calendar"]>();

export async function getCalendar(): Promise<MarketContext["calendar"]> {
  try {
    return await calendarCache.get(async () => {
      const periods = await Promise.all([getPeriod("this-week"), getPeriod("next-week")]);
      const unique = new Map<string, CalendarEvent>();
      for (const period of periods) {
        for (const event of period.events) unique.set(`${event.id}/${event.date}`, event);
      }
      const events = Array.from(unique.values()).sort((a, b) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.time.localeCompare(b.time),
      );
      return {
        status: "ready", complete: true, events,
        generatedAt: periods.map((p) => p.generatedAt).sort()[0],
        receivedAt: new Date().toISOString(), timezone: "Asia/Jakarta", message: null,
      };
    }, 60_000);
  } catch (error) {
    const auth = error instanceof ProviderError && [401, 403].includes(error.status);
    return {
      status: "unavailable", complete: false, events: [], generatedAt: null,
      receivedAt: new Date().toISOString(), timezone: "Asia/Jakarta",
      message: auth ? {
        id: "Akses API kalender belum dikonfigurasi atau ditolak. Periksa Secrets server.",
        en: "Calendar API access is not configured or was rejected. Check server Secrets.",
      } : {
        id: "Kalender belum dapat dimuat lengkap. Ini bukan berarti tidak ada agenda berisiko.",
        en: "The complete calendar could not be loaded. This does not mean there are no risk events.",
      },
    };
  }
}
