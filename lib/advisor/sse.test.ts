import { describe, expect, it } from "vitest";
import { decodeEvents, encodeEvent } from "./sse";

describe("advisor events", () => {
  it("round-trips events and keeps a partial one for the next chunk", () => {
    const a = encodeEvent({ type: "status", label: "Simulo lo scenario…" });
    const b = encodeEvent({ type: "error", message: "No" });
    const { events, rest } = decodeEvents(a + b.slice(0, 10));
    expect(events).toEqual([{ type: "status", label: "Simulo lo scenario…" }]);
    expect(decodeEvents(rest + b.slice(10)).events).toEqual([{ type: "error", message: "No" }]);
  });
});
