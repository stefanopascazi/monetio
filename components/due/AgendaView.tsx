import { Card, PageHeader, Tabs } from "@monetio/ui";
import { createContribution, createRule } from "@/app/actions/rules";
import { ContributionForm } from "@/components/rules/ContributionForm";
import { ContributionList } from "@/components/rules/ContributionList";
import { RuleForm } from "@/components/rules/RuleForm";
import { RuleList } from "@/components/rules/RuleList";
import { loadAgenda } from "@/lib/data/agenda";
import { contributionSpendingFrom } from "@/lib/data/flows";
import { contributionViews, dueViews, ruleViews } from "@/lib/data/page-views";
import { listAccounts, listCategories, listHiddenAccounts } from "@/lib/data/queries";
import { transferTargets } from "@/lib/data/transfer-targets";
import { DueList } from "./DueList";
import { UpcomingList } from "./UpcomingList";

export async function AgendaView() {
  const agenda = await loadAgenda();
  const [accounts, categories, hidden] = await Promise.all([listAccounts(), listCategories(), listHiddenAccounts()]);
  const active = accounts.filter((a) => !a.archived);
  const refs = active.map((a) => ({ id: a.id, name: a.name }));
  const catRefs = categories.map((c) => ({ id: c.id, name: c.name }));
  const targets = transferTargets(hidden);
  const due = dueViews(agenda.due, agenda.rules, active, hidden);
  const overdue = due.filter((d) => d.date < agenda.today);
  const rules = ruleViews(agenda.rules, accounts, agenda.today, categories, hidden);
  const contributions = contributionViews(agenda.contributions, accounts, agenda.today, contributionSpendingFrom(agenda.flows), hidden);

  return (
    <>
      <PageHeader title="Scadenze" description="Pagamenti da confermare, addebiti automatici in arrivo e regole ricorrenti." />
      <Tabs
        aria-label="Sezioni scadenze"
        tabs={[
          {
            id: "due",
            label: "Da pagare",
            count: due.length,
            content: (
              <section className="grid grid-cols-1 items-start gap-4 pt-4 lg:grid-cols-2">
                <DueList items={due} today={agenda.today} subtitle={overdue.length ? `${overdue.length} scadute` : "Prossimi 31 giorni"} accounts={refs} />
                <Card title="Addebiti automatici" subtitle="Si registrano da soli nei prossimi 31 giorni" padding="none">
                  <UpcomingList items={dueViews(agenda.upcoming, agenda.rules, accounts, hidden)} />
                </Card>
              </section>
            ),
          },
          {
            id: "rules",
            label: "Ricorrenze",
            count: rules.filter((r) => r.active).length,
            content: (
              <section className="flex flex-col gap-4 pt-4">
                <RuleForm action={createRule} accounts={refs} categories={catRefs} transferTargets={targets} today={agenda.today} />
                <RuleList rules={rules} accounts={refs} categories={catRefs} transferTargets={targets} today={agenda.today} />
              </section>
            ),
          },
          {
            id: "quote",
            label: "Quote",
            count: contributions.length,
            content: (
              <section className="flex flex-col gap-4 pt-4">
                <ContributionForm action={createContribution} accounts={refs} categories={catRefs} />
                <ContributionList items={contributions} accounts={refs} categories={catRefs} />
              </section>
            ),
          },
        ]}
      />
    </>
  );
}
