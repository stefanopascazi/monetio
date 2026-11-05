import { Alert } from "@monetio/ui";
import type { ActionState } from "@/app/actions/state";

/** Inline outcome of a form submission. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.ok ? "success" : "danger"} className="mio-span-full">
      {state.message}
    </Alert>
  );
}
