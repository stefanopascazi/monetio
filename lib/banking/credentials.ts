// Verifies a person's Enable Banking application against the API and seals its key for storage.
// The client factory is injectable so tests never call the network.
import { createEnableBankingClient, EnableBankingError, type EnableBankingConfig } from "./enable-banking/client.ts";
import { sealSecret } from "./secrets.ts";

export type BankEnvironment = "sandbox" | "production";

export type BankCredentialsRow = {
  user_id: string;
  environment: BankEnvironment;
  app_id: string;
  app_name: string | null;
  private_key_sealed: string;
  verified_at: string;
};

export type PrepareResult = { ok: true; row: BankCredentialsRow } | { ok: false; message: string };

type Deps = {
  masterKey: Buffer;
  createClient?: (config: EnableBankingConfig) => Pick<ReturnType<typeof createEnableBankingClient>, "getApplication">;
  now?: () => Date;
};

export function toEnvironment(raw: unknown): BankEnvironment | null {
  const value = String(raw ?? "").toLowerCase();
  return value === "sandbox" || value === "production" ? value : null;
}

/** Calls GET /application with the given id and key: success proves they belong together. */
export async function prepareBankCredentials(
  input: { userId: string; appId: string; privateKeyPem: string },
  { masterKey, createClient = createEnableBankingClient, now = () => new Date() }: Deps,
): Promise<PrepareResult> {
  let app: Record<string, unknown>;
  try {
    app = await createClient({ appId: input.appId, privateKeyPem: input.privateKeyPem }).getApplication();
  } catch (error) {
    if (error instanceof EnableBankingError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      return { ok: false, message: "Enable Banking non riconosce questa coppia di Application ID e chiave. Controlla di aver copiato quelli della stessa app." };
    }
    return { ok: false, message: "Enable Banking non risponde. Riprova tra qualche minuto." };
  }
  const environment = toEnvironment(app.environment);
  if (!environment) return { ok: false, message: "Ambiente dell'app non riconosciuto." };
  const name = typeof app.name === "string" ? app.name.slice(0, 120) : null;
  return {
    ok: true,
    row: {
      user_id: input.userId,
      environment,
      app_id: input.appId,
      app_name: name,
      private_key_sealed: sealSecret(input.privateKeyPem, masterKey, input.userId),
      verified_at: now().toISOString(),
    },
  };
}
