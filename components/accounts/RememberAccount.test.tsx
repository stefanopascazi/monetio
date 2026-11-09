import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LAST_ACCOUNT_COOKIE } from "@/lib/navigation/last-account";
import { RememberAccount } from "./RememberAccount";

describe("RememberAccount", () => {
  it("stores the opened account in a cookie", () => {
    const { rerender } = render(<RememberAccount id="a1" />);
    expect(document.cookie).toContain(`${LAST_ACCOUNT_COOKIE}=a1`);
    rerender(<RememberAccount id="b2" />);
    expect(document.cookie).toContain(`${LAST_ACCOUNT_COOKIE}=b2`);
  });
});
