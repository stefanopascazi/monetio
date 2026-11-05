"use client";

import type { FormEvent, ReactNode } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useControllableState } from "../../hooks/useControllableState";
import { cx } from "../../utils/cx";

export interface FormPanelProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** When false the panel is always open (inline form). */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Footer actions, usually a primary submit Button and a ghost Cancel. */
  actions?: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
  children: ReactNode;
}

/**
 * In-page form container that replaces modal dialogs.
 * Collapsed it reads as a call to action; expanded it holds the full form.
 */
export function FormPanel({
  title,
  description,
  icon,
  collapsible = true,
  open,
  defaultOpen = false,
  onOpenChange,
  actions,
  onSubmit,
  className,
  children,
}: FormPanelProps) {
  const id = useId();
  const [isOpen, setOpen] = useControllableState(open, collapsible ? defaultOpen : true, onOpenChange);
  const expanded = !collapsible || isOpen;

  const header = (
    <>
      {icon && <span className="mio-form-panel__icon">{icon}</span>}
      <span className="mio-form-panel__heading">
        <span className="mio-form-panel__title">{title}</span>
        {description && <span className="mio-form-panel__desc">{description}</span>}
      </span>
      {collapsible && <ChevronDown className="mio-form-panel__chevron" aria-hidden="true" />}
    </>
  );

  return (
    <section className={cx("mio-form-panel", expanded && "is-open", className)} aria-labelledby={`${id}-title`}>
      {collapsible ? (
        <button
          type="button"
          id={`${id}-title`}
          className="mio-form-panel__header"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
          onClick={() => setOpen(!isOpen)}
        >
          {header}
        </button>
      ) : (
        <div className="mio-form-panel__header" id={`${id}-title`}>
          {header}
        </div>
      )}
      <form
        id={`${id}-body`}
        className="mio-form-panel__body"
        hidden={!expanded}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.(e);
        }}
      >
        <div className="mio-form-panel__fields">{children}</div>
        {actions && <div className="mio-form-panel__actions">{actions}</div>}
      </form>
    </section>
  );
}
