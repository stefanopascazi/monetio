"use client";

import { Accordion, Amount } from "@monetio/ui";
import type { RecapItem } from "@/lib/domain/month-recap";
import { EstimateUsageList } from "./EstimateUsageList";
import { RecapItemSummary } from "./RecapItemSummary";

/** Decreasing estimate in the month recap: opens on the movements that reduced it. */
export function EstimateUsageRow({ item }: { item: RecapItem & { usage: NonNullable<RecapItem["usage"]> } }) {
  return (
    <Accordion
      items={[
        {
          id: item.key,
          title: <RecapItemSummary item={item} />,
          meta: <Amount cents={item.amountCents} size="sm" showSign />,
          content: <EstimateUsageList usage={item.usage} />,
        },
      ]}
    />
  );
}
