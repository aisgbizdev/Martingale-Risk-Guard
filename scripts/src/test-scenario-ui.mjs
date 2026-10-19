import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import { chromium, firefox, webkit } from "playwright-core";
import { fixture, highImpactEvent, NOW, viewports } from "./scenario-ui/fixtures.mjs";
import { browserProfile } from "./scenario-ui/browser-config.mjs";
import { tsImport } from "tsx/esm/api";

// Exercise the original pure study rules without a live backend or stored user data.
const { calculateRisk } = await tsImport("../../artifacts/api-server/src/rules.ts", import.meta.url);
const { riskInputSchema } = await tsImport("../../lib/mrg-shared/src/schema.ts", import.meta.url);
const { suggestFromCapital } = await tsImport("../../lib/mrg-shared/src/capital-suggestion.ts", import.meta.url);
const { technicalReferencePlan, referenceFillStage } = await tsImport("../../lib/mrg-shared/src/technical-reference-plan.ts", import.meta.url);

const profile = browserProfile(process.argv.slice(2));
const buildRoot = resolve("generated-artifacts/scenario-ui-app");
const output = resolve("generated-artifacts/scenario-ui", profile.outputSuffix);
const startedAt = new Date().toISOString();
const evidenceDirectory = `generated-artifacts/scenario-ui/${profile.outputSuffix ? `${profile.outputSuffix}/` : ""}runs/${startedAt.replaceAll(":", "-")}`;
const screenshots = resolve(evidenceDirectory);
await access(resolve(buildRoot, "index.html")); // Never silently test an unbuilt app.
await mkdir(screenshots, { recursive: true });
const app = express();
app.use(express.static(buildRoot));
app.get("/{*path}", (_req, res) => res.sendFile(resolve(buildRoot, "index.html")));
const server = app.listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { ...profile, platform: process.platform, architecture: process.arch, startedAt, evidenceDirectory,
  fixtureTime: NOW, syntheticData: true, physicalDevices: false, status: "not-started", results: [] };
const id = (page, name) => page.getByTestId(name);
const result = page => id(page, "scenario-result");
const calculate = page => id(page, "button-calculate-scenario").click();
async function start(page, side = "buy", capital = "200000") {
  await id(page, "workspace-market").waitFor({ state: "visible" });
  await id(page, "workspace-market").locator("script[src*='tradingview']").waitFor({ state: "attached" });
  assert.equal(await id(page, "workspace-market").isVisible(), true, "Chart panel must be visible without opening a market toggle");
  assert.equal(await id(page, "workspace-market").locator("script[src*='tradingview']").count(), 1, "Mount exactly one guide chart");
  assert.equal(await id(page, "button-view-market").count(), 0);
  await id(page, "scenario-price").getByText("4.500,00", { exact: true }).waitFor();
  await id(page, "input-modal").fill(capital);
  await id(page, `button-side-${side}`).click();
}
async function diagram(page, prices, layers = 2) {
  assert.ok(prices.length >= layers, "Fixture must list every entry price before any summary price");
  await id(page, "table-scenario").waitFor();
  const entries = id(page, "table-scenario").locator("tbody tr").filter({ hasText: /^Layer \d/ });
  assert.equal(await entries.count(), layers);
  for (let i = 0; i < layers; i++) assert.equal(await entries.nth(i).locator("td").nth(1).innerText(), prices[i], "Entry table and SVG must agree");
  const labels = await id(page, "scenario-diagram").locator("text").allTextContents();
  for (const price of prices) assert.ok(labels.includes(price), `Diagram missing price ${price}`);
}
async function limited(page) {
  await id(page, "reference-limited").waitFor();
  assert.match(await id(page, "reference-limited").innerText(), /maksimal 2 layer/);
  assert.match(await id(page, "reference-warning").innerText(), /BUKAN entry\/SL XUL10/);
  assert.equal(await id(page, "reference-filled-3").count(), 0);
}
async function referenceDiagram(page, side, count = 2, capital = 200000) {
  const data = fixture();
  const suggestion = suggestFromCapital(capital, data.context, data.quote.quote, Date.parse(NOW), true, true);
  const plan = technicalReferencePlan(suggestion, side);
  const stage = referenceFillStage(plan, count);
  const table = id(page, "reference-entries");
  await table.waitFor();
  const entries = table.locator("tbody tr").filter({ hasText: /^L\d/ });
  assert.equal(await entries.count(), plan.entries.length);
  const labels = await id(page, "reference-diagram").locator("text").allTextContents();
  for (let i = 0; i < plan.entries.length; i++) {
    assert.equal(await entries.nth(i).locator("td").nth(1).innerText(), plan.entries[i].price.toFixed(2));
    assert.ok(labels.includes(plan.entries[i].price.toFixed(2)));
  }
  assert.equal(await id(page, "reference-average").locator("td").nth(1).innerText(), stage.average.toFixed(2));
  assert.equal(await id(page, "reference-tp").locator("td").nth(1).innerText(), stage.target.price.toFixed(2));
  assert.equal(await id(page, "reference-stop").locator("td").nth(1).innerText(), plan.stop.price.toFixed(2));
  return { plan, stage };
}
const cases = [
  ["buy-limited", null, async page => {
    assert.equal(await id(page, "button-side-buy").getAttribute("aria-pressed"), "false");
    assert.equal(await id(page, "button-side-sell").getAttribute("aria-pressed"), "false");
    await start(page); await calculate(page); await limited(page);
    await referenceDiagram(page, "buy");
    await id(page, "reference-filled-1").click();
    assert.equal(await id(page, "reference-filled-1").getAttribute("aria-pressed"), "true");
    await referenceDiagram(page, "buy", 1);
    assert.match(await id(page, "reference-entries").innerText(), /tertunda/);
    await id(page, "technical-reference-result").screenshot({ path: resolve(output, `${page.viewportSize().width}-filled-l1.jpg`) });
    await id(page, "reference-filled-2").click();
    await referenceDiagram(page, "buy", 2);
    await id(page, "reference-filled-1").click();
    await calculate(page);
    assert.equal(await id(page, "reference-filled-2").getAttribute("aria-pressed"), "true", "A fresh capture resets to all layers");
    await id(page, "reference-details").locator("summary").click();
    assert.match(await id(page, "reference-details").innerText(), /TP memakai level teknikal/);
    await id(page, "reference-strategy-martingale").click(); await calculate(page);
    assert.match(await id(page, "text-scenario-error").innerText(), /Strategi ini dibatasi/);
    assert.equal(await id(page, "technical-reference-result").count(), 0);
  }],
  ["sell-limited", null, async page => {
    await start(page, "sell"); await calculate(page); await limited(page);
    await referenceDiagram(page, "sell");
    await id(page, "reference-filled-1").click();
    const original = await referenceDiagram(page, "sell", 1);
    await id(page, "input-modal").fill("300000");
    assert.equal(await id(page, "reference-filled-1").getAttribute("aria-pressed"), "true");
    assert.equal(await id(page, "reference-tp").locator("td").nth(1).innerText(), original.stage.target.price.toFixed(2), "An edited capital must not rewrite the captured stage");
    await id(page, "reference-snapshot-stale").waitFor();
    await id(page, "mode-manual").click();
    assert.equal(await id(page, "technical-reference-result").count(), 0);
    await id(page, "mode-market").click();
    assert.equal(await id(page, "technical-reference-result").count(), 0, "Mode switching cannot revive a stage");
  }],
  ["direction-never-reactivates-old-result", null, async page => {
    await start(page); await calculate(page); await limited(page);
    await id(page, "button-side-sell").click();
    await id(page, "text-side-invalidated").waitFor();
    assert.equal(await id(page, "reference-diagram").count(), 0);
    await id(page, "button-side-buy").click();
    await id(page, "text-side-invalidated").waitFor();
    assert.equal(await id(page, "reference-diagram").count(), 0, "Switching back must not reactivate the old result");
    await calculate(page);
    await referenceDiagram(page, "buy");
    assert.equal(await id(page, "text-side-invalidated").count(), 0);
  }],
  ["manual-and-default", null, async page => {
    await start(page);
    await id(page, "mode-manual").click();
    await id(page, "select-market-condition").selectOption("Sideways");
    await id(page, "select-strategy").selectOption("Martingale");
    await id(page, "select-max-layer").selectOption("3");
    await id(page, "select-target-poin").selectOption("40");
    await id(page, "input-sc-spacing").fill("25");
    await calculate(page);
    await diagram(page, ["4500.00", "4475.00", "4450.00", "4464.29", "4504.29"], 3);
    assert.equal(await id(page, "table-scenario").locator("tbody tr").filter({ hasText: /^Layer 3/ }).locator("td").nth(2).innerText(), "4");
    assert.match(await result(page).innerText(), /Skenario manual hipotetis/);
    assert.equal(await id(page, "limited-suggestion-warning").count(), 0);
    await id(page, "button-default-simulation").click();
    await diagram(page, ["4500.00", "4470.00", "4440.00", "4460.00", "4490.00"], 3);
    assert.equal(await id(page, "table-scenario").locator("tbody tr").filter({ hasText: /^Layer 3/ }).locator("td").nth(2).innerText(), "3");
    assert.equal(await id(page, "select-strategy").inputValue(), "Linear Averaging");
    assert.equal(await id(page, "select-target-poin").inputValue(), "30");
    assert.equal(await id(page, "input-sc-spacing").inputValue(), "30");
    await id(page, "scenario-budget-warning").waitFor();
  }],
  ["invalid-and-insufficient-capital", null, async page => {
    await start(page, "buy", "0"); await calculate(page);
    await id(page, "text-scenario-error").waitFor();
    assert.match(await id(page, "text-scenario-error").innerText(), /modal positif/i);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
    await id(page, "input-modal").fill("100"); await calculate(page);
    await id(page, "reference-no-lot").waitFor();
    await referenceDiagram(page, "buy", 2, 100);
    assert.equal(await id(page, "reference-first-lot").count(), 0);
  }],
  ["high-impact-calendar-defers", data => data.context.calendar.events.push(highImpactEvent), async page => {
    await start(page); await calculate(page);
    await id(page, "text-scenario-error").waitFor();
    assert.match(await id(page, "text-scenario-error").innerText(), /ditunda.*CPI/s);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
  }],
  ["incomplete-calendar-blocks-but-manual-works", data => { data.context.calendar.complete = false; }, async page => {
    await start(page); await calculate(page);
    await id(page, "text-scenario-error").waitFor();
    assert.match(await id(page, "text-scenario-error").innerText(), /Kalender wajib lengkap/);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
    await id(page, "mode-manual").click();
    await id(page, "select-market-condition").selectOption("Sideways");
    await calculate(page);
    await diagram(page, ["4500.00", "4470.00", "4440.00", "4490.00"], 3);
  }],
  ["manual-without-live-price", data => {
    data.quote.status = "unavailable";
    data.quote.quote = null;
  }, async page => {
    await id(page, "input-modal").fill("20000");
    await id(page, "mode-manual").click();
    await id(page, "select-market-condition").selectOption("Sideways");
    await calculate(page);
    await id(page, "text-risk-score").waitFor();
    assert.equal(await id(page, "scenario-diagram").count(), 0, "No invented live-price diagram");
    await id(page, "select-strategy").selectOption("Martingale");
    await id(page, "select-experience").selectOption("Berpengalaman");
    await id(page, "button-default-simulation").click();
    await id(page, "text-risk-score").waitFor();
    assert.equal(await id(page, "select-strategy").inputValue(), "Linear Averaging");
    assert.equal(await id(page, "select-experience").inputValue(), "Pemula");
    assert.equal(await id(page, "select-market-condition").inputValue(), "Sideways");
    assert.equal(await id(page, "input-modal").inputValue(), "20000");
  }],
  ["required-direction", null, async page => {
    await id(page, "scenario-price").getByText("4.500,00", { exact: true }).waitFor();
    await id(page, "input-modal").fill("20000"); await calculate(page);
    await id(page, "text-scenario-error").waitFor();
    assert.match(await id(page, "text-scenario-error").innerText(), /Pilih arah Buy atau Sell/);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
  }],
];
const only = process.env.MRG_UI_CASES?.split(",").filter(Boolean);
if (only?.some(name => !cases.some(c => c[0] === name))) throw new Error("Unknown MRG_UI_CASES test name");
const selectedCases = only ? cases.filter(c => only.includes(c[0])) : cases;
assert.ok(selectedCases.length, "At least one UI case must be selected");
report.selectedCases = selectedCases.map(c => c[0]);
report.scope = only ? "focused" : "full";
report.expected = viewports.length * selectedCases.length;
report.complete = false;
// Replace the latest pointer immediately, so an interrupted run cannot leave an old pass.
const reportPath = `${output}/${only ? "report-focused" : "report"}.json`;
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
let browser;
try {
  try {
    if (profile.engine === "chromium") {
      const executablePath = process.env.MRG_CHROMIUM ?? execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
      browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    } else {
      // Use the matching Playwright binaries, never a spoofed user-agent or Chromium fallback.
      browser = await ({ firefox, webkit })[profile.engine].launch({ headless: true });
    }
  } catch (error) {
    report.status = "unavailable";
    report.environmentError = error.message;
    throw error;
  }
  report.browser = browser.version();
  report.status = "running";
  for (const viewport of viewports) for (const [name, change, run] of selectedCases) {
    const entry = { name, viewport, passed: false };
    const data = fixture(); change?.(data);
    const context = await browser.newContext({ viewport, locale: "id-ID", timezoneId: "Asia/Jakarta", serviceWorkers: "block", reducedMotion: "reduce" });
    const errors = [], apiCalls = [];
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.setFixedTime(new Date(NOW));
    await context.addInitScript(() => {
      localStorage.setItem("language", "id");
      localStorage.setItem("mrg_welcome_seen", "1");
      localStorage.setItem("mrg_ui_regression_sentinel", "untouched");
    });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort(); // No vendor, AI or live data calls.
      if (!url.pathname.startsWith("/api/")) return route.continue();
      apiCalls.push(`${request.method()} ${url.pathname}`);
      if (request.method() === "GET" && url.pathname === "/api/market/quotes") return route.fulfill({ json: data.quote });
      if (request.method() === "GET" && url.pathname === "/api/market/context") return route.fulfill({ json: data.context });
      if (request.method() === "POST" && url.pathname === "/api/calculate-risk") {
        const input = riskInputSchema.safeParse(request.postDataJSON());
        if (!input.success) {
          errors.push("Invalid unified manual study payload");
          return route.fulfill({ status: 400, json: { error: "Invalid study input" } });
        }
        return route.fulfill({ json: calculateRisk(input.data) });
      }
      errors.push(`Unexpected API call: ${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 500, json: { error: "Unexpected fixture request" } });
    });
    try {
      await page.goto(origin);
      await run(page);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Horizontal overflow");
      assert.equal(await page.evaluate(() => localStorage.getItem("mrg_ui_regression_sentinel")), "untouched");
      assert.deepEqual(errors, [], "Runtime errors or unexpected API calls");
      assert.ok(apiCalls.includes("GET /api/market/quotes") && apiCalls.includes("GET /api/market/context"), "Fixture APIs were not consumed");
      entry.passed = true;
      if (name === "buy-limited" || name === "sell-limited") {
        await result(page).scrollIntoViewIfNeeded();
        entry.screenshot = `${evidenceDirectory}/${viewport.width}-${name}.jpg`;
        await page.screenshot({ path: resolve(entry.screenshot), type: "jpeg", quality: 70, fullPage: true });
      }
      console.log(`PASS ${viewport.width}px ${name}`);
    } catch (error) {
      entry.passed = false;
      entry.error = error.stack ?? String(error);
      await page.screenshot({ path: `${screenshots}/${viewport.width}-${name}-failed.jpg`, type: "jpeg", quality: 70, fullPage: true }).catch(() => {});
      console.error(`FAIL ${viewport.width}px ${name}: ${error.message}`);
    } finally {
      entry.apiCalls = apiCalls;
      entry.runtimeErrors = errors;
      report.results.push(entry);
      await context.close();
    }
  }
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
  report.passed = report.results.filter(r => r.passed).length;
  report.failed = report.results.filter(r => !r.passed).length;
  report.expectedCases = viewports.length * selectedCases.length;
  if (report.status !== "unavailable") report.status = report.failed || report.results.length !== report.expectedCases ? "failed" : "passed";
  report.finishedAt = new Date().toISOString();
  report.complete = report.results.length === report.expected;
  const json = JSON.stringify(report, null, 2) + "\n";
  await writeFile(`${screenshots}/report.json`, json);
  await writeFile(reportPath, json);
}
assert.equal(report.results.length, viewports.length * selectedCases.length, "All selected viewport cases must run");
assert.equal(report.failed, 0, `${report.failed} UI regressions failed; see ${output}/${only ? "report-focused" : "report"}.json`);
console.log(`${profile.browserProduct} ${report.browser} on ${process.platform}: ${report.passed}/${report.results.length} deterministic UI cases passed. Synthetic fixtures; emulated viewports, not physical devices, Apple Safari or live-feed verification.`);
