// Decides whether DB scripts read .env.local (local Docker stack). Side effect lives in load-local-env.ts.

/** Local runs read .env.local; Vercel builds never do (their env comes from the project), nor runs with an explicit env file. */
export function shouldLoadLocalEnv(env: Record<string, string | undefined>, fileExists: boolean): boolean {
  // An explicit env file (scripts/dev/with-env.ts) replaces .env.local instead of mixing with it.
  return fileExists && !env.VERCEL && !env.MONETIO_ENV_FILE;
}
