"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions/state";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Wires a Server Action to a FormPanel-style `onSubmit` (which prevents the native submit).
 * `onSuccess` runs once per successful submission, e.g. to reset local state.
 */
export function useFormAction(action: Action, onSuccess?: () => void) {
  const [state, dispatch, pending] = useActionState(action, {});
  const handled = useRef(0);

  useEffect(() => {
    if (state.ok && state.done && state.done !== handled.current) {
      handled.current = state.done;
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };

  return { state, pending, onSubmit, error: (field: string) => state.errors?.[field] };
}
