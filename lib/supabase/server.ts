import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

/** Request-scoped Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  // Request time only: the auth client reads the clock (token expiry), which must not run while
  // prerendering. Blocks run in parallel, so every client needs this, not just the first read.
  await connection();
  const store = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
