import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { startBankLink } from "@/app/actions/bank-links";
import { BankPicker } from "./BankPicker";

vi.mock("@/app/actions/bank-links", () => ({ startBankLink: vi.fn() }));

const assign = vi.fn();
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);
const banks = [
  { name: "Mock ASPSP" },
  { name: "Genome" },
  { name: "Revolut" },
];

afterEach(() => vi.unstubAllGlobals());

describe("BankPicker", () => {
  it("sends the person to the bank URL for the chosen bank", async () => {
    vi.stubGlobal("location", { ...window.location, assign });
    vi.mocked(startBankLink).mockResolvedValue({ ok: true, url: "https://bank.example/consent" });
    wrap(<BankPicker banks={banks} sandbox />);
    expect(screen.getByRole("option", { name: "Genome" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Banca"), "Genome");
    await userEvent.click(screen.getByRole("button", { name: "Collega" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://bank.example/consent"));
    expect(startBankLink).toHaveBeenCalledWith("Genome");
  });

  it("shows the error and stays on the page", async () => {
    vi.mocked(startBankLink).mockResolvedValue({ ok: false, message: "Banca non disponibile per la tua app." });
    wrap(<BankPicker banks={banks} sandbox={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Collega" }));
    expect(await screen.findByText("Banca non disponibile per la tua app.")).toBeInTheDocument();
  });

  it("filters the list by search", async () => {
    wrap(<BankPicker banks={banks} sandbox={false} />);
    await userEvent.type(screen.getByLabelText("Cerca banca"), "revo");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Revolut"]);
    expect(screen.getByLabelText("Banca")).toHaveValue("Revolut");
    await userEvent.clear(screen.getByLabelText("Cerca banca"));
    await userEvent.type(screen.getByLabelText("Cerca banca"), "zzz");
    expect(screen.getByText("Nessuna banca corrisponde alla ricerca.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collega" })).toBeDisabled();
  });

  it("shows banks already used first and as shortcuts", async () => {
    vi.mocked(startBankLink).mockResolvedValue({ ok: false, message: "x" });
    wrap(<BankPicker banks={banks} recent={["Revolut"]} sandbox={false} />);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Revolut");
    expect(screen.getByRole("button", { name: "Revolut" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.selectOptions(screen.getByLabelText("Banca"), "Genome");
    await userEvent.click(screen.getByRole("button", { name: "Revolut" }));
    await userEvent.click(screen.getByRole("button", { name: "Collega" }));
    expect(startBankLink).toHaveBeenCalledWith("Revolut");
  });

  it("explains an empty list", () => {
    wrap(<BankPicker banks={[]} sandbox={false} />);
    expect(screen.getByText(/non ha restituito banche/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collega" })).toBeNull();
  });
});
