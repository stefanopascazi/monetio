import type { ReactNode } from "react";
import { cx } from "../../utils/cx";

export interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label, control slot, hint and error. Every form control is wrapped in a Field. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cx("mio-field", error ? "is-invalid" : undefined, className)}>
      <label className="mio-field__label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="mio-field__optional">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mio-field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mio-field__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby value matching the ids rendered by Field. */
export function describedBy(id: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
