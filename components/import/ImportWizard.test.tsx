import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { ImportWizard } from "./ImportWizard";

const actions = vi.hoisted(() => ({
  readStatementFile: vi.fn(),
  previewImport: vi.fn(),
  importStatement: vi.fn(),
}));
vi.mock("@/app/actions/import", () => actions);

const GRID = [
  ["Data contabile", "Valuta", "Dare", "Avere", "Divisa", "Causale", "Descrizione"],
  ["2025-01-03", "2025-01-03", -13.99, null, "EUR", "(2", "Streaming"],
  ["2025-01-04", "2025-01-04", -76.35, null, "EUR", "TE", "Addebito Hera"],
  ["2025-01-05", "2025-01-05", null, 1500, "EUR", "27", "Stipendio"],
];

const accounts = [
  { value: "acc-1", label: "Conto cointestato" },
  { value: "acc-2", label: "Revolut" },
];

const renderWizard = (initialAccountId?: string) =>
  render(
    <ToastProvider>
      <ImportWizard accounts={accounts} initialAccountId={initialAccountId} />
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  actions.readStatementFile.mockResolvedValue({ ok: true, grid: GRID });
  actions.previewImport.mockResolvedValue({
    ok: true,
    openingDate: "2024-12-31",
    statuses: [{ kind: "duplicate" }, { kind: "possible", match: { bookedOn: "2025-01-02", amountCents: -7635, description: "Bolletta luce" } }, { kind: "new" }],
  });
  actions.importStatement.mockResolvedValue({ ok: true, message: "1 movimenti importati.", done: 1 });
});

async function upload(initialAccountId?: string) {
  const user = userEvent.setup();
  renderWizard(initialAccountId);
  await user.upload(screen.getByLabelText("File da importare"), new File(["x"], "cherry.xlsx"));
  return user;
}

describe("ImportWizard", () => {
  it("recognises the bank, checks duplicates and imports only the chosen rows", async () => {
    const user = await upload();
    expect(await screen.findByText(/Formato Cherry Bank riconosciuto/)).toBeInTheDocument();
    expect(await screen.findByText("Già presente")).toBeInTheDocument();
    expect(screen.getByText(/Simile a “Bolletta luce”/)).toBeInTheDocument();
    expect(actions.previewImport).toHaveBeenCalledWith("acc-1", expect.arrayContaining([expect.objectContaining({ description: "Stipendio", amountCents: 150000 })]));

    // Only the new row is selected; the possible duplicate waits for the user.
    await user.click(screen.getByRole("button", { name: "Importa 1 movimento" }));
    await waitFor(() => expect(actions.importStatement).toHaveBeenCalledTimes(1));
    const [accountId, sent, meta] = actions.importStatement.mock.calls[0];
    expect(accountId).toBe("acc-1");
    expect(sent.map((d: { description: string }) => d.description)).toEqual(["Stipendio"]);
    expect(meta).toEqual({ fileName: "cherry.xlsx", bank: "Cherry Bank" });
  });

  it("includes a possible duplicate once ticked", async () => {
    const user = await upload();
    // Checkboxes stay disabled until the duplicate check answers.
    await screen.findByText("Già presente");
    await user.click(screen.getByRole("checkbox", { name: /Importa Addebito Hera/ }));
    await user.click(screen.getByRole("button", { name: "Importa 2 movimenti" }));
    await waitFor(() => expect(actions.importStatement).toHaveBeenCalled());
    expect(actions.importStatement.mock.calls[0][1]).toHaveLength(2);
  });

  it("uses the preselected account", async () => {
    await upload("acc-2");
    await waitFor(() => expect(actions.previewImport).toHaveBeenCalledWith("acc-2", expect.any(Array)));
  });

  it("shows the reading error and stays on the file step", async () => {
    actions.readStatementFile.mockResolvedValue({ ok: false, message: "Il file è vuoto." });
    await upload();
    expect(await screen.findByText("Il file è vuoto.")).toBeInTheDocument();
    expect(screen.getByLabelText("File da importare")).toBeInTheDocument();
    expect(actions.previewImport).not.toHaveBeenCalled();
  });
});
