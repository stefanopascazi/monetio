import { LogOut } from "lucide-react";
import { Button, Card } from "@monetio/ui";
import { signOut } from "@/app/actions/auth";

/** Signed-in email and sign out. */
export function SessionCard({ email }: { email: string | null }) {
  return (
    <Card title="Sessione" subtitle={email ? `Accesso come ${email}` : undefined}>
      <form action={signOut}>
        <Button type="submit" variant="secondary" iconStart={<LogOut />}>
          Esci
        </Button>
      </form>
    </Card>
  );
}
