"use client";

import type { ComponentType, ReactNode } from "react";
import { cx } from "../../utils/cx";

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  /** Small count badge (e.g. due payments). */
  badge?: number;
}

export interface LinkLikeProps {
  href: string;
  className?: string;
  "aria-current"?: "page";
  children: ReactNode;
}

export interface BottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Link component, e.g. Next.js `Link`. Defaults to `<a>`. */
  linkAs?: ComponentType<LinkLikeProps>;
  /** Optional primary action rendered in the center (mobile) or top (rail). */
  action?: ReactNode;
  "aria-label"?: string;
  className?: string;
}

function DefaultLink(props: LinkLikeProps) {
  return <a {...props} />;
}

/** App navigation: bottom bar on phones, vertical rail from 960px. Max five items. */
export function BottomNav({ items, activeId, onSelect, linkAs, action, className, ...aria }: BottomNavProps) {
  const Link = linkAs ?? DefaultLink;
  return (
    <nav aria-label={aria["aria-label"] ?? "Main"} className={cx("mio-nav", className)}>
      {action && <div className="mio-nav__action">{action}</div>}
      <ul className="mio-nav__list">
        {items.map((item) => {
          const active = item.id === activeId;
          const content = (
            <>
              <span className="mio-nav__icon">
                {item.icon}
                {item.badge ? <span className="mio-nav__badge">{item.badge}</span> : null}
              </span>
              <span className="mio-nav__label">{item.label}</span>
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cx("mio-nav__item", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  className={cx("mio-nav__item", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelect?.(item.id)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
