import test from "node:test";
import assert from "node:assert/strict";
import { compareCalendarValues, matchBodyTopics, readCalendarRules } from "./market-rules";
import type { CalendarEvent, MarketContext } from "./live-types";

const now = Date.parse("2026-10-16T10:00:00Z"), stamp = new Date(now).toISOString();
const event: CalendarEvent = {
  id: "cpi", name: "CPI y/y", currency: "USD", impact: "high",
  date: "2026-10-16", time: "16:00", at: new Date(now - 3600_000).toISOString(),
  previous: "3.0%", forecast: "3.1%", actual: "3.2%", explanation: null, source: "Newsmaker",
};
function calendar(events = [event]): MarketContext["calendar"] {
  return { status: "ready", complete: true, generatedAt: stamp, receivedAt: stamp, timezone: "Asia/Jakarta", events, message: null };
}
test("numeric comparisons preserve units, signs, grouping and scale without guessing prose", () => {
  assert.equal(compareCalendarValues("3.2%", "3.1%"), "above");
  assert.equal(compareCalendarValues("-25K", "0"), "below");
  assert.equal(compareCalendarValues("1.2M", "1,200K"), "equal");
  assert.equal(compareCalendarValues("0.3", "0.30"), "equal");
  for (const [a, b] of [["3,2%", "3.1%"], ["3.2%", "3.1"], ["2-3", "2"], ["1.2T", "1"],
    ["-", "1"], ["3.1 (revised)", "3.0"], ["1,20", "120"], ["Infinity", "0"]]) {
    assert.equal(compareCalendarValues(a, b), "unavailable", `${a} / ${b}`);
  }
});
test("future/unknown release time and missing actual never become a published outcome", () => {
  const result = readCalendarRules(calendar([
    event, { ...event, id: "future", at: new Date(now + 3600_000).toISOString() },
    { ...event, id: "unknown", at: null }, { ...event, id: "pending", actual: null },
  ]), now);
  const published = result.readings.find(r => r.event.id === "cpi")!;
  assert.equal(published.forecastComparison, "above");
  assert.equal(published.previousComparison, "above");
  for (const id of ["future", "unknown", "pending"]) {
    const reading = result.readings.find(r => r.event.id === id)!;
    assert.equal(reading.forecastComparison, "unavailable");
    assert.notEqual(reading.phase, "published");
  }
});
test("calendar freshness, completeness, timezone and declared window are enforced", () => {
  for (const patch of [{ complete: false }, { status: "unavailable" as const },
    { generatedAt: new Date(now - 3600_000).toISOString() }, { timezone: "UTC" }]) {
    const result = readCalendarRules({ ...calendar(), ...patch }, now);
    assert.equal(result.available, false);
    assert.equal(result.readings.length, 0);
  }
  const outside = readCalendarRules(calendar([
    { ...event, at: new Date(now - 25 * 3600_000).toISOString() },
    { ...event, at: new Date(now + 49 * 3600_000).toISOString() },
    { ...event, currency: "EUR" },
  ]), now);
  assert.equal(outside.total, 0);
});
test("summary cap is explicit and retains the original complete calendar for suggestion checks", () => {
  const input = calendar(Array.from({ length: 14 }, (_, i) => ({ ...event, id: String(i) })));
  const result = readCalendarRules(input, now);
  assert.equal(result.total, 14);
  assert.equal(result.truncated, true);
  assert.equal(result.readings.length, 12);
  assert.equal(input.events.length, 14);
});
test("body matching is evidence only, distinguishes CPI/PCE, and preserves conditional/opinion text", () => {
  const body = "An analyst forecasts CPI could rise if fuel costs increase. This is not a published outcome.";
  const matches = matchBodyTopics(body, readCalendarRules(calendar([
    event, { ...event, id: "pce", name: "Core PCE Price Index" },
  ]), now).readings);
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].eventKeys, ["cpi/2026-10-16"]);
  assert.ok(body.includes(matches[0].excerpt));
  assert.match(matches[0].excerpt, /could rise if/);
  assert.deepEqual(matchBodyTopics("Gold rallied with no economic topic named.", []), []);
});
