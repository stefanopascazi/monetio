import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProjectionAccountProvider } from "./account/ProjectionAccountContext";
import { ProjectionAccountPicker } from "./account/ProjectionAccountPicker";
import { ProjectionTable } from "./ProjectionTable";

const accounts = [
  { id: "a", name: "Conto A" },
  { id: "b", name: "Conto B" },
];
const projection = [{ month: "2026-12", byAccount: { a: 100, b: 200 }, totalCents: 300 }];

describe("ProjectionTable", () => {
  it("follows the page-wide account selection", async () => {
    render(
      <ProjectionAccountProvider>
        <ProjectionAccountPicker accounts={accounts} />
        <ProjectionTable projection={projection as never} accounts={accounts} />
      </ProjectionAccountProvider>,
    );
    expect(screen.getByRole("columnheader", { name: "Totale" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Conto"), "b");
    expect(screen.queryByRole("columnheader", { name: "Conto A" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Conto B" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Totale" })).toBeNull();
  });
});
