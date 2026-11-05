"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data/context";
import { isValidEmail, normalizeEmail } from "@/lib/forms/invite";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, failure } from "./state";

function credentials(fd: FormData) {
  return { email: normalizeEmail(String(fd.get("email") ?? "")), password: String(fd.get("password") ?? "") };
}

async function origin() {
  return (await headers()).get("origin") ?? "";
}

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { email, password } = credentials(fd);
  if (!isValidEmail(email) || !password) return failure("Inserisci email e password.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return failure(/confirm/i.test(error.message) ? "Conferma prima la tua email: controlla la posta." : "Email o password non corrette.");
  }
  redirect("/");
}

/*
 * Public sign-up, disabled for now (members are invited from Impostazioni).
 * Re-enable by uncommenting and adding the "Registrati" tab in components/auth/AuthForms.tsx.
 *
export async function signUp(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { email, password } = credentials(fd);
  if (!isValidEmail(email)) return failure("Inserisci un'email valida.", { email: "Email non valida" });
  if (password.length < 8) return failure("La password deve avere almeno 8 caratteri.", { password: "Almeno 8 caratteri" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${await origin()}/auth/callback` } });
  if (error) return failure(/registered/i.test(error.message) ? "Esiste già un account con questa email." : "Registrazione non riuscita. Riprova.");
  if (data.session) redirect("/");
  return { ok: true, message: "Ti abbiamo inviato un'email: apri il link per confermare l'account." };
}
*/

export async function requestPasswordReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  if (!isValidEmail(email)) return failure("Inserisci un'email valida.");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/password` });
  // Same answer whether or not the account exists.
  return { ok: true, message: "Se l'email è registrata riceverai un link per scegliere una nuova password." };
}

export async function setPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await getUser();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return failure("La password deve avere almeno 8 caratteri.", { password: "Almeno 8 caratteri" });
  if (password !== confirm) return failure("Le due password non coincidono.", { confirm: "Non coincide" });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return failure("Non è stato possibile salvare la password. Riprova.");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
