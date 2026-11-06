"use client";

import { UserMinus } from "lucide-react";
import { Avatar, Badge, InlineConfirm, Select } from "@monetio/ui";
import { removeMember, setMemberRole } from "@/app/actions/members";
import { useToastAction } from "@/hooks/useToastAction";
import { MEMBER_ROLES, ROLE_LABEL, memberPermissions } from "@/lib/domain/household";
import type { Member } from "@/lib/domain/types";

const ROLE_OPTIONS = MEMBER_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

/** Household members with their role; admins change roles and remove people in place. */
export function MemberList({ me, members }: { me: Member; members: Member[] }) {
  const { run, pending } = useToastAction();
  return (
    <ul className="flex flex-col gap-3">
      {members.map((m) => {
        const can = memberPermissions(me, m, members);
        return (
          <li key={m.id} className="flex flex-col gap-2 rounded-[14px] bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={m.displayName} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">
                    {m.displayName}
                    {m.id === me.id && <span className="font-normal text-ink-muted"> (tu)</span>}
                  </span>
                  <span className="truncate text-sm text-ink-muted">{m.email ?? "Email non indicata"}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {!can.canChangeRole && <Badge tone={m.role === "admin" ? "brand" : "neutral"} size="sm">{ROLE_LABEL[m.role]}</Badge>}
                {m.userId ? <Badge tone="success" size="sm">Attivo</Badge> : <Badge tone="warning" size="sm">In attesa</Badge>}
              </span>
            </div>
            {(can.canChangeRole || can.canRemove) && (
              <div className="flex flex-wrap items-end justify-between gap-2">
                {can.canChangeRole && (
                  <Select
                    label="Ruolo"
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => run(() => setMemberRole(m.id, e.target.value))}
                    options={ROLE_OPTIONS}
                    className="min-w-40"
                  />
                )}
                {can.canRemove && (
                  <InlineConfirm
                    triggerLabel="Rimuovi"
                    triggerIcon={<UserMinus />}
                    message={`Rimuovo ${m.displayName} dal nucleo?`}
                    confirmLabel="Rimuovi"
                    onConfirm={() => run(() => removeMember(m.id))}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
