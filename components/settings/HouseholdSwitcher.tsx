"use client";

import { ArrowRight, Check } from "lucide-react";
import { Badge, Button } from "@monetio/ui";
import { switchHousehold } from "@/app/actions/household";
import { useToastAction } from "@/hooks/useToastAction";
import { ROLE_LABEL, type Membership } from "@/lib/domain/household";

/** Every household of the user with their role; opens another one as the active household. */
export function HouseholdSwitcher({ memberships, activeId }: { memberships: Membership[]; activeId: string }) {
  const { run, pending } = useToastAction();
  return (
    <ul className="flex flex-col gap-2">
      {memberships.map((m) => {
        const active = m.householdId === activeId;
        return (
          <li key={m.householdId} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{m.householdName}</span>
              <span className="text-sm text-ink-muted">{ROLE_LABEL[m.role]}</span>
            </span>
            {active ? (
              <Badge tone="success" icon={<Check />} size="sm">
                In uso
              </Badge>
            ) : (
              <Button size="sm" variant="secondary" iconEnd={<ArrowRight />} disabled={pending} onClick={() => run(() => switchHousehold(m.householdId))}>
                Apri
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
