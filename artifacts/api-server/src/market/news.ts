import type { Article, MarketContext, NewsItem } from "@workspace/mrg-shared/live-types";
import { providerTimestamp } from "@workspace/mrg-shared/market-analysis";
import { fetchProviderJson, NEWSMAKER_BASE, SingleFlightCache } from "./provider";
import { assessFundamental } from "./fundamental";
import { editorialRecords } from "./editorial-records";

const str = (v: unknown) => typeof v === "string" ? v.trim() : "";

export function normalizeNews(row: any): NewsItem {
  const slug = str(row?.slug), title = str(row?.title_id);
  if (!/^[a-z0-9-]{1,220}$/.test(slug) || !title) throw new Error("Invalid news item");
  return {
    slug, title, titleEn: str(row.title_en) || title,
    publishedAt: providerTimestamp(row.created_at, "Asia/Jakarta"),
    category: str(row.main_category?.name),
    source: str(row.source) || "Newsmaker.id",
  };
}

const newsCache = new SingleFlightCache<MarketContext["news"]>();

export async function getNews(): Promise<MarketContext["news"]> {
  try {
    return await newsCache.get(async () => {
      const response = await fetchProviderJson(`${NEWSMAKER_BASE}/berita`, true);
      if (response?.status !== "success" || !Array.isArray(response.data)) throw new Error("Invalid news envelope");
      const items = response.data.map(normalizeNews).filter((item: NewsItem) =>
        /gold|dollar|emas|dolar|fed|inflation|inflasi/i.test(`${item.category} ${item.title} ${item.titleEn}`),
      ).slice(0, 8);
      const fundamental = await assessFundamental(items, editorialRecords, getArticle);
      return { status: "ready", items, fundamental, receivedAt: new Date().toISOString(), message: null };
    }, 60_000);
  } catch {
    return {
      status: "unavailable", items: [], receivedAt: new Date().toISOString(),
      message: {
        id: "Berita Newsmaker belum tersedia. Analisis sentimen otomatis tidak digunakan.",
        en: "Newsmaker news is unavailable. Automatic sentiment analysis is not used.",
      },
    };
  }
}

export function plainText(html: unknown) {
  if (typeof html !== "string") return "";
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(?:p|div|h[1-6]|li)>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, (s) =>
      ({ "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[s] ?? s)
    .replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : "")
    .replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const articles = new Map<string, SingleFlightCache<Article>>();

export async function getArticle(slug: string): Promise<Article> {
  if (!/^[a-z0-9-]{1,220}$/.test(slug)) throw new Error("Invalid article slug");
  if (!articles.has(slug)) {
    if (articles.size >= 100) articles.delete(articles.keys().next().value!);
    articles.set(slug, new SingleFlightCache<Article>());
  }
  return articles.get(slug)!.get(async () => {
    const response = await fetchProviderJson(`${NEWSMAKER_BASE}/berita/show/${encodeURIComponent(slug)}`, true);
    if (response?.status !== "success" || !response.data) throw new Error("Article is unavailable");
    const item = normalizeNews(response.data);
    return { ...item, content: plainText(response.data.content_id), contentEn: plainText(response.data.content_en) };
  }, 5 * 60_000);
}
