import * as Sentry from "@sentry/nextjs";
import { connection, type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { sendTestEvent } from "@/lib/observability/test-event";

// Manual check that server errors reach Sentry: curl -H "Authorization: Bearer $CRON_SECRET" .../api/debug/sentry
export async function GET(request: NextRequest) {
  await connection();
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendTestEvent(Sentry, "MonetIO app");
  return NextResponse.json(result, { status: result.delivered ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
