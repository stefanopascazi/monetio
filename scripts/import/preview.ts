// Prints what the import would create, without touching the database.
// Usage: node scripts/import/preview.ts spese.xlsx
import { buildImport } from "./build.ts";
import { readHistoryRows } from "./read-xlsx.ts";

const rows = await readHistoryRows(process.argv[2] ?? "spese.xlsx");
const res = buildImport(rows);
console.log(`Righe storiche: ${rows.length} (${rows[0]?.year}-${rows[0]?.month} → ${rows.at(-1)?.year}-${rows.at(-1)?.month})`);
for (const a of res.accounts) {
  const txns = res.transactions.filter((t) => t.account === a.key);
  const adj = txns.filter((t) => t.kind === "adjustment");
  console.log(`${a.key}: apertura ${a.openingCents / 100} al ${a.openingDate}, saldo finale ${a.finalCents / 100}, movimenti ${txns.length}, rettifiche ${adj.length} (tot ${adj.reduce((s, t) => s + t.amountCents, 0) / 100})`);
}
console.log("Avvisi:", res.warnings);
