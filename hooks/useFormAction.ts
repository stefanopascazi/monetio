"use client";

import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { useToast } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Wires a Server Action to a FormPanel-style `onSubmit` (which prevents the native submit).
 * Each result raises a toast; `onSuccess` runs once per successful submission (reset, close panel).
 */
export function useFormAction(action: Action, onSuccess?: () => void) {
  const [state, dispatch, pending] = useActionState(action, {});
  const toast = useToast();
  // Tracks the state object itself: `done` restarts after a failure, so it can't identify new results.
  const handled = useRef<ActionState>(state);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.message) toast.show(state.message, { tone: state.ok ? "success" : "danger" });
    if (state.ok) onSuccess?.();
  }, [state, onSuccess, toast]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };

  return { state, pending, onSubmit, error: (field: string) => state.errors?.[field] };
}
