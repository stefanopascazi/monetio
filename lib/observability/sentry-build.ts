/** Source map upload to Sentry runs only when the Vercel build has SENTRY_AUTH_TOKEN. */
export function sentryBuildOptions(env: Record<string, string | undefined>) {
  const authToken = env.SENTRY_AUTH_TOKEN;
  return {
    org: env.SENTRY_ORG,
    project: env.SENTRY_PROJECT,
    authToken,
    silent: !env.CI,
    telemetry: false,
    sourcemaps: { disable: !authToken, deleteSourcemapsAfterUpload: true },
  };
}
