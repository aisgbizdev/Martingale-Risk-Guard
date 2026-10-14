import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hash } from "./compare.mjs";
import { imageNames } from "./fixtures.mjs";

export async function approve(candidateDir, reviewer, reason) {
  if (!reviewer?.trim() || !reason?.trim()) throw new Error("Approval requires --reviewer and --reason after inspecting the HTML report.");
  const report = JSON.parse(await readFile(resolve(candidateDir, "report.json"), "utf8"));
  if (report.mode !== "candidate" || report.errors.length) throw new Error("Only an error-free candidate run may be approved.");
  const names = imageNames().sort();
  if (JSON.stringify(report.results.map(r => r.name).sort()) !== JSON.stringify(names)) throw new Error("Candidate must contain the complete current matrix.");
  // Validate every file before overwriting anything. Missing/truncated/edited candidates cannot be approved.
  for (const result of report.results) {
    const bytes = await readFile(resolve(candidateDir, "actual", result.name));
    if (hash(bytes) !== result.sha256) throw new Error(`Candidate changed since capture: ${result.name}`);
  }
  await mkdir("test/visual/baselines", { recursive: true });
  for (const result of report.results) await copyFile(resolve(candidateDir, "actual", result.name), `test/visual/baselines/${result.name}`);
  await writeFile("test/visual/baselines/approval.json", JSON.stringify({
    schema: 1, reviewer, reason, approvedAt: new Date().toISOString(),
    environment: report.environment, fixtureHash: report.fixtureHash, tolerance: report.tolerance,
    images: Object.fromEntries(report.results.map(r => [r.name, r.sha256])),
  }, null, 2) + "\n");
  console.log(`Approved ${names.length} baselines. Review and commit the baseline files plus approval.json together.`);
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const value = flag => process.argv[process.argv.indexOf(flag) + 1];
  if (!process.argv.includes("--reviewer") || !process.argv.includes("--reason")) throw new Error("Use --reviewer 'name' --reason 'intentional design change' [--candidate-dir directory].");
  await approve(process.argv.includes("--candidate-dir") ? value("--candidate-dir") : "generated-artifacts/visual/candidate", value("--reviewer"), value("--reason"));
}
