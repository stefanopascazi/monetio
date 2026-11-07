import { DueList } from "@/components/due/DueList";
import { loadAgenda } from "@/lib/data/agenda";
import { dueViews } from "@/lib/data/page-views";
import { listHiddenAccounts } from "@/lib/data/queries";
import { loadActiveAccounts } from "../data";

/** Next deadlines (31 days). */
export async function UpcomingDue() {
  const [agenda, { active }, hidden] = await Promise.all([loadAgenda(), loadActiveAccounts(), listHiddenAccounts()]);
  return <DueList items={dueViews(agenda.due, agenda.rules, active, hidden).slice(0, 6)} today={agenda.today} title="In scadenza" subtitle="Prossimi 31 giorni" />;
}
