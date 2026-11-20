// Grants or revokes the sysadmin role for the console (#47). Never exposed in the app.
// Usage: npm run admin:grant -- you@example.com [--revoke]
// Production: node scripts/dev/with-env.ts .env.prod npm run admin:grant -- you@example.com
import "../db/load-local-env.ts";
import { parseArgs } from "node:util";
import { connect } from "../db/connect.ts";
import { parseGrantArgs } from "./grant-args.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { revoke: { type: "boolean", default: false } } });
const { email, revoke } = parseGrantArgs(positionals, values.revoke);

const sql = connect();
try {
  const [user] = await sql<{ id: string }[]>`select id from auth.users where lower(email) = ${email}`;
  if (!user) throw new Error(`Nessun utente con email ${email}: deve prima accedere a MonetIO`);
  if (revoke) {
    const rows = await sql`delete from sysadmins where user_id = ${user.id} returning user_id`;
    console.log(rows.length ? `Ruolo sysadmin revocato a ${email}` : `${email} non era sysadmin`);
  } else {
    await sql`insert into sysadmins (user_id) values (${user.id}) on conflict do nothing`;
    console.log(`${email} è sysadmin`);
  }
} finally {
  await sql.end();
}
