// Points DB scripts at the local Docker stack unless running on Vercel.
// Import it first: `import "../db/load-local-env.ts";`
import { existsSync } from "node:fs";
import { join } from "node:path";
import { shouldLoadLocalEnv } from "./local-env.ts";

const file = join(import.meta.dirname, "../../.env.stack");
// loadEnvFile never overrides variables already set, so an explicit shell export still wins.
if (shouldLoadLocalEnv(process.env, existsSync(file))) process.loadEnvFile(file);
