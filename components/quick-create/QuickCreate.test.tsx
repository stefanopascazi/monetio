import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { QuickCreate, type QuickCreateProps } from "./QuickCreate";

const nav = vi.hoisted(() => ({ params: {} as { id?: string } }));
vi.mock("next/navigation", () => ({ useParams: () => nav.params }));
vi.mock("@/app/actions/accounts", () => ({ createAccount: vi.fn(async () => ({ ok: true, message: "Conto creato." })) }));
vi.mock("@/app/actions/rules", () => ({ createRule: vi.fn(), createContribution: vi.fn() }));
vi.mock("@/app/actions/transactions", () => ({ createTransaction: vi.fn() }));
vi.mock("@/app/actions/settings", () => ({ createCategory: vi.fn(), updateProfile: vi.fn(), restoreCategory: vi.fn() }));

const accounts = [
  { id: "a", name: "Cointestato" },
  { id: "b", name: "Contanti" },
];

const renderMenu = (props: Partial<QuickCreateProps> = {}) =>
  render(
    <ToastProvider>
      <QuickCreate accounts={accounts} categories={[{ id: "c1", name: "Spesa" }]} transferTargets={[]} today="2026-11-09" {...props} />
    </ToastProvider>,
  );

describe("QuickCreate", () => {
  beforeEach(() => {
    nav.params = {};
  });

  it("opens the menu with every option", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
    expect(screen.getByRole("heading", { name: "Cosa vuoi aggiungere?" })).toBeInTheDocument();
    for (const label of ["Movimento", "Ricorrenza", "Quota automatica", "Conto", "Categoria"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
  });

  it("hides account-based options without accounts", async () => {
    renderMenu({ accounts: [] });
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
    expect(screen.queryByRole("button", { name: /^Movimento/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Conto/ })).toBeInTheDocument();
  });

  it("opens the movement form preset on the open account, and goes back to the menu", async () => {
    nav.params = { id: "b" };
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
    await userEvent.click(screen.getByRole("button", { name: /^Movimento/ }));
    expect(screen.getByRole("heading", { name: "Nuovo movimento" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Conto" })).toHaveValue("b");
    await userEvent.click(screen.getByRole("button", { name: "Scegli altro" }));
    expect(screen.getByRole("heading", { name: "Cosa vuoi aggiungere?" })).toBeInTheDocument();
  });

  it("closes after creating an account", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));
    await userEvent.click(screen.getByRole("button", { name: /^Conto/ }));
    await userEvent.type(screen.getByRole("textbox", { name: /Nome/ }), "Nuovo");
    await userEvent.click(screen.getByRole("button", { name: "Crea conto" }));
    expect(createAccount).toHaveBeenCalled();
    expect(await screen.findByText("Conto creato.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nuovo conto" })).toBeNull();
  });
});
