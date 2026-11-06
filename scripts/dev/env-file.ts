// Pure helper for with-env.ts.
import { parseEnv } from "node:util";

/** Variables from the env file win over the inherited ones (Next then never overrides them with .env.local). */
export function mergeEnv(base: NodeJS.ProcessEnv, contents: string): NodeJS.ProcessEnv {
  return { ...base, ...parseEnv(contents) };
}
