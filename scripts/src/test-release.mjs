import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

// A release check must never accept a focused run as the full browser matrix.
assert.ok(!process.env.MRG_UI_CASES, "Unset MRG_UI_CASES: release validation requires the full 33-case matrix");
let executablePath;
try {
  executablePath = process.env.MRG_CHROMIUM || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  const browser = await chromium.launch({
    executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  console.log(`Release preflight: Chromium ${browser.version()} (${executablePath})`);
  await browser.close();
} catch (error) {
  throw new Error("Release check requires runnable Chromium. Put chromium on PATH or set MRG_CHROMIUM to its executable.", { cause: error });
}
const startedAt = Date.now();
for (const args of [["test"], ["run", "test:scenario-ui"]]) {
  const run = spawnSync("pnpm", args, {
    stdio: "inherit", env: { ...process.env, MRG_CHROMIUM: executablePath },
  });
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(run.status ?? 1);
}
const report = JSON.parse(await readFile("generated-artifacts/scenario-ui/report.json", "utf8"));
assert.ok(Date.parse(report.startedAt) >= startedAt, "Browser report must come from this release check");
assert.equal(report.scope, "full");
assert.equal(report.expected, 33);
assert.equal(report.complete, true);
assert.equal(report.passed, 33);
assert.equal(report.failed, 0);
console.log(`Release check PASSED: core tests and 33/33 Chromium cases. Evidence: ${report.evidenceDirectory}`);
console.log("This is a recorded validation check, not an automatic publishing block. Nothing was published.");
