import { Card } from "@monetio/ui";
import { isAdmin, isLastAdmin } from "@/lib/domain/household";
import type { Member } from "@/lib/domain/types";
import { HouseholdExit, RenameHouseholdForm } from "./HouseholdActions";
import { InviteCode } from "./InviteCode";
import { InviteForm } from "./InviteForm";
import { MemberList } from "./MemberList";

interface ActiveHouseholdCardProps {
  householdName: string;
  inviteCode: string;
  me: Member;
  members: Member[];
}

/** Active household: members and roles, invites, rename and leave/delete (admin tools only for admins). */
export function ActiveHouseholdCard({ householdName, inviteCode, me, members }: ActiveHouseholdCardProps) {
  const admin = isAdmin(me);
  return (
    <Card title={householdName} subtitle={admin ? "Sei amministratore: gestisci persone e ruoli" : "Fai parte di questo nucleo come membro"}>
      <div className="flex flex-col gap-4">
        <MemberList me={me} members={members} />
        <InviteCode code={inviteCode} />
        {admin && (
          <>
            <InviteForm pending={members.filter((m) => !m.userId).map((m) => ({ id: m.id, name: m.displayName }))} />
            <RenameHouseholdForm householdName={householdName} />
          </>
        )}
        <HouseholdExit householdName={householdName} admin={admin} canLeave={!isLastAdmin(members, me.id)} />
      </div>
    </Card>
  );
}
