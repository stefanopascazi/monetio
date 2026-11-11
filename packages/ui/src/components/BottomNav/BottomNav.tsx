"use client";

import type { ComponentType, PointerEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "../../utils/cx";
import { messages } from "../../i18n";

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
  onClick?: () => void;
  children: ReactNode;
}

export interface BottomNavProps {
  items: NavItem[];
  /**
   * Secondary sections. Phones: hidden in a panel opened by dragging the bar's handle up (or tapping it).
   * Rail: listed below the main items.
   */
  moreItems?: NavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Link component, e.g. Next.js `Link`. Defaults to `<a>`. */
  linkAs?: ComponentType<LinkLikeProps>;
  /** Optional primary action rendered in the center (mobile) or top (rail). */
  action?: ReactNode;
  "aria-label"?: string;
  className?: string;
}

/** Vertical drag (px) on the handle that opens or closes the panel; shorter moves count as a tap. */
export const NAV_DRAG_THRESHOLD = 24;

function DefaultLink(props: LinkLikeProps) {
  return <a {...props} />;
}

function Items({ items, activeId, onSelect, Link, onNavigate }: { items: NavItem[]; activeId: string; onSelect?: (id: string) => void; Link: ComponentType<LinkLikeProps>; onNavigate?: () => void }) {
  return items.map((item) => {
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
          <Link href={item.href} className={cx("mio-nav__item", active && "is-active")} aria-current={active ? "page" : undefined} onClick={onNavigate}>
            {content}
          </Link>
        ) : (
          <button
            type="button"
            className={cx("mio-nav__item", active && "is-active")}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              onSelect?.(item.id);
              onNavigate?.();
            }}
          >
            {content}
          </button>
        )}
      </li>
    );
  });
}

/** App navigation: bottom bar on phones (max four or five items, the rest in `moreItems`), vertical rail from 960px. */
export function BottomNav({ items, moreItems = [], activeId, onSelect, linkAs, action, className, ...aria }: BottomNavProps) {
  const Link = linkAs ?? DefaultLink;
  const panelId = useId();
  const navRef = useRef<HTMLElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  // The panel belongs to the page it was opened on: a new active item closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === activeId;
  const hasMore = moreItems.length > 0;
  const moreActive = moreItems.some((i) => i.id === activeId);
  const close = () => setOpenOn(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    const onDown = (e: globalThis.PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const onHandleDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragStart.current = e.clientY;
    dragged.current = false;
  };
  const onHandleUp = (e: PointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (start === null) return;
    const dy = e.clientY - start;
    if (Math.abs(dy) < NAV_DRAG_THRESHOLD) return;
    // A real drag decides here; the click that follows must not toggle it back.
    dragged.current = true;
    if (dy < 0) setOpenOn(activeId);
    else close();
  };
  // Taps and keyboard (Enter/Space) toggle.
  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setOpenOn(open ? null : activeId);
  };

  return (
    <nav ref={navRef} aria-label={aria["aria-label"] ?? "Main"} className={cx("mio-nav", hasMore && "mio-nav--more", open && "is-open", className)}>
      {hasMore && (
        <button
          type="button"
          className={cx("mio-nav__handle", moreActive && "is-active")}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? messages.nav.closeMore : messages.nav.openMore}
          onPointerDown={onHandleDown}
          onPointerUp={onHandleUp}
          onClick={onHandleClick}
        >
          <span className="mio-nav__grip" aria-hidden="true" />
        </button>
      )}
      {hasMore && (
        <div id={panelId} className="mio-nav__more" role="group" aria-label={messages.nav.more}>
          <ul className="mio-nav__list mio-nav__list--more">
            <Items items={moreItems} activeId={activeId} onSelect={onSelect} Link={Link} onNavigate={close} />
          </ul>
        </div>
      )}
      {action && <div className="mio-nav__action">{action}</div>}
      <ul className="mio-nav__list">
        <Items items={items} activeId={activeId} onSelect={onSelect} Link={Link} onNavigate={close} />
      </ul>
    </nav>
  );
}
