// Application JWT for the Enable Banking API: RS256, signed with the app's private key,
// `kid` = application id. Server-side only: the private key must never reach the browser.
import { createSign } from "node:crypto";

export type AppJwtInput = {
  appId: string;
  privateKeyPem: string;
  /** Seconds since epoch; injectable for tests. */
  nowSeconds?: number;
  /** Token lifetime in seconds; Enable Banking accepts at most 24 hours. */
  ttlSeconds?: number;
};

export const MAX_JWT_TTL_SECONDS = 86_400;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function createAppJwt({ appId, privateKeyPem, nowSeconds, ttlSeconds = 3_600 }: AppJwtInput): string {
  if (!appId.trim()) throw new Error("Enable Banking: application id mancante");
  if (ttlSeconds <= 0 || ttlSeconds > MAX_JWT_TTL_SECONDS) throw new Error("Enable Banking: durata del token non valida");
  const iat = nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "RS256", kid: appId };
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + ttlSeconds };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKeyPem);
  return `${unsigned}.${base64url(signature)}`;
}
