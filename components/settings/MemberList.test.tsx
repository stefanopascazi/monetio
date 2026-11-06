import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { removeMember, setMemberRole } from "@/app/actions/members";
import type { Member } from "@/lib/domain/types";
import { MemberList } from "./MemberList";

vi.mock("@/app/actions/members", () => ({
  setMemberRole: vi.fn(async () => ({ ok: true, message: "ok" })),
  removeMember: vi.fn(async () => ({ ok: true, message: "ok" })),
}));

const ste: Member = { id: "m1", displayName: "Ste", email: "ste@x.it", userId: "u1", role: "admin" };
const asha: Member = { id: "m2", displayName: "Asha", email: null, userId: "u2", role: "member" };

const renderList = (me: Member) =>
  render(
    <ToastProvider>
      <MemberList me={me} members={[ste, asha]} />
    </ToastProvider>,
  );

describe("MemberList", () => {
  it("lets an admin change roles and remove other members", async () => {
    renderList(ste);
    expect(screen.getByText("(tu)")).toBeInTheDocument();
    // Only Asha gets controls: the admin cannot manage themselves.
    const role = screen.getByLabelText("Ruolo");
    expect(role).toHaveValue("member");
    await userEvent.selectOptions(role, "admin");
    expect(setMemberRole).toHaveBeenCalledWith("m2", "admin");
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Rimuovi" }).at(-1)!);
    expect(removeMember).toHaveBeenCalledWith("m2");
  });

  it("shows roles read-only to plain members", () => {
    renderList(asha);
    expect(screen.queryByLabelText("Ruolo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Rimuovi" })).toBeNull();
    expect(screen.getByText("Amministratore")).toBeInTheDocument();
    expect(screen.getByText("Membro")).toBeInTheDocument();
  });
});
