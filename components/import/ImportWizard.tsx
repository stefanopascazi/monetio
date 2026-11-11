"use client";

import type { SelectOption } from "@monetio/ui";
import { FileStep } from "./FileStep";
import { ImportActionBar } from "./ImportActionBar";
import { ImportSummary } from "./ImportSummary";
import { MappingEditor } from "./MappingEditor";
import type { CategoryOption } from "./import-view";
import { PreviewList } from "./PreviewList";
import { RecurringProposals } from "./RecurringProposals";
import { useImportFlow } from "./useImportFlow";

export function ImportWizard({ accounts, categories = [] }: { accounts: SelectOption[]; categories?: CategoryOption[] }) {
  const flow = useImportFlow(accounts[0]?.value ?? "");
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <FileStep
          accounts={accounts}
          accountId={flow.accountId}
          onAccountChange={flow.setAccountId}
          fileName={flow.file?.name ?? null}
          bank={flow.bank}
          reading={flow.reading}
          onFile={flow.readFile}
          onReset={flow.reset}
        />
        {flow.file && flow.mapping && <MappingEditor grid={flow.file.grid} mapping={flow.mapping} bank={flow.bank} onChange={flow.setMapping} />}
        {flow.file && (
          <ImportSummary summary={flow.summary} openingDate={flow.openingDate} checking={flow.checking} error={flow.previewError} />
        )}
        {flow.file && <RecurringProposals accountId={flow.accountId} proposals={flow.recurring} categories={categories} />}
      </div>
      {flow.file && (
        <div className="flex flex-col gap-4">
          <PreviewList drafts={flow.drafts} statuses={flow.statuses} choices={flow.choices} onToggle={flow.toggle} unlinked={flow.unlinked} onToggleLink={flow.toggleLink}
            categories={categories}
            picks={flow.picks}
            suggestions={flow.suggestions}
            onPickCategory={flow.pickCategory}
            skipped={flow.skipped}
          />
          <ImportActionBar summary={flow.summary} checking={flow.checking} importing={flow.importing} onConfirm={flow.confirm} />
        </div>
      )}
    </section>
  );
}
