"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, failure } from "./state";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function credentials(fd: FormData) {
  return { email: String(fd.get("email") ?? "").trim().toLowerCase(), password: String(fd.get("password") ?? "") };
}

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { email, password } = credentials(fd);
  if (!EMAIL_RE.test(email) || !password) return failure("Inserisci email e password.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return failure(/confirm/i.test(error.message) ? "Conferma prima la tua email: controlla la posta." : "Email o password non corrette.");
  }
  redirect("/");
}

export async function signUp(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { email, password } = credentials(fd);
  if (!EMAIL_RE.test(email)) return failure("Inserisci un'email valida.", { email: "Email non valida" });
  if (password.length < 8) return failure("La password deve avere almeno 8 caratteri.", { password: "Almeno 8 caratteri" });
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return failure(/registered/i.test(error.message) ? "Esiste già un account con questa email." : "Registrazione non riuscita. Riprova.");
  if (data.session) redirect("/");
  return { ok: true, message: "Ti abbiamo inviato un'email: apri il link per confermare l'account." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
