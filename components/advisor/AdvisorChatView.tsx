"use client";

import { History, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";
import { Alert, Button } from "@monetio/ui";
import { AdvisorComposer } from "./AdvisorComposer";
import { AdvisorHistory } from "./AdvisorHistory";
import { useAdvisor } from "./AdvisorProvider";
import { AdvisorThread } from "./AdvisorThread";

/** The whole chat: header, conversation or history, question box. Fills its container (panel or page). */
export function AdvisorChatView({ onClose }: { onClose?: () => void }) {
  const { chat } = useAdvisor();
  const [showHistory, setShowHistory] = useState(false);
  const fresh = () => {
    chat.reset();
    setShowHistory(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 border-b border-border px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-ink">{showHistory ? "Conversazioni" : (chat.title ?? "Assistente")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={showHistory ? "Torna alla conversazione" : "Conversazioni"}
          aria-pressed={showHistory}
          iconStart={<History aria-hidden="true" className="size-4" />}
          onClick={() => setShowHistory((v) => !v)}
        />
        <Button type="button" variant="ghost" size="sm" iconOnly aria-label="Nuova conversazione" iconStart={<MessageSquarePlus aria-hidden="true" className="size-4" />} onClick={fresh} />
        {onClose && <Button type="button" variant="ghost" size="sm" iconOnly aria-label="Chiudi l'assistente" iconStart={<X aria-hidden="true" className="size-4" />} onClick={onClose} />}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {showHistory ? (
          <AdvisorHistory
            activeId={chat.conversationId}
            onOpen={(id) => {
              void chat.open(id);
              setShowHistory(false);
            }}
            onDeletedActive={chat.reset}
          />
        ) : chat.turns.length || chat.pending ? (
          <AdvisorThread turns={chat.turns} pending={chat.pending} />
        ) : (
          <p className="text-sm text-ink-muted">
            Chiedimi se potete permettervi una spesa, quanto potete spendere o cosa cambia risparmiando di più. Faccio i conti sui vostri dati; solo pianificazione del bilancio, niente investimenti, prestiti, assicurazioni o fisco.
          </p>
        )}
      </div>
      {!showHistory && (
        <footer className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {chat.error && <Alert tone="danger">{chat.error}</Alert>}
          <AdvisorComposer turns={chat.turns.length} busy={Boolean(chat.pending)} onAsk={(q, page) => void chat.ask(q, page)} onNew={fresh} />
        </footer>
      )}
    </div>
  );
}
