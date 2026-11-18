// Reads Enable Banking credentials from the environment.
// ENABLE_BANKING_PRIVATE_KEY holds the PEM itself (hosted envs, "\n" escapes allowed);
// ENABLE_BANKING_KEY_PATH points to the .pem file (local development).
import { readFileSync } from "node:fs";

export type EnableBankingCredentials = { appId: string; privateKeyPem: string };

type Env = Record<string, string | undefined>;

export function readEnableBankingConfig(env: Env = process.env, readFile: (path: string) => string = (p) => readFileSync(p, "utf8")): EnableBankingCredentials | null {
  const appId = env.ENABLE_BANKING_APP_ID?.trim();
  const inline = env.ENABLE_BANKING_PRIVATE_KEY?.trim();
  const path = env.ENABLE_BANKING_KEY_PATH?.trim();
  if (!appId || (!inline && !path)) return null;
  const privateKeyPem = inline ? inline.replace(/\\n/g, "\n") : readFile(path!);
  if (!privateKeyPem.includes("PRIVATE KEY")) throw new Error("Enable Banking: la chiave privata non è un PEM valido");
  return { appId, privateKeyPem };
}
