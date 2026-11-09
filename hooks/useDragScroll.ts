"use client";

import { type RefObject, useEffect } from "react";
import { isDrag } from "@/lib/navigation/carousel";

/**
 * Mouse drag-to-scroll for a horizontal scroller (touch already scrolls natively).
 * Snap is paused while dragging, and the click ending a drag is swallowed so links don't open.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; scrollLeft: number } | null = null;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      start = { x: e.clientX, scrollLeft: el.scrollLeft };
      moved = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (!moved && !isDrag(dx)) return;
      if (!moved) {
        moved = true;
        el.dataset.dragging = "true";
      }
      el.scrollLeft = start.scrollLeft - dx;
    };
    const onUp = () => {
      if (!start) return;
      start = null;
      delete el.dataset.dragging;
    };
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      moved = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // Native link/image dragging would hijack the gesture.
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, [ref]);
}
