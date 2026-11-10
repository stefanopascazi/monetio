import { describe, expect, it } from "vitest";
import { DATA_COLLECTION } from "./data-collection";
import { sentryOptions } from "./sentry-options";

describe("sentryOptions", () => {
  it("is disabled without a DSN", () => {
    expect(sentryOptions(undefined, undefined)).toMatchObject({ enabled: false, environment: "development" });
  });

  it("sends errors only, without PII", () => {
    expect(sentryOptions("https://k@o.ingest.sentry.io/1", "production")).toMatchObject({
      enabled: true,
      environment: "production",
      dataCollection: DATA_COLLECTION,
      tracesSampleRate: 0,
    });
  });

  it("scrubs events before sending", () => {
    const { beforeSend } = sentryOptions("dsn", "production");
    expect(beforeSend({ message: "failed for a@b.it" }).message).toBe("failed for [email]");
  });
});
