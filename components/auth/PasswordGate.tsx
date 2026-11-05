"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Skeleton } from "@monetio/ui";
import { adoptSession, exchangeCode, hasSession } from "@/app/actions/session";
import { parseAuthHash } from "@/lib/supabase/hash";
import { PasswordForm } from "./PasswordForm";

type Status = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

/**
 * Opens the session from whatever the email link carried (URL fragment tokens, PKCE `code`,
 * or a cookie set by /auth/confirm), then shows the password form.
 */
export function PasswordGate() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  // Email tokens are single-use: run once even when Strict Mode re-runs effects.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const fromHash = parseAuthHash(window.location.hash);
      const code = new URLSearchParams(window.location.search).get("code");
      let ok = false;
      if (fromHash.kind === "error") {
        setStatus({ kind: "error", message: fromHash.message });
        return;
      }
      if (fromHash.kind === "session") ok = await adoptSession(fromHash.accessToken, fromHash.refreshToken);
      else if (code) ok = await exchangeCode(code);
      else ok = await hasSession();
      // Drop tokens from the address bar.
      window.history.replaceState(null, "", window.location.pathname);
      setStatus(ok ? { kind: "ready" } : { kind: "error", message: "Il link non è valido o è scaduto." });
    })();
  }, []);

  if (status.kind === "loading") return <Skeleton lines={3} height={44} />;
  if (status.kind === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="danger" title="Non riesco ad aprire il link">
          {status.message} Chiedi un nuovo invito o usa &quot;Password dimenticata?&quot; nella pagina di accesso.
        </Alert>
        <Link href="/login" className="font-semibold text-brand-ink">
          Vai all&apos;accesso
        </Link>
      </div>
    );
  }
  return <PasswordForm />;
}
