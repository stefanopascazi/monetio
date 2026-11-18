import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionCard } from "./SessionCard";

vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }));

describe("SessionCard", () => {
  it("shows the signed-in email and the sign out button", () => {
    render(<SessionCard email="anna@example.com" />);
    expect(screen.getByText("Accesso come anna@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Esci" })).toBeInTheDocument();
  });

  it("omits the email line when unknown", () => {
    render(<SessionCard email={null} />);
    expect(screen.queryByText(/Accesso come/)).toBeNull();
  });
});
