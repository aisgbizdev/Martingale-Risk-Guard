import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import WebSocket from "ws";

// Live freshness/vendor/history assertions remain separate from deterministic pixel comparisons.
// Run `npm run test:visual` too; screenshots produced here are diagnostic, not approved baselines.
const origin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.MRG_TEST_URL;
if (!origin) throw new Error("Set MRG_TEST_URL or run in the Replit workspace with the application workflow running.");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9223", `--user-data-dir=/tmp/mrg-ui-${process.pid}`, "about:blank"], { stdio: "ignore" });
let ws;
const checks = [], errors = [], posts = [];
const expectedPreviewErrors = [];
let serial = 0, dialogAccept = false, staleQuote = false, brokenCalendar = false, storageDeniedScenario = false, blockedWidget = false;
let widgetRequested = false;
const pending = new Map();
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); };
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Protocol timeout: ${method}`)); }, 20000);
  pending.set(id, { resolve, reject, timer });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const value = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description ?? value.exceptionDetails.text);
  return value.result.value;
};
const waitFor = async (expression, timeout = 25000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await evaluate(expression)) return;
    await sleep(200);
  }
  throw new Error(`UI timeout: ${expression}`);
};
const text = () => evaluate("document.body.innerText");
const has = (s) => `!!document.body && document.body.innerText.includes(${JSON.stringify(s)})`;
const stored = () => evaluate('JSON.parse(localStorage.getItem("mrg_portfolio_v1") || "null")');
const click = async (label, aria = false) => {
  await evaluate(`(async () => {
    const scope = document.querySelector('[role="dialog"][data-state="open"]') || document;
    const el = [...scope.querySelectorAll('button')].find(e => ${aria ? `e.getAttribute('aria-label')` : `e.textContent.trim()`} === ${JSON.stringify(label)});
    if (!el || el.disabled) throw new Error('Missing or disabled button: ' + ${JSON.stringify(label)});
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    if (!el.getClientRects().length) throw new Error('Button not visible: ' + ${JSON.stringify(label)});
    el.scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(resolve => requestAnimationFrame(resolve));
    el.focus();
    el.click();
  })()`);
  await sleep(150);
};
const fill = async (label, value) => {
  await evaluate(`(() => {
    const scope = document.querySelector('[role="dialog"][data-state="open"]') || document;
    const label = [...scope.querySelectorAll('label')].find(e => e.textContent.replace(' *','').trim() === ${JSON.stringify(label)});
    const el = label && document.getElementById(label.htmlFor);
    if (!el) throw new Error('Missing field: ' + ${JSON.stringify(label)});
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    if (!el.getClientRects().length) throw new Error('Field not visible: ' + ${JSON.stringify(label)});
    el.scrollIntoView({block:'center'});
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(String(value))});
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await sleep(100);
};
const navigate = async (path, expected) => {
  const previousDocument = await evaluate("performance.timeOrigin");
  await command("Page.navigate", { url: origin + path });
  await waitFor(`performance.timeOrigin !== ${previousDocument} && ${has(expected)}`);
};
const noOverflow = () => evaluate("document.documentElement.scrollWidth <= innerWidth + 1");
const panelFits = () => evaluate(`(() => {
  const panel = document.querySelector('[role="dialog"][data-state="open"]');
  if (!panel) return false;
  const r = panel.getBoundingClientRect(), footer = panel.querySelector('.mrg-panel-footer').getBoundingClientRect();
  const v = visualViewport, top = v?.offsetTop ?? 0, left = v?.offsetLeft ?? 0;
  const height = v?.height ?? innerHeight, width = v?.width ?? innerWidth;
  return r.left >= left - 1 && r.right <= left + width + 1 && r.top >= top - 1 &&
    r.bottom <= top + height + 1 && footer.bottom <= top + height + 1 &&
    panel.scrollWidth <= panel.clientWidth + 1;
})()`);
const panelScreenshot = async (name) => {
  await evaluate("if (!document.querySelector('[role=\"dialog\"][data-state=\"open\"]')) window.scrollTo(0, 0)");
  await sleep(75);
  await mkdir("generated-artifacts/panels", { recursive: true });
  const shot = await command("Page.captureScreenshot", { format: "jpeg", quality: 75 });
  await writeFile(`generated-artifacts/panels/${name}.jpg`, Buffer.from(shot.data, "base64"));
};
const panelIs = (id = null) => id
  ? `document.querySelectorAll('[role="dialog"][data-state="open"]').length === 1 && !!document.querySelector('[data-testid="${id}"][data-state="open"]')`
  : `!document.querySelector('[role="dialog"][data-state="open"]')`;
const travelHistory = async (delta, expected) => {
  const history = await command("Page.getNavigationHistory");
  const entry = history.entries[history.currentIndex + delta];
  assert.ok(entry, `History entry exists at offset ${delta}`);
  // Actual browser traversal (also used by hardware Back), not clicks behind a modal.
  await command("Page.navigateToHistoryEntry", { entryId: entry.id });
  await waitFor(expected);
  await sleep(150);
};
const snapshotReference = () => evaluate(`[...document.querySelectorAll('[data-testid="positions-simulation-panel"] .live-alert')].find(el => el.textContent.includes('Snapshot:'))?.textContent`);
const layoutMatrix = async (name) => {
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(200);
    check(`${name} content fits ${width}x${height}`, await noOverflow());
    check(`${name} has no clipped visible action at ${width}px`, await evaluate(`(() => {
      const scope = document.querySelector('main') || document.getElementById('root');
      return [...scope.querySelectorAll('button')].filter(el => el.getClientRects().length).every(el => {
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.right <= innerWidth + 1;
      });
    })()`));
    if (width === 390 || width === 1440) await panelScreenshot(`${name}-${width}x${height}`);
  }
};
const positionWidths = async (sides) => {
  for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(200);
    check(`${sides.join("+")} positions fit ${width}px`, await noOverflow());
    check(`Primary position actions remain readable rather than wrapping letter-by-letter at ${width}px`, await evaluate(`[...document.querySelectorAll('.live-position-actions > button')].every(button => {
      const copy = button.querySelector('.live-section-copy').getBoundingClientRect();
      return copy.width >= 100 && button.getBoundingClientRect().height <= 110;
    })`));
    const dimensions = await evaluate(`(() => {
      const region = document.querySelector('[data-testid="positions-records"]');
      return ${JSON.stringify(sides)}.map(side => {
        const card = document.querySelector('[data-testid="position-side-' + side + '"]');
        if (!region || !card) return null;
        const r = card.getBoundingClientRect(), p = region.getBoundingClientRect();
        return {width:r.width, parentWidth:p.width, left:r.left, right:r.right, top:r.top};
      });
    })()`);
    check(`Populated side cards use real content width at ${width}px`, dimensions.every(Boolean) &&
      dimensions.every(r => r.width >= Math.min(300, width - 70)));
    if (sides.length === 1) check(`A single side is not forced into half its region at ${width}px`, dimensions[0].width >= dimensions[0].parentWidth * .84);
    if (sides.length === 2 && width === 1440) check("Wide desktop presents independent buy/sell summaries alongside each other", Math.abs(dimensions[0].top - dimensions[1].top) < 3 && dimensions[1].left >= dimensions[0].right - 1);
    if (width === 390 || width === 1440) await panelScreenshot(`positions-${sides.join("-")}-${width}x${height}`);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
};

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const target = await (await fetch("http://127.0.0.1:9223/json/new?about:blank", { method: "PUT" })).json();
      ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
      break;
    } catch { await sleep(200); }
  }
  if (!ws) throw new Error("Headless browser did not start.");
  const quoteResponse = await (await fetch(origin + "/api/market/quotes")).json();
  const contextResponse = await (await fetch(origin + "/api/market/context")).json();
  check("Real daily reference endpoint responds", contextResponse.history.status === "ready");
  check("Real calendar endpoint has complete paginated data", contextResponse.calendar.status === "ready" && contextResponse.calendar.complete);
  check("Real Newsmaker news endpoint responds", contextResponse.news.status === "ready");
  ws.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.id && pending.has(message.id)) {
      const p = pending.get(message.id);
      clearTimeout(p.timer); pending.delete(message.id);
      if (message.error) p.reject(new Error(message.error.message)); else p.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") {
      const detail = message.params.exceptionDetails;
      const error = { text: detail.exception?.description ?? detail.text, frames: detail.stackTrace?.callFrames.map(f => ({ name: f.functionName, url: f.url.split("?")[0], line: f.lineNumber })) ?? [] };
      const previewBannerOnly = error.frames.some(f => f.url.includes("/@replit/vite-plugin-dev-banner/banner-script.js")) &&
        error.frames.every(f => !f.url || f.url.includes("/@replit/vite-plugin-dev-banner/banner-script.js"));
      if (storageDeniedScenario && error.text === "SecurityError: Storage denied" && previewBannerOnly) expectedPreviewErrors.push(error);
      else errors.push(error);
    }
    if (message.method === "Page.javascriptDialogOpening") command("Page.handleJavaScriptDialog", { accept: dialogAccept }).catch(console.error);
    if (message.method === "Network.requestWillBeSent" && message.params.request.method === "POST" && new URL(message.params.request.url).origin === origin) posts.push(new URL(message.params.request.url).pathname);
    if (message.method === "Network.requestWillBeSent" && message.params.request.url === "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js") widgetRequested = true;
    if (message.method === "Fetch.requestPaused") {
      const { requestId, request } = message.params;
      if (blockedWidget && request.url === "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js") {
        command("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }).catch(console.error);
        return;
      }
      let payload;
      if (staleQuote && request.url.includes("/api/market/quotes")) {
        payload = { ...quoteResponse, status: "ready", quote: { ...(quoteResponse.quote ?? { symbol: "XUL10", price: 100, bid: 99, ask: 101, source: "Browser test fixture" }), asOf: "2000-01-01T00:00:00.000Z" } };
      } else if (brokenCalendar && request.url.includes("/api/market/context")) {
        payload = { ...contextResponse, calendar: { ...contextResponse.calendar, status: "unavailable", complete: false, events: [], message: { id: "Kalender tidak tersedia.", en: "Calendar unavailable." } } };
      }
      if (payload) command("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(payload)).toString("base64") }).catch(console.error);
      else command("Fetch.continueRequest", { requestId }).catch(console.error);
    }
  });
  await command("Page.enable"); await command("Runtime.enable"); await command("Network.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await command("Emulation.setTimezoneOverride", { timezoneId: "Asia/Jakarta" });
  if (!process.env.MRG_UI_STORAGE_ONLY) {
  await navigate("/", "Lihat eksposur");
  check("Concise notice keeps manual positions and uncalibrated index visible", (await text()).includes("posisi manual") && (await text()).includes("indeks belum dikalibrasi"));
  await click("Mengerti, lanjutkan");
  check("Introduction choice persists locally", await evaluate('localStorage.getItem("mrg_welcome_seen") === "1"'));
  check("Mobile overview does not overflow", await noOverflow());
  check("Overview has no redundant page-description dropdown", await evaluate("![...document.querySelectorAll('summary')].some(el=>el.textContent.includes('Tentang halaman ini'))"));
  await waitFor("document.querySelector('.live-brand img')?.naturalWidth > 0");
  check("Newsmaker logo and identity render from a local asset", await evaluate("document.querySelector('.live-brand img').getAttribute('src') === '/newsmaker-logo-white.png' && document.body.innerText.includes('MRG · Newsmaker')"));
  check("Header uses the official Newsmaker blue", await evaluate("getComputedStyle(document.querySelector('.live-header')).backgroundColor === 'rgb(16, 97, 179)'"));
  await click("Buka menu", true);
  check("Mobile expanded menu remains readable on its blue surface", await evaluate("getComputedStyle(document.querySelector('.live-mobile-menu')).backgroundColor === 'rgb(16, 97, 179)' && !!document.querySelector('.live-mobile-menu a')"));
  await click("Tutup menu", true);
  check("Browser favicon and app theme match Newsmaker", await evaluate("document.querySelector('link[rel=\"icon\"]').getAttribute('href') === '/newsmaker-favicon.png' && document.querySelector('meta[name=\"theme-color\"]').content === '#1061b3'"));
  await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
  check("Narrow 320px overview retains all header controls without overflow", await noOverflow() && await evaluate("[...document.querySelectorAll('.live-header button,.live-header a')].every(el => { const r=el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })"));
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await navigate("/positions", "Catat, lalu bandingkan");
  check("Introduction stays dismissed on another route", !(await text()).includes("Sebelum menggunakan MRG"));
  check("Entry form is not stacked into the initial position screen", await evaluate("!document.getElementById('harga-masuk-xul10')"));
  check("Positions has no redundant page-description dropdown", await evaluate("![...document.querySelectorAll('summary')].some(el=>el.textContent.includes('Tentang halaman ini'))"));
  for (const [width, height] of [[320, 740], [768, 1024], [1024, 768], [1280, 900]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(150);
    check(`Empty collapsed positions fit ${width}x${height}`, await noOverflow());
    if (width >= 1024) check(`Collapsed entry remains compact at ${width}px`, await evaluate("document.getElementById('position-entry-controls').getBoundingClientRect().height <= 100"));
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await evaluate("const step = document.querySelector('[aria-label=\"Langkah penggunaan\"] button'); step.focus(); step.click()");
  await waitFor("document.getElementById('harga-masuk-xul10') !== null");
  check("Entry opens in one separate modal, with in-panel risk caveats", await evaluate("document.querySelectorAll('[role=\"dialog\"][data-state=\"open\"]').length === 1 && document.querySelector('[role=\"dialog\"]').innerText.includes('indeks belum dikalibrasi')") && await panelFits());
  await click("Bantuan istilah: Lot", true);
  check("Novice help opens by tap without filling the screen", await evaluate("document.querySelector('.live-term-help-trigger[aria-expanded=\"true\"]') !== null"));
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  check("Novice help dismisses with Escape", await evaluate("!document.querySelector('.live-term-help-trigger[aria-expanded=\"true\"]')"));
  check("Escape closes only help, not the entry panel", await evaluate("document.querySelector('[role=\"dialog\"][data-state=\"open\"]') !== null"));
  await click("Catat posisi");
  check("Empty position shows positive-price validation", (await text()).includes("Harga masuk harus berupa angka positif"));
  await fill("Harga masuk XUL10", 100); await fill("Lot", 1); await fill("Waktu masuk (opsional)", "2026-10-14T19:00:15");
  await click("Catat posisi");
  check("Manual position is saved locally", (await stored()).positions.length === 1);
  const enteredAt = (await stored()).positions[0].enteredAt;
  check("Entry local time converts to the correct instant", enteredAt === "2026-10-14T12:00:15.000Z");
  await click("Ubah posisi", true);
  await fill("Harga masuk XUL10", 110); await fill("Lot", 1.5); await click("Simpan perubahan");
  check("Editing changes rather than duplicates a position", (await stored()).positions.length === 1 && (await stored()).positions[0].entry === 110);
  check("Editing preserves local entry time", (await stored()).positions[0].enteredAt === enteredAt);
  await click("Ubah posisi", true); await fill("Harga masuk XUL10", 999); await click("Batal");
  check("Cancelled edit does not overwrite the recorded entry", (await stored()).positions[0].entry === 110);
  await click("Tampilkan pengaturan", true);
  await fill("Batas total lot", 0); await fill("Batas jumlah layer", 2.5); await click("Simpan batas");
  check("Invalid limits show field errors", (await text()).includes("jumlah layer 1–200"));
  await fill("Batas total lot", 10); await fill("Batas jumlah layer", 5);
  await fill("Modal (opsional)", 10000); await fill("Ekuitas berjalan (opsional)", 9000);
  await fill("Target jarak harga (opsional)", 30); await fill("Jarak layer (opsional)", 20); await click("Simpan batas");
  check("Limits, equity, target and layer spacing are independent", (await stored()).settings.equity === 9000 && (await stored()).settings.targetPriceDistance === 30 && (await stored()).settings.layerSpacingPrice === 20);
  await positionWidths(["buy"]);
  await click("Tampilkan pengaturan", true);
  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 768], [1280, 900], [844, 390], [390, 360]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(300);
    check(`Open settings panel and persistent actions fit ${width}x${height}`, await noOverflow() && await panelFits());
    check(`Expanded settings do not lengthen the dashboard at ${width}px`, await evaluate("document.querySelectorAll('#settings-controls input').length === 0 && document.querySelectorAll('[role=\"dialog\"][data-state=\"open\"]').length === 1"));
    if ([390, 768, 1280].includes(width) && height > 400) await panelScreenshot(`settings-${width}x${height}`);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  for (let i = 0; i < 18; i++) await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  check("Tab focus stays within the active panel", await evaluate("document.activeElement.closest('[role=\"dialog\"]') !== null"));
  await fill("Batas total lot", 999); await click("Batalkan perubahan");
  check("Cancel discards settings drafts and returns focus to the launcher", (await stored()).settings.maxLots === 10 && await evaluate("!document.querySelector('[role=\"dialog\"][data-state=\"open\"]') && document.activeElement.getAttribute('aria-label') === 'Tampilkan pengaturan'"));
  const historyPortfolio = JSON.stringify(await stored());
  await click("Ubah posisi", true);
  await fill("Harga masuk XUL10", 888);
  await travelHistory(-1, panelIs());
  check("Browser Back cancels an edit without leaving positions or saving its draft", await evaluate("location.pathname === '/positions' && document.activeElement.getAttribute('aria-label') === 'Ubah posisi'") && JSON.stringify(await stored()) === historyPortfolio);
  await travelHistory(1, panelIs("positions-entry"));
  check("Forward reopens a clean form, not the cancelled edit", await evaluate("document.getElementById('harga-masuk-xul10').value === ''") && !(await text()).includes("Simpan perubahan"));
  await click("Batal");
  await travelHistory(-1, "location.pathname === '/'");
  check("Back after Cancel goes directly to the previous route, without an empty panel entry", await evaluate("location.pathname === '/'") && await evaluate(panelIs()));
  await travelHistory(1, "location.pathname === '/positions' && " + panelIs());
  await travelHistory(1, panelIs("positions-entry"));
  await click("Tutup form posisi", true);
  check("X consumes the same opening history entry", await evaluate(panelIs()) && JSON.stringify(await stored()) === historyPortfolio);
  const closedHistory = await command("Page.getNavigationHistory");
  for (let i = 0; i < 3; i++) {
    await click("Tampilkan pengaturan", true);
    await fill("Batas total lot", 999);
    await travelHistory(-1, panelIs());
  }
  const repeatedHistory = await command("Page.getNavigationHistory");
  check("Repeated opening and Back does not accumulate empty history entries", closedHistory.currentIndex === repeatedHistory.currentIndex && closedHistory.entries.length === repeatedHistory.entries.length);
  check("Back discards settings drafts and restores opener focus", (await stored()).settings.maxLots === 10 && await evaluate("document.activeElement.getAttribute('aria-label') === 'Tampilkan pengaturan'"));
  await travelHistory(1, panelIs("positions-settings-dialog"));
  check("Forward uses saved limits rather than discarded settings", await evaluate("document.getElementById('batas-total-lot').value === '10'"));
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor(panelIs());
  check("Escape closes the panel and consumes its history entry", (await command("Page.getNavigationHistory")).currentIndex === closedHistory.currentIndex);
  await command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await click("Tampilkan pengaturan", true);
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: 5, y: 5, button: "left", clickCount: 1 });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 });
  await waitFor(panelIs());
  check("A real backdrop click also consumes the panel entry", (await command("Page.getNavigationHistory")).currentIndex === closedHistory.currentIndex);
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelectorAll('[aria-label=\"Langkah penggunaan\"] button')[2].click()");
  await click("Buat simulasi");
  await fill("Harga hipotetis", 77); await fill("Lot hipotetis", 2);
  await waitFor(has("Sesudah hipotetis"));
  const historySnapshot = await snapshotReference();
  check("History tests have an explicit frozen snapshot", !!historySnapshot);
  await click("Catat sebagai posisi manual");
  await click("Atur batas");
  await fill("Batas total lot", 999);
  await travelHistory(-1, panelIs("positions-simulation-panel"));
  check("Back from paused settings returns to the exact snapshot and candidate", await snapshotReference() === historySnapshot && await evaluate("document.getElementById('harga-hipotetis').value === '77' && document.getElementById('lot-hipotetis').value === '2'"));
  check("Returning from limits discards the settings draft and recording confirmation", JSON.stringify(await stored()) === historyPortfolio && !(await text()).includes("Ya, tambahkan ke catatan"));
  await travelHistory(1, panelIs("positions-settings-dialog"));
  check("Forward to nested settings keeps one panel active and starts from saved limits", await evaluate("document.getElementById('batas-total-lot').value === '10'") && (await text()).includes("Snapshot simulasi dijeda"));
  await fill("Batas total lot", 11); await click("Simpan batas");
  await travelHistory(-1, panelIs("positions-simulation-panel"));
  check("Back preserves saved limits, the frozen reference and the stale-snapshot guard", (await stored()).settings.maxLots === 11 && await snapshotReference() === historySnapshot && (await text()).includes("Snapshot usang") && await evaluate("[...document.querySelectorAll('[role=\"dialog\"] button')].find(el => el.textContent.includes('Catat sebagai posisi manual')).disabled"));
  await click("Atur batas"); await fill("Batas total lot", 555); await click("Batalkan perubahan");
  await waitFor(panelIs("positions-simulation-panel"));
  check("Nested Cancel returns to the same snapshot, without saving limits", (await stored()).settings.maxLots === 11 && await snapshotReference() === historySnapshot);
  await click("Atur batas"); await click("Tutup pengaturan", true);
  await waitFor(panelIs("positions-simulation-panel"));
  check("Nested X also returns to the same snapshot", await snapshotReference() === historySnapshot);
  await travelHistory(-1, panelIs());
  check("Back from simulation clears its snapshot, restores the original opener and never records", (await stored()).positions.length === 1 && await evaluate("document.activeElement === document.querySelectorAll('[aria-label=\"Langkah penggunaan\"] button')[2]"));
  await travelHistory(1, panelIs("positions-simulation-panel"));
  check("Forward after closing simulation does not recreate its snapshot or candidate", await snapshotReference() === undefined && (await text()).includes("Buat simulasi") && !await evaluate("!!document.getElementById('harga-hipotetis')"));
  await travelHistory(1, panelIs("positions-settings-dialog"));
  check("Forward cannot resurrect an abandoned paused snapshot", !(await text()).includes("Snapshot simulasi dijeda") && (await stored()).settings.maxLots === 11);
  await travelHistory(-1, panelIs("positions-simulation-panel"));
  await click("Tutup simulasi");
  await evaluate("document.querySelector('a[href=\"/privacy\"]').click()");
  await waitFor("location.pathname === '/privacy'");
  await travelHistory(-1, "location.pathname === '/positions' && " + panelIs());
  check("Back across an app route restores positions without a hidden panel", await evaluate(panelIs()));
  await travelHistory(1, "location.pathname === '/privacy'");
  check("Forward across an app route is not intercepted by an old panel listener", await evaluate(panelIs()));
  await evaluate("document.querySelector('.live-tabbar a[href=\"/positions\"]').click()");
  await waitFor("location.pathname === '/positions'");
  await click("Tampilkan pengaturan", true);
  await travelHistory(-2, "location.pathname === '/privacy'");
  check("A browser history jump can leave an active panel normally", await evaluate(panelIs()));
  await travelHistory(2, "location.pathname === '/positions' && " + panelIs("positions-settings-dialog"));
  check("Returning to a panel route starts from saved data", await evaluate("document.getElementById('batas-total-lot').value === '11'"));
  await click("Batalkan perubahan");
  await evaluate("document.querySelectorAll('[aria-label=\"Langkah penggunaan\"] button')[2].click()");
  await click("Buat simulasi");
  await fill("Harga hipotetis", 88); await fill("Lot hipotetis", 2);
  await waitFor(has("Sesudah hipotetis"));
  await travelHistory(-2, "location.pathname === '/privacy'");
  await travelHistory(2, "location.pathname === '/positions' && " + panelIs("positions-simulation-panel"));
  check("Leaving the route with an active simulation clears its frozen snapshot", await snapshotReference() === undefined && !(await text()).includes("Sesudah hipotetis"));
  await click("Buat simulasi");
  await fill("Harga hipotetis", 66); await fill("Lot hipotetis", 2);
  const beforePanelReload = await evaluate("performance.timeOrigin");
  await command("Page.reload");
  await waitFor(`performance.timeOrigin !== ${beforePanelReload} && ${panelIs("positions-simulation-panel")}`);
  check("Reload keeps panel navigation but never restores a snapshot from history", await snapshotReference() === undefined && !await evaluate("!!document.getElementById('harga-hipotetis')") && (await stored()).positions.length === 1);
  await travelHistory(-1, panelIs());
  check("Back still closes a reloaded panel before leaving the route", await evaluate("location.pathname === '/positions' && document.activeElement.id === 'simulation-controls'"));
  check("Model details collapse on mobile", await evaluate("[...document.querySelectorAll('details.live-details')].some(el => el.querySelector('summary').textContent.includes('rincian indeks') && !el.open)"));
  await evaluate("document.querySelectorAll('[aria-label=\"Langkah penggunaan\"] button')[2].click()");
  await click("Buat simulasi");
  await fill("Harga hipotetis", 90);
  await click("Gandakan lot terakhir");
  check("Double-last-lot shortcut is explicit", await evaluate("document.getElementById('lot-hipotetis').value === '3'"));
  check("Simulation alone does not add a record", (await stored()).positions.length === 1);
  await waitFor(has("Sesudah hipotetis"));
  const frozenPrice = await evaluate("document.getElementById('harga-hipotetis').value");
  await sleep(5500);
  check("Price polling does not overwrite a simulation input", await evaluate("document.getElementById('harga-hipotetis').value") === frozenPrice);
  await click("Catat sebagai posisi manual"); await click("Batal");
  check("Cancelling record confirmation leaves positions unchanged", (await stored()).positions.length === 1);
  await click("Catat sebagai posisi manual"); await click("Ya, tambahkan ke catatan");
  check("Confirmed simulation adds one manual layer", (await stored()).positions.length === 2 && (await stored()).positions[1].lots === 3);
  await click("Buat simulasi"); await click("Atur batas");
  await fill("Batas total lot", 12); await click("Simpan batas");
  await click("Kembali ke simulasi");
  check("Changing limits marks the frozen simulation outdated", (await text()).includes("Snapshot usang"));
  await click("Tutup simulasi");
  await evaluate("document.querySelector('[aria-label=\"Langkah penggunaan\"] button').click()");
  await fill("Arah posisi", "sell"); await fill("Harga masuk XUL10", 150); await fill("Lot", 2); await click("Catat posisi");
  check("Buy and sell appear as separate groups", (await text()).includes("Sisi buy") && (await text()).includes("Sisi sell"));
  await positionWidths(["buy", "sell"]);
  await evaluate("document.querySelector('[data-testid=\"positions-records\"]').querySelectorAll('details').forEach(el => el.open = true)");
  await layoutMatrix("positions-expanded");
  await evaluate("document.querySelector('[data-testid=\"positions-records\"]').querySelectorAll('details').forEach(el => el.open = false)");
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  const mixedPortfolioFixture = await stored();
  await evaluate(`localStorage.setItem("mrg_portfolio_v1", ${JSON.stringify(JSON.stringify({ ...mixedPortfolioFixture, positions: mixedPortfolioFixture.positions.filter(p => p.side === "sell") }))})`);
  await navigate("/positions", "Catat, lalu bandingkan");
  await positionWidths(["sell"]);
  await evaluate(`localStorage.setItem("mrg_portfolio_v1", ${JSON.stringify(JSON.stringify(mixedPortfolioFixture))})`);
  await navigate("/positions", "Catat, lalu bandingkan");
  check("Isolated single-sell layout fixture restores the complete original test portfolio", JSON.stringify(await stored()) === JSON.stringify(mixedPortfolioFixture));
  check("Mobile populated positions do not overflow", await noOverflow());
  check("Remaining personal limits are not labelled account safety", (await text()).includes("Sisa batas lot") && (await text()).includes("bukan kapasitas aman") && await evaluate("document.querySelector('.mrg-position-risk-note').textContent.includes('bukan probabilitas rugi atau ukuran risiko seluruh rekening')"));
  await fill("Pergerakan melawan posisi (%)", 100);
  check("Invalid custom stress is rejected visibly", (await text()).includes("kurang dari 100"));
  await fill("Pergerakan melawan posisi (%)", 5);
  dialogAccept = false; await click("Hapus posisi", true);
  check("Cancelling delete preserves all positions", (await stored()).positions.length === 3);
  dialogAccept = true; await click("Hapus posisi", true);
  check("Confirmed individual delete removes one record", (await stored()).positions.length === 2);
  await navigate("/positions", "Catat, lalu bandingkan");
  check("Records survive a page reload", (await stored()).positions.length === 2);
  await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/market/quotes*" }, { urlPattern: "*/api/market/context*" }] });
  staleQuote = true;
  await navigate("/", "Lihat eksposur");
  await waitFor(has("Tidak tersedia / terlambat"));
  check("Stale-price failure scenario reaches the browser", await evaluate("fetch('/api/market/quotes').then(r=>r.json()).then(v=>v.quote.asOf === '2000-01-01T00:00:00.000Z')"));
  check("Stale prices visibly pause the live index", (await text()).includes("Belum tersedia"));
  staleQuote = false; brokenCalendar = true;
  await navigate("/analysis?tab=calendar", "Konteks, bukan sinyal");
  await waitFor(has("komponen indeks agenda tidak digunakan"));
  check("Unavailable calendar is not presented as zero event risk", (await text()).includes("Kalender tidak tersedia"));
  brokenCalendar = false; await command("Fetch.disable");
  await navigate("/analysis?tab=calendar", "Konteks, bukan sinyal");
  await waitFor("document.querySelectorAll('.live-event').length > 0");
  check("Calendar renders at most five agendas per page", await evaluate("document.querySelectorAll('.live-event').length <= 5"));
  check("Mobile calendar shows agendas before unfolding advanced filters", await evaluate("!document.querySelector('.live-calendar-filters').open && document.querySelector('.live-event').getBoundingClientRect().top < innerHeight - 64"));
  const firstAgenda = await evaluate("document.querySelector('.live-event').innerText");
  await click("Halaman berikutnya", true);
  check("Calendar next-page control changes the visible agendas", await evaluate("document.querySelector('.live-event').innerText") !== firstAgenda);
  await fill("Cari acara, negara, atau mata uang", "Amerika");
  check("Country aliases search USD agendas and reset pagination", await evaluate("document.querySelectorAll('.live-event').length > 0 && [...document.querySelectorAll('.live-event')].every(el=>el.innerText.includes('USD')) && document.querySelector('.live-pagination').innerText.includes('1–')"));
  await fill("Cari acara, negara, atau mata uang", "__MRG_NO_MATCH__");
  check("No keyword matches are explicit, not a missing-calendar error", (await text()).includes("Tidak ada agenda yang cocok"));
  await layoutMatrix("calendar");
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await fill("Cari acara, negara, atau mata uang", "");
  await fill("Mata uang", "USD"); await fill("Dampak", "high");
  check("Calendar currency/impact filters affect visible events", await evaluate("[...document.querySelectorAll('.live-event')].every(e => e.innerText.includes('USD') && e.innerText.includes('Dampak tinggi'))"));
  check("Calendar labels the displayed timezone", (await text()).toLowerCase().includes("asia/jakarta"));
  check("Calendar has no redundant one-paragraph description dropdown", await evaluate("![...document.querySelectorAll('summary')].some(el=>/Tentang halaman ini|Tentang sumber & waktu/.test(el.textContent))"));
  check("TradingView is not requested on the calendar tab", !widgetRequested && await evaluate("document.querySelector('iframe') === null"));
  await click("Teknikal");
  check("Tabs replace the long calendar stack", await evaluate("document.querySelectorAll('.live-event').length === 0"));
  check("Chart is automatic rather than behind open/close controls", await evaluate("![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Buka chart' || b.getAttribute('aria-label')==='Tutup chart')"));
  check("Technical omits explanatory-only dropdowns but retains source caveats", await evaluate("![...document.querySelectorAll('summary')].some(el=>/Tentang chart dan sumber|Cara membaca indikator/.test(el.textContent)) && document.querySelector('.mrg-chart-warning').textContent.includes('XUL10') && document.querySelector('.mrg-lgd-warning').textContent.includes('XUL10')"));
  await waitFor("document.querySelector('.live-chart-frame iframe') !== null");
  check("Technical content spans the available width without an empty grid column", await evaluate("document.querySelector('.live-technical-tabpanel').getBoundingClientRect().width >= document.querySelector('.live-main').getBoundingClientRect().width * .95"));
  check("Mobile chart comes before indicators without horizontal overflow", await evaluate("document.querySelector('.mrg-chart-panel').getBoundingClientRect().top < document.querySelector('.mrg-indicator-panel').getBoundingClientRect().top && document.documentElement.scrollWidth <= innerWidth + 1"));
  check("Install belongs to the header toolbar, not an empty standalone row", await evaluate("document.querySelector('#mrg-install-toolbar button[aria-label=\"Install aplikasi\"]') !== null && document.querySelector('.live-pwa-tools').getBoundingClientRect().height === 0"));
  check("Chart uses the official widget script and dedicated embed host", widgetRequested && await evaluate("new URL(document.querySelector('.live-chart-frame iframe').src).hostname === 'www.tradingview-widget.com'"));
  check("Chart is separate and uses the disclosed reference symbol", await evaluate("decodeURIComponent(document.querySelector('.live-chart-frame iframe').src).includes('OANDA:XAUUSD')"));
  check("An iframe cannot be incorrectly labelled a successfully loaded chart", !(await text()).split("\n").some(line => line.trim() === "Widget dimuat"));
  check("Chart always offers a safe direct TradingView link", await evaluate("[...document.querySelectorAll('a')].some(a => a.textContent.includes('Buka di TradingView') && a.target === '_blank' && a.rel.includes('noopener') && a.href.includes('symbol=OANDA%3AXAUUSD'))"));
  for (const [width, height] of [[320, 740], [768, 1024], [1024, 768], [1280, 900]]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await sleep(200);
    check(`Technical chart and header fit ${width}x${height}`, await noOverflow());
    if (width >= 1024) check(`Wide ${width}px layout places indicators beside the chart`, await evaluate("document.querySelector('.mrg-indicator-panel').getBoundingClientRect().left >= document.querySelector('.mrg-chart-panel').getBoundingClientRect().right - 1"));
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('iframe').scrollIntoView({block:'center'})");
  await sleep(4000);
  await mkdir("generated-artifacts", { recursive: true });
  const chartShot = await command("Page.captureScreenshot", { format: "jpeg", quality: 65 });
  await writeFile("generated-artifacts/chart-browser-check.jpg", Buffer.from(chartShot.data, "base64"));
  blockedWidget = true;
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  await command("Fetch.enable", { patterns: [{ urlPattern: "https://s3.tradingview.com/external-embedding/*" }] });
  await click("Coba muat ulang chart", true);
  await waitFor(has("Widget belum dapat ditampilkan"));
  check("Blocked widget scripts show an explicit failure without a success claim", !(await text()).split("\n").some(line => line.trim() === "Widget dimuat"));
  blockedWidget = false;
  await command("Fetch.disable");
  await command("Network.setCacheDisabled", { cacheDisabled: false });
  await command("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await waitFor(has("Offline — widget TradingView tidak diminta"));
  check("Offline Technical shows an honest status and removes the external frame", await evaluate("document.querySelector('.live-chart-frame iframe') === null && document.querySelector('[aria-label=\"Coba muat ulang chart\"]').disabled"));
  await command("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await waitFor("document.querySelector('.live-chart-frame iframe') !== null");
  check("Reconnection initializes the automatically visible chart again", await evaluate("document.querySelector('.live-chart-frame iframe') !== null"));
  await click("Kalender");
  check("Leaving Technical removes its widget iframe", await evaluate("document.querySelector('iframe') === null"));
  await click("Berita");
  await waitFor("document.querySelector('button.live-position') !== null");
  await evaluate("document.querySelector('button.live-position').click()");
  await waitFor("document.querySelector('.live-article')?.textContent.length > 50");
  check("An article opens from the same analysis route", (await text()).includes("Kembali ke daftar"));
  await layoutMatrix("article");
  await command("Emulation.setDeviceMetricsOverride", { width: 402, height: 874, deviceScaleFactor: 1, mobile: true });
  check("Article content contains no executable HTML", await evaluate("document.querySelector('.live-article').children.length === 0"));
  await click("Kembali ke daftar");
  await waitFor("document.querySelector('.live-article') === null");
  check("Article can return to its list", !(await text()).includes("Kembali ke daftar"));
  await navigate("/positions", "Catat, lalu bandingkan"); await click("Ganti bahasa", true);
  check("Live navigation and forms switch language", (await text()).includes("Record, then compare."));
  await click("Change language", true);
  await click("Hapus semua posisi");
  check("Delete all clears records but keeps limits", (await stored()).positions.length === 0 && (await stored()).settings.maxLots === 12);
  await evaluate('localStorage.setItem("unrelated-test-key","keep"); localStorage.setItem("mrg_portfolio_v1","{broken");');
  await navigate("/positions", "Catat, lalu bandingkan");
  check("Corrupt storage is reported without overwriting it", (await text()).includes("Penyimpanan lokal diblokir") && await evaluate('localStorage.getItem("mrg_portfolio_v1") === "{broken"'));
  await click("Reset data lokal");
  check("Explicit reset clears only MRG-owned data", await evaluate('localStorage.getItem("mrg_portfolio_v1") === null && localStorage.getItem("unrelated-test-key") === "keep"'));
  check("Position recording and simulation never POST data", posts.length === 0);
  check("Service worker does not cache live API responses", await evaluate(`(async () => {
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      if ((await cache.keys()).some(r => new URL(r.url).pathname.startsWith('/api/'))) return false;
    }
    return true;
  })()`));
  await command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate("/", "Lihat eksposur");
  check("Desktop overview does not overflow", await noOverflow());
  check("Overview primary price and agenda cards share a row without a blank column", await evaluate("Math.abs(document.querySelector('.overview-quote').getBoundingClientRect().top - document.querySelector('.overview-agenda').getBoundingClientRect().top) < 2"));
  for (const [width,height] of [[768,1024],[1024,768],[844,390]]) {
    await command("Emulation.setDeviceMetricsOverride", {width,height,deviceScaleFactor:1,mobile:width<1024});
    check(`Responsive ${width}x${height} overview keeps content and navigation in bounds`, await noOverflow() && await evaluate("[...document.querySelectorAll('.live-header a,.live-tabbar a')].filter(el=>el.getClientRects().length).some(el=>el.getAttribute('href')==='/positions' && el.getBoundingClientRect().left>=0 && el.getBoundingClientRect().right<=innerWidth)"));
  }
  await command("Emulation.setDeviceMetricsOverride", { width:1280,height:900,deviceScaleFactor:1,mobile:false });
  await navigate("/basic", "Simulasi Dasar");
  check("Original calculator is still accessible", (await text()).includes("Target Poin"));
  await layoutMatrix("basic");
  const baseline = { modal: 200000, targetPoin: "30", strategy: "Linear Averaging", maxLayer: "3", experience: "Pemula", marketCondition: "Sideways" };
  const goodCalculation = await fetch(origin + "/api/calculate-risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(baseline) });
  const baselineResult = await goodCalculation.json();
  check("Original calculation API still returns its baseline", goodCalculation.ok && baselineResult.score === 25);
  const badCalculation = await fetch(origin + "/api/calculate-risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...baseline, modal: 0 }) });
  check("Original calculation API rejects zero capital", badCalculation.status === 400);
  await navigate("/result?" + new URLSearchParams(baseline).toString(), "Hasil");
  await waitFor("document.querySelector('[data-testid=\"button-save-scenario\"]') !== null");
  await evaluate("document.querySelector('[data-testid=\"button-save-scenario\"]').click()");
  await waitFor('localStorage.getItem("riskcheck_scenarios") !== null');
  check("Basic study result can be saved", await evaluate('JSON.parse(localStorage.getItem("riskcheck_scenarios")).length === 1'));
  await navigate("/result?" + new URLSearchParams(baseline).toString(), "Hasil");
  await waitFor("document.querySelector('[data-testid=\"button-save-scenario\"]') !== null");
  check("Saved study scenarios survive hydration and reload", await evaluate('JSON.parse(localStorage.getItem("riskcheck_scenarios")).length === 1'));
  check("Valid saved study records load without a storage warning", await evaluate("!document.querySelector('[data-testid=\"button-save-scenario\"]').disabled && !document.body.innerText.includes('Skenario lokal tidak dapat dibaca atau disimpan')"));
  await layoutMatrix("result");
  }
  for (const [path, title, label] of [["/literasi", "Literasi", "education"], ["/privacy", "Privasi", "privacy"], ["/terms", "Ketentuan", "terms"]]) {
    await navigate(path, title);
    await layoutMatrix(label);
  }
  storageDeniedScenario = true;
  await command("Page.addScriptToEvaluateOnNewDocument", { source: "Storage.prototype.getItem = function() { throw new DOMException('Storage denied', 'SecurityError'); }; Storage.prototype.setItem = function() { throw new DOMException('Storage denied', 'SecurityError'); };" });
  await navigate("/positions", "Catat, lalu bandingkan");
  await waitFor(has("Preferensi bahasa tidak dapat disimpan"));
  check("Denied browser storage is reported without crashing the app", (await text()).includes("Penyimpanan lokal diblokir") && (await text()).includes("Preferensi bahasa tidak dapat disimpan"));
  await navigate("/result?modal=200000&targetPoin=30&strategy=Linear%20Averaging&maxLayer=3&experience=Pemula&marketCondition=Sideways", "Hasil");
  await waitFor(has("Skenario lokal tidak dapat dibaca atau disimpan"));
  check("Basic calculator remains usable when scenario storage is denied", await evaluate("document.querySelector('[data-testid=\"button-save-scenario\"]').disabled"));
  if (errors.length) console.error("Browser exceptions:", JSON.stringify(errors, null, 2));
  check("No uncaught application errors during interactions", errors.length === 0);
  await mkdir("generated-artifacts", { recursive: true });
  await writeFile("generated-artifacts/live-ui-checks.json", JSON.stringify({ passed: checks.length, checks, errors, expectedDevelopmentBannerStorageErrors: expectedPreviewErrors.length }, null, 2));
  console.log(`Verified ${checks.length} browser and integration checks.`);
} finally {
  ws?.close();
  browser.kill("SIGTERM");
  for (const p of pending.values()) clearTimeout(p.timer);
}
