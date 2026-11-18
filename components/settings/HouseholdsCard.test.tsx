import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { HouseholdsCard } from "./HouseholdsCard";

vi.mock("@/app/actions/household", () => ({ switchHousehold: vi.fn(), createHousehold: vi.fn(), joinHousehold: vi.fn(), lookupInvite: vi.fn() }));

describe("HouseholdsCard", () => {
  it("lists the households and offers to add one", () => {
    render(
      <ToastProvider>
        <HouseholdsCard memberships={[{ householdId: "h1", householdName: "Casa", role: "admin" }]} activeId="h1" />
      </ToastProvider>,
    );
    expect(screen.getByText("I tuoi nuclei")).toBeInTheDocument();
    expect(screen.getByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("Aggiungi un nucleo")).toBeInTheDocument();
  });
});
