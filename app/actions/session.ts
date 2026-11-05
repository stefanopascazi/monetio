"use server";

import { createClient } from "@/lib/supabase/server";

/** Stores tokens from an email link (URL fragment) as the cookie session. */
export async function adoptSession(accessToken: string, refreshToken: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return !error;
}

/** Exchanges a PKCE `code` from an email link for a cookie session. */
export async function exchangeCode(code: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

export async function hasSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}
