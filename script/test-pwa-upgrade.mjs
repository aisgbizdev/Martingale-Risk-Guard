import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import WebSocket from "ws";
import { EMPTY_SETTINGS } from "../shared/live-types.ts";
import { stampServiceWorker } from "./pwa-build.ts";

const exec = promisify(execFile);
const workspace = process.cwd();
const evidence = resolve("generated-artifacts/pwa-upgrade");
const runDirectory = resolve(evidence, `run-${Date.now()}`);
const historicalSource = resolve(runDirectory, "old-source");
const directories = { A: resolve(runDirectory, "A"), B: resolve(runDirectory, "B") };
const upstream = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const oldRevision = (await exec("git", ["rev-parse", "HEAD^"])).stdout.trim();
await mkdir(historicalSource, { recursive: true });
const archive = resolve(runDirectory, "old-source.tar");
// Only application/config sources; never archive secrets, private profiles or uploads.
await exec("git", ["archive", "--output", archive, oldRevision, "client", "shared",
  "vite.config.ts", "tsconfig.json", "postcss.config.js", "tailwind.config.ts", "package.json"]);
await exec("tar", ["-xf", archive, "-C", historicalSource]);
await symlink(resolve(workspace, "node_modules"), resolve(historicalSource, "node_modules"));
for (const [release, source] of [["A", historicalSource], ["B", workspace]]) {
  console.log(`Building isolated production fixture ${release}`);
  await exec(process.execPath, ["--import", "tsx", resolve("script/build-pwa-fixture.ts"),
    source, directories[release], release], { cwd: source, env: { ...process.env, NODE_ENV: "production" }, maxBuffer: 4_000_000 });
}
const cacheNames = {}, assetPaths = {};
for (const release of ["A", "B"]) {
  const worker = await readFile(resolve(directories[release], "sw.js"), "utf8");
  cacheNames[release] = worker.match(/const CACHE_NAME = ['"]([^'"]+)['"]/)[1];
  const html = await readFile(resolve(directories[release], "index.html"), "utf8");
  assetPaths[release] = [...html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(m => m[1]);
}
assert.notEqual(cacheNames.A, cacheNames.B, "Fixture releases need distinct cache names");
assert.notDeepEqual(assetPaths.A, assetPaths.B, "Fixture releases need distinct hashed assets");

let release = "A", transport = true, failAssets = false, failApi = false, failNavigation = false, clientFailure = 0;
const requests = [], checks = [], states = [], errors = [], pending = new Map();
const fingerprintChecks = [];
const probeDirectory = resolve(runDirectory, "fingerprint-probe");
await cp(directories.B, probeDirectory, { recursive: true });
assert.equal(await stampServiceWorker(probeDirectory), cacheNames.B, "Restamping is idempotent");
fingerprintChecks.push("Restamping unchanged production output is idempotent");
await writeFile(resolve(probeDirectory, "sw.js"), (await readFile(resolve(probeDirectory, "sw.js"), "utf8")) + "\n// Worker-only update probe\n");
const workerOnlyCache = await stampServiceWorker(probeDirectory);
assert.notEqual(workerOnlyCache, cacheNames.B, "Worker-only release uses an isolated candidate cache");
fingerprintChecks.push("Service-worker-only change creates a distinct cache namespace");
const manifestPath = resolve(probeDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await writeFile(manifestPath, JSON.stringify({ ...manifest, description:manifest.description + " fixture update" }));
const manifestCache = await stampServiceWorker(probeDirectory);
assert.notEqual(manifestCache, workerOnlyCache, "Manifest-only change invalidates the shell cache");
fingerprintChecks.push("Stable-URL manifest change updates the cache version");
const iconPath = resolve(probeDirectory, "newsmaker-mrg-192.png");
await writeFile(iconPath, Buffer.concat([await readFile(iconPath), Buffer.from("fixture-icon-change")]));
assert.notEqual(await stampServiceWorker(probeDirectory), manifestCache, "Icon-only change invalidates the shell cache");
fingerprintChecks.push("Stable-URL icon change updates the cache version");
const mime = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".html": "text/html" };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://fixture").pathname;
  requests.push({ release, path: pathname, transport, failAssets, failApi, failNavigation });
  if (!transport) { req.socket.destroy(); return; }
  if ((failAssets && pathname.startsWith("/assets/")) ||
      (failApi && pathname.startsWith("/api/")) ||
      (failNavigation && !extname(pathname) && !pathname.startsWith("/api/"))) {
    res.writeHead(503, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("Fixture network/service unavailable"); return;
  }
  if (clientFailure && !extname(pathname) && !pathname.startsWith("/api/")) {
    res.writeHead(clientFailure, { "Content-Type":"text/plain", "Cache-Control":"no-store" });
    res.end("Fixture access denied"); return;
  }
  try {
    if (pathname.startsWith("/api/")) {
      let body = "";
      for await (const chunk of req) body += chunk;
      const response = await fetch(upstream + req.url, {
        method: req.method, body: req.method === "GET" ? undefined : body,
        headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(12000),
      });
      res.writeHead(response.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(await response.text()); return;
    }
    const root = directories[release], file = resolve(root, "." + decodeURIComponent(pathname));
    if (file !== root && !file.startsWith(root + "/")) { res.writeHead(400); res.end(); return; }
    let content, extension = extname(file);
    try { content = await readFile(file); }
    catch {
      if (extension) { res.writeHead(404); res.end(); return; }
      content = await readFile(resolve(root, "index.html")); extension = ".html";
    }
    res.writeHead(200, { "Content-Type": mime[extension] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(content);
  } catch { res.writeHead(502); res.end("{}"); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = resolve(runDirectory, "browser-profile");
const browser = spawn("chromium", ["--headless", "--no-sandbox", "--disable-dev-shm-usage",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let socket, sequence = 0, browserVersion, lastNavigationStatus;
const command = (method, params = {}) => new Promise((done, fail) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); fail(new Error(`${method} timed out`)); }, 30000);
  pending.set(id, { done, fail, timer }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const r = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expression, timeout = 30000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(150); }
  throw new Error(`Timed out: ${expression}`);
};
const check = (name, valid) => { assert.ok(valid, name); checks.push(name); console.log("PASS", name); };
const navigate = async path => {
  const previous = await evaluate("performance.timeOrigin");
  await command("Page.navigate", { url: origin + path });
  await waitFor(`performance.timeOrigin !== ${previous} && document.readyState === 'complete'`);
};
const coherent = version => `document.querySelector('meta[name="mrg-fixture-release"]')?.content === '${version}' && window.__MRG_RELEASE_PROBE__ === '${version}'`;
const storage = () => evaluate("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))");
const activeCache = name => `(async()=> (await caches.keys()).includes(${JSON.stringify(name)}))()`;
const snapshot = async name => {
  states.push({ name, release: await evaluate("({html:document.querySelector('meta[name=\"mrg-fixture-release\"]')?.content,js:window.__MRG_RELEASE_PROBE__})"),
    caches: await evaluate("(async()=>Object.fromEntries(await Promise.all((await caches.keys()).map(async k=>[k,(await (await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)]))))()") });
  await writeFile(resolve(evidence, `${name}.jpg`), Buffer.from((await command("Page.captureScreenshot", { format: "jpeg", quality: 70 })).data, "base64"));
};
let failure;
try {
  for (const name of fingerprintChecks) check(name, true);
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(resolve(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
    catch { await sleep(100); }
  }
  assert.ok(port, "Chromium opened a debugging port");
  const page = (await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json())).find(p=>p.type==="page");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  socket.on("message", raw => {
    const r = JSON.parse(raw);
    if (r.id && pending.has(r.id)) {
      const p = pending.get(r.id); clearTimeout(p.timer); pending.delete(r.id);
      r.error ? p.fail(new Error(JSON.stringify(r.error))) : p.done(r.result);
    }
    if (r.method === "Runtime.exceptionThrown") errors.push(r.params.exceptionDetails.text);
    if (r.method === "Network.responseReceived" && r.params.type === "Document") lastNavigationStatus = r.params.response.status;
  });
  await new Promise(done=>socket.once("open", done));
  await command("Page.enable"); await command("Runtime.enable"); await command("Network.enable");
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  browserVersion = await command("Browser.getVersion");
  await navigate("/positions"); await waitFor(coherent("A"));
  await waitFor("navigator.serviceWorker.controller !== null");
  await waitFor(activeCache(cacheNames.A));
  check("Historical production build A runs with its own warm service-worker cache", true);
  const params = { modal:200000, targetPoin:"30", strategy:"Linear Averaging", maxLayer:"3", experience:"Pemula", marketCondition:"Sideways" };
  const result = await fetch(upstream + "/api/calculate-risk", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(params) }).then(r=>r.json());
  assert.equal(result.score, 25);
  await evaluate(`localStorage.setItem('mrg_portfolio_v1', ${JSON.stringify(JSON.stringify({ version:1, positions:[
    {id:"upgrade-buy",symbol:"XUL10",side:"buy",entry:4090,lots:0.1,enteredAt:"2026-10-14T12:00:15.000Z"},
    {id:"upgrade-sell",symbol:"XUL10",side:"sell",entry:4120,lots:0.05,enteredAt:null}
  ], settings:{...EMPTY_SETTINGS,capital:1000,equity:900,maxLots:10,maxLayers:5,targetPriceDistance:30,layerSpacingPrice:20} }))});
  localStorage.setItem('riskcheck_scenarios', ${JSON.stringify(JSON.stringify([{id:"upgrade-study",nameKey:"conservative",params,result,savedAt:1791979215000}]))});
  localStorage.setItem('other_feature_marker', 'keep-me');`);
  await navigate("/result?" + new URLSearchParams(params)); await waitFor(coherent("A"));
  await waitFor("document.querySelector('[data-testid=\"button-delete-scenario-0\"]') !== null");
  check("Build A renders the original saved synthetic study", await evaluate("document.querySelector('[data-testid=\"button-delete-scenario-0\"]').parentElement.textContent.includes('25/100')"));
  await navigate("/positions"); await waitFor(coherent("A"));
  await waitFor("document.body.innerText.includes('Sisi buy') && document.body.innerText.includes('Sisi sell')");
  const originalStorage = await storage();
  await snapshot("warm-old-build");
  await evaluate("(async()=>{const c=await caches.open('other-feature-cache');await c.put('/',new Response('Unrelated feature shell'));})()");
  check("Old build precaches all of its hashed entry assets", await evaluate(`(async()=>{const c=await caches.open(${JSON.stringify(cacheNames.A)});return (await Promise.all(${JSON.stringify(assetPaths.A)}.map(p=>c.match(p)))).every(Boolean);})()`));

  // Incomplete B must not activate or destroy the previously working offline shell.
  release = "B"; failAssets = true;
  await evaluate("(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();while(r.installing)await new Promise(d=>setTimeout(d,100));})()");
  check("Failed B installation retains the active A cache", await evaluate(activeCache(cacheNames.A)));
  check("Failed B installation has no completed candidate shell", await evaluate(`(async()=>!(await (await caches.open(${JSON.stringify(cacheNames.B)})).match('/')))()`));
  transport = false;
  const firstOfflineFlag = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: "Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})",
  });
  await command("Network.emulateNetworkConditions", { offline:true, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  await navigate("/positions"); await waitFor(coherent("A"));
  await waitFor("document.body.innerText.includes('Offline')");
  check("Interrupted upgrade can reload the intact old build offline", await storage() === originalStorage);
  check("Offline old build explicitly pauses live data", await evaluate("document.body.innerText.includes('Offline')"));
  await snapshot("failed-upgrade-old-offline");

  transport = true; failAssets = false;
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier:firstOfflineFlag.identifier });
  await command("Network.emulateNetworkConditions", { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  // Retry in the same registration and profile, without clearing caches or localStorage.
  await evaluate("(async()=>{await (await navigator.serviceWorker.getRegistration()).update();})()");
  await waitFor(`(async()=>!(await caches.keys()).includes(${JSON.stringify(cacheNames.A)}) && (await caches.keys()).includes(${JSON.stringify(cacheNames.B)}))()`);
  await navigate("/positions"); await waitFor(coherent("B"));
  check("Reconnection installs B and reload uses matching B HTML and JavaScript", true);
  check("Upgrade retains every storage key and exact portfolio/study bytes", await storage() === originalStorage);
  check("New cache has every B entry asset", await evaluate(`(async()=>{const c=await caches.open(${JSON.stringify(cacheNames.B)});return (await Promise.all(${JSON.stringify(assetPaths.B)}.map(p=>c.match(p)))).every(Boolean);})()`));
  check("Retired A assets and cache are removed, not mixed into B", await evaluate(`(async()=>{const keys=await caches.keys();const c=await caches.open(${JSON.stringify(cacheNames.B)});return !keys.includes(${JSON.stringify(cacheNames.A)}) && (await Promise.all(${JSON.stringify(assetPaths.A.filter(p=>!assetPaths.B.includes(p)))}.map(p=>c.match(p)))).every(r=>!r);})()`));
  check("Unrelated feature cache survives activation cleanup", await evaluate("(async()=>(await caches.keys()).includes('other-feature-cache'))()"));
  await snapshot("new-build-online");
  await navigate("/result?" + new URLSearchParams(params)); await waitFor(coherent("B"));
  await waitFor("document.querySelector('[data-testid=\"button-delete-scenario-0\"]') !== null");
  check("New build still renders the original study scenario", await storage() === originalStorage && await evaluate("document.querySelector('[data-testid=\"button-delete-scenario-0\"]').parentElement.textContent.includes('25/100')"));

  failApi = true;
  check("Live API 503 remains a failure rather than a cached success", await evaluate("fetch('/api/market/quotes').then(r=>r.status===503).catch(()=>false)"));
  failNavigation = true;
  await navigate("/positions");
  check("Navigation HTTP 503 falls back to the verified B shell, not an unrelated cache", await evaluate(coherent("B")));
  await waitFor("document.querySelector('[data-testid=\"position-side-buy\"] .risk-summary')?.innerText.includes('Belum tersedia')");
  check("Unavailable live data is not labelled fresh in the fallback shell", true);
  check("HTTP failure does not change local portfolio or studies", await storage() === originalStorage);
  await snapshot("http-failure-verified-shell");
  failNavigation = false; failApi = false; clientFailure = 403;
  await navigate("/positions");
  check("HTTP 403 is preserved rather than bypassed with a cached shell", lastNavigationStatus === 403 && await evaluate("document.body.innerText.includes('Fixture access denied') && !document.querySelector('meta[name=\"mrg-fixture-release\"]')"));
  check("Access denial also leaves all local data untouched", await storage() === originalStorage);
  clientFailure = 0; transport = false;
  const secondOfflineFlag = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: "Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})",
  });
  await command("Network.emulateNetworkConditions", { offline:true, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  await navigate("/positions"); await waitFor(coherent("B"));
  await waitFor("document.body.innerText.includes('Offline')");
  check("Post-upgrade offline reload uses matching B shell/assets", true);
  check("Offline new build explicitly pauses live data and keeps every record", await evaluate("document.body.innerText.includes('Offline')") && await storage() === originalStorage);
  check("Offline API cannot return an old cached quote", await evaluate("fetch('/api/market/quotes').then(()=>false).catch(()=>true)"));
  check("No owned cache contains live API responses", await evaluate("(async()=>{for(const k of await caches.keys()){if(!k.startsWith('martingale-risk-guard-'))continue;if((await (await caches.open(k)).keys()).some(r=>new URL(r.url).pathname.startsWith('/api/')))return false;}return true;})()"));
  await snapshot("new-build-offline");
  transport = true;
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier:secondOfflineFlag.identifier });
  await command("Network.emulateNetworkConditions", { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
  await navigate("/positions"); await waitFor(coherent("B"));
  check("Final reconnection preserves the complete local data", await storage() === originalStorage);
  check("Fresh network API requests resume after reconnection", await evaluate("fetch('/api/market/quotes').then(r=>r.ok)"));
  check("No uncaught application exceptions during upgrade", errors.length === 0);
} catch (error) {
  failure = String(error);
  console.error("Upgrade diagnostics:", await evaluate("({url:location.href,body:document.body?.innerText.slice(0,400)})").catch(()=>null));
  throw error;
} finally {
  await writeFile(resolve(evidence, "checks.json"), JSON.stringify({
    checkedAt:new Date().toISOString(), environment:"Two real Vite production fixtures, one origin/profile, desktop headless Chromium. Not native OS or a published release.",
    oldRevision, browser:browserVersion, cacheNames, assetPaths, passed:checks.length, checks, fingerprintChecks, states, errors, failure,
    offlineMethod:"HTTP transport cut plus CDP offline; OS navigator.onLine flag simulated explicitly. Not airplane mode.",
    requests, unverified:["Android/iPhone OS installation", "Actual standalone launch", "Native keyboard/gesture", "Production deployment"],
  }, null, 2));
  for (const p of pending.values()) clearTimeout(p.timer);
  socket?.close();
  await new Promise(done => {
    if (browser.exitCode !== null) { done(); return; }
    const timeout = setTimeout(()=>browser.kill("SIGKILL"), 5000);
    browser.once("close", ()=>{ clearTimeout(timeout); done(); });
    browser.kill("SIGTERM");
  });
  server.closeAllConnections(); await new Promise(done=>server.close(done));
}
console.log(`Verified ${checks.length} warm-cache PWA upgrade checks. Evidence: generated-artifacts/pwa-upgrade/`);
