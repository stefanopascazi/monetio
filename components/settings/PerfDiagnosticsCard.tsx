"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Button, Card } from "@monetio/ui";
import { clearNavLog, type NavEntry, navStats, readNavLog, subscribeNavLog } from "@/lib/perf/nav-log";
import { collectSnapshot, type RuntimeSnapshot } from "@/lib/perf/runtime";

const EMPTY: NavEntry[] = [];
const yesNo = (v: boolean) => (v ? "sì" : "no");
const time = (at: number) => new Date(at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-[var(--mio-ink-subtle)]">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

/** Impostazioni > App: tap-to-render times and runtime facts, readable on the phone without remote debugging. */
export function PerfDiagnosticsCard() {
  const log = useSyncExternalStore(subscribeNavLog, readNavLog, () => EMPTY);
  const [snap, setSnap] = useState<RuntimeSnapshot | null>(null);
  const refresh = useCallback(() => {
    collectSnapshot().then(setSnap, () => setSnap(null));
  }, []);
  useEffect(refresh, [refresh]);
  const stats = navStats(log);

  return (
    <Card
      title="Diagnostica prestazioni"
      subtitle="Tempi tra il tocco su un link e la pagina pronta, misurati su questo dispositivo."
      action={
        <Button variant="ghost" iconStart={<RefreshCw />} onClick={refresh}>
          Aggiorna
        </Button>
      }
    >
      <dl className="text-sm">
        {snap && (
          <>
            <Row label="App installata" value={yesNo(snap.standalone)} />
            <Row label="Service worker attivo" value={yesNo(snap.controlled)} />
            <Row label="Pagina aperta da" value={`${snap.uptimeS} s`} />
            <Row label="Blocchi del thread" value={`${snap.longTasks.count} (${snap.longTasks.ms} ms)`} />
            <Row label="Memoria JS" value={snap.heapMb === null ? "n/d" : `${snap.heapMb} MB`} />
            <Row label="Elementi in cache" value={snap.cacheEntries === null ? "n/d" : String(snap.cacheEntries)} />
          </>
        )}
        <Row label="Navigazioni" value={stats ? `${log.length} · mediana ${stats.median} ms · max ${stats.max} ms` : "nessuna"} />
      </dl>
      {log.length > 0 && (
        <>
          <ol className="mt-3 max-h-64 overflow-y-auto font-mono text-xs" aria-label="Ultime navigazioni">
            {log.map((e) => (
              <li key={`${e.at}-${e.path}`} className="flex justify-between gap-3 py-0.5">
                <span className="truncate">
                  {time(e.at)} {e.path}
                  {e.standalone ? "" : " (browser)"}
                </span>
                <span>{e.ms} ms</span>
              </li>
            ))}
          </ol>
          <Button className="mt-3" variant="secondary" iconStart={<Trash2 />} onClick={clearNavLog}>
            Azzera
          </Button>
        </>
      )}
    </Card>
  );
}
