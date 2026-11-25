"use client";

import { useNavigationTiming } from "@/hooks/useNavigationTiming";
import { useRefreshOnResume } from "@/hooks/useRefreshOnResume";

/** Thin top bar shown from a link tap until the new page renders. Render inside Suspense (reads search params). */
export function NavigationFeedback() {
  const pending = useNavigationTiming();
  useRefreshOnResume();
  if (!pending) return null;
  return (
    <div role="progressbar" aria-label="Caricamento pagina" className="mio-nav-progress">
      <span />
    </div>
  );
}
