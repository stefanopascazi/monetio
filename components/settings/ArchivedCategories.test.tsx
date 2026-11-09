import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { restoreCategory } from "@/app/actions/settings";
import type { Category } from "@/lib/domain/types";
import { ArchivedCategories } from "./ArchivedCategories";

vi.mock("@/app/actions/settings", () => ({
  restoreCategory: vi.fn(async () => ({ ok: true, message: "ok" })),
}));

const trip: Category = { id: "c9", name: "Vacanze", kind: "expense", icon: "car", colorIndex: 3, archived: true };

const renderList = (categories: Category[]) =>
  render(
    <ToastProvider>
      <ArchivedCategories categories={categories} />
    </ToastProvider>,
  );

describe("ArchivedCategories", () => {
  it("renders nothing without archived categories", () => {
    renderList([]);
    expect(screen.queryByText(/Archiviate/)).toBeNull();
  });

  it("restores an archived category", async () => {
    renderList([trip]);
    expect(screen.getByRole("heading", { name: "Archiviate (1)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Espandi" }));
    await userEvent.click(screen.getByRole("button", { name: "Ripristina" }));
    expect(restoreCategory).toHaveBeenCalledWith("c9");
  });
});
