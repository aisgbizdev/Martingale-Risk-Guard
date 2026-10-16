import { createHash } from "node:crypto";
import type { Article, NewsItem } from "@workspace/mrg-shared/live-types";
import type { EditorialEvidence, FundamentalAssessment } from "@workspace/mrg-shared/capital-suggestion";

export interface EditorialRecord {
  slug: string;
  publishedAt: string;
  reviewedAt: string;
  contentHash: string;
  excerpt: string;
  rationale: string;
  tag: "high-uncertainty" | "covered";
}

export const articleHash = (article: Article) => createHash("sha256")
  .update(JSON.stringify([article.content, article.contentEn])).digest("hex");

// Fail closed. Each selected current article must be reviewed against its full body.
// Neither title keywords nor "ready" in the provider response constitute an assessment.
export async function assessFundamental(
  items: NewsItem[], records: readonly EditorialRecord[], load: (slug: string) => Promise<Article>,
  now = Date.now(),
): Promise<FundamentalAssessment> {
  const evidence: EditorialEvidence[] = [], reasons: string[] = [];
  const assessment: FundamentalAssessment = {
    status: "incomplete", evaluatedAt: new Date(now).toISOString(),
    scope: "Maksimal 8 artikel emas/USD/makro tersaring dari halaman terbaru Newsmaker; bukan seluruh cakupan pasar.",
    evidence, reasons,
  };
  const current = items.filter(item => {
    const at = Date.parse(item.publishedAt ?? "");
    if (!Number.isFinite(at) || at > now) { reasons.push(`Waktu artikel belum valid: ${item.slug}.`); return false; }
    return now - at <= 24 * 3600_000;
  });
  if (!current.length) reasons.push("Tidak ada cakupan artikel relevan ≤24 jam.");
  await Promise.all(current.map(async item => {
    const matches = records.filter(r => r.slug === item.slug && r.publishedAt === item.publishedAt);
    if (matches.length !== 1) {
      reasons.push(`Penilaian isi ${matches.length ? "bertentangan/duplikat" : "belum tersedia"}: ${item.slug}.`);
      return;
    }
    const r = matches[0];
    const reviewedAt = Date.parse(r.reviewedAt);
    if (!Number.isFinite(reviewedAt) || reviewedAt > now || reviewedAt < Date.parse(item.publishedAt!) ||
      now - reviewedAt > 24 * 3600_000 || !r.rationale?.trim() || !r.excerpt?.trim() ||
      !["covered", "high-uncertainty"].includes(r.tag)) {
      reasons.push(`Penilaian editorial tidak valid/usang: ${item.slug}.`); return;
    }
    try {
      const article = await load(item.slug);
      if (article.slug !== item.slug || article.publishedAt !== item.publishedAt ||
        !article.content.trim() || articleHash(article) !== r.contentHash ||
        !(article.content.includes(r.excerpt) || article.contentEn.includes(r.excerpt))) {
        reasons.push(`Isi berubah atau bukti kutipan tidak cocok: ${item.slug}.`); return;
      }
      evidence.push({
        ...r, title: article.title, publishedAt: item.publishedAt!,
        category: article.category, source: article.source,
        url: `https://portalnews.newsmaker.id/api/v1/newsmaker/berita/show/${encodeURIComponent(item.slug)}`,
      });
    } catch {
      reasons.push(`Isi artikel gagal dimuat: ${item.slug}.`);
    }
  }));
  // Stable ordering for snapshot comparison, independent of request completion order.
  evidence.sort((a, b) => a.slug.localeCompare(b.slug));
  reasons.sort();
  if (!reasons.length && evidence.length === current.length && evidence.length > 0) assessment.status = "assessed";
  return assessment;
}
