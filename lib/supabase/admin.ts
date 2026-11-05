import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Service-role client (bypasses RLS). Only for vetted server actions such as invites. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurata");
  return createClient(supabaseEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
