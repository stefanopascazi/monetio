"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useToast } from "@monetio/ui";
import { importStatement, previewImport, readStatementFile } from "@/app/actions/import";
import type { DraftStatus } from "@/lib/import/classify";
import { mapRows } from "@/lib/import/mapping";
import { detectMapping } from "@/lib/import/presets";
import type { ColumnMapping, Grid } from "@/lib/import/types";
import { fallbackMapping, isSelected, summarize } from "./import-view";

interface LoadedFile {
  name: string;
  grid: Grid;
}

interface Preview {
  key: string;
  statuses: DraftStatus[];
  openingDate: string;
}

const PREVIEW_DELAY_MS = 400;

/** State of the import screen: file, column mapping, duplicate check, selection and confirm. */
export function useImportFlow(defaultAccountId: string) {
  const toast = useToast();
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [bank, setBank] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<{ key: string; message: string } | null>(null);
  const [choices, setChoices] = useState<Map<number, boolean>>(new Map());
  const [reading, startReading] = useTransition();
  const [importing, startImporting] = useTransition();

  const mapped = useMemo(() => (file && mapping ? mapRows(file.grid, mapping) : null), [file, mapping]);
  const drafts = useMemo(() => mapped?.drafts ?? [], [mapped]);
  const key = useMemo(() => (drafts.length ? `${accountId}:${JSON.stringify(drafts)}` : ""), [accountId, drafts]);
  // Statuses only count when they belong to the current account and mapping.
  const statuses = preview?.key === key ? preview.statuses : null;
  const error = previewError?.key === key ? previewError.message : null;

  useEffect(() => {
    if (!key) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const res = await previewImport(accountId, drafts).catch(() => ({ ok: false as const, message: "Controllo dei duplicati non riuscito. Riprova." }));
      if (stale) return;
      if (res.ok) setPreview({ key, statuses: res.statuses, openingDate: res.openingDate });
      else setPreviewError({ key, message: res.message });
      setChoices(new Map());
    }, PREVIEW_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [key, accountId, drafts]);

  const readFile = (f: File) =>
    startReading(async () => {
      const fd = new FormData();
      fd.set("file", f);
      const res = await readStatementFile(fd);
      if (!res.ok) {
        toast.show(res.message, { tone: "danger" });
        return;
      }
      const detected = detectMapping(res.grid);
      setFile({ name: f.name, grid: res.grid });
      setMapping(detected?.mapping ?? fallbackMapping(res.grid));
      setBank(detected?.bank ?? null);
      setPreview(null);
    });

  const reset = () => {
    setFile(null);
    setMapping(null);
    setBank(null);
    setPreview(null);
    setChoices(new Map());
  };

  const toggle = (line: number, value: boolean) => setChoices((prev) => new Map(prev).set(line, value));

  const summary = statuses ? summarize(drafts, statuses, choices) : null;

  const confirm = () => {
    if (!statuses) return;
    const chosen = drafts.filter((d, i) => isSelected(d.line, statuses[i], choices));
    startImporting(async () => {
      const res = await importStatement(accountId, chosen);
      toast.show(res.message ?? "", { tone: res.ok ? "success" : "danger" });
      if (res.ok) reset();
    });
  };

  return {
    accountId,
    setAccountId,
    file,
    mapping,
    setMapping,
    bank,
    skipped: mapped?.skipped ?? [],
    drafts,
    statuses,
    openingDate: statuses ? preview!.openingDate : null,
    previewError: error,
    checking: !!key && !statuses && !error,
    choices,
    toggle,
    summary,
    reading,
    importing,
    readFile,
    reset,
    confirm,
  };
}
