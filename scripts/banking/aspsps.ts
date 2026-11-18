// Lists the banks Enable Banking offers to this app in a country, and checks the household's banks.
// Usage: npm run bank:aspsps -- [--country IT] [--all]
import "../db/load-local-env.ts";
import { parseArgs } from "node:util";
import { matchPriorityBanks, summarizeAspsps, type AspspRow } from "../../lib/banking/enable-banking/aspsps.ts";
import { createEnableBankingClient } from "../../lib/banking/enable-banking/client.ts";
import { readEnableBankingConfig } from "../../lib/banking/enable-banking/config.ts";

const { values } = parseArgs({ options: { country: { type: "string", default: "IT" }, all: { type: "boolean", default: false } } });

const config = readEnableBankingConfig();
if (!config) throw new Error("Imposta ENABLE_BANKING_APP_ID e ENABLE_BANKING_KEY_PATH (o ENABLE_BANKING_PRIVATE_KEY) in .env.local");

const client = createEnableBankingClient(config);
const app = await client.getApplication();
const rows = summarizeAspsps(await client.listAspsps(values.country!));

const describe = (r: AspspRow) =>
  [r.personal && "privati", r.business && "aziende"].filter(Boolean).join("+") + (r.consentDays ? `, consenso ${r.consentDays} gg` : "") + (r.beta ? ", beta" : "");

console.log(`App: ${String(app.name ?? "?")} (${String(app.environment ?? "?")}) · ${rows.length} banche in ${values.country}\n`);
console.log("Banche del nucleo:");
for (const [label, found] of Object.entries(matchPriorityBanks(rows))) {
  console.log(`  ${found.length ? "✓" : "✗"} ${label}${found.length ? `: ${found.map((r) => `${r.name} (${describe(r)})`).join("; ")}` : ""}`);
}
if (values.all) {
  console.log("\nTutte:");
  for (const r of rows) console.log(`  ${r.name} (${describe(r)})`);
}
