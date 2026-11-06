import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { deleteHousehold, leaveHousehold } from "@/app/actions/household";
import { HouseholdExit, RenameHouseholdForm } from "./HouseholdActions";

vi.mock("@/app/actions/household", () => ({
  renameHousehold: vi.fn(),
  deleteHousehold: vi.fn(async () => ({ ok: true })),
  leaveHousehold: vi.fn(async () => ({ ok: true })),
}));

const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("HouseholdExit", () => {
  it("asks before deleting the household", async () => {
    wrap(<HouseholdExit householdName="Casa" admin canLeave={false} />);
    expect(screen.queryByRole("button", { name: "Esci dal nucleo" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Elimina nucleo" }));
    expect(screen.getByText(/Elimino "Casa"/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(deleteHousehold).toHaveBeenCalled();
  });

  it("lets a member leave but not delete", async () => {
    wrap(<HouseholdExit householdName="Casa" admin={false} canLeave />);
    expect(screen.queryByRole("button", { name: "Elimina nucleo" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Esci dal nucleo" }));
    await userEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(leaveHousehold).toHaveBeenCalled();
  });
});

describe("RenameHouseholdForm", () => {
  it("prefills the current name", async () => {
    wrap(<RenameHouseholdForm householdName="Casa" />);
    await userEvent.click(screen.getByRole("button", { name: /Rinomina nucleo/ }));
    expect(screen.getByLabelText("Nome del nucleo")).toHaveValue("Casa");
  });
});
