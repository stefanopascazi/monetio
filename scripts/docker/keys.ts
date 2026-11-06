// Pure helpers to mint the Supabase anon/service_role keys (HS256 JWTs) from a JWT secret.
import { createHmac } from "node:crypto";

const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** Signs a JWT with HS256. */
export function signJwt(payload: Record<string, unknown>, secret: string): string {
  const body = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify(payload))}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

/** Long-lived keys for the self-hosted stack (same claims as the Supabase CLI). */
export function supabaseKeys(secret: string, exp = 1983812996): { anon: string; service: string } {
  if (secret.length < 32) throw new Error("JWT_SECRET deve avere almeno 32 caratteri");
  return {
    anon: signJwt({ iss: "supabase-demo", role: "anon", exp }, secret),
    service: signJwt({ iss: "supabase-demo", role: "service_role", exp }, secret),
  };
}
