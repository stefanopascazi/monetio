"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "../../utils/cx";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Leading visual, e.g. an Avatar or category icon. */
  leading?: ReactNode;
}

/** Toggleable filter chip. Use a row of chips for multi-select filters and member pickers. */
export function Chip({ selected = false, onSelectedChange, leading, className, children, onClick, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={selected}
      className={cx("mio-chip", selected && "is-selected", className)}
      onClick={(e) => {
        onClick?.(e);
        onSelectedChange?.(!selected);
      }}
    >
      {selected ? <Check className="mio-chip__check" aria-hidden="true" /> : leading}
      <span>{children}</span>
    </button>
  );
}
