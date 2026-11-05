import { connection, type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { syncHousehold } from "@/lib/data/sync";
import { todayISO } from "@/lib/domain/dates";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily Vercel Cron (see vercel.json): books automatic recurring items for every household,
// so balances stay current even when nobody opens the app.
export async function GET(request: NextRequest) {
  await connection();
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const today = todayISO();
  const { data: households, error } = await admin.from("households").select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { householdId: string; booked?: number; error?: string }[] = [];
  for (const h of households ?? []) {
    try {
      results.push({ householdId: h.id, booked: await syncHousehold(admin, h.id, today) });
    } catch (e) {
      results.push({ householdId: h.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const failed = results.some((r) => r.error);
  return NextResponse.json({ today, results }, { status: failed ? 500 : 200 });
}
