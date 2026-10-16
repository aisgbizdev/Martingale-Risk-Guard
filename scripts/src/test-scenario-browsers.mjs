import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { browserProfile } from "./scenario-ui/browser-config.mjs";

// Build once in the package command, then exercise both actual engines even if one fails.
const output = resolve("generated-artifacts/scenario-ui");
await access(resolve("generated-artifacts/scenario-ui-app/index.html"));
await mkdir(output, { recursive: true });
const summary = { platform: process.platform, syntheticData: true, physicalDevices: false,
  appleSafariVerified: false, startedAt: new Date().toISOString(), engines: [] };
for (const engine of ["firefox", "webkit"]) {
  const profile = browserProfile([`--browser=${engine}`]);
  const reportPath = resolve(output, profile.outputSuffix, process.env.MRG_UI_CASES ? "report-focused.json" : "report.json");
  const startedAt = Date.now();
  const child = spawnSync(process.execPath, ["scripts/src/test-scenario-ui.mjs", `--browser=${engine}`], { stdio: "inherit", timeout: 240000 });
  let report;
  try { report = JSON.parse(await readFile(reportPath, "utf8")); } catch {}
  // Only accept a report produced by this child, never stale success left on disk.
  const fresh = await stat(reportPath).then(s => s.mtimeMs >= startedAt).catch(() => false);
  summary.engines.push({ engine, exitCode: child.status, signal: child.signal, error: child.error?.message,
    reportPath, status: child.status === 0 && fresh && report?.status === "passed" ? "passed" : fresh && report?.status === "unavailable" ? "unavailable" : "failed",
    passed: fresh ? report?.passed : 0, expectedCases: fresh ? report?.expectedCases : null,
    browser: fresh ? report?.browser : null, environmentError: fresh ? report?.environmentError : null });
}
summary.finishedAt = new Date().toISOString();
summary.status = summary.engines.every(e => e.status === "passed") ? "passed" : "failed";
await writeFile(resolve(output, "cross-browser-report.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (summary.status !== "passed") process.exitCode = 1;
