import { Card } from "@monetio/ui";
import { Onboarding } from "@/components/auth/Onboarding";
import type { Membership } from "@/lib/domain/household";
import { HouseholdSwitcher } from "./HouseholdSwitcher";

/** Households the user belongs to: switch between them or join/create another. */
export function HouseholdsCard({ memberships, activeId }: { memberships: Membership[]; activeId: string }) {
  return (
    <Card title="I tuoi nuclei" subtitle="Puoi far parte di più nuclei e passare dall'uno all'altro">
      <div className="flex flex-col gap-4">
        <HouseholdSwitcher memberships={memberships} activeId={activeId} />
        <Card title="Aggiungi un nucleo" tone="raised" collapsible defaultOpen={false}>
          <Onboarding />
        </Card>
      </div>
    </Card>
  );
}
