import { build } from "vite";
import { resolve } from "node:path";
import { stampServiceWorker } from "./pwa-build";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [source, output, release] = process.argv.slice(2);
if (!source || !output || !release) throw new Error("Expected source, output and fixture release");
// This isolated build does not open a server. Artifact workflows provide these
// values for the real app; fixtures supply the same root URL contract.
process.env.PORT ??= "23901";
process.env.BASE_PATH ??= "/";
process.env.NODE_ENV = "production";
const sourceRoot = resolve(source);
const outputRoot = resolve(output);
// Tailwind v3 resolves its config/content from cwd, including historical builds.
process.chdir(sourceRoot);
await build({
  configFile: resolve(sourceRoot, "vite.config.ts"),
  mode: "production",
  build: { outDir: outputRoot, emptyOutDir: true },
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
  const hash = createHash("sha256").update(await readFile(resolve(outputRoot, "index.html"))).digest("hex").slice(0, 12);
  const path = resolve(outputRoot, "sw.js"), worker = await readFile(path, "utf8");
  await writeFile(path, worker.replace("'martingale-risk-guard-v3'", JSON.stringify(`martingale-risk-guard-v3-${hash}`)));
} else {
  console.log("PWA fixture cache:", await stampServiceWorker(outputRoot));
}
