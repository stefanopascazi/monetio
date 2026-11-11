import * as Sentry from "@sentry/node";
import { DATA_COLLECTION } from "../../../../lib/observability/data-collection.ts";
import { sendTestEvent } from "../../../../lib/observability/test-event.ts";
import { scrubEvent } from "../../../../lib/observability/scrub-event.ts";
import type { ErrorReporter } from "./reporter.ts";

/** Sentry for the worker: errors only, no OpenTelemetry/tracing (small RAM budget), scrubbed events. */
export function createSentryReporter(dsn: string, release: string | undefined): ErrorReporter {
  Sentry.init({
    dsn,
    release,
    environment: "production",
    dataCollection: DATA_COLLECTION,
    enableOpenTelemetrySetup: false,
    beforeSend: (event) => scrubEvent(event),
  });
  return {
    capture: (error, tags) => void Sentry.captureException(error, { tags }),
    flush: async (timeoutMs) => void (await Sentry.flush(timeoutMs)),
    sendTest: () => sendTestEvent(Sentry, "MonetIO worker"),
  };
}
