import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBarAction } from "./TopBarAction";
import { TOPBAR_SLOT_ID } from "./topbar-ids";

describe("TopBarAction", () => {
  it("renders its children inside the top bar slot", () => {
    render(
      <>
        <div id={TOPBAR_SLOT_ID} data-testid="slot" />
        <main data-testid="page">
          <TopBarAction>
            <button>Gear</button>
          </TopBarAction>
        </main>
      </>,
    );
    const gear = screen.getByRole("button", { name: "Gear" });
    expect(screen.getByTestId("slot")).toContainElement(gear);
    expect(screen.getByTestId("page")).not.toContainElement(gear);
  });

  it("renders nothing without a slot", () => {
    render(
      <TopBarAction>
        <button>Gear</button>
      </TopBarAction>,
    );
    expect(screen.queryByRole("button", { name: "Gear" })).toBeNull();
  });
});
