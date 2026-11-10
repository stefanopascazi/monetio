import { describe, expect, it } from "vitest";
import { sentryBuildOptions } from "./sentry-build";

describe("sentryBuildOptions", () => {
  it("skips source map upload without a token", () => {
    expect(sentryBuildOptions({}).sourcemaps.disable).toBe(true);
  });

  it("uploads and deletes source maps with a token", () => {
    const options = sentryBuildOptions({ SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "o", SENTRY_PROJECT: "p", CI: "1" });
    expect(options).toMatchObject({ org: "o", project: "p", authToken: "t", silent: false, telemetry: false });
    expect(options.sourcemaps).toEqual({ disable: false, deleteSourcemapsAfterUpload: true });
  });
});
