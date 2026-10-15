import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuote } from "./prices";
import { normalizeEvent } from "./calendar";
import { normalizeNews, plainText } from "./news";
import { SingleFlightCache } from "./provider";

test("quote mapping preserves XUL10, bid/ask, and per-symbol timestamp", () => {
  const result = normalizeQuote({ status: "success", updatedAt: "2026-10-14T13:00:00Z", data: [
    { symbol: "XUL10", price: "100", sell: "99.6", buy: "100.4", serverDateTime: "2026-10-14 19:00:00" },
  ] });
  assert.equal(result.bid, 99.6);
  assert.equal(result.ask, 100.4);
  assert.equal(result.asOf, "2026-10-14T12:00:00.000Z");
});
test("global response timestamp cannot hide missing tick timestamps", () => {
  assert.equal(normalizeQuote({ status: "success", updatedAt: "2026-10-14T13:00:00Z",
    data: [{ symbol: "XUL10", price: 100 }] }).asOf, null);
});
test("documented quote row uses its ISO updatedAt, not the envelope refresh time", () => {
  const quote = normalizeQuote({ status: "success", updatedAt: "2026-10-14T14:00:00Z", serverTime: "21:00:00",
    data: [{ instrument: "XAU/USD", symbol: "XUL10", price: "100", buy: "100.4", sell: "99.6",
      serverTime: "20:00:00", updatedAt: "2026-10-14T13:00:00Z" }] });
  assert.equal(quote.asOf, "2026-10-14T13:00:00.000Z");
  assert.equal(quote.bid, 99.6); assert.equal(quote.ask, 100.4);
});
test("documented per-symbol serverTime is accepted only when it includes a valid full date", () => {
  assert.equal(normalizeQuote({ status: "success", data: [
    { symbol: "XUL10", price: 100, serverTime: "2026-10-14 20:00:00" },
  ] }).asOf, "2026-10-14T13:00:00.000Z");
});
test("time-only quote clocks cannot borrow a date from global updatedAt or the current day", () => {
  assert.equal(normalizeQuote({ status: "success", updatedAt: "2026-10-14T13:00:00Z",
    serverTime: "20:00:00", data: [{ symbol: "XUL10", price: 100, serverTime: "20:00:00" }] }).asOf, null);
});
test("a newer wrapper timestamp cannot hide an older native per-symbol tick", () => {
  assert.equal(normalizeQuote({ status: "success", updatedAt: "2026-10-14T13:00:00Z", data: [
    { symbol: "XUL10", price: 100, serverDateTime: "2026-10-14 19:00:00",
      updatedAt: "2026-10-14T13:00:00Z", serverTime: "20:00:00" },
  ] }).asOf, "2026-10-14T12:00:00.000Z");
});
test("malformed documented timestamps remain unknown instead of inheriting a fresh response time", () => {
  for (const updatedAt of ["bad", "2026-02-30T13:00:00Z", "2026-10-14T24:00:00Z"]) {
    assert.equal(normalizeQuote({ status: "success", updatedAt: "2026-10-14T13:00:00Z",
      data: [{ symbol: "XUL10", price: 100, updatedAt, serverTime: "20:00:00" }] }).asOf, null);
  }
});
test("missing symbols, disconnected feed, crossed prices and zero price fail explicitly", () => {
  assert.throws(() => normalizeQuote({ status: "success", data: [{ symbol: "OTHER", price: 100 }] }));
  assert.throws(() => normalizeQuote({ status: "success", state: "disconnected", data: [{ symbol: "XUL10", price: 100 }] }));
  assert.throws(() => normalizeQuote({ status: "success", data: [{ symbol: "XUL10", price: 100, sell: 101, buy: 99 }] }));
  assert.throws(() => normalizeQuote({ status: "success", data: [{ symbol: "XUL10", price: 0 }] }));
});
test("optional quote fields remain unknown, not zero or fabricated", () => {
  const quote = normalizeQuote({ status: "success", data: [{ symbol: "XUL10", price: 100 }] });
  assert.equal(quote.bid, null); assert.equal(quote.ask, null);
});
test("calendar period event uses figures/country and the provided Jakarta timezone", () => {
  const value = normalizeEvent({ id: 1, date: "2026-10-14", time: "20.30", country: "USD",
    figures: "CPI y/y", impact: "High", actual: "2%", forecast: "-", previous: null }, "Asia/Jakarta");
  assert.equal(value.name, "CPI y/y");
  assert.equal(value.at, "2026-10-14T13:30:00.000Z");
  assert.equal(value.impact, "high");
  assert.equal(value.actual, "2%");
  assert.equal(value.forecast, null);
});
test("missing date, All Day and unknown impacts remain explicitly unknown", () => {
  const value = normalizeEvent({ id: 1, figures: "Event", country: "USD", date: null, time: "All Day", impact: "?" }, "Asia/Jakarta");
  assert.equal(value.at, null); assert.equal(value.date, null); assert.equal(value.impact, "unknown");
  assert.throws(() => normalizeEvent({ id: 1 }, "Asia/Jakarta"), /Invalid/);
});
test("news item excludes raw author/user data and accepts only safe slug identifiers", () => {
  const item = normalizeNews({ slug: "14102026-emas", title_id: "Emas", title_en: "Gold", created_at: "2026-10-14T13:00:00Z",
    author_user: { name: "private" }, main_category: { name: "Gold" } });
  assert.equal(item.titleEn, "Gold");
  assert.equal("author_user" in item, false);
  assert.throws(() => normalizeNews({ slug: "../admin", title_id: "Bad" }));
});
test("article output is plain text with paragraphs and no active script markup", () => {
  const result = plainText("<script>alert(1)</script><p>Hello &amp; world</p><p>Next<br>line</p>");
  assert.equal(result, "Hello & world\n\nNext\n\nline");
  assert.equal(plainText(null), "");
});
test("concurrent cache misses collapse into one provider request", async () => {
  const cache = new SingleFlightCache<number>();
  let calls = 0;
  const load = async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return 42; };
  assert.deepEqual(await Promise.all([cache.get(load, 1000), cache.get(load, 1000), cache.get(load, 1000)]), [42, 42, 42]);
  assert.equal(await cache.get(load, 1000), 42);
  assert.equal(calls, 1);
});
test("failed upstream requests have a short failure cache instead of retry fan-out", async () => {
  const cache = new SingleFlightCache<number>();
  let calls = 0;
  const load = async () => { calls++; throw new Error("Unavailable"); };
  await assert.rejects(() => cache.get(load, 1000));
  await assert.rejects(() => cache.get(load, 1000));
  assert.equal(calls, 1);
});
