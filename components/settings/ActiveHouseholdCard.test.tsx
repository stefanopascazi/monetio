import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import type { Member } from "@/lib/domain/types";
import { ActiveHouseholdCard } from "./ActiveHouseholdCard";

vi.mock("@/app/actions/members", () => ({ setMemberRole: vi.fn(), removeMember: vi.fn(), inviteMember: vi.fn() }));
vi.mock("@/app/actions/household", () => ({ renameHousehold: vi.fn(), deleteHousehold: vi.fn(), leaveHousehold: vi.fn() }));

const ste: Member = { id: "m1", displayName: "Ste", email: "ste@x.it", userId: "u1", role: "admin" };
const asha: Member = { id: "m2", displayName: "Asha", email: null, userId: "u2", role: "member" };

const renderCard = (me: Member) =>
  render(
    <ToastProvider>
      <ActiveHouseholdCard householdName="Casa" inviteCode="72C88930" me={me} members={[ste, asha]} />
    </ToastProvider>,
  );

describe("ActiveHouseholdCard", () => {
  it("gives admins invite and rename tools", () => {
    renderCard(ste);
    expect(screen.getByText("Sei amministratore: gestisci persone e ruoli")).toBeInTheDocument();
    expect(screen.getByText("72C88930")).toBeInTheDocument();
    expect(screen.getAllByText(/Rinomina|Invita/).length).toBeGreaterThan(0);
  });

  it("shows members only the invite code and the exit", () => {
    renderCard(asha);
    expect(screen.getByText("Fai parte di questo nucleo come membro")).toBeInTheDocument();
    expect(screen.getByText("72C88930")).toBeInTheDocument();
    expect(screen.queryByText(/Rinomina|Invita/)).toBeNull();
    expect(screen.getByRole("button", { name: "Esci dal nucleo" })).toBeInTheDocument();
  });
});
