import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BankSetupGuide } from "./BankSetupGuide";

describe("BankSetupGuide", () => {
  it("shows the redirect URL to register and links the Control Panel", () => {
    render(<BankSetupGuide callbackUrl="https://app.example/api/bank/callback" />);
    expect(screen.getByText("https://app.example/api/bank/callback")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Control Panel di Enable Banking/ })).toHaveAttribute("href", "https://enablebanking.com/cp");
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });
});
