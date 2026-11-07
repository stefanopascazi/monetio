import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { sessionUser } from "@/lib/supabase/claims";
import { isPublicPath } from "@/lib/supabase/routes";

// Refreshes the Supabase session cookie on every request and sends guests to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Verifies the JWT locally with the project's signing keys (no Auth round trip) and refreshes it when expired.
  const { data } = await supabase.auth.getClaims();
  const user = sessionUser(data?.claims);

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  // Skip static assets, PWA files, images and Vercel platform routes (analytics).
  matcher: ["/((?!_vercel|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
