import { describe, expect, it, vi } from "vitest";
import { buildAgenda, buildProjectionInput } from "../../../../lib/data/projection-input.ts";
import { rule } from "../../../../lib/domain/fixtures.ts";
import type { EventSnapshot } from "../../../../lib/notifications/events.ts";
import { DEFAULT_PREFS } from "../../../../lib/notifications/prefs.ts";
import type { Recipient } from "../notify/snapshot.ts";
import { createNotifyEventsJob, type NotifyDeps, toInserts } from "./notify-events.ts";

const recipient = (userId: string, householdId = "h1"): Recipient => ({ userId, householdId, householdName: "Casa", multiHousehold: false });

function snapshot(userId: string, prefs = DEFAULT_PREFS): EventSnapshot {
  const today = "2026-11-12";
  const rules = [rule({ id: "luce", description: "Luce", amountCents: -5000, schedule: "due", dayOfMonth: 13, startDate: "2026-11-01" })];
  const agenda = buildAgenda({ today, rules, contributions: [], occurrences: [], flows: [], overrides: [] });
  const accounts = [
    {
      id: "a1",
      name: "Comune",
      institution: null,
      type: "checking" as const,
      visibility: "shared" as const,
      ownerMemberId: null,
      openingBalanceCents: 0,
      openingDate: "2026-01-01",
      sortOrder: 0,
      archived: false,
      ibanMasked: null,
      bic: null,
      cardLast4: [],
      balanceCents: 100_000,
    },
  ];
  return {
    userId,
    householdId: "h1",
    householdLabel: null,
    prefs,
    agenda,
    projection: buildProjectionInput(agenda, { accounts, planned: [], monthFlows: [], estimateMovements: [] }, 1),
    lastBooked: { a1: today },
  };
}

const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now: new Date("2026-11-12T07:00:00Z") });

function deps(over: Partial<NotifyDeps> = {}): NotifyDeps {
  return {
    listRecipients: vi.fn(async () => [recipient("u1"), recipient("u2")]),
    loadSnapshot: vi.fn(async (r: Recipient) => snapshot(r.userId)),
    insert: vi.fn(async (rows) => rows.length),
    ...over,
  };
}

describe("toInserts", () => {
  it("sends at once outside quiet hours", () => {
    const s = snapshot("u1");
    const [row] = toInserts(s, [{ kind: "due_soon", dedupKey: "k", title: "t", body: "b", url: "/" }], new Date("2026-11-12T07:00:00Z"));
    expect(row).toMatchObject({ userId: "u1", householdId: "h1", pushMuted: false });
    expect(row.pushAfter.toISOString()).toBe("2026-11-12T07:00:00.000Z");
  });

  it("holds push during quiet hours and flags muted kinds", () => {
    const s = snapshot("u1", { ...DEFAULT_PREFS, quietHours: { start: 7, end: 9 }, pushMutedKinds: ["due_soon"] });
    const [row] = toInserts(s, [{ kind: "due_soon", dedupKey: "k", title: "t", body: "b", url: "/" }], new Date("2026-11-12T07:00:00Z"));
    expect(row.pushMuted).toBe(true);
    expect(row.pushAfter.toISOString()).toBe("2026-11-12T08:00:00.000Z");
  });
});

describe("createNotifyEventsJob", () => {
  it("runs daily at 07:00 UTC", () => {
    const job = createNotifyEventsJob(deps());
    expect(job.isDue?.(new Date("2026-11-11T07:01:00Z"), new Date("2026-11-12T06:59:00Z"))).toBe(false);
    expect(job.isDue?.(new Date("2026-11-11T07:01:00Z"), new Date("2026-11-12T07:00:00Z"))).toBe(true);
  });

  it("queues each recipient's events for today (Rome)", async () => {
    const d = deps();
    await createNotifyEventsJob(d).run(ctx());
    expect(d.loadSnapshot).toHaveBeenCalledWith(recipient("u1"), "2026-11-12");
    expect(d.insert).toHaveBeenCalledTimes(2);
    const rows = vi.mocked(d.insert).mock.calls[0][0];
    expect(rows.map((r) => r.event.kind)).toEqual(["due_soon"]);
  });

  it("keeps going when a recipient fails, then fails the run", async () => {
    const d = deps({
      loadSnapshot: vi.fn(async (r: Recipient) => {
        if (r.userId === "u1") throw new Error("boom");
        return snapshot(r.userId);
      }),
    });
    const c = ctx();
    await expect(createNotifyEventsJob(d).run(c)).rejects.toThrow(/1 recipient/);
    expect(d.insert).toHaveBeenCalledTimes(1);
    expect(c.log).toHaveBeenCalledWith("error", "notify recipient failed", expect.objectContaining({ household: "h1" }));
  });

  it("rethrows a missing table as is, so the deploy grace can recognise it", async () => {
    const missing = Object.assign(new Error('column "kind" does not exist'), { code: "42703" });
    const d = deps({ loadSnapshot: vi.fn(async () => Promise.reject(missing)) });
    await expect(createNotifyEventsJob(d).run(ctx())).rejects.toBe(missing);
    expect(d.insert).not.toHaveBeenCalled();
  });
});
