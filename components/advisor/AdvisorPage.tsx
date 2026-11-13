import { Sparkles } from "lucide-react";
import { EmptyState } from "@monetio/ui";
import { advisorEnabled } from "@/lib/data/advisor";
import { getContext } from "@/lib/data/context";
import { AdvisorChatView } from "./AdvisorChatView";

/** Full-page chat: the phone entry point (wide screens use the side panel, but the page works there too). */
export async function AdvisorPage() {
  // Session first: the chat is per user and must never be prerendered.
  await getContext();
  if (!advisorEnabled()) {
    return <EmptyState icon={<Sparkles aria-hidden="true" />} title="Assistente non attivo" description="Per provarlo serve una chiave dell'API di Claude configurata sul server." />;
  }
  return (
    // Fills the screen between the top bar and the floating nav.
    <section aria-label="Assistente IA" className="h-[calc(100dvh-13rem)] overflow-hidden rounded-2xl bg-surface min-[960px]:h-[calc(100dvh-9rem)]">
      <AdvisorChatView />
    </section>
  );
}
