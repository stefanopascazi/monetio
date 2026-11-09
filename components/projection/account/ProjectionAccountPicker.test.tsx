import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProjectionAccountProvider, useProjectionAccount } from "./ProjectionAccountContext";
import { ProjectionAccountPicker } from "./ProjectionAccountPicker";

const accounts = [
  { id: "a", name: "Conto A" },
  { id: "b", name: "Conto B" },
];

function Probe() {
  return <output>{useProjectionAccount().selected}</output>;
}

describe("ProjectionAccountPicker", () => {
  it("shares the selection with other consumers", async () => {
    render(
      <ProjectionAccountProvider>
        <ProjectionAccountPicker accounts={accounts} />
        <Probe />
      </ProjectionAccountProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("all");
    await userEvent.selectOptions(screen.getByLabelText("Conto"), "b");
    expect(screen.getByRole("status")).toHaveTextContent("b");
  });

  it("hides itself with a single account", () => {
    const { container } = render(<ProjectionAccountPicker accounts={[accounts[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
