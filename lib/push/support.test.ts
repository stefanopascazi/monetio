import { describe, expect, it } from "vitest";
import { type PushEnvironment, pushSupport } from "./support";

const desktop: PushEnvironment = {
  production: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140",
  standalone: false,
};
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1";

describe("pushSupport", () => {
  it("is ready on a production desktop browser", () => {
    expect(pushSupport(desktop)).toBe("ready");
  });

  it("asks iOS users to install the app first", () => {
    expect(pushSupport({ ...desktop, userAgent: iphone, hasPushManager: false })).toBe("ios-install");
  });

  it("is ready in an installed iOS web app", () => {
    expect(pushSupport({ ...desktop, userAgent: iphone, standalone: true })).toBe("ready");
  });

  it("reports missing APIs", () => {
    expect(pushSupport({ ...desktop, hasPushManager: false })).toBe("unsupported");
    expect(pushSupport({ ...desktop, hasNotification: false })).toBe("unsupported");
  });

  it("is unavailable in development builds", () => {
    expect(pushSupport({ ...desktop, production: false })).toBe("dev");
  });
});
