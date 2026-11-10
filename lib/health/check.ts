export interface HealthResult {
  ok: boolean;
  status: 200 | 503;
  db: "ok" | "error";
}

/** Runs the database probe with a deadline; any failure or timeout means unhealthy. */
export async function checkHealth(probe: () => Promise<void>, timeoutMs = 5_000): Promise<HealthResult> {
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("health probe timed out")), timeoutMs)),
    ]);
    return { ok: true, status: 200, db: "ok" };
  } catch {
    return { ok: false, status: 503, db: "error" };
  }
}
