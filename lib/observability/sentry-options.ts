import { DATA_COLLECTION } from "./data-collection";
import { scrubEvent, type ScrubbableEvent } from "./scrub-event";

/** Common Sentry options for every runtime: errors only (no tracing, no replay), no PII, scrubbed events. */
export function sentryOptions(dsn: string | undefined, environment: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: environment ?? "development",
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: 0,
    beforeSend: <T extends ScrubbableEvent>(event: T): T => scrubEvent(event),
  };
}
