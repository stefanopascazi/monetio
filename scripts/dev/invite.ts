// Sends a Supabase invite to a member already listed in the household (bootstrap for the first owner).
// Usage: npm run auth:invite -- you@example.com [--name Stefano] [--site http://localhost:3000]
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { connect } from "../db/connect.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { name: { type: "string" }, site: { type: "string", default: "http://localhost:3000" } },
});
const email = positionals[0]?.trim().toLowerCase();
if (!email) throw new Error("Indica l'email da invitare");

const sql = connect();
try {
  const [member] = await sql<{ id: string; user_id: string | null }[]>`select id, user_id from household_members where lower(email) = ${email} limit 1`;
  if (!member) throw new Error(`Nessun membro con email ${email}: aggiungilo prima (import o Impostazioni)`);
  if (member.user_id) throw new Error("Questo membro ha già un account");
  if (values.name) await sql`update household_members set display_name = ${values.name} where id = ${member.id}`;

  // Implicit flow: the link must work in any browser (PKCE would need a verifier stored by this script).
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, flowType: "implicit" },
  });
  const redirectTo = `${values.site}/auth/password`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error && /already been registered/i.test(error.message)) {
    // Account exists (e.g. a previous invite): send a password-setup link instead.
    const reset = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (reset.error) throw reset.error;
    console.log(`Account già esistente: inviato link per impostare la password a ${email}`);
  } else if (error) {
    throw error;
  } else {
    console.log(`Invito inviato a ${email}`);
  }
} finally {
  await sql.end();
}
