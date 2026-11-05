"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Colors the selected segment by money semantics. */
  tone?: "income" | "expense" | "transfer";
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  size?: "sm" | "md";
  block?: boolean;
  "aria-label": string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  block,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const [current, setCurrent] = useControllableState<T>(value, defaultValue ?? options[0].value, onChange);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move the selection, like a native radio group.
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    setCurrent(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cx("mio-seg", `mio-seg--${size}`, block && "mio-seg--block", className)}
    >
      {options.map((opt, i) => {
        const selected = opt.value === current;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx("mio-seg__item", selected && "is-selected", opt.tone && `mio-seg__item--${opt.tone}`)}
            onClick={() => setCurrent(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
