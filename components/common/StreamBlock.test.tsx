import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreamBlock } from "./StreamBlock";

describe("StreamBlock", () => {
  it("renders ready content", () => {
    render(
      <StreamBlock height={100}>
        <p>Saldo</p>
      </StreamBlock>,
    );
    expect(screen.getByText("Saldo")).toBeInTheDocument();
  });

  it("shows a busy placeholder while content suspends", () => {
    const Pending = () => {
      throw new Promise(() => {});
    };
    render(
      <StreamBlock height={100}>
        <Pending />
      </StreamBlock>,
    );
    expect(screen.getByLabelText("Caricamento")).toHaveAttribute("aria-busy", "true");
  });
});
