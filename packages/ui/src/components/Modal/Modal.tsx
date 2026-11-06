"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { messages } from "../../i18n";
import { cx } from "../../utils/cx";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Native <dialog> modal for focused, occasional settings (e.g. per-object preferences).
 * Data entry still prefers in-page FormPanel/Accordion. Content mounts only while open.
 */
export function Modal({ open, onOpenChange, title, description, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cx("mio-modal", className)}
      aria-labelledby={`${id}-title`}
      // Esc: let React state drive closing instead of the browser.
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      // Clicks on the backdrop target the dialog element itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      {open && (
        <div className="mio-modal__sheet">
          <header className="mio-modal__header">
            <span className="mio-modal__heading">
              <h2 className="mio-modal__title" id={`${id}-title`}>
                {title}
              </h2>
              {description && <p className="mio-modal__desc">{description}</p>}
            </span>
            <button type="button" className="mio-modal__close" aria-label={messages.dismiss} onClick={() => onOpenChange(false)}>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="mio-modal__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
