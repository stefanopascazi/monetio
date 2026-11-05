// Parses the URL fragment Supabase appends to email links (implicit flow).

export type HashSession =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "error"; message: string }
  | { kind: "none" };

export function parseAuthHash(hash: string): HashSession {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = p.get("access_token");
  const refreshToken = p.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  const code = p.get("error_code") ?? p.get("error");
  if (code) return { kind: "error", message: code === "otp_expired" ? "Il link è scaduto o è già stato usato." : "Il link non è valido." };
  return { kind: "none" };
}
