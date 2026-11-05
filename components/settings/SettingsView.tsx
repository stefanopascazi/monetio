import { LogOut } from "lucide-react";
import { Avatar, Badge, Button, Card, PageHeader, ThemeSwitcher } from "@monetio/ui";
import { signOut } from "@/app/actions/auth";
import { getContext } from "@/lib/data/context";
import { listCategories } from "@/lib/data/queries";
import { InviteForm } from "./InviteForm";
import { CategoryManager, ProfileForm } from "./SettingsForms";

export async function SettingsView() {
  const ctx = await getContext();
  const categories = await listCategories();
  return (
    <>
      <PageHeader title="Impostazioni" description={ctx.email ?? undefined} />
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ProfileForm displayName={ctx.me.displayName} householdName={ctx.householdName} />
        <Card title="Nucleo familiare" subtitle="Chi entra con il codice invito vede i conti condivisi">
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {ctx.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={m.displayName} size="sm" />
                    <span className="flex flex-col">
                      <span className="font-semibold">{m.displayName}</span>
                      <span className="text-sm text-ink-muted">{m.email ?? "Email non indicata"}</span>
                    </span>
                  </span>
                  {m.userId ? <Badge tone="success">Attivo</Badge> : <Badge tone="warning">In attesa</Badge>}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 rounded-[14px] bg-surface-sunken p-4">
              <span className="text-sm text-ink-muted">Codice invito</span>
              <span className="font-mono text-xl font-semibold tracking-widest">{ctx.inviteCode}</span>
              <span className="text-sm text-ink-muted">Alternativa all&apos;invito: chi ha già un account lo inserisce in &quot;Ho un codice&quot;.</span>
            </div>
            {ctx.me.role === "owner" && <InviteForm pending={ctx.members.filter((m) => !m.userId).map((m) => ({ id: m.id, name: m.displayName }))} />}
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
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Categorie</h2>
        <CategoryManager categories={categories} />
      </section>
    </>
  );
}
