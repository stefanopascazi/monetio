"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@monetio/ui";

/** Shown on /login when an email link could not be verified (?errore=link). */
export function LinkError() {
  const params = useSearchParams();
  if (params.get("errore") !== "link") return null;
  return (
    <Alert tone="danger" className="mb-4">
      Il link dell&apos;email non è valido o è scaduto. Chiedi un nuovo invito o usa &quot;Password dimenticata?&quot;.
    </Alert>
  );
}
