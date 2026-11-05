import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
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
});
