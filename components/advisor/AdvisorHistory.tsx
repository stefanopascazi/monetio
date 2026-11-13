"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { EmptyState, InlineConfirm } from "@monetio/ui";
import { deleteAdvisorConversation, listAdvisorConversations } from "@/app/actions/advisor";
import { dateLabel } from "@/lib/domain/dates";
import type { ConversationSummary } from "@/lib/data/advisor-conversations";

interface Props {
  activeId: string | null;
  onOpen: (id: string) => void;
  /** Called when the open conversation was deleted. */
  onDeletedActive: () => void;
}

/** The user's conversations (kept 30 days), to reopen or delete. */
export function AdvisorHistory({ activeId, onOpen, onDeletedActive }: Props) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    start(async () => setItems(await listAdvisorConversations()));
  }, []);

  const remove = async (id: string | null) => {
    await deleteAdvisorConversation(id);
    if (id === null || id === activeId) onDeletedActive();
    setItems((list) => (id === null ? [] : (list ?? []).filter((c) => c.id !== id)));
  };

  if (items === null) return <p className="text-sm text-ink-muted">Carico le conversazioni…</p>;
  if (items.length === 0) return <EmptyState title="Nessuna conversazione" description="Le conversazioni restano qui per 30 giorni, poi si cancellano da sole." />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-muted">Visibili solo a te. Si cancellano da sole dopo 30 giorni.</p>
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface-raised p-2">
            <button type="button" onClick={() => onOpen(c.id)} className="flex min-w-0 flex-1 flex-col items-start px-2 py-1 text-left">
              <span className="w-full truncate text-sm font-semibold text-ink">{c.title}</span>
              <span className="text-xs text-ink-muted">{dateLabel(c.updatedAt.slice(0, 10))}</span>
            </button>
            <InlineConfirm triggerLabel={<Trash2 aria-label="Elimina" className="size-4" />} message="Eliminare?" confirmLabel="Elimina" onConfirm={() => remove(c.id)} />
          </li>
        ))}
      </ul>
      <InlineConfirm triggerLabel="Elimina tutte" message="Eliminare tutte le conversazioni?" confirmLabel="Elimina tutte" onConfirm={() => remove(null)} className="self-start" />
    </div>
  );
}
