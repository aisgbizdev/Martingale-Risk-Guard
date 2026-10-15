import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import express from "express";
import { chromium } from "playwright-core";
import { calculateRisk } from "../server/rules.ts";
import { quote, context as marketContext, article, input, now, portfolios, scenarios, viewports, captures } from "./visual/fixtures.mjs";
import { compareImages, hash, tolerance } from "./visual/compare.mjs";

const candidate = process.argv.includes("--candidate");
const mutation = process.argv.includes("--prove-regression");
assert.ok(!(candidate && mutation), "Regression proof may not create candidates.");
const dir = `generated-artifacts/visual/${candidate ? "candidate" : mutation ? "regression-proof" : "latest"}`;
const baselineDir = "test/visual/baselines";
const report = { mode: candidate ? "candidate" : "compare", results: [], errors: [], tolerance };
const fonts = JSON.parse(await readFile("test/visual/fonts/resources.json", "utf8"));
const fontCSS = await readFile("test/visual/fonts/google.css", "utf8");
report.fixtureHash = hash(await readFile("script/visual/fixtures.mjs"));
const fontHash = hash(Buffer.concat(await Promise.all(["google.css", ...Object.values(fonts)].sort().map(name => readFile(`test/visual/fonts/${name}`)))));
await rm(dir, { recursive: true, force: true });
await mkdir(`${dir}/actual`, { recursive: true });
await mkdir(`${dir}/expected`, { recursive: true });
await mkdir(`${dir}/diff`, { recursive: true });

// Serve only the built shell on an ephemeral port. No real API or user portfolio is accessed.
const app = express();
app.use(express.static(resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(resolve("dist/public/index.html")));
const server = app.listen(0, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const escape = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function writeReport() {
  report.passed = report.results.filter(r => r.passed).length;
  report.failed = report.results.filter(r => !r.passed).length;
  await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2) + "\n");
  const rows = report.results.map(r => `<section><h2>${escape(r.name)} — ${r.passed ? "PASS" : candidate ? "CANDIDATE" : "FAIL"}</h2><p>${escape(r.error ?? `${r.pixels ?? 0} changed pixels; ratio ${r.ratio ?? 0}; dimensions ${r.dimensionsMatch ?? "candidate"}`)}</p><div class="images"><figure><a href="actual/${r.name}"><img loading="lazy" src="actual/${r.name}"></a><figcaption>Actual</figcaption></figure>${r.hasExpected ? `<figure><a href="expected/${r.name}"><img loading="lazy" src="expected/${r.name}"></a><figcaption>Approved baseline</figcaption></figure><figure><a href="diff/${r.name}"><img loading="lazy" src="diff/${r.name}"></a><figcaption>Diff (red = changed)</figcaption></figure>` : ""}</div></section>`).join("\n");
  await writeFile(`${dir}/index.html`, `<!doctype html><meta charset="utf-8"><title>MRG visual comparison</title><style>body{font:14px system-ui;margin:24px;color:#15345b;background:#eef3f8}section{background:white;padding:16px;margin:16px 0}h2{font-size:16px}.images{display:flex;gap:16px;align-items:flex-start}figure{margin:0;flex:1;max-width:440px}img{width:100%;border:1px solid #ccc}figcaption{padding:8px}pre{white-space:pre-wrap}</style><h1>MRG visual ${candidate ? "candidate — requires explicit approval" : "comparison"}</h1><p>${report.passed} passed / ${report.failed} ${candidate ? "candidates" : "failed"}. Desktop Chromium, emulated viewports, not physical devices.</p><pre>${escape(JSON.stringify({ environment: report.environment, tolerance, errors: report.errors }, null, 2))}</pre>${rows}`);
}
try {
  const executablePath = process.env.MRG_CHROMIUM ?? execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"] });
  report.environment = { browser: browser.version(), platform: process.platform, arch: process.arch, locale: "id-ID", timezone: "Asia/Jakarta", deviceScaleFactor: 1, fontHash };
  let approval;
  if (!candidate) {
    approval = JSON.parse(await readFile(`${baselineDir}/approval.json`, "utf8"));
    assert.deepEqual(approval.environment, report.environment, "Browser/font environment changed. Review a new candidate rather than silently regenerating baselines.");
    assert.equal(approval.fixtureHash, report.fixtureHash, "Fixture matrix changed. Explicit baseline approval required.");
    assert.deepEqual(approval.tolerance, tolerance, "Tolerance changed. Explicit baseline approval required.");
  }
  for (const scenario of scenarios.filter(s => !mutation || s.name === "positions-both")) for (const [width, height] of viewports) {
    assert.ok(report.errors.length < 8, "Stopping after repeated fixture failures; see report.json.");
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: "id-ID", timezoneId: "Asia/Jakarta", isMobile: width < 768, reducedMotion: "reduce", colorScheme: "light", serviceWorkers: "block" });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on("pageerror", error => report.errors.push(`${scenario.name}/${width}: ${error.message}`));
    await page.clock.setFixedTime(new Date(now));
    await context.addInitScript(portfolio => {
      localStorage.setItem("mrg_portfolio_v1", JSON.stringify(portfolio));
      localStorage.setItem("mrg_welcome_seen", "1");
      localStorage.setItem("language", "id");
    }, portfolios[scenario.portfolio ?? "empty"]);
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.hostname === "fonts.googleapis.com") return route.fulfill({ contentType: "text/css", body: fontCSS });
      if (fonts[url.href]) return route.fulfill({ contentType: "font/ttf", body: await readFile(`test/visual/fonts/${fonts[url.href]}`) });
      if (url.origin !== origin) {
        report.errors.push(`Unexpected external resource: ${url.href}`);
        return route.abort();
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      let json;
      if (url.pathname === "/api/market/quotes") json = scenario.stale ? { ...quote, quote: { ...quote.quote, asOf: "2000-01-01T00:00:00.000Z" } } : quote;
      else if (url.pathname === "/api/market/context") json = marketContext;
      else if (url.pathname === "/api/market/news/berita-0") json = article;
      else if (url.pathname === "/api/calculate-risk") {
        assert.equal(route.request().method(), "POST");
        assert.deepEqual(route.request().postDataJSON(), input);
        json = calculateRisk(input);
      } else {
        report.errors.push(`Unexpected API: ${url.pathname}`); return route.abort();
      }
      await route.fulfill({ json });
    });
    try {
      await page.goto(origin + scenario.path);
      // Disable only motion, never content. Finite animations otherwise resume between panel captures.
      await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }" });
      await page.locator("h1").first().waitFor();
      if (scenario.path.startsWith("/result")) await page.getByTestId("text-risk-score").waitFor();
      else if (scenario.path === "/positions" || scenario.path === "/" || scenario.path.startsWith("/analysis")) {
        await page.waitForFunction(() => !document.querySelector(".live-skeleton") && document.body.innerText.includes("MRG · Newsmaker"));
        if (scenario.path === "/") await page.waitForFunction(stale => document.body.innerText.includes(stale ? "Tidak tersedia / terlambat" : "2.605"), scenario.stale ?? false);
        if (scenario.path.includes("tab=calendar")) await page.locator(".live-event").first().waitFor();
        if (scenario.path.includes("tab=news")) await page.locator("button.live-position").first().waitFor();
        if (scenario.path.includes("article=")) await page.locator(".live-article").waitFor();
      }
      if (scenario.action === "details") await page.locator("details").evaluateAll(elements => elements.forEach(el => el.open = true));
      if (scenario.action === "entry") {
        await page.locator('[aria-label="Langkah penggunaan"] button').first().click();
        await page.locator("#harga-masuk-xul10").fill("2612.5");
        await page.locator("#lot").fill("0.75");
      }
      if (scenario.action === "settings") await page.getByRole("button", { name: "Tampilkan pengaturan", exact: true }).click();
      if (scenario.action === "simulation") {
        await page.locator('[aria-label="Langkah penggunaan"] button').nth(2).click();
        await page.getByRole("button", { name: "Buat simulasi", exact: true }).click();
        await page.locator("#harga-hipotetis").fill("2580");
        await page.locator("#lot-hipotetis").fill("1.5");
        await page.getByText("Sesudah hipotetis", { exact: true }).waitFor();
      }
      if (scenario.action === "filters") {
        await page.locator(".live-calendar-filters summary").click();
        await page.getByLabel("Mata uang", { exact: true }).selectOption("USD");
        await page.getByLabel("Dampak", { exact: true }).selectOption("high");
      }
      if (scenario.action === "no-match") await page.getByLabel("Cari acara, negara, atau mata uang", { exact: true }).fill("tidak-ada-agenda");
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const family of ["DM Sans", "Newsreader", "IBM Plex Mono"]) {
          await document.fonts.load(`600 14px "${family}"`);
          if (![...document.fonts].some(f => f.family.replaceAll('"', "") === family && f.status === "loaded")) throw new Error(`Font not loaded: ${family}`);
        }
        await document.fonts.ready;
        window.scrollTo(0, 0);
        document.activeElement?.blur();
      });
      if (mutation) await page.addStyleTag({ content: ".live-position-actions > button { max-width: 140px !important; } .mrg-position-risk-note { color: #e11d48 !important; font-size: 18px !important; }" });
      await page.waitForTimeout(250);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scenario.name} overflows at ${width}`);
      const panelBody = page.locator('[role="dialog"][data-state="open"] .mrg-panel-body');
      if (captures(scenario).length > 1) {
        const dimensions = await panelBody.evaluate(el => ({ max: el.scrollHeight - el.clientHeight, height: el.clientHeight }));
        assert.ok(dimensions.max / 4 <= dimensions.height, "Five panel captures must cover the entire scrollable content without gaps.");
      }
      for (const part of captures(scenario)) {
        if (part !== "page") await panelBody.evaluate((el, fraction) => el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction, { top: 0, quarter: 0.25, middle: 0.5, "three-quarter": 0.75, bottom: 1 }[part]);
        await page.waitForTimeout(50);
        const name = `${scenario.name}-${width}x${height}-${part}.png`;
        const options = { fullPage: part === "page", animations: "disabled", caret: "hide" };
        let bytes = await page.screenshot(options), stable = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          await page.waitForTimeout(100);
          const next = await page.screenshot(options);
          stable = hash(bytes) === hash(next);
          bytes = next;
          if (stable) break;
        }
        assert.ok(stable, `Unstable rendering: ${name}. Fix the fixture rather than broadening pixel tolerances.`);
        await writeFile(`${dir}/actual/${name}`, bytes);
        const result = { name, sha256: hash(bytes), passed: false };
        if (!candidate) {
          try {
            const expected = await readFile(`${baselineDir}/${name}`);
            assert.equal(hash(expected), approval.images[name], "Baseline image lacks matching approval hash.");
            const { diff, ...comparison } = compareImages(expected, bytes);
            Object.assign(result, comparison, { hasExpected: true });
            await copyFile(`${baselineDir}/${name}`, `${dir}/expected/${name}`);
            await writeFile(`${dir}/diff/${name}`, diff);
          } catch (error) { result.error = error.message; }
        }
        report.results.push(result);
        console.log(`${candidate ? "CANDIDATE" : result.passed ? "PASS" : "FAIL"} ${name}${result.pixels ? ` (${result.pixels} pixels)` : ""}`);
      }
    } catch (error) {
      console.error(`ERROR ${scenario.name}/${width}: ${error.message}`);
      report.errors.push(`${scenario.name}/${width}: ${error.stack}`);
      await page.screenshot({ path: `${dir}/actual/error-${scenario.name}-${width}.png` }).catch(() => {});
    } finally { await context.close(); await writeReport(); }
  }
} catch (error) { report.errors.push(error.stack); }
finally {
  await writeReport();
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
console.log(`Report: ${dir}/index.html`);
if (report.errors.length || (!candidate && report.failed)) {
  console.error(report.errors.join("\n"));
  process.exitCode = 1;
}
