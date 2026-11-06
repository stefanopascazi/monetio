// Pure helper for with-env.ts.
import { parseEnv } from "node:util";

/** Variables from the env file win over the inherited ones (Next then never overrides them with .env.local). */
export function mergeEnv(base: Record<string, string | undefined>, contents: string): Record<string, string | undefined> {
  return { ...base, ...parseEnv(contents) };
}
