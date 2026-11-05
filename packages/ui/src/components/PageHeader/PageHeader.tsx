import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

export interface PageHeaderProps {
  title: ReactNode;
  /** Small context line above the title (household name, period). */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right side on desktop, below the title on mobile. */
  actions?: ReactNode;
  className?: string;
}

/** Top of every route: one h1 and at most two actions. */
export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cx("mio-page-header", className)}>
      <div className="mio-page-header__text">
        {eyebrow && <p className="mio-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="mio-page-header__title">{title}</h1>
        {description && <p className="mio-page-header__desc">{description}</p>}
      </div>
      {actions && <div className="mio-page-header__actions">{actions}</div>}
    </header>
  );
}
