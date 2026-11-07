import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@monetio/ui";

/** Page block streaming on its own, with a placeholder of similar height. */
export function StreamBlock({ height, children }: { height: number; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="Caricamento">
          <Skeleton height={height} radius="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
