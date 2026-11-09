"use client";

import { Eye, EyeOff } from "lucide-react";
import { useBalancePrivacy } from "@/hooks/useBalancePrivacy";

/** Eye button in the top bar: shows or masks balances and totals on this device. */
export function BalancePrivacyToggle() {
  const { hidden, toggle } = useBalancePrivacy();
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostra saldi" : "Nascondi saldi"}
      className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
