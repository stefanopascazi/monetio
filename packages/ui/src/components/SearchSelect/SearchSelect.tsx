"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Field, describedBy } from "../Field/Field";
import type { SelectOption } from "../Select/Select";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";
import { matchesQuery } from "../../utils/search";
import { messages } from "../../i18n";

export interface SearchSelectProps {
  label: ReactNode;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Shown on the closed control when nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Select for long lists: once open, a search box filters the options (case and accent insensitive). */
export function SearchSelect({
  label,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder,
  searchPlaceholder,
  hint,
  error,
  optional,
  disabled,
  id,
  className,
}: SearchSelectProps) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listId = `${triggerId}-list`;
  const [current, setCurrent] = useControllableState(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const shown = useMemo(() => options.filter((o) => matchesQuery(o.label, query)), [options, query]);
  const selected = options.find((o) => o.value === current);

  // Close on a click or tap outside the component.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (option: SelectOption | undefined) => {
    if (!option || option.disabled) return;
    setCurrent(option.value);
    close();
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, shown.length - 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (e.key === "Enter") choose(shown[active]);
    else if (e.key === "Escape") close();
    else return;
    e.preventDefault();
  };

  return (
    <Field label={label} htmlFor={triggerId} hint={hint} error={error} optional={optional} className={className}>
      <div ref={rootRef} className="mio-search-select">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          className="mio-control mio-search-select__trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-describedby={describedBy(triggerId, hint, error)}
          onClick={() => (open ? close() : openList())}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              openList();
            }
          }}
        >
          <span className={cx("mio-search-select__value", !selected && "is-placeholder")}>{selected?.label ?? placeholder ?? ""}</span>
          <ChevronDown className="mio-search-select__chevron" aria-hidden="true" />
        </button>
        {open && (
          <div className="mio-search-select__popover">
            <div className="mio-control mio-search-select__search">
              <Search className="mio-control__affix" aria-hidden="true" />
              <input
                type="search"
                autoFocus
                role="combobox"
                aria-label={messages.searchSelect.search}
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
                placeholder={searchPlaceholder ?? messages.searchSelect.search}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKey}
              />
            </div>
            {shown.length ? (
              <ul ref={listRef} id={listId} role="listbox" className="mio-search-select__list">
                {shown.map((o, i) => (
                  <li
                    key={o.value}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={o.value === current}
                    aria-disabled={o.disabled || undefined}
                    className={cx("mio-search-select__option", i === active && "is-active")}
                    onPointerEnter={() => setActive(i)}
                    // Keep focus in the search box until the choice is made.
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                  >
                    {o.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mio-search-select__empty">{messages.searchSelect.noResults}</p>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}
