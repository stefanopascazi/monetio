import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InviteCode } from "./InviteCode";

describe("InviteCode", () => {
  it("shows the code with how to use it", () => {
    render(<InviteCode code="72C88930" />);
    expect(screen.getByText("72C88930")).toBeInTheDocument();
    expect(screen.getByText(/Aggiungi un nucleo/)).toBeInTheDocument();
  });
});
