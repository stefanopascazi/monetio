export interface GrantArgs {
  email: string;
  revoke: boolean;
}

/** Parses `admin:grant` arguments: one email, optional --revoke. */
export function parseGrantArgs(positionals: string[], revoke: boolean): GrantArgs {
  const email = positionals[0]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Indica l'email dell'utente: npm run admin:grant -- you@example.com [--revoke]");
  return { email, revoke };
}
