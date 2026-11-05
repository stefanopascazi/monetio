import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation link: exchanges the PKCE code for a session, then opens the app.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = request.nextUrl.clone();
  target.search = "";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    target.pathname = error ? "/login" : "/";
  } else {
    target.pathname = "/login";
  }
  return NextResponse.redirect(target);
}
