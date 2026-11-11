import { describe, expect, it } from "vitest";
import { reliabilityFor } from "./reliability-view";

const tip = (accountId: string) => ({ kind: "stale" as const, accountId, message: accountId, href: "/", gain: 10 });
const data = {
  score: 60,
  level: "medium" as const,
  accounts: [{ accountId: "a", name: "A", score: 90, level: "high" as const }],
  suggestions: [tip("a"), tip("b")],
};

describe("reliabilityFor", () => {
  it("uses the household for the combined series and the account for its own", () => {
    expect(reliabilityFor(data, "all")).toMatchObject({ level: "medium", score: 60, suggestions: [tip("a"), tip("b")] });
    expect(reliabilityFor(data, "a")).toEqual({ level: "high", score: 90, suggestions: [tip("a")] });
  });
});
