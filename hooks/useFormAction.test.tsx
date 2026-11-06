import { act, renderHook } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import { ToastProvider } from "@monetio/ui";
import { describe, expect, it, vi } from "vitest";
import { useFormAction } from "./useFormAction";

describe("useFormAction", () => {
  it("dispatches form data and calls onSuccess once per success", async () => {
    const action = vi.fn(async (prev: { done?: number }, fd: FormData) => ({ ok: true, done: (prev.done ?? 0) + 1, message: String(fd.get("x")) }));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useFormAction(action, onSuccess));

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "x";
    input.value = "ciao";
    form.appendChild(input);

    await act(async () => {
      result.current.onSubmit({ currentTarget: form } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.state.message).toBe("ciao");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("exposes field errors", async () => {
    const action = vi.fn(async () => ({ ok: false, errors: { name: "Obbligatorio" } }));
    const { result } = renderHook(() => useFormAction(action));
    await act(async () => {
      result.current.onSubmit({ currentTarget: document.createElement("form") } as unknown as FormEvent<HTMLFormElement>);
    });
    expect(result.current.error("name")).toBe("Obbligatorio");
  });

  it("toasts every result and runs onSuccess again after a failure", async () => {
    // Real actions drop `done` on failure, so the next success restarts from 1.
    const results = [{ ok: true, done: 1, message: "Salvato" }, { ok: false, message: "Errore" }, { ok: true, done: 1, message: "Salvato" }];
    const action = vi.fn(async () => results.shift()!);
    const onSuccess = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>;
    const { result } = renderHook(() => useFormAction(action, onSuccess), { wrapper });
    const submit = () => result.current.onSubmit({ currentTarget: document.createElement("form") } as unknown as FormEvent<HTMLFormElement>);

    for (let i = 0; i < 3; i++) await act(async () => submit());

    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll(".mio-toast--success")).toHaveLength(2);
    expect(document.querySelectorAll(".mio-toast--danger")).toHaveLength(1);
  });
});
