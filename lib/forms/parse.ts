// FormData parsing helpers shared by every form. Error messages are Italian UI copy.

export type FieldErrors = Record<string, string>;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const optionalText = (fd: FormData, key: string) => text(fd, key) || null;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isISODate(v: string): boolean {
  return ISO_RE.test(v) && !Number.isNaN(Date.parse(v));
}

export function isUUID(v: string): boolean {
  return UUID_RE.test(v);
}

/** Positive integer cents from a hidden `*Cents` field. */
export function positiveCents(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Collects errors fluently and returns a ParseResult. */
export class Checker {
  errors: FieldErrors = {};
  check(cond: boolean, field: string, message: string) {
    if (!cond && !this.errors[field]) this.errors[field] = message;
    return this;
  }
  result<T>(value: T): ParseResult<T> {
    return Object.keys(this.errors).length ? { ok: false, errors: this.errors } : { ok: true, value };
  }
}
