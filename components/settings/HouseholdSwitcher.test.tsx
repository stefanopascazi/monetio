import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { switchHousehold } from "@/app/actions/household";
import { HouseholdSwitcher } from "./HouseholdSwitcher";

vi.mock("@/app/actions/household", () => ({ switchHousehold: vi.fn(async () => ({ ok: true })) }));

describe("HouseholdSwitcher", () => {
  it("marks the active household and opens another one", async () => {
    render(
      <ToastProvider>
        <HouseholdSwitcher
          activeId="h1"
          memberships={[
            { householdId: "h1", householdName: "Casa", role: "admin" },
            { householdId: "h2", householdName: "Vacanze", role: "member" },
          ]}
        />
      </ToastProvider>,
    );
    expect(screen.getByText("In uso")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Apri" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Apri" }));
    expect(switchHousehold).toHaveBeenCalledWith("h2");
  });
});
