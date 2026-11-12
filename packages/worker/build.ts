// Bundles the worker into a single self-contained ESM file: the VPS needs Node only, no node_modules.
import { readdirSync } from "node:fs";
import { build } from "esbuild";
import { latestMigration } from "./src/schema.ts";

const path = (rel: string) => new URL(rel, import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
// Jobs wait for this migration (src/schema.ts): the worker may deploy before Vercel migrates.
const migration = latestMigration(readdirSync(path("../../supabase/migrations"))) ?? "";

await build({
  entryPoints: [path("./src/main.ts")],
  outfile: path("./dist/worker.mjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // Release tag for Sentry: the commit CI deploys.
  define: { __WORKER_RELEASE__: JSON.stringify(process.env.GITHUB_SHA ?? ""), __WORKER_SCHEMA__: JSON.stringify(migration) },
  // Some CJS dependencies call require(): provide it inside the ESM bundle.
  banner: { js: "import { createRequire as __workerCreateRequire } from 'node:module'; const require = __workerCreateRequire(import.meta.url);" },
  logLevel: "info",
});
