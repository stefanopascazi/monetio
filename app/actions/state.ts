import type { FieldErrors } from "@/lib/forms/parse";

/** Result returned by every form Server Action. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  /** Increments on each success so forms can reset. */
  done?: number;
}

export const initialActionState: ActionState = {};

export function failure(message: string, errors?: FieldErrors): ActionState {
  return { ok: false, message, errors };
}

export function success(message: string, prev?: ActionState): ActionState {
  return { ok: true, message, done: (prev?.done ?? 0) + 1 };
}

/** Translates common database errors into Italian copy. */
export function dbErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "Operazione non riuscita. Riprova.";
  if (error.code === "23505") return "Questo elemento esiste già.";
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) return "Non hai i permessi per questa operazione.";
  if (error.code === "23514") return "Alcuni valori non sono validi.";
  return "Operazione non riuscita. Riprova.";
}
