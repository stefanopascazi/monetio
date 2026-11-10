"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@monetio/ui";
import "./globals.css";

// Last-resort boundary when the root layout itself fails: report and offer a reload.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body className="mio-root flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
        <p>Abbiamo registrato l&apos;errore. Riprova tra qualche istante.</p>
        <Button onClick={reset}>Riprova</Button>
      </body>
    </html>
  );
}
