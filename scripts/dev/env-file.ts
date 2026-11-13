// Pure helper for with-env.ts.
import { parseEnv } from "node:util";

/** Variables from the env file win over the inherited ones (Next then never overrides them with .env.local). */
export function mergeEnv(base: Record<string, string | undefined>, contents: string, file = "env"): Record<string, string | undefined> {
  // MONETIO_ENV_FILE tells the DB scripts not to read .env.local on top of this file.
  return { ...base, ...parseEnv(contents), MONETIO_ENV_FILE: file };
}

/**
 * Names set in .env.local but missing from the chosen file: Next still loads .env.local, so those
 * values would mix in (e.g. a localhost URL next to production keys).
 */
export function leakingKeys(localContents: string, contents: string): string[] {
  const chosen = parseEnv(contents);
  return Object.entries(parseEnv(localContents))
    .filter(([key, value]) => value !== "" && !(key in chosen))
    .map(([key]) => key);
}
