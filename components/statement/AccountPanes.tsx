"use client";

import { type ReactNode, useState } from "react";
import { Badge, cx, SegmentedControl } from "@monetio/ui";

type MainPane = "statement" | "bank" | "uncategorised";
type Pane = MainPane | "side";

type Props = {
  statement: ReactNode;
  side: ReactNode;
  uncategorised?: ReactNode;
  /** Bank operations of a linked account; omitted when no bank feeds it. */
  bank?: ReactNode;
  /** Bank movements waiting for a choice, shown on the "Banca" tab. */
  bankCount?: number;
  /** Opens on the "Banca" tab (link from the bank settings). */
  openBank?: boolean;
};

function bankLabel(count?: number): ReactNode {
  if (!count) return "Banca";
  return (
    <span className="inline-flex items-center gap-1.5">
      Banca
      <Badge tone="warning" size="sm">
        {count}
      </Badge>
    </span>
  );
}

/**
 * Account page columns. Wide layouts keep the accessory cards beside a main column that switches
 * between movements, the bank and "Da categorizzare"; phones show one pane at a time, movements first.
 */
export function AccountPanes({ statement, side, uncategorised, bank, bankCount, openBank }: Props) {
  const [pane, setPane] = useState<Pane>(openBank && bank != null ? "bank" : "statement");
  const mains: { value: MainPane; label: ReactNode; content: ReactNode }[] = [
    { value: "statement", label: "Movimenti", content: statement },
    ...(bank != null ? [{ value: "bank" as const, label: bankLabel(bankCount), content: bank }] : []),
    ...(uncategorised != null ? [{ value: "uncategorised" as const, label: "Da categorizzare", content: uncategorised }] : []),
  ];
  const phoneOptions: { value: Pane; label: ReactNode }[] = [mains[0], { value: "side", label: "Riepilogo" }, ...mains.slice(1)];
  // With "Riepilogo" selected, wide layouts keep movements in the main column.
  const main: MainPane = pane === "side" ? "statement" : pane;
  return (
    <div className="flex flex-col gap-4">
      {/* Wrapper carries the breakpoint: the control's own display rule wins over a utility class. */}
      <div data-testid="account-pane-switch" className="lg:hidden">
        <SegmentedControl aria-label="Sezione del conto" options={phoneOptions} value={pane} onChange={setPane} size={phoneOptions.length > 3 ? "sm" : "md"} block />
      </div>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div data-testid="account-side" className={cx("flex flex-col gap-4", pane !== "side" && "max-lg:hidden")}>
          {side}
        </div>
        <div className={cx("flex flex-col gap-4", pane === "side" && "max-lg:hidden")}>
          {mains.length > 1 && (
            <div data-testid="account-main-switch" className="max-lg:hidden">
              <SegmentedControl aria-label="Vista del conto" options={mains} value={main} onChange={setPane} />
            </div>
          )}
          {mains.map((m) => (
            <div key={m.value} data-testid={`account-${m.value}`} className={cx(main !== m.value && "hidden", pane === "side" && "max-lg:hidden")}>
              {m.content}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
