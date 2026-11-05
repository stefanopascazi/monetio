import type { ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { Field, describedBy } from "../Field/Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Icon shown before the value (e.g. account or category icon). */
  icon?: ReactNode;
}

/** Native select: best keyboard and mobile picker support, no custom popover. */
export function Select({ label, options, placeholder, hint, error, optional, icon, id, className, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error} optional={optional} className={className}>
      <div className="mio-control mio-select">
        {icon && <span className="mio-control__affix">{icon}</span>}
        <select
          {...rest}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="mio-select__chevron" aria-hidden="true" />
      </div>
    </Field>
  );
}
