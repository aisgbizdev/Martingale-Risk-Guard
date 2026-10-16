import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import type { Article, NewsItem } from "@workspace/mrg-shared/live-types";
import type { EditorialEvidence, FundamentalAssessment } from "@workspace/mrg-shared/capital-suggestion";
import { articleHash } from "./fundamental";
import {
  NEWS_MODEL, NEWS_ANALYSIS_VERSION, validateNewsReadings, type NewsReading,
} from "./news-ai";

const HOUR = 3600_000, DAY = 24 * HOUR;
const SCOPE = "Pembacaan AI maksimal 8 artikel tersaring dari halaman terbaru Newsmaker, ≤24 jam; bukan seluruh pasar. Kutipan diverifikasi, interpretasi AI dapat keliru.";
interface CachedReading { reading: NewsReading; reviewedAt: number; expiresAt: number }
interface Dependencies {
  classify: (articles: Article[], now: number) => Promise<NewsReading[]>;
  configured: () => boolean;
  clock?: () => number;
}

/** One bounded background batch per process. Price ticks and capital never enter the cache key. */
export class AutomaticFundamentalReader {
  private cache = new Map<string, CachedReading>();
  private pending: Promise<void> | null = null;
  private retryAt = 0;
  private calls: { at: number; chars: number }[] = [];
  private failure = "";
  private clock: () => number;
  constructor(private dependencies: Dependencies) { this.clock = dependencies.clock ?? Date.now; }
  private key(article: Article) {
    return JSON.stringify([article.slug, article.publishedAt, articleHash(article), NEWS_MODEL, NEWS_ANALYSIS_VERSION]);
  }
  async settled() { await this.pending; }

  async read(items: NewsItem[], load: (slug: string) => Promise<Article>): Promise<FundamentalAssessment> {
    const now = this.clock();
    const result: FundamentalAssessment = {
      status: "incomplete", evaluatedAt: new Date(now).toISOString(),
      scope: SCOPE, evidence: [], reasons: [], processing: false,
    };
    if (!this.dependencies.configured()) {
      result.reasons.push("Layanan pembaca berita otomatis belum terhubung; fundamental belum dinilai.");
      return result;
    }
    const selected = items.filter(item => {
      const at = Date.parse(item.publishedAt ?? "");
      if (!Number.isFinite(at) || at > now) {
        result.reasons.push(`Waktu publikasi belum valid: ${item.title}.`); return false;
      }
      return now - at <= DAY;
    });
    if (!selected.length || selected.length > 8 || new Set(selected.map(i => i.slug)).size !== selected.length) {
      result.reasons.push("Cakupan artikel terbaru kosong, berlebih, atau tidak konsisten."); return result;
    }
    const loaded = await batchProcess(selected, async item => {
      try {
        const article = await load(item.slug);
        if (article.slug !== item.slug || article.publishedAt !== item.publishedAt) throw new Error("Identity mismatch");
        const body = article.content || article.contentEn;
        if (body.trim().length < 40 || body.length > 12_000) throw new Error("Body incomplete or oversized");
        return article;
      } catch {
        result.reasons.push(`Isi lengkap artikel belum dapat dibaca: ${item.title}.`); return null;
      }
    }, { concurrency: 2, retries: 0 });
    const articles = loaded.filter((a): a is Article => !!a);
    for (const [key, value] of this.cache) if (value.expiresAt <= now) this.cache.delete(key);
    const missing: Article[] = [];
    for (const article of articles) {
      const cached = this.cache.get(this.key(article));
      if (!cached) { missing.push(article); continue; }
      const r = cached.reading;
      if (r.tag === "unassessed") {
        result.reasons.push(`Isi belum dapat disimpulkan: ${article.title}. ${r.rationale}`); continue;
      }
      result.evidence.push({
        slug: article.slug, title: article.title, source: article.source, category: article.category,
        url: `https://portalnews.newsmaker.id/api/v1/newsmaker/berita/show/${encodeURIComponent(article.slug)}`,
        publishedAt: article.publishedAt!, reviewedAt: new Date(cached.reviewedAt).toISOString(),
        contentHash: articleHash(article), excerpt: r.excerpt, rationale: r.rationale, tag: r.tag,
        reviewMethod: "ai", model: NEWS_MODEL, analysisVersion: NEWS_ANALYSIS_VERSION, relevance: r.relevance,
      });
    }
    if (missing.length) {
      if (!this.pending && now >= this.retryAt) this.schedule(missing, now);
      if (this.pending) {
        result.processing = true;
        result.reasons.push("MRG sedang membaca isi berita secara otomatis. Tunggu sebentar, lalu lihat saran.");
      } else {
        result.reasons.push(this.failure || "Batas pembacaan otomatis tercapai; tunggu sebelum mencoba lagi.");
      }
    }
    if (!missing.length && !result.reasons.length &&
      result.evidence.length === selected.length &&
      result.evidence.some(e => e.relevance === "relevant")) result.status = "assessed";
    else if (!missing.length && !result.reasons.length) {
      result.reasons.push("Artikel yang dibaca tidak cukup relevan untuk menilai fundamental emas/USD.");
    }
    result.evidence.sort((a, b) => a.slug.localeCompare(b.slug));
    result.reasons.sort();
    return result;
  }

  private schedule(articles: Article[], now: number) {
    const chars = articles.reduce((sum, a) => sum + (a.content || a.contentEn).length, 0);
    this.calls = this.calls.filter(call => now - call.at < HOUR);
    if (chars > 40_000 || this.calls.length >= 8 ||
      this.calls.reduce((sum, c) => sum + c.chars, 0) + chars > 120_000) {
      this.retryAt = now + 60_000;
      this.failure = "Batas ukuran/pemakaian pembaca berita tercapai; fundamental belum lengkap.";
      return;
    }
    this.calls.push({ at: now, chars });
    this.failure = "";
    this.pending = (async () => {
      // A deadline also protects injected/adapted providers; the SDK has its own timeout.
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const raw = await Promise.race([
          this.dependencies.classify(articles, now),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Deadline")), 30_000); }),
        ]);
        const readings = validateNewsReadings({ articles: raw }, articles);
        const reviewedAt = this.clock();
        readings.forEach(r => {
          const article = articles.find(a => a.slug === r.slug)!;
          if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!);
          this.cache.set(this.key(article), {
            reading: r, reviewedAt,
            expiresAt: Math.min(reviewedAt + (r.tag === "unassessed" ? 5 : 30) * 60_000, Date.parse(article.publishedAt!) + DAY),
          });
        });
      } catch {
        // Never expose provider response bodies, credentials or silently turn failures into neutral.
        this.retryAt = this.clock() + 60_000;
        this.failure = "Pembacaan berita otomatis gagal atau buktinya tidak valid. Coba lagi setelah satu menit.";
      } finally {
        if (timer) clearTimeout(timer);
        this.pending = null;
      }
    })();
  }
}
