import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordNav, resetNavLogCache } from "@/lib/perf/nav-log";
import { PerfDiagnosticsCard } from "./PerfDiagnosticsCard";

beforeEach(() => {
  localStorage.clear();
  resetNavLogCache();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

describe("PerfDiagnosticsCard", () => {
  it("shows runtime facts and the navigation log, and clears it", async () => {
    recordNav({ at: 0, path: "/conti", ms: 120, standalone: true, controlled: true });
    recordNav({ at: 1, path: "/movimenti", ms: 900, standalone: false, controlled: true });
    render(<PerfDiagnosticsCard />);
    expect(await screen.findByText("App installata")).toBeInTheDocument();
    expect(screen.getByText("2 · mediana 510 ms · max 900 ms")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Ultime navigazioni" })).toHaveTextContent("/movimenti (browser)");
    fireEvent.click(screen.getByRole("button", { name: "Azzera" }));
    expect(screen.getByText("nessuna")).toBeInTheDocument();
  });
});
