// Imports the "Piano Risparmi" history and seed rules into Supabase. Safe to re-run (idempotent by import_ref).
// Usage: npm run db:import -- spese.xlsx --ste-email you@example.com [--asha-email her@example.com] [--household "Famiglia"]
import "../db/load-local-env.ts";
import { parseArgs } from "node:util";
import { connect } from "../db/connect.ts";
import { buildImport } from "./build.ts";
import { ACCOUNTS, type AccountKey, CATEGORIES, EXTRA_ACCOUNTS } from "./mapping.ts";
import { readHistoryRows } from "./read-xlsx.ts";
import { SEED_CONTRIBUTIONS, SEED_RULES } from "./seed-rules.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "ste-email": { type: "string" },
    "asha-email": { type: "string" },
    household: { type: "string", default: "Famiglia" },
  },
});

const file = positionals[0] ?? "spese.xlsx";
const rows = await readHistoryRows(file);
const result = buildImport(rows);
for (const w of result.warnings) console.warn(`Avviso: ${w}`);

const sql = connect();
try {
  await sql.begin(async (tx) => {
    // Reuse the household of a previous import, if any.
    const [existing] = await tx<{ household_id: string }[]>`
      select household_id from transactions where import_ref like 'xlsx:%' limit 1`;
    const householdId =
      existing?.household_id ?? (await tx<{ id: string }[]>`insert into households (name) values (${values.household!}) returning id`)[0].id;

    const memberIds: Record<"ste" | "asha", string> = { ste: "", asha: "" };
    for (const [key, name, email] of [
      ["ste", "Stefano", values["ste-email"]],
      ["asha", "Asha", values["asha-email"]],
    ] as const) {
      // Match by email first, then by name (also the former short name "Ste").
      const [m] = await tx<{ id: string }[]>`
        select id from household_members where household_id = ${householdId}
          and (lower(email) = ${email?.toLowerCase() ?? ""} or display_name in (${name}, ${name === "Stefano" ? "Ste" : name}))
        order by (lower(email) = ${email?.toLowerCase() ?? ""}) desc limit 1`;
      memberIds[key] = m
        ? m.id
        : (
            await tx<{ id: string }[]>`
              insert into household_members (household_id, display_name, email, role)
              values (${householdId}, ${name}, ${email?.toLowerCase() ?? null}, ${key === "ste" ? "admin" : "member"}) returning id`
          )[0].id;
      if (email) await tx`update household_members set email = ${email.toLowerCase()} where id = ${memberIds[key]} and user_id is null`;
    }

    for (const c of CATEGORIES) {
      await tx`insert into categories (household_id, name, kind, icon, color_index)
               values (${householdId}, ${c.name}, ${c.kind}, ${c.icon}, ${c.colorIndex})
               on conflict (household_id, name) do nothing`;
    }
    const categoryIds = Object.fromEntries(
      (await tx<{ id: string; name: string }[]>`select id, name from categories where household_id = ${householdId}`).map((c) => [c.name, c.id]),
    );

    const accountIds = {} as Record<AccountKey, string>;
    for (const spec of ACCOUNTS) {
      const imported = result.accounts.find((a) => a.key === spec.key);
      const owner = spec.owner ? memberIds[spec.owner] : null;
      const [found] = await tx<{ id: string }[]>`select id from accounts where household_id = ${householdId} and name = ${spec.name}`;
      const id =
        found?.id ??
        (
          await tx<{ id: string }[]>`
            insert into accounts (household_id, name, type, visibility, owner_member_id, sort_order)
            values (${householdId}, ${spec.name}, ${spec.type}, ${spec.visibility}, ${owner}, ${spec.sortOrder}) returning id`
        )[0].id;
      if (imported) {
        await tx`update accounts set opening_balance_cents = ${imported.openingCents}, opening_date = ${imported.openingDate} where id = ${id}`;
      }
      accountIds[spec.key] = id;
    }
    for (const spec of EXTRA_ACCOUNTS) {
      const [found] = await tx<{ id: string }[]>`select id from accounts where household_id = ${householdId} and name = ${spec.name}`;
      accountIds[spec.key] =
        found?.id ??
        (
          await tx<{ id: string }[]>`
            insert into accounts (household_id, name, type, visibility, owner_member_id, sort_order, opening_date)
            values (${householdId}, ${spec.name}, ${spec.type}, ${spec.visibility}, ${spec.owner ? memberIds[spec.owner] : null}, ${spec.sortOrder}, ${spec.openingDate}) returning id`
        )[0].id;
    }

    const txRows = result.transactions.map((t) => ({
      household_id: householdId,
      account_id: accountIds[t.account],
      counterpart_account_id: t.counterpart ? accountIds[t.counterpart] : null,
      category_id: categoryIds[t.category] ?? null,
      kind: t.kind,
      status: "booked",
      source: "import",
      amount_cents: t.amountCents,
      booked_on: t.date,
      description: t.description,
      notes: t.notes,
      import_ref: t.ref,
    }));
    let inserted = 0;
    for (let i = 0; i < txRows.length; i += 500) {
      const res = await tx`insert into transactions ${tx(txRows.slice(i, i + 500))} on conflict (import_ref) do nothing returning id`;
      inserted += res.length;
    }
    console.log(`Movimenti: ${inserted} inseriti, ${txRows.length - inserted} già presenti`);

    const [{ count: ruleCount }] = await tx<{ count: number }[]>`select count(*)::int as count from recurring_rules where household_id = ${householdId}`;
    if (ruleCount === 0) {
      for (const r of SEED_RULES) {
        await tx`insert into recurring_rules
          (household_id, account_id, counterpart_account_id, category_id, kind, description, amount_cents, frequency, schedule, day_of_month, start_date, end_date)
          values (${householdId}, ${accountIds[r.account]}, ${r.counterpart ? accountIds[r.counterpart] : null}, ${categoryIds[r.category]},
                  ${r.kind}, ${r.description}, ${r.amountCents}, ${r.frequency}, ${r.schedule}, ${r.dayOfMonth}, ${r.startDate}, ${r.endDate ?? null})`;
      }
      for (const c of SEED_CONTRIBUTIONS) {
        await tx`insert into contribution_rules
          (household_id, from_account_id, to_account_id, description, fixed_cents, share_percent, category_ids, day_of_month,
           estimated_spending_cents, start_date, spending_account_id, spending_month_offset, rounding_cents)
          values (${householdId}, ${accountIds[c.from]}, ${accountIds[c.to]}, ${c.description}, ${c.fixedCents}, ${c.sharePercent},
                  ${c.categories.map((n) => categoryIds[n])}, ${c.dayOfMonth}, ${c.estimatedSpendingCents}, ${c.startDate},
                  ${c.spendingAccount ? accountIds[c.spendingAccount] : null}, ${c.spendingMonthOffset ?? 0}, ${c.roundingCents ?? 1})`;
      }
      console.log(`Ricorrenze: ${SEED_RULES.length}, quote automatiche: ${SEED_CONTRIBUTIONS.length}`);
    } else {
      console.log("Ricorrenze già presenti: non modificate");
    }

    // Verify that balances match the sheet.
    for (const a of result.accounts) {
      const [{ balance }] = await tx<{ balance: number }[]>`
        select (a.opening_balance_cents + coalesce(sum(t.amount_cents), 0))::bigint as balance
        from accounts a left join transactions t on t.account_id = a.id and t.status = 'booked' and t.booked_on <= '2026-10-31'
        where a.id = ${accountIds[a.key]} group by a.id`;
      const ok = Number(balance) === a.finalCents;
      console.log(`${ok ? "OK" : "DIFFERENZA"} ${a.key}: DB ${Number(balance) / 100} / foglio ${a.finalCents / 100}`);
      if (!ok) throw new Error("Saldi non allineati, import annullato");
    }
    const [{ invite_code }] = await tx<{ invite_code: string }[]>`select invite_code from households where id = ${householdId}`;
    console.log(`Nucleo ${householdId} - codice invito ${invite_code}`);
  });
} finally {
  await sql.end();
}
