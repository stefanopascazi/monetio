import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavigationFeedback } from "./NavigationFeedback";

const pending = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/useNavigationTiming", () => ({ useNavigationTiming: () => pending.value }));
vi.mock("@/hooks/useRefreshOnResume", () => ({ useRefreshOnResume: () => {} }));

describe("NavigationFeedback", () => {
  it("shows the progress bar only while a navigation is pending", () => {
    const { rerender } = render(<NavigationFeedback />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    pending.value = true;
    rerender(<NavigationFeedback />);
    expect(screen.getByRole("progressbar", { name: "Caricamento pagina" })).toBeInTheDocument();
  });
});
