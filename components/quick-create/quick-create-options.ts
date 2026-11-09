// What the top bar "+" can create, in menu order.
export type QuickCreateKind = "movement" | "rule" | "contribution" | "account" | "category";

export interface QuickCreateOption {
  kind: QuickCreateKind;
  label: string;
  description: string;
  /** Needs at least one active account to be useful. */
  needsAccount: boolean;
}

export const QUICK_CREATE_OPTIONS: QuickCreateOption[] = [
  { kind: "movement", label: "Movimento", description: "Uscita, entrata, giroconto, bonifico o CBill", needsAccount: true },
  { kind: "rule", label: "Ricorrenza", description: "Entrate e uscite che si ripetono", needsAccount: true },
  { kind: "contribution", label: "Quota automatica", description: "Versamento mensile verso un conto condiviso", needsAccount: true },
  { kind: "account", label: "Conto", description: "Corrente, risparmio, investimenti o contanti", needsAccount: false },
  { kind: "category", label: "Categoria", description: "Per classificare entrate e uscite", needsAccount: false },
];

/** Options available to the household: without accounts only "Conto" and "Categoria". */
export function quickCreateOptions(hasAccounts: boolean): QuickCreateOption[] {
  return QUICK_CREATE_OPTIONS.filter((o) => hasAccounts || !o.needsAccount);
}

/** Account preselected in the movement form: the open account page if valid, else the first one. */
export function defaultAccountId(accountIds: string[], currentId: string | undefined): string {
  return currentId && accountIds.includes(currentId) ? currentId : (accountIds[0] ?? "");
}
