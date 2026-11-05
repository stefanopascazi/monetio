import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/forms/invite";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email", "email_change"];

// Links from Supabase emails (invite, password reset) using {{ .TokenHash }}: verifies and opens a session.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const target = request.nextUrl.clone();
  target.search = "";

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Invited users and resets must choose a password first.
      target.pathname = safeNext(params.get("next"), type === "invite" || type === "recovery" ? "/auth/password" : "/");
      return NextResponse.redirect(target);
    }
  }
  target.pathname = "/login";
  target.searchParams.set("errore", "link");
  return NextResponse.redirect(target);
}
