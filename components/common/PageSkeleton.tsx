import { Skeleton } from "@monetio/ui";

/** Placeholder shown while a page streams its data. */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Caricamento">
      <Skeleton width={200} height={36} radius="md" />
      {Array.from({ length: blocks }, (_, i) => (
        <Skeleton key={i} height={160} radius="lg" />
      ))}
    </div>
  );
}
