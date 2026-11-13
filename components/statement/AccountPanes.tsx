"use client";

import { type ReactNode, useState } from "react";
import { cx, SegmentedControl } from "@monetio/ui";

type Pane = "statement" | "side";

const OPTIONS: { value: Pane; label: string }[] = [
  { value: "statement", label: "Movimenti" },
  { value: "side", label: "Riepilogo" },
];

/**
 * Account page columns. Wide layouts show both side by side; phones show one pane at a time,
 * movements first, with a switch for the accessory cards (recap, chart, planned).
 */
export function AccountPanes({ statement, side }: { statement: ReactNode; side: ReactNode }) {
  const [pane, setPane] = useState<Pane>("statement");
  return (
    <div className="flex flex-col gap-4">
      {/* Wrapper carries the breakpoint: the control's own display rule wins over a utility class. */}
      <div data-testid="account-pane-switch" className="lg:hidden">
        <SegmentedControl aria-label="Sezione del conto" options={OPTIONS} value={pane} onChange={setPane} block />
      </div>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div data-testid="account-side" className={cx("flex flex-col gap-4", pane !== "side" && "max-lg:hidden")}>
          {side}
        </div>
        <div data-testid="account-statement" className={cx(pane !== "statement" && "max-lg:hidden")}>
          {statement}
        </div>
      </section>
    </div>
  );
}
