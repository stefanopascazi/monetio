import { createClient } from "@supabase/supabase-js";
import { connection, NextResponse } from "next/server";
import { checkHealth } from "@/lib/health/check";
import { supabaseEnv } from "@/lib/supabase/env";

// Public uptime probe: app is serving and the database answers. Anon key, so RLS returns no rows.
export async function GET() {
  await connection();
  const { url, key } = supabaseEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await checkHealth(async () => {
    const { error } = await supabase.from("households").select("id", { head: true }).limit(1);
    if (error) throw error;
  });
  return NextResponse.json({ ok: result.ok, db: result.db }, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
