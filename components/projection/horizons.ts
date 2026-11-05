// Shared by Server and Client Components: must not live in a "use client" module,
// whose non-component exports become client references on the server.
export const HORIZONS = [
  { value: "6", label: "6 mesi" },
  { value: "12", label: "1 anno" },
  { value: "36", label: "3 anni" },
  { value: "120", label: "10 anni" },
] as const;

export type Horizon = (typeof HORIZONS)[number]["value"];

export function horizonParam(v: string | string[] | undefined): Horizon {
  const raw = Array.isArray(v) ? v[0] : v;
  return HORIZONS.find((h) => h.value === raw)?.value ?? "12";
}
