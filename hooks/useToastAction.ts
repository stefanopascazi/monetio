"use client";

import { useTransition } from "react";
import { useToast } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";

/** Runs a one-shot Server Action (delete, archive, confirm) and reports its outcome as a toast. */
export function useToastAction() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const run = (fn: () => Promise<ActionState | void>, onSuccess?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res?.message) toast.show(res.message, { tone: res.ok ? "success" : "danger" });
      if (!res || res.ok) onSuccess?.();
    });
  return { pending, run };
}
