import type { Article, MarketContext, NewsItem } from "@workspace/mrg-shared/live-types";
import { matchBodyTopics, readCalendarRules, type MarketRuleAnalysis, type RuleNewsReading } from "@workspace/mrg-shared/market-rules";
import { articleHash } from "./fundamental";
import { getArticle } from "./news";

export const RULE_READER_VERSION = "mrg-rules-v1";

/** No AI, external links, title sentiment, or account data. Full bodies only.
 * getArticle already deduplicates and caches official detail requests. Two workers
 * bound concurrency; a fresh request recomputes matches from the current body hash.
 */
export async function readMarketRules(
  news: MarketContext["news"], calendar: MarketContext["calendar"],
  now = Date.now(), load: (slug: string) => Promise<Article> = getArticle,
): Promise<MarketRuleAnalysis> {
  const events = readCalendarRules(calendar, now);
  const newsAge = now - Date.parse(news.receivedAt);
  const newsAvailable = news.status === "ready" && Number.isFinite(newsAge) && newsAge >= 0 && newsAge <= 15 * 60_000;
  const result: MarketRuleAnalysis = {
    method: "rules", version: RULE_READER_VERSION, evaluatedAt: new Date(now).toISOString(),
    calendarAvailable: events.available, calendarTotal: events.total,
    calendarTruncated: events.truncated, calendar: events.readings,
    newsAvailable, newsTotal: news.items.length,
    newsTruncated: news.items.length > 8, news: [],
  };
  if (!newsAvailable) return result;
  const selected = news.items.slice(0, 8);
  async function read(item: NewsItem): Promise<RuleNewsReading> {
    const base: RuleNewsReading = { item, status: "unavailable", contentHash: null, matches: [] };
    const at = Date.parse(item.publishedAt ?? "");
    if (!Number.isFinite(at) || at > now) return { ...base, status: "invalid-date" };
    if (now - at > 24 * 3600_000) return { ...base, status: "stale" };
    try {
      const article = await load(item.slug);
      if (article.slug !== item.slug || article.publishedAt !== item.publishedAt ||
        article.source !== item.source) return base;
      const body = article.content?.trim() ? article.content : article.contentEn;
      if (!body?.trim()) return base;
      // Do not claim that a truncated body has been read in full.
      if (body.length > 120_000) return { ...base, status: "oversized" };
      const matches = matchBodyTopics(body, events.readings);
      return { ...base, status: matches.length ? "matched" : "no-match", contentHash: articleHash(article), matches };
    } catch {
      return base;
    }
  }
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(2, selected.length) }, async () => {
    while (cursor < selected.length) {
      const index = cursor++;
      result.news[index] = await read(selected[index]);
    }
  }));
  return result;
}
