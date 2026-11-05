/** Supabase URL and public (anon/publishable) key, accepting the names the Vercel integration sets. */
export function supabaseEnv(env: Record<string, string | undefined> = process.env): { url: string; key: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase non configurato: servono SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, key };
}
