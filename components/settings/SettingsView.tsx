import { LogOut } from "lucide-react";
import { Button, Card, PageHeader, ThemeSwitcher } from "@monetio/ui";
import { signOut } from "@/app/actions/auth";
import { Onboarding } from "@/components/auth/Onboarding";
import { getContext } from "@/lib/data/context";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { isAdmin, isLastAdmin } from "@/lib/domain/household";
import { ArchivedAccounts } from "./ArchivedAccounts";
import { HouseholdExit, RenameHouseholdForm } from "./HouseholdActions";
import { HouseholdSwitcher } from "./HouseholdSwitcher";
import { InviteForm } from "./InviteForm";
import { MemberList } from "./MemberList";
import { CategoryManager, ProfileForm } from "./SettingsForms";

export async function SettingsView() {
  const ctx = await getContext();
  const [categories, accounts] = await Promise.all([listCategories(), listAccounts()]);
  const archived = accounts.filter((a) => a.archived).map(({ id, name, institution, balanceCents }) => ({ id, name, institution, balanceCents }));
  const admin = isAdmin(ctx.me);
  return (
    <>
      <PageHeader title="Impostazioni" description={ctx.email ?? undefined} />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ProfileForm displayName={ctx.me.displayName} />
        <Card title="I tuoi nuclei" subtitle="Puoi far parte di più nuclei e passare dall'uno all'altro">
          <div className="flex flex-col gap-4">
            <HouseholdSwitcher memberships={ctx.memberships} activeId={ctx.householdId} />
            <Card title="Aggiungi un nucleo" tone="raised" collapsible defaultOpen={false}>
              <Onboarding />
            </Card>
          </div>
        </Card>
        <Card
          title={ctx.householdName}
          subtitle={admin ? "Sei amministratore: gestisci persone e ruoli" : "Fai parte di questo nucleo come membro"}
          className="lg:col-span-2"
        >
          <div className="flex flex-col gap-4">
            <MemberList me={ctx.me} members={ctx.members} />
            <div className="flex flex-col gap-1 rounded-[14px] bg-surface-sunken p-4">
              <span className="text-sm text-ink-muted">Codice invito</span>
              <span className="font-mono text-xl font-semibold tracking-widest">{ctx.inviteCode}</span>
              <span className="text-sm text-ink-muted">Chi ha già un account lo inserisce in &quot;Aggiungi un nucleo&quot; ed entra come membro.</span>
            </div>
            {admin && (
              <>
                <InviteForm pending={ctx.members.filter((m) => !m.userId).map((m) => ({ id: m.id, name: m.displayName }))} />
                <RenameHouseholdForm householdName={ctx.householdName} />
              </>
            )}
            <HouseholdExit householdName={ctx.householdName} admin={admin} canLeave={!isLastAdmin(ctx.members, ctx.me.id)} />
          </div>
        </Card>
        <Card title="Aspetto">
          <ThemeSwitcher showLabels />
        </Card>
        <Card title="Sessione">
          <form action={signOut}>
            <Button type="submit" variant="secondary" iconStart={<LogOut />}>
              Esci
            </Button>
          </form>
        </Card>
      </section>
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Conti</h2>
          <ArchivedAccounts accounts={archived} />
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Categorie</h2>
        <CategoryManager categories={categories} />
      </section>
    </>
  );
}
