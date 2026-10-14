import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function stampServiceWorker(directory: string) {
  const root = resolve(directory);
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const workerPath = resolve(directory, "sw.js");
  const worker = await readFile(workerPath, "utf8");
  const declaration = /const CACHE_NAME = (['"])martingale-risk-guard-v3(?:-[a-f0-9]{12})?\1;/;
  if (!declaration.test(worker)) throw new Error("Service worker cache marker missing");
  const rawWorker = worker.replace(declaration, "const CACHE_NAME = 'martingale-risk-guard-v3';");
  const shell = rawWorker.match(/const shellFiles = \[([\s\S]*?)\];/);
  if (!shell) throw new Error("Service worker static-shell list missing");
  const staticFiles = [...shell[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  const entryAssets = [...html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(m => m[1].split("?")[0]);
  const files = [...new Set(["/index.html", "/sw.js", ...staticFiles.filter(p=>p!=="/"), ...entryAssets])].sort();
  const digest = createHash("sha256");
  for (const path of files) {
    const file = resolve(root, "." + path);
    if (!file.startsWith(root + "/")) throw new Error("Precache input outside production output");
    const content = path === "/sw.js" ? Buffer.from(rawWorker) : await readFile(file);
    digest.update(JSON.stringify([path, content.length])).update(content);
  }
  // SW-only or stable-URL icon/manifest updates also require a new atomic cache.
  const fingerprint = digest.digest("hex").slice(0, 12);
  const cacheName = `martingale-risk-guard-v3-${fingerprint}`;
  await writeFile(workerPath, rawWorker.replace(declaration, `const CACHE_NAME = ${JSON.stringify(cacheName)};`));
  return cacheName;
}
