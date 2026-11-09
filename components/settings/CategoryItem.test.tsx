import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { archiveCategory, updateCategory } from "@/app/actions/settings";
import type { Category } from "@/lib/domain/types";
import { CategoryItem } from "./CategoryItem";

vi.mock("@/app/actions/settings", () => ({
  updateCategory: vi.fn(async () => ({ ok: true, message: "ok", done: 1 })),
  archiveCategory: vi.fn(async () => ({ ok: true, message: "ok" })),
}));

const food: Category = { id: "c1", name: "Spesa", kind: "expense", icon: "shopping-cart", colorIndex: 2 };

const renderItem = () =>
  render(
    <ToastProvider>
      <ul>
        <CategoryItem category={food} />
      </ul>
    </ToastProvider>,
  );

describe("CategoryItem", () => {
  it("edits the category with prefilled values and closes on save", async () => {
    renderItem();
    expect(screen.queryByLabelText("Nome")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Modifica" }));
    const name = screen.getByLabelText("Nome");
    expect(name).toHaveValue("Spesa");
    expect(screen.getByRole("radio", { name: "Spesa" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Colore 2" })).toBeChecked();
    await userEvent.clear(name);
    await userEvent.type(name, "Alimentari");
    await userEvent.click(screen.getByRole("radio", { name: "Auto" }));
    await userEvent.click(screen.getByRole("button", { name: "Salva modifiche" }));
    await waitFor(() => expect(updateCategory).toHaveBeenCalled());
    const fd = vi.mocked(updateCategory).mock.calls[0][2] as FormData;
    expect(vi.mocked(updateCategory).mock.calls[0][0]).toBe("c1");
    expect(Object.fromEntries(fd)).toEqual({ name: "Alimentari", kind: "expense", icon: "car", colorIndex: "2" });
    await waitFor(() => expect(screen.queryByLabelText("Nome")).toBeNull());
  });

  it("archives after confirmation", async () => {
    renderItem();
    await userEvent.click(screen.getByRole("button", { name: "Modifica" }));
    await userEvent.click(screen.getByRole("button", { name: "Archivia" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Archivia" }).at(-1)!);
    expect(archiveCategory).toHaveBeenCalledWith("c1");
  });
});
