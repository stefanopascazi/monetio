import { describe, expect, it } from "vitest";
import { parseAuthHash } from "./hash";

describe("parseAuthHash", () => {
  it("reads tokens", () => {
    expect(parseAuthHash("#access_token=a&refresh_token=r&type=invite")).toEqual({ kind: "session", accessToken: "a", refreshToken: "r" });
  });

  it("reads errors", () => {
    expect(parseAuthHash("#error=access_denied&error_code=otp_expired")).toEqual({ kind: "error", message: "Il link è scaduto o è già stato usato." });
    expect(parseAuthHash("#error=server_error")).toEqual({ kind: "error", message: "Il link non è valido." });
  });

  it("returns none for an empty hash", () => {
    expect(parseAuthHash("")).toEqual({ kind: "none" });
  });
});
