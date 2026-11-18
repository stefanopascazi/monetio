// Form for a person's own Enable Banking application: id and private key (PEM text).
import { createPrivateKey } from "node:crypto";
import { Checker, type ParseResult, text } from "./parse";

export interface BankCredentialsInput {
  appId: string;
  privateKeyPem: string;
}

const APP_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_PEM_LENGTH = 8_000;

/** True for an RSA private key in PEM form (PKCS#1 or PKCS#8), as Enable Banking requires. */
export function isRsaPrivateKeyPem(pem: string): boolean {
  if (!pem.includes("PRIVATE KEY") || pem.length > MAX_PEM_LENGTH) return false;
  try {
    return createPrivateKey(pem).asymmetricKeyType === "rsa";
  } catch {
    return false;
  }
}

export function parseBankCredentialsForm(fd: FormData): ParseResult<BankCredentialsInput> {
  const appId = text(fd, "appId");
  // Normalise Windows line endings from pasted or uploaded files.
  const privateKeyPem = text(fd, "privateKey").replace(/\r\n/g, "\n");
  return new Checker()
    .check(APP_ID_RE.test(appId), "appId", "Incolla l'Application ID mostrato nel Control Panel")
    .check(isRsaPrivateKeyPem(privateKeyPem), "privateKey", "Serve la chiave privata RSA scaricata alla registrazione (file .pem)")
    .result({ appId, privateKeyPem });
}
