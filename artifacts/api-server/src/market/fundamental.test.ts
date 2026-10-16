import test from "node:test";
import assert from "node:assert/strict";
import { articleHash, assessFundamental, type EditorialRecord } from "./fundamental";
import type { Article } from "@workspace/mrg-shared/live-types";

const now = Date.parse("2026-10-16T04:54:10Z"), stamp = new Date(now).toISOString();
const article: Article = {
  slug: "gold-context", title: "Gold context", titleEn: "Gold context", publishedAt: stamp,
  source: "Newsmaker", category: "Gold", content: "Gold uncertainty increased after the USD release.",
  contentEn: "",
};
const record = (): EditorialRecord => ({
  slug: article.slug, publishedAt: stamp, reviewedAt: stamp, contentHash: articleHash(article),
  excerpt: "Gold uncertainty increased", rationale: "USD release adds gold uncertainty.", tag: "high-uncertainty",
});

test("editorial assessment is traceable to loaded full body and source timestamp, not title sentiment", async () => {
  let loaded = "";
  const result = await assessFundamental([article], [record()], async slug => { loaded = slug; return article; }, now);
  assert.equal(result.status, "assessed");
  assert.equal(loaded, article.slug);
  assert.equal(result.evidence[0].excerpt, record().excerpt);
  assert.equal(result.evidence[0].tag, "high-uncertainty");
  assert.match(result.evidence[0].url, /berita\/show\/gold-context$/);
});

test("ready feed without editorial evidence is incomplete, never neutral", async () => {
  const result = await assessFundamental([article], [], async () => { throw new Error("should not load"); }, now);
  assert.equal(result.status, "incomplete");
  assert.equal(result.evidence.length, 0);
  assert.match(result.reasons.join(), /belum tersedia/);
});

test("conflicting records, stale articles, invalid reviews, edited content, bad quote and load failure fail closed", async () => {
  for (const records of [
    [record(), { ...record(), tag: "covered" as const }],
    [{ ...record(), excerpt: article.title }],
    [{ ...record(), reviewedAt: new Date(now + 1).toISOString() }],
    [{ ...record(), contentHash: "b".repeat(64) }],
    [{ ...record(), rationale: "" }],
  ]) {
    assert.equal((await assessFundamental([article], records, async () => article, now)).status, "incomplete");
  }
  assert.equal((await assessFundamental([article], [record()], async () => { throw Error("503"); }, now)).status, "incomplete");
  assert.equal((await assessFundamental([article], [record()], async () => ({ ...article, content: article.content + " Revised." }), now)).status, "incomplete");
  for (const items of [[], [{ ...article, publishedAt: null }], [{ ...article, publishedAt: new Date(now - 86400001).toISOString() }]]) {
    assert.equal((await assessFundamental(items, [record()], async () => article, now)).status, "incomplete");
  }
});

test("every current article needs coverage; mixed missing assessments cannot be called ready", async () => {
  const result = await assessFundamental([article, { ...article, slug: "second" }], [record()], async () => article, now);
  assert.equal(result.status, "incomplete");
  assert.equal(result.evidence.length, 1);
  assert.match(result.reasons.join(), /second/);
});
