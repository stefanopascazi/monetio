// Bundles the worker into a single self-contained ESM file: the VPS needs Node only, no node_modules.
import { build } from "esbuild";

await build({
  entryPoints: [new URL("./src/main.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
  outfile: new URL("./dist/worker.mjs", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // Release tag for Sentry: the commit CI deploys.
  define: { __WORKER_RELEASE__: JSON.stringify(process.env.GITHUB_SHA ?? "") },
  // Some CJS dependencies call require(): provide it inside the ESM bundle.
  banner: { js: "import { createRequire as __workerCreateRequire } from 'node:module'; const require = __workerCreateRequire(import.meta.url);" },
  logLevel: "info",
});
