// Decides whether DB scripts read the local Docker stack env (.env.stack). Side effect lives in load-local-env.ts.

/** Local runs read .env.stack; Vercel builds never do (their env comes from the project). */
export function shouldLoadLocalEnv(env: Record<string, string | undefined>, fileExists: boolean): boolean {
  return fileExists && !env.VERCEL;
}
