import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pendingEditorialAssessment } from "./news";

test("missing editorial metadata is incomplete, not neutral or processing AI", () => {
  const result = pendingEditorialAssessment(Date.parse("2026-10-16T10:00:00Z"));
  assert.equal(result.status, "incomplete");
  assert.deepEqual(result.evidence, []);
  assert.equal(result.processing, false);
  assert.match(result.reasons.join(), /redaksi/);
});
test("production news entry point does not import an AI reader or classifier", () => {
  const source = readFileSync(new URL("./news.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["']\.\/(?:news-ai|automatic-fundamental)["']/);
  assert.doesNotMatch(source, /classifyNews|newsAIConfigured|AutomaticFundamentalReader/);
});
