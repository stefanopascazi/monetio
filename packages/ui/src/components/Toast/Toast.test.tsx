import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../i18n";
import { TOAST_LIMIT, ToastProvider, useToast } from "./Toast";

function Trigger({ message, tone }: { message: string; tone?: "success" | "danger" }) {
  const toast = useToast();
  return <button onClick={() => toast.show(message, { tone })}>go</button>;
}

describe("Toast", () => {
  afterEach(() => vi.useRealTimers());

  it("shows a status toast and auto-dismisses it", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="Salvato" tone="success" />
      </ToastProvider>,
    );
    act(() => screen.getByText("go").click());
    expect(screen.getByRole("status")).toHaveTextContent("Salvato");
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("uses alert role for errors and closes on click", async () => {
    render(
      <ToastProvider>
        <Trigger message="Errore" tone="danger" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    expect(screen.getByRole("alert")).toHaveTextContent("Errore");
    await userEvent.click(screen.getByRole("button", { name: messages.dismiss }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps at most TOAST_LIMIT toasts", async () => {
    render(
      <ToastProvider>
        <Trigger message="Ciao" />
      </ToastProvider>,
    );
    for (let i = 0; i < TOAST_LIMIT + 2; i++) await userEvent.click(screen.getByText("go"));
    expect(screen.getAllByRole("status")).toHaveLength(TOAST_LIMIT);
  });

  it("is a no-op outside the provider", async () => {
    render(<Trigger message="Ciao" />);
    await userEvent.click(screen.getByText("go"));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
