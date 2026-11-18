/** Household invite code, typed by people who already have an account. */
export function InviteCode({ code }: { code: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-surface-sunken p-4">
      <span className="text-sm text-ink-muted">Codice invito</span>
      <span className="font-mono text-xl font-semibold tracking-widest">{code}</span>
      <span className="text-sm text-ink-muted">Chi ha già un account lo inserisce in &quot;Aggiungi un nucleo&quot; ed entra come membro.</span>
    </div>
  );
}
