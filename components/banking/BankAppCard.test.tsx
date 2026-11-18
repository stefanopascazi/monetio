import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { deleteBankCredentials } from "@/app/actions/banking";
import type { BankApp } from "@/lib/banking/bank-app";
import { BankAppCard } from "./BankAppCard";

vi.mock("@/app/actions/banking", () => ({
  saveBankCredentials: vi.fn(),
  deleteBankCredentials: vi.fn(async () => ({ ok: true, message: "Rimossa" })),
}));

const app: BankApp = { environment: "sandbox", appId: "1a2b3c4d-0000-1111-2222-333344445555", appName: "MonetIO-dev", verifiedAt: "2026-11-18T10:00:00Z" };
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankAppCard", () => {
  it("shows name, environment and a short id, never the full id", () => {
    wrap(<BankAppCard app={app} />);
    expect(screen.getByText("MonetIO-dev")).toBeInTheDocument();
    expect(screen.getByText("Prova (Sandbox)")).toBeInTheDocument();
    expect(screen.getByText(/ID 1a2b…5555 · verificata il 18 novembre 2026/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(app.appId))).toBeNull();
  });

  it("opens the replace form in place", async () => {
    wrap(<BankAppCard app={app} />);
    await userEvent.click(screen.getByRole("button", { name: "Sostituisci" }));
    expect(screen.getByLabelText(/Application ID/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sostituisci" })).toBeNull();
  });

  it("asks before removing the app", async () => {
    wrap(<BankAppCard app={app} />);
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi app" }));
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi" }));
    expect(deleteBankCredentials).toHaveBeenCalled();
  });
});
