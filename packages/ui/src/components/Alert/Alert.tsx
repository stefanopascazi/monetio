import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import { cx } from "../../utils/cx";
import { messages } from "../../i18n";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Inline action, e.g. a ghost Button "Review". */
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const ICON: Record<AlertTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  success: <CheckCircle2 aria-hidden="true" />,
  warning: <AlertTriangle aria-hidden="true" />,
  danger: <OctagonAlert aria-hidden="true" />,
};

/** In-flow notice that stays where the problem is; use Toast for transient action feedback. */
export function Alert({ tone = "info", title, children, action, onDismiss, className }: AlertProps) {
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cx("mio-alert", `mio-alert--${tone}`, className)}>
      <span className="mio-alert__icon">{ICON[tone]}</span>
      <div className="mio-alert__body">
        {title && <p className="mio-alert__title">{title}</p>}
        {children && <div className="mio-alert__text">{children}</div>}
        {action && <div className="mio-alert__action">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" className="mio-alert__close" aria-label={messages.dismiss} onClick={onDismiss}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
