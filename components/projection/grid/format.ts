const fmt = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });

/** Compact signed amount for secondary notes ("-180,00"), without currency. */
export const formatCentsPlain = (cents: number) => fmt.format(cents / 100);
