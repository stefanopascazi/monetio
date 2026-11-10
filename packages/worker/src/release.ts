// Git SHA injected by build.ts (esbuild define); undefined in tests and local runs.
declare const __WORKER_RELEASE__: string | undefined;

export const WORKER_RELEASE: string | undefined =
  typeof __WORKER_RELEASE__ === "string" && __WORKER_RELEASE__ ? __WORKER_RELEASE__ : undefined;
