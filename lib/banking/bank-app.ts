// The person's own Enable Banking application as the UI sees it (never the key).
import type { BankEnvironment } from "./credentials.ts";

export type BankApp = {
  environment: BankEnvironment;
  appId: string;
  appName: string | null;
  verifiedAt: string;
};

export type BankAppRow = { environment: string; app_id: string; app_name: string | null; verified_at: string };

export function mapBankApp(row: BankAppRow): BankApp {
  return {
    environment: row.environment === "production" ? "production" : "sandbox",
    appId: row.app_id,
    appName: row.app_name,
    verifiedAt: row.verified_at,
  };
}

export const ENVIRONMENT_LABEL: Record<BankEnvironment, string> = { sandbox: "Prova (Sandbox)", production: "Banche reali" };

/** "1a2b…5555": enough to recognise the app in the Control Panel. */
export function shortAppId(appId: string): string {
  return appId.length > 12 ? `${appId.slice(0, 4)}…${appId.slice(-4)}` : appId;
}

/** Redirect URL to register in the Control Panel for this deployment. */
export function bankCallbackUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/bank/callback`;
}
