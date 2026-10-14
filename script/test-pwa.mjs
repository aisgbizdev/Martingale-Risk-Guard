import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";
import { EMPTY_SETTINGS } from "../shared/live-types.ts";

// An ephemeral production-build fixture, not a second application workflow.
// Its API proxy uses the running project's public development origin.
const upstream = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const root = resolve("dist/public");
const types = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".html": "text/html" };
let networkAvailable = true;
const server = createServer(async (req, res) => {
  if (!networkAvailable) { req.socket.destroy(); return; }
  try {
    if (req.url.startsWith("/api/")) {
      const result = await fetch(upstream + req.url, { signal: AbortSignal.timeout(12000) });
      res.writeHead(result.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(await result.text()); return;
    }
    const pathname = decodeURIComponent(new URL(req.url, "http://fixture").pathname);
    const file = resolve(root, "." + pathname);
    if (!file.startsWith(root + "/") && file !== root) { res.writeHead(400); res.end(); return; }
    let content, extension = extname(file);
    try { content = await readFile(file); }
    catch {
      if (extension) { res.writeHead(404); res.end(); return; }
      content = await readFile(resolve(root, "index.html")); extension = ".html";
    }
    res.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(content);
  } catch { res.writeHead(502); res.end("{}"); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage",
  "--remote-debugging-port=9224", `--user-data-dir=/tmp/mrg-pwa-${process.pid}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const pending = new Map();
let socket, sequence = 0;
const checks = [];
const errors = [];
const check = (name, valid) => { assert.ok(valid, name); checks.push(name); console.log("PASS", name); };
const command = (method, params = {}) => new Promise((done, fail) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); fail(new Error(method + " timed out")); }, 30000);
  pending.set(id, { done, fail, timer });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Evaluation failed");
  return result.result.value;
};
const waitFor = async (expression, timeout = 45000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(200); }
  throw new Error("Timed out: " + expression);
};
try {
  let pages;
  for (let i = 0; i < 80; i++) {
    try { pages = await fetch("http://127.0.0.1:9224/json").then((r) => r.json()); break; }
    catch { await sleep(100); }
  }
  const page = pages?.find((target) => target.type === "page");
  assert.ok(page);
  socket = new WebSocket(page.webSocketDebuggerUrl);
  socket.on("message", (raw) => {
    const message = JSON.parse(raw);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); clearTimeout(item.timer); pending.delete(message.id);
      message.error ? item.fail(new Error(JSON.stringify(message.error))) : item.done(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  });
  await new Promise((done) => socket.once("open", done));
  await command("Page.enable"); await command("Runtime.enable"); await command("Network.enable");
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command("Page.navigate", { url: origin });
  await waitFor("document.body?.innerText.includes('Lihat eksposur')");
  await waitFor("navigator.serviceWorker.controller !== null");
  const cachePaths = await evaluate(`(async () => {
    const name = (await caches.keys()).find(key=>key.startsWith('martingale-risk-guard-v3-'));
    if(!name) return [];
    const cache = await caches.open(name);
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  })()`);
  check("Production PWA controls the page", await evaluate("navigator.serviceWorker.controller.scriptURL.endsWith('/sw.js')"));
  check("Production JS, CSS and icons are precached", cachePaths.some((p) => p.endsWith(".js")) &&
    cachePaths.some((p) => p.endsWith(".css")) && cachePaths.includes("/newsmaker-mrg-192.png") && cachePaths.includes("/newsmaker-mrg-512.png"));
  const installability = await command("Page.getInstallabilityErrors");
  check("Chromium reports no PWA installability errors", installability.installabilityErrors.length === 0);
  await waitFor("document.body.innerText.includes('Terbaru')");
  await evaluate(`localStorage.setItem('mrg_portfolio_v1', JSON.stringify({
    version:1, positions:[{id:'offline-check',symbol:'XUL10',side:'buy',entry:4090,lots:1,enteredAt:null}],
    settings:${JSON.stringify({ ...EMPTY_SETTINGS, maxLots: 10, maxLayers: 5 })}
  }))`);
  await command("Page.navigate", { url: origin + "/positions" });
  await waitFor("document.body.innerText.includes('Catat, lalu bandingkan')");
  await waitFor("document.querySelector('.live-riskbar') !== null");
  await evaluate(`(() => {
    window.__pwaPrompts=0;
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.__pwaPrompts++};
    event.userChoice=Promise.resolve({outcome:'dismissed'});
    window.dispatchEvent(event);
    document.querySelector('[aria-label="Install aplikasi"]').click();
  })()`);
  await waitFor("document.querySelector('[aria-label=\"Panduan install\"]') !== null");
  check("Install control invokes the supplied browser prompt", await evaluate("window.__pwaPrompts === 1"));
  check("Dismissal offers Android and iPhone installation help", await evaluate("document.querySelector('[aria-label=\"Panduan install\"]').innerText.includes('Safari')"));
  await evaluate("document.querySelector('[aria-label=\"Tutup panduan install\"]').click()");
  await evaluate("window.dispatchEvent(new Event('appinstalled'))");
  check("Installed state hides the install button", await evaluate("!document.querySelector('[aria-label=\"Install aplikasi\"]')"));
  // Route transitions must retain the browser's installation event state.
  await evaluate("document.querySelector('a[href=\"/analysis\"]').click()");
  await waitFor("document.body.innerText.includes('Konteks, bukan sinyal')");
  check("Installed state survives in-app navigation", await evaluate("!document.querySelector('[aria-label=\"Install aplikasi\"]')"));
  await command("Page.navigate", { url: origin + "/positions" });
  await waitFor("document.querySelector('.live-riskbar') !== null");
  await command("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await waitFor("document.body.innerText.includes('Offline')");
  check("Offline state immediately displays the live-data pause", await evaluate("document.body.innerText.includes('harga dan indeks live dijeda')"));
  check("Live API failure cannot fall back to a cached success", await evaluate("fetch('/api/market/quotes').then(()=>false).catch(()=>true)"));
  // CDP offline emulation can reset navigator.onLine after navigation and does
  // not consistently reach service-worker targets. Also cut the fixture's
  // transport, and model the disconnected OS flag in the next document.
  networkAvailable = false;
  const offlineFlag = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: "Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})",
  });
  const beforeReload = await evaluate("performance.timeOrigin");
  await command("Page.reload", { ignoreCache: true });
  await waitFor(`performance.timeOrigin !== ${beforeReload} && document.body?.innerText.includes('Catat, lalu bandingkan')`);
  await waitFor("document.body.innerText.includes('Offline')");
  check("Production position screen reloads offline with HTTP cache disabled", await evaluate("document.querySelector('.live-riskbar') !== null"));
  check("Local records survive offline reload", await evaluate("JSON.parse(localStorage.getItem('mrg_portfolio_v1')).positions[0].id === 'offline-check'"));
  check("No live API responses exist in the PWA cache", await evaluate(`(async()=>{
    for(const key of await caches.keys()){
      if(!key.startsWith('martingale-risk-guard-'))continue;
      if((await (await caches.open(key)).keys()).some(r=>new URL(r.url).pathname.startsWith('/api/')))return false;
    } return true;
  })()`));
  networkAvailable = true;
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: offlineFlag.identifier });
  await command("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await evaluate("delete navigator.onLine; window.dispatchEvent(new Event('online'))");
  await waitFor("!document.body.innerText.includes('Offline ·')");
  check("Reconnection clears the offline banner", true);
  check("No uncaught production application errors", errors.length === 0);
  console.log(`Verified ${checks.length} production PWA checks.`);
} catch (error) {
  console.error("PWA diagnostics:", await evaluate("({url:location.href,title:document.title,body:document.body?.innerText.slice(0,700),html:document.documentElement.outerHTML.slice(0,700)})").catch(() => null), errors);
  throw error;
} finally {
  for (const item of pending.values()) clearTimeout(item.timer);
  socket?.close(); browser.kill("SIGTERM");
  server.closeAllConnections(); await new Promise((done) => server.close(done));
}
