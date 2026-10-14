import { build } from "vite";
import { resolve } from "node:path";
import { stampServiceWorker } from "./pwa-build";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [source, output, release] = process.argv.slice(2);
if (!source || !output || !release) throw new Error("Expected source, output and fixture release");
await build({
  configFile: resolve(source, "vite.config.ts"),
  mode: "production",
  build: { outDir: resolve(output), emptyOutDir: true },
  plugins: [{
    name: "isolated-pwa-release-probe",
    transformIndexHtml: () => [{
      tag: "meta", attrs: { name: "mrg-fixture-release", content: release }, injectTo: "head",
    }],
    renderChunk: (code) => `${code};window.__MRG_RELEASE_PROBE__=${JSON.stringify(release)};`,
  }],
});
if (release === "A") {
  // Preserve the historical release's index-only cache-version algorithm.
  const hash = createHash("sha256").update(await readFile(resolve(output, "index.html"))).digest("hex").slice(0, 12);
  const path = resolve(output, "sw.js"), worker = await readFile(path, "utf8");
  await writeFile(path, worker.replace("'martingale-risk-guard-v3'", JSON.stringify(`martingale-risk-guard-v3-${hash}`)));
} else {
  console.log("PWA fixture cache:", await stampServiceWorker(output));
}
