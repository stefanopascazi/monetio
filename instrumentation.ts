import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/sentry-options";

// Server and edge runtimes: errors only, scrubbed (see lib/observability).
export function register() {
  Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV));
}

// Uncaught errors in route handlers, server components and server actions.
export const onRequestError = Sentry.captureRequestError;
