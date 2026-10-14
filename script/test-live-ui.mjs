import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import WebSocket from "ws";

const origin = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.MRG_TEST_URL;
if (!origin) throw new Error("Set MRG_TEST_URL or run in the Replit workspace with the application workflow running.");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage", "--remote-debugging-port=9223", `--user-data-dir=/tmp/mrg-ui-${process.pid}`, "about:blank"], { stdio: "ignore" });
let ws;
const checks = [], errors = [], posts = [];
const expectedPreviewErrors = [];
let serial = 0, dialogAccept = false, staleQuote = false, brokenCalendar = false, storageDeniedScenario = false;
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
    const el = [...document.querySelectorAll('button')].find(e => ${aria ? `e.getAttribute('aria-label')` : `e.textContent.trim()`} === ${JSON.stringify(label)});
    if (!el || el.disabled) throw new Error('Missing or disabled button: ' + ${JSON.stringify(label)});
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    if (!el.getClientRects().length) throw new Error('Button not visible: ' + ${JSON.stringify(label)});
    el.scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(resolve => requestAnimationFrame(resolve));
    el.click();
  })()`);
  await sleep(150);
};
const fill = async (label, value) => {
  await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find(e => e.textContent.replace(' *','').trim() === ${JSON.stringify(label)});
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
    if (message.method === "Network.requestWillBeSent" && message.params.request.method === "POST") posts.push(new URL(message.params.request.url).pathname);
    if (message.method === "Fetch.requestPaused") {
      const { requestId, request } = message.params;
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
  await evaluate("document.querySelector('[aria-label=\"Langkah penggunaan\"] button').click()");
  await waitFor("document.getElementById('harga-masuk-xul10') !== null");
  await click("Bantuan istilah: Lot", true);
  check("Novice help opens by tap without filling the screen", await evaluate("document.querySelector('.live-term-help-trigger[aria-expanded=\"true\"]') !== null"));
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  check("Novice help dismisses with Escape", await evaluate("!document.querySelector('.live-term-help-trigger[aria-expanded=\"true\"]')"));
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
  await click("Tampilkan pengaturan", true);
  await fill("Batas total lot", 0); await fill("Batas jumlah layer", 2.5); await click("Simpan batas");
  check("Invalid limits show field errors", (await text()).includes("jumlah layer 1–200"));
  await fill("Batas total lot", 10); await fill("Batas jumlah layer", 5);
  await fill("Modal (opsional)", 10000); await fill("Ekuitas berjalan (opsional)", 9000);
  await fill("Target jarak harga (opsional)", 30); await fill("Jarak layer (opsional)", 20); await click("Simpan batas");
  check("Limits, equity, target and layer spacing are independent", (await stored()).settings.equity === 9000 && (await stored()).settings.targetPriceDistance === 30 && (await stored()).settings.layerSpacingPrice === 20);
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
  await click("Buat simulasi"); await click("Tampilkan pengaturan", true);
  await fill("Batas total lot", 12); await click("Simpan batas");
  check("Changing limits marks the frozen simulation outdated", (await text()).includes("Snapshot usang"));
  await click("Tutup simulasi");
  await evaluate("document.querySelector('[aria-label=\"Langkah penggunaan\"] button').click()");
  await fill("Arah posisi", "sell"); await fill("Harga masuk XUL10", 150); await fill("Lot", 2); await click("Catat posisi");
  check("Buy and sell appear as separate groups", (await text()).includes("Sisi buy") && (await text()).includes("Sisi sell"));
  check("Mobile populated positions do not overflow", await noOverflow());
  check("Remaining personal limits are not labelled account safety", (await text()).includes("Sisa batas lot pilihan Anda") && (await text()).includes("bukan kapasitas aman rekening"));
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
  await fill("Cari acara, negara, atau mata uang", "");
  await fill("Mata uang", "USD"); await fill("Dampak", "high");
  check("Calendar currency/impact filters affect visible events", await evaluate("[...document.querySelectorAll('.live-event')].every(e => e.innerText.includes('USD') && e.innerText.includes('Dampak tinggi'))"));
  check("Calendar labels the displayed timezone", (await text()).toLowerCase().includes("asia/jakarta"));
  await click("Teknikal");
  check("Tabs replace the long calendar stack", await evaluate("document.querySelectorAll('.live-event').length === 0"));
  check("TradingView is not requested before opening", await evaluate("document.querySelector('iframe') === null"));
  await click("Buka chart");
  check("Chart is separate and uses the disclosed reference symbol", await evaluate("document.querySelector('iframe').src.includes('OANDA%3AXAUUSD')"));
  await evaluate("document.querySelector('iframe').scrollIntoView({block:'center'})");
  await sleep(4000);
  await mkdir("generated-artifacts", { recursive: true });
  const chartShot = await command("Page.captureScreenshot", { format: "jpeg", quality: 65 });
  await writeFile("generated-artifacts/chart-browser-check.jpg", Buffer.from(chartShot.data, "base64"));
  await click("Tutup chart", true);
  check("Closing chart removes its iframe", await evaluate("document.querySelector('iframe') === null"));
  await click("Berita");
  await waitFor("document.querySelector('button.live-position') !== null");
  await evaluate("document.querySelector('button.live-position').click()");
  await waitFor("document.querySelector('.live-article')?.textContent.length > 50");
  check("An article opens from the same analysis route", (await text()).includes("Kembali ke daftar"));
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
  for (const [width,height] of [[768,1024],[1024,768],[844,390]]) {
    await command("Emulation.setDeviceMetricsOverride", {width,height,deviceScaleFactor:1,mobile:width<1024});
    check(`Responsive ${width}x${height} overview keeps content and navigation in bounds`, await noOverflow() && await evaluate("[...document.querySelectorAll('.live-header a,.live-tabbar a')].filter(el=>el.getClientRects().length).some(el=>el.getAttribute('href')==='/positions' && el.getBoundingClientRect().left>=0 && el.getBoundingClientRect().right<=innerWidth)"));
  }
  await command("Emulation.setDeviceMetricsOverride", { width:1280,height:900,deviceScaleFactor:1,mobile:false });
  await navigate("/basic", "Simulasi Dasar");
  check("Original calculator is still accessible", (await text()).includes("Target Poin"));
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
