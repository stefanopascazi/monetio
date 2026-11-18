import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { saveBankCredentials } from "@/app/actions/banking";
import { BankCredentialsForm } from "./BankCredentialsForm";

vi.mock("@/app/actions/banking", () => ({ saveBankCredentials: vi.fn(async () => ({ ok: true, message: "Salvata", done: 1 })) }));

const PEM = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankCredentialsForm", () => {
  it("keeps submit disabled until a key file is chosen, then sends id and PEM", async () => {
    const onDone = vi.fn();
    wrap(<BankCredentialsForm replacing onDone={onDone} />);
    const submit = screen.getByRole("button", { name: "Verifica e salva" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Application ID/), "1a2b3c4d-0000");
    await userEvent.upload(screen.getByLabelText(/Chiave privata/), new File([PEM], "key.pem", { type: "application/x-pem-file" }));
    await waitFor(() => expect(screen.getByText("Selezionata: key.pem")).toBeInTheDocument());
    await userEvent.click(submit);

    await waitFor(() => expect(saveBankCredentials).toHaveBeenCalled());
    const fd = vi.mocked(saveBankCredentials).mock.calls[0][1];
    expect(fd.get("appId")).toBe("1a2b3c4d-0000");
    expect(fd.get("privateKey")).toBe(PEM);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("rejects files too large to be a key", async () => {
    wrap(<BankCredentialsForm replacing />);
    await userEvent.upload(screen.getByLabelText(/Chiave privata/), new File(["x".repeat(9_000)], "big.pem"));
    expect(await screen.findByText(/troppo grande/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verifica e salva" })).toBeDisabled();
  });
});
