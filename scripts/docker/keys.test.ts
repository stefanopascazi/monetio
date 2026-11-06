import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signJwt, supabaseKeys } from "./keys";

const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

describe("signJwt", () => {
  it("produces a verifiable HS256 token", () => {
    const [h, p, sig] = signJwt({ role: "anon" }, SECRET).split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toEqual({ role: "anon" });
    expect(createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")).toBe(sig);
  });
});

describe("supabaseKeys", () => {
  it("matches the Supabase CLI demo anon key", () => {
    expect(supabaseKeys(SECRET).anon).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    );
  });

  it("mints a service_role key", () => {
    const payload = JSON.parse(Buffer.from(supabaseKeys(SECRET).service.split(".")[1], "base64url").toString());
    expect(payload.role).toBe("service_role");
  });

  it("rejects short secrets", () => {
    expect(() => supabaseKeys("short")).toThrow(/32 caratteri/);
  });
});
