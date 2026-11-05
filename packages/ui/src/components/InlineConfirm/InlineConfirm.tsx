"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/cx";
import { Button } from "../Button/Button";

export interface InlineConfirmProps {
  /** Label of the initial trigger button. */
  triggerLabel: ReactNode;
  triggerIcon?: ReactNode;
  /** Question shown in place of the trigger. */
  message: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "danger" | "neutral";
  onConfirm: () => void | Promise<void>;
  className?: string;
}

/** Two-step confirmation that expands in place. Replaces confirm dialogs for delete and archive. */
export function InlineConfirm({
  triggerLabel,
  triggerIcon,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  className,
}: InlineConfirmProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus to the safe choice when the question appears.
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <Button
        variant={tone === "danger" ? "danger" : "secondary"}
        size="sm"
        iconStart={triggerIcon}
        className={className}
        onClick={() => setAsking(true)}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirm action" className={cx("mio-confirm", `mio-confirm--${tone}`, className)}>
      <p className="mio-confirm__msg">{message}</p>
      <div className="mio-confirm__actions">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={() => setAsking(false)} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          size="sm"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setAsking(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
