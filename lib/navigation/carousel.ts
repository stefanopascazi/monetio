// Pure helpers for the horizontally scrolling accounts carousel.

/** Pixels moved before a mouse press counts as a drag (and its click is swallowed). */
export const DRAG_THRESHOLD_PX = 5;

export interface ScrollBox {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

/** Whether the row can still scroll backwards/forwards (1px slack for subpixel widths). */
export function scrollEdges({ scrollLeft, scrollWidth, clientWidth }: ScrollBox): { atStart: boolean; atEnd: boolean } {
  return { atStart: scrollLeft <= 1, atEnd: scrollLeft + clientWidth >= scrollWidth - 1 };
}

/** Distance for one arrow click: most of the visible width, so a card stays as context. */
export function pageStep(clientWidth: number): number {
  return Math.max(Math.round(clientWidth * 0.85), 1);
}

export function isDrag(dx: number, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.abs(dx) > threshold;
}
