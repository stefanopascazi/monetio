import { Alert } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";

/** Inline error of a form submission; success is reported by a toast (the form closes). */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message || state.ok) return null;
  return (
    <Alert tone="danger" className="mio-span-full">
      {state.message}
    </Alert>
  );
}
