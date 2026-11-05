import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The one action that fills this space, usually opening the inline FormPanel. */
  action?: ReactNode;
  className?: string;
}

/** Placeholder that names what will appear and how to add the first entry. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("mio-empty", className)}>
      {icon && <span className="mio-empty__icon">{icon}</span>}
      <p className="mio-empty__title">{title}</p>
      {description && <p className="mio-empty__desc">{description}</p>}
      {action && <div className="mio-empty__action">{action}</div>}
    </div>
  );
}
