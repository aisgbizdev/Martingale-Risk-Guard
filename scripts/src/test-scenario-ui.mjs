import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import { chromium } from "playwright-core";
import { fixture, highImpactEvent, NOW, viewports } from "./scenario-ui/fixtures.mjs";

const buildRoot = resolve("generated-artifacts/scenario-ui-app");
const output = resolve("generated-artifacts/scenario-ui");
await access(resolve(buildRoot, "index.html")); // Never silently test an unbuilt app.
await mkdir(output, { recursive: true });
const app = express();
app.use(express.static(buildRoot));
app.get("/{*path}", (_req, res) => res.sendFile(resolve(buildRoot, "index.html")));
const server = app.listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { fixtureTime: NOW, syntheticData: true, physicalDevices: false, results: [] };
const id = (page, name) => page.getByTestId(name);
const result = page => id(page, "scenario-result");
const calculate = page => id(page, "button-calculate-scenario").click();
async function start(page, side = "buy", capital = "20000") {
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
  await id(page, "limited-suggestion-warning").waitFor();
  assert.match(await id(page, "limited-suggestion-warning").innerText(), /belum dinilai, bukan netral/);
  assert.match(await result(page).innerText(), /Snapshot saran MRG/);
  const text = await result(page).innerText();
  assert.match(text, /600[,.]00/);
  assert.match(text, /1[.,]640[,.]00/);
}
const cases = [
  ["buy-limited", null, async page => {
    assert.equal(await id(page, "button-side-buy").getAttribute("aria-pressed"), "false");
    assert.equal(await id(page, "button-side-sell").getAttribute("aria-pressed"), "false");
    await start(page); await calculate(page); await limited(page);
    await diagram(page, ["4500.00", "4459.00", "4472.67", "4492.67", "4418.00"]);
    await result(page).locator("summary").filter({ hasText: "Dasar saran" }).click();
    assert.match(await result(page).innerText(), /T=floor\(0,25×ATR\), S=ceil\(0,5×ATR\)/);
  }],
  ["sell-limited", null, async page => {
    await start(page, "sell"); await calculate(page); await limited(page);
    await diagram(page, ["4500.00", "4541.00", "4527.33", "4507.33", "4582.00"]);
  }],
  ["direction-never-reactivates-old-result", null, async page => {
    await start(page); await calculate(page); await limited(page);
    await id(page, "button-side-sell").click();
    await id(page, "text-side-invalidated").waitFor();
    assert.equal(await id(page, "scenario-diagram").count(), 0);
    await id(page, "button-side-buy").click();
    await id(page, "text-side-invalidated").waitFor();
    assert.equal(await id(page, "scenario-diagram").count(), 0, "Switching back must not reactivate the old result");
    await calculate(page);
    await diagram(page, ["4500.00", "4459.00", "4492.67"]);
    assert.equal(await id(page, "text-side-invalidated").count(), 0);
  }],
  ["manual-and-default", null, async page => {
    await start(page);
    await id(page, "mode-manual").click();
    await id(page, "select-sc-strategy").selectOption("Martingale");
    await id(page, "select-sc-layers").selectOption("3");
    await id(page, "input-sc-target").fill("40");
    await id(page, "input-sc-spacing").fill("25");
    await calculate(page);
    await diagram(page, ["4500.00", "4475.00", "4450.00", "4464.29", "4504.29"], 3);
    assert.equal(await id(page, "table-scenario").locator("tbody tr").filter({ hasText: /^Layer 3/ }).locator("td").nth(2).innerText(), "0.4");
    assert.match(await result(page).innerText(), /Skenario manual hipotetis/);
    assert.equal(await id(page, "limited-suggestion-warning").count(), 0);
    await id(page, "button-default-simulation").click();
    await diagram(page, ["4500.00", "4470.00", "4440.00", "4460.00", "4490.00"], 3);
    assert.equal(await id(page, "table-scenario").locator("tbody tr").filter({ hasText: /^Layer 3/ }).locator("td").nth(2).innerText(), "0.3");
    assert.equal(await id(page, "select-sc-strategy").inputValue(), "Linear Averaging");
    assert.equal(await id(page, "input-sc-target").inputValue(), "30");
    assert.equal(await id(page, "input-sc-spacing").inputValue(), "30");
    await id(page, "scenario-budget-warning").waitFor();
  }],
  ["invalid-and-insufficient-capital", null, async page => {
    await start(page, "buy", "0"); await calculate(page);
    await id(page, "text-scenario-error").waitFor();
    assert.match(await id(page, "text-scenario-error").innerText(), /modal positif/i);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
    await id(page, "input-modal").fill("100"); await calculate(page);
    assert.match(await id(page, "text-scenario-error").innerText(), /Tidak ada kandidat/);
    assert.equal(await id(page, "scenario-diagram").count(), 0);
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
    await id(page, "mode-manual").click(); await calculate(page);
    await diagram(page, ["4500.00", "4470.00", "4440.00", "4490.00"], 3);
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
let browser;
try {
  const executablePath = process.env.MRG_CHROMIUM ?? execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  report.browser = browser.version();
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
        await page.screenshot({ path: `${output}/${viewport.width}-${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
      }
      console.log(`PASS ${viewport.width}px ${name}`);
    } catch (error) {
      entry.error = error.stack ?? String(error);
      await page.screenshot({ path: `${output}/${viewport.width}-${name}-failed.jpg`, type: "jpeg", quality: 70, fullPage: true }).catch(() => {});
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
  await writeFile(`${output}/${only ? "report-focused" : "report"}.json`, JSON.stringify(report, null, 2) + "\n");
}
assert.equal(report.results.length, viewports.length * selectedCases.length, "All selected viewport cases must run");
assert.equal(report.failed, 0, `${report.failed} UI regressions failed; see generated-artifacts/scenario-ui/${only ? "report-focused" : "report"}.json`);
console.log(`${report.passed}/${report.results.length} deterministic UI cases passed. Synthetic fixtures; emulated viewports, not physical devices or live-feed verification.`);
