"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import { cx } from "../../utils/cx";
import { messages } from "../../i18n";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastOptions {
  tone?: ToastTone;
  /** Auto-dismiss delay in ms; 0 keeps it until closed. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  message: ReactNode;
  tone: ToastTone;
  duration: number;
}

export interface ToastApi {
  show: (message: ReactNode, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

/** Default auto-dismiss delays: errors stay longer so they can be read. */
export const TOAST_DURATION: Record<ToastTone, number> = { info: 3500, success: 3500, warning: 5000, danger: 6000 };
/** Oldest toasts are dropped beyond this many. */
export const TOAST_LIMIT = 3;

const ICON: Record<ToastTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  success: <CheckCircle2 aria-hidden="true" />,
  warning: <AlertTriangle aria-hidden="true" />,
  danger: <OctagonAlert aria-hidden="true" />,
};

const noop: ToastApi = { show: () => 0, dismiss: () => {} };
const ToastContext = createContext<ToastApi>(noop);

/** Access the toast queue; a no-op outside ToastProvider (tests, isolated stories). */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (!item.duration) return;
    const t = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);
  return (
    <div role={item.tone === "danger" ? "alert" : "status"} className={cx("mio-toast", `mio-toast--${item.tone}`)}>
      <span className="mio-toast__icon">{ICON[item.tone]}</span>
      <div className="mio-toast__text">{item.message}</div>
      <button type="button" className="mio-toast__close" aria-label={messages.dismiss} onClick={() => onDismiss(item.id)}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Non-blocking feedback after an action (saved, deleted, failed).
 * Stacks above the mobile bottom nav; never steals focus.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);
  const show = useCallback((message: ReactNode, options: ToastOptions = {}) => {
    const tone = options.tone ?? "info";
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, message, tone, duration: options.duration ?? TOAST_DURATION[tone] }].slice(-TOAST_LIMIT));
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="mio-toaster" aria-live="polite">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
