import type { ReactNode } from "react";

/** Centered card for login and onboarding screens. */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <span className="font-display text-3xl font-bold tracking-tight">
        monet<span className="text-brand-ink">io</span>
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {description && <p className="text-ink-muted">{description}</p>}
      </div>
      <div className="rounded-[28px] bg-surface p-6">{children}</div>
    </main>
  );
}
