import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { useToastAction } from "./useToastAction";

const wrapper = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe("useToastAction", () => {
  it("toasts success and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useToastAction(), { wrapper });
    await act(async () => result.current.run(async () => ({ ok: true, message: "Eliminato" }), onSuccess));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".mio-toast--success")).toHaveTextContent("Eliminato");
  });

  it("toasts failure without calling onSuccess", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useToastAction(), { wrapper });
    await act(async () => result.current.run(async () => ({ ok: false, message: "Non trovato" }), onSuccess));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(document.querySelector(".mio-toast--danger")).toHaveTextContent("Non trovato");
  });
});
