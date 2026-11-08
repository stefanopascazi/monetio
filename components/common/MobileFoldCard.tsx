"use client";

import { useState } from "react";
import { Card, type CardProps, cx } from "@monetio/ui";

/** Same breakpoint as the two-column account layout (Tailwind `lg`). */
const PHONE_QUERY = "(max-width: 1023px)";

/**
 * Collapsible card folded by default on phones and open on wider layouts.
 * The default is applied by CSS (`mio-fold-mobile`), so the server render never flashes open;
 * the first toggle turns it into a regular controlled card.
 */
export function MobileFoldCard({ className, ...props }: Omit<CardProps, "collapsible" | "open" | "defaultOpen" | "onOpenChange">) {
  const [open, setOpen] = useState<boolean | null>(null);
  const onOpenChange = (next: boolean) => {
    // Untouched on a phone the card looks folded, so the first toggle opens it.
    setOpen(open === null && window.matchMedia(PHONE_QUERY).matches ? true : next);
  };
  return <Card {...props} collapsible open={open ?? true} onOpenChange={onOpenChange} className={cx(className, open === null && "mio-fold-mobile")} />;
}
