import { AvatarGroup, ThemeSwitcher } from "@monetio/ui";

/** Top bar of the demo: wordmark, theme switch and household members. */
export function DemoTopBar() {
  return (
    <header className="flex items-center justify-between gap-3">
      <span className="font-display text-xl font-bold tracking-tight">
        monet<span className="text-brand-ink">io</span>
      </span>
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <AvatarGroup names={["Giulia Rossi", "Marco Rossi", "Sofia Rossi"]} size="md" />
      </div>
    </header>
  );
}
