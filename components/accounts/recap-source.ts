import type { BadgeTone } from "@monetio/ui";
import type { RecapItem } from "@/lib/domain/month-recap";

/** Badge of a recap item's origin; real movements and rules show none. */
export const RECAP_SOURCE: Record<RecapItem["source"], { label: string; tone: BadgeTone } | null> = {
  booked: null,
  rule: null,
  estimate: { label: "stima", tone: "forecast" },
  contribution: { label: "quota", tone: "transfer" },
  planned: { label: "pianificato", tone: "neutral" },
};

/** Decreasing estimate with nothing left: everything was booked in its categories. */
export const isUsedUp = (x: Pick<RecapItem, "usage" | "amountCents">) => Boolean(x.usage) && x.amountCents === 0;

/** Decreasing estimate whose categories went beyond it this month. */
export const isExceeded = (x: Pick<RecapItem, "usage">) => (x.usage?.overCents ?? 0) > 0;
