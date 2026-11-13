import { Sparkles } from "lucide-react";
import { EmptyState } from "@monetio/ui";
import { advisorEnabled } from "@/lib/data/advisor";
import { getContext } from "@/lib/data/context";
import { AdvisorChat } from "./AdvisorChat";

/** "Chiedi" tab: the AI advisor, when the server has it configured. */
export async function AdvisorView() {
  // Session first: the tab is per user and must never be prerendered.
  await getContext();
  if (!advisorEnabled()) {
    return (
      <EmptyState
        icon={<Sparkles aria-hidden="true" />}
        title="Assistente non attivo"
        description="Per provarlo serve una chiave dell'API di Claude configurata sul server."
      />
    );
  }
  return <AdvisorChat />;
}
