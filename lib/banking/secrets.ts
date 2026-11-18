// Envelope for bank secrets stored in the database (Enable Banking private keys, later consent ids).
// AES-256-GCM with a master key that lives only in the environment (BANK_KEYS_SECRET, 32 bytes base64):
// a database dump or backup alone cannot reveal the secrets. The context (e.g. the owner's user id)
// is bound as additional authenticated data, so a sealed value copied to another row fails to open.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;

export function parseMasterKey(raw: string | undefined): Buffer {
  const key = Buffer.from(raw?.trim() ?? "", "base64");
  if (key.length !== 32) throw new Error("BANK_KEYS_SECRET deve essere di 32 byte in base64 (openssl rand -base64 32)");
  return key;
}

/** Reads the master key from BANK_KEYS_SECRET. */
export function masterKeyFromEnv(env: Record<string, string | undefined> = process.env): Buffer {
  return parseMasterKey(env.BANK_KEYS_SECRET);
}

/** "v1.<iv>.<tag>.<ciphertext>", base64url parts. */
export function sealSecret(plain: string, masterKey: Buffer, context: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv).setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Throws on a wrong key, wrong context or tampered value. */
export function openSecret(sealed: string, masterKey: Buffer, context: string): string {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Segreto cifrato in formato non valido");
  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(iv, "base64url"))
    .setAAD(Buffer.from(context, "utf8"))
    .setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
