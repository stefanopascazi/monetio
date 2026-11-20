"use client";

import { type ReactNode, useState } from "react";
import { cx, SegmentedControl } from "@monetio/ui";

type Pane = "statement" | "side" | "uncategorised";

const PHONE_OPTIONS: { value: Pane; label: string }[] = [
  { value: "statement", label: "Movimenti" },
  { value: "side", label: "Riepilogo" },
  { value: "uncategorised", label: "Da categorizzare" },
];

const WIDE_OPTIONS: { value: Pane; label: string }[] = [
  { value: "statement", label: "Movimenti" },
  { value: "uncategorised", label: "Da categorizzare" },
];

/**
 * Account page columns. Wide layouts keep the accessory cards beside a main column that switches
 * between movements and "Da categorizzare"; phones show one pane at a time, movements first.
 */
export function AccountPanes({ statement, side, uncategorised }: { statement: ReactNode; side: ReactNode; uncategorised?: ReactNode }) {
  const [pane, setPane] = useState<Pane>("statement");
  const phoneOptions = uncategorised ? PHONE_OPTIONS : PHONE_OPTIONS.slice(0, 2);
  const sorting = uncategorised != null && pane === "uncategorised";
  return (
    <div className="flex flex-col gap-4">
      {/* Wrapper carries the breakpoint: the control's own display rule wins over a utility class. */}
      <div data-testid="account-pane-switch" className="lg:hidden">
        <SegmentedControl aria-label="Sezione del conto" options={phoneOptions} value={pane} onChange={setPane} block />
      </div>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div data-testid="account-side" className={cx("flex flex-col gap-4", pane !== "side" && "max-lg:hidden")}>
          {side}
        </div>
        <div className={cx("flex flex-col gap-4", pane === "side" && "max-lg:hidden")}>
          {uncategorised != null && (
            <div data-testid="account-main-switch" className="max-lg:hidden">
              <SegmentedControl aria-label="Vista del conto" options={WIDE_OPTIONS} value={sorting ? "uncategorised" : "statement"} onChange={setPane} />
            </div>
          )}
          <div data-testid="account-statement" className={cx(pane === "side" && "max-lg:hidden", sorting && "hidden")}>
            {statement}
          </div>
          {uncategorised != null && (
            <div data-testid="account-uncategorised" className={cx(!sorting && "hidden")}>
              {uncategorised}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
