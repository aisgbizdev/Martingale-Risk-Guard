import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve } from "./approve.mjs";
import { imageNames } from "./fixtures.mjs";

async function candidate(report, action) {
  const dir = await mkdtemp(join(tmpdir(), "mrg-approval-"));
  try {
    await writeFile(join(dir, "report.json"), JSON.stringify(report));
    await action(dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
test("approval requires an identified reviewer and a reason", async () => {
  await assert.rejects(approve("/nonexistent", "", "intentional"), /requires/);
  await assert.rejects(approve("/nonexistent", "reviewer", ""), /requires/);
});
test("a failed or ordinary comparison run cannot become a baseline", async () => {
  for (const report of [
    { mode: "compare", errors: [], results: [] },
    { mode: "candidate", errors: ["fixture failed"], results: [] },
  ]) await candidate(report, dir => assert.rejects(approve(dir, "reviewer", "reason"), /error-free candidate/));
});
test("partial candidates cannot be approved", async () => {
  await candidate({ mode: "candidate", errors: [], results: [] }, dir => assert.rejects(approve(dir, "reviewer", "reason"), /complete current matrix/));
});
test("missing image bytes cannot be approved even with a complete report", async () => {
  await candidate({ mode: "candidate", errors: [], results: imageNames().map(name => ({ name, sha256: "fake" })) },
    dir => assert.rejects(approve(dir, "reviewer", "reason"), /ENOENT/));
});
