import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { removeCategoryMatch } from "@/app/actions/category-matches";
import { AccountMatches } from "./AccountMatches";

vi.mock("@/app/actions/category-matches", () => ({ removeCategoryMatch: vi.fn(async () => ({ ok: true, message: "Abbinamento rimosso." })) }));

describe("AccountMatches", () => {
  it("explains how matches are born", () => {
    render(<AccountMatches matches={[]} />);
    expect(screen.getByText(/Nessun abbinamento/)).toBeInTheDocument();
  });

  it("lists matches with direction and category, and removes one after confirming", async () => {
    render(
      <ToastProvider>
        <AccountMatches matches={[{ id: "m1", description: "Netflix", direction: -1, categoryName: "Abbonamenti" }]} />
      </ToastProvider>,
    );
    expect(screen.getByText("Uscite · Abbonamenti")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi" }));
    const confirm = screen.getAllByRole("button", { name: "Rimuovi" }).at(-1)!;
    await userEvent.click(confirm);
    expect(removeCategoryMatch).toHaveBeenCalledWith("m1");
  });
});
